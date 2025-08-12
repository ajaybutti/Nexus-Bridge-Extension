export const TOKEN_MAPPING = {
  42161: {
    "0xaf88d065e77c8cc2239327c5edb3a432268e5831": {
      symbol: "USDC",
      decimals: 6,
    },
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": {
      symbol: "USDT",
      decimals: 6,
    },
  },
} as {
  [chainId: number]: {
    [tokenAddress: string]: {
      symbol: "USDC" | "USDT" | "ETH";
      decimals: number;
    };
  };
};
