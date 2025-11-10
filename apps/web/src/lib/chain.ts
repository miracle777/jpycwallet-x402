export const rpcUrl = import.meta.env.VITE_RPC_URL as string;
export const chainId = Number(import.meta.env.VITE_CHAIN_ID);
export const jpycAddress = import.meta.env.VITE_JPYC_ADDRESS as string;

// 最小限のERC-20 ABI
export const erc20Abi = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)"
];
