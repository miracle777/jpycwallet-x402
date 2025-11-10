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

export async function transferJPYC(signer: ethers.Signer, to: string, amountJPYC: string) {
  const c = getErc20Contract(signer);
  const decimals: number = await c.decimals();
  const amount = ethers.parseUnits(amountJPYC, decimals);
  const tx = await c.transfer(to, amount);
  return await tx.wait();
}
