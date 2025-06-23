// This script prints whether each token is loaded.
console.log("Testing Twitter API environment variables...");
console.log("TWITTER_API_KEY exists:", !!process.env.TWITTER_API_KEY);
console.log("TWITTER_API_SECRET exists:", !!process.env.TWITTER_API_SECRET);
console.log("TWITTER_ACCESS_TOKEN exists:", !!process.env.TWITTER_ACCESS_TOKEN);
console.log("TWITTER_ACCESS_SECRET exists:", !!process.env.TWITTER_ACCESS_SECRET);
