import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { readBalance } from '../lib/jpyc';

interface SubscriptionPlan {
  id: string;
  name: string;
  amount: string;
  description?: string;
  duration: number;
  features: string[];
}

interface SubscriptionContractProps {
  currentAddress?: string;
  onSubscribe?: (plan: SubscriptionPlan, txHash: string) => void;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'ベーシックプラン',
    amount: '100',
    description: '個人利用に最適',
    duration: 30,
    features: ['基本機能', 'メールサポート']
  },
  {
    id: 'pro',
    name: 'プロプラン',
    amount: '500',
    description: '小規模企業向け',
    duration: 30,
    features: ['全機能', '優先サポート', 'API アクセス']
  },
  {
    id: 'enterprise',
    name: 'エンタープライズプラン',
    amount: '2000',
    description: '大企業向け',
    duration: 30,
    features: ['全機能', '専任サポート', 'カスタム統合', 'SLA']
  }
];

const SubscriptionContract: React.FC<SubscriptionContractProps> = ({ 
  currentAddress, 
  onSubscribe 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SUBSCRIPTION_PLANS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');

  useEffect(() => {
    const checkBalance = async () => {
      if (!currentAddress) return;
      
      try {
        const balance = await readBalance(currentAddress);
        setBalance(balance.toString());
      } catch (error) {
        console.error('残高取得エラー:', error);
        setBalance('0');
      }
    };

    checkBalance();
  }, [currentAddress]);

  const subscribe = async () => {
    if (!currentAddress) {
      setError('ウォレットが接続されていません');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const requiredAmount = ethers.parseEther(selectedPlan.amount);
      const currentBalance = ethers.parseEther(balance);
      
      if (currentBalance < requiredAmount) {
        throw new Error(`残高不足です。必要: ${selectedPlan.amount} JPYC (≈ ${Number(selectedPlan.amount).toLocaleString()}円)、現在: ${Number(balance).toFixed(2)} JPYC (≈ ${Number(balance).toLocaleString()}円)`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      const subscription = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.amount,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + selectedPlan.duration * 24 * 60 * 60 * 1000).toISOString(),
        txHash: mockTxHash,
        address: currentAddress
      };
      
      const existingSubscriptions = JSON.parse(localStorage.getItem('subscriptions') || '[]');
      existingSubscriptions.push(subscription);
      localStorage.setItem('subscriptions', JSON.stringify(existingSubscriptions));

      setSuccess(`${selectedPlan.name}の契約が完了しました！期間: ${selectedPlan.duration}日間、トランザクション: ${mockTxHash.substring(0, 10)}...`);
      onSubscribe?.(selectedPlan, mockTxHash);

    } catch (error: any) {
      console.error('契約エラー:', error);
      setError(error.message || '契約処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
          💎 サブスクリプション契約
        </h2>
        
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '8px' }}>
              <span>❌</span>
              <strong>エラー</strong>
            </div>
            <div style={{ fontSize: '14px', color: '#dc2626', whiteSpace: 'pre-line' }}>
              {error}
            </div>
          </div>
        )}
        
        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '8px' }}>
              <span>✅</span>
              <strong>成功</strong>
            </div>
            <div style={{ fontSize: '14px', color: '#15803d', whiteSpace: 'pre-line' }}>
              {success}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
              📋 プラン選択
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  プラン
                </label>
                <select
                  value={selectedPlan.id}
                  onChange={(e) => {
                    const selected = SUBSCRIPTION_PLANS.find(p => p.id === e.target.value);
                    if (selected) setSelectedPlan(selected);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  {SUBSCRIPTION_PLANS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.amount} JPYC/月 (≈ {Number(p.amount).toLocaleString()}円)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  料金 (1 JPYC = 1円)
                </label>
                <div style={{ padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '6px', fontSize: '14px', color: '#374151' }}>
                  <div style={{ fontWeight: '600' }}>{selectedPlan.amount} JPYC</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>≈ {Number(selectedPlan.amount).toLocaleString()}円/月</div>
                </div>
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>説明:</strong> {selectedPlan.description || 'なし'}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '15px', border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#0369a1' }}>💰 現在の残高:</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#0369a1' }}>
                  {Number(balance).toFixed(2)} JPYC
                </div>
                <div style={{ fontSize: '12px', color: '#0284c7' }}>
                  ≈ {Number(balance).toLocaleString()}円
                </div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fefefe', borderRadius: '8px', padding: '15px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>
              ✨ プラン特典
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#4b5563', fontSize: '14px' }}>
              {selectedPlan.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={subscribe}
            disabled={!currentAddress || loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: (!currentAddress || loading) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (!currentAddress || loading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? '契約処理中...' : 
             !currentAddress ? 'ウォレット接続が必要です' : 
             `${selectedPlan.amount} JPYC で契約する (≈ ${Number(selectedPlan.amount).toLocaleString()}円)`}
          </button>

          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            backgroundColor: '#f9fafb', 
            padding: '15px', 
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '8px' }}>⚠️ 注意事項:</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>サブスクリプションはテスト環境です。本番での利用は控えてください。</li>
              <li>契約後は管理画面で状況を確認できます。</li>
              <li>JPYCトークンが不足している場合は、Faucetから取得してください。</li>
              <li>契約情報はローカルストレージに保存されます。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionContract;