import { AccountInterface, cairo, CallData } from "starknet";
import { ERC20_ABI } from "./erc20-abi";

const STRK_TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ETH_TOKEN = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  isRateLimit?: boolean;
}

/**
 * Execute a real payment on Starknet using the connected wallet account.
 * This will trigger a wallet popup for the user to sign.
 */
export async function executeStarknetPayment(
  account: AccountInterface,
  receiver: string, 
  amount: string, 
  token: string = "STRK",
  onRateLimit?: () => void
): Promise<PaymentResult> {
  if (!account) {
    console.error("[Starkzap] No wallet account provided for transaction.");
    return { success: false, error: "WALLET_NOT_CONNECTED" };
  }

  try {
    const tokenAddress = token === "ETH" ? ETH_TOKEN : STRK_TOKEN;
    
    // Improved precision: Convert string amount to BigInt wei
    const [whole, fraction = ""] = amount.split(".");
    const paddedFraction = fraction.padEnd(18, "0").slice(0, 18);
    const amountInWei = BigInt(whole + paddedFraction);
    const amountUint256 = cairo.uint256(amountInWei);

    if (!account.address) {
      console.error("[Starkzap] Account address missing", account);
      throw new Error("Wallet account address is missing. Please reconnect.");
    }

    console.log(`[Starkzap] Initiating ${token} transfer to ${receiver}`);

    // Direct account.execute is universally supported by all wallet connectors (Braavos, OKX, Argent)
    // compared to the higher-level Contract abstraction.
    const response = await account.execute({
      contractAddress: tokenAddress,
      entrypoint: "transfer",
      calldata: CallData.compile({
        recipient: receiver,
        amount: amountUint256
      })
    });
    
    console.log("[Starkzap] Transaction submitted:", response.transaction_hash);
    
    return {
      success: true,
      transactionHash: response.transaction_hash
    };
  } catch (err: any) {
    console.error("[Starkzap] Transaction failed:", err);
    
    const errorMessage = err?.message || String(err);
    const errorCode = err?.code;
    
    // Specifically detect OnFinality / Starknet RPC rate limits
    const isRateLimit = 
      errorCode === -32029 || 
      errorMessage.toLowerCase().includes("too many requests") ||
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.toLowerCase().includes("onfinality");

    if (isRateLimit && onRateLimit) {
      onRateLimit();
    }

    return {
      success: false,
      error: errorMessage,
      isRateLimit
    };
  }
}
