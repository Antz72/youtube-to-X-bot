// tweet-templates.js - Combined template options for published and upcoming videos

module.exports = {
    published: [
        // Your existing 20 templates, now accepting only title and link.
        (title, link) => `New video just dropped: "${title}"\n\nGrab a drink and join for good vibes. Don't miss this one! ${link}`,
        (title, link) => `Settling in with a new video: "${title}"\n\nCome hang out and see what adventures we stumble into! You'll love it. ${link}`,
        (title, link) => `Ever wondered about "${title}"? Oddly specific but my latest video explores just that!\n\nLet's find some cool stuff together. Click to watch! ${link}`,
        (title, link) => `Fresh video out now: "${title}"\n\nHope it brings a smile! ${link}`,
        (title, link) => `Grab a snack, my new video is perfect for some laid-back viewing: "${title}"\n\nLet's wander through this one. Watch now! ${link}`,
        (title, link) => `A fresh video is up: "${title}"\n\nExpect some chill commentary and perhaps a few laughs. Don't scroll past! ${link}`,
        (title, link) => `New video alert: "${title}"\n\nDelving deep into this one - it's a good one for unwinding. See you there! Must watch! ${link}`,
        (title, link) => `Come on in, the gaming's fine! My newest video is ready for you: "${title}"\n\nLet's see what happens! Join the fun: ${link}`,
        (title, link) => `Sometimes you just need to explore. My new video, "${title}", scratches that itch perfectly.\n\nCome discover with me! ${link}`,
        (title, link) => `Had a blast making this one: "${title}"\n\nHope you have as much fun watching. It's a journey, not a sprint. Click here: ${link}`,
        (title, link) => `What secrets does "${title}" hold?\n\nFind out in my latest video! Exploration awaits. ${link}`,
        (title, link) => `Fancy a virtual stroll? My new video is the perfect companion: "${title}"\n\nKick back and enjoy the views! ${link}`,
        (title, link) => `If you're into "${title}", you'll want to see this!\n\nJust posted a new video with some interesting discoveries. Check it out: ${link}`,
        (title, link) => `Join me on a little adventure: "${title}"\n\nExpect casual banter and unexpected moments in my newest upload. ${link}`,
        (title, link) => `My brain went "huh" during this one: "${title}"\n\nIt's all in the new video! Come share the experience. ${link}`,
        (title, link) => `Another day, another video! We're back with "${title}" and things got a bit... interesting.\n\nSee for yourself: ${link}`,
        (title, link) => `Ever just wanted to chill and watch someone explore? My new video: "${title}" is exactly that.\n\nPerfect for winding down! ${link}`,
        (title, link) => `What mysteries await in "${title}"?\n\nMy latest video unpacks some of them. Let's unravel this together! ${link}`,
        (title, link) => `Getting lost (in a good way!) in this one: "${title}"\n\nCome find your way with me in my new video. ${link}`,
        (title, link) => `Thought I'd share some thoughts on "${title}" in my newest upload.\n\nIt's a casual chat and some gameplay. Don't miss it! ${link}`
    ],
    upcoming: [
        // Your existing templates for upcoming videos, now accepting title, link, and formattedTime.
        (title, link, formattedTime) => `📅 Upcoming! "${title}" is scheduled for ${formattedTime} NZST! Come hang out live: ${link}`,
        (title, link, formattedTime) => `Set your reminders! I'll be live with "${title}" on ${formattedTime} NZST. Join the stream here: ${link}`,
        // Add more upcoming templates if you wish
    ],
    live: [
        // Templates for when a stream is live, now accepting only title and link.
        (title, link) => `🔴 LIVE NOW! Join the stream for "${title}"! Come hang out: ${link}`,
        (title, link) => `We are LIVE! Pop in and say hi for "${title}" right now! ${link}`,
        (title, link) => `Stream is officially ON! Come join the fun for "${title}" here: ${link}`,
        (title, link) => `What are we getting into today? Find out! I'm LIVE with "${title}"! Join the chaos: ${link}`,
        (title, link) => `The stream has started! Tune in for "${title}" and let's have some fun! ${link}`
    ]
};
