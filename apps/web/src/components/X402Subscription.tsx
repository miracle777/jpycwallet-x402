import React, { useState } from 'react';
import { ethers } from 'ethers';
import SubscriptionMerchantDashboard from './SubscriptionMerchantDashboard';

interface X402SubscriptionProps {
  currentAddress?: string;
  signer?: ethers.Signer;
  onPaymentComplete?: (txHash: string) => void;
}

// x402 PaymentRequirements for subscription
interface SubscriptionPaymentRequirements {
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
    subscriptionInfo: {
      interval: string;
      duration: number;
      planName: string;
      merchantName: string;
      merchantId: string;
    };
  };
}

// x402 Subscription PaymentPayload
interface SubscriptionPaymentPayload {
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
    subscriptionData?: {
      planId: string;
      interval: string;
      startDate: string;
      endDate: string;
    };
  };
}

interface SubscriptionPlan {
  name: string;
  amount: string;
  interval: 'daily' | 'weekly' | 'monthly';
  duration: number;
  description: string;
  merchantName: string;
  merchantId: string;
}

const X402Subscription: React.FC<X402SubscriptionProps> = ({
  currentAddress,
  signer,
  onPaymentComplete,
}) => {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '30px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
        border: '1px solid #e5e7eb' 
      }}>
        <SubscriptionMerchantDashboard 
          currentAddress={currentAddress}
          signer={signer}
        />
      </div>
    </div>
  );
};

export default X402Subscription;