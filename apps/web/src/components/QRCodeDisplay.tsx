import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  qrData: string;
  amount?: string;
  merchantInfo?: any;
  onRefresh?: () => void;
}

export default function QRCodeDisplay({ 
  qrData, 
  amount, 
  merchantInfo, 
  onRefresh 
}: QRCodeDisplayProps) {
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5分 = 300秒
  const [isExpired, setIsExpired] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  // QRコード生成とデータパース
  useEffect(() => {
    const generateQRImage = async () => {
      try {
        // QRデータをパース
        let parsed = null;
        try {
          parsed = JSON.parse(qrData);
        } catch {
          // JSONでない場合はそのまま使用
          parsed = { data: qrData };
        }
        setParsedData(parsed);

        const imageUrl = await QRCode.toDataURL(qrData, {
          width: 288, // 大きなサイズ（72 * 4）
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        setQrCodeImage(imageUrl);
      } catch (error) {
        console.error('QRコード画像生成エラー:', error);
      }
    };

    if (qrData) {
      generateQRImage();
      setTimeLeft(300); // リセット
      setIsExpired(false);
    }
  }, [qrData]);

  // タイマー
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  // 時間表示のフォーマット
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleRefreshQR = () => {
    // 親コンポーネントに再生成を依頼
    onRefresh?.();
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-6 text-center">決済QRコード</h2>
      
      <div className="text-center space-y-6">
        {/* 支払い先情報表示 */}
        {(parsedData?.merchant || merchantInfo) && (
          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <div className="text-sm text-blue-600 font-medium mb-2">支払い先</div>
            <div className="text-lg font-bold text-blue-900">
              {parsedData?.merchant?.name || merchantInfo?.name}
            </div>
            {(parsedData?.merchant?.id || merchantInfo?.id) && 
             (parsedData?.merchant?.id !== 'N/A') && (
              <div className="text-xs text-blue-700 mt-1">
                ID: {parsedData?.merchant?.id || merchantInfo?.id}
              </div>
            )}
            {(parsedData?.merchant?.description || merchantInfo?.description) && (
              <div className="text-sm text-blue-700 mt-2">
                {parsedData?.merchant?.description || merchantInfo?.description}
              </div>
            )}
          </div>
        )}

        {/* 金額表示 */}
        {(amount || parsedData?.amount) && (
          <div className="bg-green-50 rounded-lg p-6">
            <div className="text-sm text-gray-600">決済金額</div>
            <div className="text-3xl font-bold text-green-600">
              {amount || parsedData?.amount} {parsedData?.currency || 'JPYC'}
            </div>
            {parsedData?.network && (
              <div className="text-xs text-gray-500 mt-1">
                ネットワーク: {parsedData.network.charAt(0).toUpperCase() + parsedData.network.slice(1)}
              </div>
            )}
          </div>
        )}

        {/* QRコード表示 */}
        {qrCodeImage && !isExpired ? (
          <div className="qr-code-container">
            <div className="flex justify-center">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
                <img 
                  src={qrCodeImage} 
                  alt="Payment QR Code" 
                  className="w-72 h-72 mx-auto"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-80 bg-gray-100 rounded-lg">
            <div className="text-center">
              {isExpired ? (
                <>
                  <div className="text-red-600 font-medium mb-4">QRコードが期限切れです</div>
                  <button
                    onClick={handleRefreshQR}
                    className="btn btn-primary"
                  >
                    更新する
                  </button>
                </>
              ) : (
                <div className="text-gray-500">QRコード生成中...</div>
              )}
            </div>
          </div>
        )}

        {/* タイマー表示 */}
        {!isExpired && qrCodeImage && (
          <div className="flex items-center justify-center space-x-2">
            <span className={`inline-block w-3 h-3 rounded-full ${timeLeft > 60 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
            <span className="text-lg font-medium text-gray-600">
              有効期限: {formatTime(timeLeft)}
            </span>
          </div>
        )}

        {/* QRコードデータプレビュー（開発用） */}
        {parsedData && (
          <details className="text-left text-xs text-gray-500 bg-gray-50 rounded-lg">
            <summary className="p-3 cursor-pointer font-medium">QRコードデータを表示</summary>
            <div className="p-3 pt-0">
              <pre className="whitespace-pre-wrap font-mono text-xs overflow-auto">
                {typeof parsedData === 'object' 
                  ? JSON.stringify(parsedData, null, 2) 
                  : parsedData}
              </pre>
            </div>
          </details>
        )}

        {/* 使用方法 */}
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            <p className="flex items-center">
              <span className="inline-block w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center mr-3">1</span>
              お客様にこのQRコードをスキャンしてもらってください
            </p>
            <p className="flex items-center">
              <span className="inline-block w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center mr-3">2</span>
              ウォレットで決済を承認してもらってください
            </p>
            <p className="flex items-center">
              <span className="inline-block w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center mr-3">3</span>
              トランザクションが完了するまでお待ちください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};