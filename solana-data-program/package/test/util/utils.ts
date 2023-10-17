export const assert = (condition: boolean, message?: string) => {
	if (!condition) {
		console.log(Error().stack + ":token-test.js");
		throw message || "Assertion failed";
	}
};
