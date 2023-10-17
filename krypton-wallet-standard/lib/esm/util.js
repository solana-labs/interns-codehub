// This is copied from @wallet-standard/wallet
export function bytesEqual(a, b) {
    return arraysEqual(a, b);
}
export function arraysEqual(a, b) {
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
//# sourceMappingURL=util.js.map