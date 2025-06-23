const fs = require('fs');
const Parser = require('rss-parser');
const { TwitterApi } = require('twitter-api-v2');

const parser = new Parser();

// 👉 Replace this with your actual channel ID
const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC09QwXpdgjgd6l8BFBRlZMw';
const lastPostedFile = 'last-posted.txt';

(async () => {
  try {
    const feed = await parser.parseURL(feedUrl);
    const latest = feed.items[0];
    const title = latest.title;
    const link = latest.link;
    const id = latest.id;

    let lastPosted = '';
    if (fs.existsSync(lastPostedFile)) {
      lastPosted = fs.readFileSync(lastPostedFile, 'utf-8');
    }

    if (id !== lastPosted) {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
      });

      const tweet = const tweet = `🎬 NEW VIDEO! ${title}\n\n👉 Watch now: ${link}\n\n#YouTube #NewVideo #${title.replace(/[^a-zA-Z0-9]/g, '').substring(0,20)} #Gaming #SmallStreamers (or replace with your niche)`;;
      await client.v2.tweet(tweet);

      fs.writeFileSync(lastPostedFile, id);
      console.log('✅ Tweet posted!');
    } else {
      console.log('ℹ️ No new video to post.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
