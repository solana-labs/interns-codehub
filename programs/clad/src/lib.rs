//! Leveraged trading with concentrated liquidity AMM positions as loan source.

declare_id!("GH4aPZ5bXQr3MhN6MrejxKLTj6gUdyrGZvieagrfA3ke");

#[doc(hidden)]
pub mod errors;
#[doc(hidden)]
pub mod instructions;
#[doc(hidden)]
pub mod manager;
#[doc(hidden)]
pub mod math;
pub mod state;
#[doc(hidden)]
pub mod tests;
#[doc(hidden)]
pub mod util;

use {anchor_lang::prelude::*, instructions::*};

#[program]
pub mod clad {
    use super::*;

    /// Initializes a GlobalpoolsConfig account that hosts info & authorities
    /// required to govern a set of Globalpools.
    ///
    /// ### Parameters
    /// - `fee_authority` - Authority authorized to initialize fee-tiers and set customs fees.
    /// - `collect_protocol_fees_authority` - Authority authorized to collect protocol fees.
    pub fn initialize_clad(
        ctx: Context<InitializeClad>,
        params: InitializeCladParams,
    ) -> Result<()> {
        return instructions::initialize_clad(ctx, &params);
    }

    /// Initializes a tick_array account to represent a tick-range in a Globalpool.
    ///
    /// ### Parameters
    /// - `start_tick_index` - The starting tick index for this tick-array.
    ///                        Has to be a multiple of TickArray size & the tick spacing of this pool.
    ///
    /// #### Special Errors
    /// - `InvalidStartTick` - if the provided start tick is out of bounds or is not a multiple of
    ///                        TICK_ARRAY_SIZE * tick spacing.
    pub fn initialize_tick_array(
        ctx: Context<InitializeTickArray>,
        params: InitializeTickArrayParams,
    ) -> Result<()> {
        return instructions::initialize_tick_array(ctx, &params);
    }

    /// Initializes a Globalpool account.
    /// Fee rate is set to the default values on the config and supplied fee_tier.
    ///
    /// ### Parameters
    /// - `tick_spacing` - The desired tick spacing for this pool.
    /// - `initial_sqrt_price` - The desired initial sqrt-price for this pool
    ///
    /// #### Special Errors
    /// `InvalidTokenMintOrder` - The order of mints have to be ordered by
    /// `SqrtPriceOutOfBounds` - provided initial_sqrt_price is not between 2^-64 to 2^64
    ///
    pub fn create_pool(ctx: Context<CreatePool>, params: CreatePoolParams) -> Result<()> {
        return instructions::create_pool(ctx, &params);
    }

    /// Open a position in a Globalpool. A unique token will be minted to represent the liquidity position
    /// in the users wallet. The position will start off with 0 liquidity.
    ///
    /// ### Parameters
    /// - `tick_lower_index` - The tick specifying the lower end of the position range.
    /// - `tick_upper_index` - The tick specifying the upper end of the position range.
    ///
    /// #### Special Errors
    /// - `InvalidTickIndex` - If a provided tick is out of bounds, out of order or not a multiple of
    ///                        the tick-spacing in this pool.
    pub fn open_liquidity_position(
        ctx: Context<OpenLiquidityPosition>,
        params: OpenLiquidityPositionParams,
    ) -> Result<()> {
        return instructions::open_liquidity_position(ctx, &params);
    }

    /// Close a position in a Globalpool. Burns the liquidity position token in the owner's wallet.
    ///
    /// ### Authority
    /// - "position_authority" - The authority that owns the position token.
    ///
    /// #### Special Errors
    /// - `CloseLiquidityPositionNotEmpty` - The provided liquidity position account is not empty.
    pub fn close_liquidity_position(ctx: Context<CloseLiquidityPosition>) -> Result<()> {
        return instructions::close_liquidity_position(ctx);
    }

    pub fn open_trade_position(
        ctx: Context<OpenTradePosition>,
        params: OpenTradePositionParams,
    ) -> Result<()> {
        return instructions::open_trade_position(ctx, &params);
    }

    /// Close a trade position. Burns the trade position token in the owner's wallet.
    ///
    /// ### Authority
    /// - "position_authority" - The authority that owns the position token.
    ///
    /// #### Special Errors
    /// - `CloseTradePositionNotEmpty` - The provided trade position account is not empty.
    // pub fn close_trade_position() -> Result<()> {
    //     todo!();
    //     Ok(())
    // }

