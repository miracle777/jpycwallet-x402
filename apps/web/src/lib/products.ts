import type { Product } from './types';

export const sampleProducts: Product[] = [
  {
    id: 'prod_001',
    name: 'デジタルコンテンツA',
    description: 'プレミアム記事・動画アクセス権（1ヶ月）',
    price: 500,
    category: 'digital',
    available: true,
  },
  {
    id: 'prod_002', 
    name: 'オンライン講座B',
    description: 'ブロックチェーン入門講座（3ヶ月アクセス）',
    price: 2000,
    category: 'education',
    available: true,
  },
  {
    id: 'prod_003',
    name: 'NFTアート',
    description: '限定デジタルアート作品',
    price: 1000,
    category: 'nft',
    available: true,
  },
  {
    id: 'prod_004',
    name: 'API利用権',
    description: '高速APIアクセス（1,000リクエスト/月）',
    price: 300,
    category: 'api',
    available: true,
  },
  {
    id: 'prod_005',
    name: 'プライベートコンサル',
    description: '1対1技術相談（1時間）',
    price: 5000,
    category: 'service',
    available: true,
  },
];

export const merchantAddress = '0x742d35Cc7a8B82b8D2B9bD7a1B5C9e8F1D0A2C3B'; // サンプル受取アドレス