import { Client, PluginConstructor } from 'yamdbf';
import { DMManager } from './DMManager';

export function dmManagerFactory(guild: string): PluginConstructor
{
	return class extends DMManager
	{
		public constructor(client: Client)
		{
			super(client, guild);
		}
	};
}
