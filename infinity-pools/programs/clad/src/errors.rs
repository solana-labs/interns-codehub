use {anchor_lang::prelude::*, std::num::TryFromIntError};

#[error_code]
#[derive(PartialEq)]
pub enum ErrorCode {
    #[msg("Enum value could not be converted")]
    InvalidEnum, // 0x1770
    #[msg("Invalid start tick index provided.")]
    InvalidStartTick, // 0x1771
    #[msg("Tick-array already exists in this globalpool")]
    TickArrayExistInPool, // 0x1772
    #[msg("Attempt to search for a tick-array failed")]
    TickArrayIndexOutofBounds, // 0x1773
    #[msg("Tick-spacing is not supported")]
    InvalidTickSpacing, // 0x1774
    #[msg("Position is not empty It cannot be closed")]
    CloseLiquidityPositionNotEmpty, // 0x1775

    #[msg("Unable to divide by zero")]
    DivideByZero, // 0x1776
    #[msg("Unable to cast number into BigInt")]
    NumberCastError, //  0x1777
    #[msg("Unable to down cast number")]
    NumberDownCastError, //  0x1778

    #[msg("Tick not found within tick array")]
    TickNotFound, // 0x1779
    #[msg("Provided tick index is either out of bounds or uninitializable")]
    InvalidTickIndex, // 0x177a
    #[msg("Provided sqrt price out of bounds")]
    SqrtPriceOutOfBounds, // 0x177b

    #[msg("Liquidity amount must be greater than zero")]
    LiquidityZero, // 0x177c
    #[msg("Liquidity amount must be less than i64::MAX")]
    LiquidityTooHigh, // 0x177d
    #[msg("Liquidity overflow")]
    LiquidityOverflow, // 0x177e
    #[msg("Liquidity underflow")]
    LiquidityUnderflow, // 0x177f
    #[msg("Tick liquidity net underflowed or overflowed")]
    LiquidityNetError, // 0x1780

    #[msg("Exceeded token max")]
    TokenMaxExceeded, // 0x1781
    #[msg("Did not meet token min")]
    TokenMinSubceeded, // 0x1782

    #[msg("Position token account has a missing or invalid delegate")]
    MissingOrInvalidDelegate, // 0x1783
    #[msg("Position token amount must be 1")]
    InvalidPositionTokenAmount, // 0x1784

    #[msg("Timestamp should be convertible from i64 to u64")]
    InvalidTimestampConversion, // 0x1785
    #[msg("Timestamp should be greater than the last updated timestamp")]
    InvalidTimestamp, // 0x1786

    #[msg("Invalid tick array sequence provided for instruction.")]
    InvalidTickArraySequence, // 0x1787
    #[msg("Token Mint in wrong order")]
    InvalidTokenMintOrder, // 0x1788

    #[msg("Exceeded max fee rate")]
    FeeRateMaxExceeded, // 0x178c
    #[msg("Exceeded max protocol fee rate")]
    ProtocolFeeRateMaxExceeded, // 0x178d

    #[msg("Multiplication with shift right overflow")]
    MultiplicationShiftRightOverflow, // 0x178e
    #[msg("Muldiv overflow")]
    MulDivOverflow, // 0x178f
    #[msg("Invalid div_u256 input")]
    MulDivInvalidInput, //0x1790
    #[msg("Multiplication overflow")]
    MultiplicationOverflow, //0x1791
    #[msg("Division underflow")]
    DivisionUnderflow, //0x1792

    #[msg("Provided SqrtPriceLimit not in the same direction as the swap.")]
    InvalidSqrtPriceLimitDirection, //0x1793
    #[msg("There are no tradable amount to swap.")]
    ZeroTradableAmount, //0x1794

    #[msg("Amount out below minimum threshold")]
    AmountOutBelowMinimum, //0x1795
    #[msg("Amount in above maximum threshold")]
    AmountInAboveMaximum, //0x1796

    #[msg("Invalid index for tick array sequence")]
    TickArraySequenceInvalidIndex, //0x1797

    #[msg("Amount calculated overflows")]
    AmountCalcOverflow, //0x1798
    #[msg("Amount remaining overflows")]
    AmountRemainingOverflow, //0x1799

    #[msg("There are no loan amount to borrow.")]
    ZeroBorrowableAmount, //0x179a

    #[msg("Invalid Tick Range")]
    InvalidTickRange,
    #[msg("Invalid Tick Range against Current Tick")]
    InvalidTickRangeAgainstCurrentTick,
    #[msg("Invalid Tick Range against Borrow Condition")]
    InvalidTickRangeAgainstBorrowCondition,

    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Insufficient liquidity to borrow")]
    InsufficientLiquidityToBorrow,
    #[msg("Invalid Loan Trade Swap Direction")]
    InvalidLoanTradeSwapDirection,
    #[msg("Invalid Loan Trade Swap Result")]
    InvalidLoanTradeSwapResult,
    #[msg("Invalid Loan Parameters")]
    InvalidLoanParameters,

    #[msg("Trade Position is Not Empty")]
    CloseTradePositionNotEmpty,

    // Pyth errors
    #[msg("Invalid Oracle Account")]
    InvalidOracleAccount,
    #[msg("Stale oracle price")]
    StaleOraclePrice,
    #[msg("Failed to serialize price account")]
    TryToSerializePriceAccount,
    #[msg("Failed to deserialize price account")]
    TryToDeserializePriceAccount,
    #[msg("Invalid argument provided")]
    InvalidArgument,

    #[msg("Collateral calculation error")]
    CollateralCalculationError,

    #[msg("Loan not matured")]
    LoanNotMatured,
    #[msg("Invalid repayment amount")]
    InvalidRepaymentAmount,
    #[msg("Invalid loan duration")]
    InvalidLoanDuration,
}

impl From<TryFromIntError> for ErrorCode {
    fn from(_: TryFromIntError) -> Self {
        ErrorCode::NumberCastError
    }
}