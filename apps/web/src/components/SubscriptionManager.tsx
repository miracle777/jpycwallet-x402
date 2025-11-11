import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, Clock, AlertCircle, CheckCircle, XCircle, Eye, Settings, DollarSign, Building, User } from 'lucide-react';
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

// サブスクリプション情報の型定義
interface SubscriptionInfo {
  id: string;
  merchantName: string;
  merchantId: string;
  merchantDescription?: string;
  amount: string;
  interval: 'monthly' | 'weekly' | 'daily';
  status: 'active' | 'paused' | 'cancelled';
  nextPaymentDate: string;
  createdDate: string;
  lastPaymentDate?: string;
  failedPayments: number;
  totalPayments: number;
  recipientAddress: string;
}

// 支払い履歴の型定義
interface PaymentHistory {
  id: string;
  subscriptionId: string;
  amount: string;
  date: string;
  status: 'completed' | 'failed' | 'pending';
  transactionHash?: string;
  failureReason?: string;
}

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
  const [activeTab, setActiveTab] = useState<'plans' | 'manage' | 'history'>('plans');

  // モック データ（実際の実装では外部から取得）
  const mockSubscriptions: SubscriptionInfo[] = [
    {
      id: 'sub_001',
      merchantName: 'Netflix Japan',
      merchantId: 'NETFLIX_JP',
      merchantDescription: '動画配信サービス',
      amount: '1580',
      interval: 'monthly',
      status: 'active',
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
      interval: 'monthly',
      status: 'active',
      nextPaymentDate: '2024-01-20',
      createdDate: '2023-11-20',
      lastPaymentDate: '2023-12-20',
      failedPayments: 1,
      totalPayments: 2,
      recipientAddress: '0x2345678901234567890123456789012345678901'
    },
    {
      id: 'sub_003',
      merchantName: 'Daily Coffee',
      merchantId: 'DAILY_COFFEE',
      merchantDescription: '毎日のコーヒー代',
      amount: '500',
      interval: 'daily',
      status: 'paused',
      nextPaymentDate: '2024-01-12',
      createdDate: '2023-12-01',
      lastPaymentDate: '2023-12-10',
      failedPayments: 2,
      totalPayments: 10,
      recipientAddress: '0x3456789012345678901234567890123456789012'
    }
  ];

  const mockPaymentHistory: PaymentHistory[] = [
    {
      id: 'pay_001',
      subscriptionId: 'sub_001',
      amount: '1580',
      date: '2023-12-15',
      status: 'completed',
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    },
    {
      id: 'pay_002',
      subscriptionId: 'sub_002',
      amount: '980',
      date: '2023-12-20',
      status: 'completed',
      transactionHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890a'
    },
    {
      id: 'pay_003',
      subscriptionId: 'sub_002',
      amount: '980',
      date: '2023-11-20',
      status: 'failed',
      failureReason: '残高不足'
    },
    {
      id: 'pay_004',
      subscriptionId: 'sub_003',
      amount: '500',
      date: '2023-12-10',
      status: 'completed',
      transactionHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
    }
  ];

  // ステータス表示コンポーネント
  const StatusBadge: React.FC<{ status: SubscriptionInfo['status'] }> = ({ status }) => {
    const config = {
      active: { 
        color: 'text-green-700 bg-green-100 border-green-200',
        label: 'アクティブ'
      },
      paused: { 
        color: 'text-yellow-700 bg-yellow-100 border-yellow-200',
        label: '一時停止'
      },
      cancelled: { 
        color: 'text-red-700 bg-red-100 border-red-200',
        label: 'キャンセル済み'
      }
    };

    const { color, label } = config[status];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${color}`}>
        {label}
      </span>
    );
  };

  // 支払い間隔の日本語表示
  const getIntervalLabel = (interval: SubscriptionInfo['interval']) => {
    const labels = {
      daily: '毎日',
      weekly: '毎週',
      monthly: '毎月'
    };
    return labels[interval];
  };

  // 次回支払い日までの日数計算
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

  const getActivePlan = () => {
    if (!activeSubscription) return null;
    return subscriptionPlans.find(plan => plan.id === activeSubscription.planId);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー統計 */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-600" />
          サブスクリプション管理
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{mockSubscriptions.filter(sub => sub.status === 'active').length}</div>
            <div className="text-sm text-blue-700">アクティブ契約</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {mockSubscriptions.filter(sub => sub.status === 'active' && sub.interval === 'monthly')
                .reduce((sum, sub) => sum + parseFloat(sub.amount), 0).toLocaleString()}
            </div>
            <div className="text-sm text-green-700">月額合計（JPYC）</div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {mockSubscriptions.reduce((sum, sub) => sum + sub.failedPayments, 0)}
            </div>
            <div className="text-sm text-red-700">支払い失敗回数</div>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'plans', label: '新規プラン', icon: 'CreditCard' },
              { id: 'manage', label: '契約管理', icon: 'Settings' },
              { id: 'history', label: '支払い履歴', icon: 'Calendar' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* 新規プラン選択タブ */}
          {activeTab === 'plans' && (
            <div>
              {/* エラー・成功メッセージ */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">エラー</span>
                  </div>
                  <div className="text-sm text-red-600 mt-1 whitespace-pre-line">
                    {error}
                  </div>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">成功</span>
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    {success}
                  </div>
                </div>
              )}

              {/* 現在のプラン状況 */}
              <div className={`border-2 rounded-xl p-4 mb-6 ${
                activeSubscription 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                {activeSubscription ? (
                  <div>
                    <h4 className="text-green-700 font-medium mb-3">
                      ✅ アクティブなサブスクリプション
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div><strong>プラン:</strong> {getActivePlan()?.name}</div>
                        <div><strong>開始日:</strong> {formatDate(activeSubscription.startDate)}</div>
                        <div><strong>終了日:</strong> {formatDate(activeSubscription.endDate)}</div>
                      </div>
                      <div>
                        <div><strong>残り:</strong> {getDaysRemaining(activeSubscription.endDate)}日</div>
                        <div><strong>ステータス:</strong> {activeSubscription.status}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          TxHash: {activeSubscription.txHash.slice(0, 10)}...
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-gray-700 font-medium mb-2">
                      ℹ️ 現在アクティブなサブスクリプションはありません
                    </h4>
                    <p className="text-gray-600">
                      下記のプランから選択して登録してください。
                    </p>
                  </div>
                )}
              </div>

              {/* プラン一覧 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptionPlans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className={`border-2 rounded-xl p-6 relative transition-all ${
                      plan.popular ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-2 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        🌟 人気プラン
                      </div>
                    )}
                    
                    <h4 className="text-xl font-semibold mb-2">{plan.name}</h4>
                    
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.price} JPYC
                      <span className="text-sm font-normal text-gray-500">
                        /{plan.duration}日
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        activeSubscription?.planId === plan.id || !currentAddress || loading
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">アクティブなサブスクリプション</h3>
              
              {mockSubscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">サブスクリプション契約がありません</p>
                  <p className="text-sm text-gray-400">QRコードをスキャンして定期支払いを設定してください</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mockSubscriptions.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Building className="h-5 w-5 text-gray-600" />
                            <div>
                              <h4 className="font-semibold text-gray-900">{subscription.merchantName}</h4>
                              <p className="text-xs text-gray-500">ID: {subscription.merchantId}</p>
                              {subscription.merchantDescription && (
                                <p className="text-sm text-gray-600">{subscription.merchantDescription}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-sm text-gray-600">支払い額</p>
                              <p className="font-semibold text-gray-900">{subscription.amount} JPYC</p>
                              <p className="text-xs text-gray-500">{getIntervalLabel(subscription.interval)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">次回支払い</p>
                              <p className="font-semibold text-gray-900">{subscription.nextPaymentDate}</p>
                              <p className="text-xs text-gray-500">{getDaysUntilNextPayment(subscription.nextPaymentDate)}</p>
                            </div>
                          </div>

                          {subscription.failedPayments > 0 && (
                            <div className="mt-3 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-600">
                                {subscription.failedPayments}回の支払い失敗
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-3">
                          <StatusBadge status={subscription.status} />
                          
                          <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded hover:bg-blue-200">
                              詳細
                            </button>
                          </div>
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">支払い履歴</h3>
              
              {/* 既存の履歴表示 + 新しい拡張履歴 */}
              <div className="space-y-3">
                {mockPaymentHistory.map((payment) => {
                  const subscription = mockSubscriptions.find(sub => sub.id === payment.subscriptionId);
                  return (
                    <div
                      key={payment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="h-5 w-5 text-gray-600" />
                            <div>
                              <h4 className="font-semibold text-gray-900">{subscription?.merchantName || 'Unknown Merchant'}</h4>
                              <p className="text-sm text-gray-600">{payment.amount} JPYC</p>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            <p>日付: {payment.date}</p>
                            {payment.transactionHash && (
                              <p className="font-mono text-xs">
                                TX: {payment.transactionHash.slice(0, 10)}...{payment.transactionHash.slice(-8)}
                              </p>
                            )}
                            {payment.failureReason && (
                              <p className="text-red-600">失敗理由: {payment.failureReason}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${
                            payment.status === 'completed' ? 'text-green-700 bg-green-100' :
                            payment.status === 'failed' ? 'text-red-700 bg-red-100' :
                            'text-yellow-700 bg-yellow-100'
                          }`}>
                            {payment.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                            {payment.status === 'failed' && <XCircle className="h-3 w-3" />}
                            {payment.status === 'pending' && <Clock className="h-3 w-3" />}
                            {payment.status === 'completed' ? '完了' : 
                             payment.status === 'failed' ? '失敗' : '処理中'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 既存履歴も表示 */}
                {currentAddress && subscriptionHistory.length > 0 && (
                  <>
                    <h4 className="text-md font-semibold text-gray-700 mt-6 mb-3">📊 レガシー履歴</h4>
                    {subscriptionHistory.slice().reverse().map((sub, index) => {
                      const plan = subscriptionPlans.find(p => p.id === sub.planId);
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <strong>{plan?.name}</strong> - {plan?.price} JPYC
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs ${
                              sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {sub.status}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(sub.startDate)} 〜 {formatDate(sub.endDate)}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;