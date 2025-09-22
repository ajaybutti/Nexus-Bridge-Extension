import { defineChain, createPublicClient, http } from "viem";

const hyperEvmChain = defineChain({
  id: 999,
  name: "HyperEVM Mainnet",
  network: "hyperevm",
  nativeCurrency: {
    name: "HYPE",
    symbol: "HYPE",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.hyperliquid.xyz/evm"] },
    public: { http: ["https://rpc.hyperliquid.xyz/evm"] },
  },
  blockExplorers: {
    default: { name: "HyperEVM Explorer", url: "https://hyperevmscan.io/" },
  },
});

export const publicClient = createPublicClient({
  chain: hyperEvmChain,
  transport: http(),
});
