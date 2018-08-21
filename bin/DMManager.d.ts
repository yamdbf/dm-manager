import { User } from 'discord.js';
import { Client, Plugin, IPlugin, PluginConstructor, SharedProviderStorage } from '@yamdbf/core';
export declare class DMManager extends Plugin implements IPlugin {
    static readonly default: (guild: string, defaultChannel: string) => PluginConstructor;
    static readonly dmManager: (guild: string, defaultChannel: string) => PluginConstructor;
    static readonly DMManager: PluginConstructor;
    readonly name: string;
    private readonly _client;
    private readonly _guildID;
    private readonly _defaultChannelID;
    private _storage;
    private _guild;
    private _channels;
    constructor(client: Client, guild?: string, defaultChannel?: string);
    init(storage: SharedProviderStorage): Promise<void>;
    /**
     * Add a user to the DMManager blacklist
     */
    blacklist(user: User): Promise<void>;
    /**
     * Remove a user from the DMManager blacklist
     */
    whitelist(user: User): Promise<void>;
    /**
     * Return whether or not a user is blacklisted from the DMManager
     */
    private isBlacklisted;
    /**
     * Update open managed channels in storage
     */
    private storeOpenChannels;
    /**
     * Remove any open channels from storage
     */
    private clearOpenChannels;
    /**
     * Create a new managed channel for the user in the dm manager
     * guild and add it to the channels cache and stored openChannels
     */
    private createNewChannel;
    /**
     * Create an embed for user info used at the start
     * of a new managed channel
     */
    private buildUserInfo;
    /**
     * Handle incoming messages. If it's a DM, find the channel
     * belonging to the user. If it doesn't exist, create one
     */
    private handleMessage;
    /**
     * Fetch the user object the managed channel represents contact with
     */
    private fetchUser;
    /**
     * Send a text message to a managed channel as an embed, spoofing
     * the provided user to simulate messages from that user
     */
    private send;
    /**
     * Send an error to the default channel of the DMManager guild
     */
    private sendError;
}
