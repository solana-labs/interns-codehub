export declare function bytesEqual(a: Uint8Array, b: Uint8Array): boolean;
interface Indexed<T> {
    length: number;
    [index: number]: T;
}
export declare function arraysEqual<T>(a: Indexed<T>, b: Indexed<T>): boolean;
export {};
//# sourceMappingURL=util.d.ts.map