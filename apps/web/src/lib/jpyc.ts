import { ethers } from "ethers";
import { erc20Abi, jpycAddress, rpcUrl } from "./chain";

export function getProvider() {
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getErc20Contract(providerOrSigner: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(jpycAddress, erc20Abi, providerOrSigner);
}

export async function readBalance(addr: string) {
  const provider = getProvider();
  const c = getErc20Contract(provider);
  const [decimals, bal] = await Promise.all([c.decimals(), c.balanceOf(addr)]);
  return Number(ethers.formatUnits(bal, decimals));
}

export async function checkSufficientBalance(signer: ethers.Signer, amountJPYC: string): Promise<{ sufficient: boolean; currentBalance: number; required: number }> {
  const address = await signer.getAddress();
  const currentBalance = await readBalance(address);
  const required = parseFloat(amountJPYC);
  
  return {
    sufficient: currentBalance >= required,
    currentBalance,
    required,
  };
}

export async function transferJPYC(signer: ethers.Signer, to: string, amountJPYC: string) {
  // 残高チェック
  const balanceCheck = await checkSufficientBalance(signer, amountJPYC);
  if (!balanceCheck.sufficient) {
    throw new Error(`JPYC残高が不足しています。必要: ${balanceCheck.required} JPYC, 現在: ${balanceCheck.currentBalance} JPYC`);
  }

  const c = getErc20Contract(signer);
  const decimals: number = await c.decimals();
  const amount = ethers.parseUnits(amountJPYC, decimals);
  const tx = await c.transfer(to, amount);
  return await tx.wait();
}
