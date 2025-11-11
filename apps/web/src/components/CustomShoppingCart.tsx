import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { transferJPYC, checkSufficientBalance } from '../lib/jpyc';

interface CartItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  image: string;
  description: string;
  merchantName: string;
  merchantId: string;
  maxStock?: number;
}

interface CustomShoppingCartProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string) => void;
}

const CustomShoppingCart: React.FC<CustomShoppingCartProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const defaultItem: Omit<CartItem, 'id'> = {
    name: '新商品',
    price: '100',
    quantity: 1,
    image: '🛍️',
    description: 'テスト用商品',
    merchantName: 'テスト店舗',
    merchantId: 'TEST_STORE',
    maxStock: 999
  };

  // ローカルストレージからカートデータを読み込み
  useEffect(() => {
    if (currentAddress) {
      const storageKey = `cart_${currentAddress}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCartItems(JSON.parse(stored));
      } else {
        // デフォルトカート商品を追加
        const defaultCart: CartItem[] = [
          {
            id: 'item_001',
            name: 'テストコーヒー',
            price: '500',
            quantity: 2,
            image: '☕',
            description: 'JPYC決済テスト用コーヒー',
            merchantName: 'カフェx402',
            merchantId: 'CAFE_X402',
            maxStock: 50
          }
        ];
        setCartItems(defaultCart);
        saveCartItems(defaultCart);
      }
    }
  }, [currentAddress]);

  const saveCartItems = (items: CartItem[]) => {
    if (currentAddress) {
      const storageKey = `cart_${currentAddress}`;
      localStorage.setItem(storageKey, JSON.stringify(items));
      setCartItems(items);
    }
  };

  const handleAddItem = () => {
    setEditingItem({
      ...defaultItem,
      id: `item_${Date.now()}`
    } as CartItem);
    setIsCreating(true);
  };

  const handleEditItem = (item: CartItem) => {
    setEditingItem(item);
    setIsCreating(false);
  };

  const handleSaveItem = () => {
    if (!editingItem) return;

    let updatedItems: CartItem[];
    if (isCreating) {
      updatedItems = [...cartItems, editingItem];
    } else {
      updatedItems = cartItems.map(item => 
        item.id === editingItem.id ? editingItem : item
      );
    }

    saveCartItems(updatedItems);
    setEditingItem(null);
    setIsCreating(false);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = cartItems.filter(item => item.id !== itemId);
    saveCartItems(updatedItems);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedItems = cartItems.map(item => 
      item.id === itemId ? { ...item, quantity: Math.min(newQuantity, item.maxStock || 999) } : item
    );
    saveCartItems(updatedItems);
  };

  const handleInputChange = (field: keyof CartItem, value: string | number) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      [field]: value
    });
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  };

  const getTotalQuantity = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!signer || !currentAddress || cartItems.length === 0) {
      setError('ウォレット接続または商品の追加が必要です');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const totalAmount = getTotalAmount().toString();
      
      // 残高チェック
      const balanceCheck = await checkSufficientBalance(signer, totalAmount);
      if (!balanceCheck.sufficient) {
        setError(
          `JPYC残高が不足しています。\n` +
          `必要金額: ${balanceCheck.required} JPYC\n` +
          `現在残高: ${balanceCheck.currentBalance} JPYC\n` +
          `不足分: ${(balanceCheck.required - balanceCheck.currentBalance).toFixed(2)} JPYC`
        );
        return;
      }

      // 各商品の店舗（実際は1つの代表アドレスに送金）
      const recipientAddress = '0x1234567890123456789012345678901234567890'; // デフォルト受取アドレス
      const receipt = await transferJPYC(signer, recipientAddress, totalAmount);
      
      setSuccess(`決済が完了しました！\n合計: ${totalAmount} JPYC\nTxHash: ${receipt.hash}`);
      onPaymentComplete?.(receipt.hash);

      // カートをクリア
      saveCartItems([]);

    } catch (e: any) {
      let errorMessage = e.message || 'Unknown error';
      
      if (errorMessage.includes('user rejected')) {
        setError('ユーザーによって取引がキャンセルされました');
      } else if (errorMessage.includes('invalid value')) {
        setError('JPYCトークンが見つかりません。正しいネットワークに接続してください。');
      } else {
        setError(`決済に失敗しました: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const emojiOptions = ['🛍️', '☕', '🥪', '🍔', '🍰', '📱', '👕', '📚', '🎁', '💎', '🌟', '🔥'];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
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
          <p style={{ color: '#6b7280', margin: 0 }}>ショッピングカートにはウォレットの接続が必要です</p>
        </div>
      ) : (
        <>
          {/* ヘッダー */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#1f2937', fontSize: '24px', fontWeight: 'bold' }}>
                  🛒 ショッピングカート
                </h2>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  テスト用カート - 商品の追加・編集・決済が行えます
                </p>
              </div>
              
              <button
                onClick={handleAddItem}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>➕</span>
                商品追加
              </button>
            </div>

            {/* カート統計 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '20px' }}>
              <div style={{ backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8' }}>{cartItems.length}</div>
                <div style={{ fontSize: '12px', color: '#1e40af' }}>商品種類</div>
              </div>
              
              <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>
                  {getTotalQuantity()}
                </div>
                <div style={{ fontSize: '12px', color: '#166534' }}>合計数量</div>
              </div>

              <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>
                  {getTotalAmount().toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#92400e' }}>合計金額 (JPYC)</div>
              </div>
            </div>
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
                <span style={{ fontWeight: '500' }}>決済完了</span>
              </div>
              <div style={{ fontSize: '14px', color: '#15803d', whiteSpace: 'pre-line' }}>
                {success}
              </div>
            </div>
          )}

          {/* カート内容 */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px', opacity: '0.5' }}>🛒</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#6b7280', fontWeight: '500' }}>カートが空です</h3>
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                  「商品追加」ボタンからテスト用商品を追加してください
                </p>
              </div>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>カート内商品</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '15px',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '32px' }}>{item.image}</span>
                        
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '16px' }}>
                            {item.name}
                          </h4>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                            {item.description}
                          </p>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            店舗: {item.merchantName} (ID: {item.merchantId})
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>単価</div>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.price} JPYC</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </button>
                            
                            <span style={{ 
                              minWidth: '40px', 
                              textAlign: 'center', 
                              fontWeight: '600',
                              fontSize: '14px'
                            }}>
                              {item.quantity}
                            </span>
                            
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              disabled={item.quantity >= (item.maxStock || 999)}
                            >
                              +
                            </button>
                          </div>

                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>小計</div>
                            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1f2937' }}>
                              {(parseFloat(item.price) * item.quantity).toLocaleString()} JPYC
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleEditItem(item)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 合計と決済 */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                      合計: {getTotalAmount().toLocaleString()} JPYC ({getTotalQuantity()}点)
                    </div>
                    
                    <button
                      onClick={handleCheckout}
                      disabled={loading || cartItems.length === 0}
                      style={{
                        padding: '15px 30px',
                        backgroundColor: loading ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '16px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {loading ? '決済中...' : `💳 ${getTotalAmount().toLocaleString()} JPYC で決済`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 商品編集モーダル */}
          {editingItem && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '30px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                  {isCreating ? '新商品追加' : '商品編集'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                      商品名
                    </label>
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="商品名を入力"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                        価格 (JPYC)
                      </label>
                      <input
                        type="number"
                        value={editingItem.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        min="0"
                        step="1"
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                        数量
                      </label>
                      <input
                        type="number"
                        value={editingItem.quantity}
                        onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      アイコン
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                      {emojiOptions.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleInputChange('image', emoji)}
                          style={{
                            padding: '8px',
                            border: `2px solid ${editingItem.image === emoji ? '#3b82f6' : '#e5e7eb'}`,
                            borderRadius: '6px',
                            backgroundColor: editingItem.image === emoji ? '#dbeafe' : '#ffffff',
                            fontSize: '20px',
                            cursor: 'pointer'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                      説明
                    </label>
                    <textarea
                      value={editingItem.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '6px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                      placeholder="商品の説明を入力"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                        店舗名
                      </label>
                      <input
                        type="text"
                        value={editingItem.merchantName}
                        onChange={(e) => handleInputChange('merchantName', e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                        店舗ID
                      </label>
                      <input
                        type="text"
                        value={editingItem.merchantId}
                        onChange={(e) => handleInputChange('merchantId', e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'end', marginTop: '25px' }}>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setIsCreating(false);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveItem}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    {isCreating ? '追加' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomShoppingCart;