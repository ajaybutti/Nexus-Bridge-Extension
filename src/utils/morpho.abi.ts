import { parseAbi } from "viem";

// Morpho protocol domains
export const MORPHO_DOMAINS = [
  "app.morpho.org",
  "morpho.org"
];

// Morpho Vault contract ABI (simplified for deposit/supply functions)
export const MorphoVaultAbi = parseAbi([
  "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
  "function mint(uint256 shares, address receiver) external returns (uint256 assets)",
  "function asset() external view returns (address)",
  "function totalAssets() external view returns (uint256)",
  "function convertToShares(uint256 assets) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function maxDeposit(address) external view returns (uint256)",
  "function previewDeposit(uint256 assets) external view returns (uint256)",
]);

// Function signature for Morpho deposit
export const MORPHO_DEPOSIT_FUNCTION_SIG = "0x6e553f65"; // deposit(uint256,address)

// Morpho Vault addresses on different chains (Base focus for USDC)
export const MORPHO_VAULT_ADDRESSES: { [chainId: number]: string[] } = {
  8453: [
    // Base USDC vaults - add actual Morpho vault addresses here
    "0x...", // Example Morpho USDC vault on Base
  ],
  1: [
    // Ethereum USDC vaults
    "0x...", // Example Morpho USDC vault on Ethereum
  ],
};

// USDC addresses per chain (same as Aave but kept for reference)
export const MORPHO_USDC_ADDRESSES: { [chainId: number]: string } = {
  1: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Ethereum
  8453: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Base
  10: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", // Optimism
  42161: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // Arbitrum
  137: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // Polygon
  43114: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", // Avalanche
};
