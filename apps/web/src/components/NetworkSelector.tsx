import React, { useState } from 'react';
import { CHAINS, type ChainKey, getOnboard } from '../lib/onboard';
import { JPYC_TOKENS, NETWORK_INFO } from '../lib/wallet-utils';

interface NetworkSelectorProps {
  currentNetwork?: ChainKey;
  onNetworkChange?: (network: ChainKey) => void;
  disabled?: boolean;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  currentNetwork,
  onNetworkChange,
  disabled = false,
}) => {
  const [switching, setSwitching] = useState(false);

  const switchNetwork = async (networkKey: ChainKey) => {
    if (disabled || switching) return;

    setSwitching(true);
    try {
      const onboard = getOnboard();
      const chain = CHAINS[networkKey];
      await onboard.setChain({ chainId: chain.id });
      onNetworkChange?.(networkKey);
    } catch (error) {
      console.error('Network switch failed:', error);
    } finally {
      setSwitching(false);
    }
  };

  const getNetworkStatus = (networkKey: ChainKey) => {
    const chainId = parseInt(CHAINS[networkKey].id, 16);
    const hasJPYC = JPYC_TOKENS[chainId] !== undefined;
    const networkInfo = NETWORK_INFO[chainId];
    const isMainnet = networkKey === 'polygon';

    return {
      hasJPYC,
      isMainnet,
      hasFaucet: networkInfo?.faucetInfo !== undefined,
    };
  };

  const styles = {
    container: {
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      margin: '20px 0',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '15px',
      color: '#374151',
    },
    networkGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px',
    },
    networkCard: {
      padding: '15px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative' as const,
    },
    activeNetwork: {
      borderColor: '#2563eb',
      backgroundColor: '#eff6ff',
    },
    networkLabel: {
      fontWeight: 600,
      fontSize: '16px',
      marginBottom: '8px',
    },
    networkInfo: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '10px',
    },
    statusBadges: {
      display: 'flex',
      gap: '5px',
      flexWrap: 'wrap' as const,
    },
    badge: {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500,
    },
    mainnetBadge: {
      backgroundColor: '#dcfce7',
      color: '#166534',
    },
    testnetBadge: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
    },
    jpycBadge: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },
    faucetBadge: {
      backgroundColor: '#f3e8ff',
      color: '#6b21a8',
    },
    switchingOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
    },
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>🌐 ネットワーク選択</h4>
      
      <div style={styles.networkGrid}>
        {(Object.keys(CHAINS) as ChainKey[]).map((networkKey) => {
          const chain = CHAINS[networkKey];
          const status = getNetworkStatus(networkKey);
          const isActive = currentNetwork === networkKey;

          return (
            <div
              key={networkKey}
              style={{
                ...styles.networkCard,
                ...(isActive ? styles.activeNetwork : {}),
                opacity: disabled ? 0.6 : 1,
              }}
              onClick={() => !isActive && switchNetwork(networkKey)}
            >
              {switching && isActive && (
                <div style={styles.switchingOverlay}>
                  切り替え中...
                </div>
              )}
              
              <div style={styles.networkLabel}>
                {chain.label}
                {isActive && ' ✅'}
              </div>
              
              <div style={styles.networkInfo}>
                Chain ID: {parseInt(chain.id, 16)}<br />
                Token: {chain.token}
              </div>
              
              <div style={styles.statusBadges}>
                {status.isMainnet ? (
                  <span style={{...styles.badge, ...styles.mainnetBadge}}>
                    🔴 Mainnet
                  </span>
                ) : (
                  <span style={{...styles.badge, ...styles.testnetBadge}}>
                    🧪 Testnet
                  </span>
                )}
                
                {status.hasJPYC && (
                  <span style={{...styles.badge, ...styles.jpycBadge}}>
                    💰 JPYC
                  </span>
                )}
                
                {status.hasFaucet && (
                  <span style={{...styles.badge, ...styles.faucetBadge}}>
                    💧 Faucet
                  </span>
                )}
              </div>
              
              {!status.isMainnet && status.hasFaucet && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  テスト用JPYCを無料で取得できます
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div style={{ 
        marginTop: '15px', 
        fontSize: '14px', 
        color: '#6b7280',
        padding: '10px',
        backgroundColor: '#fffbeb',
        border: '1px solid #f59e0b',
        borderRadius: '8px'
      }}>
        💡 <strong>ヒント:</strong> 開発・テストにはTestnetを、本番利用にはMainnetを選択してください。
        Testnetでは無料でテスト用JPYCを取得できます。
      </div>
    </div>
  );
};

export default NetworkSelector;