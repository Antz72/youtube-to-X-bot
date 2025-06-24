const { TwitterApi } = require('twitter-api-v2');
const { google } = require('googleapis');
const fs = require('fs');
const tweetTemplates = require('./tweet-templates.js');

// --- Configuration ---
const YOUTUBE_CHANNEL_ID = 'UC09QwXpdgjgd6l8BFBRlZMw'; // Your actual channel ID
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const lastPostedFile = 'last-posted.txt';
const templateIndexFile = 'template-indices.json';
const runModeFile = 'run-mode.txt'; // CORRECTED: Now uses hyphen

// --- Hashtag Configuration ---
const STATIC_HASHTAGS = ['#Gaming', '#PCGaming', '#NewVideo']; // Your static hashtags
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
    // Format for New Zealand Standard Standard Time (NZST), e.g., Mon, 24 Jun at 3:00 PM
    return date.toLocaleString('en-NZ', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true, // Use 12-hour clock (e.g., 3:00 PM)
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

        // Fetch enough items to find a recent upcoming or published video
        const playlistItemsResponse = await youtube.playlistItems.list({
            part: 'snippet', // Still need snippet for title and videoId
            playlistId: uploadsPlaylistId,
            maxResults: 3, // Now only fetches the 3 most recent videos
        });

        if (!playlistItemsResponse.data.items || playlistItemsResponse.data.items.length === 0) {
            console.log('No videos found in uploads playlist.');
            return null;
        }

        let currentlyLiveVideo = null;
        let nextUpcomingVideo = null;
        let mostRecentPublishedVideo = null;
        const now = new Date(); // Current time to check against scheduled time

        // Iterate through playlist items and fetch full video details for accurate status
        for (const item of playlistItemsResponse.data.items) {
            const videoId = item.snippet.resourceId.videoId;
            const videoTitle = item.snippet.title;

            // --- DEBUG LOGGING START ---
            console.log(`\n--- Processing Video: ${videoTitle} (ID: ${videoId}) ---`);
            console.log(`  Initial liveBroadcastContent from playlist item (if any): ${item.snippet.liveBroadcastContent}`);
            // --- DEBUG LOGGING END ---

            // Always fetch detailed video information including liveStreamingDetails
            const videoDetailsResponse = await youtube.videos.list({
                part: 'snippet,liveStreamingDetails',
                id: videoId,
            });

            const videoDetails = videoDetailsResponse.data.items[0];
            if (!videoDetails) {
                console.log(`  No details found for video ID: ${videoId}. Skipping.`);
                continue;
            }

            const snippet = videoDetails.snippet;
            const liveDetails = videoDetails.liveStreamingDetails;
            const publishedAt = new Date(snippet.publishedAt); // This is the actual publish date for regular videos, or initial upload for streams

            // --- DEBUG LOGGING START ---
            console.log(`  PublishedAt from video details: ${snippet.publishedAt}`);
            console.log(`  PublishedAt (Date object): ${publishedAt}`);
            console.log(`  Current time (Date object): ${now}`);
            console.log(`  Is publishedAt in future (based on video snippet)? ${publishedAt > now}`);
            if (liveDetails) {
                console.log(`  Live Streaming Details found: Yes`);
                console.log(`    liveDetails.actualStartTime: ${liveDetails.actualStartTime || 'N/A'}`);
                console.log(`    liveDetails.actualEndTime: ${liveDetails.actualEndTime || 'N/A'}`);
                console.log(`    liveDetails.scheduledStartTime: ${liveDetails.scheduledStartTime || 'N/A'}`);
                console.log(`    Is scheduledStartTime in future? ${liveDetails.scheduledStartTime && new Date(liveDetails.scheduledStartTime) > now}`);
            } else {
                console.log(`  No Live Streaming Details found. Treating as regular video.`);
            }
            // --- DEBUG LOGGING END ---


            // --- Determine video type based on comprehensive details and strict priority ---
            if (liveDetails && liveDetails.actualStartTime && !liveDetails.actualEndTime) {
                // Condition 1: Video is CURRENTLY LIVE (actual start time exists, but no actual end time yet)
                currentlyLiveVideo = {
                    id: videoId,
                    title: videoTitle,
                    link: `https://www.youtube.com/watch?v=${videoId}`, // Corrected YouTube link
                    publishedAt: snippet.publishedAt, // Use video's publishedAt or actualStartTime if preferred for sorting
                    type: 'live',
                };
                console.log(`  -> Video identified as CURRENTLY LIVE.`);
                break; // Found the live one, no need to check others for now
            } else if (liveDetails && liveDetails.scheduledStartTime && new Date(liveDetails.scheduledStartTime) > now) {
                // Condition 2: Video is UPCOMING (scheduled start time exists and is in the future)
                if (!nextUpcomingVideo || new Date(liveDetails.scheduledStartTime) < new Date(nextUpcomingVideo.publishedAt)) {
                    // Prioritize the *earliest* upcoming video by its scheduled time
                    nextUpcomingVideo = {
                        id: videoId,
                        title: videoTitle,
                        link: `https://www.youtube.com/watch?v=${videoId}`, // Corrected YouTube link
                        publishedAt: liveDetails.scheduledStartTime, // Use scheduledStartTime for upcoming
                        type: 'upcoming',
                    };
                    console.log(`  -> Video identified as UPCOMING.`);
                }
            } else {
                // Condition 3: Video is PUBLISHED (this covers regular uploads AND completed live streams)
                // This block is reached if:
                //   - No liveStreamingDetails are present (a regular video upload).
                //   - liveStreamingDetails are present, but the stream has completed (actualEndTime exists).
                //   - liveStreamingDetails are present, but the scheduledStartTime is in the past (missed stream, now a VOD).
                if (!mostRecentPublishedVideo || publishedAt > new Date(mostRecentPublishedVideo.publishedAt)) {
                    // Prioritize the *most recent* published video
                    mostRecentPublishedVideo = {
                        id: videoId,
                        title: videoTitle,
                        link: `https://www.youtube.com/watch?v=${videoId}`, // Corrected YouTube link
                        publishedAt: snippet.publishedAt,
                        type: 'published',
                    };
                    console.log(`  -> Video identified as PUBLISHED (regular upload or completed stream).`);
                }
            }
        }

        // Final prioritization: Live > Upcoming > Published
        if (currentlyLiveVideo) {
            console.log(`Debug: Selected LIVE Video: ${currentlyLiveVideo.title} (ID: ${currentlyLiveVideo.id})`);
            return currentlyLiveVideo;
        } else if (nextUpcomingVideo) {
            console.log(`Debug: Selected UPCOMING Video: ${nextUpcomingVideo.title} (ID: ${nextUpcomingVideo.id})`);
            return nextUpcomingVideo;
        } else if (mostRecentPublishedVideo) {
            console.log(`Debug: Selected PUBLISHED Video: ${mostRecentPublishedVideo.title} (ID: ${mostRecentPublishedVideo.id})`);
            return mostRecentPublishedVideo;
        }

        return null; // No relevant video found
    } catch (error) {
        console.error('Error fetching YouTube videos from API:', error.message);
        if (error.response && error.response.data) {
            console.error('YouTube API Error Details:', error.response.data);
        }
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
    } catch (e) {
        console.error('❌ Error posting tweet:', e);
        if (e.data && e.data.errors) {
            e.data.errors.forEach(err => {
                console.error(`Twitter API Error: Code ${err.code} - ${err.message}`);
            });
        }
    }
}

