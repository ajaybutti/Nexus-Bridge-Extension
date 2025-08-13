import {
  EthereumProvider,
  SUPPORTED_CHAINS,
  SUPPORTED_CHAINS_IDS,
} from "@avail-project/nexus/core";
import { debugInfo } from "../utils/debug";
import Decimal from "decimal.js";
import {
  Abi,
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionResult,
  ethAddress,
  parseUnits,
  zeroAddress,
} from "viem";
import {
  erc20TransferAbi,
  MulticallAbi,
  MulticallAddress,
} from "../utils/multicall";
import {
  BridgeAndExecuteButton,
  NexusProvider,
  useNexus,
} from "@avail-project/nexus/ui";
import { createRoot, Root } from "react-dom/client";
import { erc20Abi } from "viem";
import { useEffect, useRef, useState } from "react";
import { TOKEN_MAPPING } from "../utils/constants";
import { clearCache, fetchUnifiedBalances } from "./cache";
import { LifiAbi } from "../utils/lifi.abi";

type EVMProvider = EthereumProvider & {
  isConnected?: () => Promise<boolean>;
  selectedAddress?: string;
};

const providers = [] as {
  info: {
    name: string;
  };
  provider: EVMProvider;
}[];

window.addEventListener("eip6963:announceProvider", (event: any) => {
  debugInfo("eip6963:announceProvider event received:", event);
  if (!providers.find((p) => p.info.name === event.detail.info.name)) {
    providers.push(event.detail);
  }
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

  fixAppModal();

  try {
    debugInfo("RENDERING APP");
    reactRoot.render(<App />);
  } catch (e) {
    debugInfo("ERROR RENDERING APP", e);
  }
}

function fixAppModal() {
  document
    .querySelector(".sc-bBABsx.fAsTrb:has(.sc-fLcnxK.iOdKba.modal)")
    ?.setAttribute("style", "z-index: 40");
  document
    .querySelector(".sc-bBABsx.jWjRYk:has(.modal)")
    ?.setAttribute("style", "z-index: 40");
}

function NexusApp() {
  const { initializeSdk, isSdkInitialized, sdk } = useNexus();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [state, setState] = useState({
    contractAddress: zeroAddress as string,
    contractAbi: erc20Abi,
    functionName: "transfer",
    chainId: 42161 as SUPPORTED_CHAINS_IDS,
    tokenAddress: ethAddress as string,
    amount: "1",
    buildFunctionParams(
      token: string,
      amount: string,
      _chainId: SUPPORTED_CHAINS_IDS,
      user: string
    ) {
      const t = TOKEN_MAPPING[SUPPORTED_CHAINS.ARBITRUM][token];
      const amt = parseUnits(amount, t.decimals);
      return { functionParams: [token, amt] as any[] };
    },
  });

  useEffect(() => {
    debugInfo("Detected Providers", providers);
    for (const provider of providers) {
      if (provider.provider.selectedAddress) {
        initializeSdk(provider.provider).then(() => {
          fetchUnifiedBalances();
        });
      }
      provider.provider.on("accountsChanged", (event) => {
        initializeSdk(provider.provider).then(() => {
          fetchUnifiedBalances();
        });
      });
      provider.provider.on("connect", (event) => {
        initializeSdk(provider.provider).then(() => {
          fetchUnifiedBalances();
        });
      });
      provider.provider.on("disconnect", (event) => {
        // deinitializeSdk();
        clearCache();
      });

      const originalRequest = provider.provider.request;
      debugInfo("Adding Request Interceptor", provider);
      provider.provider.request = async function (...args) {
        debugInfo("Intercepted in useEffect", ...args);
        let isNexusRequest = false;
        const { method, params } = args[0] as {
          method: string;
          params?: any[];
        };
        debugInfo("Intercepted request:", method, params, provider.provider);
        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          (params[0].data.toLowerCase().startsWith("0xa9059cbb") || // ERC20 transfer
            params[0].data.toLowerCase().startsWith("0x23b872dd")) // ERC20 transferFrom
        ) {
          const unifiedBalances = await fetchUnifiedBalances();
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

          const paramAmount = params[0].data
            .toLowerCase()
            .startsWith("0xa9059cbb")
            ? (decodedData.args![1] as bigint).toString()
            : (decodedData.args![2] as bigint).toString();

          const amount = new Decimal(paramAmount)
            .div(Decimal.pow(10, actualToken?.decimals || 0))
            .toFixed();

          const contractAddress = params[0].data
            .toLowerCase()
            .startsWith("0xa9059cbb")
            ? (decodedData.args![0] as string).toLowerCase()
            : (decodedData.args![1] as string).toLowerCase();

          debugInfo("amount decoded:", amount);
          debugInfo("actual contract:", decodedData.args![0]);
          debugInfo("actual transaction:", args[0]);

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan(paramAmount)
          ) {
            isNexusRequest = true;
            setState({
              contractAbi: erc20Abi,
              contractAddress: tokenAddress,
              tokenAddress,
              functionName: decodedData.functionName,
              chainId: SUPPORTED_CHAINS.ARBITRUM,
              amount,
              buildFunctionParams() {
                const actualAmount = parseUnits(amount, actualToken!.decimals);
                debugInfo(
                  "actual params",
                  actualAmount,
                  actualToken?.decimals,
                  amount
                );
                return {
                  functionParams: [contractAddress, actualAmount],
                };
              },
            });
          }
        }

        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          params[0].data.toLowerCase().startsWith("0x4666fc80")
        ) {
          const unifiedBalances = await fetchUnifiedBalances();
          const lifiContractAddress = params[0].to.toLowerCase();
          const decodedData = decodeFunctionData({
            abi: LifiAbi,
            data: params[0].data,
          });
          debugInfo("LIFI DECODED", decodedData);
        }

        if (
          method === "eth_call" &&
          params?.[0] &&
          params[0].to?.toLowerCase() === MulticallAddress
        ) {
          const decoded = decodeFunctionData({
            abi: MulticallAbi,
            data: params[0].data,
          });
          const responseData = await originalRequest.apply(this, args);
          if (decoded.functionName === "aggregate3") {
            if (!responseData) {
              debugInfo(
                "No result in aggregate3 response, returning original response"
              );
              return responseData;
            }
            const res = responseData as `0x${string}`;
            const decodedResult = decodeFunctionResult({
              abi: MulticallAbi,
              functionName: "aggregate3",
              data: res,
            }) as { success: boolean; returnData: string }[];
            const params = decoded.args![0] as {
              target: string;
              callData: `0x${string}`;
              allowFailure: boolean;
            }[];
            const unifiedBalances = await fetchUnifiedBalances();
            params.forEach((param, pIndex) => {
              try {
                const decodedParam = decodeFunctionData({
                  abi: MulticallAbi,
                  data: param.callData,
                });
                if (decodedParam.functionName !== "balanceOf") {
                  return;
                }
                const index = unifiedBalances.findIndex((bal) =>
                  bal.breakdown.find(
                    (asset) =>
                      asset.contractAddress.toLowerCase() ===
                      param.target.toLowerCase()
                  )
                );
                if (index === -1) {
                  return;
                }
                const asset = unifiedBalances[index];
                const actualAsset = asset.breakdown.find(
                  (token) =>
                    token.contractAddress.toLowerCase() ===
                    param.target.toLowerCase()
                );
                decodedResult[pIndex].returnData = encodeFunctionResult({
                  abi: MulticallAbi,
                  functionName: "balanceOf",
                  result: BigInt(
                    new Decimal(asset.balance)
                      .mul(
                        Decimal.pow(10, actualAsset!.decimals || asset.decimals)
                      )
                      .floor()
                      .toFixed()
                  ),
                });
              } catch (error) {
                console.error(
                  "Failed to decode callData for target:",
                  param.target,
                  "Error:",
                  error
                );
              }
            });
            const modifiedResult = encodeFunctionResult({
              abi: MulticallAbi,
              functionName: "aggregate3",
              result: decodedResult,
            });
            return modifiedResult;
          }
          return responseData;
        }

        debugInfo("isNexusRequest", isNexusRequest);
        if (!isNexusRequest) {
          return originalRequest.apply(this, args);
        }
      };
    }
  }, []);

  useEffect(() => {
    // @ts-ignore
    window.nexus = sdk;
  }, [sdk]);

  useEffect(() => {
    debugInfo("isSdkInitialized", isSdkInitialized);
  }, [isSdkInitialized]);

  useEffect(() => {
    debugInfo("STATE CHANGED");
    buttonRef.current?.click();
    fixAppModal();
  }, [state]);

  return state.tokenAddress === ethAddress ? (
    <div />
  ) : (
    <BridgeAndExecuteButton
      contractAddress={state.contractAddress as `0x${string}`}
      contractAbi={state.contractAbi}
      functionName={state.functionName}
      prefill={{
        toChainId: state.chainId,
        token:
          TOKEN_MAPPING[SUPPORTED_CHAINS.ARBITRUM][state.tokenAddress].symbol,
        amount: state.amount,
      }}
      buildFunctionParams={state.buildFunctionParams}
    >
      {({ onClick, isLoading, disabled }) => (
        <button
          id="nexus-button"
          onClick={onClick}
          disabled={disabled || isLoading}
          ref={buttonRef}
          style={{ opacity: 0 }}
        >
          {isLoading ? "Processing…" : "Bridge & Supply to Hyperliquid"}
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
