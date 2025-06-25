const { TwitterApi } = require('twitter-api-v2');
const { google } = require('googleapis');
const fs = require('fs');
const tweetTemplates = require('./tweet-templates.js');

// --- Configuration ---
const YOUTUBE_CHANNEL_ID = 'UC09QwXpdgjgd6l8BFBRlZMw'; // Your actual channel ID
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const lastPostedFile = 'last-posted.txt';
const templateIndexFile = 'template-indices.json';
const runModeFile = 'run-mode.txt';

// --- Hashtag Configuration ---
const STATIC_HASHTAGS = ['#Gaming', '#PCGaming', '#NewVideo'];
const CONTEXTUAL_HASHTAGS = {
    'live': '#LiveStream',
    'upcoming': '#UpcomingLive',
    'published': '#NewUpload'
};

// --- Initialize YouTube API Client ---
const youtube = google.youtube({
    version: 'v3',
    auth: YOUTUBE_API_KEY,
});

// --- Utility function for time formatting ---
function formatTimeForTweet(isoDateString) {
    const date = new Date(isoDateString);
    return date.toLocaleString('en-NZ', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
    });
}

// --- Function to get YouTube videos via API ---
async function getYouTubeVideos() {
    try {
        const channelResponse = await youtube.channels.list({
            part: 'contentDetails',
            id: YOUTUBE_CHANNEL_ID,
        });

        if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
            console.error('Error: Could not find channel with ID:', YOUTUBE_CHANNEL_ID);
            return null;
        }

        const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

        const playlistItemsResponse = await youtube.playlistItems.list({
            part: 'snippet',
            playlistId: uploadsPlaylistId,
            maxResults: 3,
        });

        if (!playlistItemsResponse.data.items || playlistItemsResponse.data.items.length === 0) {
            console.log('No videos found in uploads playlist.');
            return null;
        }

        let currentlyLiveVideo = null;
        let nextUpcomingVideo = null;
        let mostRecentPublishedVideo = null;
        const now = new Date();

        for (const item of playlistItemsResponse.data.items) {
            const videoId = item.snippet.resourceId.videoId;
            const videoTitle = item.snippet.title;

            const videoDetailsResponse = await youtube.videos.list({
                part: 'snippet,liveStreamingDetails',
                id: videoId,
            });

            const videoDetails = videoDetailsResponse.data.items[0];
            if (!videoDetails) continue;

            const snippet = videoDetails.snippet;
            const liveDetails = videoDetails.liveStreamingDetails;
            const publishedAt = new Date(snippet.publishedAt);

            if (liveDetails && liveDetails.actualStartTime && !liveDetails.actualEndTime) {
                currentlyLiveVideo = { id: videoId, title: videoTitle, link: `https://www.youtube.com/watch?v=${videoId}`, publishedAt: snippet.publishedAt, type: 'live' };
                break;
            } else if (liveDetails && liveDetails.scheduledStartTime && new Date(liveDetails.scheduledStartTime) > now) {
                if (!nextUpcomingVideo || new Date(liveDetails.scheduledStartTime) < new Date(nextUpcomingVideo.publishedAt)) {
                    nextUpcomingVideo = { id: videoId, title: videoTitle, link: `https://www.youtube.com/watch?v=${videoId}`, publishedAt: liveDetails.scheduledStartTime, type: 'upcoming' };
                }
            } else {
                if (!mostRecentPublishedVideo || publishedAt > new Date(mostRecentPublishedVideo.publishedAt)) {
                    mostRecentPublishedVideo = { id: videoId, title: videoTitle, link: `https://www.youtube.com/watch?v=${videoId}`, publishedAt: snippet.publishedAt, type: 'published' };
                }
            }
        }

        return currentlyLiveVideo || nextUpcomingVideo || mostRecentPublishedVideo || null;
    } catch (error) {
        console.error('Error fetching YouTube videos from API:', error.message);
        return null;
    }
}

