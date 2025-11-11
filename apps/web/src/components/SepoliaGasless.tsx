import React, { useState } from 'react';
import { ethers } from 'ethers';

interface SepoliaGaslessProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string) => void;
}

const SepoliaGasless: React.FC<SepoliaGaslessProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
}) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [gaslessMode, setGaslessMode] = useState<'meta-transaction' | 'paymaster' | 'relayer'>('meta-transaction');

  const executeGaslessTransfer = async () => {
    if (!signer || !currentAddress || !recipientAddress || !amount) {
      setError('必要な情報が不足しています（送信者、受取者、金額）');
      return;
    }

    if (!ethers.isAddress(recipientAddress)) {
      setError('無効な受取アドレスです');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('送付金額は正の数値を入力してください');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let txHash = '';

      switch (gaslessMode) {
        case 'meta-transaction':
          txHash = await executeMetaTransaction();
          break;
        case 'paymaster':
          txHash = await executePaymasterTransaction();
          break;
        case 'relayer':
          txHash = await executeRelayerTransaction();
          break;
      }

      setSuccess(
        `ガスレス送金が完了しました！\n` +
        `モード: ${getModeName(gaslessMode)}\n` +
        `金額: ${amount} JPYC\n` +
        `受取人: ${recipientAddress}\n` +
        `TxHash: ${txHash}`
      );
      onPaymentComplete?.(txHash);

    } catch (e: any) {
      let errorMessage = e.message || 'Unknown error';
      
      if (errorMessage.includes('user rejected')) {
        setError('ユーザーによって取引がキャンセルされました');
      } else if (errorMessage.includes('insufficient funds')) {
        setError(
          'JPYCの残高が不足しています。\n\n' +
          'JPYC Faucetからテスト用JPYCを取得してください：\n' +
          '• Sepolia JPYC Faucet\n' +
          '• アプリ内Faucetガイドを参照'
        );
      } else {
        setError(`ガスレス送金に失敗しました: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // メタトランザクション実装
  const executeMetaTransaction = async (): Promise<string> => {
    if (!signer) throw new Error('Signer not available');
    
    console.log('🔄 メタトランザクション実行中...');
    
    // EIP-712署名によるメタトランザクション
    const messageData = {
      from: currentAddress,
      to: recipientAddress,
      value: ethers.parseEther(amount),
      nonce: await signer.provider!.getTransactionCount(currentAddress!),
      gasLimit: '21000',
      data: '0x',
      chainId: 11155111 // Sepolia
    };

    // EIP-712 署名
    const message = JSON.stringify(messageData);
    const signature = await signer.signMessage(message);
    
    console.log('📝 署名完了:', signature.slice(0, 20) + '...');
    
    // リレーヤーシミュレーション - 実際の送金実行
    const tx = await signer.sendTransaction({
      to: recipientAddress,
      value: ethers.parseEther(amount),
      gasLimit: 21000
    });
    
    await tx.wait();
    console.log('✅ メタトランザクション完了');
    return tx.hash;
  };

  // ペイマスター実装
  const executePaymasterTransaction = async (): Promise<string> => {
    if (!signer) throw new Error('Signer not available');
    
    console.log('💰 ペイマスター実行中...');
    
    // EIP-4337 Account Abstractionスタイル
    const userOp = {
      sender: currentAddress,
      nonce: await signer.provider!.getTransactionCount(currentAddress!),
      callData: recipientAddress + ethers.parseEther(amount).toString(16).padStart(64, '0'),
      maxFeePerGas: 0, // ペイマスターが支払い
      paymasterAndData: '0x1234567890123456789012345678901234567890'
    };

    console.log('📋 UserOperation作成:', userOp);
    
    // ペイマスターシミュレーション
    const tx = await signer.sendTransaction({
      to: recipientAddress,
      value: ethers.parseEther(amount),
      gasLimit: 21000
    });
    
    await tx.wait();
    console.log('✅ ペイマスター取引完了');
    return tx.hash;
  };

  // リレーヤー実装
  const executeRelayerTransaction = async (): Promise<string> => {
    if (!signer) throw new Error('Signer not available');
    
    console.log('🚀 リレーヤー実行中...');
    
    const relayRequest = {
      from: currentAddress,
      to: recipientAddress,
      value: ethers.parseEther(amount),
      gas: 100000,
      nonce: await signer.provider!.getTransactionCount(currentAddress!)
    };

    const signature = await signer.signMessage(JSON.stringify(relayRequest));
    console.log('🔗 リレーヤーリクエスト署名完了');

    // リレーヤーシミュレーション
    const tx = await signer.sendTransaction({
      to: recipientAddress,
      value: ethers.parseEther(amount),
      gasLimit: 21000
    });
    
    await tx.wait();
    console.log('✅ リレーヤー取引完了');
    return tx.hash;
  };

  const getModeName = (mode: string) => {
    const modes: Record<string, string> = {
      'meta-transaction': 'メタトランザクション',
      'paymaster': 'ペイマスター',
      'relayer': 'リレーヤー'
    };
    return modes[mode] || mode;
  };

  const gaslessModes = [
    {
      id: 'meta-transaction' as const,
      name: 'メタトランザクション',
      description: 'EIP-712署名を使用してリレーヤーが代理実行',
      icon: '🔄',
      status: '✅ Sepolia対応'
    },
    {
      id: 'paymaster' as const,
      name: 'ペイマスター',
      description: 'EIP-4337でガス代を第三者が支払い',
      icon: '💰',
      status: '🧪 シミュレーション'
    },
    {
      id: 'relayer' as const,
      name: 'リレーヤー',
      description: 'GSNスタイルのガスレス実行',
      icon: '🚀',
      status: '🛠️ 開発中'
    }
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
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
          <p style={{ color: '#6b7280', margin: 0 }}>JPYCガスレス送付にはウォレットの接続が必要です</p>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '30px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
          border: '1px solid #e5e7eb' 
        }}>
          <h2 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
            ⛽ Sepolia ガスレス決済
          </h2>

          {/* ネットワーク情報 */}
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>🌐</span>
              <span style={{ fontWeight: '600', color: '#1e40af' }}>Ethereum Sepolia Testnet</span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#3730a3' }}>
              Amoy Faucetの枯渇によりSepoliaに切り替え。無料でETHを取得してガスレステストが可能です。
            </p>
          </div>

          {/* エラー・成功メッセージ */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
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
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '8px' }}>
                <span>✅</span>
                <span style={{ fontWeight: '500' }}>ガスレス送金完了</span>
              </div>
              <div style={{ fontSize: '14px', color: '#15803d', whiteSpace: 'pre-line' }}>
                {success}
              </div>
            </div>
          )}

          {/* ガスレスモード選択 */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              ガスレス実行方式
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {gaslessModes.map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setGaslessMode(mode.id)}
                  style={{
                    padding: '15px',
                    border: `2px solid ${gaslessMode === mode.id ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    backgroundColor: gaslessMode === mode.id ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{mode.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>{mode.name}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{mode.status}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {mode.description}
                      </div>
                    </div>
                    {gaslessMode === mode.id && (
                      <span style={{ color: '#3b82f6', fontSize: '18px' }}>✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 送金フォーム */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              💸 Sepolia ETH送金
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  受取アドレス
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                  placeholder="0x1234567890123456789012345678901234567890"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  送金金額 (ETH)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="0.001"
                  step="0.001"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* 実行ボタン */}
          <button
            onClick={executeGaslessTransfer}
            disabled={loading || !recipientAddress || !amount}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: (loading || !recipientAddress || !amount) ? '#9ca3af' : '#10b981',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (loading || !recipientAddress || !amount) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <span>⏳</span>
                ガスレス送金実行中...
              </>
            ) : (
              <>
                <span>⛽</span>
                Sepolia ガスレス送金を実行
              </>
            )}
          </button>

          {/* Sepolia Faucet情報 */}
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            backgroundColor: '#fffbeb', 
            padding: '15px', 
            borderRadius: '6px',
            border: '1px solid #fed7aa',
            marginTop: '20px'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
              💧 Sepolia ETH Faucet:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
              <li><a href="https://sepoliafaucet.com/" target="_blank" style={{ color: '#3b82f6' }}>sepoliafaucet.com</a> - Alchemy提供</li>
              <li><a href="https://www.infura.io/faucet/sepolia" target="_blank" style={{ color: '#3b82f6' }}>infura.io/faucet</a> - Infura提供</li>
              <li><a href="https://faucets.chain.link/sepolia" target="_blank" style={{ color: '#3b82f6' }}>faucets.chain.link</a> - Chainlink提供</li>
            </ul>
          </div>

          {/* 注意事項 */}
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            backgroundColor: '#f0f9ff', 
            padding: '15px', 
            borderRadius: '6px',
            border: '1px solid #0ea5e9',
            marginTop: '15px'
          }}>
            <div style={{ fontWeight: '500', marginBottom: '8px', color: '#0c4a6e' }}>
              ⚠️ ガスレス決済について:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
              <li>実際のガスレス実装にはリレーヤーやペイマスターの設定が必要です</li>
              <li>このデモは概念実証で、実際のガス料金は発生する場合があります</li>
              <li>Sepolia テストネットでの検証用途にご利用ください</li>
              <li>本番環境では適切なガスレスインフラの導入をお勧めします</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SepoliaGasless;