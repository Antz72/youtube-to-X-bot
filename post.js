const { TwitterApi } = require('twitter-api-v2');
const { google } = require('googleapis');
const fs = require('fs');
const tweetTemplates = require('./tweet-templates.js');

// --- Configuration ---
const YOUTUBE_CHANNEL_ID = 'UC09QwXpdgjgd6l8BFBRlZMw'; // Your actual channel ID
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const lastPostedFile = 'last-posted.txt';
const templateIndexFile = 'template-indices.json';
const dryRunConfigFile = 'dry-run-config.txt'; // Define the path to your new config file

// --- Hashtag Configuration ---
const STATIC_HASHTAGS = ['#Gaming', '#PCGaming', '#NewVideo']; // Your static hashtags
const CONTEXTUAL_HASHTAGS = {
    'live': '#LiveStream',
    'upcoming': '#UpcomingLive',
    'published': '#NewUpload'
};

// --- DRY RUN MODE ---
let DRY_RUN = true; // Default to true (safe)
if (fs.existsSync(dryRunConfigFile)) {
    try {
        const dryRunSetting = fs.readFileSync(dryRunConfigFile, 'utf-8').trim().toLowerCase();
        DRY_RUN = dryRunSetting === 'true';
    } catch (e) {
        console.error(`Error reading ${dryRunConfigFile}:`, e.message);
        console.log('Defaulting DRY_RUN to true due to error.');
        DRY_RUN = true; // Fallback to safe mode if file read fails
    }
} else {
    console.log(`Warning: ${dryRunConfigFile} not found. Defaulting DRY_RUN to true.`);
    DRY_RUN = true; // Default to true if file doesn't exist
}

// --- Initialize YouTube API Client ---
const youtube = google.youtube({
    version: 'v3',
    auth: YOUTUBE_API_KEY,
});

// --- Utility function for time formatting ---
function formatTimeForTweet(isoDateString) {
    const date = new Date(isoDateString);
    // Format for New Zealand Standard Time (NZST), e.g., Mon, 24 Jun at 3:00 PM
    return date.toLocaleString('
