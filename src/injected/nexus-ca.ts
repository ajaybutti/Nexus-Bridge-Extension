import { EthereumProvider, NexusSDK } from "@avail-project/nexus/core";

console.debug("Nexus SDK version:", NexusSDK);

type EVMProvider = EthereumProvider & {
  isConnected?: () => Promise<boolean>;
};

const providers = [] as EVMProvider[];

window.addEventListener("eip6963:announceProvider", (event: any) => {
  console.debug("eip6963:announceProvider event received:", event);
  providers.push(event.detail.provider);
});

// The DApp dispatches a request event which will be heard by
// Wallets' code that had run earlier
window.dispatchEvent(new Event("eip6963:requestProvider"));

async function appendCA() {
  window.arcana = {
    ca: new NexusSDK({
      network: "mainnet",
      debug: true,
    }),
  };

  if (!providers.length) {
    console.debug(
      "No providers found, waiting for eip6963:announceProvider events."
    );
    return;
  }
  console.debug("Providers found:", providers);
  for (const provider of providers) {
    if (provider) {
      const originalRequest = provider.request;
      console.debug("Original provider request:", originalRequest, provider);

      provider.request = async function (...args) {
        const { method, params } = args[0];
        console.debug("Intercepted request:", method, params);
        console.debug("Provider:", provider);
        if (["eth_requestAccounts", "eth_accounts"].includes(method)) {
          const res = await originalRequest.apply(this, args);
          console.debug("Response from original request:", res);
          if (res) {
            console.debug("Arcana CA init");
            console.debug("Arcana CA setEVMProvider with provider:", provider);
            try {
              console.debug("Initializing Arcana CA");
              console.debug("CA accounts:", window.arcana.ca);
              window.arcana.ca.initialize(provider);
            } catch (error) {
              console.error("Error initializing Arcana CA:", error);
              console.debug(
                "Arcana CA initialization failed, continuing without CA",
                error
              );
            }
            console.debug("Arcana CA initialized with accounts:", res);
          }
          return res;
        }
        return originalRequest.apply(this, args);
      };

      if (provider.isConnected) {
        console.debug("Provider supports isConnected method", provider);
        const originalIsConnected = provider.isConnected;
        provider.isConnected = async function (...args) {
          const isConnected = await originalIsConnected.apply(this, args);
          console.debug("Arcana CA init");
          console.debug("Provider isConnected result:", isConnected);
          console.debug("Provider:", provider);
          if (isConnected) {
            try {
              console.debug("Initializing Arcana CA");
              window.arcana.ca.initialize(provider);
            } catch (error) {
              console.error("Error initializing Arcana CA:", error);
              console.debug(
                "Arcana CA initialization failed, continuing without CA",
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

appendCA();
