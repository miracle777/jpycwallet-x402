import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string; // JPY
  duration: number; // days
  description: string;
  features: string[];
}

interface UserSubscription {
  planId: string;
  startDate: number; // timestamp
  endDate: number; // timestamp
  txHash: string;
}

interface X402SubscriptionShopProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string) => void;
}

const X402SubscriptionShop: React.FC<X402SubscriptionShopProps> = ({
  currentAddress,
  signer,
  onPaymentComplete
}) => {
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([
    {
      id: 'basic',
      name: 'ベーシックプラン',
      price: '100',
      duration: 30,
      description: 'スタンダードな機能をご利用いただけます',
      features: ['基本機能', '月間100回まで利用', 'メールサポート']
    },
    {
      id: 'premium',
      name: 'プレミアムプラン', 
      price: '300',
      duration: 30,
      description: 'より多くの機能と優先サポート',
      features: ['全機能利用可能', '無制限利用', '優先サポート', 'API アクセス']
    },
    {
      id: 'yearly',
      name: '年間プラン',
      price: '1000',
      duration: 365,
      description: 'お得な年間契約プラン',
      features: ['全機能利用可能', '無制限利用', '優先サポート', 'API アクセス', '年間割引']
    }
  ]);

  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState<string>(''); // どのプランがローディング中か
  const [error, setError] = useState<string>('');

  // ユーザーのサブスクリプション状態を確認
  useEffect(() => {
    if (currentAddress) {
      loadUserSubscriptions();
      loadAvailablePlans();
    }
  }, [currentAddress]);

  const loadAvailablePlans = () => {
    try {
      const saved = localStorage.getItem('merchant_subscription_plans');
      if (saved) {
        const plans = JSON.parse(saved);
        // Helper function to safely convert amount to JPYC
        const convertAmountToJPYC = (amountStr: string): number => {
          const amount = parseFloat(amountStr);
          if (isNaN(amount)) return 0;
          
          // If amount is very large (like 10^18), it's likely in 18-decimal wei format
          if (amount > 1000000000000) {
            return amount / 1e18; // 18 decimal places
          }
          // If amount is medium size (like 10^6), it's likely in 6-decimal format  
          else if (amount > 1000000) {
            return amount / 1e6; // 6 decimal places
          }
          // If amount is small, it's likely already in JPYC format
          else {
            return amount;
          }
        };

        // Convert stored plans to component format
        const convertedPlans = plans.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          price: convertAmountToJPYC(plan.amount).toFixed(0), // Convert to JPYC safely
          duration: plan.duration,
          description: plan.description,
          features: plan.features || []
        }));
        setSubscriptionPlans(convertedPlans);
      }
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  };

  const loadUserSubscriptions = () => {
    // ローカルストレージから既存のサブスクリプション情報を読み込み
    try {
      const saved = localStorage.getItem(`subscriptions_${currentAddress}`);
      if (saved) {
        const subs = JSON.parse(saved);
        setUserSubscriptions(subs);
      }
    } catch (e) {
      console.error('Failed to load subscriptions:', e);
    }
  };

  const saveUserSubscription = (subscription: UserSubscription) => {
    try {
      const updated = [...userSubscriptions, subscription];
      setUserSubscriptions(updated);
      localStorage.setItem(`subscriptions_${currentAddress}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save subscription:', e);
    }
  };

  // 特定プランのアクティブなサブスクリプションを確認
  const getActiveSubscription = (planId: string): UserSubscription | null => {
    const now = Date.now();
    return userSubscriptions.find(sub => 
      sub.planId === planId && sub.endDate > now
    ) || null;
  };

  // 残り日数を計算
  const getRemainingDays = (subscription: UserSubscription): number => {
    const now = Date.now();
    const remaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  };

  // サブスクリプション購入処理
  const purchaseSubscription = async (plan: SubscriptionPlan) => {
    if (!signer || !currentAddress) {
      setError('ウォレット接続が必要です');
      return;
    }

    setLoading(plan.id);
    setError('');

    try {
      // モックトランザクション（実際のx402プロトコルに置き換え）
      console.log(`🚀 ${plan.name} の購入を開始`);
      
      // 実際のトランザクションをシミュレート
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // モックトランザクションハッシュ
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 8)}...mock`;
      
      // サブスクリプション情報を保存
      const startDate = Date.now();
      const endDate = startDate + (plan.duration * 24 * 60 * 60 * 1000);
      
      const subscription: UserSubscription = {
        planId: plan.id,
        startDate,
        endDate,
        txHash: mockTxHash
      };
      
      saveUserSubscription(subscription);
      
      // コールバック実行
      onPaymentComplete?.(mockTxHash);
      
      console.log(`✅ ${plan.name} の購入が完了しました`);
      
    } catch (error: any) {
      console.error('Purchase failed:', error);
      setError(`購入に失敗しました: ${error.message}`);
    } finally {
      setLoading('');
    }
  };

  // プランカードのレンダリング
  const renderPlanCard = (plan: SubscriptionPlan) => {
    const activeSubscription = getActiveSubscription(plan.id);
    const isActive = !!activeSubscription;
    const remainingDays = isActive ? getRemainingDays(activeSubscription!) : 0;
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
        {/* アクティブバッジ */}
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
            購入中
          </div>
        )}

        {/* プラン名と価格 */}
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
            ¥{plan.price}
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
            margin: '0',
            lineHeight: '1.5'
          }}>
            {plan.description}
          </p>
        </div>

        {/* 機能リスト */}
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

        {/* アクティブサブスクの残り日数表示 */}
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
              期限: {new Date(activeSubscription!.endDate).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* 購入ボタン */}
        <button
          onClick={() => purchaseSubscription(plan)}
          disabled={isLoading || !currentAddress}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isLoading || !currentAddress ? '#9ca3af' : 
                           isActive ? '#059669' : '#dc2626',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading || !currentAddress ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isLoading ? (
            '⏳ 処理中...'
          ) : !currentAddress ? (
            '🔗 ウォレット接続が必要です'
          ) : isActive ? (
            `✅ 購入中 (残り${remainingDays}日)`
          ) : (
            `💳 ${plan.name}を購入`
          )}
        </button>
      </div>
    );
  };

  return (
    <div>
      <div style={{
        marginBottom: '24px',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          🔄 X402 サブスクリプション申し込み
        </h2>
        <p style={{ 
          fontSize: '16px',
          color: '#6b7280',
          margin: 0,
          lineHeight: '1.5'
        }}>
          お好みのプランを選択してサブスクリプションを開始してください
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ color: '#dc2626', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* プランカード */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {subscriptionPlans.map(renderPlanCard)}
      </div>

      {/* 使用方法の説明 */}
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #0ea5e9',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <div style={{ 
          fontSize: '16px',
          fontWeight: '600',
          color: '#0c4a6e',
          marginBottom: '8px'
        }}>
          💡 X402 サブスクリプション決済について
        </div>
        <ul style={{
          fontSize: '14px',
          color: '#0c4a6e',
          lineHeight: '1.6',
          margin: 0,
          paddingLeft: '20px'
        }}>
          <li>各プランは期間限定のサブスクリプションです</li>
          <li>購入中は「購入中」状態となり、残り日数が表示されます</li>
          <li>期間終了後は自動的に再購入が可能になります</li>
          <li>現在はテスト実装のため、実際の決済は行われません</li>
        </ul>
      </div>
    </div>
  );
};

export default X402SubscriptionShop;