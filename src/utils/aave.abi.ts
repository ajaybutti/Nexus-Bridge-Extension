// Aave V3 Pool contract ABI and addresses
export const AaveV3PoolAbi = [
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "onBehalfOf", type: "address" },
      { internalType: "uint16", name: "referralCode", type: "uint16" }
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// Aave V3 Pool addresses per chain
export const AAVE_V3_POOL_ADDRESSES: { [chainId: number]: string } = {
  8453: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5", // Base
  1: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", // Ethereum
  10: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Optimism
  42161: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Arbitrum
  137: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Polygon
  43114: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Avalanche
  534352: "0x11fCfe756c05AD438e312a7fd934381537D3cFfe", // Scroll
};

// USDC addresses per chain
export const USDC_ADDRESSES: { [chainId: number]: string } = {
  1: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Ethereum
  8453: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Base
  10: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", // Optimism
  42161: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // Arbitrum
  137: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // Polygon
  43114: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", // Avalanche
  56: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // BNB (18 decimals!)
  534352: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4", // Scroll
};

// Aave domains to intercept
export const AAVE_DOMAINS = ["app.aave.com", "aave.com"];

// Function signature for supply: 0x617ba037
export const AAVE_SUPPLY_FUNCTION_SIG = "0x617ba037";
