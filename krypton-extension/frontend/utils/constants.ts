import { Cluster, PublicKey, clusterApiUrl } from "@solana/web3.js";

// NOTE: SWITCH programId for corresponding network
// export const WALLET_PROGRAM_ID = new PublicKey("4eHGeN4mBXdJUAbb7iF8LL5Hj75GBxskXGPLcTH2MQHc");
export const WALLET_PROGRAM_ID = new PublicKey("2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL");
//export const WALLET_PROGRAM_ID = network == "mainnet-beta" ? MAINNET_WALLET_PROGRAM_ID : DEVNET_WALLET_PROGRAM_ID;
export const TX_FEE = 5000;
export const MIN_KEYPAIR_BALANCE = 1e8;
export const REFILL_TO_BALANCE = 2e8;
export const PDA_RENT_EXEMPT_FEE = 3152880;
export const KEYPAIR_RENT_EXEMPT_FEE = 890880;
export const TEST_INITIAL_BALANCE_FAILURE = 110204700;
export const TEST_INITIAL_BALANCE_FAILURE_WITHOUT_MINTING = 103157881;
// NOTE: REPLACE WITH YOUR OWN MAINNET RPC
export const MAINNET_RPC_URL = "https://quiet-frequent-uranium.solana-mainnet.discover.quiknode.pro/f8eb81b2bfacb3927a408859daf26cc178fca7b7/";
export const DEVNET_RPC_URL = clusterApiUrl("devnet");
export const TESTNET_RPC_URL = clusterApiUrl("testnet");
export const RPC_URL = (network: Cluster | undefined) => {
    if(network === "mainnet-beta") {
        return MAINNET_RPC_URL;
    } else if (network === "devnet") {
        return DEVNET_RPC_URL;
    } else {
        return TESTNET_RPC_URL;
    }
}
