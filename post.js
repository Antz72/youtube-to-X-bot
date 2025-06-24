const Parser = require('rss-parser');
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const tweetTemplates = require('./tweet-templates.js'); // Import the templates

// IMPORTANT: Ensure this is your correct YouTube Channel ID
const rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC09QwXpdgjgd6l8BFBRlZMw'; 

const lastPostedFile = 'last-posted.txt'; // This file will store the ID of the last posted video
const templateIndexFile = 'template-indices.json'; // New file to store used template indices

// Function to get YouTube videos
async function getYouTubeVideos() {
    let parser = new Parser();
    let feed = await parser.parseURL(rssUrl);
    return feed.items;
}

// Function to post tweet
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
        // Do not throw error here, allow the script to finish
    }
}

// NEW: Function to get a random tweet ensuring no repeats until all are used
function getCyclingTweet(title, link) {
    const hashtagTitle = title.replace(/[^a-zA-Z0-9]/g, '').substring(0,20);

    let availableIndices = [];
    // Try to load available indices from the temporary file (cached)
    if (fs.existsSync(templateIndexFile)) {
        try {
            availableIndices = JSON.parse(fs.readFileSync(templateIndexFile, 'utf-8'));
            console.log(`Debug: Loaded available template indices: ${availableIndices}`);
        } catch (e) {
            console.error('Error parsing template-indices.json, resetting:', e);
            availableIndices = []; // Fallback if file is corrupted
        }
    }

    // If no available indices or corrupted, initialize them
    if (availableIndices.length === 0) {
        console.log('Debug: Initializing or resetting all template indices.');
        availableIndices = Array.from({ length: tweetTemplates.length }, (_, i) => i);
    }

    // Pick a random index from the available ones
    const randomArrayIndex = Math.floor(Math.random() * availableIndices.length);
    const selectedTemplateIndex = availableIndices[randomArrayIndex];

    // Remove the selected index from the available ones
    availableIndices.splice(randomArrayIndex, 1);

    // Save the updated available indices back to the temporary file
    fs.writeFileSync(templateIndexFile, JSON.stringify(availableIndices));
    console.log(`Debug: Remaining template indices: ${availableIndices}`);

    return tweetTemplates[selectedTemplateIndex](title, link, hashtagTitle);
}

async function main() {
    try {
        const videos = await getYouTubeVideos();
        if (videos.length === 0) {
            console.log('No videos found in the RSS feed.');
            return;
        }

        const latestVideo = videos[0];
        const { id, title, link } = latestVideo;

        let lastPosted = '';
        // With actions/cache, lastPostedFile will be present if cached successfully
        // If not cached, it will fall back to the manually committed file.
        if (fs.existsSync(lastPostedFile)) {
            lastPosted = fs.readFileSync(lastPostedFile, 'utf-8').trim();
            console.log(`Debug: Found last-posted.txt (from cache or manual commit). Last posted ID: ${lastPosted}`);
        } else {
            console.log('Debug: last-posted.txt not found. Treating as first run or missing file.');
        }

        // Extract just the video ID from the YouTube ID format (e.g., 'yt:video:VIDEO_ID')
        const videoId = id.replace('yt:video:', '');

        if (videoId !== lastPosted) {
            console.log('🎉 New video detected!');
            const tweet = getCyclingTweet(title, link); // Use the new cycling tweet generation
            await postTweet(tweet);

            fs.writeFileSync(lastPostedFile, videoId);
            console.log(`Updated last-posted.txt with ID: ${videoId}`);
        } else {
            console.log('ℹ️ No new video to post.');
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main();
