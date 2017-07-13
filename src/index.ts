import { PluginConstructor } from 'yamdbf';
import { DMManager } from './DMManager';

const dmManager: (guild: string) => PluginConstructor = DMManager.dmManager;
export { dmManager };
export { DMManager };
export default dmManager;
module.exports = DMManager;
