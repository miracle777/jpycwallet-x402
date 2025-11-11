import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

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
  isActive: boolean;
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

interface SubscriptionMerchantDashboardProps {
  currentAddress?: string;
  signer?: ethers.Signer;
}

const SubscriptionMerchantDashboard: React.FC<SubscriptionMerchantDashboardProps> = ({
  currentAddress,
  signer
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'plans' | 'subscribers' | 'analytics'>('plans');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscribers, setSubscribers] = useState<UserSubscription[]>([]);
  
  // Plan form state
  const [isEditing, setIsEditing] = useState<string>(''); // plan id being edited
  const [isCreating, setIsCreating] = useState(false);

  // Helper function to safely convert amount to JPYC
  const convertAmountToJPYC = (amountStr: string): number => {
    // Normalize inputs that may be wei (18-decimals) or already human JPYC
    try {
      if (typeof amountStr === 'string') {
        const trimmed = amountStr.trim();
        // If looks like a large integer (only digits, length >= 13), treat as wei and format
        if (/^\d+$/.test(trimmed) && trimmed.length >= 13) {
          try {
            const formatted = ethers.formatUnits(trimmed, 18); // returns string
            return parseFloat(formatted);
          } catch (e) {
            console.warn('formatUnits failed, falling back to numeric parse', e);
          }
        }
        // otherwise try parse as float human-readable JPYC
        const n = parseFloat(trimmed);
        return isNaN(n) ? 0 : n;
      }
      // Fallback
      const fallback = parseFloat((amountStr as any) || '0');
      return isNaN(fallback) ? 0 : fallback;
    } catch (e) {
      console.error('convertAmountToJPYC error:', e);
      return 0;
    }
  };
  const [planForm, setPlanForm] = useState<Partial<SubscriptionPlan>>({
    name: '',
    jpycAmount: '1',
    interval: 'monthly',
    duration: 30,
    description: '',
    features: [],
    merchantName: 'x402デモストア',
    merchantId: 'DEMO_STORE_001',
    isActive: true
  });
  
  const [featureInput, setFeatureInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load data on mount
  useEffect(() => {
    loadPlans();
    loadSubscribers();
  }, []);

  const loadPlans = () => {
    try {
      const saved = localStorage.getItem('merchant_subscription_plans');
      if (saved) {
        const parsed: SubscriptionPlan[] = JSON.parse(saved);
        // Normalize plans: ensure isActive exists (default true) and ensure amount is string
        const normalized = parsed.map(p => ({
          ...p,
          isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
          amount: typeof (p as any).amount !== 'undefined' ? String((p as any).amount) : (p.amount || '0')
        }));
        setPlans(normalized);
      }
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  };

  const loadSubscribers = () => {
    try {
      // Load all subscribers from different merchant IDs
      const allSubscribers: UserSubscription[] = [];
      
      // For demo, we'll check common merchant IDs
      const merchantIds = ['DEMO_STORE_001', 'X402_STORE_001'];
      
      merchantIds.forEach(merchantId => {
        const saved = localStorage.getItem(`merchant_subscribers_${merchantId}`);
        if (saved) {
          const subs = JSON.parse(saved);
          allSubscribers.push(...subs);
        }
      });
      
      // Also check user subscriptions by scanning localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('user_subscriptions_')) {
          const saved = localStorage.getItem(key);
          if (saved) {
            const userSubs: UserSubscription[] = JSON.parse(saved);
            allSubscribers.push(...userSubs);
          }
        }
      }
      
      // Remove duplicates and sort by date
      const unique = allSubscribers.filter((sub, index, self) => 
        index === self.findIndex(s => s.txHash === sub.txHash)
      );
      
      unique.sort((a, b) => b.startDate - a.startDate);
      setSubscribers(unique);
      
    } catch (e) {
      console.error('Failed to load subscribers:', e);
    }
  };

  const savePlans = (updatedPlans: SubscriptionPlan[]) => {
    try {
      localStorage.setItem('merchant_subscription_plans', JSON.stringify(updatedPlans));
      setPlans(updatedPlans);
    } catch (e) {
      console.error('Failed to save plans:', e);
    }
  };

  // Create or update plan
  const savePlan = () => {
    if (!validatePlanForm()) return;

    // Use 18 decimals for consistency with modern ERC20 tokens
    const jpycAmount = parseFloat(planForm.jpycAmount || '1');
    const weiAmount = (jpycAmount * 1e18).toString(); // 18-decimal wei

    const planData: SubscriptionPlan = {
      ...planForm as SubscriptionPlan,
      id: isEditing || `plan_${Date.now()}`,
      amount: weiAmount, // Convert to 18-decimal wei for consistency
      createdAt: isEditing ? plans.find(p => p.id === isEditing)?.createdAt || Date.now() : Date.now()
    };

    if (isEditing) {
      const updated = plans.map(p => p.id === isEditing ? planData : p);
      savePlans(updated);
      setSuccess('プランが更新されました');
    } else {
      savePlans([...plans, planData]);
      setSuccess('新しいプランが作成されました');
    }

    resetPlanForm();
  };

  const validatePlanForm = (): boolean => {
    if (!planForm.name?.trim()) {
      setError('プラン名を入力してください');
      return false;
    }
    if (!planForm.jpycAmount || parseFloat(planForm.jpycAmount) <= 0) {
      setError('有効な金額を入力してください');
      return false;
    }
    if (!planForm.merchantName?.trim()) {
      setError('店舗名を入力してください');
      return false;
    }
    setError('');
    return true;
  };

  const resetPlanForm = () => {
    setIsEditing('');
    setIsCreating(false);
    setPlanForm({
      name: '',
      jpycAmount: '1',
      interval: 'monthly',
      duration: 30,
      description: '',
      features: [],
      merchantName: 'x402デモストア',
      merchantId: 'DEMO_STORE_001',
      isActive: true
    });
    setFeatureInput('');
  };

  const editPlan = (plan: SubscriptionPlan) => {
    setIsEditing(plan.id);
    setIsCreating(true);
    setPlanForm({
      ...plan,
      jpycAmount: convertAmountToJPYC(plan.amount).toString() // Use safe conversion
    });
  };

  const deletePlan = (planId: string) => {
    if (confirm('このプランを削除しますか？')) {
      const updated = plans.filter(p => p.id !== planId);
      savePlans(updated);
      setSuccess('プランが削除されました');
    }
  };

  const togglePlanStatus = (planId: string) => {
    const updated = plans.map(p => 
      p.id === planId ? { ...p, isActive: !p.isActive } : p
    );
    savePlans(updated);
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setPlanForm({
        ...planForm,
        features: [...(planForm.features || []), featureInput.trim()]
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    const updated = [...(planForm.features || [])];
    updated.splice(index, 1);
    setPlanForm({ ...planForm, features: updated });
  };

  const getIntervalDisplay = (interval: string) => {
    const labels: Record<string, string> = {
      daily: '毎日',
      weekly: '毎週',
      monthly: '毎月'
    };
    return labels[interval] || interval;
  };

  const getStatusDisplay = (subscription: UserSubscription) => {
    const now = Date.now();
    if (subscription.endDate > now && subscription.status === 'active') {
      const remainingDays = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
      return { text: `アクティブ (残り${remainingDays}日)`, color: '#10b981' };
    } else if (subscription.endDate <= now) {
      return { text: '期限切れ', color: '#ef4444' };
    } else {
      return { text: subscription.status, color: '#6b7280' };
    }
  };

  // Analytics
  const analytics = {
    totalPlans: plans.length,
    activePlans: plans.filter(p => p.isActive).length,
    totalSubscribers: subscribers.length,
    activeSubscribers: subscribers.filter(s => s.status === 'active' && s.endDate > Date.now()).length,
    totalRevenue: subscribers.reduce((sum, s) => sum + convertAmountToJPYC(s.amount), 0),
    monthlyRevenue: subscribers
      .filter(s => s.startDate > Date.now() - 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, s) => sum + convertAmountToJPYC(s.amount), 0)
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏪 サブスクリプション管理画面</h1>
        <p className="text-gray-600">プランの作成・編集と購入者の管理</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div style={{ color: '#dc2626', fontSize: '14px' }}>⚠️ {error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div style={{ color: '#065f46', fontSize: '14px' }}>✅ {success}</div>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{analytics.totalPlans}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>総プラン数 ({analytics.activePlans}有効)</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{analytics.totalSubscribers}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>総購入者数 ({analytics.activeSubscribers}アクティブ)</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{analytics.totalRevenue.toFixed(0)}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>総売上 (JPYC)</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{analytics.monthlyRevenue.toFixed(0)}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>30日間売上 (JPYC)</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'plans', label: 'プラン管理', icon: '📋' },
              { id: 'subscribers', label: '購入者一覧', icon: '👥' },
              { id: 'analytics', label: '分析', icon: '📊' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Plans Tab */}
          {activeTab === 'plans' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">サブスクリプションプラン</h2>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  ➕ 新しいプラン作成
                </button>
              </div>

              {/* Plan Creation/Edit Form */}
              {isCreating && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {isEditing ? 'プラン編集' : '新しいプラン作成'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">プラン名</label>
                      <input
                        type="text"
                        value={planForm.name || ''}
                        onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="プレミアムプラン"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">価格 (JPYC)</label>
                      <input
                        type="number"
                        value={planForm.jpycAmount || ''}
                        onChange={(e) => setPlanForm({...planForm, jpycAmount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                        step="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">支払い間隔</label>
                      <select
                        value={planForm.interval || 'monthly'}
                        onChange={(e) => setPlanForm({...planForm, interval: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="daily">毎日</option>
                        <option value="weekly">毎週</option>
                        <option value="monthly">毎月</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">期間 (日)</label>
                      <input
                        type="number"
                        value={planForm.duration || 30}
                        onChange={(e) => setPlanForm({...planForm, duration: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">店舗名</label>
                      <input
                        type="text"
                        value={planForm.merchantName || ''}
                        onChange={(e) => setPlanForm({...planForm, merchantName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">店舗ID</label>
                      <input
                        type="text"
                        value={planForm.merchantId || ''}
                        onChange={(e) => setPlanForm({...planForm, merchantId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                    <textarea
                      value={planForm.description || ''}
                      onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="プランの詳細説明..."
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">機能一覧</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="機能を追加..."
                      />
                      <button
                        onClick={addFeature}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        追加
                      </button>
                    </div>
                    <div className="space-y-1">
                      {(planForm.features || []).map((feature, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
                          <span className="text-sm">{feature}</span>
                          <button
                            onClick={() => removeFeature(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={savePlan}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      {isEditing ? '更新' : '作成'}
                    </button>
                    <button
                      onClick={resetPlanForm}
                      className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              {/* Plans List */}
              <div className="space-y-4">
                {plans.length === 0 ? (
                  <div className="text-center py-12">
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <p style={{ fontSize: '18px', color: '#6b7280' }}>プランがまだありません</p>
                    <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                      上記のボタンから新しいプランを作成してください
                    </p>
                  </div>
                ) : (
                  plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`border rounded-lg p-6 ${plan.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{plan.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {plan.isActive ? 'アクティブ' : '非アクティブ'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">価格:</span>
                              <div className="font-medium">{convertAmountToJPYC(plan.amount).toFixed(0)} JPYC</div>
                            </div>
                            <div>
                              <span className="text-gray-500">間隔:</span>
                              <div className="font-medium">{getIntervalDisplay(plan.interval)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">期間:</span>
                              <div className="font-medium">{plan.duration}日</div>
                            </div>
                            <div>
                              <span className="text-gray-500">作成日:</span>
                              <div className="font-medium">{new Date(plan.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>

                          {plan.description && (
                            <p className="text-gray-600 mt-2">{plan.description}</p>
                          )}

                          {plan.features && plan.features.length > 0 && (
                            <div className="mt-3">
                              <span className="text-gray-500 text-sm">機能:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {plan.features.map((feature, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => editPlan(plan)}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => togglePlanStatus(plan.id)}
                            className={`px-3 py-1 text-sm rounded ${
                              plan.isActive 
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {plan.isActive ? '非アクティブ化' : 'アクティブ化'}
                          </button>
                          <button
                            onClick={() => deletePlan(plan.id)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Subscribers Tab */}
          {activeTab === 'subscribers' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">購入者一覧</h2>

              {subscribers.length === 0 ? (
                <div className="text-center py-12">
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                  <p style={{ fontSize: '18px', color: '#6b7280' }}>購入者がまだいません</p>
                  <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                    テストページでプランを購入してください
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">購入者</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">プラン</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">金額</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">状態</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">購入日</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">終了日</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">取引</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((sub, index) => {
                        const status = getStatusDisplay(sub);
                        return (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                <div className="font-medium">{sub.subscriberAddress.slice(0, 8)}...{sub.subscriberAddress.slice(-6)}</div>
                                <div className="text-gray-500">{sub.merchantName}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                <div className="font-medium">{plans.find(p => p.id === sub.planId)?.name || '不明なプラン'}</div>
                                <div className="text-gray-500">{getIntervalDisplay(sub.interval)}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm font-medium">
                                {convertAmountToJPYC(sub.amount).toFixed(0)} JPYC
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 text-xs font-medium rounded-full" 
                                    style={{ backgroundColor: status.color + '20', color: status.color }}>
                                {status.text}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(sub.startDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(sub.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <a
                                href={`https://sepolia.etherscan.io/tx/${sub.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 font-mono"
                              >
                                {sub.txHash.slice(0, 10)}...
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">分析</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plans Analytics */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">📋 プラン分析</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>総プラン数:</span>
                      <span className="font-medium">{analytics.totalPlans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>アクティブプラン:</span>
                      <span className="font-medium">{analytics.activePlans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>プラン別売上:</span>
                      <span className="text-sm text-gray-500">下記参照</span>
                    </div>
                  </div>

                  {/* Plan Revenue Breakdown */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">プラン別売上</h4>
                    {plans.map(plan => {
                      const planSubs = subscribers.filter(s => s.planId === plan.id);
                      const planRevenue = planSubs.reduce((sum, s) => sum + convertAmountToJPYC(s.amount), 0);
                      return (
                        <div key={plan.id} className="flex justify-between text-sm py-1">
                          <span>{plan.name}:</span>
                          <span className="font-medium">{planRevenue.toFixed(0)} JPYC ({planSubs.length}件)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subscribers Analytics */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">👥 購入者分析</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>総購入者数:</span>
                      <span className="font-medium">{analytics.totalSubscribers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>アクティブ購入者:</span>
                      <span className="font-medium">{analytics.activeSubscribers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>総売上:</span>
                      <span className="font-medium">{analytics.totalRevenue.toFixed(0)} JPYC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>30日間売上:</span>
                      <span className="font-medium">{analytics.monthlyRevenue.toFixed(0)} JPYC</span>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">最近の活動</h4>
                    <div className="space-y-2">
                      {subscribers.slice(0, 3).map((sub, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex justify-between">
                            <span>{sub.subscriberAddress.slice(0, 8)}...</span>
                            <span>{new Date(sub.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="text-gray-500">
                            {plans.find(p => p.id === sub.planId)?.name || '不明'} - {convertAmountToJPYC(sub.amount).toFixed(0)} JPYC
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="text-center">
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.open('/?page=subscription-test', '_blank')}
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            🛒 テストページで購入
          </button>
          <button
            onClick={() => {loadPlans(); loadSubscribers(); setSuccess('データを更新しました');}}
            className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            🔄 データ更新
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionMerchantDashboard;