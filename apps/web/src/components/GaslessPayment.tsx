import React, { useState } from 'react';
import { ethers } from 'ethers';

interface GaslessPaymentProps {
  currentAddress?: string;
  signer?: ethers.Signer;
}

const GaslessPayment: React.FC<GaslessPaymentProps> = ({
  currentAddress,
  signer,
}) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const executeGaslessTransfer = async () => {
    if (!signer || !currentAddress || !recipientAddress || !amount) {
      setError('必要な情報が不足しています');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Ambire SDK を使用したガスレス送付の実装
      // 現在はプレースホルダー実装
      
      // 1. Ambire Smart Account の取得
      // 2. Paymaster の設定
      // 3. メタトランザクションの作成
      // 4. ガスレス実行

      // プレースホルダーの成功メッセージ
      setSuccess('ガスレス送付機能は開発中です。実装には以下が必要です：\n- Ambire Paymaster の設定\n- メタトランザクションの実装\n- Relayer サービスの統合');
      
    } catch (e: any) {
      setError(`ガスレス送付に失敗しました: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '500px',
      margin: '0 auto',
      padding: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      backgroundColor: '#ffffff',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '15px',
      marginBottom: '20px',
    },
    input: {
      padding: '12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '16px',
    },
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 600,
      backgroundColor: '#7c3aed',
      color: 'white',
      transition: 'all 0.2s',
    },
    disabledButton: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
    },
    infoBox: {
      backgroundColor: '#eff6ff',
      border: '1px solid #3b82f6',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px',
      fontSize: '14px',
    },
    implementationBox: {
      backgroundColor: '#f9fafb',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '20px',
      marginTop: '20px',
    },
    implementationTitle: {
      fontWeight: 600,
      marginBottom: '15px',
      color: '#374151',
    },
    implementationList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    implementationItem: {
      padding: '8px 0',
      borderBottom: '1px solid #e5e7eb',
      fontSize: '14px',
    },
    error: {
      color: '#dc2626',
      backgroundColor: '#fee2e2',
      padding: '10px',
      borderRadius: '8px',
      marginBottom: '15px',
      whiteSpace: 'pre-line' as const,
    },
    success: {
      color: '#059669',
      backgroundColor: '#d1fae5',
      padding: '10px',
      borderRadius: '8px',
      marginBottom: '15px',
      whiteSpace: 'pre-line' as const,
    },
  };

  return (
    <div style={styles.container}>
      <h3>⚡ ガスレス送付機能（開発中）</h3>

      <div style={styles.infoBox}>
        <strong>🔬 実験的機能:</strong> Ambire SDK を使用したガスレス JPYC 送付機能です。
        現在は概念実証段階で、完全な実装には追加の設定が必要です。
      </div>

      {/* エラー・成功メッセージ */}
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {!currentAddress ? (
        <div style={styles.error}>
          ガスレス送付を行うには先にAmbireウォレットを接続してください
        </div>
      ) : (
        <>
          <div style={styles.form}>
            <input
              type="text"
              placeholder="送付先アドレス"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="金額（JPYC）"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={executeGaslessTransfer}
              style={{
                ...styles.button,
                ...(loading || !recipientAddress || !amount ? styles.disabledButton : {}),
              }}
              disabled={loading || !recipientAddress || !amount}
            >
              {loading ? '処理中...' : '⚡ ガスレス送付（テスト）'}
            </button>
          </div>
        </>
      )}

      {/* 実装に必要な要素の説明 */}
      <div style={styles.implementationBox}>
        <div style={styles.implementationTitle}>
          🛠️ 完全なガスレス送付実装に必要な要素
        </div>
        <ul style={styles.implementationList}>
          <li style={styles.implementationItem}>
            <strong>1. Ambire Smart Account:</strong> ユーザーのスマートコントラクトウォレット設定
          </li>
          <li style={styles.implementationItem}>
            <strong>2. Paymaster Contract:</strong> ガス代を代理支払いするコントラクト
          </li>
          <li style={styles.implementationItem}>
            <strong>3. Relayer Service:</strong> メタトランザクションを中継するサービス
          </li>
          <li style={styles.implementationItem}>
            <strong>4. EIP-3009 Support:</strong> JPYCのtransferWithAuthorizationメソッド活用
          </li>
          <li style={styles.implementationItem}>
            <strong>5. Rate Limiting:</strong> 悪用防止のための制限機能
          </li>
          <li style={styles.implementationItem}>
            <strong>6. Sponsorship Rules:</strong> ガススポンサーの条件設定
          </li>
        </ul>
      </div>

      <div style={styles.implementationBox}>
        <div style={styles.implementationTitle}>
          📚 参考リソース
        </div>
        <ul style={styles.implementationList}>
          <li style={styles.implementationItem}>
            <strong>x402:</strong> <a href="https://github.com/coinbase/x402" target="_blank" rel="noopener noreferrer">
              github.com/coinbase/x402
            </a>
          </li>
          <li style={styles.implementationItem}>
            <strong>Ambire SDK:</strong> <a href="https://docs.ambire.com/" target="_blank" rel="noopener noreferrer">
              docs.ambire.com
            </a>
          </li>
          <li style={styles.implementationItem}>
            <strong>EIP-3009:</strong> <a href="https://eips.ethereum.org/EIPS/eip-3009" target="_blank" rel="noopener noreferrer">
              eips.ethereum.org/EIPS/eip-3009
            </a>
          </li>
          <li style={styles.implementationItem}>
            <strong>JPYC Docs:</strong> <a href="https://faq.jpyc.co.jp/s/article/developer-documentation" target="_blank" rel="noopener noreferrer">
              faq.jpyc.co.jp (Developer Documentation)
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default GaslessPayment;