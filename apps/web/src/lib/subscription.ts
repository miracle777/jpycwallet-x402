import type { SubscriptionPlan } from './types';

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'ベーシック',
    description: '基本機能をお楽しみいただけるプランです',
    price: 500,
    duration: 30,
    features: [
      '月5記事まで閲覧可能',
      '基本APIアクセス (100req/day)',
      'コミュニティフォーラム参加',
      'メールサポート',
    ],
  },
  {
    id: 'pro',
    name: 'プロフェッショナル',
    description: 'より多くの機能と特典をご利用いただけます',
    price: 2000,
    duration: 30,
    features: [
      '記事無制限閲覧',
      '高速APIアクセス (1000req/day)',
      'プライベートチャンネル',
      '優先サポート',
      '限定ウェビナー参加権',
      'NFT特典',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'エンタープライズ',
    description: '企業・団体向けの最上位プランです',
    price: 5000,
    duration: 30,
    features: [
      'すべての機能無制限利用',
      '専用APIキー (10,000req/day)',
      '専属コンサルタント',
      '24時間サポート',
      'カスタム機能開発相談',
      'ホワイトラベル利用権',
      '年次戦略ミーティング',
    ],
  },
];

// サブスクリプション状態管理用（簡易実装）
export interface UserSubscription {
  planId: string;
  startDate: number;    // タイムスタンプ
  endDate: number;      // タイムスタンプ
  txHash: string;       // 支払いトランザクション
  status: 'active' | 'expired' | 'cancelled';
}

// ローカルストレージでのサブスクリプション管理（実際はバックエンドで管理）
export function getUserSubscriptions(walletAddress: string): UserSubscription[] {
  const key = `subscription_${walletAddress}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

export function saveUserSubscription(walletAddress: string, subscription: UserSubscription) {
  const key = `subscription_${walletAddress}`;
  const existing = getUserSubscriptions(walletAddress);
  const updated = [...existing, subscription];
  localStorage.setItem(key, JSON.stringify(updated));
}

export function getActiveSubscription(walletAddress: string): UserSubscription | null {
  const subscriptions = getUserSubscriptions(walletAddress);
  const now = Date.now();
  
  const active = subscriptions.find(sub => 
    sub.status === 'active' && 
    sub.startDate <= now && 
    sub.endDate > now
  );
  
  return active || null;
}

export function isSubscriptionActive(walletAddress: string): boolean {
  return getActiveSubscription(walletAddress) !== null;
}