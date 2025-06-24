const Parser = require('rss-parser');
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');

// IMPORTANT: Ensure this is your correct YouTube Channel ID
const rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC09QwXpdgjgd6l8BFBRlZMw'; 

const lastPostedFile = 'last-posted.txt'; // This file will store the ID of the last posted video

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
        // Check if last-posted.txt exists from artifact download (preferred)
        if (fs.existsSync(lastPostedFile)) {
            last

