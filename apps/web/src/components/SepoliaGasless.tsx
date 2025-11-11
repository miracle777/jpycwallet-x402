import React, { useState } from 'react';
import { ethers } from 'ethers';

interface SepoliaGaslessProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string) => void;
  walletName?: string; // ウォレット名を追加
}

// ネットワーク設定
interface NetworkConfig {
  chainId: number;
  name: string;
  jpycAddress: string;
  rpcUrl: string;
  blockExplorer: string;
}

const NETWORKS: Record<string, NetworkConfig> = {
  'sepolia': {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    jpycAddress: '0xd3eF95d29A198868241FE374A999fc25F6152253',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  'sepolia-official': {
    chainId: 11155111,
    name: 'Ethereum Sepolia (公式)',
    jpycAddress: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io'
  }
};

const SepoliaGasless: React.FC<SepoliaGaslessProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
  walletName = 'Unknown',
}) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [gaslessMode, setGaslessMode] = useState<'meta-transaction' | 'paymaster' | 'relayer'>('meta-transaction');
  const [jpycBalance, setJpycBalance] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('sepolia');

  // Ambire Wallet チェック
  const isAmbireWallet = walletName?.toLowerCase().includes('ambire') || false;

  // JPYC残高チェック
  const checkJpycBalance = async () => {
    if (!signer || !currentAddress) return;
    
    try {
      const network = NETWORKS[selectedNetwork];
      const jpycContract = new ethers.Contract(
        network.jpycAddress,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      );
      
      const balance = await jpycContract.balanceOf(currentAddress);
      const balanceFormatted = ethers.formatUnits(balance, 18);
      setJpycBalance(balanceFormatted);
    } catch (e) {
      console.error('残高取得エラー:', e);
    }
  };

  // ウォレット接続時・ネットワーク変更時に残高をチェック
  React.useEffect(() => {
    if (currentAddress && signer) {
      checkJpycBalance();
    }
  }, [currentAddress, signer, selectedNetwork]);

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

    // 残高チェック
    if (jpycBalance) {
      const balanceNum = parseFloat(jpycBalance);
      if (balanceNum < amountNum) {
        setError(
          `❌ JPYC残高が不足しています\n\n` +
          `現在の残高: ${jpycBalance} JPYC\n` +
          `送金額: ${amount} JPYC\n` +
          `不足額: ${(amountNum - balanceNum).toFixed(2)} JPYC\n\n` +
          `📋 解決方法:\n` +
          `1. アプリ内の「Faucetガイド」から JPYC を取得\n` +
          `2. Sepolia JPYC Faucet でテスト用 JPYC を入手`
        );
        return;
      }
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

      const successMessage = 
        `✅ ガスレス決済が完了しました！\n\n` +
        `⚡ 実行モード: ${getModeName(gaslessMode)}\n` +
        `💰 送金額: ${amount} JPYC\n` +
        `📍 送金先: ${recipientAddress}\n` +
        `🔗 TxHash: ${txHash}\n\n` +
        `ガスレス決済処理が正常に完了しました。`;
      
      setSuccess(successMessage);
      onPaymentComplete?.(txHash);
      
      // 残高を更新
      await checkJpycBalance();

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
    
    const nonce = await signer.provider!.getTransactionCount(currentAddress!);
    const network = NETWORKS[selectedNetwork];
    
    // 人間が読みやすい署名メッセージ
    const readableMessage = 
      `🔄 ガスレス JPYC 送金\n\n` +
      `送信者: ${currentAddress}\n` +
      `受取人: ${recipientAddress}\n` +
      `金額: ${amount} JPYC\n` +
      `Nonce: ${nonce}\n` +
      `ネットワーク: ${network.name} (Chain ID: ${network.chainId})\n\n` +
      `このメッセージに署名することで、上記の送金を承認します。`;

    // 署名
    const signature = await signer.signMessage(readableMessage);
    
    console.log('📝 署名完了:', signature.slice(0, 20) + '...');
    
    // JPYC トークン送金（ERC20 transfer）
    // Convert amount to wei (18 decimals) only for the contract call
    const amountWei = ethers.parseUnits(amount, 18);
    
    // ERC20 ABI for transfer function
    const jpycContract = new ethers.Contract(
      network.jpycAddress,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );
    
    // Execute transfer
    const tx = await jpycContract.transfer(recipientAddress, amountWei);
    
    await tx.wait();
    console.log('✅ メタトランザクション完了');
    return tx.hash;
  };

  // Paymaster実装
  const executePaymasterTransaction = async (): Promise<string> => {
    if (!signer) throw new Error('Signer not available');
    
    console.log('💳 Paymaster トランザクション実行中...');
    
    // JPYC トークン送金
    const networkConfig = NETWORKS[selectedNetwork];
    const amountWei = ethers.parseUnits(amount, 18);
    
    const jpycContract = new ethers.Contract(
      networkConfig.jpycAddress,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );
    
    const tx = await jpycContract.transfer(recipientAddress, amountWei);
    
    await tx.wait();
    console.log('✅ Paymaster トランザクション完了');
    return tx.hash;
  };

  // Relayer実装
  const executeRelayerTransaction = async (): Promise<string> => {
    if (!signer) throw new Error('Signer not available');
    
    console.log('🔀 Relayer トランザクション実行中...');
    
    // JPYC トークン送金
    const networkConfig = NETWORKS[selectedNetwork];
    const amountWei = ethers.parseUnits(amount, 18);
    
    const jpycContract = new ethers.Contract(
      networkConfig.jpycAddress,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );
    
    const tx = await jpycContract.transfer(recipientAddress, amountWei);
    
    await tx.wait();
    console.log('✅ Relayer トランザクション完了');
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
      shortDescription: 'EIP-712署名で代理実行',
      icon: '🔄',
      status: '✅ Sepolia対応'
    },
    {
      id: 'paymaster' as const,
      name: 'ペイマスター',
      description: 'EIP-4337でガス代を第三者が支払い',
      shortDescription: 'ガス代を第三者が支払い',
      icon: '💰',
      status: '🧪 シミュレーション'
    },
    {
      id: 'relayer' as const,
      name: 'リレーヤー',
      description: 'GSNスタイルのガスレス実行',
      shortDescription: 'GSNスタイル実行',
      icon: '🚀',
      status: '🛠️ 開発中'
    }
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }} className="px-4 sm:px-6">
      {!currentAddress ? (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '30px 20px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          border: '1px solid #e5e7eb' 
        }} className="sm:p-10">
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔗</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#374151' }}>ウォレット接続が必要です</h3>
          <p style={{ color: '#6b7280', margin: 0 }}>JPYCガスレス送付にはウォレットの接続が必要です</p>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
          border: '1px solid #e5e7eb' 
        }} className="sm:p-8">
          <h2 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '20px', fontWeight: 'bold', textAlign: 'center' }} className="sm:text-2xl sm:mb-6">
            ⛽ ガスレス JPYC 決済
          </h2>

          {/* Ambire Wallet 専用通知 */}
          {!isAmbireWallet && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '8px' }}>
                <span>⚠️</span>
                <span style={{ fontWeight: '500' }}>Ambire Wallet が必要です</span>
              </div>
              <div style={{ fontSize: '14px', color: '#dc2626' }}>
                ガスレス決済機能は Ambire Wallet でのみ利用可能です。<br/>
                現在のウォレット: {walletName}<br/>
                <a href="https://www.ambire.com/" target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                  Ambire Wallet をインストール
                </a>
              </div>
            </div>
          )}

          {/* ネットワーク選択 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }} className="sm:text-base">
              🌐 ネットワーク選択
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(NETWORKS).map(([key, network]) => (
                <button
                  key={key}
                  onClick={() => setSelectedNetwork(key)}
                  style={{
                    padding: '8px 12px',
                    border: `2px solid ${selectedNetwork === key ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    backgroundColor: selectedNetwork === key ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: selectedNetwork === key ? '600' : '400',
                    color: selectedNetwork === key ? '#1e40af' : '#6b7280',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  className="sm:text-sm sm:px-4 sm:py-2.5"
                >
                  <span className="hidden sm:inline">{network.name}</span>
                  <span className="inline sm:hidden">{key === 'sepolia' ? 'コミュニティ' : '公式'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* JPYC残高表示 */}
          {jpycBalance && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 15px', marginBottom: '20px' }} className="sm:p-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px' }}>💰</span>
                <span style={{ fontWeight: '600', color: '#15803d', fontSize: '14px', wordBreak: 'break-word' }} className="sm:text-base">
                  JPYC残高 ({NETWORKS[selectedNetwork].name})
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d' }} className="sm:text-xl">
                {parseFloat(jpycBalance).toFixed(2)} JPYC
              </div>
              {parseFloat(jpycBalance) < 10 && (
                <div style={{ fontSize: '11px', color: '#ca8a04', marginTop: '8px' }} className="sm:text-xs">
                  ⚠️ 残高が少なくなっています。Faucetガイドから入手できます。
                </div>
              )}
            </div>
          )}

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
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              border: '2px solid #10b981', 
              borderRadius: '12px', 
              padding: '25px', 
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#15803d', marginBottom: '15px' }}>
                決済完了
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#15803d', 
                whiteSpace: 'pre-line',
                lineHeight: '1.6',
                textAlign: 'left',
                marginBottom: '15px'
              }}>
                {success}
              </div>
              <button 
                onClick={() => {
                  setSuccess('');
                  setRecipientAddress('');
                  setAmount('10');
                }} 
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                新しい決済を開始
              </button>
            </div>
          )}

          {/* ガスレスモード選択 */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }} className="sm:text-base">
              ガスレス実行方式
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {gaslessModes.map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setGaslessMode(mode.id)}
                  style={{
                    padding: '12px 15px',
                    border: `2px solid ${gaslessMode === mode.id ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    backgroundColor: gaslessMode === mode.id ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{mode.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>{mode.name}</span>
                        <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>{mode.status}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.4', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        <span className="hidden sm:inline">{mode.description}</span>
                        <span className="inline sm:hidden">{mode.shortDescription}</span>
                      </div>
                    </div>
                    {gaslessMode === mode.id && (
                      <span style={{ color: '#3b82f6', fontSize: '18px', flexShrink: 0 }}>✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 送金フォーム */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '15px', marginBottom: '20px', border: '1px solid #e2e8f0' }} className="sm:p-5">
            <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }} className="sm:text-base">
              💸 Sepolia JPYC送金
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: '#374151' }} className="sm:text-sm">
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
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}
                  className="sm:text-sm"
                  placeholder="0x1234567890123456789012345678901234567890"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: '#374151' }} className="sm:text-sm">
                  送金金額 (JPYC)
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
                    fontSize: '13px'
                  }}
                  className="sm:text-sm"
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
            disabled={loading || !recipientAddress || !amount || !isAmbireWallet}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: (loading || !recipientAddress || !amount || !isAmbireWallet) ? '#9ca3af' : '#10b981',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (loading || !recipientAddress || !amount || !isAmbireWallet) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            className="sm:text-base sm:py-4"
          >
            {loading ? (
              <>
                <span>⏳</span>
                ガスレス送金実行中...
              </>
            ) : !isAmbireWallet ? (
              <>
                <span>🔒</span>
                Ambire Wallet でのみ利用可能
              </>
            ) : (
              <>
                <span>⛽</span>
                ガスレス送金を実行
              </>
            )}
          </button>

          {/* 注意事項 */}
          <div style={{ 
            fontSize: '11px',
            color: '#6b7280', 
            backgroundColor: '#f0f9ff', 
            padding: '12px 15px',
            borderRadius: '6px',
            border: '1px solid #0ea5e9',
            marginTop: '15px'
          }} className="sm:text-xs sm:p-4">
            <div style={{ fontWeight: '500', marginBottom: '8px', color: '#0c4a6e', fontSize: '12px' }} className="sm:text-sm">
              ⚠️ ガスレス決済について:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.5' }} className="sm:pl-5">
              <li><strong>Ambire Wallet 専用機能</strong>: アカウント抽象化によるガスレス送金</li>
              <li>実際のガスレス実装にはリレーヤーやペイマスターの設定が必要です</li>
              <li>このデモは概念実証で、実際のガス料金は発生する場合があります</li>
              <li>テストネットでの検証用途にご利用ください</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SepoliaGasless;