import React, { useState, useReducer } from 'react';
import { ethers } from 'ethers';
import { transferJPYC, checkSufficientBalance } from '../lib/jpyc';
import { sampleProducts, merchantAddress } from '../lib/products';
import type { Cart, CartItem, Product } from '../lib/types';

interface CartState extends Cart {}

type CartAction = 
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR_CART' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.product.id === action.product.id);
      let newItems: CartItem[];
      
      if (existingItem) {
        newItems = state.items.map(item =>
          item.product.id === action.product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...state.items, { product: action.product, quantity: 1 }];
      }
      
      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      return { items: newItems, total };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.product.id !== action.productId);
      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      return { items: newItems, total };
    }
    
    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.product.id === action.productId
          ? { ...item, quantity: Math.max(0, action.quantity) }
          : item
      ).filter(item => item.quantity > 0);
      
      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      return { items: newItems, total };
    }
    
    case 'CLEAR_CART':
      return { items: [], total: 0 };
    
    default:
      return state;
  }
}

interface ShoppingCartProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string, amount: number) => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
}) => {
  const [cart, dispatch] = useReducer(cartReducer, { items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  const [showCart, setShowCart] = useState(false);

  const addToCart = (product: Product) => {
    dispatch({ type: 'ADD_ITEM', product });
  };

  const removeFromCart = (productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', productId });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const checkout = async () => {
    if (!signer || cart.items.length === 0) {
      setError('カートが空です');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const totalAmount = cart.total.toString();
      
      // 残高チェック
      const balanceCheck = await checkSufficientBalance(signer, totalAmount);
      if (!balanceCheck.sufficient) {
        setError(
          `JPYC残高が不足しています。\n` +
          `必要金額: ${balanceCheck.required} JPYC\n` +
          `現在残高: ${balanceCheck.currentBalance} JPYC\n` +
          `不足分: ${(balanceCheck.required - balanceCheck.currentBalance).toFixed(2)} JPYC\n\n` +
          `💧 テスト用JPYCの取得方法:\n` +
          `ウォレット接続画面のFaucetリンクから取得できます。`
        );
        return;
      }

      // カート内容をまとめて決済
      const description = `購入商品: ${cart.items.map(item => 
        `${item.product.name}×${item.quantity}`
      ).join(', ')}`;

      const receipt = await transferJPYC(signer, merchantAddress, totalAmount);
      
      setSuccess(`決済が完了しました！ TxHash: ${receipt.hash}`);
      onPaymentComplete?.(receipt.hash, cart.total);
      
      // カートをクリア
      clearCart();
    } catch (e: any) {
      let errorMessage = e.message || 'Unknown error';
      
      if (errorMessage.includes('JPYC残高が不足しています')) {
        setError(errorMessage);
      } else if (errorMessage.includes('invalid value for Contract target')) {
        setError(
          'JPYCトークンが見つかりません。\n' +
          '1. ウォレットにJPYCトークンを追加してください\n' +
          '2. テストネットの場合は、Faucetからテスト用JPYCを取得してください'
        );
      } else if (errorMessage.includes('user rejected')) {
        setError('ユーザーによって取引がキャンセルされました');
      } else {
        setError(`決済に失敗しました: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
    },
    productsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    productCard: {
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    button: {
      padding: '10px 15px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      transition: 'all 0.2s',
    },
    addButton: {
      backgroundColor: '#2563eb',
      color: 'white',
    },
    cartHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      borderRadius: '12px 12px 0 0',
    },
    cartContent: {
      border: '1px solid #e5e7eb',
      borderRadius: '0 0 12px 12px',
      backgroundColor: '#ffffff',
    },
    cartItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      borderBottom: '1px solid #f3f4f6',
    },
    quantityControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    quantityButton: {
      width: '30px',
      height: '30px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkoutSection: {
      padding: '20px',
      borderTop: '2px solid #e5e7eb',
      backgroundColor: '#f9fafb',
    },
    error: {
      color: '#dc2626',
      backgroundColor: '#fee2e2',
      padding: '10px',
      borderRadius: '8px',
      marginBottom: '15px',
    },
    success: {
      color: '#059669',
      backgroundColor: '#d1fae5',
      padding: '10px',
      borderRadius: '8px',
      marginBottom: '15px',
    },
  };

  return (
    <div style={styles.container}>
      <h3>🛍️ ショッピング & カート機能</h3>

      {/* エラー・成功メッセージ */}
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* 商品一覧 */}
      <div style={styles.productsGrid}>
        {sampleProducts.map((product) => (
          <div key={product.id} style={styles.productCard}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
              {product.name}
            </h4>
            <p style={{ margin: '0 0 10px 0', color: '#6b7280', fontSize: '14px' }}>
              {product.description}
            </p>
            <div style={{ margin: '10px 0', fontSize: '16px', fontWeight: 600 }}>
              {product.price} JPYC
            </div>
            <div style={{ margin: '10px 0', fontSize: '12px', color: '#9ca3af' }}>
              カテゴリ: {product.category}
            </div>
            <button
              style={{...styles.button, ...styles.addButton}}
              onClick={() => addToCart(product)}
              disabled={!product.available}
            >
              {product.available ? '🛒 カートに追加' : '在庫切れ'}
            </button>
          </div>
        ))}
      </div>

      {/* カート */}
      <div>
        <div style={styles.cartHeader}>
          <h4 style={{ margin: 0 }}>
            🛒 ショッピングカート ({cart.items.length}点)
          </h4>
          <button
            style={styles.button}
            onClick={() => setShowCart(!showCart)}
          >
            {showCart ? '▲ 閉じる' : '▼ 開く'}
          </button>
        </div>

        {showCart && (
          <div style={styles.cartContent}>
            {cart.items.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                カートは空です
              </div>
            ) : (
              <>
                {cart.items.map((item) => (
                  <div key={item.product.id} style={styles.cartItem}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {item.product.price} JPYC × {item.quantity} = {item.product.price * item.quantity} JPYC
                      </div>
                    </div>
                    
                    <div style={styles.quantityControls}>
                      <button
                        style={styles.quantityButton}
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span style={{ minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        style={styles.quantityButton}
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        style={{
                          ...styles.button,
                          backgroundColor: '#dc2626',
                          color: 'white',
                          padding: '5px 10px',
                          fontSize: '12px',
                          marginLeft: '10px',
                        }}
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                ))}

                <div style={styles.checkoutSection}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      合計: {cart.total} JPYC
                    </div>
                    <button
                      style={{
                        ...styles.button,
                        backgroundColor: '#dc2626',
                        color: 'white',
                      }}
                      onClick={clearCart}
                    >
                      🗑️ カートをクリア
                    </button>
                  </div>

                  {!currentAddress ? (
                    <div style={{ textAlign: 'center', color: '#6b7280' }}>
                      決済を行うには先にウォレットを接続してください
                    </div>
                  ) : (
                    <button
                      style={{
                        ...styles.button,
                        backgroundColor: '#059669',
                        color: 'white',
                        width: '100%',
                        padding: '15px',
                        fontSize: '16px',
                      }}
                      onClick={checkout}
                      disabled={loading || cart.items.length === 0}
                    >
                      {loading ? '決済処理中...' : '🎯 JPYC で決済する'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart;