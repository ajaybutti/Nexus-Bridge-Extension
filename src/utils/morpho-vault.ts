import { parseUnits, formatUnits, parseAbi } from 'viem';

// Base USDC address
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const VAULT_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) external returns (uint256)',
  'function asset() external view returns (address)',
  'function totalAssets() external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)'
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
]);

// Extract vault address from Morpho URL
export function extractVaultAddressFromUrl(url: string): string | null {
  // Pattern: https://app.morpho.org/base/vault/0xVAULT_ADDRESS/name?tab=vault
  const match = url.match(/\/vault\/(0x[a-fA-F0-9]{40})/);
  return match ? match[1] : null;
}

// Approve and deposit to Morpho vault using window.ethereum
export async function approveAndDepositToVault(
  vaultAddress: string,
  depositAmount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!(window as any).ethereum) {
      throw new Error('No wallet found');
    }

    const ethereum = (window as any).ethereum;
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];
    
    const amount = parseUnits(depositAmount, 6); // USDC has 6 decimals
    
    console.log(`🔮 MORPHO: Starting approve + deposit for ${depositAmount} USDC to vault ${vaultAddress}`);
    console.log(`🔮 MORPHO: User address: ${userAddress}`);
    console.log(`🔮 MORPHO: Amount in wei: ${amount.toString()}`);
    
    // Check current allowance using eth_call
    const allowanceData = `0xdd62ed3e${userAddress.slice(2).padStart(64, '0')}${vaultAddress.slice(2).padStart(64, '0')}`;
    const allowanceResult = await ethereum.request({
      method: 'eth_call',
      params: [{
        to: USDC_ADDRESS,
        data: allowanceData
      }, 'latest']
    });
    
    const currentAllowance = BigInt(allowanceResult);
    const formattedAllowance = formatUnits(currentAllowance, 6);
    console.log(`🔮 MORPHO: Current allowance: ${formattedAllowance} USDC`);
    
    // Approve if needed
    if (currentAllowance < amount) {
      console.log(`🔮 MORPHO: Approving ${depositAmount} USDC...`);
      
      const approveData = `0x095ea7b3${vaultAddress.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
      
      const approveTxHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: USDC_ADDRESS,
          data: approveData
        }]
      });
      
      console.log(`🔮 MORPHO: Approve tx hash: ${approveTxHash}`);
      
      // Wait for approval transaction
      let approveReceipt = null;
      while (!approveReceipt) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          approveReceipt = await ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [approveTxHash]
          });
        } catch (e) {
          // Transaction might still be pending
        }
      }
      
      if (approveReceipt.status === '0x0') {
        throw new Error('Approval transaction failed');
      }
      
      console.log(`✅ MORPHO: USDC approved successfully`);
    } else {
      console.log(`✅ MORPHO: Already have sufficient allowance`);
    }
    
    // Deposit to vault
    console.log(`🔮 MORPHO: Depositing ${depositAmount} USDC to vault...`);
    
    const depositData = `0x6e553f65${amount.toString(16).padStart(64, '0')}${userAddress.slice(2).padStart(64, '0')}`;
    
    const depositTxHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userAddress,
        to: vaultAddress,
        data: depositData
      }]
    });
    
    console.log(`🔮 MORPHO: Deposit tx hash: ${depositTxHash}`);
    console.log(`✅ MORPHO: Deposit transaction sent successfully`);
    
    return {
      success: true,
      txHash: depositTxHash
    };
    
  } catch (error: any) {
    console.error('❌ MORPHO: Error during approve/deposit:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during deposit'
    };
  }
}

export { USDC_ADDRESS, VAULT_ABI, ERC20_ABI };
