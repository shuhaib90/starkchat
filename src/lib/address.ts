/**
 * Normalizes a Starknet address to a consistent lowercase format with 0x prefix.
 * This is crucial for database consistency and avoiding duplicate/missing records
 * due to casing or padding differences.
 */
export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";
  
  let addr = address.toLowerCase().trim();
  
  // Ensure 0x prefix
  if (!addr.startsWith("0x")) {
    addr = "0x" + addr;
  }
  
  // Note: We don't necessarily pad to 64 chars here because different wallets
  // and starknet.js versions use different lengths, and 'ilike' in Supabase
  // handles slight variations if used carefully. However, normalization to 
  // lowercase is the most critical step for the '.or' filter.
  
  return addr;
}

/**
 * Compares two Starknet addresses for equality after normalization.
 */
export function isSameAddress(addr1: string | null | undefined, addr2: string | null | undefined): boolean {
  if (!addr1 || !addr2) return false;
  return normalizeAddress(addr1) === normalizeAddress(addr2);
}
