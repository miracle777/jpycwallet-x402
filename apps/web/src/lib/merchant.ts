// 店舗情報の型定義
export interface MerchantInfo {
  name: string;         // 店舗名
  id: string;          // 店舗ID
  description?: string; // 店舗説明（オプション）
  recipientAddress: string; // 受取りアドレス
  category?: string;   // カテゴリ（例: レストラン、小売、サービス）
  location?: string;   // 場所（オプション）
  website?: string;    // ウェブサイトURL（オプション）
  logoUrl?: string;    // ロゴ画像URL（オプション）
}

// 決済リクエスト情報の型定義（店舗情報を含む）
export interface PaymentRequestWithMerchant {
  amount: string;
  currency: string;
  to: string;
  merchant: MerchantInfo;
  description?: string;
  timestamp: number;
  expires?: number;
  reference?: string;    // 注文番号や参照ID
  items?: PaymentItem[]; // 購入アイテム（オプション）
}

// 購入アイテムの型定義
export interface PaymentItem {
  name: string;
  price: string;
  quantity: number;
  description?: string;
  category?: string;
}

// QRコード形式の選択
export type QRCodeFormat = 'json' | 'ethereum' | 'jpyc';

// デフォルト店舗情報のサンプル
export const defaultMerchantInfo: MerchantInfo = {
  name: 'テスト店舗',
  id: 'TEST_SHOP_001',
  description: 'サンプル店舗です',
  recipientAddress: '0x0000000000000000000000000000000000000000',
  category: 'テスト',
  location: '東京都',
  website: 'https://example.com'
};

// よく使われる店舗カテゴリ
export const merchantCategories = [
  'レストラン・飲食',
  '小売・ショッピング',
  'サービス業',
  'エンターテイメント',
  '教育・学習',
  '医療・健康',
  '交通・運輸',
  'その他'
] as const;

// 店舗情報のバリデーション
export const validateMerchantInfo = (merchant: Partial<MerchantInfo>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!merchant.name || merchant.name.trim().length === 0) {
    errors.push('店舗名は必須です');
  }

  if (!merchant.id || merchant.id.trim().length === 0) {
    errors.push('店舗IDは必須です');
  } else if (!/^[A-Z0-9_]+$/.test(merchant.id)) {
    errors.push('店舗IDは英数字とアンダースコアのみ使用可能です');
  }

  if (!merchant.recipientAddress || merchant.recipientAddress.trim().length === 0) {
    errors.push('受取りアドレスは必須です');
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(merchant.recipientAddress)) {
    errors.push('受取りアドレスの形式が正しくありません');
  }

  if (merchant.website && merchant.website.trim().length > 0) {
    try {
      new URL(merchant.website);
    } catch {
      errors.push('ウェブサイトURLの形式が正しくありません');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// 決済リクエストを生成する関数
export const createPaymentRequest = (
  merchant: MerchantInfo,
  amount: string,
  currency: string = 'JPYC',
  options?: {
    description?: string;
    reference?: string;
    items?: PaymentItem[];
    expiresInMinutes?: number;
  }
): PaymentRequestWithMerchant => {
  const now = Date.now();
  const expires = options?.expiresInMinutes 
    ? now + (options.expiresInMinutes * 60 * 1000)
    : now + (30 * 60 * 1000); // デフォルト30分

  return {
    amount,
    currency,
    to: merchant.recipientAddress,
    merchant,
    description: options?.description || `${merchant.name}での決済`,
    timestamp: now,
    expires,
    reference: options?.reference,
    items: options?.items
  };
};

// 決済リクエストをQRコードデータに変換
export const paymentRequestToQRData = (
  paymentRequest: PaymentRequestWithMerchant,
  format: QRCodeFormat = 'json'
): string => {
  switch (format) {
    case 'json':
      // 新しいJPYC決済形式（店舗情報付き）
      return JSON.stringify({
        type: 'JPYC_PAYMENT',
        version: '1.0',
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        network: 'sepolia',
        contractAddress: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
        contractName: '公式JPYC (Sepolia)',
        merchant: paymentRequest.merchant,
        to: paymentRequest.to,
        description: paymentRequest.description,
        timestamp: paymentRequest.timestamp,
        expires: paymentRequest.expires,
        reference: paymentRequest.reference,
        items: paymentRequest.items
      });

    case 'ethereum':
      // シンプルなEthereumアドレス形式
      return `ethereum:${paymentRequest.to}`;

    case 'jpyc':
      // 旧JPYC形式
      return `jpyc:amount=${paymentRequest.amount}&to=${paymentRequest.to}&merchant=${encodeURIComponent(paymentRequest.merchant.name)}`;

    default:
      return JSON.stringify(paymentRequest);
  }
};

// QRコードデータから店舗情報を抽出
export const extractMerchantFromQRData = (qrData: string): MerchantInfo | null => {
  try {
    // JSON形式の場合
    if (qrData.startsWith('{')) {
      const parsed = JSON.parse(qrData);
      if (parsed.merchant && typeof parsed.merchant === 'object') {
        return parsed.merchant as MerchantInfo;
      }
    }

    // JPYC形式の場合
    if (qrData.startsWith('jpyc:')) {
      const merchantMatch = qrData.match(/merchant=([^&]+)/);
      if (merchantMatch) {
        const merchantName = decodeURIComponent(merchantMatch[1]);
        return {
          name: merchantName,
          id: merchantName.toUpperCase().replace(/\s+/g, '_'),
          recipientAddress: '0x0000000000000000000000000000000000000000',
          description: `${merchantName}からの決済リクエスト`
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting merchant info:', error);
    return null;
  }
};

// 店舗情報のマスキング（ログ出力用）
export const maskMerchantInfo = (merchant: MerchantInfo): Partial<MerchantInfo> => {
  return {
    ...merchant,
    recipientAddress: `${merchant.recipientAddress.slice(0, 6)}...${merchant.recipientAddress.slice(-4)}`
  };
};

// 店舗情報の表示用フォーマット
export const formatMerchantDisplay = (merchant: MerchantInfo): string => {
  let display = merchant.name;
  if (merchant.location) {
    display += ` (${merchant.location})`;
  }
  return display;
};