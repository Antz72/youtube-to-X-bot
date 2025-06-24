// tweet-templates.js - Combined template options for published and upcoming videos

module.exports = {
    published: [
        // Your existing 20 templates, now accepting only title, link, and hashtagTitle.
        (title, link, hashtagTitle) => `New video just dropped: "${title}"\n\nGrab a cuppa and join the chill vibes. Don't miss this one! ${link}\n\n#NewVideo #Gaming #YouTube #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Settling in with a new video: "${title}"\n\nCome hang out and see what adventures we stumble into! You'll love it. ${link}\n\n#GamingVibes #YouTubeGaming #NewUpload #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Ever wondered about "${title}"? My latest video explores just that!\n\nLet's find some cool stuff together. Click to watch! ${link}\n\n#Gaming #VideoGames #ContentCreator #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Fresh video out now: "${title}"\n\nHope it brings a smile and a perfect escape! ${link}\n\n#YouTube #NewVideo #Gamer #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Grab a snack, my new video is perfect for some laid-back viewing: "${title}"\n\nLet's wander through this one. Watch now! ${link}\n\n#GamingCommunity #YouTubeCreator #Playtime #${hashtagTitle}`,
        (title, link, hashtagTitle) => `A fresh video is up: "${title}"\n\nExpect some chill commentary and perhaps a few laughs. Don't scroll past! ${link}\n\n#Gaming #NewUpload #VideoContent #${hashtagTitle}`,
        (title, link, hashtagTitle) => `New video alert: "${title}"\n\nDelving deep into this one - it's a good one for just unwinding. See you there! Must watch! ${link}\n\n#YouTubeGaming #GamingSession #OnlineGaming #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Come on in, the gaming's fine! My newest video is ready for you: "${title}"\n\nLet's see what happens! Join the fun: ${link}\n\n#GamingJourney #ContentCreator #NewVideo #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Sometimes you just need to explore. My new video, "${title}", scratches that itch perfectly.\n\nCome discover with me! ${link}\n\n#Gaming #YouTube #Explore #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Had a blast making this one: "${title}"\n\nHope you have as much fun watching. It's a journey, not a sprint. Click here: ${link}\n\n#GamingLife #NewContent #YouTubeCreator #${hashtagTitle}`,
        (title, link, hashtagTitle) => `What secrets does "${title}" hold?\n\nFind out in my latest video! A cozy exploration awaits. ${link}\n\n#Gaming #VideoGames #Discovery #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Fancy a virtual stroll? My new video is the perfect companion: "${title}"\n\nKick back and enjoy the views! ${link}\n\n#GamingVlog #YouTube #ChillVibes #${hashtagTitle}`,
        (title, link, hashtagTitle) => `If you're into "${title}", you'll want to see this!\n\nJust posted a new video with some interesting discoveries. Check it out: ${link}\n\n#Gamer #NewVideo #YouTubeGaming #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Join me on a little adventure: "${title}"\n\nExpect casual banter and unexpected moments in my newest upload. ${link}\n\n#Gaming #ContentCreator #Adventure #${hashtagTitle}`,
        (title, link, hashtagTitle) => `My brain went "huh" during this one: "${title}"\n\nIt's all in the new video! Come share the experience. ${link}\n\n#FunnyGaming #YouTube #GamingMoments #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Another day, another video! We're back with "${title}" and things got a bit... interesting.\n\nSee for yourself: ${link}\n\n#Gaming #DailyVideo #Playthrough #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Ever just wanted to chill and watch someone explore? My new video: "${title}" is exactly that.\n\nPerfect for winding down! ${link}\n\n#RelaxingGaming #YouTube #GamingContent #${hashtagTitle}`,
        (title, link, hashtagTitle) => `What mysteries await in "${title}"?\n\nMy latest video unpacks some of them. Let's unravel this together! ${link}\n\n#Gaming #Mystery #YouTubeCreator #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Getting lost (in a good way!) in this one: "${title}"\n\nCome find your way with me in my new video. ${link}\n\n#Gaming #Discovery #VideoGames #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Thought I'd share some thoughts on "${title}" in my newest upload.\n\nIt's a casual chat and some gameplay. Don't miss it! ${link}\n\n#GamingThoughts #YouTube #Community #${hashtagTitle}`
    ],
    upcoming: [
        // Your existing templates for upcoming videos go here.
        (title, link, hashtagTitle, formattedTime) => `📅 Upcoming! "${title}" is scheduled for ${formattedTime} NZST! Come hang out live: ${link} #LiveStream #${hashtagTitle}`,
        (title, link, hashtagTitle, formattedTime) => `Set your reminders! I'll be live with "${title}" on ${formattedTime} NZST. Join the stream here: ${link} #UpcomingLive #${hashtagTitle}`,
        // Add more upcoming templates if you wish
    ],
    live: [
        // NEW: Templates for when a stream is live
        (title, link, hashtagTitle) => `🔴 LIVE NOW! Join the stream for "${title}"! Come hang out: ${link} #LiveStream #Gaming #${hashtagTitle}`,
        (title, link, hashtagTitle) => `We are LIVE! Pop in and say hi for "${title}" right now! ${link} #NowLive #GamingCommunity #${hashtagTitle}`,
        (title, link, hashtagTitle) => `Stream is officially ON! Come join the fun for "${title}" here: ${link} #LiveGaming #YouTubeLive #${hashtagTitle}`, // Note: Changed #Twitch to general #YouTubeLive if it's primarily YouTube
        (title, link, hashtagTitle) => `What are we getting into today? Find out! I'm LIVE with "${title}"! Join the chaos: ${link} #LiveNow #Playtime #${hashtagTitle}`,
        (title, link, hashtagTitle) => `The stream has started! Tune in for "${title}" and let's have some fun! ${link} #GoLive #GamingVibes #${hashtagTitle}`
    ]
};
