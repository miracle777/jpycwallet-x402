import React, { useState } from "react";
import { ethers } from "ethers";
import { getOnboard, CHAINS, type ChainKey } from "./lib/onboard";
import { readBalance } from "./lib/jpyc";
import { addTokenToWallet, NETWORK_INFO } from "./lib/wallet-utils";

interface AmbireLoginProps {
  onConnect?: (address: string, signer: ethers.Signer, walletName?: string) => void;
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
  const [connectionStep, setConnectionStep] = useState<string>('');

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
    setConnectionStep('');
    onDisconnect?.();
  }

  // 手動でウォレット選択モーダルを表示する関数
  async function showWalletModal() {
    setLoading(true);
    setErrMsg(null);
    setConnectionStep('ウォレット選択画面を表示しています...');
    
    try {
      const onboard = getOnboard();
      console.log('Showing wallet selection modal...');
      
      // モーダルを強制表示
      const connected = await onboard.connectWallet();
      
      if (!connected.length) {
        throw new Error('ウォレット接続がキャンセルされました');
      }

      // 接続成功後の処理（connectBy関数と同じ）
      const walletState = onboard.state.get().wallets;
      if (!walletState.length) {
        throw new Error('ウォレット状態の取得に失敗しました');
      }

      console.log('Wallet connected successfully via modal:', walletState[0].label);
      setConnectionStep(`✅ ${walletState[0].label} に接続しました！`);
      
      const walletName = walletState[0].label || 'Unknown';

      // EIP-1193 -> ethers v6 Provider
      const providerObj = onboard.state.get().wallets[0].provider as any;
      const provider = rpcUrlEnv
        ? new ethers.JsonRpcProvider(rpcUrlEnv)
        : new ethers.BrowserProvider(providerObj);
        
      setConnectionStep("アカウント情報を取得中...");
      const signer = await provider.getSigner();

      const addr = await signer.getAddress();
      setAddress(addr);

      // 実際に接続しているネットワークのチェーンIDを取得
      try {
        setConnectionStep("ネットワーク情報を取得中...");
        const network = await provider.getNetwork();
        setCurrentChainId(Number(network.chainId));
        console.log('Connected to network:', network.chainId, network.name);
      } catch (e) {
        console.error('Failed to get network:', e);
      }

      setConnectionStep("残高を取得中...");
      const wei = await provider.getBalance(addr);
      setNativeBalance(ethers.formatEther(wei));

      // jpyc.tsのreadBalance関数を使用して残高を取得
      try {
        setConnectionStep("JPYC残高を取得中...");
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

      setConnectionStep("接続完了！");
      
      // App.tsxのコールバックを呼び出し
      onConnect?.(addr, signer, walletName);
      setErrMsg(null); // 成功時はエラーメッセージをクリア
      
    } catch (e: any) {
      console.error('Manual wallet connection error:', e);
      
      let errorMessage = e?.message || "ウォレット接続エラー";
      
      if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
        errorMessage = "ユーザーによってキャンセルされました";
      } else if (errorMessage.includes('Modal closed') || errorMessage.includes('modal closed')) {
        errorMessage = "接続画面が閉じられました。再度お試しください。";
      }
      
      setErrMsg(errorMessage);
    } finally {
      setLoading(false);
      setConnectionStep('');
    }
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
    setConnectionStep('接続を開始しています...');
    
    try {
      const onboard = getOnboard();
      console.log(`Attempting to connect with ${label}...`);
      
      if (label === "WalletConnect") {
        console.log('WalletConnect project ID:', import.meta.env.VITE_WALLETCONNECT_PROJECT_ID);
        setConnectionStep("WalletConnect接続画面を表示しています...");
        
        // ✅ WalletConnectの場合は必ずモーダルを表示
        const connected = await onboard.connectWallet();
        
        if (!connected.length) {
          throw new Error('ウォレット接続がキャンセルされました');
        }
        
        // WalletConnectが選択されているか確認
        const wallet = connected[0];
        if (!wallet.label.toLowerCase().includes('walletconnect') && !wallet.label.toLowerCase().includes('wallet connect')) {
          console.log('非WalletConnectウォレットが選択されました:', wallet.label);
          // 継続して処理
        }
        
      } else {
        setConnectionStep("MetaMask接続画面を表示しています...");
        
        // ✅ MetaMaskの場合は自動選択を試行、失敗時にモーダル表示
        let connected = await onboard.connectWallet({
          autoSelect: { label: "MetaMask", disableModals: true },
        });
        
        if (!connected.length) {
          console.log('MetaMask auto-connect failed, showing modal...');
          setConnectionStep("ウォレット選択画面を表示しています...");
          connected = await onboard.connectWallet();
        }
        
        if (!connected.length) {
          throw new Error('ウォレット接続がキャンセルされました');
        }
      }

      // 接続成功後の処理
      const walletState = onboard.state.get().wallets;
      if (!walletState.length) {
        throw new Error('ウォレット状態の取得に失敗しました');
      }

      console.log('Wallet connected successfully:', walletState[0].label);
      setConnectionStep(`✅ ${walletState[0].label} に接続しました！`);

      // EIP-1193 -> ethers v6 Provider
      const providerObj = onboard.state.get().wallets[0].provider as any;
      const provider = rpcUrlEnv
        ? new ethers.JsonRpcProvider(rpcUrlEnv)
        : new ethers.BrowserProvider(providerObj);
        
      setConnectionStep("アカウント情報を取得中...");
      const signer = await provider.getSigner();

      const addr = await signer.getAddress();
      setAddress(addr);

      // 実際に接続しているネットワークのチェーンIDを取得
      try {
        setConnectionStep("ネットワーク情報を取得中...");
        const network = await provider.getNetwork();
        setCurrentChainId(Number(network.chainId));
        console.log('Connected to network:', network.chainId, network.name);
      } catch (e) {
        console.error('Failed to get network:', e);
      }

      setConnectionStep("残高を取得中...");
      const wei = await provider.getBalance(addr);
      setNativeBalance(ethers.formatEther(wei));

      // jpyc.tsのreadBalance関数を使用して残高を取得
      try {
        setConnectionStep("JPYC残高を取得中...");
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

      setConnectionStep("接続完了！");
      
      // App.tsxのコールバックを呼び出し
      const walletName = walletState[0]?.label || 'Unknown';
      onConnect?.(addr, signer, walletName);
      setErrMsg(null); // 成功時はエラーメッセージをクリア
      
    } catch (e: any) {
      console.error('Wallet connection error:', e);
      
      let errorMessage = e?.message || "ウォレット接続エラー";
      
      // エラーの種類に応じてメッセージを調整
      if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
        errorMessage = "ユーザーによってキャンセルされました";
      } else if (errorMessage.includes('Modal closed') || errorMessage.includes('modal closed')) {
        errorMessage = "接続画面が閉じられました。再度お試しください。";
      } else if (errorMessage.includes('timeout') || errorMessage.includes('タイムアウト')) {
        errorMessage = "接続がタイムアウトしました。ウォレットアプリを開いて再度お試しください。";
      } else if (errorMessage.includes('WalletConnect')) {
        errorMessage = "WalletConnect接続エラー: " + errorMessage + "\n\n💡 対処法:\n1. ウォレットアプリを開く\n2. QRコードをスキャン\n3. 接続を承認";
      }
      
      setErrMsg(errorMessage);
    } finally {
      setLoading(false);
      setConnectionStep('');
    }
  }

  // 接続をキャンセルする関数
  function cancelConnection() {
    setLoading(false);
    setErrMsg(null);
    setConnectionStep('');
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
          
          {/* 手動ウォレット選択ボタン */}
          <div className="mt-4">
            <button
              onClick={showWalletModal}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.6em 1.2em',
                border: '2px solid #6b7280',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                fontSize: '1em',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#6b7280';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              <span>📋</span> すべてのウォレットから選択
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              上記のボタンで接続できない場合は、こちらをクリック
            </p>
          </div>
          
          {/* 接続中の表示 */}
          {loading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-blue-800 font-medium">接続中...</span>
                  </div>
                  {connectionStep && (
                    <p className="mt-2 text-sm text-blue-600">{connectionStep}</p>
                  )}
                </div>
                <button
                  onClick={cancelConnection}
                  className="ml-4 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  キャンセル
                </button>
              </div>
              
              {/* WalletConnect使用時の追加説明 */}
              {connectionStep.includes('WalletConnect') && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">📱 WalletConnect接続手順:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>ウォレットアプリ（Ambire、Trust Wallet等）を開く</li>
                      <li>「WalletConnect」または「接続」ボタンをタップ</li>
                      <li>QRコードをスキャンまたはリンクをタップ</li>
                      <li>接続を承認</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
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
