import { PublicKey } from "@solana/web3.js";
import { Dispatch, SetStateAction } from "react";
import { ThemeKeys, ThemeObject } from "react-json-view";
import { IDataAccountMeta } from "solana-data-program";

const LOCALHOST = "http://localhost:8899";

export type ApiError = {
	error: string;
};

export type ClusterContextType = {
	cluster: string;
	setCluster: Dispatch<SetStateAction<string>>;
};

export const ClusterNames = {
	DEVNET: { name: "Devnet", url: "https://api.devnet.solana.com" },
	TESTNET: { name: "Testnet", url: "https://api.testnet.solana.com" },
	MAINNET_BETA: {
		name: "Mainnet Beta",
		url: "https://api.mainnet-beta.solana.com",
	},
	CUSTOM: { name: "Custom", url: LOCALHOST },
};

export type EditorThemeType = {
	editorTheme: string;
	setEditorTheme: Dispatch<SetStateAction<string>>;
};

const SOLD_THEME = {
	base00: "#1c1917", // background
	base01: "#e7e5e4", // edit background, add label
	base02: "#78716c", // NULL background, collapse lines
	base03: "white", // unused
	base04: "#9945ff", // object size, add border
	base05: "#292524", // undefined, add background
	base06: "white", // unused
	base07: "#fde68a", // brace+key, edit border
	base08: "#be123c", // NaN
	base09: "#f43f5e", // string, cancel+remove icon
	base0A: "#292524", // null+regex, edit+add color
	base0B: "#03e1ff", // float
	base0C: "#78716c", // array key
	base0D: "#14f195", // data+function, expanded+copy check icon
	base0E: "#14f195", // boolean, collapsed+edit+add+check icon
	base0F: "#e7e5e4", // integer, copy icon
};

export const EditorThemeMap = new Map<string, ThemeKeys | ThemeObject>([
	["apathy", "apathy"],
	["apathy:inverted", "apathy:inverted"],
	["ashes", "ashes"],
	["bespin", "bespin"],
	["brewer", "brewer"],
	["bright:inverted", "bright:inverted"],
	["bright", "bright"],
	["chalk", "chalk"],
	["codeschool", "codeschool"],
	["colors", "colors"],
	["eighties", "eighties"],
	["embers", "embers"],
	["flat", "flat"],
	["google", "google"],
	["grayscale", "grayscale"],
	["grayscale:inverted", "grayscale:inverted"],
	["greenscreen", "greenscreen"],
	["harmonic", "harmonic"],
	["hopscotch", "hopscotch"],
	["isotope", "isotope"],
	["marrakesh", "marrakesh"],
	["mocha", "mocha"],
	["monokai", "monokai"],
	["ocean", "ocean"],
	["paraiso", "paraiso"],
	["pop", "pop"],
	["railscasts", "railscasts"],
	["shapeshifter", "shapeshifter"],
	["shapeshifter:inverted", "shapeshifter:inverted"],
	["solarized", "solarized"],
	["solD", SOLD_THEME],
	["summerfruit", "summerfruit"],
	["summerfruit:inverted", "summerfruit:inverted"],
	["threezerotwofour", "threezerotwofour"],
	["tomorrow", "tomorrow"],
	["tube", "tube"],
	["twilight", "twilight"],
]);
export const EditorThemeKeys = Array.from(EditorThemeMap.keys());

export type DataAccountWithMeta = {
	pubkey: PublicKey;
	meta: IDataAccountMeta;
};