// Function to get a random tweet ensuring no repeats until all are used
function getCyclingTweet(title, link, videoType, scheduledTime = '') {
    // Generate hashtags
    const contextualHashtag = CONTEXTUAL_HASHTAGS[videoType] || '';
    const allHashtags = [...STATIC_HASHTAGS, contextualHashtag].filter(tag => tag !== '').join(' ');

    const templatesForType = tweetTemplates[videoType];
    if (!templatesForType || templatesForType.length === 0) {
        console.error(`No tweet templates found for type: ${videoType}. Falling back to default.`);
        return `Check out my new ${videoType} video: "${title}" ${link} ${allHashtags}`;
    }

    let availableIndices = {};
    if (fs.existsSync(templateIndexFile)) {
        try {
            availableIndices = JSON.parse(fs.readFileSync(templateIndexFile, 'utf-8'));
        } catch (e) {
            console.error('Error parsing template-indices.json, resetting:', e);
            availableIndices = {}; // Reset if parsing fails
        }
    }

    let currentTypeIndices = availableIndices[videoType] || [];
    if (currentTypeIndices.length === 0) {
        console.log(`Debug: Initializing or resetting template indices for ${videoType}.`);
        currentTypeIndices = Array.from({ length: templatesForType.length }, (_, i) => i);
    }

    const randomArrayIndex = Math.floor(Math.random() * currentTypeIndices.length);
    const selectedTemplateIndex = currentTypeIndices[randomArrayIndex];

    currentTypeIndices.splice(randomArrayIndex, 1);
    availableIndices[videoType] = currentTypeIndices;

    fs.writeFileSync(templateIndexFile, JSON.stringify(availableIndices));
    console.log(`Debug: Remaining template indices for ${videoType}: ${currentTypeIndices}`);

    const templateFn = templatesForType[selectedTemplateIndex];
    let tweetText;
    if (videoType === 'upcoming') {
        tweetText = templateFn(title, link, scheduledTime);
    } else { // 'live' or 'published' type
        tweetText = templateFn(title, link);
    }

    // Append hashtags to the generated tweet text
    return `${tweetText} ${allHashtags}`;
}

