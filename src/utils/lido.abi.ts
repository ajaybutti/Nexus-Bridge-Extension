export const LidoAbi = [
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
  },
  {
    type: "function", 
    name: "getTotalShares",
    inputs: [],
    outputs: [
      { name: "", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sharesOf",
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
export const LIDO_STETH_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";

// Common Lido domains
export const LIDO_DOMAINS = [
  "stake.lido.fi",
  "lido.fi",
  "app.lido.fi"
];
