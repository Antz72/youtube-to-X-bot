# YouTube to X (Twitter) Bot

This is a robot that automatically posts to your X (Twitter) account whenever you upload a new YouTube video.

It's like having a helper that watches your YouTube channel. When it sees a new video, it grabs the title and link and creates a cool announcement on X for you, so you don't have to do it yourself!

### 🚀 Easy Setup
> **New to code?** Use the [**Configuration Wizard**](https://antz72.github.io/youtube-to-X-bot/wizard.html) to set up your bot without editing any files directly.

---

## Cool Features

* **Smart Announcer:** Knows if your video is a brand new upload, a scheduled livestream, or happening right now, and uses different messages for each.
* **No Boring Repeats:** You can give it a bunch of different tweet ideas, and it will pick a new one each time so your posts always look fresh.
* **Good Memory:** It remembers the last video it tweeted about, so it will never accidentally post the same video twice.
* **Works on a Schedule:** It checks for new videos every 30 minutes, all by itself. You can also tell it to run anytime you want.

---

## How to Set Up Your Bot

Follow these steps to get your own bot working.

### Step 1: Copy this Project

First, you need your own copy of this project folder.
* Click the **"Fork"** button at the top-right of this page. This will create a copy of the project in your own GitHub account.

### Step 2: Tell the Bot About Your Channel

Now, you need to tell the bot which YouTube channel to watch.
* In your new project folder, find and open the file named `config.js`.
* Change the `YOUTUBE_CHANNEL_ID` to your channel's ID. (You can usually find this in your YouTube Studio settings).
* You can also change the `STATIC_HASHTAGS` to any hashtags you always want to use, like `#Minecraft` or `#Roblox`.

### Step 3: Write Your Tweet Ideas

This is the fun part! You get to tell the bot what to say.
* Open the file named `tweet-templates.js`.
* You will see lists for `published` (new videos), `upcoming` (scheduled streams), and `live` (when you're streaming now).
* You can change any of the messages or add your own! The bot will automatically add the video's title and link for you.
* **Example:** To add a new idea for a published video, you could add this line to the `published` list:
  ```javascript
  (title, link) => `Yo! Dropped a new video, "${title}". Go check it out and let me know what you think! ${link}`
  ```

### Step 4: Add Your Secret Keys

The bot needs special keys to be able to post for you. These are kept super secret so no one else can see them.
* In your project on GitHub, go to `Settings` > `Secrets and variables` > `Actions`.
* Click the **"New repository secret"** button and add these five secrets one by one. You'll get these from the Google and X (Twitter) developer websites.
  * `YOUTUBE_API_KEY`
  * `TWITTER_API_KEY`
  * `TWITTER_API_SECRET`
  * `TWITTER_ACCESS_TOKEN`
  * `TWITTER_ACCESS_SECRET`

### Step 5: Turn It On!

* Go to the **"Actions"** tab in your project.
* If you see a button that says "I understand my workflows, go ahead and enable them", click it.
* That's it! Your bot is now running and will check for new videos every 30 minutes.

---

## How to Turn the Bot On and Off

If you want to pause the bot for a while (maybe you're taking a break from YouTube), it's easy!

1. Go to the **Actions** tab in your project.
2. On the left side, click on **"YouTube to X Bot"**.
3. Find the **"..."** button on the right.
4. Click **"Disable workflow"** to turn it off.
5. To turn it back on, just do the same thing and click **"Enable workflow"**.