    /// Add liquidity to a position in the Globalpool. This call also updates the position's accrued fees.
    ///
    /// ### Authority
    /// - `position_authority` - authority that owns the token corresponding to this desired position.
    ///
    /// ### Parameters
    /// - `liquidity_amount` - The total amount of Liquidity the user is willing to deposit.
    /// - `token_max_a` - The maximum amount of tokenA the user is willing to deposit.
    /// - `token_max_b` - The maximum amount of tokenB the user is willing to deposit.
    ///
    /// #### Special Errors
    /// - `LiquidityZero` - Provided liquidity amount is zero.
    /// - `LiquidityTooHigh` - Provided liquidity exceeds u128::max.
    /// - `TokenMaxExceeded` - The required token to perform this operation exceeds the user defined amount.
    pub fn increase_liquidity(
        ctx: Context<ModifyLiquidity>,
        params: IncreaseLiquidityParams,
    ) -> Result<()> {
        return instructions::increase_liquidity(ctx, &params);
    }

    /// Withdraw liquidity from a position in the Globalpool. This call also updates the position's accrued fees.
    ///
    /// ### Authority
    /// - `position_authority` - authority that owns the token corresponding to this desired position.
    ///
    /// ### Parameters
    /// - `liquidity_amount` - The total amount of Liquidity the user desires to withdraw.
    /// - `token_min_a` - The minimum amount of tokenA the user is willing to withdraw.
    /// - `token_min_b` - The minimum amount of tokenB the user is willing to withdraw.
    ///
    /// #### Special Errors
    /// - `LiquidityZero` - Provided liquidity amount is zero.
    /// - `LiquidityTooHigh` - Provided liquidity exceeds u128::max.
    /// - `TokenMinSubceeded` - The required token to perform this operation subceeds the user defined amount.
    // pub fn decrease_liquidity(
    //     ctx: Context<ModifyLiquidity>,
    //     params: DecreaseLiquidityParams,
    // ) -> Result<()> {
    //     return instructions::decrease_liquidity(ctx, &params);
    // }

    /// Collect fees accrued for this position.
    ///
    /// ### Authority
    /// - `position_authority` - authority that owns the token corresponding to this desired position.
    ///
    /// ### Special Errors
    /// - `TickNotFound` - Provided tick array account does not contain the tick for this position.
    /// - `LiquidityZero` - Position has zero liquidity and therefore already has the most updated fees values.
    pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
        return instructions::collect_fees(ctx);
    }

    /// Collect the protocol fees accrued in this Globalpool
    ///
    /// ### Authority
    /// - `collect_protocol_fees_authority` - assigned authority in the GlobalpoolConfig that can collect protocol fees
    pub fn collect_protocol_fees(ctx: Context<CollectProtocolFees>) -> Result<()> {
        return instructions::collect_protocol_fees(ctx);
    }

    /// Perform a swap in this Globalpool
    ///
    /// ### Authority
    /// - "token_authority" - The authority to withdraw tokens from the input token account.
    ///
    /// ### Parameters
    /// - `amount` - The amount of input or output token to swap from (depending on amount_specified_is_input).
    /// - `other_amount_threshold` - The maximum/minimum of input/output token to swap into (depending on amount_specified_is_input).
    /// - `sqrt_price_limit` - The maximum/minimum price the swap will swap to.
    /// - `amount_specified_is_input` - Specifies the token the parameter `amount`represents. If true, the amount represents the input token of the swap.
    /// - `a_to_b` - The direction of the swap. True if swapping from A to B. False if swapping from B to A.
    ///
    /// #### Special Errors
    /// - `ZeroTradableAmount` - User provided parameter `amount` is 0.
    /// - `InvalidSqrtPriceLimitDirection` - User provided parameter `sqrt_price_limit` does not match the direction of the trade.
    /// - `SqrtPriceOutOfBounds` - User provided parameter `sqrt_price_limit` is over Whirlppool's max/min bounds for sqrt-price.
    /// - `InvalidTickArraySequence` - User provided tick-arrays are not in sequential order required to proceed in this trade direction.
    /// - `TickArraySequenceInvalidIndex` - The swap loop attempted to access an invalid array index during the query of the next initialized tick.
    /// - `TickArrayIndexOutofBounds` - The swap loop attempted to access an invalid array index during tick crossing.
    /// - `LiquidityOverflow` - Liquidity value overflowed 128bits during tick crossing.
    /// - `InvalidTickSpacing` - The swap pool was initialized with tick-spacing of 0.
    pub fn swap(ctx: Context<Swap>, params: SwapParams) -> Result<()> {
        return instructions::swap(ctx, &params);
    }
}
