import { Client, PluginConstructor } from '@yamdbf/core';
import { DMManager } from './DMManager';

export function dmManagerFactory(guild: string, defaultChannel: string): PluginConstructor
{
	return class extends DMManager
	{
		public constructor(client: Client)
		{
			super(client, guild, defaultChannel);
		}
	};
}
