const fs = require('fs');
const Parser = require('rss-parser');
const { TwitterApi } = require('twitter');

const parser = new Parser();

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

      const tweet = `🎬 New video just dropped: ${title}\n📺 Watch here: ${link}`;
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
