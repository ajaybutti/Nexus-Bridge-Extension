import { EthereumProvider, NexusSDK } from "@avail-project/nexus/core";
import { debugInfo } from "../utils/debug";

type EVMProvider = EthereumProvider & {
  isConnected?: () => Promise<boolean>;
};

const providers = [] as EVMProvider[];

window.addEventListener("eip6963:announceProvider", (event: any) => {
  debugInfo("eip6963:announceProvider event received:", event);
  providers.push(event.detail.provider);
});

// The DApp dispatches a request event which will be heard by
// Wallets' code that had run earlier
window.dispatchEvent(new Event("eip6963:requestProvider"));

async function injectNexusCA() {
  window.nexus = new NexusSDK({
    network: "mainnet",
    debug: true,
  });

  if (!providers.length) {
    debugInfo(
      "No providers found, waiting for eip6963:announceProvider events."
    );
    return;
  }
  debugInfo("Providers found:", providers);
  for (const provider of providers) {
    if (provider) {
      const originalRequest = provider.request;

      provider.request = async function (...args) {
        const { method, params } = args[0];
        debugInfo("Intercepted request:", method, params, provider);
        if (["eth_requestAccounts", "eth_accounts"].includes(method)) {
          const res = await originalRequest.apply(this, args);
          debugInfo("Response from original request:", res);
          if (res) {
            try {
              debugInfo("Initializing Nexus SDK");
              debugInfo("CA accounts:", window.nexus);
              window.nexus.initialize(provider);
            } catch (error) {
              console.error("Error initializing Nexus SDK:", error);
              debugInfo(
                "Nexus SDK initialization failed, continuing without Chain Abstraction",
                error
              );
            }
            debugInfo("Nexus SDK initialized with accounts:", res);
          }
          return res;
        }
        return originalRequest.apply(this, args);
      };

      if (provider.isConnected) {
        debugInfo("Provider supports isConnected method", provider);
        const originalIsConnected = provider.isConnected;
        provider.isConnected = async function (...args) {
          const isConnected = await originalIsConnected.apply(this, args);
          debugInfo("Provider isConnected result:", isConnected);
          debugInfo("Provider:", provider);
          if (isConnected) {
            try {
              debugInfo("Initializing Nexus SDK");
              window.nexus.initialize(provider);
            } catch (error) {
              console.error("Error initializing Nexus SDK:", error);
              debugInfo(
                "Nexus SDK initialization failed, continuing without Chain Abstraction",
                error
              );
            }
          }
          return isConnected;
        };
      }
    }
  }
}

injectNexusCA();
