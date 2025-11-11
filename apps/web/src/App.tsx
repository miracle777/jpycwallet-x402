import { useState, useEffect } from "react";
import { ethers } from "ethers";
import AmbireLogin from "./AmbireLogin";
import X402SimplePayment from "./components/X402SimplePayment";
import X402Subscription from "./components/X402Subscription";
import X402SubscriptionShop from "./components/X402SubscriptionShop";
import SepoliaGasless from "./components/SepoliaGasless";
import NetworkSelector from "./components/NetworkSelector";
import FaucetGuide from "./components/FaucetGuide";
import QRCodeDisplay from "./components/QRCodeDisplay";
import X402SubscriptionTestPage from "./components/X402SubscriptionTestPage";
import SubscriptionMerchantDashboard from "./components/SubscriptionMerchantDashboard";
import MerchantPaymentRequest from "./components/MerchantPaymentRequest";
import PaymentRequestSimple from "./components/PaymentRequestSimple";
import type { ChainKey } from "./lib/onboard";

function App() {
  const [walletData, setWalletData] = useState<{
    address: string | null;
    signer: ethers.Signer | null;
  }>({ address: null, signer: null });

  const [selectedNetwork, setSelectedNetwork] = useState<ChainKey>('sepolia');
  const [activeTab, setActiveTab] = useState<'payment' | 'x402-simple' | 'x402-subscription' | 'x402-subscription-shop' | 'sepolia-gasless'>('x402-simple');
  
  // ページ管理: 'main' | 'merchant' | 'pay' | 'subscription-test' | 'subscription-merchant'
  const [currentPage, setCurrentPage] = useState<'main' | 'merchant' | 'pay' | 'subscription-test' | 'subscription-merchant'>('main');
  const [paymentRequest, setPaymentRequest] = useState<string>('');

  // URLパラメータをチェック
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    
    // /merchant パスか ?page=merchant
    if (path.includes('/merchant') || params.get('page') === 'merchant') {
      setCurrentPage('merchant');
    }
    // /pay パスか ?request= パラメータ
    else if (path.includes('/pay') || params.has('request')) {
      const request = params.get('request') || '';
      setPaymentRequest(request);
      setCurrentPage('pay');
    }
    // サブスクリプションテストページ
    else if (params.get('page') === 'subscription-test') {
      setCurrentPage('subscription-test');
    }
    // サブスクリプション管理ページ
    else if (params.get('page') === 'subscription-merchant') {
      setCurrentPage('subscription-merchant');
    }
    else {
      setCurrentPage('main');
    }
  }, []);
  
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

  // ページ別レンダリング
  if (currentPage === 'subscription-test') {
    return <X402SubscriptionTestPage />;
  }

  if (currentPage === 'subscription-merchant') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full px-4 py-8">
          {/* ヘッダー */}
          <div className="max-w-7xl mx-auto text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🏪 Subscription Merchant Dashboard</h1>
            <p className="text-gray-600">x402サブスクリプション管理画面</p>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <AmbireLogin 
                onConnect={handleWalletConnect} 
                onDisconnect={handleWalletDisconnect}
              />
              
              <div className="mt-6">
                <SubscriptionMerchantDashboard
                  currentAddress={walletData.address || undefined}
                  signer={walletData.signer || undefined}
                />
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="text-center mt-8">
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a 
                href="/?page=main"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ← メインページに戻る
              </a>
              <a 
                href="/?page=subscription-test"
                className="inline-block px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                🛒 テストページ
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'merchant') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full px-4 py-8">
          {/* ヘッダー */}
          <div className="max-w-7xl mx-auto text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🛍️ Merchant Payment Request</h1>
            <p className="text-gray-600">x402 Payment Protocol - Merchant Side</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <AmbireLogin 
                onConnect={handleWalletConnect} 
                onDisconnect={handleWalletDisconnect}
              />
              
              {walletData.address && (
                <div className="mt-6">
                  <MerchantPaymentRequest
                    currentAddress={walletData.address}
                  />
                </div>
              )}
            </div>
          </div>

          {/* メインページへのリンク */}
          <div className="text-center mt-8">
            <a 
              href="/?page=main"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              ← メインページに戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'pay') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full px-4 py-8">
          {/* ヘッダー */}
          <div className="max-w-7xl mx-auto text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">💳 x402 Payment</h1>
            <p className="text-gray-600">x402 Payment Protocol - Payer Side</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <AmbireLogin 
                onConnect={handleWalletConnect} 
                onDisconnect={handleWalletDisconnect}
              />
              
              {walletData.address && (
                <div className="mt-6">
                  <X402SimplePayment
                    currentAddress={walletData.address}
                    signer={walletData.signer || undefined}
                    initialRequest={paymentRequest}
                    onPaymentComplete={handlePaymentComplete}
                  />
                </div>
              )}
            </div>
          </div>

          {/* メインページへのリンク */}
          <div className="text-center mt-8">
            <a 
              href="/?page=main"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              ← メインページに戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  // メインページ
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full px-4 py-8">
        {/* ヘッダー */}
        <div className="max-w-7xl mx-auto text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🛍️ JPYC x402 Payment</h1>
          <p className="text-gray-600">Merchant Payment Request Generator</p>
          <p className="text-sm text-gray-500 mt-2">
            x402プロトコルを使用したメーチャント向け決済リクエスト生成ツール
          </p>
        </div>

        {/* メインコンテンツエリア - 常に2カラムレイアウト */}
        <div className="w-full" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '24px', width: '100%' }}>
            {/* 左カラム: メイン操作エリア（2/3幅） */}
            <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '0' }}>
              
              {!walletData.address ? (
                /* 未接続時: ウォレット接続UI */
                <>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <AmbireLogin 
                      onConnect={handleWalletConnect} 
                      onDisconnect={handleWalletDisconnect}
                    />
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
                </>
              ) : (
                /* 接続済み時: フル機能 */
                <>
                  {/* ウォレット情報サマリー */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-3">接続済みウォレット</h2>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">アカウント:</p>
                        <p className="font-mono text-xs break-all text-gray-700">{walletData.address}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          onClick={handleWalletDisconnect}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                        >
                          ❌ 切断
                        </button>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          🔄 リフレッシュ
                        </button>
                      </div>
                    </div>
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
                      { id: 'x402-simple', label: 'x402決済テスト', icon: '💳' },
                      { id: 'x402-subscription', label: 'x402サブスク管理', icon: '🔄' },
                      { id: 'x402-subscription-shop', label: 'サブスク申し込み', icon: '🛍️' },
                      { id: 'sepolia-gasless', label: 'ガスレス決済', icon: '⛽' },
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
                      currentAddress={walletData.address || undefined}
                    />
                  )}

                  {activeTab === 'x402-simple' && (
                    <X402SimplePayment
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                      onPaymentComplete={handlePaymentComplete}
                    />
                  )}

                  {activeTab === 'x402-subscription' && (
                    <X402Subscription
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                      onPaymentComplete={handlePaymentComplete}
                    />
                  )}

                  {activeTab === 'x402-subscription-shop' && (
                    <X402SubscriptionShop
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                      onPaymentComplete={handlePaymentComplete}
                    />
                  )}

                  {activeTab === 'sepolia-gasless' && (
                    <SepoliaGasless
                      currentAddress={walletData.address || undefined}
                      signer={walletData.signer || undefined}
                    />
                  )}
                </div>
                </>
              )}
            </div>

            {/* 右カラム: サイドバー（1/3幅） */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: '250px' }}>
              <div className="sticky top-8">
                {!walletData.address ? (
                  /* 未接続時: ガイド */
                  <div className="bg-white rounded-lg shadow-md p-6 text-center">
                    <h2 className="text-xl font-semibold mb-4">はじめに</h2>
                    <div className="text-left text-gray-600 space-y-3">
                      <p>👆 左側でウォレットを接続してください</p>
                      <p>🌐 お好みのネットワークを選択</p>
                      <p>💰 テスト用JPYCを取得</p>
                      /* 接続済み時の情報表示 */
                  <div className="bg-white rounded-lg shadow-md p-6 text-center">
                    <h2 className="text-xl font-semibold mb-4">🎯 テスト項目</h2>
                    <div className="space-y-4">
                      <p>💳 <strong>x402決済テスト</strong><br/>単発決済の動作確認</p>
                      <p>🔄 <strong>x402サブスク管理</strong><br/>サブスクリプション設定・管理</p>
                      <p>🛍️ <strong>サブスク申し込み</strong><br/>ユーザー向け申し込みページ</p>
                    </div>
                    
                    {/* 新しいテストページへのリンク */}
                    <div className="mt-6 space-y-3">
                      <a 
                        href="/?page=subscription-test"
                        className="block w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-center"
                      >
                        🧪 サブスクリプション専用テストページ
                      </a>
                      <a 
                        href="/?page=subscription-merchant"
                        className="block w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-center"
                      >
                        🏪 マーチャント管理画面
                      </a>
                    </div>
                  </div>
                ) : (
                  /* 未接続時のガイド */
                    </div>
                  </div>
                ) : qrCodeData ? (
                  /* QRコード表示エリア */
                  <div className="qr-code-container">
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
                          <p className="text-sm mt-1">QR決済タブで決済内容を設定して<br />QRコードを生成してください</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