// --- Function to post tweet ---
async function postTweet(tweetText) {
    const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    try {
        await client.v2.tweet(tweetText);
        console.log('✅ Tweet posted!');
        return true;
    } catch (e) {
        console.error('❌ Error posting tweet:', e);
        return false;
    }
}

// --- Function to get a random tweet ---
function getCyclingTweet(title, link, videoType, scheduledTime = '') {
    const contextualHashtag = CONTEXTUAL_HASHTAGS[videoType] || '';
    const allHashtags = [...STATIC_HASHTAGS, contextualHashtag].filter(Boolean).join(' ');

    const templatesForType = tweetTemplates[videoType];
    if (!templatesForType || templatesForType.length === 0) {
        return `Check out my new ${videoType} video: "${title}" ${link} ${allHashtags}`;
    }

    let availableIndices = {};
    if (fs.existsSync(templateIndexFile)) {
        try {
            availableIndices = JSON.parse(fs.readFileSync(templateIndexFile, 'utf-8'));
        } catch (e) {
            availableIndices = {};
        }
    }

    let currentTypeIndices = availableIndices[videoType] || Array.from({ length: templatesForType.length }, (_, i) => i);
    if (currentTypeIndices.length === 0) {
        currentTypeIndices = Array.from({ length: templatesForType.length }, (_, i) => i);
    }

    const randomArrayIndex = Math.floor(Math.random() * currentTypeIndices.length);
    const selectedTemplateIndex = currentTypeIndices.splice(randomArrayIndex, 1)[0];
    availableIndices[videoType] = currentTypeIndices;

    fs.writeFileSync(templateIndexFile, JSON.stringify(availableIndices));

    const templateFn = templatesForType[selectedTemplateIndex];
    const tweetText = (videoType === 'upcoming') ? templateFn(title, link, scheduledTime) : templateFn(title, link);

    return `${tweetText} ${allHashtags}`;
}

// --- Main function ---
async function main() {
    const runMode = fs.existsSync(runModeFile) ? fs.readFileSync(runModeFile, 'utf-8').trim().toLowerCase() : 'true';
    console.log(`Current Run Mode: ${runMode}`);

    try {
        const latestVideo = await getYouTubeVideos();
        if (!latestVideo) {
            console.log('No new relevant videos found.');
            return;
        }

        const { id, title, link, publishedAt, type } = latestVideo;
        const currentVideoIdentifier = `${id}:${type}`;
        const lastPostedIdentifier = fs.existsSync(lastPostedFile) ? fs.readFileSync(lastPostedFile, 'utf-8').trim() : '';

        const shouldPost = (runMode === 'repost') || (currentVideoIdentifier !== lastPostedIdentifier);

        if (shouldPost) {
            if (currentVideoIdentifier !== lastPostedIdentifier) console.log(`🎉 New ${type} video detected!`);
            
            const tweetText = getCyclingTweet(title, link, type, type === 'upcoming' ? formatTimeForTweet(publishedAt) : '');
            console.log(`Generated Tweet Text:\n${tweetText}\n`);

            if (runMode === 'true') {
                console.log('--- DRY RUN MODE: Tweet NOT posted. ---');
            } else {
                const tweetSuccessful = await postTweet(tweetText);

                if (tweetSuccessful) {
                    fs.writeFileSync(lastPostedFile, currentVideoIdentifier);
                    console.log(`Updated last-posted.txt with: ${currentVideoIdentifier}`);
                    if (runMode === 'repost') {
                        fs.writeFileSync(runModeFile, 'true');
                        console.log(`Reverted ${runModeFile} to 'true' after repost.`);
                    }
                } else {
                    // **THIS IS THE CRITICAL FIX**
                    // If the tweet fails, exit with an error code to make the workflow fail.
                    console.error('Tweet failed. Exiting with error code 1 to fail the workflow run.');
                    process.exit(1);
                }
            }
        } else {
            console.log(`ℹ️ No new ${type} video to post.`);
        }
    } catch (error) {
        console.error('An unhandled error occurred in main:', error);
        process.exit(1); // Also fail on any other unexpected errors
    }
}

main();
