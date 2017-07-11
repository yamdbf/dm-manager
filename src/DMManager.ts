import { ClientStorage, Client } from 'yamdbf';
import { Message, Guild, User, TextChannel, DMChannel, Collection, RichEmbed } from 'discord.js';
import { normalize } from './Util';

export class DMManager
{
	private client: Client;
	private guild: Guild;
	private _guild: string;
	private storage: ClientStorage;
	private channels: Collection<string, TextChannel>;

	public constructor(bot: Client, guild: string)
	{
		this.client = bot;
		if (!this.client.guilds.has(guild))
			throw new Error(`DMManager: Failed to find guild with ID '${guild}'`);

		this.storage = this.client.storage;
		this._guild = guild;
	}

	public async init(): Promise<void>
	{
		this.guild = this.client.guilds.get(this._guild);
		if (await this.storage.exists('dmManager.guild')
			&& await this.storage.get('dmManager.guild') !== this._guild)
				await this.clearOpenChannels();

		await this.storage.set('dmManager.guild', this._guild);

		if (!this.guild.member(this.client.user).permissions.has(['MANAGE_CHANNELS', 'MANAGE_MESSAGES']))
			throw new Error('DMManager: Bot must have MANAGE_CHANNELS, MANAGE_MESSAGES permissions in the supplied guild');

		this.channels = new Collection<string, TextChannel>(
			(await this.storage.get('dmManager.openChannels') || []).map((c: [string, string]) =>
				[c[0], this.guild.channels.get(c[1])]) || []);

		this.client.on('message', (message: Message) => this.handleMessage(message));
		this.client.on('channelDelete', (channel: TextChannel) =>
		{
			if (this.channels.find((c: TextChannel) => c.id === channel.id))
			{
				this.channels.delete(this.channels.findKey((c: TextChannel) => c.id === channel.id));
				this.storeOpenChannels();
			}
		});
	}

	/**
	 * Add a user to the DMManager blacklist
	 */
	public async blacklist(user: User): Promise<void>
	{
		await this.storage.set(`dmManager.blacklist.${user.id}`, true);
	}

	/**
	 * Remove a user from the DMManager blacklist
	 */
	public async whitelist(user: User): Promise<void>
	{
		await this.storage.remove(`dmManager.blacklist.${user.id}`);
	}

	/**
	 * Return whether or not a user is blacklisted from the DMManager
	 */
	private async isBlacklisted(user: User): Promise<boolean>
	{
		return await this.storage.exists(`dmManager.blacklist.${user.id}`);
	}

	/**
	 * Update open managed channels in storage
	 */
	private async storeOpenChannels(): Promise<void>
	{
		await this.storage.set('dmManager.openChannels',
			Array.from(this.channels.entries())
				.map((c: [string, TextChannel]) => [c[0], c[1].id]));
	}

	/**
	 * Remove any open channels from storage
	 */
	private async clearOpenChannels(): Promise<void>
	{
		await this.storage.set('dmManager.openChannels', []);
		this.channels = new Collection<string, TextChannel>();
	}

	/**
	 * Create a new managed channel for the user in the dm manager
	 * guild and add it to the channels cache and stored openChannels
	 */
	private async createNewChannel(user: User): Promise<TextChannel>
	{
		let newChannel: TextChannel;
		try
		{
			newChannel = <TextChannel> await this.guild
				.createChannel(`${normalize(user.username) || 'unicode'}-${user.discriminator}`, 'text');
			this.channels.set(user.id, newChannel);
			this.storeOpenChannels();
		}
		catch (err)
		{
			this.sendError(`DMManager: Failed to create channel: '${normalize(user.username)}-${user.discriminator}'\n${err}`);
		}

		if (newChannel) await newChannel.send({ embed: this.buildUserInfo(user) });
		return newChannel;
	}

	/**
	 * Create an embed for user info used at the start
	 * of a new managed channel
	 */
	private buildUserInfo(user: User): RichEmbed
	{
		return new RichEmbed()
			.setColor(8450847)
			.setAuthor(`${user.username}#${user.discriminator} (${user.id})`, user.avatarURL)
			.setFooter('DM channel started')
			.setTimestamp();
	}

	/**
	 * Handle incoming messages. If it's a DM, find the channel
	 * belonging to the user. If it doesn't exist, create one
	 */
	private async handleMessage(message: Message): Promise<void>
	{
		if (this.isBlacklisted(message.author)) return;
		if (message.embeds[0] && message.channel.type !== 'dm') return;
		if (message.channel.type !== 'dm' && message.guild.id !== this._guild) return;
		if (message.guild && message.channel.id === message.guild.id) return;
		if (message.author.id !== this.client.user.id
			&& !this.channels.has(message.author.id) && !message.guild)
			await this.createNewChannel(message.author);

		if (message.channel.type === 'dm')
		{
			const channelID: string = message.author.id === this.client.user.id ?
				(<DMChannel> message.channel).recipient.id : message.author.id;
			const channel: TextChannel = this.channels.get(channelID);
			if (!channel) return;
			if (message.embeds[0]) message.content += '\n\n**[RichEmbed]**';
			await this.send(channel, message.author, message.content)
				.catch(err => this.sendError(`Failed to send message in #${this.channels.get(channelID).name}\n${err}`));
		}
		else
		{
			message.delete();
			const user: User = await this.fetchUser(<TextChannel> message.channel);
			try
			{
				await user.send(message.content);
			}
			catch (err)
			{
				message.channel.sendEmbed(new RichEmbed()
					.setColor('#FF0000')
					.setTitle('There was an error while sending the message')
					.setDescription(err));
			}
		}
	}

	/**
	 * Fetch the user object the managed channel represents contact with
	 */
	private async fetchUser(channel: TextChannel): Promise<User>
	{
		const id: string = this.channels.findKey('id', channel.id);
		return await this.client.fetchUser(id);
	}

	/**
	 * Send a text message to a managed channel as an embed, spoofing
	 * the provided user to simulate messages from that user
	 */
	private async send(channel: TextChannel, user: User, message: string): Promise<Message>
	{
		return <Message> await channel.send({
			embed: new RichEmbed()
				.setColor(8450847)
				.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
				.setDescription(message)
				.setTimestamp()
		});
	}

	/**
	 * Send an error to the default channel of the DMManager guild
	 */
	private async sendError(message: string): Promise<Message>
	{
		return <Message> await (<TextChannel> this.guild.defaultChannel)
			.send({
				embed: new RichEmbed()
					.setColor('#FF0000')
					.setTitle('DMManager error')
					.setDescription(message)
					.setTimestamp()
			});
	}
}
