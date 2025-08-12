import {
  EthereumProvider,
  NexusSDK,
  SUPPORTED_CHAINS,
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
import { useEffect, useRef } from "react";
import { TOKEN_MAPPING } from "../utils/constants";
import { fetchUnifiedBalances } from "./cache";

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
  if (!nexusRoot) {
    const newNexusRoot = document.createElement("div");
    newNexusRoot.id = "nexus-root";
    document.body.appendChild(newNexusRoot);
  }

  if (!reactRoot) {
    reactRoot = createRoot(document.getElementById("nexus-root")!);
  }

  document
    .querySelector(".sc-bBABsx.fAsTrb:has(.sc-fLcnxK.iOdKba.modal)")
    ?.setAttribute("style", "z-index: 40");

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
  for (const provider of providers) {
    if (provider) {
      const originalRequest = provider.request;

      provider.request = async function (...args) {
        let isNexusRequest = false;
        const { method, params } = args[0] as {
          method: string;
          params?: any[];
        };
        debugInfo("Intercepted request:", method, params, provider);
        if (["eth_requestAccounts", "eth_accounts"].includes(method)) {
          const res = await originalRequest.apply(this, args);
          if (res && !initialized) {
            try {
              debugInfo("Initializing Nexus SDK");
              window.nexus.initialize(provider);
              initialized = true;
              fetchUnifiedBalances();
            } catch (error) {
              debugInfo(
                "Nexus SDK initialization failed, continuing without Chain Abstraction",
                error
              );
            }
          }
          return res;
        }
        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          (params[0].data.toLowerCase().startsWith("0xa9059cbb") || // ERC20 transfer
            params[0].data.toLowerCase().startsWith("0x23b872dd")) // ERC20 transferFrom
        ) {
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

          const amount = params[0].data.toLowerCase().startsWith("0xa9059cbb")
            ? (decodedData.args![1] as bigint).toString()
            : (decodedData.args![2] as bigint).toString();

          debugInfo("amount decoded:", amount);
          debugInfo("actual contract:", decodedData.args![0]);

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan(amount)
          ) {
            function NexusApp() {
              const { setProvider, initializeSdk } = useNexus();
              const buttonRef = useRef<HTMLButtonElement>(null);
              setProvider(window.nexus.getEVMProviderWithCA());
              useEffect(() => {
                // initializeSdk(window.nexus.getEVMProviderWithCA()).then(() => {
                if (buttonRef.current) {
                  buttonRef.current.click();
                }
                // });
              }, []);
              return (
                <BridgeAndExecuteButton
                  contractAddress={decodedData.args![0] as `0x${string}`}
                  contractAbi={erc20Abi}
                  functionName={decodedData.functionName}
                  prefill={{
                    toChainId: SUPPORTED_CHAINS.ARBITRUM,
                    token:
                      TOKEN_MAPPING[SUPPORTED_CHAINS.ARBITRUM][
                        tokenAddress.toLowerCase()
                      ].symbol,
                    amount: new Decimal(amount)
                      .div(
                        Decimal.pow(
                          10,
                          TOKEN_MAPPING[SUPPORTED_CHAINS.ARBITRUM][tokenAddress]
                            .decimals
                        )
                      )
                      .toFixed(),
                  }}
                  buildFunctionParams={(token, amount, _chainId, user) => {
                    debugInfo(
                      "buildFunctionParams",
                      token,
                      amount,
                      _chainId,
                      user
                    );
                    const amountWei = parseUnits(
                      amount,
                      TOKEN_MAPPING[SUPPORTED_CHAINS.ARBITRUM][tokenAddress]
                        .decimals
                    );
                    return {
                      functionParams: [tokenAddress, amountWei],
                    };
                  }}
                >
                  {({ onClick, isLoading, disabled }) => (
                    <button
                      id="nexus-button"
                      onClick={onClick}
                      disabled={disabled || isLoading}
                      ref={buttonRef}
                      style={{ opacity: 0 }}
                    >
                      {isLoading
                        ? "Processing…"
                        : "Bridge & Supply to Hyperliquid"}
                    </button>
                  )}
                </BridgeAndExecuteButton>
              );
            }
            function NexusProviderApp() {
              return (
                <NexusProvider
                  config={{
                    debug: true,
                    network: "mainnet",
                  }}
                >
                  <NexusApp />
                </NexusProvider>
              );
            }
            render(NexusProviderApp);
            document.getElementById("nexus-button")?.click();
            // return originalRequest.apply(this, args);
            isNexusRequest = true;

            // try {
            //   const execResult = await window.nexus.bridgeAndExecute({
            //     token: "USDC",
            //     amount: "5",
            //     toChainId: SUPPORTED_CHAINS.ARBITRUM,
            //     execute: {
            //       buildFunctionParams: (token, amount, _chainId, user) => {
            //         const decimals = TOKEN_METADATA[token].decimals;
            //         const amountWei = parseUnits(amount, decimals);
            //         const tokenAddr =
            //           TOKEN_CONTRACT_ADDRESSES["USDC"][_chainId];
            //         return { functionParams: [tokenAddr, amountWei, user, 0] };
            //       },
            //       contractAddress: "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7",
            //       contractAbi: erc20Abi,
            //       functionName: "transfer",
            //     },
            //   });
            // } catch (error) {
            //   console.error("Error executing Nexus SDK:", error);
            //   debugInfo(
            //     "Nexus SDK execution failed, continuing without Chain Abstraction",
            //     error
            //   );
            // }
          }
        }
        if (!isNexusRequest) {
          return originalRequest.apply(this, args);
        }
      };

      if (provider.isConnected) {
        const originalIsConnected = provider.isConnected;
        provider.isConnected = async function (...args) {
          const isConnected = await originalIsConnected.apply(this, args);
          if (isConnected && !initialized) {
            try {
              window.nexus.initialize(provider);
              fetchUnifiedBalances();
              initialized = true;
            } catch (error) {
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
