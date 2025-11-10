import QRCode from 'qrcode';
import type { PaymentRequest } from './types';

// QRコード用のURLスキーム定義
const QR_SCHEME = 'jpyc-payment:';

export function createPaymentRequest(
  to: string,
  amount: string,
  description?: string
): PaymentRequest {
  return {
    to,
    amount,
    currency: 'JPYC',
    chainId: Number(import.meta.env.VITE_CHAIN_ID) || 80002,
    description,
    requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    expiry: Date.now() + (15 * 60 * 1000), // 15分後に期限切れ
  };
}

export function paymentRequestToQRData(request: PaymentRequest): string {
  const params = new URLSearchParams({
    to: request.to,
    amount: request.amount,
    currency: request.currency,
    chainId: request.chainId.toString(),
    ...(request.description && { description: request.description }),
    ...(request.requestId && { requestId: request.requestId }),
    ...(request.expiry && { expiry: request.expiry.toString() }),
  });
  
  return `${QR_SCHEME}${params.toString()}`;
}

export function qrDataToPaymentRequest(qrData: string): PaymentRequest | null {
  if (!qrData.startsWith(QR_SCHEME)) {
    return null;
  }
  
  const paramString = qrData.slice(QR_SCHEME.length);
  const params = new URLSearchParams(paramString);
  
  const to = params.get('to');
  const amount = params.get('amount');
  const currency = params.get('currency');
  const chainId = params.get('chainId');
  
  if (!to || !amount || !currency || !chainId) {
    return null;
  }
  
  return {
    to,
    amount,
    currency,
    chainId: parseInt(chainId),
    description: params.get('description') || undefined,
    requestId: params.get('requestId') || undefined,
    expiry: params.get('expiry') ? parseInt(params.get('expiry')!) : undefined,
  };
}

export async function generateQRCode(request: PaymentRequest): Promise<string> {
  const qrData = paymentRequestToQRData(request);
  return await QRCode.toDataURL(qrData, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

export function isPaymentRequestValid(request: PaymentRequest): boolean {
  if (request.expiry && request.expiry < Date.now()) {
    return false; // 期限切れ
  }
  
  const currentChainId = Number(import.meta.env.VITE_CHAIN_ID) || 80002;
  if (request.chainId !== currentChainId) {
    return false; // 異なるネットワーク
  }
  
  return true;
}