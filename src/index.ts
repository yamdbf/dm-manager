import { DMManager } from './DMManager';
import { PluginConstructor } from '@yamdbf/core';

const dmManager: (guild: string, defaultChannel: string) => PluginConstructor = DMManager.dmManager;
export { dmManager };
export { DMManager };
export default dmManager;
module.exports = DMManager;
