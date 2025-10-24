import { createPublicClient, createWalletClient, custom, parseEther, formatEther } from 'viem';
import { mainnet } from 'viem/chains';

// Extend Window interface for ethereum provider
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Lido stETH contract ABI - submit function for staking
export const LidoStakingAbi = [
  {
    type: "function",
    name: "submit",
    inputs: [
      { name: "_referral", type: "address", internalType: "address" }
    ],
    outputs: [
      { name: "", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "_account", type: "address", internalType: "address" }
    ],
    outputs: [
      { name: "", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "view",
  }
] as const;

// Lido stETH contract address on Ethereum mainnet
export const LIDO_STETH_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" as const;

// Your rewards address (you can change this)
export const MY_REWARDS_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Stakes ETH with Lido and receives stETH in return
 * @param ethAmount - Amount of ETH to stake (e.g., "0.1")
 * @returns Promise with transaction hash or error
 */
export async function stakeEthWithLido(ethAmount: string): Promise<{success: boolean, txHash?: string, error?: string}> {
  try {
    console.log(`🔥 NEXUS: Starting Lido ETH staking for ${ethAmount} ETH`);
    
    if (!window.ethereum) {
      throw new Error('No ethereum provider found');
    }

    // Create viem clients
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: custom(window.ethereum)
    });

    const walletClient = createWalletClient({
      chain: mainnet,
      transport: custom(window.ethereum)
    });

    // Get user account
    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('No wallet account found');
    }

    console.log(`🔥 NEXUS: Staking ${ethAmount} ETH from account ${account}`);

    // Convert ETH amount to wei
    const ethAmountWei = parseEther(ethAmount);
    
    // Check if user has enough ETH
    const balance = await publicClient.getBalance({ address: account });
    console.log(`🔥 NEXUS: Current ETH balance: ${formatEther(balance)} ETH`);
    
    if (balance < ethAmountWei) {
      throw new Error(`Insufficient ETH balance. Need ${ethAmount} ETH, have ${formatEther(balance)} ETH`);
    }

    // Simulate the transaction first
    try {
      await publicClient.simulateContract({
        address: LIDO_STETH_ADDRESS,
        abi: LidoStakingAbi,
        functionName: 'submit',
        args: [MY_REWARDS_ADDRESS],
        value: ethAmountWei,
        account
      });
    } catch (simError: any) {
      console.error('🔥 NEXUS: Lido staking simulation failed:', simError);
      throw new Error(`Transaction simulation failed: ${simError.message}`);
    }

    console.log('🔥 NEXUS: Simulation successful, executing Lido staking...');

    // Execute the staking transaction
    const txHash = await walletClient.writeContract({
      address: LIDO_STETH_ADDRESS,
      abi: LidoStakingAbi,
      functionName: 'submit',
      args: [MY_REWARDS_ADDRESS],
      value: ethAmountWei,
      account
    });

    console.log(`🔥 NEXUS: Lido staking transaction submitted: ${txHash}`);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash,
      timeout: 60000 // 1 minute timeout
    });

    if (receipt.status === 'success') {
      console.log(`🔥 NEXUS: Lido staking successful! ${ethAmount} ETH staked`);
      return {
        success: true,
        txHash: txHash
      };
    } else {
      throw new Error('Transaction failed');
    }

  } catch (error: any) {
    console.error('🔥 NEXUS: Error staking ETH with Lido:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Get user's stETH balance
 * @param userAddress - User's wallet address
 * @returns Promise with stETH balance
 */
export async function getStEthBalance(userAddress: string): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error('No ethereum provider found');
    }

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: custom(window.ethereum)
    });

    const balance = await publicClient.readContract({
      address: LIDO_STETH_ADDRESS,
      abi: LidoStakingAbi,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`]
    });

    return formatEther(balance);
  } catch (error) {
    console.error('🔥 NEXUS: Error getting stETH balance:', error);
    return '0';
  }
}
