import React, { useState } from "react";
import { ethers } from "ethers";
import { getOnboard, CHAINS, type ChainKey } from "./lib/onboard";
import { readBalance } from "./lib/jpyc";

interface AmbireLoginProps {
  onConnect?: (address: string, signer: ethers.Signer) => void;
  onDisconnect?: () => void;
}

const AmbireLogin: React.FC<AmbireLoginProps> = ({ onConnect, onDisconnect }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState("JPYC");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const defaultChainKey =
    (import.meta.env.VITE_DEFAULT_CHAIN as ChainKey) || "polygon-amoy";
  const chain = CHAINS[defaultChainKey] || CHAINS["polygon-amoy"];

  const rpcUrlEnv = (import.meta.env.VITE_RPC_URL || "").trim();

  async function disconnect() {
    const onboard = getOnboard();
    const wallets = onboard.state.get().wallets;
    if (wallets.length > 0) {
      await onboard.disconnectWallet({ label: wallets[0].label });
    }
    setAddress(null);
    setNativeBalance(null);
    setTokenBalance(null);
    setErrMsg(null);
    onDisconnect?.();
  }

  async function connectBy(label: "MetaMask" | "WalletConnect") {
    setLoading(true);
    setErrMsg(null);
    try {
      const onboard = getOnboard();

      // 指定ウォレットを自動選択（モーダルを出さない）
      const connected = await onboard.connectWallet({
        autoSelect: { label, disableModals: true },
      });

      // 失敗したら通常モーダルでフォールバック
      if (!connected.length) {
        const fallback = await onboard.connectWallet();
        if (!fallback.length) return;
      }

      await onboard.setChain({ chainId: chain.id });

      // EIP-1193 -> ethers v6 Provider
      const providerObj = onboard.state.get().wallets[0].provider as any;
      const provider = rpcUrlEnv
        ? new ethers.JsonRpcProvider(rpcUrlEnv)
        : new ethers.BrowserProvider(providerObj);
      const signer = await provider.getSigner();

      const addr = await signer.getAddress();
      setAddress(addr);

      const wei = await provider.getBalance(addr);
      setNativeBalance(ethers.formatEther(wei));

      // jpyc.tsのreadBalance関数を使用して残高を取得
      try {
        const bal = await readBalance(addr);
        setTokenBalance(String(bal));
        setTokenSymbol("JPYC");
      } catch (e) {
        console.error("JPYC balance read error:", e);
        setTokenBalance(null);
      }

      // App.tsxのコールバックを呼び出し
      onConnect?.(addr, signer);
    } catch (e: any) {
      console.error(e);
      setErrMsg(e?.message || "Wallet connect error");
    } finally {
      setLoading(false);
    }
  }

  const btn = {
    base: {
      padding: "0.9rem 1.4rem",
      borderRadius: "12px",
      fontSize: "1.05rem",
      fontWeight: 600,
      border: "1px solid #e5e7eb",
      cursor: "pointer",
      transition: "transform .02s ease",
      width: "100%",
      maxWidth: 340,
      textAlign: "center" as const,
      display: "flex",
      gap: "10px",
      alignItems: "center",
      justifyContent: "center",
    },
    primary: { background: "#2563eb", color: "#fff" },
    secondary: { background: "#111827", color: "#fff" },
    wrap: {
      display: "flex",
      gap: "14px",
      flexWrap: "wrap" as const,
      alignItems: "center",
      margin: "18px 0 8px",
    },
    icon: { fontSize: "1.2rem" },
  };

  return (
    <div style={{ margin: "2rem" }}>
      <h2 style={{ marginBottom: 8 }}>Ambire Wallet Demo</h2>

      {!address ? (
        <>
          <p style={{ opacity: 0.8 }}>
            接続方法を選んでください（Ambireは <b>WalletConnect</b>）。
          </p>
          <div style={btn.wrap}>
            <button
              style={{ ...btn.base, ...btn.primary }}
              onClick={() => connectBy("WalletConnect")}
              disabled={loading}
            >
              <span style={btn.icon}>🔗</span> Connect Ambire (WalletConnect)
            </button>
            <button
              style={{ ...btn.base, ...btn.secondary }}
              onClick={() => connectBy("MetaMask")}
              disabled={loading}
            >
              <span style={btn.icon}>🦊</span> Connect MetaMask
            </button>
          </div>
          {loading && <p style={{ marginTop: 8 }}>Connecting...</p>}
        </>
      ) : (
        <div style={{ lineHeight: 1.8 }}>
          <div>
            <strong>Network:</strong> {chain.label}
          </div>
          <div>
            <strong>Address:</strong> {address}
          </div>
          <div>
            <strong>Native Balance:</strong> {nativeBalance} {chain.token}
          </div>
          <div>
            <strong>{tokenSymbol} Balance:</strong> {tokenBalance ?? "—"}
          </div>
          <div style={{ marginTop: '15px' }}>
            <button
              style={{ ...btn.base, backgroundColor: '#dc2626', color: '#fff' }}
              onClick={disconnect}
            >
              🔌 切断
            </button>
          </div>
        </div>
      )}

      {errMsg && <p style={{ color: "crimson", marginTop: 12 }}>{errMsg}</p>}
    </div>
  );
};

export default AmbireLogin;
