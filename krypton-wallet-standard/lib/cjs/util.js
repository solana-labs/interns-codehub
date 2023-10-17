"use strict";
// This is copied from @wallet-standard/wallet
Object.defineProperty(exports, "__esModule", { value: true });
exports.arraysEqual = exports.bytesEqual = void 0;
function bytesEqual(a, b) {
    return arraysEqual(a, b);
}
exports.bytesEqual = bytesEqual;
function arraysEqual(a, b) {
    if (a === b)
        return true;
    const length = a.length;
    if (length !== b.length)
        return false;
    for (let i = 0; i < length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
exports.arraysEqual = arraysEqual;
//# sourceMappingURL=util.js.map