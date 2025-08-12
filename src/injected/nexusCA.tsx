import {
  EthereumProvider,
  NexusSDK,
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
  TOKEN_METADATA,
} from "@avail-project/nexus/core";
import { debugInfo } from "../utils/debug";
import Decimal from "decimal.js";
import { decodeFunctionData, parseUnits } from "viem";
import { erc20TransferAbi } from "../utils/multicall";
import {
  BridgeAndExecuteButton,
  NexusProvider,
  useNexus,
} from "@avail-project/nexus/ui";
import { createRoot, Root } from "react-dom/client";
import { erc20Abi } from "viem";

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

let reactRoot: Root;

function render(App: React.FC) {
  const nexusRoot = document.getElementById("nexus-root");
  debugInfo("Nexus root element:", nexusRoot);
  if (!nexusRoot) {
    debugInfo("Nexus root element not found, creating it");
    const newNexusRoot = document.createElement("div");
    newNexusRoot.id = "nexus-root";
    document.body.appendChild(newNexusRoot);
    debugInfo("Nexus root element created");
    debugInfo(document.getElementById("nexus-root"));
  }

  if (!reactRoot) {
    debugInfo("Creating React root for Nexus SDK");
    reactRoot = createRoot(document.getElementById("nexus-root")!);
  }

  debugInfo("Rendering Nexus App");
  reactRoot.render(<App />);
}

async function injectNexusCA() {
  window.nexus = new NexusSDK({
    network: "mainnet",
    debug: true,
  });
  let initialized = false;

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
        const { method, params } = args[0] as {
          method: string;
          params?: any[];
        };
        debugInfo("Intercepted request:", method, params, provider);
        if (["eth_requestAccounts", "eth_accounts"].includes(method)) {
          const res = await originalRequest.apply(this, args);
          debugInfo("Response from original request:", res);
          if (res && !initialized) {
            try {
              debugInfo("Initializing Nexus SDK");
              debugInfo("CA accounts:", window.nexus);
              window.nexus.initialize(provider);
              initialized = true;
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
        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          params[0].data.toLowerCase().startsWith("0xa9059cbb") // ERC20 transfer
        ) {
          debugInfo("Intercepted ERC20 transfer transaction:", params[0]);
          const unifiedBalances = await window.nexus.getUnifiedBalances();
          const tokenAddress = params[0].to.toLowerCase();
          const tokenIndex = unifiedBalances.findIndex((bal) =>
            bal.breakdown.find(
              (token) => token.contractAddress.toLowerCase() === tokenAddress
            )
          );
          if (tokenIndex === -1) {
            return originalRequest.apply(this, args);
          }
          const actualToken = unifiedBalances[tokenIndex].breakdown.find(
            (token) => token.contractAddress.toLowerCase() === tokenAddress
          );
          const decodedData = decodeFunctionData({
            abi: erc20TransferAbi,
            data: params[0].data,
          });

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan((decodedData.args![1] as bigint).toString())
          ) {
            // function NexusApp() {
            //   debugInfo("transferdata:", {
            //     token: actualToken,
            //     amount: decodedData.args![1],
            //   });
            //   const { setProvider } = useNexus();
            //   debugInfo("Setting provider with Chain Abstraction");
            //   debugInfo(
            //     "Nexus SDK provider:",
            //     window.nexus.getEVMProviderWithCA()
            //   );
            //   setProvider(window.nexus.getEVMProviderWithCA());
            //   debugInfo("Nexus SDK provider set with Chain Abstraction");
            //   return (
            //     <BridgeAndExecuteButton
            //       contractAddress="0x2df1c51e09aecf9cacb7bc98cb1742757f163df7"
            //       // @ts-expect-error
            //       contractAbi={erc20TransferAbi}
            //       functionName="transfer"
            //       prefill={{
            //         toChainId: SUPPORTED_CHAINS.ARBITRUM,
            //         token: "USDC",
            //         amount: "5",
            //       }}
            //       buildFunctionParams={(token, amount, _chainId, user) => {
            //         const decimals = TOKEN_METADATA[token].decimals;
            //         const amountWei = parseUnits(amount, decimals);
            //         const tokenAddr = TOKEN_CONTRACT_ADDRESSES[token][_chainId];
            //         return { functionParams: [tokenAddr, amountWei, user, 0] };
            //       }}
            //     >
            //       {({ onClick, isLoading, disabled }) => (
            //         <button
            //           id="nexus-button"
            //           onClick={onClick}
            //           disabled={disabled || isLoading}
            //         >
            //           {isLoading
            //             ? "Processing…"
            //             : "Bridge & Supply to Hyperliquid"}
            //         </button>
            //       )}
            //     </BridgeAndExecuteButton>
            //   );
            // }
            // function NexusProviderApp() {
            //   return (
            //     <NexusProvider
            //       config={{
            //         debug: true,
            //         network: "mainnet",
            //       }}
            //     >
            //       <NexusApp />
            //     </NexusProvider>
            //   );
            // }
            // debugInfo("Rendering Nexus App for Chain Abstraction");
            // render(NexusProviderApp);
            // debugInfo("Nexus App rendered for Chain Abstraction");
            // document.getElementById("nexus-button")?.click();
            // // return originalRequest.apply(this, args);
            // await new Promise((resolve) => {
            //   setTimeout(() => {
            //     debugInfo("Resolving after 1000ms");
            //     resolve(true);
            //   }, 100000);
            // });

            try {
              const execResult = await window.nexus.bridgeAndExecute({
                token: "USDC",
                amount: "5",
                toChainId: SUPPORTED_CHAINS.ARBITRUM,
                execute: {
                  buildFunctionParams: (token, amount, _chainId, user) => {
                    const decimals = TOKEN_METADATA[token].decimals;
                    const amountWei = parseUnits(amount, decimals);
                    debugInfo("Building function params:", {
                      TOKEN_CONTRACT_ADDRESSES,
                      token,
                      _chainId,
                    });
                    const tokenAddr =
                      TOKEN_CONTRACT_ADDRESSES["USDC"][_chainId];
                    return { functionParams: [tokenAddr, amountWei, user, 0] };
                  },
                  contractAddress: "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7",
                  contractAbi: erc20Abi,
                  functionName: "transfer",
                },
              });
              debugInfo("Execution result:", execResult);
            } catch (error) {
              console.error("Error executing Nexus SDK:", error);
              debugInfo(
                "Nexus SDK execution failed, continuing without Chain Abstraction",
                error
              );
            }
          }
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
