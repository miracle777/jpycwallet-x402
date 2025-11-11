import React, { useState } from 'react';

interface NetworkConfig {
  chainId: bigint;
  name: string;
  currency: string;
  asset: string;
  decimals: number;
  rpcUrl: string;
}

interface MerchantPaymentRequestProps {
  currentAddress?: string;
  networkConfigs?: Record<string, NetworkConfig>;
}

interface GeneratedPaymentRequest {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    name: string;
    version: string;
  };
}

// デフォルトのネットワーク設定
const defaultNetworkConfig: Record<string, NetworkConfig> = {
  'polygon-amoy': {
    chainId: 80002n,
    name: 'Polygon Amoy',
    currency: 'JPYC',
    asset: '0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F',
    decimals: 18,
    rpcUrl: 'https://rpc-amoy.polygon.technology'
  },
  sepolia: {
    chainId: 11155111n,
    name: 'Ethereum Sepolia (Community)',
    currency: 'JPYC',
    asset: '0xd3eF95d29A198868241FE374A999fc25F6152253',
    decimals: 18,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com'
  },
  'sepolia-official': {
    chainId: 11155111n,
    name: 'Ethereum Sepolia (Official)',
    currency: 'JPYC',
    asset: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    decimals: 18,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com'
  },
  'avalanche-fuji': {
    chainId: 43113n,
    name: 'Avalanche Fuji',
    currency: 'JPYC',
    asset: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    decimals: 18,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc'
  }
};

