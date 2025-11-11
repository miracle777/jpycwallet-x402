import { ethers } from "ethers";
import { erc20Abi, jpycAddress, rpcUrl } from "./chain";

// JPYC Contract Address Options
export const JPYC_CONTRACTS = {
  'sepolia-community': {
    address: '0xd3eF95d29A198868241FE374A999fc25F6152253',
    name: 'JPYC (Community)',
    description: 'コミュニティ版JPYC',
    network: 'sepolia',
    isTestnet: true
  },
  'sepolia-official': {
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB', 
    name: 'JPYC (Official)',
    description: '公式JPYC',
    network: 'sepolia',
    isTestnet: true
  },
  'polygon-amoy': {
    address: '0xe7c3D8C5E8e84A4fBDe29F8fa9A89Ab1B5dD6b8F',
    name: 'JPYC (Polygon Amoy)',
    description: 'Polygon Amoy テストネット版',
    network: 'polygon-amoy',
    isTestnet: true
  },
  'avalanche-fuji': {
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    name: 'JPYC (Avalanche Fuji)',
    description: 'Avalanche Fuji テストネット版',
    network: 'avalanche-fuji',
    isTestnet: true
  },
  'polygon-mainnet': {
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    name: 'JPYC (Polygon)',
    description: 'Polygon メインネット版',
    network: 'polygon-mainnet',
    isTestnet: false
  }
};

// Network configuration
export const NETWORK_CONFIG = {
  'sepolia': {
    chainId: 11155111,
    name: 'Sepolia',
    // Development: Use proxy to avoid CORS. Production: Use Infura/Alchemy with API key
    rpcUrl: import.meta.env.DEV ? '/rpc/sepolia' : 'https://eth-sepolia.g.alchemy.com/v2/demo',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  'polygon-amoy': {
    chainId: 80002,
    name: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com'
  },
  'avalanche-fuji': {
    chainId: 43113,
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io'
  },
  'polygon-mainnet': {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com'
  }
};

export type SupportedNetwork = keyof typeof NETWORK_CONFIG;
export type JPYCContract = keyof typeof JPYC_CONTRACTS;

// Get JPYC contracts for a specific network
export function getJPYCContractsForNetwork(network: SupportedNetwork): JPYCContract[] {
  return Object.keys(JPYC_CONTRACTS).filter(
    contractKey => JPYC_CONTRACTS[contractKey as JPYCContract].network === network
  ) as JPYCContract[];
}

export function getJPYCAddressForContract(contractKey: JPYCContract): string {
  const address = JPYC_CONTRACTS[contractKey].address;
  return ethers.getAddress(address); // Ensure checksum format
}

export function getJPYCAddressForNetwork(network: SupportedNetwork): string {
  // Default to first available contract for the network
  const contracts = getJPYCContractsForNetwork(network);
  return contracts.length > 0 ? JPYC_CONTRACTS[contracts[0]].address : '';
}

export function getChainIdForNetwork(network: SupportedNetwork): number {
  return NETWORK_CONFIG[network].chainId;
}

export function getRpcUrlForNetwork(network: SupportedNetwork): string {
  return NETWORK_CONFIG[network].rpcUrl;
}

export function getNetworkDisplayName(network: SupportedNetwork): string {
  return NETWORK_CONFIG[network].name;
}

export function getBlockExplorerUrl(network: SupportedNetwork): string {
  return NETWORK_CONFIG[network].blockExplorer;
}

export function getProvider(network: SupportedNetwork = 'sepolia') {
  const networkRpcUrl = network === 'sepolia' ? rpcUrl : getRpcUrlForNetwork(network);
  return new ethers.JsonRpcProvider(networkRpcUrl);
}

export function getErc20Contract(providerOrSigner: ethers.Provider | ethers.Signer, contractKey: JPYCContract = 'sepolia-community') {
  const contractAddress = getJPYCAddressForContract(contractKey);
  return new ethers.Contract(contractAddress, erc20Abi, providerOrSigner);
}

export async function readBalance(addr: string, contractKey: JPYCContract = 'sepolia-community') {
  const contract = JPYC_CONTRACTS[contractKey];
  const network = contract.network as SupportedNetwork;
  const provider = getProvider(network);
  const c = getErc20Contract(provider, contractKey);
  const [decimals, bal] = await Promise.all([c.decimals(), c.balanceOf(addr)]);
  return Number(ethers.formatUnits(bal, decimals));
}

export async function checkSufficientBalance(signer: ethers.Signer, amountJPYC: string, contractKey: JPYCContract = 'sepolia-community'): Promise<{ sufficient: boolean; currentBalance: number; required: number }> {
  const address = await signer.getAddress();
  const currentBalance = await readBalance(address, contractKey);
  const required = parseFloat(amountJPYC);
  
  return {
    sufficient: currentBalance >= required,
    currentBalance,
    required,
  };
}

export async function transferJPYC(signer: ethers.Signer, to: string, amountJPYC: string, contractKey: JPYCContract = 'sepolia-community') {
  // 残高チェック
  const balanceCheck = await checkSufficientBalance(signer, amountJPYC, contractKey);
  if (!balanceCheck.sufficient) {
    throw new Error(`JPYC残高が不足しています。必要: ${balanceCheck.required} JPYC, 現在: ${balanceCheck.currentBalance} JPYC`);
  }

  const c = getErc20Contract(signer, contractKey);
  const decimals: number = await c.decimals();
  const amount = ethers.parseUnits(amountJPYC, decimals);
  const tx = await c.transfer(to, amount);
  return await tx.wait();
}
