# dm-manager
`dm-manager` is a plugin for Discord bots that are written with YAMDBF/Discord.js that provides for bot authors an interface with which they can respond to users who DM the bot.

After I started logging bot command usage I realized that users often begin DMing the bot when they don't understand how the bot works and in the case of my bots, despite the presence of a help command, they still DM random things. This offers an opportunity to respond to them with an easy interface.

> Note: Despite being considered a [YAMDBF](https://github.com/zajrik/yamdbf) Addon, this is completely compatible with any bot written using Discord.js.

# Getting started

Install the package via `npm`:
```
npm install --save yamdbf-addon-dm-manager
```

Before anything else, you need to create an empty guild and invite your bot to it. Then you must make sure the bot has `Manage Channels` and `Manage Messages` permissions in this guild. After that you just need to import the module and add a bit of code to your ready event. You can store the DMManager anywhere when constructing; I find it easiest to stick onto the Bot object itself.

```js
const { DMManager } = require('yamdbf-addon-dm-manager');
// ...
bot.once('ready', () => {
	bot.dmManager = new DMManager(bot, 'ID of the guild you set up');
});
```

That's all there is to it. Whenever a DM is sent to the bot from a user, a channel will be made for the user in the guild you passed into the DMManager on construction. Any further DMs sent by the user will be sent to that channel. Any message you send in that channel will be forwarded it to user via DM from the bot.

To close a DM channel, simply delete the channel from the guild from within your Discord client. If the user DMs the bot again, a new managed channel will be created for them.

If you find any problems or have any suggestions, don't hesitate to open up an issue.