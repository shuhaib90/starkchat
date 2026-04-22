import { hash } from "starknet";

// TONGO_NETWORK_REGISTRY: Official Tongo protocol deployments on Starknet Mainnet
export const TONGO_CONTRACTS = {
  USDC: "0x026f79017c3c382148832c6ae50c22502e66f7a2f81ccbdb9e1377af31859d3a",
  STRK: "0x3a542d7eb73b3e33a2c54e9827ec17a6365e289ec35ccc94dde97950d9db498",
  ETH: "0x276e11a5428f6de18a38b7abc1d60abc75ce20aa3a925e20a393fcec9104f89",
} as const;

export type TongoAsset = keyof typeof TONGO_CONTRACTS;

/**
 * NEURAL_LINK_DERIVATION
 * Derives a deterministic Tongo private key from a Starknet signature.
 * This ensures the user's Shield identity is tied to their wallet without
 * needing a separate seed phrase.
 */
export function deriveTongoKey(signature: string[]): string {
  // We use the first two elements of the signature (r, s) and hash them
  // to ensure a high-entropy 256-bit key.
  const combined = signature.join("");
  // hash.starknetKeccak is a reliable way to get a 251-bit field element,
  // which works perfectly as a private key for Tongo/Cairo.
  return "0x" + hash.starknetKeccak(combined).toString(16);
}

/**
 * SHIELD_MESSAGE: The message users sign to unlock their identity.
 */
export const SHIELD_UNLOCK_MESSAGE = {
  types: {
    StarkNetDomain: [
      { name: "name", type: "felt" },
      { name: "version", type: "felt" },
      { name: "chainId", type: "felt" },
    ],
    Message: [{ name: "contents", type: "felt" }],
  },
  primaryType: "Message",
  domain: {
    name: "Starknet Shield",
    version: "1",
    chainId: "SN_MAIN", // Mainnet
  },
  message: {
    contents: "Unlock Neural Stealth Identity",
  },
};
