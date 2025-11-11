import React, { useState } from 'react';

interface PaymentSuccessProps {
  txHash: string;
  amount: string;
  onNewPayment: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ txHash, amount, onNewPayment }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('コピーに失敗しました', e);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '24px'
      }}>
        {/* チェックマークアイコン */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#d1fae5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg style={{ width: '40px', height: '40px', color: '#059669' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        {/* タイトル */}
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>
            決済完了！
          </h2>
          <p style={{ color: '#6b7280', margin: 0 }}>
            JPYC決済が正常に完了しました
          </p>
        </div>

        {/* 金額表示 */}
        <div style={{
          width: '100%',
          backgroundColor: '#f0fdf4',
          border: '2px solid #10b981',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>決済金額</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669' }}>
            {amount} JPYC
          </div>
        </div>

        {/* トランザクションハッシュ */}
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            トランザクションハッシュ
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              flex: 1,
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '12px',
              wordBreak: 'break-all',
              color: '#374151'
            }}>
              {txHash}
            </div>
            <button
              onClick={copy}
              style={{
                padding: '0 16px',
                borderLeft: '1px solid #e5e7eb',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                border: 'none'
              }}
            >
              {copied ? '✅ コピー済' : '📋 コピー'}
            </button>
          </div>

          {/* Etherscanリンク */}
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#2563eb',
              fontSize: '14px',
              marginTop: '12px',
              textDecoration: 'none'
            }}
          >
            Etherscanで確認
            <svg style={{ width: '16px', height: '16px', marginLeft: '4px' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
              <path d="M5 5h5V3H3v7h2V5z" />
            </svg>
          </a>
        </div>

        {/* 決済情報 */}
        <div style={{
          width: '100%',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'left'
        }}>
          <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
            決済完了
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '14px' }}>
            <div style={{ color: '#6b7280' }}>ネットワーク:</div>
            <div style={{ color: '#1e40af' }}>Ethereum Sepolia</div>
            <div style={{ color: '#6b7280' }}>トークン:</div>
            <div style={{ color: '#1e40af' }}>JPYC</div>
            <div style={{ color: '#6b7280' }}>ステータス:</div>
            <div style={{ color: '#059669', fontWeight: '600' }}>✅ 成功</div>
          </div>
        </div>

        {/* 新しい決済ボタン */}
        <button
          onClick={onNewPayment}
          style={{
            width: '100%',
            backgroundColor: '#3b82f6',
            color: 'white',
            fontWeight: '600',
            padding: '16px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← 新しい決済
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
