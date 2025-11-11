import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { transferJPYC, checkSufficientBalance } from '../lib/jpyc';
import { merchantAddress } from '../lib/products';
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
  onPaymentComplete?: (txHash: string) => void;
}

const SubscriptionManagerSimple: React.FC<SubscriptionManagerProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
}) => {
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'plans' | 'manage' | 'history'>('plans');

  // モック データ（実際の実装では外部から取得）
  const mockSubscriptions = [
    {
      id: 'sub_001',
      merchantName: 'Netflix Japan',
      merchantId: 'NETFLIX_JP',
      merchantDescription: '動画配信サービス',
      amount: '1580',
      interval: 'monthly' as const,
      status: 'active' as const,
      nextPaymentDate: '2024-01-15',
      createdDate: '2023-12-15',
      lastPaymentDate: '2023-12-15',
      failedPayments: 0,
      totalPayments: 1,
      recipientAddress: '0x1234567890123456789012345678901234567890'
    },
    {
      id: 'sub_002',
      merchantName: 'Spotify Premium',
      merchantId: 'SPOTIFY_PREMIUM',
      merchantDescription: '音楽配信サービス',
      amount: '980',
      interval: 'monthly' as const,
      status: 'active' as const,
      nextPaymentDate: '2024-01-20',
      createdDate: '2023-11-20',
      lastPaymentDate: '2023-12-20',
      failedPayments: 1,
      totalPayments: 2,
      recipientAddress: '0x2345678901234567890123456789012345678901'
    }
  ];

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
      onPaymentComplete?.(receipt.hash);
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

  const getActivePlan = () => {
    if (!activeSubscription) return null;
    return subscriptionPlans.find(plan => plan.id === activeSubscription.planId);
  };

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = {
      daily: '毎日',
      weekly: '毎週',
      monthly: '毎月'
    };
    return labels[interval] || interval;
  };

  const getDaysUntilNextPayment = (nextPaymentDate: string) => {
    const today = new Date();
    const nextDate = new Date(nextPaymentDate);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '支払い期限切れ';
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '明日';
    return `${diffDays}日後`;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* ヘッダー統計 */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '20px', fontWeight: 'bold' }}>
          💳 サブスクリプション管理
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8' }}>{mockSubscriptions.filter(sub => sub.status === 'active').length}</div>
            <div style={{ fontSize: '14px', color: '#1e40af' }}>アクティブ契約</div>
          </div>
          
          <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>
              {mockSubscriptions.filter(sub => sub.status === 'active' && sub.interval === 'monthly')
                .reduce((sum, sub) => sum + parseFloat(sub.amount), 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '14px', color: '#166534' }}>月額合計（JPYC）</div>
          </div>
          
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
              {mockSubscriptions.reduce((sum, sub) => sum + sub.failedPayments, 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#991b1b' }}>支払い失敗回数</div>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
          <nav style={{ display: 'flex', gap: '30px', paddingLeft: '20px' }}>
            {[
              { id: 'plans', label: '新規プラン', icon: '💳' },
              { id: 'manage', label: '契約管理', icon: '⚙️' },
              { id: 'history', label: '支払い履歴', icon: '📅' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '15px 5px',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.id ? '#3b82f6' : 'transparent'}`,
                  backgroundColor: 'transparent',
                  fontWeight: '500',
                  fontSize: '14px',
                  color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ padding: '20px' }}>
          {/* 新規プラン選択タブ */}
          {activeTab === 'plans' && (
            <div>
              {/* エラー・成功メッセージ */}
              {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
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
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '8px' }}>
                    <span>✅</span>
                    <span style={{ fontWeight: '500' }}>成功</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#15803d' }}>
                    {success}
                  </div>
                </div>
              )}

              {/* 現在のプラン状況 */}
              <div style={{
                border: `2px solid ${activeSubscription ? '#10b981' : '#e5e7eb'}`,
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                backgroundColor: activeSubscription ? '#f0fdf4' : '#f9fafb'
              }}>
                {activeSubscription ? (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', color: '#059669', fontWeight: '500' }}>
                      ✅ アクティブなサブスクリプション
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <div><strong>プラン:</strong> {getActivePlan()?.name}</div>
                        <div><strong>開始日:</strong> {formatDate(activeSubscription.startDate)}</div>
                        <div><strong>終了日:</strong> {formatDate(activeSubscription.endDate)}</div>
                      </div>
                      <div>
                        <div><strong>残り:</strong> {getDaysRemaining(activeSubscription.endDate)}日</div>
                        <div><strong>ステータス:</strong> {activeSubscription.status}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                          TxHash: {activeSubscription.txHash.slice(0, 10)}...
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontWeight: '500' }}>
                      ℹ️ 現在アクティブなサブスクリプションはありません
                    </h4>
                    <p style={{ margin: 0, color: '#6b7280' }}>
                      下記のプランから選択して登録してください。
                    </p>
                  </div>
                )}
              </div>

              {/* プラン一覧 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {subscriptionPlans.map((plan) => (
                  <div 
                    key={plan.id} 
                    style={{
                      border: `2px solid ${plan.popular ? '#f59e0b' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      padding: '20px',
                      backgroundColor: plan.popular ? '#fffbeb' : '#ffffff',
                      position: 'relative'
                    }}
                  >
                    {plan.popular && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '15px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        🌟 人気プラン
                      </div>
                    )}
                    
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>{plan.name}</h4>
                    
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                      {plan.price} JPYC
                      <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280' }}>
                        /{plan.duration}日
                      </span>
                    </div>
                    
                    <p style={{ color: '#6b7280', marginBottom: '15px' }}>{plan.description}</p>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                      {plan.features.map((feature, index) => (
                        <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                          <span style={{ color: '#10b981' }}>✓</span>
                          <span style={{ fontSize: '14px' }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: (activeSubscription?.planId === plan.id || !currentAddress || loading) ? 'not-allowed' : 'pointer',
                        backgroundColor: (activeSubscription?.planId === plan.id || !currentAddress || loading) ? '#9ca3af' : '#3b82f6',
                        color: 'white'
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
            </div>
          )}

          {/* 契約管理タブ */}
          {activeTab === 'manage' && (
            <div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>アクティブなサブスクリプション</h3>
              
              {mockSubscriptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>💳</div>
                  <p style={{ color: '#6b7280', marginBottom: '5px' }}>サブスクリプション契約がありません</p>
                  <p style={{ fontSize: '14px', color: '#9ca3af' }}>QRコードをスキャンして定期支払いを設定してください</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {mockSubscriptions.map((subscription) => (
                    <div
                      key={subscription.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '15px',
                        backgroundColor: '#fafafa',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px' }}>🏪</span>
                            <div>
                              <h4 style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#1f2937' }}>{subscription.merchantName}</h4>
                              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>ID: {subscription.merchantId}</p>
                              {subscription.merchantDescription && (
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>{subscription.merchantDescription}</p>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '12px' }}>
                            <div>
                              <p style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#6b7280' }}>支払い額</p>
                              <p style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#1f2937' }}>{subscription.amount} JPYC</p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{getIntervalLabel(subscription.interval)}</p>
                            </div>
                            <div>
                              <p style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#6b7280' }}>次回支払い</p>
                              <p style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#1f2937' }}>{subscription.nextPaymentDate}</p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{getDaysUntilNextPayment(subscription.nextPaymentDate)}</p>
                            </div>
                          </div>

                          {subscription.failedPayments > 0 && (
                            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#dc2626' }}>⚠️</span>
                              <span style={{ fontSize: '14px', color: '#dc2626' }}>
                                {subscription.failedPayments}回の支払い失敗
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '12px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: '500',
                            borderRadius: '6px',
                            border: '1px solid',
                            color: subscription.status === 'active' ? '#15803d' : subscription.status === 'paused' ? '#ca8a04' : '#dc2626',
                            backgroundColor: subscription.status === 'active' ? '#f0fdf4' : subscription.status === 'paused' ? '#fffbeb' : '#fef2f2',
                            borderColor: subscription.status === 'active' ? '#bbf7d0' : subscription.status === 'paused' ? '#fed7aa' : '#fecaca'
                          }}>
                            {subscription.status === 'active' ? 'アクティブ' : 
                             subscription.status === 'paused' ? '一時停止' : 'キャンセル済み'}
                          </span>
                          
                          <button style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            border: '1px solid #93c5fd',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}>
                            詳細
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 支払い履歴タブ */}
          {activeTab === 'history' && (
            <div>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>支払い履歴</h3>
              
              {/* 既存履歴も表示 */}
              {currentAddress && subscriptionHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '500', color: '#374151' }}>📊 過去の契約履歴</h4>
                  {subscriptionHistory.slice().reverse().map((sub, index) => {
                    const plan = subscriptionPlans.find(p => p.id === sub.planId);
                    return (
                      <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '15px', backgroundColor: '#f9fafb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{plan?.name}</strong> - {plan?.price} JPYC
                          </div>
                          <div style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            backgroundColor: sub.status === 'active' ? '#dcfce7' : '#f3f4f6',
                            color: sub.status === 'active' ? '#166534' : '#6b7280'
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
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📅</div>
                  <p style={{ color: '#6b7280' }}>支払い履歴がありません</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagerSimple;