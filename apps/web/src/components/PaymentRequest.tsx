import React, { useState, useRef } from 'react';
import QRCode from 'qrcode';
// import { Download, Copy, QrCode, Building, MapPin, Globe, Check, Edit, Save, X } from 'lucide-react';
import type { 
  MerchantInfo, 
  PaymentItem,
  QRCodeFormat 
} from '../lib/merchant';
import {
  createPaymentRequest,
  paymentRequestToQRData,
  validateMerchantInfo,
  defaultMerchantInfo,
  merchantCategories
} from '../lib/merchant';

interface PaymentRequestProps {
  onQRGenerated?: (qrData: string) => void;
}

const PaymentRequest: React.FC<PaymentRequestProps> = ({ onQRGenerated }) => {
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      onQRGenerated?.(data);

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
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span style={{ fontSize: '24px' }}>📱</span>
          決済QRコード生成
        </h2>
        <p className="text-gray-600">店舗情報付きの決済QRコードを生成できます</p>
      </div>

      {/* 店舗情報セクション */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span style={{ fontSize: '20px' }}>🏢</span>
            店舗情報
          </h3>
          <button
            onClick={() => setIsEditingMerchant(!isEditingMerchant)}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <span style={{ fontSize: '16px' }}>{isEditingMerchant ? '✖️' : '✏️'}</span>
            {isEditingMerchant ? 'キャンセル' : '編集'}
          </button>
        </div>

        {!merchantValidation.isValid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="text-red-700 text-sm">
              {merchantValidation.errors.map((error, index) => (
                <p key={index}>• {error}</p>
              ))}
            </div>
          </div>
        )}

        {isEditingMerchant ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  店舗名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={merchant.name}
                  onChange={(e) => updateMerchant('name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: カフェ東京"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  店舗ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={merchant.id}
                  onChange={(e) => updateMerchant('id', e.target.value.toUpperCase())}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: CAFE_TOKYO_001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                受取りアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={merchant.recipientAddress}
                onChange={(e) => updateMerchant('recipientAddress', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="0x..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                <select
                  value={merchant.category || ''}
                  onChange={(e) => updateMerchant('category', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">選択してください</option>
                  {merchantCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">場所</label>
                <input
                  type="text"
                  value={merchant.location || ''}
                  onChange={(e) => updateMerchant('location', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: 東京都渋谷区"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">店舗説明</label>
              <textarea
                value={merchant.description || ''}
                onChange={(e) => updateMerchant('description', e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="店舗の説明を入力してください"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ウェブサイト</label>
              <input
                type="url"
                value={merchant.website || ''}
                onChange={(e) => updateMerchant('website', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const validation = validateMerchantInfo(merchant);
                  if (validation.isValid) {
                    setIsEditingMerchant(false);
                  }
                  setMerchantValidation(validation);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span style={{ fontSize: '16px' }}>💾</span>
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '20px' }}>🏢</span>
              <div>
                <h4 className="font-semibold text-gray-900">{merchant.name}</h4>
                <p className="text-sm text-gray-600">ID: {merchant.id}</p>
              </div>
            </div>
            
            {merchant.description && (
              <p className="text-sm text-gray-600 ml-8">{merchant.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-600 ml-8">
              {merchant.category && (
                <span className="bg-gray-100 px-2 py-1 rounded-md">{merchant.category}</span>
              )}
              {merchant.location && (
                <span className="flex items-center gap-1">
                  <span style={{ fontSize: '12px' }}>📍</span>
                  {merchant.location}
                </span>
              )}
              {merchant.website && (
                <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                  <span style={{ fontSize: '12px' }}>🌐</span>
                  ウェブサイト
                </a>
              )}
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg ml-8">
              <p className="text-xs text-gray-500">受取りアドレス:</p>
              <p className="font-mono text-xs text-gray-800 break-all">{merchant.recipientAddress}</p>
            </div>
          </div>
        )}
      </div>

      {/* 決済情報セクション */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">決済情報</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">金額</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">通貨</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="JPYC">JPYC</option>
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">QR形式</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as QRCodeFormat)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="json">JSON (店舗情報付き)</option>
                <option value="ethereum">Ethereum形式</option>
                <option value="jpyc">JPYC形式</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="決済の説明"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">参照番号</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="注文番号など"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 商品情報セクション */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">商品情報（オプション）</h3>
          <button
            onClick={() => setShowItemForm(!showItemForm)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showItemForm ? 'キャンセル' : '商品追加'}
          </button>
        </div>

        {showItemForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品名</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="コーヒー"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">価格</label>
                <input
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addItem}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  追加
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品説明</label>
              <input
                type="text"
                value={newItem.description || ''}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="商品の詳細説明"
              />
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600">×{item.quantity}</span>
                    <span className="font-semibold">{(parseFloat(item.price) * item.quantity).toLocaleString()} {currency}</span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <span style={{ fontSize: '16px' }}>✖️</span>
                </button>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="font-semibold">合計:</span>
              <span className="text-lg font-bold">{calculateTotal()} {currency}</span>
            </div>
          </div>
        )}
      </div>

      {/* QRコード生成・表示 */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="text-center">
          <button
            onClick={generateQRCode}
            disabled={!merchantValidation.isValid}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              merchantValidation.isValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            QRコード生成
          </button>
          
          {!merchantValidation.isValid && (
            <p className="text-red-500 text-sm mt-2">店舗情報を正しく入力してください</p>
          )}
        </div>

        {qrCodeURL && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-center">
              <img src={qrCodeURL} alt="決済QRコード" className="border border-gray-200 rounded-lg" />
            </div>
            
            <div className="flex justify-center gap-3">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span style={{ fontSize: '16px' }}>{copied ? '✅' : '📋'}</span>
                {copied ? 'コピー済み' : 'データをコピー'}
              </button>
              <button
                onClick={downloadQRCode}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span style={{ fontSize: '16px' }}>⬇️</span>
                画像をダウンロード
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">QRコードデータ:</p>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{qrData}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentRequest;