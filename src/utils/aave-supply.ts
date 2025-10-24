import { createPublicClient, createWalletClient, custom, parseUnits, formatUnits, getContract } from 'viem';
import { base } from 'viem/chains';

// Aave Pool contract address on Base
const AAVE_POOL_ADDRESS = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";

// USDC contract address on Base
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Minimal Aave Pool ABI - just the supply function
const AAVE_POOL_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "onBehalfOf",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "referralCode",
        "type": "uint16"
      }
    ],
    "name": "supply",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ERC20 ABI for approve function
const ERC20_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export async function supplyToAave(amount: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log(`🏦 NEXUS: Starting Aave supply of ${amount} USDC`);

    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    // Create clients
    const publicClient = createPublicClient({
      chain: base,
      transport: custom(window.ethereum),
    });

    const walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
    });

    // Get user address
    const [userAddress] = await walletClient.getAddresses();
    if (!userAddress) {
      throw new Error('No wallet address found');
    }

    console.log(`🏦 NEXUS: User address: ${userAddress}`);

    // Convert amount to wei (USDC has 6 decimals)
    const amountWei = parseUnits(amount, 6);
    console.log(`🏦 NEXUS: Amount in wei: ${amountWei}`);

    // Create contract instances
    const usdcContract = getContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      client: { public: publicClient, wallet: walletClient },
    });

    const aavePoolContract = getContract({
      address: AAVE_POOL_ADDRESS,
      abi: AAVE_POOL_ABI,
      client: { public: publicClient, wallet: walletClient },
    });

    // Step 1: Check current allowance
    console.log(`🏦 NEXUS: Checking USDC allowance for Aave Pool...`);
    const currentAllowance = await usdcContract.read.allowance([userAddress, AAVE_POOL_ADDRESS]);
    console.log(`🏦 NEXUS: Current allowance: ${formatUnits(currentAllowance, 6)} USDC`);

    // Step 2: Approve if needed
    if (currentAllowance < amountWei) {
      console.log(`🏦 NEXUS: Insufficient allowance, approving ${amount} USDC for Aave Pool...`);
      
      const approveTx = await usdcContract.write.approve([AAVE_POOL_ADDRESS, amountWei], {
        account: userAddress,
      });

      console.log(`🏦 NEXUS: Approve transaction sent: ${approveTx}`);
      
      // Wait for approval confirmation
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      console.log(`🏦 NEXUS: Approve transaction confirmed`);
    } else {
      console.log(`🏦 NEXUS: Sufficient allowance already exists`);
    }

    // Step 3: Supply to Aave
    console.log(`🏦 NEXUS: Supplying ${amount} USDC to Aave...`);
    
    const supplyTx = await aavePoolContract.write.supply([
      USDC_ADDRESS,  // asset address (USDC)
      amountWei,     // amount to supply
      userAddress,   // onBehalfOf (user receives aTokens)
      0              // referralCode (no referral)
    ], {
      account: userAddress,
    });

    console.log(`🏦 NEXUS: Supply transaction sent: ${supplyTx}`);
    
    // Wait for supply confirmation
    await publicClient.waitForTransactionReceipt({ hash: supplyTx });
    console.log(`🏦 NEXUS: Supply transaction confirmed: ${supplyTx}`);

    return {
      success: true,
      txHash: supplyTx,
    };
    
  } catch (error: any) {
    console.error('🏦 NEXUS: Error supplying to Aave:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

export function getAavePoolAddress(): string {
  return AAVE_POOL_ADDRESS;
}

export function getUsdcAddress(): string {
  return USDC_ADDRESS;
}