async function main() {
    let runMode = 'true'; // Default run mode (dry run)
    if (fs.existsSync(runModeFile)) {
        try {
            runMode = fs.readFileSync(runModeFile, 'utf-8').trim().toLowerCase();
        } catch (e) {
            console.error(`Error reading ${runModeFile}:`, e.message);
            console.log('Defaulting runMode to "true" due to error.');
            runMode = 'true';
        }
    } else {
        console.log(`Warning: ${runModeFile} not found. Defaulting runMode to "true".`);
        fs.writeFileSync(runModeFile, 'true'); // Create file with default if not exists
    }
    console.log(`Current Run Mode: ${runMode}`);


    try {
        const latestVideo = await getYouTubeVideos();
        if (!latestVideo) {
            console.log('No new relevant videos found from YouTube API.');
            return;
        }

        const { id, title, link, publishedAt, type } = latestVideo;
        const currentVideoIdentifier = `${id}:${type}`;

        let lastPostedIdentifier = '';
        if (fs.existsSync(lastPostedFile)) {
            lastPostedIdentifier = fs.readFileSync(lastPostedFile, 'utf-8').trim();
            console.log(`Debug: Found last-posted.txt. Last posted identifier: ${lastPostedIdentifier}`);
        } else {
            console.log('Debug: last-posted.txt not found. Treating as first run or missing file.');
        }

        let shouldPost = false;

        if (runMode === 'repost') {
            console.log('--- REPOST MODE: Attempting to repost the last identified video. ---');
            shouldPost = true; // Force posting
        } else if (currentVideoIdentifier !== lastPostedIdentifier) {
            console.log(`🎉 New ${type} video/stream detected!`);
            shouldPost = true; // Post if new
        } else {
            console.log(`ℹ️ No new ${type} video or stream to post.`);
        }

        if (shouldPost) {
            let tweet;
            if (type === 'upcoming') {
                const formattedTime = formatTimeForTweet(publishedAt);
                tweet = getCyclingTweet(title, link, type, formattedTime);
            } else if (type === 'live') {
                tweet = getCyclingTweet(title, link, type);
            } else { // type === 'published'
                tweet = getCyclingTweet(title, link, type);
            }

            console.log(`Generated Tweet Text for type "${type}":\n${tweet}\n`);

            if (runMode === 'true') { // If it's a 'true' (dry run) mode
                console.log('--- DRY RUN MODE: Tweet NOT posted to Twitter. ---');
            } else { // This handles 'false' (normal) and 'repost'
                await postTweet(tweet);
                fs.writeFileSync(lastPostedFile, currentVideoIdentifier);
                console.log(`Updated last-posted.txt with identifier: ${currentVideoIdentifier}`);

                // If in 'repost' mode, revert run_mode.txt to 'true' after posting
                if (runMode === 'repost') {
                    fs.writeFileSync(runModeFile, 'true'); // Revert to default dry run mode
                    console.log(`Reverted ${runModeFile} to 'true' after repost.`);
                }
            }
        }
    } catch (error) {
        console.error('An error occurred in main:', error);
    }
}

main();
