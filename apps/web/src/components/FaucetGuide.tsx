import React, { useState } from 'react';
import { NETWORK_INFO, JPYC_TOKENS } from '../lib/wallet-utils';

interface FaucetGuideProps {
  chainId?: number;
  userAddress?: string;
}

const FaucetGuide: React.FC<FaucetGuideProps> = ({ chainId, userAddress }) => {
  const [expandedNetwork, setExpandedNetwork] = useState<number | null>(null);

  const testnetChainIds = [80002, 11155111, 43113]; // Amoy, Sepolia, Fuji
  const networksWithFaucets = testnetChainIds.filter(id => 
    NETWORK_INFO[id]?.faucetInfo && JPYC_TOKENS[id]
  );

  const styles = {
    container: {
      backgroundColor: '#f0f9ff',
      border: '2px solid #0ea5e9',
      borderRadius: '12px',
      padding: '20px',
      margin: '20px 0',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#0c4a6e',
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    networkList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '10px',
    },
    networkItem: {
      backgroundColor: '#ffffff',
      border: '1px solid #e0e7ff',
      borderRadius: '8px',
      padding: '15px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    expandedNetwork: {
      backgroundColor: '#f8fafc',
      borderColor: '#3b82f6',
    },
    networkHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: 600,
    },
    networkDetails: {
      marginTop: '15px',
      fontSize: '14px',
      lineHeight: 1.6,
    },
    stepList: {
      listStyle: 'none',
      padding: 0,
      margin: '10px 0',
    },
    stepItem: {
      padding: '8px 0',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    },
    stepNumber: {
      backgroundColor: '#3b82f6',
      color: 'white',
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 600,
      flexShrink: 0,
    },
    linkButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: 500,
      display: 'inline-block',
      marginTop: '10px',
      transition: 'background-color 0.2s',
    },
    addressInput: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'monospace',
      backgroundColor: '#f9fafb',
    },
    currentNetworkBadge: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
    },
    warning: {
      backgroundColor: '#fef3c7',
      border: '1px solid #f59e0b',
      borderRadius: '8px',
      padding: '12px',
      marginTop: '15px',
      fontSize: '14px',
    },
  };

  const getCurrentNetworkInfo = () => {
    if (!chainId) return null;
    return NETWORK_INFO[chainId];
  };

  const isCurrentNetworkTestnet = () => {
    return chainId && testnetChainIds.includes(chainId);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        💧 テスト用JPYC取得ガイド
      </h3>

      {isCurrentNetworkTestnet() && (
        <div style={styles.warning}>
          <strong>📍 現在のネットワーク:</strong> {getCurrentNetworkInfo()?.name}
          {chainId && JPYC_TOKENS[chainId] && (
            <>
              <br />
              <strong>JPYCアドレス:</strong> {JPYC_TOKENS[chainId].address}
            </>
          )}
        </div>
      )}

      <div style={styles.networkList}>
        {networksWithFaucets.map((networkChainId) => {
          const networkInfo = NETWORK_INFO[networkChainId];
          const tokenInfo = JPYC_TOKENS[networkChainId];
          const isExpanded = expandedNetwork === networkChainId;
          const isCurrent = chainId === networkChainId;

          return (
            <div
              key={networkChainId}
              style={{
                ...styles.networkItem,
                ...(isExpanded ? styles.expandedNetwork : {}),
              }}
              onClick={() => setExpandedNetwork(isExpanded ? null : networkChainId)}
            >
              <div style={styles.networkHeader}>
                <span>
                  {networkInfo.name}
                  {isCurrent && <span style={styles.currentNetworkBadge}>現在のネットワーク</span>}
                </span>
                <span>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div style={styles.networkDetails}>
                  <p><strong>🔗 Chain ID:</strong> {networkChainId}</p>
                  <p><strong>💰 JPYC Address:</strong> {tokenInfo?.address}</p>
                  <p><strong>🌐 Block Explorer:</strong> <a href={networkInfo.blockExplorer} target="_blank" rel="noopener noreferrer">{networkInfo.blockExplorer}</a></p>

                  <div style={{ marginTop: '15px' }}>
                    <strong>📋 Faucetコントラクトからの取得手順:</strong>
                    <div style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '6px', margin: '10px 0', fontSize: '13px' }}>
                      <strong>🏗️ Faucetコントラクト:</strong> {networkInfo.faucetInfo!.contractAddress}
                    </div>
                    <ul style={styles.stepList}>
                      <li style={styles.stepItem}>
                        <div style={styles.stepNumber}>1</div>
                        <div>
                          <strong>ウォレットを接続</strong><br />
                          MetaMaskを{networkInfo.name}ネットワークに切り替え、ガス代用のネイティブトークンを準備
                        </div>
                      </li>
                      <li style={styles.stepItem}>
                        <div style={styles.stepNumber}>2</div>
                        <div>
                          <strong>Faucetコントラクトを開く</strong><br />
                          下のボタンから、ブロックチェーンエクスプローラーのWrite Contractページを開く
                        </div>
                      </li>
                      <li style={styles.stepItem}>
                        <div style={styles.stepNumber}>3</div>
                        <div>
                          <strong>sendTokenメソッドを探す</strong><br />
                          Write Contractセクションで「sendToken」メソッドを見つけてクリック
                        </div>
                      </li>
                      <li style={styles.stepItem}>
                        <div style={styles.stepNumber}>4</div>
                        <div>
                          <strong>パラメータを入力</strong><br />
                          • _to (address): {userAddress ? (
                            <input 
                              type="text" 
                              value={userAddress} 
                              readOnly 
                              style={styles.addressInput}
                              title="あなたのウォレットアドレス（自動入力済み）"
                            />
                          ) : 'あなたのウォレットアドレス'}<br />
                          • _amount (uint256): <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>100000000000000000000000</code> <span style={{ fontSize: '12px', color: '#6b7280' }}>（10^23 = 約1万JPYC）</span>
                        </div>
                      </li>
                      <li style={styles.stepItem}>
                        <div style={styles.stepNumber}>5</div>
                        <div>
                          <strong>Writeボタンを押す</strong><br />
                          ウォレットでトランザクションを承認し、数分でJPYCが受け取れます
                        </div>
                      </li>
                    </ul>
                  </div>

                  <a
                    href={networkInfo.faucetInfo!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.linkButton}
                  >
                    🚰 {networkInfo.name} Faucetを開く →
                  </a>

                  <div style={styles.warning}>
                    <strong>⚠️ 重要な注意事項:</strong><br />
                    • ガス代として各ネットワークのネイティブトークン（ETH、POL、AVAX）が必要です<br />
                    • 1回の実行で最大100,000 JPYC（10^23 wei単位）まで取得可能<br />
                    • Faucetコントラクトアドレス: {networkInfo.faucetInfo!.contractAddress}<br />
                    • テストネット用のため実際の価値はありません<br />
                    • {networkInfo.faucetInfo!.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isCurrentNetworkTestnet() && (
        <div style={styles.warning}>
          <strong>ℹ️ 本番ネットワークをご利用中です</strong><br />
          テスト用JPYCを取得するには、上記のテストネットワークに切り替えてください。
          本番のPolygonネットワークでは、実際のJPYCを購入または取引所で入手する必要があります。
        </div>
      )}
    </div>
  );
};

export default FaucetGuide;