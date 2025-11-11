import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import AmbireLogin from '../AmbireLogin';
import { transferJPYC, checkSufficientBalance } from '../lib/jpyc';
import { merchantAddress } from '../lib/products';

interface SubscriptionPlan {
  id: string;
  name: string;
  amount: string; // in wei (JPYC base units)
  jpycAmount: string; // display amount in JPYC
  interval: 'daily' | 'weekly' | 'monthly';
  duration: number; // days
  description: string;
  features: string[];
  merchantName: string;
  merchantId: string;
  createdAt: number;
}

interface UserSubscription {
  planId: string;
  subscriberAddress: string;
  merchantName: string;
  merchantId: string;
  amount: string;
  interval: string;
  description: string;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'cancelled';
  txHash: string;
  nextPaymentDate?: string;
  x402Data?: any;
}

const X402SubscriptionTestPage: React.FC = () => {
  // Wallet state
  const [walletData, setWalletData] = useState<{
    address: string | null;
    signer: ethers.Signer | null;
  }>({ address: null, signer: null });

  // Available plans (from local storage - merchant created)
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  
  // UI state
  const [loading, setLoading] = useState<string>(''); // which plan is loading
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load available plans from merchant storage
  useEffect(() => {
    loadAvailablePlans();
  }, []);

  const loadAvailablePlans = () => {
    try {
      const saved = localStorage.getItem('merchant_subscription_plans');
      if (saved) {
        const plans = JSON.parse(saved);
        setAvailablePlans(plans);
      } else {
        // Default demo plans if none exist
        const defaultPlans: SubscriptionPlan[] = [
          {
            id: 'demo_basic',
            name: 'ベーシックプラン',
            amount: '1000000', // 1 JPYC in wei
            jpycAmount: '1',
            interval: 'monthly',
            duration: 30,
            description: 'お試し用ベーシックプラン',
            features: ['基本機能', '月間100回利用', 'メールサポート'],
            merchantName: 'x402デモストア',
            merchantId: 'DEMO_STORE_001',
            createdAt: Date.now()
          },
          {
            id: 'demo_premium',
            name: 'プレミアムプラン',
            amount: '5000000', // 5 JPYC in wei
            jpycAmount: '5',
            interval: 'monthly',
            duration: 30,
            description: 'フル機能付きプレミアムプラン',
            features: ['全機能利用可能', '無制限利用', '優先サポート', 'API アクセス'],
            merchantName: 'x402デモストア',
            merchantId: 'DEMO_STORE_001',
            createdAt: Date.now()
          }
        ];
        localStorage.setItem('merchant_subscription_plans', JSON.stringify(defaultPlans));
        setAvailablePlans(defaultPlans);
      }
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  };

  // Check if user has active subscription for a plan
  const getActiveSubscription = (planId: string): UserSubscription | null => {
    if (!walletData.address) return null;
    
    try {
      const saved = localStorage.getItem(`user_subscriptions_${walletData.address}`);
      if (!saved) return null;
      
      const subscriptions: UserSubscription[] = JSON.parse(saved);
      const now = Date.now();
      
      return subscriptions.find(sub => 
        sub.planId === planId && 
        sub.status === 'active' && 
        sub.endDate > now
      ) || null;
    } catch (e) {
      console.error('Failed to check subscription:', e);
      return null;
    }
  };

  // Save user subscription
  const saveUserSubscription = (subscription: UserSubscription) => {
    if (!walletData.address) return;
    
    try {
      const storageKey = `user_subscriptions_${walletData.address}`;
      const saved = localStorage.getItem(storageKey);
      const existing = saved ? JSON.parse(saved) : [];
      
      const updated = [...existing, subscription];
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // Also save to merchant subscribers list
      saveMerchantSubscriber(subscription);
      
    } catch (e) {
      console.error('Failed to save subscription:', e);
    }
  };

  // Save to merchant subscribers list
  const saveMerchantSubscriber = (subscription: UserSubscription) => {
    try {
      const storageKey = `merchant_subscribers_${subscription.merchantId}`;
      const saved = localStorage.getItem(storageKey);
      const existing = saved ? JSON.parse(saved) : [];
      
      const updated = [...existing, subscription];
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to merchant list:', e);
    }
  };

  // Handle wallet connection
  const handleWalletConnect = (address: string, signer: ethers.Signer) => {
    console.log('📱 Wallet connected:', address);
    setWalletData({ address, signer });
  };

  const handleWalletDisconnect = () => {
    console.log('🔌 Wallet disconnected');
    setWalletData({ address: null, signer: null });
  };

  // Purchase subscription with full x402 flow
  const purchaseSubscription = async (plan: SubscriptionPlan) => {
    if (!walletData.signer || !walletData.address) {
      setError('ウォレット接続が必要です');
      return;
    }

    setLoading(plan.id);
    setError('');
    setSuccess('');

    try {
      console.log(`🚀 ${plan.name} のx402サブスクリプション決済開始`);

      // Step 1: Balance check
      const actualJPYCAmount = (parseFloat(plan.amount) / 1000000).toString();
      const balanceCheck = await checkSufficientBalance(walletData.signer, actualJPYCAmount);
      
      if (!balanceCheck.sufficient) {
        setError(
          `JPYC残高が不足しています。\n` +
          `必要金額: ${balanceCheck.required.toFixed(0)} JPYC\n` +
          `現在残高: ${balanceCheck.currentBalance.toFixed(0)} JPYC\n` +
          `不足分: ${(balanceCheck.required - balanceCheck.currentBalance).toFixed(0)} JPYC`
        );
        return;
      }

      // Step 2: Create x402 PaymentRequirements
      const paymentRequirements = {
        scheme: "exact",
        network: "sepolia", // or selected network
        maxAmountRequired: plan.amount,
        resource: `https://api.x402store.com/subscription/${plan.id}/${Date.now()}`,
        description: `${plan.name} - ${plan.description}`,
        mimeType: "application/json",
        payTo: merchantAddress,
        maxTimeoutSeconds: 600,
        asset: "0xd3eF95d29A198868241FE374A999fc25F6152253", // Sepolia JPYC
        extra: {
          name: "JPYC",
          version: "2",
          subscriptionInfo: {
            interval: plan.interval,
            duration: plan.duration,
            planName: plan.name,
            merchantName: plan.merchantName,
            merchantId: plan.merchantId
          }
        }
      };

      console.log('📋 x402 PaymentRequirements:', paymentRequirements);

      // Step 3: Create and sign PaymentPayload
      const currentTime = Math.floor(Date.now() / 1000);
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const planInstanceId = `x402_sub_${plan.id}_${Date.now()}`;

      const authorization = {
        from: walletData.address,
        to: merchantAddress,
        value: plan.amount,
        validAfter: (currentTime - 60).toString(),
        validBefore: (currentTime + 600).toString(),
        nonce: nonce
      };

      // EIP-712 signature for subscription
      const domain = {
        name: "JPY Coin",
        version: "2",
        chainId: 11155111, // Sepolia
        verifyingContract: paymentRequirements.asset
      };

      const types = {
        SubscriptionAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
          { name: "planId", type: "string" },
          { name: "interval", type: "string" }
        ]
      };

      const subscriptionMessage = {
        ...authorization,
        planId: planInstanceId,
        interval: plan.interval
      };

      let signature = '';
      try {
        signature = await walletData.signer.signTypedData(domain, types, subscriptionMessage);
        console.log('🔐 EIP-712サブスクリプション署名完了');
      } catch (e) {
        console.log('EIP-712署名に失敗、fallback署名を使用');
        const message = JSON.stringify(subscriptionMessage);
        signature = await walletData.signer.signMessage(message);
      }

      const paymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: "sepolia",
        payload: {
          signature,
          authorization,
          subscriptionData: {
            planId: planInstanceId,
            interval: plan.interval,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + (plan.duration * 24 * 60 * 60 * 1000)).toISOString()
          }
        }
      };

      console.log('🔐 x402 PaymentPayload作成完了');

      // Step 4: Execute payment
      console.log('⛓️ ブロックチェーン決済実行');
      const receipt = await transferJPYC(walletData.signer, merchantAddress, actualJPYCAmount);
      console.log('💳 Payment completed:', receipt.hash);

      // Step 5: Save subscription
      const startDate = Date.now();
      const endDate = startDate + (plan.duration * 24 * 60 * 60 * 1000);
      
      const subscription: UserSubscription = {
        planId: plan.id,
        subscriberAddress: walletData.address,
        merchantName: plan.merchantName,
        merchantId: plan.merchantId,
        amount: plan.amount,
        interval: plan.interval,
        description: plan.description,
        startDate,
        endDate,
        status: 'active',
        txHash: receipt.hash,
        nextPaymentDate: new Date(endDate).toISOString().split('T')[0],
        x402Data: {
          version: paymentPayload.x402Version,
          scheme: paymentPayload.scheme,
          network: paymentPayload.network,
          resource: paymentRequirements.resource,
          signature: signature.slice(0, 50) + '...',
          planInstanceId
        }
      };

      saveUserSubscription(subscription);

      setSuccess(
        `🎉 x402サブスクリプション契約完了！\n\n` +
        `📋 Plan Details:\n` +
        `• プラン: ${plan.name}\n` +
        `• 金額: ${plan.jpycAmount} JPYC\n` +
        `• 期間: ${getIntervalDisplay(plan.interval)} (${plan.duration}日)\n` +
        `• 店舗: ${plan.merchantName}\n\n` +
        `🔐 x402 Protocol:\n` +
        `• Version: ${paymentPayload.x402Version}\n` +
        `• Scheme: ${paymentPayload.scheme}\n` +
        `• Network: ${paymentPayload.network}\n` +
        `• Plan Instance: ${planInstanceId}\n\n` +
        `⛓️ Transaction:\n` +
        `• Hash: ${receipt.hash}\n` +
        `• Status: Success`
      );

    } catch (e: any) {
      let errorMessage = e.message || 'Unknown error';
      
      if (errorMessage.includes('user rejected')) {
        setError('ユーザーによって取引がキャンセルされました');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('残高が不足しています');
      } else {
        setError(`サブスクリプション決済に失敗しました: ${errorMessage}`);
      }
      console.error('❌ Subscription purchase error:', e);
    } finally {
      setLoading('');
    }
  };

  const getIntervalDisplay = (interval: string) => {
    const labels: Record<string, string> = {
      daily: '毎日',
      weekly: '毎週',
      monthly: '毎月'
    };
    return labels[interval] || interval;
  };

  const getRemainingDays = (subscription: UserSubscription): number => {
    const now = Date.now();
    const remaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  };

  // Render plan card
  const renderPlanCard = (plan: SubscriptionPlan) => {
    const activeSubscription = getActiveSubscription(plan.id);
    const isActive = !!activeSubscription;
    const remainingDays = isActive ? getRemainingDays(activeSubscription) : 0;
    const isLoading = loading === plan.id;

    return (
      <div 
        key={plan.id}
        style={{
          border: '2px solid',
          borderColor: isActive ? '#10b981' : '#e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: isActive ? '#f0fdf4' : '#ffffff',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}
      >
        {isActive && (
          <div style={{
            position: 'absolute',
            top: '-12px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            アクティブ
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold',
            color: '#1f2937',
            margin: '0 0 8px 0'
          }}>
            {plan.name}
          </h3>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: '#dc2626',
            marginBottom: '4px'
          }}>
            {plan.jpycAmount} JPYC
            <span style={{ 
              fontSize: '16px', 
              fontWeight: 'normal',
              color: '#6b7280',
              marginLeft: '4px'
            }}>
              / {plan.duration}日間
            </span>
          </div>
          <p style={{ 
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 8px 0',
            lineHeight: '1.5'
          }}>
            {plan.description}
          </p>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            店舗: {plan.merchantName} ({plan.merchantId})
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <ul style={{ 
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            {plan.features.map((feature, index) => (
              <li key={index} style={{ 
                padding: '4px 0',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#10b981' }}>✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {isActive && (
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', color: '#065f46', fontWeight: '500' }}>
              📅 残り日数: <strong>{remainingDays}日</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
              期限: {new Date(activeSubscription.endDate).toLocaleDateString()}
            </div>
            <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
              TxHash: {activeSubscription.txHash.slice(0, 20)}...
            </div>
          </div>
        )}

        <button
          onClick={() => purchaseSubscription(plan)}
          disabled={isLoading || !walletData.address || isActive}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isLoading || !walletData.address ? '#9ca3af' : 
                           isActive ? '#059669' : '#dc2626',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading || !walletData.address || isActive ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isLoading ? (
            '⏳ 決済処理中...'
          ) : !walletData.address ? (
            '🔗 ウォレット接続が必要です'
          ) : isActive ? (
            `✅ アクティブ (残り${remainingDays}日)`
          ) : (
            `💳 ${plan.name}を購入 (${plan.jpycAmount} JPYC)`
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🔄 X402 サブスクリプション テストページ</h1>
          <p className="text-gray-600">完全なウォレット接続とJPYC決済フローのテスト</p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Wallet Connection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">🔗 ウォレット接続</h2>
            <AmbireLogin 
              onConnect={handleWalletConnect} 
              onDisconnect={handleWalletDisconnect}
            />
            
            {walletData.address && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div style={{ fontSize: '14px', color: '#065f46' }}>
                  ✅ 接続済み: {walletData.address}
                </div>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div style={{ color: '#dc2626', fontSize: '14px', whiteSpace: 'pre-line' }}>
                ⚠️ {error}
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div style={{ color: '#065f46', fontSize: '14px', whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                🎉 {success}
              </div>
            </div>
          )}

          {/* Available Subscription Plans */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">📋 利用可能なサブスクリプションプラン</h2>
            
            {availablePlans.length === 0 ? (
              <div className="text-center py-12">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p style={{ fontSize: '18px', color: '#6b7280' }}>利用可能なプランがありません</p>
                <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                  マーチャント管理画面でプランを作成してください
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '24px'
              }}>
                {availablePlans.map(renderPlanCard)}
              </div>
            )}
          </div>

          {/* Test Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 テスト機能について</h3>
            <div style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>完全なx402フロー:</strong> PaymentRequirements → PaymentPayload → EIP-712署名 → 決済 → 保存</li>
                <li><strong>実際のJPYC決済:</strong> Sepolia testnetでJPYCトークンを使用した実際の決済</li>
                <li><strong>ウォレット接続:</strong> Ambire Walletでの接続とメタマスク対応</li>
                <li><strong>残高チェック:</strong> 決済前にJPYC残高の確認</li>
                <li><strong>サブスクリプション管理:</strong> アクティブな契約の表示と期間管理</li>
                <li><strong>データ保存:</strong> ユーザーとマーチャント両方のローカルストレージに保存</li>
              </ul>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="text-center">
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a 
                href="/?page=main"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ← メインページに戻る
              </a>
              <a 
                href="/?page=subscription-merchant"
                className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                🏪 マーチャント管理画面
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default X402SubscriptionTestPage;