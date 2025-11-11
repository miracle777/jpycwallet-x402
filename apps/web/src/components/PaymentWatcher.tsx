import { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';

interface PaymentWatcherProps {
  amount: string;
  recipientAddress?: string;
  onSuccess: (txHash: string) => void;
  contractAddress: string;
  enabled?: boolean;
}

export const PaymentWatcher: React.FC<PaymentWatcherProps> = ({
  amount,
  recipientAddress,
  onSuccess,
  contractAddress,
  enabled = true
}) => {
  const [isWatching, setIsWatching] = useState(false);
  const lastBlockCheckedRef = useRef<number>(0); // useRefに変更
  const providerRef = useRef<ethers.Provider | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !recipientAddress || !amount) {
      console.log('⚠️ PaymentWatcher: 監視条件が満たされていません', {
        enabled,
        recipientAddress,
        amount
      });
      return;
    }

    const startWatching = async () => {
      try {
        // Alchemy や Infura など CORS対応のRPCプロバイダーを使用
        // publicなSepoliaエンドポイントを使用
        const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        providerRef.current = provider;

        // 現在のブロック番号を取得
        const currentBlock = await provider.getBlockNumber();
        lastBlockCheckedRef.current = currentBlock;
        setIsWatching(true);

        console.log('🚀 決済監視を開始しました!', {
          recipient: recipientAddress,
          amount: amount,
          contractAddress: contractAddress,
          fromBlock: currentBlock,
          currentTime: new Date().toLocaleTimeString()
        });

        // ERC20 Transfer イベントのABI
        const erc20Interface = new ethers.Interface([
          'event Transfer(address indexed from, address indexed to, uint256 value)'
        ]);

        // ログ処理関数
        const processLog = async (log: any): Promise<boolean> => {
          try {
            const parsedLog = erc20Interface.parseLog({
              topics: [...log.topics],
              data: log.data
            });

            if (parsedLog) {
              const transferAmount = ethers.formatUnits(parsedLog.args.value, 18);
              const expectedAmount = parseFloat(amount);
              const actualAmount = parseFloat(transferAmount);

              console.log('💸 Transfer検出:', {
                from: parsedLog.args.from,
                to: parsedLog.args.to,
                amount: transferAmount,
                expected: amount,
                txHash: log.transactionHash,
                blockNumber: log.blockNumber
              });

              // 金額が一致するかチェック（小数点以下の誤差を許容）
              if (Math.abs(actualAmount - expectedAmount) < 0.01) {
                console.log('✅ ✅ ✅ 決済完了を検出しました! ✅ ✅ ✅');
                console.log('トランザクションハッシュ:', log.transactionHash);
                console.log('送信者:', parsedLog.args.from);
                console.log('受取人:', parsedLog.args.to);
                console.log('金額:', transferAmount, 'JPYC');
                
                if (log.transactionHash) {
                  onSuccess(log.transactionHash);
                  setIsWatching(false);
                  
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                  }
                  return true;
                }
              } else {
                console.log('⚠️ 金額不一致:', {
                  expected: expectedAmount,
                  actual: actualAmount,
                  difference: Math.abs(actualAmount - expectedAmount)
                });
              }
            }
          } catch (parseError) {
            console.error('ログ解析エラー:', parseError);
          }
          return false;
        };

        // 過去のブロックもチェック（開始前の100ブロック、約20分前）
        console.log(`📋 過去100ブロックをチェックします...`);
        try {
          const pastLogs = await provider.getLogs({
            address: contractAddress,
            fromBlock: Math.max(0, currentBlock - 100),
            toBlock: currentBlock,
            topics: [
              ethers.id('Transfer(address,address,uint256)'),
              null,
              ethers.zeroPadValue(recipientAddress, 32)
            ]
          });

          if (pastLogs.length > 0) {
            console.log(`📊 過去のトランザクション: ${pastLogs.length}件`);
            for (const log of pastLogs) {
              const found = await processLog(log);
              if (found) return;
            }
          }
        } catch (error) {
          console.error('過去のブロック確認エラー:', error);
        }

        // 定期的にトランザクションをチェック
        intervalRef.current = setInterval(async () => {
          try {
            const latestBlock = await provider.getBlockNumber();
            const lastChecked = lastBlockCheckedRef.current;
            
            if (latestBlock > lastChecked) {
              console.log(`🔍 ブロックをチェック中: ${lastChecked + 1} → ${latestBlock} (${new Date().toLocaleTimeString()})`);

              // 最新のブロックからトランザクションログを取得
              const logs = await provider.getLogs({
                address: contractAddress,
                fromBlock: lastChecked + 1,
                toBlock: latestBlock,
                topics: [
                  ethers.id('Transfer(address,address,uint256)'),
                  null, // from (any)
                  ethers.zeroPadValue(recipientAddress, 32) // to (recipient)
                ]
              });

              if (logs.length > 0) {
                console.log(`📊 Transfer イベント検出: ${logs.length}件`, logs);
                
                // ログを解析
                for (const log of logs) {
                  const found = await processLog(log);
                  if (found) return;
                }
              }

              lastBlockCheckedRef.current = latestBlock;
            }
          } catch (error) {
            console.error('ブロックチェック中のエラー:', error);
          }
        }, 3000); // 3秒ごとにチェック

      } catch (error) {
        console.error('決済監視の開始に失敗:', error);
        setIsWatching(false);
      }
    };

    startWatching();

    // クリーンアップ
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsWatching(false);
    };
  }, [amount, recipientAddress, contractAddress, enabled, onSuccess]);

  if (!enabled || !recipientAddress || !amount) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#fffbeb',
      border: '1px solid #fbbf24',
      borderRadius: '8px',
      padding: '12px 16px',
      marginTop: '16px',
      fontSize: '14px',
      color: '#92400e'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isWatching ? (
          <>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <span style={{ fontWeight: '500' }}>決済を監視中...</span>
          </>
        ) : (
          <>
            <span>⏳</span>
            <span>監視を準備中...</span>
          </>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#78350f', marginTop: '8px' }}>
        自動監視中: JPYC Transfer → {recipientAddress.substring(0, 10)}... / 金額 {amount} JPYC
      </div>
      <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
        一致するトランザクションが検出されると自動で完了表示に切り替わります。
      </div>
    </div>
  );
};

export default PaymentWatcher;
