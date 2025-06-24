const { TwitterApi } = require('twitter-api-v2');
const { google } = require('googleapis');
const fs = require('fs');
const tweetTemplates = require('./tweet-templates.js');

// --- Configuration ---
const YOUTUBE_CHANNEL_ID = 'UC09QwXpdgjgd6l8BFBRlZMw'; // Your actual channel ID
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const lastPostedFile = 'last-posted.txt';
const templateIndexFile = 'template-indices.json';

// --- Initialize YouTube API Client ---
const youtube = google.youtube({
    version: 'v3',
    auth: YOUTUBE_API_KEY,
});

// --- Utility function for time formatting ---
function formatTimeForTweet(isoDateString) {
    const date = new Date(isoDateString);
    // Format for New Zealand Standard Time (NZST), e.g., Mon, 24 Jun at 3:00 PM
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

        // Fetch enough items to find a recent upcoming or published video, and also live status
        const playlistItemsResponse = await youtube.playlistItems.list({
            part: 'snippet',
            playlistId: uploadsPlaylistId,
            maxResults: 10, // Get up to 10 recent items
        });

        if (!playlistItemsResponse.data.items || playlistItemsResponse.data.items.length === 0) {
            console.log('No videos found in uploads playlist.');
            return null;
        }

        let currentlyLiveVideo = null; // NEW variable for live streams
        let nextUpcomingVideo = null;
        let mostRecentPublishedVideo = null;
        const now = new Date(); // Current time to check against scheduled time

        for (const item of playlistItemsResponse.data.items) {
            const videoId = item.snippet.resourceId.videoId;
            const liveBroadcastContent = item.snippet.liveBroadcastContent; // 'upcoming', 'live', 'none', 'completed'
            const publishedAt = new Date(item.snippet.publishedAt); // This is the scheduled time for 'upcoming'

            if (liveBroadcastContent === 'live') {
                // If a video is currently live, fetch its liveStreamingDetails for actual start time
                const videoDetailsResponse = await youtube.videos.list({
                    part: 'liveStreamingDetails',
                    id: videoId,
                });

                const liveDetails = videoDetailsResponse.data.items[0]?.liveStreamingDetails;
                if (liveDetails && liveDetails.actualStartTime) {
                    // We found a live video with an actual start time. This is highest priority.
                    currentlyLiveVideo = {
                        id: videoId,
                        title: item.snippet.title,
                        link: `https://www.youtube.com/watch?v=${videoId}`,
                        publishedAt: item.snippet.publishedAt, // Still the original publishedAt
                        type: 'live', // NEW type
                    };
                    break; // Found the live one, no need to check others for now
                }
            } else if (liveBroadcastContent === 'upcoming' && publishedAt > now) {
                // If there's an upcoming video and its scheduled time is in the future
                if (!nextUpcomingVideo || publishedAt < new Date(nextUpcomingVideo.publishedAt)) {
                    // Prioritize the *earliest* upcoming video
                    nextUpcomingVideo = {
                        id: videoId,
                        title: item.snippet.title,
                        link: `https://www.youtube.com/watch?v=${videoId}`,
                        publishedAt: item.snippet.publishedAt, // Keep original ISO string for formatting
                        type: 'upcoming',
                    };
                }
            } else if (liveBroadcastContent === 'none' || liveBroadcastContent === 'completed') {
                // If it's a regular video or a completed live stream
                if (!mostRecentPublishedVideo || publishedAt > new Date(mostRecentPublishedVideo.publishedAt)) {
                    // Prioritize the *most recent* published video
                    mostRecentPublishedVideo = {
                        id: videoId,
                        title: item.snippet.title,
                        link: `https://www.youtube.com/watch?v=${videoId}`,
                        publishedAt: item.snippet.publishedAt,
                        type: 'published',
                    };
                }
            }
        }

        // Prioritize: Live > Upcoming > Published
        if (currentlyLiveVideo) {
            return currentlyLiveVideo;
        } else if (nextUpcomingVideo) {
            return nextUpcomingVideo;
        } else if (mostRecentPublishedVideo) {
            return mostRecentPublishedVideo;
        }

        return null; // No relevant video found
    } catch (error) {
        console.error('Error fetching YouTube videos from API:', error.message);
        // Log more details if available
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
        // Log more specific Twitter API errors
        if (e.data && e.data.errors) {
            e.data.errors.forEach(err => {
                console.error(`Twitter API Error: Code ${err.code} - ${err.message}`);
            });
        }
    }
}

// Function to get a random tweet ensuring no repeats until all are used
function getCyclingTweet(title, link, videoType, scheduledTime = '') {
    // Generate a simple hashtag from the title, limiting length
    const hashtagTitle = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);

    const templatesForType = tweetTemplates[videoType];
    if (!templatesForType || templatesForType.length === 0) {
        console.error(`No tweet templates found for type: ${videoType}. Falling back to default.`);
        return `Check out my new ${videoType} video: "${title}" ${link}`;
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
    if (videoType === 'upcoming') {
        return templateFn(title, link, hashtagTitle, scheduledTime);
    } else if (videoType === 'live') { // NEW: Handle 'live' type
        return templateFn(title, link, hashtagTitle); // 'live' templates don't need formatted time
    } else { // 'published' type
        return templateFn(title, link, hashtagTitle);
    }
}

async function main() {
    try {
        const latestVideo = await getYouTubeVideos();
        if (!latestVideo) {
            console.log('No new relevant videos found from YouTube API.');
            return;
        }

        const { id, title, link, publishedAt, type } = latestVideo;
        // The identifier now uses the type (published, upcoming, or live)
        const currentVideoIdentifier = `${id}:${type}`;

        let lastPostedIdentifier = '';
        if (fs.existsSync(lastPostedFile)) {
            lastPostedIdentifier = fs.readFileSync(lastPostedFile, 'utf-8').trim();
            console.log(`Debug: Found last-posted.txt. Last posted identifier: ${lastPostedIdentifier}`);
        } else {
            console.log('Debug: last-posted.txt not found. Treating as first run or missing file.');
        }

        if (currentVideoIdentifier !== lastPostedIdentifier) {
            console.log(`🎉 New ${type} video/stream detected!`);

            let tweet;
            if (type === 'upcoming') {
                const formattedTime = formatTimeForTweet(publishedAt);
                tweet = getCyclingTweet(title, link, type, formattedTime);
            } else if (type === 'live') { // NEW: Handle 'live' type
                tweet = getCyclingTweet(title, link, type);
            } else { // type === 'published'
                tweet = getCyclingTweet(title, link, type);
            }

            await postTweet(tweet);

            fs.writeFileSync(lastPostedFile, currentVideoIdentifier);
            console.log(`Updated last-posted.txt with identifier: ${currentVideoIdentifier}`);
        } else {
            console.log(`ℹ️ No new ${type} video or stream to post.`);
        }
    } catch (error) {
        console.error('An error occurred in main:', error);
    }
}

main();
