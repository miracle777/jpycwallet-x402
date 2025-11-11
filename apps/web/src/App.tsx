import { useState } from "react";
import { ethers } from "ethers";
import AmbireLogin from "./AmbireLogin";
import SubscriptionContract from "./components/SubscriptionContract";
import SubscriptionDashboard from "./components/SubscriptionDashboard";
import MerchantProductManager from "./components/MerchantProductManager";
import CustomShoppingCart from "./components/CustomShoppingCart";
import SepoliaGasless from "./components/SepoliaGasless";
import PaymentRequestSimple from "./components/PaymentRequestSimple";
import X402SimplePayment from "./components/X402SimplePayment";
import X402Subscription from "./components/X402Subscription";
import NetworkSelector from "./components/NetworkSelector";
import FaucetGuide from "./components/FaucetGuide";
import QRCodeDisplay from "./components/QRCodeDisplay";
import type { ChainKey } from "./lib/onboard";

function App() {
  const [walletData, setWalletData] = useState<{
    address: string | null;
    signer: ethers.Signer | null;
  }>({ address: null, signer: null });

  const [selectedNetwork, setSelectedNetwork] = useState<ChainKey>('sepolia');
  const [activeTab, setActiveTab] = useState<'payment' | 'x402-simple' | 'subscription-contract' | 'x402-subscription' | 'subscription-dashboard' | 'merchant-products' | 'shopping-cart' | 'sepolia-gasless'>('payment');
  
  // QRコード関連の状態
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [merchantInfo, setMerchantInfo] = useState<any>(null);

  const handleWalletConnect = (address: string, signer: ethers.Signer) => {
    console.log('📱 Wallet connected:', address);
    setWalletData({ address, signer });
  };

  const handleWalletDisconnect = () => {
    console.log('🔌 Wallet disconnected');
    setWalletData({ address: null, signer: null });
  };

  const handleNetworkChange = (network: ChainKey) => {
    console.log('Network changed to:', network);
    setSelectedNetwork(network);
    if (walletData.address) {
      console.log('Wallet reconnection may be required after network change');
    }
  };

  const handlePaymentComplete = (txHash: string) => {
    alert(`決済が完了しました！\nトランザクションハッシュ: ${txHash}`);
  };

  const handleQRGenerated = (qrData: string, amount?: string, merchant?: any) => {
    setQrCodeData(qrData);
    if (amount) setPaymentAmount(amount);
    if (merchant) setMerchantInfo(merchant);
  };

  const handleQRRefresh = () => {
    // QRコードを再生成
    setQrCodeData('');
    // 現在のタブに応じて再生成をトリガー
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full px-4 py-8">
        {/* ヘッダー */}
        <div className="max-w-7xl mx-auto text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">JPYC Wallet x402</h1>
          <p className="text-gray-600">Multi-Network Payment App with x402 Protocol</p>
          <p className="text-sm text-orange-600 mt-2">
            ⚠️ x402プロトコル対応版
          </p>
        </div>

        {/* メインコンテンツエリア */}
        <div className="max-w-7xl mx-auto w-full">
          {!walletData.address ? (
            /* 未接続時: 中央配置 */
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">ウォレット接続</h2>
                <AmbireLogin 
                  onConnect={handleWalletConnect} 
                  onDisconnect={handleWalletDisconnect}
                />
              </div>
              
              {/* ネットワーク選択 */}
              <div className="mt-6">
                <NetworkSelector
                  currentNetwork={selectedNetwork}
                  onNetworkChange={handleNetworkChange}
                  disabled={!!walletData.address}
                />
              </div>
              
              {/* テスト用JPYC取得ガイド */}
              <div className="mt-6">
                <FaucetGuide
                  chainId={selectedNetwork === 'polygon' ? 137 : 
                           selectedNetwork === 'polygon-amoy' ? 80002 :
                           selectedNetwork === 'sepolia' ? 11155111 :
                           selectedNetwork === 'avalanche-fuji' ? 43113 : undefined}
                  userAddress={walletData.address || undefined}
                />
              </div>
              
              <div className="text-center text-gray-600 mt-6">
                <p>ウォレットを接続してJPYC決済機能をお試しください</p>
                <p className="text-sm text-gray-500 mt-2">
                  ※ Sepolia（テスト）・Polygon（本番）ネットワーク対応
                </p>
              </div>
            </div>
          ) : (
            /* 接続済み: 2カラムレイアウト */
            <div style={{ display: 'flex', gap: '24px', width: '100%' }}>
              {/* 左カラム: 設定・操作エリア（2/3幅） */}
              <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '0' }}>
                {/* ウォレット情報 */}
                <div className="bg-white rounded-lg shadow-md p-6">{/* Tailwindスタイル */}
                  <h2 className="text-xl font-semibold mb-4">ウォレット接続</h2>
                  <AmbireLogin 
                    onConnect={handleWalletConnect} 
                    onDisconnect={handleWalletDisconnect}
                  />
                  
                  {walletData.address && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">接続済みアカウント:</p>
                      <p className="font-mono text-xs break-all">{walletData.address}</p>
                    </div>
                  )}
                </div>

                {/* ネットワーク選択 */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <NetworkSelector
                    currentNetwork={selectedNetwork}
                    onNetworkChange={handleNetworkChange}
                    disabled={!!walletData.address}
                  />
                </div>

                {/* テスト用JPYC取得ガイド */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <FaucetGuide
                    chainId={selectedNetwork === 'polygon' ? 137 : 
                             selectedNetwork === 'polygon-amoy' ? 80002 :
                             selectedNetwork === 'sepolia' ? 11155111 :
                             selectedNetwork === 'avalanche-fuji' ? 43113 : undefined}
                    userAddress={walletData.address || undefined}
                  />
                </div>

                {/* タブメニュー */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="nav-tabs">
                    {[
                      { id: 'payment', label: 'QR決済', icon: '📱' },
                      { id: 'x402-simple', label: 'x402決済', icon: '💳' },
                      { id: 'subscription-contract', label: 'サブスク', icon: '📝' },
                      { id: 'x402-subscription', label: 'x402サブスク', icon: '🔄' },
                      { id: 'subscription-dashboard', label: 'ダッシュボード', icon: '📊' },
                      { id: 'merchant-products', label: '商品管理', icon: '🏪' },
                      { id: 'shopping-cart', label: 'カート', icon: '🛒' },
                      { id: 'sepolia-gasless', label: 'JPYCガスレス', icon: '⛽' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                      >
                        <span>{tab.icon}</span>
                        <span className="hidden-mobile">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* アクティブなタブコンテンツ */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  {activeTab === 'payment' && (
                    <PaymentRequestSimple
                      onQRGenerated={handleQRGenerated}
                      currentAddress={walletData.address}
                    />
                  )}

                  {activeTab === 'x402-simple' && (
                    <X402SimplePayment
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                      onPaymentComplete={handlePaymentComplete}
                    />
                  )}

                  {activeTab === 'subscription-contract' && (
                    <SubscriptionContract
                      currentAddress={walletData.address || undefined}
                      onSubscribe={(plan, txHash) => {
                        console.log('Subscribed to plan:', plan);
                        handlePaymentComplete(txHash);
                      }}
                    />
                  )}

                  {activeTab === 'x402-subscription' && (
                    <X402Subscription
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                      onPaymentComplete={handlePaymentComplete}
                    />
                  )}

                  {activeTab === 'subscription-dashboard' && (
                    <SubscriptionDashboard
                      currentAddress={walletData.address || undefined}
                    />
                  )}

                  {activeTab === 'merchant-products' && (
                    <MerchantProductManager
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                    />
                  )}

                  {activeTab === 'shopping-cart' && (
                    <CustomShoppingCart
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                      onPaymentComplete={handlePaymentComplete}
                    />
                  )}

                  {activeTab === 'sepolia-gasless' && (
                    <SepoliaGasless
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                      onPaymentComplete={handlePaymentComplete}
                    />
                  )}
                </div>
              </div>

              {/* 右カラム: QRコード表示エリア（1/3幅） */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: '250px' }}>
                <div className="sticky top-8">{/* 適度なトップスペース */}
                  {qrCodeData ? (
                    <div className="qr-code-container"> {/* 専用コンテナクラス追加 */}
                      <QRCodeDisplay 
                        qrData={qrCodeData}
                        amount={paymentAmount}
                        merchantInfo={merchantInfo}
                        onRefresh={handleQRRefresh}
                      />
                    </div>
                  ) : (
                    /* QRコード未生成時のプレースホルダー */
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                      <h2 className="text-xl font-semibold mb-4">QRコード表示エリア</h2>
                      <div className="qr-code-container">
                        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <div className="text-center text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m-2 0h-2m2-4h2m2 0V9a3 3 0 00-3-3H9a3 3 0 00-3 3v8.1m6-2.1h2m-2 0V9" />
                            </svg>
                            <p className="text-lg font-medium">QRコード未生成</p>
                            <p className="text-sm mt-1 hidden-mobile">左側で決済内容を設定して<br />QRコードを生成してください</p>
                            <p className="text-sm mt-1 hidden-desktop">上記で決済内容を設定して<br />QRコードを生成してください</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
