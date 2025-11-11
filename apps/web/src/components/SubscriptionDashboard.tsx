import React, { useState, useEffect } from 'react';
import { getUserSubscriptions, type UserSubscription } from '../lib/subscription';

interface SubscriptionDashboardProps {
  currentAddress?: string;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  currentAddress,
}) => {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    if (currentAddress) {
      const userSubs = getUserSubscriptions(currentAddress);
      // 型変換してUserSubscription形式に合わせる
      const formattedSubs = userSubs.map(sub => ({
        ...sub,
        merchantName: sub.merchantName || 'Unknown Store',
        merchantId: sub.merchantId || 'UNKNOWN',
        amount: sub.amount || '0',
        interval: (sub.interval || 'monthly') as 'daily' | 'weekly' | 'monthly',
        description: sub.description || 'No description',
        nextPaymentDate: sub.nextPaymentDate || new Date(sub.endDate).toISOString().split('T')[0]
      })) as UserSubscription[];
      setSubscriptions(formattedSubs);
    } else {
      setSubscriptions([]);
    }
  }, [currentAddress]);

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

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = {
      daily: '毎日',
      weekly: '毎週',
      monthly: '毎月'
    };
    return labels[interval] || interval;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' };
      case 'paused': return { bg: '#fffbeb', border: '#fed7aa', text: '#ca8a04' };
      case 'cancelled': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
      default: return { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280' };
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'アクティブ',
      paused: '一時停止',
      cancelled: 'キャンセル済み'
    };
    return labels[status] || status;
  };

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const inactiveSubscriptions = subscriptions.filter(sub => sub.status !== 'active');

  const totalMonthlyAmount = activeSubscriptions
    .filter(sub => sub.interval === 'monthly')
    .reduce((sum, sub) => sum + parseFloat(sub.amount || '0'), 0);

  const totalDailyAmount = activeSubscriptions
    .filter(sub => sub.interval === 'daily')
    .reduce((sum, sub) => sum + parseFloat(sub.amount || '0'), 0) * 30;

  const totalWeeklyAmount = activeSubscriptions
    .filter(sub => sub.interval === 'weekly')
    .reduce((sum, sub) => sum + parseFloat(sub.amount || '0'), 0) * 4.3;

  const estimatedMonthlyTotal = totalMonthlyAmount + totalDailyAmount + totalWeeklyAmount;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {!currentAddress ? (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '40px', 
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          border: '1px solid #e5e7eb' 
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔗</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#374151' }}>ウォレット接続が必要です</h3>
          <p style={{ color: '#6b7280', margin: 0 }}>サブスクリプション管理にはウォレットの接続が必要です</p>
        </div>
      ) : (
        <>
          {/* 統計ダッシュボード */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '24px', fontWeight: 'bold' }}>
              📊 サブスクリプション ダッシュボード
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '5px' }}>
                  {activeSubscriptions.length}
                </div>
                <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '500' }}>アクティブ契約</div>
              </div>
              
              <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#15803d', marginBottom: '5px' }}>
                  {Math.round(estimatedMonthlyTotal).toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', color: '#166534', fontWeight: '500' }}>月間予想金額（JPYC）</div>
              </div>
              
              <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d97706', marginBottom: '5px' }}>
                  {subscriptions.length}
                </div>
                <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>契約履歴合計</div>
              </div>

              <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0369a1', marginBottom: '5px' }}>
                  {activeSubscriptions.filter(sub => getDaysRemaining(sub.endDate) <= 7).length}
                </div>
                <div style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: '500' }}>近日期限切れ</div>
              </div>
            </div>
          </div>

          {/* タブナビゲーション */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
            <div style={{ borderBottom: '1px solid #e5e7eb' }}>
              <nav style={{ display: 'flex', gap: '40px', paddingLeft: '25px' }}>
                {[
                  { id: 'active', label: 'アクティブ契約', icon: '✅', count: activeSubscriptions.length },
                  { id: 'history', label: '契約履歴', icon: '📋', count: inactiveSubscriptions.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: '20px 10px',
                      border: 'none',
                      borderBottom: `3px solid ${activeTab === tab.id ? '#3b82f6' : 'transparent'}`,
                      backgroundColor: 'transparent',
                      fontWeight: '600',
                      fontSize: '15px',
                      color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span style={{
                        backgroundColor: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div style={{ padding: '25px' }}>
              {/* アクティブ契約タブ */}
              {activeTab === 'active' && (
                <div>
                  {activeSubscriptions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      <div style={{ fontSize: '64px', marginBottom: '20px', opacity: '0.5' }}>📱</div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#6b7280', fontWeight: '500' }}>アクティブな契約がありません</h3>
                      <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                        サブスクリプション契約画面から新しい契約を作成してください
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeSubscriptions.map((subscription, index) => {
                        const statusColor = getStatusColor(subscription.status);
                        const daysRemaining = getDaysRemaining(subscription.endDate);
                        
                        return (
                          <div
                            key={index}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              padding: '20px',
                              backgroundColor: '#fafafa',
                              transition: 'all 0.2s',
                              borderLeft: `4px solid ${statusColor.border}`
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px' }}>
                                  <span style={{ fontSize: '24px' }}>🏪</span>
                                  <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontWeight: '700', color: '#1f2937', fontSize: '18px' }}>
                                      {subscription.merchantName}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                      ID: {subscription.merchantId}
                                    </p>
                                    {subscription.description && (
                                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                        {subscription.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginTop: '15px' }}>
                                  <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>支払い額</p>
                                    <p style={{ margin: '0 0 4px 0', fontWeight: '700', color: '#1f2937', fontSize: '16px' }}>
                                      {subscription.amount} JPYC
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                                      {getIntervalLabel(subscription.interval!)}
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>契約期間</p>
                                    <p style={{ margin: '0 0 4px 0', fontWeight: '700', color: '#1f2937', fontSize: '16px' }}>
                                      {formatDate(subscription.startDate)}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                                      〜 {formatDate(subscription.endDate)}
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>残り期間</p>
                                    <p style={{ 
                                      margin: '0 0 4px 0', 
                                      fontWeight: '700', 
                                      fontSize: '16px',
                                      color: daysRemaining <= 7 ? '#dc2626' : daysRemaining <= 14 ? '#f59e0b' : '#15803d'
                                    }}>
                                      {daysRemaining}日
                                    </p>
                                    {daysRemaining <= 7 && (
                                      <p style={{ margin: 0, fontSize: '12px', color: '#dc2626' }}>
                                        ⚠️ 期限が近づいています
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>トランザクション</p>
                                    <p style={{ margin: '0 0 4px 0', fontWeight: '500', color: '#3b82f6', fontSize: '12px', fontFamily: 'monospace' }}>
                                      {subscription.txHash.slice(0, 8)}...{subscription.txHash.slice(-6)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '15px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  borderRadius: '8px',
                                  border: `1px solid ${statusColor.border}`,
                                  color: statusColor.text,
                                  backgroundColor: statusColor.bg
                                }}>
                                  {getStatusLabel(subscription.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 契約履歴タブ */}
              {activeTab === 'history' && (
                <div>
                  {subscriptions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      <div style={{ fontSize: '64px', marginBottom: '20px', opacity: '0.5' }}>📋</div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#6b7280', fontWeight: '500' }}>契約履歴がありません</h3>
                      <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                        まだサブスクリプション契約を行っていません
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {subscriptions.slice().reverse().map((subscription, index) => {
                        const statusColor = getStatusColor(subscription.status);
                        
                        return (
                          <div
                            key={index}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '15px',
                              backgroundColor: '#f9fafb',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '18px' }}>🏪</span>
                                <div>
                                  <h4 style={{ margin: '0', fontWeight: '600', fontSize: '16px' }}>
                                    {subscription.merchantName}
                                  </h4>
                                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                    {subscription.amount} JPYC • {getIntervalLabel(subscription.interval!)}
                                  </p>
                                </div>
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                {formatDate(subscription.startDate)} 〜 {formatDate(subscription.endDate)}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                border: `1px solid ${statusColor.border}`,
                                color: statusColor.text,
                                backgroundColor: statusColor.bg
                              }}>
                                {getStatusLabel(subscription.status)}
                              </span>
                              
                              <button style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}>
                                詳細
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionDashboard;