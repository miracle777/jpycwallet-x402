import { useState } from "react";
import { ethers } from "ethers";
import AmbireLogin from "./AmbireLogin";
import QRPayment from "./components/QRPayment";
import ShoppingCart from "./components/ShoppingCart";
import SubscriptionManager from "./components/SubscriptionManager";
import GaslessPayment from "./components/GaslessPayment";
import NetworkSelector from "./components/NetworkSelector";
import FaucetGuide from "./components/FaucetGuide";
import type { ChainKey } from "./lib/onboard";

function App() {
  const [walletData, setWalletData] = useState<{
    address: string | null;
    signer: ethers.Signer | null;
  }>({ address: null, signer: null });

  const [selectedNetwork, setSelectedNetwork] = useState<ChainKey>('polygon-amoy');

  const handleWalletConnect = (address: string, signer: ethers.Signer) => {
    setWalletData({ address, signer });
  };

  const handleWalletDisconnect = () => {
    setWalletData({ address: null, signer: null });
  };

  const handlePaymentComplete = (txHash: string) => {
    alert(`決済が完了しました！\nトランザクションハッシュ: ${txHash}`);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginTop: "1rem", marginBottom: "2rem" }}>
        JPYC Wallet x402
      </h1>
      
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* ネットワーク選択 */}
        <NetworkSelector
          currentNetwork={selectedNetwork}
          onNetworkChange={setSelectedNetwork}
          disabled={!!walletData.address}
        />
        
        {/* テスト用JPYC取得ガイド */}
        <FaucetGuide
          chainId={selectedNetwork === 'polygon' ? 137 : 
                   selectedNetwork === 'polygon-amoy' ? 80002 :
                   selectedNetwork === 'sepolia' ? 11155111 :
                   selectedNetwork === 'avalanche-fuji' ? 43113 : undefined}
          userAddress={walletData.address || undefined}
        />
        
        {/* ウォレット接続 */}
        <AmbireLogin 
          onConnect={handleWalletConnect}
          onDisconnect={handleWalletDisconnect}
        />
        
        {/* QR決済機能 */}
        {walletData.address && walletData.signer && (
          <div style={{ marginTop: "30px" }}>
            <QRPayment
              currentAddress={walletData.address}
              signer={walletData.signer}
              onPaymentComplete={handlePaymentComplete}
            />
          </div>
        )}

        {/* ショッピングカート機能 */}
        <div style={{ marginTop: "30px" }}>
          <ShoppingCart
            currentAddress={walletData.address || undefined}
            signer={walletData.signer || undefined}
            onPaymentComplete={(txHash, amount) => handlePaymentComplete(txHash)}
          />
        </div>

        {/* サブスクリプション管理 */}
        <div style={{ marginTop: "30px" }}>
          <SubscriptionManager
            currentAddress={walletData.address || undefined}
            signer={walletData.signer || undefined}
            onPaymentComplete={(txHash, amount) => handlePaymentComplete(txHash)}
          />
        </div>

        {/* ガスレス送付（実験的機能） */}
        <div style={{ marginTop: "30px" }}>
          <GaslessPayment
            currentAddress={walletData.address || undefined}
            signer={walletData.signer || undefined}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
