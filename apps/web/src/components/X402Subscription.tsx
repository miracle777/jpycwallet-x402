import React, { useState } from 'react';
import { ethers } from 'ethers';
import SubscriptionMerchantDashboard from './SubscriptionMerchantDashboard';

interface X402SubscriptionProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string) => void;
}

// x402 PaymentRequirements for subscription
interface SubscriptionPaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    name: string;
    version: string;
    subscriptionInfo: {
      interval: string;
      duration: number;
      planName: string;
      merchantName: string;
      merchantId: string;
    };
  };
}

// x402 Subscription PaymentPayload
interface SubscriptionPaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature?: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
    subscriptionData?: {
      planId: string;
      interval: string;
      startDate: string;
      endDate: string;
    };
  };
}

interface SubscriptionPlan {
  name: string;
  amount: string;
  interval: 'daily' | 'weekly' | 'monthly';
  duration: number;
  description: string;
  merchantName: string;
  merchantId: string;
}

const X402Subscription: React.FC<X402SubscriptionProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<'polygon-amoy' | 'sepolia' | 'sepolia-official' | 'avalanche-fuji'>('sepolia');
  
  const [plan, setPlan] = useState<SubscriptionPlan>({
    name: 'x402プレミアムプラン',
    amount: '5000000000000000000', // 5 JPYC in wei (18 decimals)
    interval: 'monthly',
    duration: 30,
    description: 'x402テスト用月額サブスクリプション',
    merchantName: 'x402テストストア',
    merchantId: 'X402_STORE_001',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [paymentRequirements, setPaymentRequirements] = useState<SubscriptionPaymentRequirements | null>(null);
  const [paymentPayload, setPaymentPayload] = useState<SubscriptionPaymentPayload | null>(null);

  // ネットワーク設定
  const networkConfig = {
    'polygon-amoy': {
      chainId: 80002,
      name: 'Polygon Amoy',
      asset: '0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F',
      rpcUrl: 'https://rpc-amoy.polygon.technology'
    },
    sepolia: {
      chainId: 11155111,
      name: 'Ethereum Sepolia (Community)',
      asset: '0xd3eF95d29A198868241FE374A999fc25F6152253',
      rpcUrl: 'https://rpc.sepolia.org'
    },
    'sepolia-official': {
      chainId: 11155111,
      name: 'Ethereum Sepolia (Official)',
      asset: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      rpcUrl: 'https://rpc.sepolia.org'
    },
    'avalanche-fuji': {
      chainId: 43113,
      name: 'Avalanche Fuji',
      asset: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc'
    }
  };

  const currentConfig = networkConfig[selectedNetwork];

  // x402 Subscription PaymentRequirements を作成
  const createSubscriptionPaymentRequirements = (): SubscriptionPaymentRequirements => {
    return {
      scheme: "exact",
      network: selectedNetwork,
      maxAmountRequired: plan.amount,
      resource: `https://api.x402store.com/subscription/${Date.now()}`,
      description: `${plan.name} - ${plan.description}`,
      mimeType: "application/json",
      payTo: merchantAddress,
      maxTimeoutSeconds: 600, // 10分（サブスクリプション用に長め）
      asset: currentConfig.asset,
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
  };

  // x402 Subscription PaymentPayload を作成
  const createSubscriptionPaymentPayload = async (requirements: SubscriptionPaymentRequirements): Promise<SubscriptionPaymentPayload> => {
    if (!signer || !currentAddress) {
      throw new Error('Signer not available');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const planId = `x402_sub_${Date.now()}`;

    // サブスクリプション期間計算
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (plan.duration * 24 * 60 * 60 * 1000));

    const authorization = {
      from: currentAddress,
      to: requirements.payTo,
      value: requirements.maxAmountRequired,
      validAfter: (currentTime - 60).toString(),
      validBefore: (currentTime + requirements.maxTimeoutSeconds).toString(),
      nonce: nonce
    };

    // EIP-712 domain for JPYC
    const domain = {
      name: "JPY Coin",
      version: "2",
      chainId: currentConfig.chainId, // 選択されたネットワークのchainIdを使用
      verifyingContract: requirements.asset
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

    // サブスクリプション特化のメッセージ
    const subscriptionMessage = {
      ...authorization,
      planId: planId,
      interval: plan.interval
    };

    let signature = '';
    try {
      signature = await signer.signTypedData(domain, types, subscriptionMessage);
      console.log('🔐 EIP-712サブスクリプション署名完了');
    } catch (e) {
      console.log('EIP-712署名に失敗、fallback署名を使用');
      const message = JSON.stringify(subscriptionMessage);
      signature = await signer.signMessage(message);
    }

    return {
      x402Version: 1,
      scheme: "exact",
      network: "polygon",
      payload: {
        signature,
        authorization,
        subscriptionData: {
          planId,
          interval: plan.interval,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    };
  };

  // x402サブスクリプション決済実行
  const executeX402Subscription = async () => {
    if (!signer || !currentAddress) {
      setError('ウォレット接続が必要です');
      return;
    }

    if (!validatePlan()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🚀 x402サブスクリプション決済フロー開始');

      // Step 0: ネットワークチェック
      const currentNetwork = await signer.provider?.getNetwork();
      console.log('Current network:', currentNetwork);
      
      if (BigInt(currentNetwork?.chainId || 0) !== 137n) { // 137 is Polygon mainnet
        setError('Polygonネットワークに接続してください。現在のネットワークでは決済できません。');
        setLoading(false);
        return;
      }

      // Step 1: 残高チェック
      const actualJPYCAmount = (parseFloat(plan.amount) / 1000000).toString(); // base unitsを実JPYCに変換
      const balanceCheck = await checkSufficientBalance(signer, actualJPYCAmount);
      if (!balanceCheck.sufficient) {
        setError(
          `JPYC残高が不足しています。\n` +
          `必要金額: ${balanceCheck.required.toFixed(0)} JPYC\n` +
          `現在残高: ${balanceCheck.currentBalance.toFixed(0)} JPYC\n` +
          `不足分: ${(balanceCheck.required - balanceCheck.currentBalance).toFixed(0)} JPYC`
        );
        return;
      }

      // Step 2: PaymentRequirements作成
      console.log('📋 Step 1: Subscription PaymentRequirements作成');
      const requirements = createSubscriptionPaymentRequirements();
      setPaymentRequirements(requirements);
      console.log('💰 Subscription Requirements:', requirements);

      // Step 3: PaymentPayload作成・署名
      console.log('🔐 Step 2: Subscription PaymentPayload作成');
      const payload = await createSubscriptionPaymentPayload(requirements);
      setPaymentPayload(payload);
      console.log('✅ Subscription PaymentPayload作成完了');

      // Step 4: x402 verification simulation
      console.log('🔍 Step 3: x402 Verification simulation');
      const verificationResult = {
        isValid: true,
        subscriptionVerified: true,
        planId: payload.payload.subscriptionData?.planId
      };
      console.log('✅ Verification passed:', verificationResult);

      // Step 5: ブロックチェーン決済実行
      console.log('⛓️ Step 4: サブスクリプション料金決済');
      const paymentJPYCAmount = (parseFloat(plan.amount) / 1000000).toString(); // base unitsを実JPYCに変換
      const receipt = await transferJPYC(signer, merchantAddress, paymentJPYCAmount);
      console.log('💳 Payment completed:', receipt.hash);

      // Step 6: x402 settlement simulation  
      console.log('🏁 Step 5: x402 Settlement simulation');
      const settlementResult = {
        success: true,
        txHash: receipt.hash,
        subscriptionId: payload.payload.subscriptionData?.planId,
        networkId: "polygon"
      };
      console.log('✅ Settlement completed:', settlementResult);

      // Step 7: サブスクリプション情報保存
      const now = Date.now();
      const subscription = {
        planId: payload.payload.subscriptionData?.planId || `x402_${Date.now()}`,
        merchantName: plan.merchantName,
        merchantId: plan.merchantId,
        amount: plan.amount,
        interval: plan.interval,
        description: plan.description,
        startDate: now,
        endDate: now + (plan.duration * 24 * 60 * 60 * 1000),
        txHash: receipt.hash,
        status: 'active' as const,
        nextPaymentDate: new Date(now + (plan.duration * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        x402Data: {
          version: payload.x402Version,
          scheme: payload.scheme,
          network: payload.network,
          resource: requirements.resource,
          signature: payload.payload.signature?.slice(0, 50) + '...'
        }
      };

      saveUserSubscription(currentAddress, subscription);

      setSuccess(
        `🎉 x402サブスクリプション契約完了！\n\n` +
        `📋 Contract Details:\n` +
        `• Plan: ${plan.name}\n` +
        `• Amount: ${(parseFloat(plan.amount) / 1000000).toFixed(0)} JPYC\n` +
        `• Interval: ${getIntervalDisplay(plan.interval)}\n` +
        `• Merchant: ${plan.merchantName}\n` +
        `• Duration: ${plan.duration}日\n\n` +
        `🔐 x402 Protocol:\n` +
        `• Version: ${payload.x402Version}\n` +
        `• Scheme: ${payload.scheme}\n` +
        `• Network: ${payload.network}\n` +
        `• Plan ID: ${payload.payload.subscriptionData?.planId}\n\n` +
        `⛓️ Transaction:\n` +
        `• Hash: ${receipt.hash}\n` +
        `• Settlement: Success\n\n` +
        `📊 管理画面でサブスクリプション状況を確認できます。`
      );

      onPaymentComplete?.(receipt.hash);

      // フォームリセット
      resetForm();

    } catch (e: any) {
      let errorMessage = e.message || 'Unknown error';
      
      if (errorMessage.includes('user rejected')) {
        setError('ユーザーによって取引がキャンセルされました');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('残高が不足しています');
      } else {
        setError(`x402サブスクリプション決済に失敗しました: ${errorMessage}`);
      }
      console.error('❌ x402サブスクリプション決済エラー:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SubscriptionPlan, value: string) => {
    setPlan(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIntervalChange = (interval: 'daily' | 'weekly' | 'monthly') => {
    setPlan(prev => ({
      ...prev,
      interval,
      duration: getDurationFromInterval(interval)
    }));
  };

  const validatePlan = (): boolean => {
    if (!plan.name.trim()) {
      setError('プラン名を入力してください');
      return false;
    }
    if (!plan.amount.trim() || parseFloat(plan.amount) <= 0) {
      setError('有効な金額を入力してください');
      return false;
    }
    if (!plan.merchantName.trim()) {
      setError('店舗名を入力してください');
      return false;
    }
    return true;
  };

  const getIntervalDisplay = (interval: string) => {
    const labels: Record<string, string> = {
      daily: '毎日',
      weekly: '毎週',
      monthly: '毎月'
    };
    return labels[interval] || interval;
  };

  const getDurationFromInterval = (interval: string) => {
    const durations: Record<string, number> = {
      daily: 1,
      weekly: 7,
      monthly: 30
    };
    return durations[interval] || 30;
  };

  const resetForm = () => {
    setPlan({
      name: 'x402プレミアムプラン',
      amount: '5000000',
      interval: 'monthly',
      duration: 30,
      description: 'x402テスト用月額サブスクリプション',
      merchantName: 'x402テストストア',
      merchantId: 'X402_STORE_001',
    });
    setPaymentRequirements(null);
    setPaymentPayload(null);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '30px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
        border: '1px solid #e5e7eb' 
      }}>
        <h2 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
          🔄 x402 Subscription Contract
        </h2>

        {/* x402サブスクリプション情報 */}
        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>🔄</span>
            <span style={{ fontWeight: '600', color: '#0c4a6e' }}>x402 Subscription Protocol</span>
          </div>
          <div style={{ fontSize: '14px', color: '#0c4a6e' }}>
            定期支払いをx402標準に準拠して実装。PaymentRequirements + PaymentPayload + Verification + Settlement
          </div>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '8px' }}>
              <span>⚠️</span>
              <span style={{ fontWeight: '500' }}>エラー</span>
            </div>
            <div style={{ fontSize: '14px', color: '#dc2626', whiteSpace: 'pre-line' }}>
              {error}
            </div>
          </div>
        )}
        
        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '8px' }}>
              <span>🎉</span>
              <span style={{ fontWeight: '500' }}>サブスクリプション契約完了</span>
            </div>
            <div style={{ fontSize: '14px', color: '#15803d', whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
              {success}
            </div>
          </div>
        )}

        {/* サブスクリプションプラン設定 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
          
          {/* ネットワーク選択 */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              🌐 ネットワーク選択
            </h3>
            
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value as 'polygon-amoy' | 'sepolia' | 'sepolia-official' | 'avalanche-fuji')}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="polygon-amoy">Polygon Amoy (JPYC)</option>
              <option value="sepolia">Ethereum Sepolia - Community (JPYC)</option>
              <option value="sepolia-official">Ethereum Sepolia - Official (JPYC)</option>
              <option value="avalanche-fuji">Avalanche Fuji (JPYC)</option>
            </select>
          </div>
          
          {/* 店舗情報 */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              🏪 Store Information
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  店舗名
                </label>
                <input
                  type="text"
                  value={plan.merchantName}
                  onChange={(e) => handleInputChange('merchantName', e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  店舗ID
                </label>
                <input
                  type="text"
                  value={plan.merchantId}
                  onChange={(e) => handleInputChange('merchantId', e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* プラン詳細 */}
          <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '20px', border: '1px solid #0ea5e9' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              💳 Subscription Plan
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  プラン名
                </label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  金額 (JPYC base units)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={plan.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    min="0"
                  />
                  <div style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    fontSize: '12px', 
                    color: '#6b7280' 
                  }}>
                    ≈ {(parseFloat(plan.amount || '0') / 1000000).toFixed(0)} JPYC
                  </div>
                </div>
              </div>
            </div>

            {/* 支払い間隔 */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                支払い間隔
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['daily', 'weekly', 'monthly'] as const).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => handleIntervalChange(interval)}
                    style={{
                      padding: '8px 16px',
                      border: `1px solid ${plan.interval === interval ? '#3b82f6' : '#d1d5db'}`,
                      borderRadius: '6px',
                      backgroundColor: plan.interval === interval ? '#dbeafe' : '#ffffff',
                      color: plan.interval === interval ? '#1d4ed8' : '#374151',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: plan.interval === interval ? '600' : '400'
                    }}
                  >
                    {getIntervalDisplay(interval)}
                  </button>
                ))}
              </div>
            </div>

            {/* 説明 */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                プラン説明
              </label>
              <textarea
                value={plan.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={2}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>

        {/* x402フロー表示 */}
        {(paymentRequirements || paymentPayload) && (
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              📊 x402 Subscription Flow Data
            </h3>
            
            {paymentRequirements && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  🔄 Subscription PaymentRequirements:
                </div>
                <pre style={{ 
                  fontSize: '11px', 
                  backgroundColor: '#f1f5f9', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  overflow: 'auto',
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(paymentRequirements, null, 2)}
                </pre>
              </div>
            )}

            {paymentPayload && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  🔐 Subscription PaymentPayload:
                </div>
                <pre style={{ 
                  fontSize: '11px', 
                  backgroundColor: '#f1f5f9', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  overflow: 'auto',
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(paymentPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 実行ボタン */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={executeX402Subscription}
            disabled={loading || !currentAddress}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: (loading || !currentAddress) ? '#9ca3af' : '#10b981',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (loading || !currentAddress) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <span>⏳</span>
                x402サブスクリプション契約中...
              </>
            ) : !currentAddress ? (
              <>
                <span>🔗</span>
                ウォレット接続が必要です
              </>
            ) : (
              <>
                <span>🔄</span>
                x402サブスクリプション契約
              </>
            )}
          </button>

          <button
            onClick={resetForm}
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            リセット
          </button>
        </div>

        {/* x402サブスクリプション情報 */}
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          backgroundColor: '#f9fafb', 
          padding: '15px', 
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          marginTop: '20px'
        }}>
          <div style={{ fontWeight: '500', marginBottom: '8px' }}>🔄 x402 Subscription Features:</div>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
            <li>サブスクリプション専用PaymentRequirements + PaymentPayload</li>
            <li>EIP-712によるサブスクリプション署名</li>
            <li>Verification/Settlementフロー対応</li>
            <li>x402標準とローカル管理の統合</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default X402Subscription;