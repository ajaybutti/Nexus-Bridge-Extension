export const formatDecimalAmount = (amount: string): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toFixed(3);
};

export const getNameOrUrl = (): string => {
  const DEFAULT_MAPPING: Record<string, string> = {
    "app.hypurr.fi": "HypurrFi",
    "app.hyperliquid.xyz": "HyperLiquid",
    "app.hyperlend.finance": "HyperLend",
    "usefelix.xyz": `Felix`,
  };

  try {
    const origin = window.location.origin;
    const key = Object.keys(DEFAULT_MAPPING).find((k) => origin.includes(k));

    const value = key ? DEFAULT_MAPPING[key] : "HyperLiquid";
    return value;
  } catch {
    return "Invalid URL";
  }
};

export const getExplorerUrl = (hash: string, url: string, path = "tx") => {
  const expUrl = new URL(url);
  let expUrlPath = "";
  if (expUrl.pathname) {
    expUrlPath = expUrl.pathname.endsWith("/")
      ? expUrl.pathname.substring(0, expUrl.pathname.length - 1)
      : expUrl.pathname;
  }
  const pathString = `${expUrlPath}/${path}/${hash}`;
  return new URL(pathString, url).href;
};

export const getChainName = (inputChain: string): string => {
  const DEFAULT_MAPPING: Record<string, string> = {
    Ethereum: "Ethereum Mainnet",
    Arbitrum: "Arbitrum One",
    Base: "Base",
    "BNB Chain": "BNB Smart Chain",
    HyperEVM: "HyperEVM",
    // Kaia: "Kaia Mainnet",
    // OP: "OP Mainnet",
    // Scroll: "Scroll",
    // Sophon: "Sophon",
    // Polygon: "Polygon PoS",
    // Avalanche: "Avalanche C-Chain",
  };

  const key = Object.keys(DEFAULT_MAPPING).find((k) => inputChain.includes(k));
  const value = key ? DEFAULT_MAPPING[key] : "Invalid";
  return value;
};

export const getExplorerBase = (chainId?: number) => {
  switch (chainId) {
    case 1:
      return "https://etherscan.io";
    case 56:
      return "https://bscscan.com";
    case 137:
      return "https://polygonscan.com";
    case 10:
      return "https://optimistic.etherscan.io";
    case 42161:
      return "https://arbiscan.io";
    case 8453:
      return "https://basescan.org";
    case 43114:
      return "https://snowscan.xyz";
    case 534352:
      return "https://scrollscan.com";
    case 50104:
      return "https://sophscan.xyz";
    case 8217:
      return "https://kaiascan.io";
    case 999:
      return "https://purrsec.com";
    default:
      return "https://purrsec.com";
  }
};
