import React, { useState } from "react";
import { ethers } from "ethers";
import { getOnboard, CHAINS, type ChainKey } from "./lib/onboard";
import { readBalance } from "./lib/jpyc";
import { addJPYCToWallet, getCurrentJPYCToken, NETWORK_INFO } from "./lib/wallet-utils";

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
  const [showTokenAdd, setShowTokenAdd] = useState(false);

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
    setShowTokenAdd(false);
    onDisconnect?.();
  }

  async function addJPYCToken() {
    try {
      const onboard = getOnboard();
      const wallets = onboard.state.get().wallets;
      if (wallets.length > 0) {
        const provider = wallets[0].provider;
        const success = await addJPYCToWallet(provider);
        if (success) {
          setErrMsg("JPYCトークンがウォレットに追加されました！");
          setShowTokenAdd(false);
          // 残高を再取得
          if (address) {
            try {
              const bal = await readBalance(address);
              setTokenBalance(String(bal));
            } catch (e) {
              console.error("Balance refresh error:", e);
            }
          }
        } else {
          setErrMsg("JPYCトークンの追加に失敗しました");
        }
      }
    } catch (e: any) {
      setErrMsg(`トークン追加エラー: ${e.message}`);
    }
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
        
        // 残高が0の場合、トークン追加オプションを表示
        if (bal === 0) {
          setShowTokenAdd(true);
        }
      } catch (e) {
        console.error("JPYC balance read error:", e);
        setTokenBalance(null);
        setShowTokenAdd(true); // エラーの場合もトークン追加オプションを表示
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
          
          {/* JPYCトークン追加機能 */}
          {showTokenAdd && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#fffbeb', 
              border: '1px solid #f59e0b', 
              borderRadius: '8px' 
            }}>
              <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                💡 JPYCトークンが表示されない場合は、ウォレットに追加してください
              </div>
              <button
                style={{
                  ...btn.base,
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  fontSize: '14px',
                  padding: '8px 16px',
                  marginRight: '10px',
                }}
                onClick={addJPYCToken}
              >
                ➕ JPYCをウォレットに追加
              </button>
            </div>
          )}

          {/* テストネット情報 */}
          {chain.id !== "0x89" && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              fontSize: '14px',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '5px' }}>
                🧪 テストネットワーク情報
              </div>
              <div>
                このネットワークではテスト用JPYCを使用します。
              </div>
              {NETWORK_INFO[parseInt(chain.id, 16)]?.faucetInfo && (
                <div style={{ marginTop: '8px' }}>
                  <strong>💧 テストJPYC取得:</strong><br />
                  <a 
                    href={NETWORK_INFO[parseInt(chain.id, 16)].faucetInfo!.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb' }}
                  >
                    Faucetで取得 →
                  </a>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {NETWORK_INFO[parseInt(chain.id, 16)].faucetInfo!.description}
                  </div>
                </div>
              )}
            </div>
          )}

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
