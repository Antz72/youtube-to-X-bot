const Parser = require('rss-parser');
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');

const rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC09QwXpdgjgd6l8BFBRlZMw'; // Replace with your actual channel ID

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
        // Check if last-posted.txt exists from artifact download
        if (fs.existsSync(lastPostedFile)) {
            lastPosted = fs.readFileSync(lastPostedFile, 'utf-8').trim();
            console.log(`Debug: Found last-posted.txt. Last posted ID from file: ${lastPosted}`);
        } else {
            // If artifact was not downloaded, try to use the manually committed file in the root
            const manualLastPostedPath = './last-posted.txt'; // Path to the manually committed file
            if (fs.existsSync(manualLastPostedPath)) {
                lastPosted = fs.readFileSync(manualLastPostedPath, 'utf-8').trim();
                console.log(`Debug: Artifact not found, using manually committed last-posted.txt. Last posted ID: ${lastPosted}`);
            } else {
                console.log('Debug: No last-posted.txt found (neither artifact nor manual commit). Treating as first run.');
            }
        }

        // Extract just the video ID from the YouTube ID
        const videoId = id.replace('yt:video:', '');

        if (videoId !== lastPosted) {
            console.log('🎉 New video detected!');
            const tweet = `🎬 NEW VIDEO! ${title}\n\n👉 Watch now: ${link}\n\n#YouTube #NewVideo #${title.replace(/[^a-zA-Z0-9]/g, '').substring(0,20)} #Gaming`; // Using #Gaming as example niche
            await postTweet(tweet);

            // Update the last-posted.txt file with the new video ID
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
