"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Remove any non alphanumeric characters from the given text
 * and lowercase it
 */
function normalize(text) {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}
exports.normalize = normalize;

//# sourceMappingURL=Util.js.map
