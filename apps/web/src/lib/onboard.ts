// src/lib/onboard.ts
import Onboard from "@web3-onboard/core";
import injectedModule from "@web3-onboard/injected-wallets";
import walletConnectModule from "@web3-onboard/walletconnect";

const CHAIN_PARAMS = {
  polygon: {
    id: "0x89",
    token: "POL",
    label: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
  },
  "polygon-amoy": {
    id: "0x13882",
    token: "POL",
    label: "Polygon Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology",
  },
  sepolia: {
    id: "0xaa36a7",
    token: "ETH",
    label: "Ethereum Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
  },
  "avalanche-fuji": {
    id: "0xa869",
    token: "AVAX",
    label: "Avalanche Fuji",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  },
} as const;

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo";
const dappUrl =
  import.meta.env.VITE_DAPP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

// Wallet modules
const injected = injectedModule();
const walletConnect = walletConnectModule({
  projectId,
  version: 2,
  dappUrl, // ← これを指定すると警告が消えます
});

// ---- Singleton ------------------------------------------------------------
let onboardInstance: ReturnType<typeof Onboard> | null = null;

export function getOnboard() {
  if (onboardInstance) return onboardInstance;

  onboardInstance = Onboard({
    wallets: [injected, walletConnect],
    chains: Object.values(CHAIN_PARAMS).map((c) => ({
      id: c.id,
      token: c.token,
      label: c.label,
      rpcUrl: c.rpcUrl,
    })),
    appMetadata: {
      name: "JPYC Wallet x402",
      description: "Demo wallet (Ambire via WalletConnect / Injected)",
      icon: "<svg/>",
      recommendedInjectedWallets: [{ name: "MetaMask", url: "https://metamask.io" }],
    },
    // 任意（UIを出さない設定）
    accountCenter: { desktop: { enabled: false }, mobile: { enabled: false } },
  });

  return onboardInstance;
}

export type ChainKey = keyof typeof CHAIN_PARAMS;
export const CHAINS = CHAIN_PARAMS;
