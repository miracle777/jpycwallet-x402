import { ethers } from 'ethers';

// Convert JPYC display amount (e.g., "5") to base units (wei) using the token's decimals
export async function toJpycWei(amountJpyc: string, contractAddress: string, provider: ethers.Provider | ethers.JsonRpcProvider): Promise<string> {
  try {
    if (!provider) throw new Error('Provider is required to determine token decimals');
    const c = new ethers.Contract(contractAddress, ["function decimals() view returns (uint8)"], provider);
    const decimals: number = await c.decimals();
    return ethers.parseUnits(amountJpyc, decimals).toString();
  } catch (e) {
    console.warn('toJpycWei fallback to 18 decimals due to error:', e);
    // fallback to 18 decimals
    return ethers.parseUnits(amountJpyc, 18).toString();
  }
}
