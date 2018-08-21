import { Message, Guild, User, TextChannel, DMChannel, Collection, MessageEmbed } from 'discord.js';
import { Client, Plugin, IPlugin, PluginConstructor, SharedProviderStorage } from '@yamdbf/core';
import { normalize } from './Util';
import { dmManagerFactory } from './dmManagerFactory';
import { DMManagerUsageError } from './DMManagerUsageError';

export class DMManager extends Plugin implements IPlugin
{
	public static readonly default: (guild: string, defaultChannel: string) => PluginConstructor = dmManagerFactory;
	public static readonly dmManager: (guild: string, defaultChannel: string) => PluginConstructor = dmManagerFactory;
	public static readonly DMManager: PluginConstructor = DMManager;

	public readonly name: string = 'DMManager';

	private readonly _client: Client;
	private readonly _guildID: string;
	private readonly _defaultChannelID: string;
	private _storage: SharedProviderStorage;
	private _guild: Guild;
	private _channels: Collection<string, TextChannel>;

	public constructor(client: Client, guild: string = '', defaultChannel: string = '')
	{
		super();
		this._client = client;

		if (!guild || !defaultChannel)
			throw new DMManagerUsageError(
				'Import "dmManager" and pass to plugins with a guild ID and default channel ID');

		if (!this._client.guilds.has(guild))
			throw new Error(`DMManager: Failed to find guild with ID '${guild}'`);

		if (!this._client.guilds.get(guild).channels.has(defaultChannel))
			throw new Error(
				`DMManager: Failed to find a default channel in guild '${guild}' with ID '${defaultChannel}`);

		this._guildID = guild;
		this._defaultChannelID = defaultChannel;
	}

	public async init(storage: SharedProviderStorage): Promise<void>
	{
		this._storage = storage;
		this._guild = this._client.guilds.get(this._guildID);
		if (await this._storage.exists('guild')
			&& await this._storage.get('guild') !== this._guildID)
				await this.clearOpenChannels();

		await this._storage.set('guild', this._guildID);

		if (!this._guild.member(this._client.user).permissions.has(['MANAGE_CHANNELS', 'MANAGE_MESSAGES']))
			throw new Error('DMManager: Bot must have MANAGE_CHANNELS, MANAGE_MESSAGES permissions in the supplied guild');

		this._channels = new Collection(
			(await this._storage.get('openChannels') || []).map((c: [string, string]) =>
				[c[0], this._guild.channels.get(c[1])]) || []);

		this._client.on('message', (message: Message) => this.handleMessage(message));
		this._client.on('channelDelete', (channel: TextChannel) =>
		{
			if (this._channels.find(c => c.id === channel.id))
			{
				this._channels.delete(this._channels.findKey(c => c.id === channel.id));
				this.storeOpenChannels();
			}
		});

		this._client.on('blacklistAdd', (user, global) => { if (global) this.blacklist(user); });
		this._client.on('blacklistRemove', (user, global) => { if (global) this.whitelist(user); });
	}

	/**
	 * Add a user to the DMManager blacklist
	 */
	public async blacklist(user: User): Promise<void>
	{
		await this._storage.set(`blacklist.${user.id}`, true);
	}

	/**
	 * Remove a user from the DMManager blacklist
	 */
	public async whitelist(user: User): Promise<void>
	{
		await this._storage.remove(`blacklist.${user.id}`);
	}

	/**
	 * Return whether or not a user is blacklisted from the DMManager
	 */
	private async isBlacklisted(user: User): Promise<boolean>
	{
		return await this._storage.exists(`blacklist.${user.id}`);
	}

	/**
	 * Update open managed channels in storage
	 */
	private async storeOpenChannels(): Promise<void>
	{
		await this._storage.set('openChannels',
			Array.from(this._channels.entries())
				.map((c: [string, TextChannel]) => [c[0], c[1].id]));
	}

	/**
	 * Remove any open channels from storage
	 */
	private async clearOpenChannels(): Promise<void>
	{
		await this._storage.set('openChannels', []);
		this._channels.clear();
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
			newChannel = <TextChannel> await this._guild.channels
				.create(`${normalize(user.username) || 'unicode'}-${user.discriminator}`, { type: 'text' });
			this._channels.set(user.id, newChannel);
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
	private buildUserInfo(user: User): MessageEmbed
	{
		return new MessageEmbed()
			.setColor(8450847)
			.setAuthor(`${user.username}#${user.discriminator} (${user.id})`, user.avatarURL())
			.setFooter('DM channel started')
			.setTimestamp();
	}

	/**
	 * Handle incoming messages. If it's a DM, find the channel
	 * belonging to the user. If it doesn't exist, create one
	 */
	private async handleMessage(message: Message): Promise<void>
	{
		if (await this.isBlacklisted(message.author)) return;
		if (message.embeds[0] && message.channel.type !== 'dm') return;
		if (message.channel.type !== 'dm' && message.guild.id !== this._guildID) return;
		if (message.guild && message.channel.id === message.guild.id) return;
		if (message.author.id !== this._client.user.id
			&& !this._channels.has(message.author.id) && !message.guild)
			await this.createNewChannel(message.author);

		if (message.channel.type === 'dm')
		{
			const channelID: string = message.author.id === this._client.user.id ?
				(<DMChannel> message.channel).recipient.id : message.author.id;
			const channel: TextChannel = this._channels.get(channelID);
			if (!channel) return;
			if (message.embeds[0]) message.content += '\n\n**[MessageEmbed]**';
			await this.send(channel, message.author, message.content)
				.catch(err => this.sendError(`Failed to send message in #${this._channels.get(channelID).name}\n${err}`));
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
				message.channel.send(new MessageEmbed()
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
		const id: string = this._channels.findKey(c => c.id === channel.id);
		return await this._client.users.fetch(id);
	}

	/**
	 * Send a text message to a managed channel as an embed, spoofing
	 * the provided user to simulate messages from that user
	 */
	private async send(channel: TextChannel, user: User, message: string): Promise<Message>
	{
		return <Message> await channel.send({
			embed: new MessageEmbed()
				.setColor(8450847)
				.setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL())
				.setDescription(message)
				.setTimestamp()
		});
	}

	/**
	 * Send an error to the default channel of the DMManager guild
	 */
	private async sendError(message: string): Promise<Message>
	{
		return <Message> await (<TextChannel> this._guild.channels.get(this._defaultChannelID))
			.send({
				embed: new MessageEmbed()
					.setColor('#FF0000')
					.setTitle('DMManager error')
					.setDescription(message)
					.setTimestamp()
			});
	}
}
