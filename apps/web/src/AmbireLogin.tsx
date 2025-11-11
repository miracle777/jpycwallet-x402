import React, { useState } from "react";
import { ethers } from "ethers";
import { getOnboard, CHAINS, type ChainKey } from "./lib/onboard";
import { readBalance } from "./lib/jpyc";
import { addTokenToWallet, NETWORK_INFO } from "./lib/wallet-utils";

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
  const [currentChainId, setCurrentChainId] = useState<number | null>(null); // 実際に接続しているネットワーク

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
    const onboard = getOnboard();
    const wallets = onboard.state.get().wallets;
    if (wallets.length === 0) {
      setErrMsg("ウォレットが接続されていません");
      return;
    }
    
    const wallet = wallets[0];
    const chainId = parseInt(chain.id.toString());
    const networkInfo = NETWORK_INFO[chainId];
    const jpycTokenInfo = networkInfo?.jpycToken;
    
    if (!jpycTokenInfo) {
      setErrMsg("このネットワークではJPYCは利用できません");
      return;
    }
    
    try {
      const provider = wallet.provider;
      const success = await addTokenToWallet(provider, jpycTokenInfo);
      
      if (success) {
        setErrMsg("✅ JPYCトークンがウォレットに追加されました！");
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
        setErrMsg("JPYCトークンの追加に失敗しました。ネットワークが正しく選択されているか確認してください。");
      }
    } catch (e: any) {
      console.error("Token add error:", e);
      setErrMsg(`❌ ${e.message || 'トークン追加中にエラーが発生しました'}`);
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

      // ⚠️ 自動ネットワーク切り替えを廃止（ユーザーが自由に選択可能に）
      // await onboard.setChain({ chainId: chain.id });

      // EIP-1193 -> ethers v6 Provider
      const providerObj = onboard.state.get().wallets[0].provider as any;
      const provider = rpcUrlEnv
        ? new ethers.JsonRpcProvider(rpcUrlEnv)
        : new ethers.BrowserProvider(providerObj);
      const signer = await provider.getSigner();

      const addr = await signer.getAddress();
      setAddress(addr);

      // 実際に接続しているネットワークのチェーンIDを取得
      try {
        const network = await provider.getNetwork();
        setCurrentChainId(Number(network.chainId));
        console.log('Connected to network:', network.chainId, network.name);
      } catch (e) {
        console.error('Failed to get network:', e);
      }

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

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">ウォレット接続</h2>

      {!address ? (
        <>
          <p className="text-gray-600 mb-4">
            ウォレットを接続してください。Ambire Walletは <b>WalletConnect</b> を使用します。
          </p>
          <div className="wallet-connect-grid">
            <button
              className="btn btn-primary"
              onClick={() => connectBy("WalletConnect")}
              disabled={loading}
            >
              <span>🔗</span> Connect Ambire (WalletConnect)
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => connectBy("MetaMask")}
              disabled={loading}
            >
              <span>🦊</span> Connect MetaMask
            </button>
          </div>
          {loading && <p className="mt-2 text-gray-500">Connecting...</p>}
        </>
      ) : (
          <div className="space-y-3">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center text-green-700">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">ウォレット接続済み</span>
            </div>
          </div>
          
          <div className="text-sm space-y-2">
            <div>
              <span className="text-gray-600">🔗 接続ネットワーク:</span>
              <span className="font-medium ml-2">
                {currentChainId === 11155111 ? 'Ethereum Sepolia' :
                 currentChainId === 1 ? 'Ethereum Mainnet' :
                 currentChainId === 137 ? 'Polygon Mainnet' :
                 currentChainId === 80002 ? 'Polygon Amoy' :
                 currentChainId === 43113 ? 'Avalanche Fuji' :
                 currentChainId ? `ChainID: ${currentChainId}` : 'Unknown'}
              </span>
            </div>            <div>
              <span className="text-gray-600">アドレス:</span>
              <div className="font-mono text-xs break-all mt-1 p-2 bg-gray-50 rounded">
                {address}
              </div>
            </div>
            
            {tokenBalance && !isNaN(Number(tokenBalance)) && Number(tokenBalance) > 0 && (
              <div>
                <span className="text-gray-600">JPYC残高:</span>
                <span className="font-medium ml-2 text-green-600">
                  {Number(tokenBalance).toLocaleString()} JPYC
                </span>
              </div>
            )}
          </div>
          
          {/* JPYCトークン追加機能 */}
          {showTokenAdd && (
            <div className="alert alert-warning">
              <div className="text-sm mb-3">
                💡 JPYCトークンが表示されない場合は、ウォレットに追加してください
              </div>
              <button
                className="btn btn-secondary"
                onClick={addJPYCToken}
              >
                ➕ JPYCをウォレットに追加
              </button>
            </div>
          )}

          {/* テストネット情報 */}
          {chain.id !== "0x89" && (
            <div className="alert alert-info">
              <div className="font-semibold mb-2">
                🧪 テストネットワーク
              </div>
              <div className="text-sm">
                このネットワークではテスト用JPYCを使用します。
              </div>
            </div>
          )}

          <div className="mt-4">
            <button
              className="btn btn-secondary w-full"
              onClick={disconnect}
            >
              🔌 切断
            </button>
          </div>
        </div>
      )}

      {errMsg && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          errMsg.startsWith('✅') 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {errMsg}
        </div>
      )}
    </div>
  );
};

export default AmbireLogin;
