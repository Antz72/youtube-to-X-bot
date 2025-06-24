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

        // Fetch enough items to find a recent upcoming or published video
        // We'll fetch detailed video status for each below.
        const playlistItemsResponse = await youtube.playlistItems.list({
            part: 'snippet', // Still need snippet for title and videoId
            playlistId: uploadsPlaylistId,
            maxResults: 10, // Get up to 10 recent items
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

            // --- ADDED DEBUG LOGGING START ---
            console.log(`--- Processing Video: ${videoTitle} (ID: ${videoId}) ---`);
            console.log(`  Initial liveBroadcastContent from playlist item: ${item.snippet.liveBroadcastContent}`);
            // --- ADDED DEBUG LOGGING END ---

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
            const publishedAt = new Date(snippet.publishedAt); // This is the actual publish date for regular videos, or scheduled for streams

            // --- ADDED DEBUG LOGGING START ---
            console.log(`  PublishedAt from video details: ${snippet.publishedAt}`);
            console.log(`  PublishedAt (Date object): ${publishedAt}`);
            console.log(`  Current time (Date object): ${now}`);
            console.log(`  Is publishedAt in future? ${publishedAt > now}`);
            if (liveDetails) {
                console.log(`  Live Streaming Details:`);
                console.log(`    actualStartTime: ${liveDetails.actualStartTime || 'N/A'}`);
                console.log(`    scheduledStartTime: ${liveDetails.scheduledStartTime || 'N/A'}`);
            } else {
                console.log(`  No Live Streaming Details found.`);
            }
            // --- ADDED DEBUG LOGGING END ---


            // --- Determine video type based on comprehensive details ---
            if (liveDetails && liveDetails.actualStartTime) {
                // Video is currently live or was recently live
                // This is the highest priority, so if we find one, we use it immediately.
                currentlyLiveVideo = {
                    id: videoId,
                    title: videoTitle,
                    link: `https://www.youtube.com/watch?v=$${videoId}`,
                    publishedAt: snippet.publishedAt, // Using the original publishedAt
                    type: 'live',
                };
                break; // Found the live one, no need to check others for now
            } else if (liveDetails && liveDetails.scheduledStartTime && new Date(liveDetails.scheduledStartTime) > now) {
                // Video is an upcoming stream and its scheduled time is in the future
                if (!nextUpcomingVideo || new Date(liveDetails.scheduledStartTime) < new Date(nextUpcomingVideo.publishedAt)) {
                    // Prioritize the *earliest* upcoming video by its scheduled time
                    nextUpcomingVideo = {
                        id: videoId,
                        title: videoTitle,
                        link: `https://www.youtube.com/watch?v=$${videoId}`,
                        publishedAt: liveDetails.scheduledStartTime, // Use scheduledStartTime for upcoming
                        type: 'upcoming',
                    };
                }
            } else {
                // It's a regular published video or a completed stream/VOD.
                // Note: completed live streams will often have liveDetails but no scheduledStartTime in future
                if (!mostRecentPublishedVideo || publishedAt > new Date(mostRecentPublishedVideo.publishedAt)) {
                    // Prioritize the *most recent* published video
                    mostRecentPublishedVideo = {
                        id: videoId,
                        title: videoTitle,
                        link: `https://www.youtube.com/watch?v=$${videoId}`,
                        publishedAt: snippet.publishedAt,
                        type: 'published',
                    };
                }
            }
        }

        // Final prioritization: Live > Upcoming > Published
        if (currentlyLiveVideo) {
            console.log(`Debug: Selected Live Video: ${currentlyLiveVideo.title} (ID: ${currentlyLiveVideo.id})`);
            return currentlyLiveVideo;
        } else if (nextUpcomingVideo) {
            console.log(`Debug: Selected Upcoming Video: ${nextUpcomingVideo.title} (ID: ${nextUpcomingVideo.id})`);
            return nextUpcomingVideo;
        } else if (mostRecentPublishedVideo) {
            console.log(`Debug: Selected Published Video: ${mostRecentPublishedVideo.title} (ID: ${mostRecentPublishedVideo.id})`);
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
    } else if (videoType === 'live') {
        return templateFn(title, link, hashtagTitle);
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
            } else if (type === 'live') {
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
