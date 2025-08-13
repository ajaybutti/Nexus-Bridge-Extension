import { UserAsset } from "@avail-project/nexus/core";
import { debugInfo } from "../utils/debug";

window.nexusCache = new Map<string, any>();

if (window.nexus) {
  window.nexus
    .getUnifiedBalances()
    .then((balances) => {
      window.nexusCache.set("unifiedBalances", {
        balances,
        expiry: Date.now() + 60 * 1000, // Cache for 1 minute
      });
      debugInfo("Unified balances cached:", balances);
    })
    .catch((error) => {
      debugInfo("Failed to fetch unified balances:", error);
    });
}

export function clearCache() {
  window.nexusCache = new Map();
}

export async function fetchUnifiedBalances() {
  if (window.nexusCache.has("unifiedBalances")) {
    const cached = window.nexusCache.get("unifiedBalances");
    if (cached.expiry > Date.now()) {
      return cached.balances as UserAsset[];
    }
  }
  const balances = await window.nexus.getUnifiedBalances();
  window.nexusCache.set("unifiedBalances", {
    balances,
    expiry: Date.now() + 60 * 1000, // Cache for 1 minute
  });
  debugInfo("Unified balances fetched and cached:", balances);
  return balances;
}
