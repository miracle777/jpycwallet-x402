import React, { useState, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { generateQRCode, createPaymentRequest, qrDataToPaymentRequest, isPaymentRequestValid } from '../lib/qr-payment';
import { transferJPYC } from '../lib/jpyc';
import { ethers } from 'ethers';
import type { PaymentRequest } from '../lib/types';

interface QRPaymentProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string) => void;
}

const QRPayment: React.FC<QRPaymentProps> = ({
  currentAddress,
  signer,
  onPaymentComplete
}) => {
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');
  const [qrCode, setQrCode] = useState<string>('');
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // QR生成用フォーム
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  // QRスキャン用
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const generateQR = async () => {
    if (!recipientAddress || !amount) {
      setError('受取アドレスと金額を入力してください');
      return;
    }

    try {
      setError('');
      const request = createPaymentRequest(recipientAddress, amount, description);
      const qrDataUrl = await generateQRCode(request);
      setPaymentRequest(request);
      setQrCode(qrDataUrl);
    } catch (e) {
      setError('QRコードの生成に失敗しました');
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) return;
    
    try {
      setError('');
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
      
      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          onDecodeError: () => {
            // エラーは無視（継続スキャン）
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      
      scannerRef.current = scanner;
      await scanner.start();
    } catch (e) {
      setError('カメラアクセスに失敗しました');
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
  };

  const handleScanResult = (qrData: string) => {
    stopScanning();
    
    const request = qrDataToPaymentRequest(qrData);
    if (!request) {
      setError('無効なQRコードです');
      return;
    }
    
    if (!isPaymentRequestValid(request)) {
      setError('期限切れまたは無効な支払いリクエストです');
      return;
    }
    
    setPaymentRequest(request);
    setError('');
  };

  const executePayment = async () => {
    if (!paymentRequest || !signer) {
      setError('支払い情報またはウォレット接続が不足しています');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const receipt = await transferJPYC(signer, paymentRequest.to, paymentRequest.amount);
      setSuccess(`支払いが完了しました！ TxHash: ${receipt.hash}`);
      setPaymentRequest(null);
      onPaymentComplete?.(receipt.hash);
    } catch (e: any) {
      setError(`支払いに失敗しました: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setQrCode('');
    setPaymentRequest(null);
    setError('');
    setSuccess('');
    setRecipientAddress('');
    setAmount('');
    setDescription('');
    stopScanning();
  };

  const styles = {
    container: {
      maxWidth: '500px',
      margin: '0 auto',
      padding: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      backgroundColor: '#ffffff',
    },
    modeSelector: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
    },
    button: {
      padding: '10px 20px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    activeButton: {
      backgroundColor: '#2563eb',
      color: 'white',
      borderColor: '#2563eb',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '15px',
      marginBottom: '20px',
    },
    input: {
      padding: '12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '16px',
    },
    qrDisplay: {
      textAlign: 'center' as const,
      padding: '20px',
    },
    video: {
      width: '100%',
      maxWidth: '300px',
      height: 'auto',
    },
    paymentInfo: {
      backgroundColor: '#f3f4f6',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '15px',
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
      <h3>QRコード決済</h3>
      
      {/* モード選択 */}
      <div style={styles.modeSelector}>
        <button
          style={{
            ...styles.button,
            ...(mode === 'generate' ? styles.activeButton : {}),
          }}
          onClick={() => { setMode('generate'); resetState(); }}
        >
          📱 QR生成（受け取り）
        </button>
        <button
          style={{
            ...styles.button,
            ...(mode === 'scan' ? styles.activeButton : {}),
          }}
          onClick={() => { setMode('scan'); resetState(); }}
        >
          📷 QRスキャン（支払い）
        </button>
      </div>

      {/* エラー・成功メッセージ */}
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* QR生成モード */}
      {mode === 'generate' && (
        <>
          {!qrCode ? (
            <div style={styles.form}>
              <input
                type="text"
                placeholder="受取アドレス"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                style={styles.input}
              />
              <input
                type="number"
                placeholder="金額（JPYC）"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="説明（任意）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.input}
              />
              <button onClick={generateQR} style={{...styles.button, ...styles.activeButton}}>
                QRコードを生成
              </button>
            </div>
          ) : (
            <div style={styles.qrDisplay}>
              <img src={qrCode} alt="Payment QR Code" />
              <div style={styles.paymentInfo}>
                <div><strong>金額:</strong> {paymentRequest?.amount} JPYC</div>
                <div><strong>受取:</strong> {paymentRequest?.to}</div>
                {paymentRequest?.description && (
                  <div><strong>説明:</strong> {paymentRequest.description}</div>
                )}
              </div>
              <button onClick={resetState} style={styles.button}>
                新しいQRコードを作成
              </button>
            </div>
          )}
        </>
      )}

      {/* QRスキャンモード */}
      {mode === 'scan' && (
        <>
          {!currentAddress && (
            <div style={styles.error}>
              支払いを行うには先にウォレットを接続してください
            </div>
          )}
          
          {!paymentRequest ? (
            <div>
              <video ref={videoRef} style={styles.video} />
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  onClick={startScanning}
                  style={{...styles.button, ...styles.activeButton}}
                  disabled={!currentAddress}
                >
                  📷 スキャン開始
                </button>
                <button onClick={stopScanning} style={styles.button}>
                  停止
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={styles.paymentInfo}>
                <h4>支払い確認</h4>
                <div><strong>支払先:</strong> {paymentRequest.to}</div>
                <div><strong>金額:</strong> {paymentRequest.amount} JPYC</div>
                <div><strong>ネットワーク:</strong> Chain ID {paymentRequest.chainId}</div>
                {paymentRequest.description && (
                  <div><strong>説明:</strong> {paymentRequest.description}</div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={executePayment}
                  style={{...styles.button, ...styles.activeButton}}
                  disabled={loading || !signer}
                >
                  {loading ? '送信中...' : '支払いを実行'}
                </button>
                <button onClick={resetState} style={styles.button}>
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QRPayment;