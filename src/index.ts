import { PluginConstructor } from '@yamdbf/core';
import { DMManager } from './DMManager';

const dmManager: (guild: string, defaultChannel: string) => PluginConstructor = DMManager.dmManager;
export { dmManager };
export { DMManager };
export default dmManager;
module.exports = DMManager;
