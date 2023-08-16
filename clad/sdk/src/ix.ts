import { Program } from '@coral-xyz/anchor'

import * as ix from '@/instructions'
import { Clad } from '@/target/types/clad'

/**
 * Instruction builders for the Clad program.
 *
 * @category Core
 */
export default class CladIx {
  public static createPoolIx(
    program: Program<Clad>,
    accounts: ix.CreatePoolAccounts,
    params: ix.CreatePoolParams
  ) {
    return ix.createPoolIx(program, accounts, params)
  }

  /**
   * Initializes a TickArray account.
   *
   * #### Special Errors
   *  `InvalidStartTick` - if the provided start tick is out of bounds or is not a multiple of TICK_ARRAY_SIZE * tick spacing.
   *
   * @param program - program object containing services required to generate the instruction
   * @param params - InitTickArrayParams object
   * @returns - Instruction to perform the action.
   */
  public static initTickArrayIx(
    program: Program<Clad>,
    params: ix.InitTickArrayParams
  ) {
    return ix.initTickArrayIx(program, params)
  }

  /**
   * Open a position in a Whirlpool. A unique token will be minted to represent the position in the users wallet.
   * The position will start off with 0 liquidity.
   *
   * #### Special Errors
   * `InvalidTickIndex` - If a provided tick is out of bounds, out of order or not a multiple of the tick-spacing in this pool.
   *
   * @param program - program object containing services required to generate the instruction
   * @param params - OpenPositionParams object
   * @returns - Instruction to perform the action.
   */
  public static openLiquidityPositionIx(
    program: Program<Clad>,
    accounts: ix.OpenLiquidityPositionAccounts,
    params: ix.OpenLiquidityPositionParams
  ) {
    return ix.openLiquidityPositionIx(program, accounts, params)
  }

  /**
   * Add liquidity to a position in the Whirlpool. This call also updates the position's accrued fees and rewards.
   *
   * #### Special Errors
   * `LiquidityZero` - Provided liquidity amount is zero.
   * `LiquidityTooHigh` - Provided liquidity exceeds u128::max.
   * `TokenMaxExceeded` - The required token to perform this operation exceeds the user defined amount.
   *
   * @param program - program object containing services required to generate the instruction
   * @param params - IncreaseLiquidityParams object
   * @returns - Instruction to perform the action.
   */
  public static increaseLiquidityIx(
    program: Program<Clad>,
    params: ix.IncreaseLiquidityParams
  ) {
    return ix.increaseLiquidityIx(program, params)
  }

  /**
   * Remove liquidity to a position in the Whirlpool. This call also updates the position's accrued fees and rewards.
   *
   * #### Special Errors
   * - `LiquidityZero` - Provided liquidity amount is zero.
   * - `LiquidityTooHigh` - Provided liquidity exceeds u128::max.
   * - `TokenMinSubceeded` - The required token to perform this operation subceeds the user defined amount.
   *
   * @param program - program object containing services required to generate the instruction
   * @param params - DecreaseLiquidityParams object
   * @returns - Instruction to perform the action.
   */
  public static decreaseLiquidityIx(
    program: Program<Clad>,
    params: ix.DecreaseLiquidityParams
  ) {
    return ix.decreaseLiquidityIx(program, params)
  }

  /**
   * Close a position in a Whirlpool. Burns the position token in the owner's wallet.
   *
   * @param program - program object containing services required to generate the instruction
   * @param params - ClosePositionParams object
   * @returns - Instruction to perform the action.
   */
  public static closeLiquidityPositionIx(
    program: Program<Clad>,
    accounts: ix.CloseLiquidityPositionAccounts
  ) {
    return ix.closeLiquidityPositionIx(program, accounts)
  }

  /**
   * Perform a swap in this Whirlpool
   *
   * #### Special Errors
   * - `ZeroTradableAmount` - User provided parameter `amount` is 0.
   * - `InvalidSqrtPriceLimitDirection` - User provided parameter `sqrt_price_limit` does not match the direction of the trade.
   * - `SqrtPriceOutOfBounds` - User provided parameter `sqrt_price_limit` is over Whirlppool's max/min bounds for sqrt-price.
   * - `InvalidTickArraySequence` - User provided tick-arrays are not in sequential order required to proceed in this trade direction.
   * - `TickArraySequenceInvalidIndex` - The swap loop attempted to access an invalid array index during the query of the next initialized tick.
   * - `TickArrayIndexOutofBounds` - The swap loop attempted to access an invalid array index during tick crossing.
   * - `LiquidityOverflow` - Liquidity value overflowed 128bits during tick crossing.
   * - `InvalidTickSpacing` - The swap pool was initialized with tick-spacing of 0.
   *
   * ### Parameters
   * @param program - program object containing services required to generate the instruction
   * @param params - {@link SwapParams}
   * @returns - Instruction to perform the action.
   */
  public static swapIx(program: Program<Clad>, params: ix.SwapParams) {
    return ix.swapIx(program, params)
  }

  /**
   * Collect fees accrued for this position.
   * Call updateFeesAndRewards before this to update the position to the newest accrued values.
   *
   * @param program - program object containing services required to generate the instruction
   * @param params - CollectFeesParams object
   * @returns - Instruction to perform the action.
   */
  public static collectFeesIx(
    program: Program<Clad>,
    params: ix.CollectFeesParams
  ) {
    return ix.collectFeesIx(program, params)
  }

  /**
   * Collect protocol fees accrued in this Whirlpool.
   *
   * @param program - program object containing services required to generate the instruction
   * @param params - CollectProtocolFeesParams object
   * @returns - Instruction to perform the action.
   */
  public static collectProtocolFeesIx(
    program: Program<Clad>,
    params: ix.CollectProtocolFeesParams
  ) {
    return ix.collectProtocolFeesIx(program, params)
  }
}
