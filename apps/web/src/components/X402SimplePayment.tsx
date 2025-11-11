import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getErc20Contract } from '../lib/jpyc';
import { jpycAddress } from '../lib/chain';

interface X402SimplePaymentProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string) => void;
  networkConfigs?: Record<string, any>;
  initialRequest?: string; // Base64エンコードされたPaymentRequirements
}

// x402 PaymentRequirements 形式
interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    name: string;
    version: string;
  };
}

// x402 PaymentPayload 形式
interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature?: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

// x402レスポンス形式
interface X402Response {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
}

const X402SimplePayment: React.FC<X402SimplePaymentProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
  networkConfigs: externalNetworkConfigs,
  initialRequest,
}) => {
  const [amount, setAmount] = useState('1'); // デフォルト: 1 JPYC（表示用）
  const [amountInBaseUnits, setAmountInBaseUnits] = useState('1000000'); // 内部用: base units
  const [recipient, setRecipient] = useState('');
  const [description, setDescription] = useState('x402 Simple Payment Test');
  const [selectedNetwork, setSelectedNetwork] = useState<'polygon-amoy' | 'sepolia' | 'sepolia-official' | 'avalanche-fuji'>('sepolia');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [paymentRequirements, setPaymentRequirements] = useState<PaymentRequirements | null>(null);
  const [paymentPayload, setPaymentPayload] = useState<PaymentPayload | null>(null);
  const [isLoadedFromUrl, setIsLoadedFromUrl] = useState(false);
  const isLoadedFromUrlRef = useRef(false); // 同期的な状態管理用
  const [generatedPaymentUrl, setGeneratedPaymentUrl] = useState<string>('');
  const [urlCopied, setUrlCopied] = useState(false);

  // ネットワーク設定（デフォルト）
  const defaultNetworkConfig = {
    'polygon-amoy': {
      chainId: 80002n,
      name: 'Polygon Amoy',
      currency: 'JPYC',
      asset: '0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F',
      decimals: 18,
      rpcUrl: 'https://rpc-amoy.polygon.technology'
    },
    sepolia: {
      chainId: 11155111n,
      name: 'Ethereum Sepolia (Community)',
      currency: 'JPYC',
      asset: '0xd3eF95d29A198868241FE374A999fc25F6152253',
      decimals: 18,
      rpcUrl: 'https://rpc.sepolia.org'
    },
    'sepolia-official': {
      chainId: 11155111n,
      name: 'Ethereum Sepolia (Official)',
      currency: 'JPYC',
      asset: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      decimals: 18,
      rpcUrl: 'https://rpc.sepolia.org'
    },
    'avalanche-fuji': {
      chainId: 43113n,
      name: 'Avalanche Fuji',
      currency: 'JPYC',
      asset: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
      decimals: 18,
      rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc'
    }
  };

  const networkConfig = { ...defaultNetworkConfig };

  // chainIdからネットワーク設定を検索するヘルパー関数
  const findNetworkConfigByChainId = (chainIdStr: string) => {
    const targetChainId = BigInt(chainIdStr);
    const entry = Object.entries(networkConfig).find(([, config]) => config.chainId === targetChainId);
    return entry ? { key: entry[0], config: entry[1] } : null;
  };

  // 現在の設定を取得（selectedNetworkがchainIdの場合も対応）
  const getCurrentNetworkConfig = () => {
    // まず直接キーで検索
    if (networkConfig[selectedNetwork]) {
      return networkConfig[selectedNetwork];
    }
    // chainIdで検索
    const found = findNetworkConfigByChainId(selectedNetwork);
    return found ? found.config : networkConfig.sepolia; // フォールバック
  };

  const currentConfig = getCurrentNetworkConfig();

  // URLパラメータから初期データを設定（最優先）
  useEffect(() => {
    if (initialRequest && !isLoadedFromUrl) {
      console.log('🔗 URLパラメータを処理開始:', initialRequest);
      
      try {
        const decoded = JSON.parse(atob(initialRequest));
        
        console.log('🔗 URLからPaymentRequirementsを読み込みました:', decoded);
        console.log('🔍 デコードされた金額（maxAmountRequired）:', decoded.maxAmountRequired, typeof decoded.maxAmountRequired);
        
        // URLから読み込んだ値を使用
        setPaymentRequirements(decoded);
        setRecipient(decoded.payTo);
        
        // maxAmountRequiredはJPY単位で来るので、そのまま表示用のamountに設定
        const jpyAmount = decoded.maxAmountRequired;
        console.log('💱 JPY金額の設定:', jpyAmount, typeof jpyAmount);
        
        // base units に変換: JPY → base units (1 JPY = 1,000,000 base units)
        const baseUnits = (parseFloat(jpyAmount) * 1000000).toString();
        
        // まず先にrefでフラグを設定してネットワーク変更の影響を防ぐ
        isLoadedFromUrlRef.current = true;
        setIsLoadedFromUrl(true);
        console.log('✅ URLからの読み込み完了フラグ設定');
        
        // その後で値を一括設定（React.batchの恩恵を受ける）
        setAmount(jpyAmount);
        setDescription(decoded.description);
        setAmountInBaseUnits(baseUnits);
        setRecipient(decoded.payTo);
        setPaymentRequirements(decoded);
        
        console.log(`💰 Amount conversion: ${jpyAmount} JPY → ${baseUnits} base units`);
        console.log('✅ URLからの読み込み完了');
        
        // ネットワークは最後に設定（状態更新の競合を避けるため少し遅延）
        setTimeout(() => {
          setSelectedNetwork(decoded.network);
          console.log('🌐 ネットワーク設定完了:', decoded.network);
        }, 10);
        
      } catch (e) {
        console.error('URLの読み込みに失敗しました:', e);
        setError('決済リクエストの読み込みに失敗しました。');
      }
    }
  }, [initialRequest]); // isLoadedFromUrlを依存関係から除外  // ウォレット接続時に受取アドレスを自動設定（URLから読み込まれていない場合）
  useEffect(() => {
    if (currentAddress && !recipient && !isLoadedFromUrl) {
      setRecipient(currentAddress);
    }
  }, [currentAddress, recipient, isLoadedFromUrl]);

  // ネットワーク変更時に適切なデフォルト金額を設定（URLから読み込まれていない場合のみ）
  useEffect(() => {
    console.log('🌐 ネットワーク変更処理開始: isLoadedFromUrl =', isLoadedFromUrlRef.current, 'selectedNetwork =', selectedNetwork);
    
    // refを使って同期的にチェック - URLから読み込まれている場合は何もしない
    if (isLoadedFromUrlRef.current) {
      console.log('🌐 ネットワーク変更: URLから読み込み済みのため金額は変更しません');
      return;
    }
    
    // URLから読み込まれていない場合のみ、全てのテストネットワークで1 JPYCに統一
    setAmount('1'); // 表示用: 1 JPYC
    console.log('🌐 ネットワーク変更: デフォルト金額を1円に設定');
  }, [selectedNetwork]); // isLoadedFromUrlを依存関係から除外

  // 金額変更時に base units に変換
  const handleAmountChange = (value: string) => {
    // 整数のみを受け付ける
    const numValue = parseFloat(value) || 0;
    const intValue = Math.floor(Math.abs(numValue)); // 負の値対策
    
    // amount の状態を更新
    setAmount(intValue.toString());
    
    // 1 JPYC = 1,000,000 base units
    if (intValue > 0) {
      const baseUnits = (intValue * 1000000).toString();
      setAmountInBaseUnits(baseUnits);
      console.log(`金額変更: ${intValue}円 → ${baseUnits} base units`);
    } else {
      setAmountInBaseUnits('0');
    }
  };

  // x402 PaymentRequirements を作成
  const createPaymentRequirements = (): PaymentRequirements => {
    return {
      scheme: "exact",
      network: selectedNetwork,
      maxAmountRequired: amount, // JPYC数量をそのまま使用（base unitsではなく）
      resource: `https://api.example.com/payment/${Date.now()}`,
      description,
      mimeType: "application/json",
      payTo: recipient,
      maxTimeoutSeconds: 300, // 5分
      asset: currentConfig.asset,
      extra: {
        name: currentConfig.currency,
        version: "2"
      }
    };
  };

  // x402 PaymentPayload を作成
  const createPaymentPayload = async (requirements: PaymentRequirements, baseUnitsAmount: string): Promise<PaymentPayload> => {
    if (!signer || !currentAddress) {
      throw new Error('Signer not available');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    // EIP-3009 Authorization構造
    const authorization = {
      from: currentAddress,
      to: requirements.payTo,
      value: requirements.maxAmountRequired.toString(), // JPY単位を使用
      validAfter: (currentTime - 60).toString(), // 1分前から有効
      validBefore: (currentTime + requirements.maxTimeoutSeconds).toString(),
      nonce: nonce
    };

    // EIP-712 domain for signature
    const domain = {
      name: "USD Coin",
      version: "2",
      chainId: Number(currentConfig.chainId), // 選択されたネットワークのchainIdを使用
      verifyingContract: requirements.asset
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };

    // EIP-712署名を作成
    let signature = '';
    try {
      signature = await signer.signTypedData(domain, types, authorization);
    } catch (e) {
      console.log('EIP-712署名に失敗、fallback署名を使用');
      const message = JSON.stringify(authorization);
      signature = await signer.signMessage(message);
    }

    return {
      x402Version: 1,
      scheme: "exact",
      network: selectedNetwork,
      payload: {
        signature,
        authorization
      }
    };
  };

  // 402レスポンスをシミュレート
  const simulate402Response = (): X402Response => {
    const requirements = createPaymentRequirements();
    return {
      x402Version: 1,
      accepts: [requirements],
      error: "X-PAYMENT header is required"
    };
  };

  // x402決済フローを実行
  const executeX402Payment = async () => {
    if (!signer || !currentAddress) {
      setError('ウォレット接続が必要です');
      return;
    }

    if (!ethers.isAddress(recipient)) {
      setError('無効な受取アドレスです');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('有効な金額を入力してください');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🚀 x402決済フロー開始');
      console.log('📊 Debug info:');
      console.log('  selectedNetwork:', selectedNetwork);
      console.log('  currentConfig:', currentConfig);
      console.log('  paymentRequirements:', paymentRequirements);

      // Step 0: ネットワークチェック
      // provider.getNetwork()が機能しない場合は、signerのproviderから直接chainIdを取得
      let currentChainId: bigint;
      
      try {
        const currentNetwork = await signer.provider?.getNetwork();
        console.log('Current network:', currentNetwork);
        currentChainId = BigInt(currentNetwork?.chainId || 0);
      } catch (e) {
        console.log('getNetwork failed, trying alternative method:', e);
        // WalletConnectなどでgetNetworkが失敗する場合は、JSONRPCを直接呼び出し
        try {
          const provider = signer.provider as any;
          const chainIdHex = await provider.send('eth_chainId', []);
          currentChainId = BigInt(chainIdHex);
        } catch (e2) {
          console.log('eth_chainId also failed:', e2);
          setError('ネットワーク情報を取得できません。ウォレットの接続を確認してください。');
          setLoading(false);
          return;
        }
      }
      
      console.log('Expected chainId:', currentConfig.chainId, 'Current chainId:', currentChainId);
      
      if (currentChainId !== currentConfig.chainId) {
        setError(`${currentConfig.name}ネットワークに接続してください。現在のネットワークチェーンID: ${currentChainId}`);
        setLoading(false);
        return;
      }

      // Step 1: 402レスポンスをシミュレート
      console.log('📋 Step 1: Payment Requirements取得');
      const response402 = simulate402Response();
      const requirements = response402.accepts[0];
      setPaymentRequirements(requirements);
      
      console.log('💰 Payment Requirements:', requirements);

      // Step 2: PaymentPayload作成
      console.log('🔐 Step 2: PaymentPayload作成・署名');
      const payload = await createPaymentPayload(requirements, amountInBaseUnits);
      setPaymentPayload(payload);
      
      console.log('✅ PaymentPayload作成完了:', {
        version: payload.x402Version,
        scheme: payload.scheme,
        network: payload.network,
        signature: payload.payload.signature?.slice(0, 20) + '...',
        authorization: payload.payload.authorization
      });

      // Step 3: 決済実行（実際のブロックチェーン取引）
      console.log(`⛓️ Step 3: ${currentConfig.currency} transfer実行`);
      
      let receipt;
      if (selectedNetwork === 'sepolia') {
        // Sepolia ETH transfer
        const transferAmount = ethers.parseUnits((parseFloat(amount) / Math.pow(10, currentConfig.decimals)).toString(), currentConfig.decimals);
        console.log(`Transferring ${(parseFloat(amount) / Math.pow(10, currentConfig.decimals))} ETH to ${recipient}`);
        const tx = await signer.sendTransaction({
          to: recipient,
          value: transferAmount
        });
        receipt = await tx.wait();
      } else {
        // JPYC transfer（Polygon Amoy など）
        const jpycContract = getErc20Contract(signer);
        const decimals = await jpycContract.decimals();
        console.log(`📊 Decimals: ${decimals}, Amount in base units: ${amountInBaseUnits}`);
        
        // base units をそのまま使用（既に正しく計算されている）
        const transferAmount = BigInt(amountInBaseUnits);
        console.log(`Transferring ${amountInBaseUnits} base units (${parseFloat(amountInBaseUnits) / 1000000} JPYC) to ${recipient}`);
        
        // 事前チェック: 残高確認（最新データを取得）
        console.log('💰 残高チェック中...');
        try {
          const balance = await jpycContract.balanceOf(currentAddress);
          console.log(`💰 Current balance: ${balance.toString()}, Transfer amount: ${transferAmount.toString()}`);
          if (balance < transferAmount) {
            throw new Error(`残高不足です。必要: ${transferAmount}, 保有: ${balance}`);
          }
        } catch (e: any) {
          console.error('残高チェックエラー:', e);
          throw e;
        }
        
        const tx = await jpycContract.transfer(recipient, transferAmount);
        console.log('⏳ トランザクション確認中:', tx.hash);
        receipt = await tx.wait();
        console.log('✅ トランザクション完了:', receipt?.hash);
      }
      console.log(`🎉 ${currentConfig.currency} transfer完了:`, receipt?.hash);

      // トランザクション確認後に残高を再読み込み（JPYC の場合）
      if (selectedNetwork !== 'sepolia') {
        try {
          console.log('🔄 残高を再読み込み中...');
          const contract = getErc20Contract(signer);
          const newBalance = await contract.balanceOf(currentAddress);
          console.log(`🔄 新しい残高: ${newBalance.toString()}`);
        } catch (e) {
          console.log('残高再読み込み時の注意:', e);
        }
      }

      const displayAmount = selectedNetwork === 'sepolia' 
        ? (parseFloat(amount) / Math.pow(10, currentConfig.decimals)).toFixed(4)
        : (parseFloat(amount) / 1000000).toFixed(0);

      setSuccess(
        `x402決済が完了しました！\n\n` +
        `💳 Payment Details:\n` +
        `• Amount: ${displayAmount} ${currentConfig.currency}\n` +
        `• Network: ${requirements.network}\n` +
        `• Recipient: ${recipient}\n` +
        `• Resource: ${requirements.resource}\n\n` +
        `🔐 x402 Verification:\n` +
        `• Version: ${payload.x402Version}\n` +
        `• Scheme: ${payload.scheme}\n` +
        `• Signature: ${payload.payload.signature?.slice(0, 30)}...\n\n` +
        `⛓️ Transaction:\n` +
        `• Hash: ${receipt?.hash}\n` +
        `• Block: ${receipt?.blockNumber}\n\n` +
        `💡 ヒント: 次の決済では、ページを再読み込み（F5）してから実行してください。`
      );

      onPaymentComplete?.(receipt?.hash || '');

    } catch (e: any) {
      let errorMessage = e.message || 'Unknown error';
      
      if (errorMessage.includes('user rejected')) {
        setError('ユーザーによって取引がキャンセルされました');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('残高が不足しています');
      } else {
        setError(`x402決済に失敗しました: ${errorMessage}`);
      }
      console.error('❌ x402決済エラー:', e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    // ネットワークに応じたデフォルト金額を設定
    setAmount('1'); // 表示用: 1 JPYC
    setAmountInBaseUnits('1000000'); // base units
    setRecipient(currentAddress || '');
    setDescription('x402 Simple Payment Test');
    setError('');
    setSuccess('');
    setPaymentRequirements(null);
    setPaymentPayload(null);
    setGeneratedPaymentUrl('');
    setUrlCopied(false);
  };

  // 請求URL生成機能
  const generatePaymentRequest = () => {
    try {
      setError('');
      
      if (!recipient || !amount) {
        setError('受取アドレスと金額を入力してください');
        return;
      }

      // PaymentRequirements を生成
      const paymentRequirements: PaymentRequirements = {
        scheme: 'x402',
        network: currentConfig.chainId.toString(),
        maxAmountRequired: amount, // JPY単位で送信
        resource: `/pay/${Date.now()}`, // ユニークなリソースID
        description: description || 'x402 Payment Request',
        mimeType: 'application/json',
        payTo: recipient,
        maxTimeoutSeconds: 3600, // 1時間
        asset: currentConfig.asset,
        extra: {
          name: 'jpycwallet-x402',
          version: '1.0.0'
        }
      };

      // Base64エンコード
      const encodedRequest = btoa(JSON.stringify(paymentRequirements));
      
      // URL生成
      const baseUrl = window.location.origin;
      const paymentUrl = `${baseUrl}/pay?request=${encodedRequest}`;
      
      // 成功メッセージとURL表示
      setSuccess(`📋 請求URL生成完了！`);
      
      // PaymentRequirements を状態に保存
      setPaymentRequirements(paymentRequirements);
      
      console.log('📋 PaymentRequirements generated:', paymentRequirements);
      console.log('🔗 Payment URL:', paymentUrl);
      
      // URLを状態に保存（表示用）
      setGeneratedPaymentUrl(paymentUrl);
      
    } catch (error) {
      console.error('❌ Payment request generation error:', error);
      setError(`請求URL生成エラー: ${(error as Error).message}`);
    }
  };

  // URLコピー機能
  const copyPaymentUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div style={{ width: '100%', padding: '0px' }}>
      <div style={{ 
        backgroundColor: 'transparent', 
        borderRadius: '12px', 
        padding: '0px', 
        boxShadow: 'none', 
        border: 'none' 
      }}>
        <h2 style={{ margin: '0 0 25px 0', color: '#1f2937', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
          💳 x402 Simple Payment
        </h2>

        {/* 決済リクエスト情報の表示 */}
        {isLoadedFromUrl && paymentRequirements && (
          <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #10b981', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '15px' }}>
              <span style={{ fontSize: '20px' }}>💳</span>
              <span style={{ fontWeight: '600', fontSize: '16px' }}>決済リクエスト詳細</span>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
                <span style={{ fontWeight: '500', color: '#15803d' }}>💰 支払金額:</span>
                <span style={{ fontSize: '18px', fontWeight: '700', color: '#15803d' }}>{amount} 円</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
                <span style={{ fontWeight: '500', color: '#15803d' }}>📝 説明:</span>
                <span style={{ color: '#15803d' }}>{paymentRequirements.description}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
                <span style={{ fontWeight: '500', color: '#15803d' }}>🏪 受取先:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#15803d' }}>
                  {paymentRequirements.payTo.slice(0, 8)}...{paymentRequirements.payTo.slice(-6)}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
                <span style={{ fontWeight: '500', color: '#15803d' }}>🌐 ネットワーク:</span>
                <span style={{ color: '#15803d' }}>{paymentRequirements.network}</span>
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#dcfce7', 
              border: '1px solid #10b981',
              borderRadius: '6px', 
              padding: '12px',
              marginTop: '15px',
              fontSize: '13px',
              color: '#15803d'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>📋 支払い手順:</div>
              <div style={{ lineHeight: '1.6' }}>
                1. 上記の決済情報を確認<br/>
                2. ウォレットを接続（未接続の場合）<br/>
                3. 下の「💳 x402決済を実行」ボタンをクリック<br/>
                4. ウォレットで取引を承認
              </div>
            </div>
          </div>
        )}

        {/* x402仕様情報 */}
        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>📋</span>
            <span style={{ fontWeight: '600', color: '#0c4a6e' }}>
              {isLoadedFromUrl ? 'x402 決済リクエスト' : 'x402 Payment Protocol 統合テスト'}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#0c4a6e', lineHeight: '1.6' }}>
            {isLoadedFromUrl ? (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>🔗 決済リクエストが読み込まれました:</strong>
                </div>
                <div style={{ paddingLeft: '15px' }}>
                  💰 <strong>金額:</strong> {amount} 円<br/>
                  📝 <strong>説明:</strong> {description}<br/>
                  🏪 <strong>受取先:</strong> {recipient?.slice(0, 8)}...{recipient?.slice(-6)}<br/>
                  🌐 <strong>ネットワーク:</strong> {selectedNetwork}
                </div>
                <div style={{ marginTop: '10px', fontSize: '12px', backgroundColor: '#dbeafe', padding: '8px', borderRadius: '4px' }}>
                  💡 下記のフォーム内容は変更できません。「決済を実行」ボタンで支払いを完了してください。
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>このページでできること:</strong>
                </div>
                <div style={{ paddingLeft: '15px' }}>
                  1. <strong>🔗 請求URL生成</strong> - マーチャント側: 決済要件をURLで発行<br/>
                  2. <strong>🌐 ブラウザテスト</strong> - 生成されたURLを別タブで開いて決済テスト
                </div>
              </div>
            )}
          </div>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '8px' }}>
              <span>⚠️</span>
              <span style={{ fontWeight: '500' }}>エラー</span>
            </div>
            <div style={{ fontSize: '14px', color: '#dc2626', whiteSpace: 'pre-line' }}>
              {error}
            </div>
          </div>
        )}
        
        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '8px' }}>
              <span>🎉</span>
              <span style={{ fontWeight: '500' }}>x402決済完了</span>
            </div>
            <div style={{ fontSize: '14px', color: '#15803d', whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
              {success}
            </div>
          </div>
        )}

        {/* 生成された請求URL表示 */}
        {generatedPaymentUrl && (
          <div style={{ backgroundColor: '#f0f9ff', border: '2px solid #0ea5e9', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0c4a6e', marginBottom: '15px' }}>
              <span style={{ fontSize: '20px' }}>🔗</span>
              <span style={{ fontWeight: '600', fontSize: '16px' }}>決済用URL生成完了！</span>
            </div>

            {/* URL表示エリア（スクロール可能） */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#0c4a6e', marginBottom: '8px' }}>
                📱 決済用URL:
              </div>
              
              <div style={{
                backgroundColor: '#dbeafe',
                border: '2px solid #0ea5e9',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '10px',
                maxHeight: '100px',
                overflowY: 'auto',
                wordBreak: 'break-all',
                fontSize: '11px',
                fontFamily: 'monospace',
                lineHeight: '1.4',
                color: '#0c4a6e'
              }}>
                {generatedPaymentUrl}
              </div>
              
              {/* アクションボタン */}
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '10px'
              }}>
                <button
                  onClick={() => copyPaymentUrl(generatedPaymentUrl)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#0c4a6e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {urlCopied ? '✅ コピー済み' : '📋 URLをコピー'}
                </button>
                
                <a
                  href={generatedPaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🔗 新しいウィンドウで開く
                </a>
                
                <button
                  onClick={() => {
                    // QRコード生成（簡易版）
                    const newWindow = window.open('', '_blank', 'width=400,height=500');
                    if (newWindow) {
                      newWindow.document.write(`
                        <html>
                          <head><title>QRコード - 決済用URL</title></head>
                          <body style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                            <h2>📱 決済用QRコード</h2>
                            <div style="margin: 20px 0;">
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(generatedPaymentUrl)}" alt="QR Code" style="border: 1px solid #ddd; border-radius: 8px;" />
                            </div>
                            <p style="font-size: 12px; color: #666; margin-top: 20px; word-break: break-all;">
                              URL: ${generatedPaymentUrl}
                            </p>
                            <button onclick="navigator.clipboard.writeText('${generatedPaymentUrl}').then(() => alert('URLがクリップボードにコピーされました'))" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                              📋 URLをコピー
                            </button>
                          </body>
                        </html>
                      `);
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📱 QRコード表示
                </button>
              </div>
            </div>

            {/* 使い方説明 */}
            <div style={{ 
              backgroundColor: '#dbeafe', 
              border: '1px solid #0ea5e9',
              borderRadius: '6px', 
              padding: '12px',
              marginBottom: '15px',
              fontSize: '13px',
              color: '#0c4a6e'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>📝 このURLの使い方:</div>
              <div style={{ lineHeight: '1.6' }}>
                1. 上のURLをコピー<br/>
                2. 支払者に共有（メール、QRコード等）<br/>
                3. 支払者がURLにアクセス<br/>
                4. 支払者がウォレット接続して決済実行
              </div>
            </div>
          </div>
        )}

        {/* 決済フォーム */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              ネットワーク
            </label>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value as 'polygon-amoy' | 'sepolia' | 'sepolia-official' | 'avalanche-fuji')}
              disabled={isLoadedFromUrl}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: isLoadedFromUrl ? '#f9fafb' : 'white',
                cursor: isLoadedFromUrl ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="polygon-amoy">Polygon Amoy (JPYC)</option>
              <option value="sepolia">Ethereum Sepolia - Community (JPYC)</option>
              <option value="sepolia-official">Ethereum Sepolia - Official (JPYC)</option>
              <option value="avalanche-fuji">Avalanche Fuji (JPYC)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              受取アドレス
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isLoadedFromUrl}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                backgroundColor: isLoadedFromUrl ? '#f9fafb' : 'white',
                cursor: isLoadedFromUrl ? 'not-allowed' : 'auto'
              }}
              placeholder={currentAddress || '0x1234567890123456789012345678901234567890'}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              金額 (JPYC / 円) {isLoadedFromUrl ? '- 決済リクエストで指定済み' : '- 整数のみ'}
            </label>
            {isLoadedFromUrl ? (
              /* URLから読み込んだ場合: 読み取り専用表示 */
              <div>
                <div style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '2px solid #10b981', 
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  textAlign: 'center'
                }}>
                  {amount} 円
                </div>
                {/* デバッグ情報 */}
                <div style={{ fontSize: '10px', color: '#666', marginTop: '5px', textAlign: 'center' }}>
                  DEBUG: amount={amount}, isLoadedFromUrl={isLoadedFromUrl.toString()}
                </div>
              </div>
            ) : (
              /* 手動入力の場合: 通常の入力フォーム */
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                  placeholder="1"
                  min="1"
                  step="1"
                />
                <div style={{ 
                  position: 'absolute', 
                  right: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  fontSize: '12px', 
                  color: '#6b7280' 
                }}>
                  {amount ? `${Math.floor(parseFloat(amount))} 円` : '0 円'}
                </div>
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Base Units: {amountInBaseUnits}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              説明
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoadedFromUrl}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: isLoadedFromUrl ? '#f9fafb' : 'white',
                cursor: isLoadedFromUrl ? 'not-allowed' : 'auto'
              }}
              placeholder="Payment description"
            />
          </div>
        </div>

        {/* x402フロー表示 */}
        {(paymentRequirements || paymentPayload) && (
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              📊 x402 Flow Data
            </h3>
            
            {paymentRequirements && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  💰 PaymentRequirements:
                </div>
                <pre style={{ 
                  fontSize: '12px', 
                  backgroundColor: '#f1f5f9', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  overflow: 'auto',
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(paymentRequirements, null, 2)}
                </pre>
              </div>
            )}

            {paymentPayload && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  🔐 PaymentPayload (X-PAYMENT header):
                </div>
                <pre style={{ 
                  fontSize: '12px', 
                  backgroundColor: '#f1f5f9', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  overflow: 'auto',
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(paymentPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 実行ボタン */}
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          {/* URLから読み込まれた場合: 決済実行ボタンのみ */}
          {isLoadedFromUrl ? (
            <button
              onClick={executeX402Payment}
              disabled={loading || !currentAddress}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: (loading || !currentAddress) ? '#9ca3af' : '#10b981',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (loading || !currentAddress) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <span>⏳</span>
                  決済処理中...
                </>
              ) : !currentAddress ? (
                <>
                  <span>🔗</span>
                  ウォレット接続が必要です
                </>
              ) : (
                <>
                  <span>💳</span>
                  x402決済を実行
                </>
              )}
            </button>
          ) : (
            /* 通常時: 請求URL生成ボタンのみ */
            <button
              onClick={generatePaymentRequest}
              disabled={!currentAddress || !recipient || !amount}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: (!currentAddress || !recipient || !amount) ? '#9ca3af' : '#10b981',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (!currentAddress || !recipient || !amount) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🔗</span>
              請求URL生成（マーチャント側）
            </button>
          )}

          <button
            onClick={resetForm}
            disabled={isLoadedFromUrl}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: isLoadedFromUrl ? '#f9fafb' : 'white',
              color: isLoadedFromUrl ? '#9ca3af' : '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoadedFromUrl ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoadedFromUrl ? 'リセット（無効）' : 'リセット'}
          </button>
        </div>

        {/* x402情報 */}
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          backgroundColor: '#f9fafb', 
          padding: '15px', 
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          marginTop: '20px'
        }}>
          <div style={{ fontWeight: '500', marginBottom: '8px' }}>⚡ x402 Payment Protocol:</div>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5' }}>
            <li>PaymentRequirements (402 response) → PaymentPayload (X-PAYMENT header) の標準フロー</li>
            <li>EIP-712署名による安全なauthorization</li>
            <li>Sepolia testnet + USDC での検証</li>
            <li>GitHub PR #619 の仕様に準拠</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default X402SimplePayment;