import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  type MerchantInfo, 
  type PaymentItem,
  createPaymentRequest,
  paymentRequestToQRData,
  validateMerchantInfo,
  defaultMerchantInfo,
  merchantCategories,
  type QRCodeFormat 
} from '../lib/merchant';
import { networkConfigs, type NetworkConfig } from '../lib/chain';

interface PaymentRequestProps {
  onQRGenerated?: (qrData: string, amount?: string, merchant?: any) => void;
  currentAddress?: string;
}

const PaymentRequest: React.FC<PaymentRequestProps> = ({ onQRGenerated, currentAddress }) => {
  // ネットワーク選択
  const [selectedNetwork, setSelectedNetwork] = useState<string>('sepolia-official');
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>(networkConfigs['sepolia-official']);
  
  // 基本情報
  const [amount, setAmount] = useState<string>('100');
  const [currency, setCurrency] = useState<string>('JPYC');
  const [description, setDescription] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [format, setFormat] = useState<QRCodeFormat>('json');

  // 店舗情報
  const [merchant, setMerchant] = useState<MerchantInfo>(defaultMerchantInfo);
  const [isEditingMerchant, setIsEditingMerchant] = useState<boolean>(false);
  const [merchantValidation, setMerchantValidation] = useState<{ isValid: boolean; errors: string[] }>({ isValid: true, errors: [] });

  // 商品情報
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [newItem, setNewItem] = useState<PaymentItem>({ name: '', price: '', quantity: 1 });
  const [showItemForm, setShowItemForm] = useState<boolean>(false);

  // QRコード
  const [qrCodeURL, setQrCodeURL] = useState<string>('');
  const [qrData, setQrData] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // ウォレット接続時に受取アドレスを自動設定
  useEffect(() => {
    if (currentAddress) {
      setMerchant(prev => ({
        ...prev,
        recipientAddress: currentAddress
      }));
    }
  }, [currentAddress]);

  // ネットワーク変更時にコンフィグを更新
  useEffect(() => {
    const config = networkConfigs[selectedNetwork];
    if (config) {
      setNetworkConfig(config);
      // マーチャント情報のコントラクトアドレスも更新
      setMerchant(prev => ({
        ...prev,
        contractAddress: config.jpycAddress,
        chainId: config.chainId
      }));
    }
  }, [selectedNetwork]);

  // 店舗情報の更新
  const updateMerchant = (field: keyof MerchantInfo, value: string) => {
    const updatedMerchant = { ...merchant, [field]: value };
    setMerchant(updatedMerchant);
    
    // バリデーション
    const validation = validateMerchantInfo(updatedMerchant);
    setMerchantValidation(validation);
  };

  // 商品の追加
  const addItem = () => {
    if (newItem.name && newItem.price) {
      setItems([...items, { ...newItem }]);
      setNewItem({ name: '', price: '', quantity: 1 });
      setShowItemForm(false);
    }
  };

  // 商品の削除
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // 合計金額の計算
  const calculateTotal = (): string => {
    if (items.length === 0) return amount;
    
    const total = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    return total.toString();
  };

  // QRコード生成
  const generateQRCode = async () => {
    try {
      const validation = validateMerchantInfo(merchant);
      if (!validation.isValid) {
        setMerchantValidation(validation);
        return;
      }

      const paymentRequest = createPaymentRequest(
        merchant,
        items.length > 0 ? calculateTotal() : amount,
        currency,
        {
          description: description || undefined,
          reference: reference || undefined,
          items: items.length > 0 ? items : undefined,
          expiresInMinutes: 30
        }
      );

      const data = paymentRequestToQRData(paymentRequest, format);
      setQrData(data);

      // QRコード画像を生成
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeURL(qrCodeDataURL);
      
      // マーチャント情報と金額も一緒に渡す
      onQRGenerated?.(data, amount, merchant);

    } catch (error) {
      console.error('QRコード生成エラー:', error);
    }
  };

  // クリップボードにコピー
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  };

  // QRコード画像をダウンロード
  const downloadQRCode = () => {
    if (qrCodeURL) {
      const link = document.createElement('a');
      link.download = `qr-payment-${merchant.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
      link.href = qrCodeURL;
      link.click();
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* ヘッダー */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '20px', fontWeight: 'bold' }}>
          📱 決済QRコード生成
        </h2>
        <p style={{ margin: 0, color: '#6b7280' }}>店舗情報付きの決済QRコードを生成できます</p>
      </div>

      {/* ネットワーク選択セクション */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
          🌐 ネットワーク選択
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {Object.entries(networkConfigs).map(([key, config]) => {
            const isSelected = selectedNetwork === key;
            const isTestnet = config.faucetUrl !== undefined;
            
            return (
              <div
                key={key}
                onClick={() => setSelectedNetwork(key)}
                style={{
                  padding: '12px',
                  border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  {config.name} {isSelected && '✅'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                  Chain ID: {config.chainId}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {isTestnet ? (
                    <span style={{ 
                      padding: '2px 6px', 
                      borderRadius: '10px', 
                      fontSize: '11px', 
                      fontWeight: '500',
                      backgroundColor: '#fef3c7',
                      color: '#92400e'
                    }}>
                      🧪 Testnet
                    </span>
                  ) : (
                    <span style={{ 
                      padding: '2px 6px', 
                      borderRadius: '10px', 
                      fontSize: '11px', 
                      fontWeight: '500',
                      backgroundColor: '#dcfce7',
                      color: '#166534'
                    }}>
                      🔴 Mainnet
                    </span>
                  )}
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: '10px', 
                    fontSize: '11px', 
                    fontWeight: '500',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af'
                  }}>
                    💰 JPYC
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{ 
          marginTop: '12px', 
          padding: '10px', 
          backgroundColor: '#f0fdf4', 
          border: '1px solid #86efac', 
          borderRadius: '6px',
          fontSize: '13px',
          color: '#166534'
        }}>
          ✅ 選択中: <strong>{networkConfig.name}</strong><br />
          📍 JPYC アドレス: <code style={{ fontSize: '11px' }}>{networkConfig.jpycAddress}</code>
        </div>
      </div>

      {/* 店舗情報セクション */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
            🏪 店舗情報
          </h3>
          <button
            onClick={() => setIsEditingMerchant(!isEditingMerchant)}
            style={{ 
              padding: '6px 12px', 
              backgroundColor: '#f3f4f6', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isEditingMerchant ? '❌ キャンセル' : '✏️ 編集'}
          </button>
        </div>

        {!merchantValidation.isValid && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px', marginBottom: '15px' }}>
            <div style={{ color: '#dc2626', fontSize: '14px' }}>
              {merchantValidation.errors.map((error, index) => (
                <p key={index} style={{ margin: '5px 0' }}>• {error}</p>
              ))}
            </div>
          </div>
        )}

        {isEditingMerchant ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  店舗名 <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={merchant.name}
                  onChange={(e) => updateMerchant('name', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="例: カフェ東京"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  店舗ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={merchant.id}
                  onChange={(e) => updateMerchant('id', e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="例: CAFE_TOKYO_001"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                受取りアドレス <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={merchant.recipientAddress}
                onChange={(e) => updateMerchant('recipientAddress', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px' }}
                placeholder="0x..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>カテゴリ</label>
                <select
                  value={merchant.category || ''}
                  onChange={(e) => updateMerchant('category', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">選択してください</option>
                  {merchantCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>場所</label>
                <input
                  type="text"
                  value={merchant.location || ''}
                  onChange={(e) => updateMerchant('location', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="例: 東京都渋谷区"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>店舗説明</label>
              <textarea
                value={merchant.description || ''}
                onChange={(e) => updateMerchant('description', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                placeholder="店舗の説明を入力してください"
              />
            </div>

            <button
              onClick={() => {
                const validation = validateMerchantInfo(merchant);
                if (validation.isValid) {
                  setIsEditingMerchant(false);
                }
                setMerchantValidation(validation);
              }}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              💾 保存
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#1f2937' }}>{merchant.name}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>ID: {merchant.id}</p>
              </div>
            </div>
            
            {merchant.description && (
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{merchant.description}</p>
            )}
            
            <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#6b7280', flexWrap: 'wrap' }}>
              {merchant.category && (
                <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>{merchant.category}</span>
              )}
              {merchant.location && (
                <span>📍 {merchant.location}</span>
              )}
            </div>
            
            <div style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '6px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280' }}>受取りアドレス:</p>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#374151', wordBreak: 'break-all' }}>{merchant.recipientAddress}</p>
            </div>
          </div>
        )}
      </div>

      {/* 決済情報セクション */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>💰 決済情報</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                金額 (1 JPYC = 1円)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px 35px 8px 8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  placeholder="100"
                  min="0"
                  step="1"
                />
                <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '14px' }}>
                  円
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                {amount && !isNaN(Number(amount)) ? `${Number(amount).toLocaleString()} JPYC` : '0 JPYC'}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>通貨</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="JPYC">JPYC</option>
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>QR形式</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as QRCodeFormat)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                <option value="json">JSON (店舗情報付き)</option>
                <option value="ethereum">Ethereum形式</option>
                <option value="jpyc">JPYC形式</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>説明</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="決済の説明"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>参照番号</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="注文番号など"
              />
            </div>
          </div>
        </div>
      </div>

      {/* QRコード生成・表示 */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={generateQRCode}
            disabled={!merchantValidation.isValid}
            style={{
              padding: '12px 24px',
              borderRadius: '6px',
              fontWeight: '600',
              border: 'none',
              cursor: merchantValidation.isValid ? 'pointer' : 'not-allowed',
              backgroundColor: merchantValidation.isValid ? '#3b82f6' : '#9ca3af',
              color: 'white'
            }}
          >
            📱 QRコード生成
          </button>
          
          {!merchantValidation.isValid && (
            <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '10px' }}>店舗情報を正しく入力してください</p>
          )}
        </div>

        {qrCodeURL && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <img src={qrCodeURL} alt="決済QRコード" style={{ border: '1px solid #e5e7eb', borderRadius: '6px' }} />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={copyToClipboard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 12px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {copied ? '✅ コピー済み' : '📋 データをコピー'}
              </button>
              <button
                onClick={downloadQRCode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 12px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                💾 画像をダウンロード
              </button>
            </div>
            
            <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '6px', width: '100%', maxWidth: '600px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '500', color: '#374151' }}>QRコードデータ:</p>
              <pre style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{qrData}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentRequest;