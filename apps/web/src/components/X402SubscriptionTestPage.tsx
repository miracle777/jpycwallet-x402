import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import AmbireLogin from '../AmbireLogin';
import { transferJPYC, checkSufficientBalance, getJPYCAddressForContract, getChainIdForNetwork, getNetworkDisplayName, NETWORK_CONFIG, JPYC_CONTRACTS, getJPYCContractsForNetwork, getProvider, getErc20Contract } from '../lib/jpyc';
import type { SupportedNetwork, JPYCContract } from '../lib/jpyc';
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

  // Network selection state
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedNetwork>('sepolia');
  const [selectedContract, setSelectedContract] = useState<JPYCContract>('sepolia-community');

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

  // Update contract selection when network changes
  useEffect(() => {
    const availableContracts = getJPYCContractsForNetwork(selectedNetwork);
    if (availableContracts.length > 0) {
      setSelectedContract(availableContracts[0]);
    }
  }, [selectedNetwork]);

  // Initialize plans with correct JPYC amounts
  useEffect(() => {
    if (availablePlans.length > 0 && selectedContract) {
      initializePlansWithCorrectAmounts();
    }
  }, [selectedContract, availablePlans.length]);

  const loadAvailablePlans = () => {
    try {
      // If merchant has created plans, use them. Otherwise create defaults.
      const saved = localStorage.getItem('merchant_subscription_plans');
      if (saved) {
        const parsed: SubscriptionPlan[] = JSON.parse(saved);
        setAvailablePlans(parsed);
        return;
      }

      // Create fresh default plans
      const defaultPlans: SubscriptionPlan[] = [
        {
          id: 'demo_basic',
          name: 'ベーシックプラン',
          amount: '0', // Will be calculated based on JPYC decimals
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
          amount: '0', // Will be calculated based on JPYC decimals
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
      console.log('🏗️ Created fresh default plans:', defaultPlans);
      localStorage.setItem('merchant_subscription_plans', JSON.stringify(defaultPlans));
      setAvailablePlans(defaultPlans);
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  };

  // Initialize plans with correct JPYC wei amounts based on actual contract decimals
  const initializePlansWithCorrectAmounts = async () => {
    console.log('🔄 Attempting to initialize plans with correct amounts', {
      selectedContract,
      availablePlansLength: availablePlans.length,
      availablePlans: availablePlans.map(p => ({
        name: p.name,
        jpycAmount: p.jpycAmount,
        amount: p.amount
      }))
    });

    if (!selectedContract || availablePlans.length === 0) {
      console.log('❌ Skipping initialization: no contract or no plans');
      return;
    }

    try {
      console.log('🔍 Initializing plans with correct amounts for contract:', selectedContract);
      
      // Get JPYC decimals from contract
      const provider = getProvider(JPYC_CONTRACTS[selectedContract].network as SupportedNetwork);
      const contract = getErc20Contract(provider, selectedContract);
      const decimals = await contract.decimals();
      
      console.log('📊 JPYC Contract decimals:', decimals);

      // Update plans with correct wei amounts
      const updatedPlans = availablePlans.map(plan => {
        const jpycAmount = parseFloat(plan.jpycAmount);
        const weiAmount = ethers.parseUnits(jpycAmount.toString(), decimals).toString();
        
        console.log(`💰 Plan ${plan.name}: ${jpycAmount} JPYC = ${weiAmount} wei (${decimals} decimals)`);
        
        return {
          ...plan,
          amount: weiAmount
        };
      });

      console.log('✅ Plans updated with correct amounts:', updatedPlans.map(p => ({
        name: p.name,
        jpycAmount: p.jpycAmount,
        amountWei: p.amount
      })));

      setAvailablePlans(updatedPlans);
      
      // Save updated plans to localStorage
      localStorage.setItem('merchant_subscription_plans', JSON.stringify(updatedPlans));
      
    } catch (e) {
      console.error('❌ Failed to initialize plan amounts:', e);
      // Fallback to 18 decimals (standard ERC20)
      console.log('🔄 Using fallback 18 decimals');
      const updatedPlans = availablePlans.map(plan => {
        const jpycAmount = parseFloat(plan.jpycAmount);
        const weiAmount = ethers.parseUnits(jpycAmount.toString(), 18).toString();
        console.log(`💰 Fallback - Plan ${plan.name}: ${jpycAmount} JPYC = ${weiAmount} wei (18 decimals)`);
        return {
          ...plan,
          amount: weiAmount
        };
      });
      setAvailablePlans(updatedPlans);
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
      // Force recalculation with current contract to ensure correct amounts
      console.log('⚠️ Forcing plan recalculation with current contract...');
      const jpycContract = getErc20Contract(walletData.signer, selectedContract);
      const currentDecimals = await jpycContract.decimals();
      
      // Recalculate plan amount with current contract decimals
      const recalculatedAmount = ethers.parseUnits(plan.jpycAmount, currentDecimals).toString();
      const updatedPlan = {
        ...plan,
        amount: recalculatedAmount
      };
      
      console.log('🔢 Contract decimals recalculation:', {
        planName: plan.name,
        jpycAmount: plan.jpycAmount,
        oldAmount: plan.amount,
        newAmount: recalculatedAmount,
        decimals: currentDecimals.toString(),
        selectedContract
      });

      console.log(`🚀 ${updatedPlan.name} のx402サブスクリプション決済開始 - Network: ${selectedNetwork}`);
      console.log('📊 Plan details:', {
        planId: updatedPlan.id,
        planName: updatedPlan.name,
        planAmountWei: updatedPlan.amount,
        planJpycAmount: updatedPlan.jpycAmount,
        selectedContract,
        contractInfo: JPYC_CONTRACTS[selectedContract]
      });

      console.log('🔢 JPYC Contract decimals:', currentDecimals);
      
      // Verify that updatedPlan.amount (wei) and updatedPlan.jpycAmount match
      const calculatedJPYC = ethers.formatUnits(updatedPlan.amount, currentDecimals);
      console.log('💰 Amount verification:', {
        planAmountWei: updatedPlan.amount,
        decimals: currentDecimals.toString(),
        calculatedJPYC: calculatedJPYC,
        planJPYC: updatedPlan.jpycAmount,
        shouldMatch: Math.abs(parseFloat(calculatedJPYC) - parseFloat(updatedPlan.jpycAmount)) < 0.01,
        difference: Math.abs(parseFloat(calculatedJPYC) - parseFloat(updatedPlan.jpycAmount))
      });
      
      // Use updatedPlan.jpycAmount for balance check (this is the actual JPYC amount we need)
      const balanceCheck = await checkSufficientBalance(walletData.signer, updatedPlan.jpycAmount.toString(), selectedContract);
      
      if (!balanceCheck.sufficient) {
        setError(
          `JPYC残高が不足しています (${JPYC_CONTRACTS[selectedContract].name})。\n` +
          `必要金額: ${balanceCheck.required.toFixed(0)} JPYC\n` +
          `現在残高: ${balanceCheck.currentBalance.toFixed(0)} JPYC\n` +
          `不足分: ${(balanceCheck.required - balanceCheck.currentBalance).toFixed(0)} JPYC`
        );
        return;
      }

      // Step 2: Create x402 PaymentRequirements
      const jpycAddress = getJPYCAddressForContract(selectedContract);
      const chainId = getChainIdForNetwork(selectedNetwork);
      
      // Ensure proper checksum addresses
      const checksumJpycAddress = ethers.getAddress(jpycAddress);
      const checksumMerchantAddress = ethers.getAddress(merchantAddress);
      
      console.log('🏗️ Creating X402 PaymentRequirements:', {
        planAmountWei: updatedPlan.amount,
        planJpycAmount: updatedPlan.jpycAmount,
        jpycAddress: checksumJpycAddress,
        merchantAddress: checksumMerchantAddress,
        network: selectedNetwork,
        chainId,
        willUseJpycAmountForWallet: true
      });
      
      const paymentRequirements = {
        scheme: "exact",
        network: selectedNetwork,
        maxAmountRequired: updatedPlan.jpycAmount, // Use JPYC amount for wallet display (not wei)
        resource: `https://api.x402store.com/subscription/${updatedPlan.id}/${Date.now()}`,
        description: `${updatedPlan.name} - ${updatedPlan.description}`,
        mimeType: "application/json",
        payTo: checksumMerchantAddress,
        maxTimeoutSeconds: 600,
        asset: checksumJpycAddress,
        extra: {
          name: "JPYC",
          version: "2",
          subscriptionInfo: {
            interval: updatedPlan.interval,
            duration: updatedPlan.duration,
            planName: updatedPlan.name,
            merchantName: updatedPlan.merchantName,
            merchantId: updatedPlan.merchantId,
            network: selectedNetwork
          }
        }
      };

      console.log('📋 x402 PaymentRequirements:', {
        maxAmountRequired: paymentRequirements.maxAmountRequired,
        scheme: paymentRequirements.scheme,
        asset: paymentRequirements.asset,
        payTo: paymentRequirements.payTo
      });

      // Step 3: Create and sign PaymentPayload
      const currentTime = Math.floor(Date.now() / 1000);
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const planInstanceId = `x402_sub_${plan.id}_${Date.now()}`;

      // Ensure proper checksum addresses
      const fromAddress = ethers.getAddress(walletData.address);
      const toAddress = ethers.getAddress(checksumMerchantAddress);
      const contractAddress = ethers.getAddress(checksumJpycAddress);

      console.log('🔍 Address verification:', {
        from: fromAddress,
        to: toAddress,
        contract: contractAddress,
        chainId,
        nonce
      });

      const authorization = {
        from: fromAddress,
        to: toAddress,
        value: updatedPlan.jpycAmount, // Use JPYC amount (not wei) for wallet request
        validAfter: (currentTime - 60).toString(),
        validBefore: (currentTime + 600).toString(),
        nonce: nonce
      };

      console.log('🔐 EIP-712 Authorization:', {
        from: authorization.from,
        to: authorization.to,
        value: authorization.value,
        jpycAmount: updatedPlan.jpycAmount,
        amountWei: updatedPlan.amount,
        calculation: `Wallet request: ${updatedPlan.jpycAmount} JPYC (wei conversion happens during transfer)`,
        nonce: authorization.nonce
      });

      // EIP-712 signature for subscription
      const domain = {
        name: "JPY Coin",
        version: "2",
        chainId: chainId,
        verifyingContract: contractAddress
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" }
        ]
      };

      const subscriptionMessage = authorization;

      let signature = '';
      try {
        signature = await walletData.signer.signTypedData(domain, types, subscriptionMessage);
        console.log('🔐 EIP-712 X402準拠署名完了');
      } catch (e: any) {
        console.error('❌ EIP-712署名に失敗:', e);
        console.error('Error details:', {
          message: e.message,
          code: e.code,
          data: e.data
        });
        throw new Error(`EIP-712署名に失敗しました: ${e.message || 'Unknown error'}`);
      }

      const paymentPayload = {
        x402Version: 1,
        scheme: "exact",
        network: selectedNetwork,
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
      console.log(`⛓️ ブロックチェーン決済実行 - Contract: ${JPYC_CONTRACTS[selectedContract].name}`);
      // Use updatedPlan.jpycAmount (string) for transfer
      const receipt = await transferJPYC(walletData.signer, merchantAddress, updatedPlan.jpycAmount, selectedContract);
      console.log('💳 Payment completed:', receipt.hash);

      // Step 5: Save subscription
      const startDate = Date.now();
      const endDate = startDate + (updatedPlan.duration * 24 * 60 * 60 * 1000);
      
      const subscription: UserSubscription = {
        planId: updatedPlan.id,
        subscriberAddress: walletData.address,
        merchantName: updatedPlan.merchantName,
        merchantId: updatedPlan.merchantId,
        amount: updatedPlan.amount,
        interval: updatedPlan.interval,
        description: updatedPlan.description,
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
        `• プラン: ${updatedPlan.name}\n` +
        `• 金額: ${updatedPlan.jpycAmount} JPYC\n` +
        `• 期間: ${getIntervalDisplay(updatedPlan.interval)} (${updatedPlan.duration}日)\n` +
        `• 店舗: ${updatedPlan.merchantName}\n\n` +
        `🌐 Network: ${getNetworkDisplayName(selectedNetwork)} (Chain ID: ${chainId})\n` +
        `💰 Contract: ${JPYC_CONTRACTS[selectedContract].name}\n` +
        `📍 Contract Address: ${contractAddress}\n` +
        `🏪 Merchant Address: ${toAddress}\n` +
        `� From Address: ${fromAddress}\n` +
        `�🔐 x402 Protocol:\n` +
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
        setError(`サブスクリプション決済に失敗しました (${JPYC_CONTRACTS[selectedContract].name}): ${errorMessage}`);
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
          {/* Network and Contract Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">🌐 ネットワーク & コントラクト選択</h2>
            
            {/* Network Selection */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                ネットワーク選択
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                {Object.entries(NETWORK_CONFIG).map(([networkKey, config]) => {
                  const isSelected = selectedNetwork === networkKey;
                  
                  return (
                    <button
                      key={networkKey}
                      onClick={() => setSelectedNetwork(networkKey as SupportedNetwork)}
                      style={{
                        padding: '12px',
                        border: '2px solid',
                        borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        color: isSelected ? '#1d4ed8' : '#374151',
                        marginBottom: '2px'
                      }}>
                        {config.name} {isSelected && '✓'}
                      </div>
                      <div style={{ 
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        Chain ID: {config.chainId}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contract Selection */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                JPYCコントラクト選択
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                {getJPYCContractsForNetwork(selectedNetwork).map((contractKey) => {
                  const contract = JPYC_CONTRACTS[contractKey];
                  const isSelected = selectedContract === contractKey;
                  
                  return (
                    <button
                      key={contractKey}
                      onClick={() => setSelectedContract(contractKey)}
                      style={{
                        padding: '16px',
                        border: '2px solid',
                        borderColor: isSelected ? '#10b981' : '#e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#d1fae5' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        color: isSelected ? '#065f46' : '#374151',
                        marginBottom: '4px'
                      }}>
                        {contract.name} {isSelected && '✓'}
                      </div>
                      <div style={{ 
                        fontSize: '12px',
                        color: '#6b7280',
                        marginBottom: '4px'
                      }}>
                        {contract.description}
                      </div>
                      <div style={{ 
                        fontSize: '11px',
                        color: '#9ca3af',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}>
                        {contract.address}
                      </div>
                      <div style={{ 
                        fontSize: '11px',
                        color: contract.isTestnet ? '#dc2626' : '#059669',
                        fontWeight: '500',
                        marginTop: '4px'
                      }}>
                        {contract.isTestnet ? '🧪 テストネット' : '🟢 メインネット'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Current Selection Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '8px' }}>
                <strong>🌐 選択中ネットワーク:</strong> {getNetworkDisplayName(selectedNetwork)} (Chain ID: {getChainIdForNetwork(selectedNetwork)})
              </div>
              <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '4px' }}>
                <strong>💰 選択中コントラクト:</strong> {JPYC_CONTRACTS[selectedContract].name}
              </div>
              <div style={{ fontSize: '12px', color: '#3730a3', fontFamily: 'monospace' }}>
                JPYCアドレス: {getJPYCAddressForContract(selectedContract)}
              </div>
            </div>
          </div>

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
                <li><strong>実際のJPYC決済:</strong> 選択したテストネットでJPYCトークンを使用した実際の決済</li>
                <li><strong>マルチネットワーク対応:</strong> 複数のテストネットでの決済テスト</li>
                <li><strong>複数JPYCコントラクト対応:</strong> ネットワーク毎に複数のJPYCアドレスから選択可能</li>
                <li><strong>X402プロトコル準拠:</strong> EIP-3009 transferWithAuthorization を使用した正しい実装</li>
                <li><strong>ウォレット接続:</strong> Ambire Walletでの接続とメタマスク対応</li>
                <li><strong>残高チェック:</strong> 決済前にJPYC残高の確認</li>
                <li><strong>サブスクリプション管理:</strong> アクティブな契約の表示と期間管理</li>
                <li><strong>データ保存:</strong> ユーザーとマーチャント両方のローカルストレージに保存</li>
              </ul>
              
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                <strong>🌐 利用可能なJPYCコントラクト:</strong>
                <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' }}>
                  {Object.entries(JPYC_CONTRACTS).map(([contractKey, contract]) => (
                    <div key={contractKey} style={{ fontSize: '12px', padding: '4px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: '600', color: contract.isTestnet ? '#dc2626' : '#059669' }}>
                        {contract.isTestnet ? '🧪' : '�'} {contract.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {getNetworkDisplayName(contract.network as SupportedNetwork)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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