const MerchantPaymentRequest: React.FC<MerchantPaymentRequestProps> = ({
  currentAddress,
  networkConfigs = defaultNetworkConfig,
}) => {
  const [amount, setAmount] = useState('100'); // JPY
  const [selectedNetwork, setSelectedNetwork] = useState<string>('polygon-amoy');
  const [resource, setResource] = useState('api-access');
  const [description, setDescription] = useState('API Access Fee');
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [generatedRequest, setGeneratedRequest] = useState<GeneratedPaymentRequest | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePaymentRequest = () => {
    if (!currentAddress) {
      alert('ウォレットに接続してください');
      return;
    }

    const config = networkConfigs[selectedNetwork];
    if (!config) {
      alert('無効なネットワークが選択されています');
      return;
    }

    // PaymentRequirementsを作成
    const paymentRequirements: GeneratedPaymentRequest = {
      scheme: 'x402',
      network: selectedNetwork,
      maxAmountRequired: amount, // 表示用（JPY単位）
      resource,
      description,
      mimeType: 'application/json',
      payTo: currentAddress,
      maxTimeoutSeconds: 3600, // 1時間
      asset: config.asset,
      extra: {
        name: 'JPYC Payment',
        version: '1.0.0'
      }
    };

    setGeneratedRequest(paymentRequirements);

    // 決済用URLを生成 - PaymentRequirementsをBase64エンコード
    const encodedRequirements = btoa(JSON.stringify(paymentRequirements));
    const url = `${window.location.origin}/pay?request=${encodedRequirements}`;
    setPaymentUrl(url);

    console.log('📋 Payment Request:', paymentRequirements);
    console.log(' Payment URL:', url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setAmount('100');
    setSelectedNetwork('polygon-amoy');
    setResource('api-access');
    setDescription('API Access Fee');
    setPaymentUrl('');
    setGeneratedRequest(null);
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* ステップガイド */}
      <div style={{ 
        backgroundColor: '#f0f9ff', 
        border: '2px solid #0ea5e9', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#0c4a6e', fontSize: '18px', fontWeight: 'bold' }}>
          🛍️ x402 決済要求生成（マーチャント側）
        </h2>
        <div style={{ fontSize: '14px', color: '#0c4a6e', lineHeight: '1.8' }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>📝 ステップ 1: 決済内容を入力</strong>
          </div>
          <div style={{ paddingLeft: '20px', marginBottom: '15px' }}>
            • ネットワークを選択<br/>
            • 金額を入力（JPY単位）<br/>
            • リソース識別子を設定<br/>
            • 説明を入力
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>🔗 ステップ 2: 決済用URLを生成</strong>
          </div>
          <div style={{ paddingLeft: '20px', marginBottom: '15px' }}>
            • 「決済用URL生成」ボタンをクリック<br/>
            • PaymentRequirementsがエンコードされたURLが生成されます
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <strong>📱 ステップ 3: 支払者に共有</strong>
          </div>
          <div style={{ paddingLeft: '20px' }}>
            • 生成されたURLをコピー<br/>
            • 支払者に送付（QRコードまたはリンク）<br/>
            • 支払者がURLにアクセスして決済実行
          </div>
        </div>
      </div>

      {/* 入力フォーム */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
          💳 決済内容設定
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            ネットワーク選択
          </label>
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            {Object.entries(networkConfigs).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name} ({config.currency})
              </option>
            ))}
          </select>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
            💡 テスト用には Polygon Amoy 推奨
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            金額 (JPYC / 円) - 整数のみ
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="100"
              min="1"
              step="1"
            />
            <div style={{ 
              position: 'absolute', 
              right: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              fontSize: '12px', 
              color: '#6b7280' 
            }}>
              {amount ? `${Math.floor(parseFloat(amount))} 円` : '0 円'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            リソース識別子
          </label>
          <input
            type="text"
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="e.g., api-access, premium-content"
          />
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
            💡 支払いの対象となるリソース（API、サービス等）の識別子
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            説明
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            placeholder="Payment description"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            受取アドレス
          </label>
          <div style={{ 
            padding: '10px', 
            border: '1px solid #d1d5db', 
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            backgroundColor: '#f3f4f6',
            wordBreak: 'break-all',
            color: '#6b7280'
          }}>
            {currentAddress || 'ウォレット未接続'}
          </div>
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleGeneratePaymentRequest}
            disabled={!currentAddress}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: !currentAddress ? '#d1d5db' : '#10b981',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: !currentAddress ? 'not-allowed' : 'pointer',
            }}
          >
            {!currentAddress ? '🔗 ウォレット接続が必要です' : '✨ 決済用URL生成'}
          </button>

          <button
            onClick={resetForm}
            style={{
              padding: '12px 20px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            � リセット
          </button>
        </div>
      </div>

      {/* 決済用URL表示 */}
      {paymentUrl && (
        <div style={{ 
          backgroundColor: '#f0fdf4', 
          border: '2px solid #10b981', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '15px' }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <span style={{ fontWeight: '600', fontSize: '16px' }}>決済用URL生成完了！</span>
          </div>

          {/* URL表示とコピー・新しいウィンドウで開く */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#15803d', marginBottom: '8px' }}>
              📱 決済用URL:
            </div>
            
            {/* URL表示エリア（スクロール可能） */}
            <div style={{
              backgroundColor: '#dcfce7',
              border: '2px solid #10b981',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '10px',
              maxHeight: '100px',
              overflowY: 'auto',
              wordBreak: 'break-all',
              fontSize: '11px',
              fontFamily: 'monospace',
              lineHeight: '1.4',
              color: '#15803d'
            }}>
              {paymentUrl}
            </div>
            
            {/* アクションボタン */}
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '10px'
            }}>
              <button
                onClick={() => copyToClipboard(paymentUrl)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#15803d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {copied ? '✅ コピー済み' : '📋 URLをコピー'}
              </button>
              
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🔗 新しいウィンドウで開く
              </a>
              
              <button
                onClick={() => {
                  // QRコード生成（簡易版）
                  const qrData = `data:text/plain;charset=utf-8,${encodeURIComponent(paymentUrl)}`;
                  const newWindow = window.open('', '_blank', 'width=400,height=500');
                  if (newWindow) {
                    newWindow.document.write(`
                      <html>
                        <head><title>QRコード - 決済用URL</title></head>
                        <body style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                          <h2>📱 決済用QRコード</h2>
                          <div style="margin: 20px 0;">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentUrl)}" alt="QR Code" style="border: 1px solid #ddd; border-radius: 8px;" />
                          </div>
                          <p style="font-size: 12px; color: #666; margin-top: 20px; word-break: break-all;">
                            URL: ${paymentUrl}
                          </p>
                          <button onclick="navigator.clipboard.writeText('${paymentUrl}').then(() => alert('URLがクリップボードにコピーされました'))" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            📋 URLをコピー
                          </button>
                        </body>
                      </html>
                    `);
                  }
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                � QRコード表示
              </button>
            </div>
          </div>

          {/* 使い方説明 */}
          <div style={{ 
            backgroundColor: '#dcfce7', 
            border: '1px solid #10b981',
            borderRadius: '6px', 
            padding: '12px',
            marginBottom: '15px',
            fontSize: '13px',
            color: '#15803d'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>📝 このURLの使い方:</div>
            <div style={{ lineHeight: '1.6' }}>
              1. 上のURLをコピー<br/>
              2. 支払者に共有（メール、QRコード等）<br/>
              3. 支払者がURLにアクセス<br/>
              4. 支払者がウォレット接続して決済実行
            </div>
          </div>

          {/* Payment Requirements表示 */}
          {generatedRequest && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#15803d', marginBottom: '8px' }}>
                📋 Payment Requirements (JSON):
              </div>
              <pre style={{ 
                fontSize: '11px', 
                backgroundColor: '#dcfce7', 
                padding: '10px', 
                borderRadius: '4px', 
                overflow: 'auto',
                margin: 0,
                fontFamily: 'monospace',
                border: '1px solid #10b981',
                maxHeight: '200px'
              }}>
                {JSON.stringify(generatedRequest, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MerchantPaymentRequest;
