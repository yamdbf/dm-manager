# dm-manager
`dm-manager` is a plugin for Discord bots that are written with YAMDBF+Discord.js
that provides for bot authors an interface with which they can respond to users
who DM the bot.

After I started logging bot command usage I realized that users often begin DMing
the bot when they don't understand how the bot works and in the case of my bots,
despite the presence of a help command, they still DM random things. This offers
an opportunity to respond to them with an easy interface.

# Usage

Install the package via `npm`:
```
npm install --save yamdbf-dm-manager
```

>Note: Until YAMDBF 3.0.0 is officially released, I'm not going to be pushing updates
for this on NPM. In the meantime, you can install directly from github with
`npm install --save zajrik/yamdbf-dm-manager`

Before anything else you need to create an empty guild and invite your bot to it.
Then you must make sure the bot has `Manage Channels` and `Manage Messages` permissions
in the guild. After that need to import `dmManager` from the module and pass it to your
YAMDBF Client plugins array in your YAMDBF Client options with the id of the guild you
set up

```js
const { Client } = require('yamdbf');
const { dmManager } = require('yamdbf-dm-manager');
...
const client = new Client({
	...
	plugins: [dmManager('guildID')]
});
```

That's all there is to it. Whenever a DM is sent to the bot from a user, a channel will
be made for the user in the guild you passed into the dmManager plugin function. Any
further DMs sent by the user will be sent to that channel. Any message you send in that
channel will be forwarded to the user via DM from the bot.

To close a DM channel, simply delete the channel from the guild from within your Discord
client. If the user DMs the bot again, a new managed channel will be created for them.

If you find any problems or have any suggestions, don't hesitate to open up an issue.
