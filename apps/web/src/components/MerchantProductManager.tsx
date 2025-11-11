import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  category: string;
  image: string;
  stock: number;
  merchantName: string;
  merchantId: string;
  recipientAddress: string;
}

interface MerchantProductManagerProps {
  currentAddress?: string;
  signer?: ethers.Signer;
}

const MerchantProductManager: React.FC<MerchantProductManagerProps> = ({
  currentAddress,
  signer,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');

  const defaultProduct: Omit<Product, 'id'> = {
    name: '',
    price: '100',
    description: '',
    category: 'general',
    image: '🛍️',
    stock: 10,
    merchantName: 'テスト店舗',
    merchantId: 'TEST_STORE',
    recipientAddress: currentAddress || ''
  };

  // ローカルストレージから商品データを読み込み
  useEffect(() => {
    if (currentAddress) {
      const storageKey = `products_${currentAddress}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        // デフォルト商品を作成
        const defaultProducts: Product[] = [
          {
            id: 'prod_001',
            name: 'コーヒー',
            price: '500',
            description: '香り豊かなオリジナルブレンドコーヒー',
            category: 'beverage',
            image: '☕',
            stock: 50,
            merchantName: 'カフェテスト',
            merchantId: 'CAFE_TEST',
            recipientAddress: currentAddress
          },
          {
            id: 'prod_002',
            name: 'サンドイッチ',
            price: '800',
            description: '新鮮な野菜とハムのサンドイッチ',
            category: 'food',
            image: '🥪',
            stock: 20,
            merchantName: 'カフェテスト',
            merchantId: 'CAFE_TEST',
            recipientAddress: currentAddress
          }
        ];
        setProducts(defaultProducts);
        localStorage.setItem(storageKey, JSON.stringify(defaultProducts));
      }
    }
  }, [currentAddress]);

  // 商品データをローカルストレージに保存
  const saveProducts = (updatedProducts: Product[]) => {
    if (currentAddress) {
      const storageKey = `products_${currentAddress}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedProducts));
      setProducts(updatedProducts);
    }
  };

  const handleCreate = () => {
    setEditingProduct({
      ...defaultProduct,
      recipientAddress: currentAddress || '',
      id: `prod_${Date.now()}`
    } as Product);
    setIsCreating(true);
    setActiveTab('create');
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsCreating(false);
    setActiveTab('edit');
  };

  const handleSave = () => {
    if (!editingProduct) return;

    let updatedProducts: Product[];
    if (isCreating) {
      updatedProducts = [...products, editingProduct];
    } else {
      updatedProducts = products.map(p => 
        p.id === editingProduct.id ? editingProduct : p
      );
    }

    saveProducts(updatedProducts);
    setEditingProduct(null);
    setActiveTab('list');
  };

  const handleDelete = (productId: string) => {
    if (window.confirm('この商品を削除しますか？')) {
      const updatedProducts = products.filter(p => p.id !== productId);
      saveProducts(updatedProducts);
    }
  };

  const handleInputChange = (field: keyof Product, value: string | number) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      [field]: value
    });
  };

  const categories = [
    { value: 'food', label: '食べ物' },
    { value: 'beverage', label: '飲み物' },
    { value: 'electronics', label: '電子機器' },
    { value: 'clothing', label: '衣類' },
    { value: 'books', label: '本・雑誌' },
    { value: 'general', label: 'その他' }
  ];

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
          <p style={{ color: '#6b7280', margin: 0 }}>商品管理にはウォレットの接続が必要です</p>
        </div>
      ) : (
        <>
          {/* ヘッダー */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#1f2937', fontSize: '24px', fontWeight: 'bold' }}>
                  🏪 商品管理
                </h2>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  出品者として商品の追加・編集・削除が行えます
                </p>
              </div>
              
              <button
                onClick={handleCreate}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#3b82f6',
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
                新商品追加
              </button>
            </div>

            {/* 統計 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '20px' }}>
              <div style={{ backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8' }}>{products.length}</div>
                <div style={{ fontSize: '12px', color: '#1e40af' }}>登録商品数</div>
              </div>
              
              <div style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>
                  {products.filter(p => p.stock > 0).length}
                </div>
                <div style={{ fontSize: '12px', color: '#166534' }}>在庫あり</div>
              </div>

              <div style={{ backgroundColor: '#fed7aa', border: '1px solid #fdba74', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>
                  {products.reduce((sum, p) => sum + p.stock, 0)}
                </div>
                <div style={{ fontSize: '12px', color: '#c2410c' }}>総在庫数</div>
              </div>
            </div>
          </div>

          {/* タブナビゲーション */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
            <div style={{ borderBottom: '1px solid #e5e7eb' }}>
              <nav style={{ display: 'flex', gap: '30px', paddingLeft: '25px' }}>
                {[
                  { id: 'list', label: '商品一覧', icon: '📋' },
                  { id: 'create', label: '新規作成', icon: '➕' },
                  ...(editingProduct && !isCreating ? [{ id: 'edit', label: '編集中', icon: '✏️' }] : [])
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: '15px 5px',
                      border: 'none',
                      borderBottom: `2px solid ${activeTab === tab.id ? '#3b82f6' : 'transparent'}`,
                      backgroundColor: 'transparent',
                      fontWeight: '500',
                      fontSize: '14px',
                      color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div style={{ padding: '25px' }}>
              {/* 商品一覧タブ */}
              {activeTab === 'list' && (
                <div>
                  {products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                      <div style={{ fontSize: '64px', marginBottom: '20px', opacity: '0.5' }}>🛍️</div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#6b7280', fontWeight: '500' }}>商品がありません</h3>
                      <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                        「新商品追加」ボタンから最初の商品を登録してください
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {products.map((product) => (
                        <div
                          key={product.id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '20px',
                            backgroundColor: '#fafafa',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                            <span style={{ fontSize: '32px' }}>{product.image}</span>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '16px' }}>
                                {product.name}
                              </h4>
                              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                                {categories.find(c => c.value === product.category)?.label}
                              </p>
                            </div>
                          </div>

                          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.4' }}>
                            {product.description || '説明なし'}
                          </p>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>価格</div>
                              <div style={{ fontWeight: '700', color: '#1f2937', fontSize: '16px' }}>
                                {product.price} JPYC
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>在庫</div>
                              <div style={{ 
                                fontWeight: '700', 
                                fontSize: '16px',
                                color: product.stock > 0 ? '#15803d' : '#dc2626'
                              }}>
                                {product.stock}個
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEdit(product)}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 商品作成・編集フォーム */}
              {(activeTab === 'create' || activeTab === 'edit') && editingProduct && (
                <div>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                    {isCreating ? '新商品追加' : '商品編集'}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 基本情報 */}
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600' }}>📦 基本情報</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                            商品名
                          </label>
                          <input
                            type="text"
                            value={editingProduct.name}
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
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                            価格 (JPYC)
                          </label>
                          <input
                            type="number"
                            value={editingProduct.price}
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
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                            カテゴリ
                          </label>
                          <select
                            value={editingProduct.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '10px', 
                              border: '1px solid #d1d5db', 
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          >
                            {categories.map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                            在庫数
                          </label>
                          <input
                            type="number"
                            value={editingProduct.stock}
                            onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                            style={{ 
                              width: '100%', 
                              padding: '10px', 
                              border: '1px solid #d1d5db', 
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                            min="0"
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                          説明
                        </label>
                        <textarea
                          value={editingProduct.description}
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
                          placeholder="商品の詳細説明を入力"
                        />
                      </div>
                    </div>

                    {/* 表示設定 */}
                    <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '20px', border: '1px solid #0ea5e9' }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600' }}>🎨 表示設定</h4>
                      
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
                                border: `2px solid ${editingProduct.image === emoji ? '#3b82f6' : '#e5e7eb'}`,
                                borderRadius: '6px',
                                backgroundColor: editingProduct.image === emoji ? '#dbeafe' : '#ffffff',
                                fontSize: '20px',
                                cursor: 'pointer'
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 店舗情報 */}
                    <div style={{ backgroundColor: '#fefce8', borderRadius: '8px', padding: '20px', border: '1px solid #facc15' }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600' }}>🏪 店舗情報</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                            店舗名
                          </label>
                          <input
                            type="text"
                            value={editingProduct.merchantName}
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
                            value={editingProduct.merchantId}
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

                    {/* ボタン */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'end' }}>
                      <button
                        onClick={() => {
                          setEditingProduct(null);
                          setActiveTab('list');
                        }}
                        style={{
                          padding: '12px 20px',
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
                        onClick={handleSave}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        {isCreating ? '商品を追加' : '変更を保存'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MerchantProductManager;