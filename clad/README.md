# CLAD

## Introduction

CLAD is an open-source implementation of a non-custodial decentralized exchange that supports leveraged trading in any asset using concentrated liquidity positions as counter-parties.

CLAD is an acronym for "Concentrated Liquidity AMM Derivatives".

## How does CLAD work?

Here: [Slides on birdview of how CLAD works](https://docs.google.com/presentation/d/1ZRLwpWqIjuvsBblvYzGg3_AQoBdhj_nXJz8J1v4rklk/edit?usp=sharing)

CLAD builds on Orca Whirlpool, so LPs deposit liquidity into Ticks (see below for more info) and swaps deposit & withdraw liquidity from initialized Ticks. Conversely, opening a trade position withdraws liquidity from such Ticks where liquidity is sufficient. Thus, one can think of a loan position (on which a trade occurs) as the reverse position of LP position.

First, the trader opens a loan position of a particular price range, with collateral to match the max loss when the loan position's range is out-of-range (derived from CL-AMM math). After opening a loan position, a trader withdraws the liquidity from the loan position (e.g. USDC) and uses Jupiter to swap to the token he is long/short (e.g. SOL). 

When the trader closes his position, he swaps back some or all of the swapped token (SOL) back to borrowed token (USDC) to repay the loan. If there is any collateral left, he withdraws the collateral. The profit is any leftover amount of SOL after repaying USDC. Conversely, the loss is capped at the collateral posted.

## Set up

Starting from the root folder, run
```bash
yarn
```

To mint tokens in localnet, we need to clone accounts with modified Mint Authority. Run to clone and modify token accounts:
```bash
# Modify `setup.py` to add/remove tokens
MINT_AUTHORITY=$(solana address) python3 scripts/setup.py
```

Then, run localnet
```bash
anchor localnet
```

You can create ATAs and airdrop tokens with
```bash
anchor run airdrop
```

You can then run action scripts, ideally in order.
```bash
anchor run 1-create-pool

anchor run 2-create-lp

anchor run 3-do-swap

anchor run 4-open-trade

anchor run 5-close-trade

anchor run 7-close-lp
```

## Note

### Jupiter swap account cloning
Jupiter is used to swap assets for opening/closing trade positions, which swap through mainnet accounts cloned to localnet. This means that the tester will need to clone all accounts used by Jupiter swaps into `Anchor.toml`. Right now, only Orca is used for test swaps, so the tester will need to clone Orca/Whirlpool pool account, tick accounts, and token vault accounts. Some existing ticks for HNT/USDC and SOl/USDC are copied in `Anchor.toml`.

### Orca Whirlpool Tick Arrays
In a Whirlpool, there exists a concept of "Tick" that holds liquidity for a particular price range, e.g. 2.01 - 2.02 USDC per SOL. Liquidity Providers add/remove liquidity from these Ticks, and swaps iterate through initialized Ticks with liquidity. A swap instruction takes in 3 Tick Arrays, which contains 88 Ticks each, in the direction of the swap, i.e. decreasing for A to B and increasing for B to A. Thus, only Ticks touched by LPs are initialized and available for swaps.
