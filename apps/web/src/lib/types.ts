export interface PaymentRequest {
  to: string;          // 受取アドレス
  amount: string;      // 支払い金額（JPYC）
  currency: string;    // 通貨（"JPYC"）
  chainId: number;     // ネットワークID
  description?: string; // 支払い説明
  requestId?: string;   // リクエストID（重複防止）
  expiry?: number;     // 期限（タイムスタンプ）
}

export interface PaymentReceipt {
  txHash: string;      // トランザクションハッシュ
  from: string;        // 送信者アドレス
  to: string;         // 受取アドレス
  amount: string;     // 実際の支払い金額
  currency: string;   // 通貨
  chainId: number;    // ネットワークID
  timestamp: number;  // 支払い実行時間
  requestId?: string; // 元のリクエストID
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;       // JPYC単価
  image?: string;
  category?: string;
  available: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;       // JPYC/月
  features: string[];
  duration: number;    // 日数
  popular?: boolean;
}