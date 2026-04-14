/**
 * Normalizes a Starknet address to a consistent lowercase format with 0x prefix.
 * This is crucial for database consistency and avoiding duplicate/missing records
 * due to casing or padding differences.
 */
export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";
  
  let addr = address.toLowerCase().trim();
  
  // Remove 0x prefix if present for uniform padding logic
  if (addr.startsWith("0x")) {
    addr = addr.substring(2);
  }
  
  // Pad the hex part to 64 characters
  addr = addr.padStart(64, "0");
  
  // Return with 0x prefix
  return "0x" + addr;
}

/**
 * Compares two Starknet addresses for equality after normalization.
 */
export function isSameAddress(addr1: string | null | undefined, addr2: string | null | undefined): boolean {
  if (!addr1 || !addr2) return false;
  return normalizeAddress(addr1) === normalizeAddress(addr2);
}
