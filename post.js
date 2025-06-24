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
            lastPosted = fs.readFileSync(lastPostedFile, 'utf-8').trim();
            console.log(`Debug: Found last-posted.txt from artifact/working directory. Last posted ID: ${lastPosted}`);
        } else {
            // If artifact was not downloaded, try to use the manually committed file in the root
            // This happens on the very first run, or if the artifact somehow gets deleted.
            const manualLastPostedPath = './last-posted.txt'; 
            if (fs.existsSync(manualLastPostedPath)) {
                lastPosted = fs.readFileSync(manualLastPostedPath, 'utf-8').trim();
                console.log(`Debug: Artifact not found, using manually committed last-posted.txt. Last posted ID: ${lastPosted}`);
            } else {
                console.log('Debug: No last-posted.txt found (neither from artifact nor manual commit). Treating as first run.');
            }
        }

        // Extract just the video ID from the YouTube ID format (e.g., 'yt:video:VIDEO_ID')
        const videoId = id.replace('yt:video:', '');

        if (videoId !== lastPosted) {
            console.log('🎉 New video detected!');
            // Optimize for engagement: emojis, clear CTA, title-based hashtag, general hashtags.
            const tweet = `🎬 NEW VIDEO! ${title}\n\n👉 Watch now: ${link}\n\n#YouTube #NewVideo #${title.replace(/[^a-zA-Z0-9]/g, '').substring(0,20)} #Gaming`; // Remember to replace #Gaming with your actual niche!
            await postTweet(tweet);

            // Update the last-posted.txt file with the new video ID
            // This file will then be uploaded as an artifact for the next run.
            fs.writeFileSync(lastPostedFile, videoId);
            console.log(`Updated last-posted.txt with ID: ${videoId}`);
        } else {
            console.log('ℹ️ No new video to post.');
        }
    } catch (error) {
        console.error('An error
