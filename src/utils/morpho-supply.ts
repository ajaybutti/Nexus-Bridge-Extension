import { createPublicClient, createWalletClient, custom, getContract, parseUnits } from 'viem';
import { base } from 'viem/chains';

// USDC token address on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// ERC20 ABI for approve function
const ERC20_ABI = [
  {
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_owner", "type": "address" },
      { "name": "_spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Morpho Vault ABI for supply function
const MORPHO_VAULT_ABI = [
  {
    "inputs": [
      { "name": "assets", "type": "uint256" },
      { "name": "receiver", "type": "address" }
    ],
    "name": "deposit",
    "outputs": [{ "name": "shares", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export async function supplyToMorphoVault(amount: string, vaultAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log(`🦋 NEXUS: Starting Morpho vault supply for ${amount} USDC to vault ${vaultAddress}`);

    if (!(window as any).ethereum) {
      throw new Error('No Ethereum provider found');
    }

    // Create clients
    const publicClient = createPublicClient({
      chain: base,
      transport: custom((window as any).ethereum),
    });

    const walletClient = createWalletClient({
      chain: base,
      transport: custom((window as any).ethereum),
    });

    // Get user's account
    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('No account connected');
    }

    console.log(`🦋 NEXUS: Using account ${account} for Morpho vault supply`);

    // Convert amount to USDC units (6 decimals)
    const amountInWei = parseUnits(amount, 6);
    console.log(`🦋 NEXUS: Amount in wei: ${amountInWei}`);

    // Create contract instances
    const usdcContract = getContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      client: publicClient,
    });

    const morphoVaultContract = getContract({
      address: vaultAddress as `0x${string}`,
      abi: MORPHO_VAULT_ABI,
      client: publicClient,
    });

    // Check current allowance
    console.log(`🦋 NEXUS: Checking allowance for vault ${vaultAddress}`);
    const currentAllowance = await usdcContract.read.allowance([account, vaultAddress as `0x${string}`]);
    console.log(`🦋 NEXUS: Current allowance: ${currentAllowance}`);

    // Approve if needed
    if (currentAllowance < amountInWei) {
      console.log(`🦋 NEXUS: Insufficient allowance, approving ${amountInWei} USDC`);
      const approveHash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [vaultAddress as `0x${string}`, amountInWei],
        account,
      });

      console.log(`🦋 NEXUS: Approve transaction sent: ${approveHash}`);
      
      // Wait for approval to be mined
      const approveReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: approveHash,
        timeout: 60000 
      });
      
      if (approveReceipt.status !== 'success') {
        throw new Error('Approval transaction failed');
      }
      
      console.log(`🦋 NEXUS: Approval confirmed in block ${approveReceipt.blockNumber}`);
    } else {
      console.log(`🦋 NEXUS: Sufficient allowance already exists`);
    }

    // Supply to Morpho vault
    console.log(`🦋 NEXUS: Depositing ${amountInWei} USDC to Morpho vault`);
    const depositHash = await walletClient.writeContract({
      address: vaultAddress as `0x${string}`,
      abi: MORPHO_VAULT_ABI,
      functionName: 'deposit',
      args: [amountInWei, account],
      account,
    });

    console.log(`🦋 NEXUS: Deposit transaction sent: ${depositHash}`);

    // Wait for deposit to be mined
    const depositReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: depositHash,
      timeout: 60000 
    });

    if (depositReceipt.status !== 'success') {
      throw new Error('Deposit transaction failed');
    }

    console.log(`🦋 NEXUS: Deposit confirmed in block ${depositReceipt.blockNumber}`);
    console.log(`🦋 NEXUS: Successfully supplied ${amount} USDC to Morpho vault!`);

    return {
      success: true,
      txHash: depositHash
    };

  } catch (error: any) {
    console.error('🦋 NEXUS: Error supplying to Morpho vault:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}
