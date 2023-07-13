import { GlobalpoolData } from "@/types/accounts";
import { SwapUtils, swapQuoteByInputToken } from "@orca-so/whirlpools-sdk";
import { PublicKey } from "@solana/web3.js";

async function swapQuoteByToken(
  globalpoolData: GlobalpoolData,
  inputTokenMint: PublicKey,
  tokenAmount: BN,
  amountSpecifiedIsInput: boolean,
  programId: Address,
  fetcher: WhirlpoolAccountFetcherInterface,
  opts?: WhirlpoolAccountFetchOptions
) {
	if (inputTokenMint !== globalpoolData.tokenMintA && inputTokenMint !== globalpoolData.tokenMintB) {
		throw new Error('inputTokenMint does not match any tokens on this pool')
	}

	const aToB = inputTokenMint === globalpoolData.tokenMintA

  const tickArrays = await SwapUtils.getTickArrays(
    globalpoolData.tickCurrentIndex,
    globalpoolData.tickSpacing,
    aToB,
    AddressUtil.toPubKey(programId),
    whirlpool.getAddress(),
    fetcher,
    opts
  );

  return {
    globalpoolData,
    tokenAmount,
    aToB,
    amountSpecifiedIsInput,
    sqrtPriceLimit: SwapUtils.getDefaultSqrtPriceLimit(aToB),
    otherAmountThreshold: SwapUtils.getDefaultOtherAmountThreshold(amountSpecifiedIsInput),
    tickArrays,
  };
}