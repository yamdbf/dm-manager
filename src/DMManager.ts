import { LocalStorage } from 'yamdbf';
import { Client, Message, Guild, User, TextChannel, DMChannel, Collection, RichEmbed } from 'discord.js';

export default class DMManager
{
	private client: Client;
	private _guild: Guild;
	private storage: LocalStorage;
	private channels: Collection<string, TextChannel>;

	public constructor(bot: Client, guild: string)
	{
		this.client = bot;
		if (!this.client.guilds.has(guild))
			throw new Error(`DMManager: Failed to find guild with ID '${guild}'`);

		this.storage = new LocalStorage('storage/DMManager');

		this.guild = guild;
		if (!this._guild.member(this.client.user).hasPermissions(['MANAGE_CHANNELS', 'MANAGE_MESSAGES']))
			throw new Error('DMManager: Bot must have MANAGE_CHANNELS, MANAGE_MESSAGES permissions in the supplied guild');

		this.channels = new Collection<string, TextChannel>(
			(this.storage.getItem('openChannels') || []).map((c: [string, string]) =>
				[c[0], this._guild.channels.get(c[1])]) || []);

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

	private get guild(): string { return this._guild.id; }

	/**
	 * If guild does not match the guild in storage, assume
	 * the manager has been assigned to a new guild and remove
	 * open channels from storage as they no longer need to be
	 * tracked
	 */
	private set guild(value)
	{
		this._guild = this.client.guilds.get(value);
		if (this.storage.exists('guild')
			&& this.storage.getItem('guild') !== value)
			this.clearOpenChannels();
	}

	/**
	 * Update open managed channels in storage
	 */
	private storeOpenChannels(): void
	{
		this.storage.setItem('openChannels', Array.from(this.channels.entries())
			.map((c: [string, TextChannel]) => [c[0], c[1].id]));
	}

	/**
	 * Remove any open channels from storage
	 */
	private clearOpenChannels(): void
	{
		this.storage.setItem('openChannels', []);
		this.channels = new Collection<string, TextChannel>();
	}

	/**
	 * Create a new managed channel for the user in the dm manager
	 * guild and add it to the channels cache and stored openChannels
	 */
	private async createNewChannel(user: User): Promise<TextChannel>
	{
		const newChannel: TextChannel = <TextChannel> await this._guild
			.createChannel(`${user.username}-${user.discriminator}`, 'text');
		this.channels.set(user.id, newChannel);
		this.storeOpenChannels();

		await newChannel.sendEmbed(this.buildUserInfo(user));
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
		if (message.embeds[0] && message.channel.type !== 'dm') return;
		if (message.channel.type !== 'dm' && message.guild.id !== this.guild) return;
		if (message.author.id !== this.client.user.id && !this.channels.has(message.author.id))
			await this.createNewChannel(message.author);

		if (message.channel.type === 'dm')
		{
			const channelID: string = message.author.id === this.client.user.id ?
				(<DMChannel> message.channel).recipient.id : message.author.id;
			const channel: TextChannel = this.channels.get(channelID);
			if (message.embeds[0]) message.content += '\n\n**[RichEmbed]**';
			await this.send(channel, message.author, message.content);
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
		return await channel.sendEmbed(
			new RichEmbed()
				.setColor(8450847)
				.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL)
				.setDescription(message)
				.setTimestamp());
	}
}
