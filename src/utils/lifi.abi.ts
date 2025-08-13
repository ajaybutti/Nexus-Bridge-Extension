export const LifiAbi = [
  {
    type: "function",
    name: "swapTokensSingleV3ERC20ToERC20",
    inputs: [
      { name: "_transactionId", type: "bytes32", internalType: "bytes32" },
      { name: "_integrator", type: "string", internalType: "string" },
      { name: "_referrer", type: "string", internalType: "string" },
      { name: "_receiver", type: "address", internalType: "address payable" },
      { name: "_minAmountOut", type: "uint256", internalType: "uint256" },
      {
        name: "_swapData",
        type: "tuple",
        internalType: "struct LibSwap.SwapData",
        components: [
          { name: "callTo", type: "address", internalType: "address" },
          { name: "approveTo", type: "address", internalType: "address" },
          { name: "sendingAssetId", type: "address", internalType: "address" },
          {
            name: "receivingAssetId",
            type: "address",
            internalType: "address",
          },
          { name: "fromAmount", type: "uint256", internalType: "uint256" },
          { name: "callData", type: "bytes", internalType: "bytes" },
          { name: "requiresDeposit", type: "bool", internalType: "bool" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
