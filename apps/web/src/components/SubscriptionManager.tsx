import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { transferJPYC, checkSufficientBalance } from '../lib/jpyc';
import { merchantAddress } from '../lib/products';
import { NETWORK_INFO } from '../lib/wallet-utils';
import { 
  subscriptionPlans, 
  getUserSubscriptions, 
  saveUserSubscription, 
  getActiveSubscription,
  type UserSubscription 
} from '../lib/subscription';
import type { SubscriptionPlan } from '../lib/types';

interface SubscriptionManagerProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string, amount: number) => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
}) => {
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // ユーザーのサブスクリプション情報を読み込み
  useEffect(() => {
    if (currentAddress) {
      const active = getActiveSubscription(currentAddress);
      const history = getUserSubscriptions(currentAddress);
      setActiveSubscription(active);
      setSubscriptionHistory(history);
    } else {
      setActiveSubscription(null);
      setSubscriptionHistory([]);
    }
  }, [currentAddress]);

  const subscribe = async (plan: SubscriptionPlan) => {
    if (!signer || !currentAddress) {
      setError('ウォレット接続が必要です');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 残高チェック
      const balanceCheck = await checkSufficientBalance(signer, plan.price.toString());
      if (!balanceCheck.sufficient) {
        setError(
          `JPYC残高が不足しています。\n` +
          `必要金額: ${balanceCheck.required} JPYC\n` +
          `現在残高: ${balanceCheck.currentBalance} JPYC\n` +
          `不足分: ${(balanceCheck.required - balanceCheck.currentBalance).toFixed(2)} JPYC\n\n` +
          `💧 テストJPYCの取得方法:\n` +
          `Faucetコントラクトからテスト用JPYCを取得できます。\n` +
          `詳細はウォレット接続後の「テストネットワーク情報」をご確認ください。`
        );
        return;
      }

      // サブスクリプション料金の支払い
      const receipt = await transferJPYC(signer, merchantAddress, plan.price.toString());
      
      // サブスクリプション情報を保存
      const now = Date.now();
      const subscription: UserSubscription = {
        planId: plan.id,
        startDate: now,
        endDate: now + (plan.duration * 24 * 60 * 60 * 1000), // duration日後
        txHash: receipt.hash,
        status: 'active',
      };

      saveUserSubscription(currentAddress, subscription);
      
      // 状態を更新
      setActiveSubscription(subscription);
      setSubscriptionHistory([...subscriptionHistory, subscription]);
      
      setSuccess(`${plan.name}プランに登録しました！ TxHash: ${receipt.hash}`);
      onPaymentComplete?.(receipt.hash, plan.price);
    } catch (e: any) {
      // エラーメッセージを解析して、より分かりやすい表示に
      let errorMessage = e.message || 'Unknown error';
      
      if (errorMessage.includes('JPYC残高が不足しています')) {
        // 既に詳細なエラーメッセージが入っている場合はそのまま使用
        setError(errorMessage);
      } else if (errorMessage.includes('invalid value for Contract target')) {
        setError(
          'JPYCトークンが見つかりません。\n' +
          '1. ウォレットにJPYCトークンを追加してください\n' +
          '2. テストネットの場合は、Faucetからテスト用JPYCを取得してください\n' +
          '3. 正しいネットワークに接続していることを確認してください'
        );
      } else if (errorMessage.includes('user rejected')) {
        setError('ユーザーによって取引がキャンセルされました');
      } else {
        setError(`サブスクリプション登録に失敗しました: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysRemaining = (endDate: number) => {
    const now = Date.now();
    const remaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  };

  const styles = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
    },
    currentPlan: {
      backgroundColor: activeSubscription ? '#d1fae5' : '#f3f4f6',
      border: `2px solid ${activeSubscription ? '#059669' : '#d1d5db'}`,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
    },
    plansGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    planCard: {
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '25px',
      backgroundColor: '#ffffff',
      position: 'relative' as const,
      transition: 'all 0.3s ease',
    },
    popularBadge: {
      position: 'absolute' as const,
      top: '-10px',
      right: '20px',
      backgroundColor: '#f59e0b',
      color: 'white',
      padding: '5px 15px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
    },
    planPrice: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#1f2937',
      marginBottom: '10px',
    },
    featureList: {
      listStyle: 'none',
      padding: 0,
      margin: '20px 0',
    },
    featureItem: {
      padding: '8px 0',
      borderBottom: '1px solid #f3f4f6',
      display: 'flex',
      alignItems: 'center',
    },
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 600,
      transition: 'all 0.2s',
      width: '100%',
    },
    subscribeButton: {
      backgroundColor: '#2563eb',
      color: 'white',
    },
    disabledButton: {
      backgroundColor: '#9ca3af',
      color: 'white',
      cursor: 'not-allowed',
    },
    historySection: {
      marginTop: '40px',
      padding: '20px',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
    },
    historyItem: {
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '8px',
      marginBottom: '10px',
      border: '1px solid #e5e7eb',
    },
    error: {
      color: '#dc2626',
      backgroundColor: '#fee2e2',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
    },
    success: {
      color: '#059669',
      backgroundColor: '#d1fae5',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
    },
  };

  const getActivePlan = () => {
    if (!activeSubscription) return null;
    return subscriptionPlans.find(plan => plan.id === activeSubscription.planId);
  };

  return (
    <div style={styles.container}>
      <h3>📋 サブスクリプション管理</h3>

      {/* エラー・成功メッセージ */}
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* 現在のプラン状況 */}
      <div style={styles.currentPlan}>
        {activeSubscription ? (
          <div>
            <h4 style={{ margin: '0 0 15px 0', color: '#059669' }}>
              ✅ アクティブなサブスクリプション
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div><strong>プラン:</strong> {getActivePlan()?.name}</div>
                <div><strong>開始日:</strong> {formatDate(activeSubscription.startDate)}</div>
                <div><strong>終了日:</strong> {formatDate(activeSubscription.endDate)}</div>
              </div>
              <div>
                <div><strong>残り:</strong> {getDaysRemaining(activeSubscription.endDate)}日</div>
                <div><strong>ステータス:</strong> {activeSubscription.status}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>
                  TxHash: {activeSubscription.txHash.slice(0, 10)}...
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#6b7280' }}>
              ℹ️ 現在アクティブなサブスクリプションはありません
            </h4>
            <p style={{ margin: 0, color: '#6b7280' }}>
              下記のプランから選択して登録してください。
            </p>
          </div>
        )}
      </div>

      {/* プラン一覧 */}
      <div style={styles.plansGrid}>
        {subscriptionPlans.map((plan) => (
          <div 
            key={plan.id} 
            style={{
              ...styles.planCard,
              borderColor: plan.popular ? '#f59e0b' : '#e5e7eb',
            }}
          >
            {plan.popular && (
              <div style={styles.popularBadge}>🌟 人気プラン</div>
            )}
            
            <h4 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>
              {plan.name}
            </h4>
            
            <div style={styles.planPrice}>
              {plan.price} JPYC
              <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280' }}>
                /{plan.duration}日
              </span>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              {plan.description}
            </p>
            
            <ul style={styles.featureList}>
              {plan.features.map((feature, index) => (
                <li key={index} style={styles.featureItem}>
                  <span style={{ marginRight: '10px', color: '#059669' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              style={{
                ...styles.button,
                ...(activeSubscription?.planId === plan.id || !currentAddress || loading
                  ? styles.disabledButton 
                  : styles.subscribeButton
                ),
              }}
              onClick={() => subscribe(plan)}
              disabled={activeSubscription?.planId === plan.id || !currentAddress || loading}
            >
              {loading ? '処理中...' : 
               activeSubscription?.planId === plan.id ? '登録済み' :
               !currentAddress ? 'ウォレット接続が必要' :
               '今すぐ登録'}
            </button>
          </div>
        ))}
      </div>

      {/* サブスクリプション履歴 */}
      {currentAddress && subscriptionHistory.length > 0 && (
        <div style={styles.historySection}>
          <h4 style={{ marginTop: 0 }}>📊 サブスクリプション履歴</h4>
          {subscriptionHistory.slice().reverse().map((sub, index) => {
            const plan = subscriptionPlans.find(p => p.id === sub.planId);
            return (
              <div key={index} style={styles.historyItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{plan?.name}</strong> - {plan?.price} JPYC
                  </div>
                  <div style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px',
                    backgroundColor: sub.status === 'active' ? '#d1fae5' : '#f3f4f6',
                    color: sub.status === 'active' ? '#059669' : '#6b7280'
                  }}>
                    {sub.status}
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                  {formatDate(sub.startDate)} 〜 {formatDate(sub.endDate)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;