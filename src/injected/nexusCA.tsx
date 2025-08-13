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
  ethAddress,
  parseUnits,
  zeroAddress,
} from "viem";
import { erc20TransferAbi } from "../utils/multicall";
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
    reactRoot.render(<App />);
  } catch (e) {
    debugInfo("ERROR RENDERING APP", e);
  }
}

function fixAppModal() {
  document
    .querySelector(".sc-bBABsx.fAsTrb:has(.sc-fLcnxK.iOdKba.modal)")
    ?.setAttribute("style", "z-index: 40");
}

function NexusApp() {
  const { initializeSdk, isSdkInitialized, sdk, deinitializeSdk } = useNexus();
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

  const [selectedProvider, setSelectedProvider] = useState<EVMProvider | null>(
    null
  );

  useEffect(() => {
    debugInfo("Detected Providers", providers);
    for (const provider of providers) {
      if (provider.provider.selectedAddress) {
        initializeSdk(provider.provider).then(() => {
          setSelectedProvider(provider.provider);
          fetchUnifiedBalances();
        });
      }
      provider.provider.on("accountsChanged", (event) => {
        initializeSdk(provider.provider).then(() => {
          setSelectedProvider(provider.provider);
          fetchUnifiedBalances();
        });
      });
      provider.provider.on("connect", (event) => {
        initializeSdk(provider.provider).then(() => {
          setSelectedProvider(provider.provider);
          fetchUnifiedBalances();
        });
      });
      provider.provider.on("disconnect", (event) => {
        deinitializeSdk();
        setSelectedProvider(null);
        clearCache();
      });
    }
  }, []);

  for (const provider of providers) {
    const originalRequest = provider.provider.request;
    provider.provider.request = async function (...args) {
      debugInfo("Intercepted in useEffect", ...args);
      let isNexusRequest = false;
      const { method, params } = args[0] as {
        method: string;
        params?: any[];
      };
      debugInfo("Intercepted request:", method, params, provider.provider);
      if (["eth_requestAccounts", "eth_accounts"].includes(method)) {
        const res = await originalRequest.apply(this, args);
        if (res && !isSdkInitialized) {
          try {
            initializeSdk(provider.provider).then(() => {
              setSelectedProvider(provider.provider);
              fetchUnifiedBalances();
            });
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

        const amount = params[0].data.toLowerCase().startsWith("0xa9059cbb")
          ? (decodedData.args![1] as bigint).toString()
          : (decodedData.args![2] as bigint).toString();

        const contractAddress = params[0].data
          .toLowerCase()
          .startsWith("0xa9059cbb")
          ? (decodedData.args![1] as string)
          : (decodedData.args![2] as string);

        debugInfo("amount decoded:", amount);
        debugInfo("actual contract:", decodedData.args![0]);

        if (
          new Decimal(actualToken?.balance || "0")
            .mul(Decimal.pow(10, actualToken?.decimals || 0))
            .lessThan(amount)
        ) {
          isNexusRequest = true;
          setState({
            contractAbi: erc20Abi,
            contractAddress,
            tokenAddress,
            functionName: decodedData.functionName,
            chainId: SUPPORTED_CHAINS.ARBITRUM,
            amount,
            buildFunctionParams(token, amount, _chainId, user) {
              const actualAmount = parseUnits(amount, actualToken!.decimals);
              return {
                functionParams: [contractAddress, actualAmount],
              };
            },
          });
        }
      }
      debugInfo("isNexusRequest", isNexusRequest);
      if (!isNexusRequest) {
        return originalRequest.apply(this, args);
      }
    };

    if (provider.provider.isConnected) {
      const originalIsConnected = provider.provider.isConnected;
      provider.provider.isConnected = async function (...args) {
        debugInfo("selectedProvider.isConnected intercepted");
        const isConnected = await originalIsConnected.apply(this, args);
        if (isConnected && !isSdkInitialized) {
          try {
            initializeSdk(provider.provider).then(() => {
              setSelectedProvider(provider.provider);
              fetchUnifiedBalances();
            });
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
        amount: new Decimal(state.amount)
          .div(
            Decimal.pow(
              10,
              TOKEN_MAPPING[SUPPORTED_CHAINS.ARBITRUM][state.tokenAddress]
                .decimals
            )
          )
          .toFixed(),
      }}
      buildFunctionParams={(token, amount, _chainId, user) => {
        debugInfo("buildFunctionParams", token, amount, _chainId, user);
        const amountWei = parseUnits(
          amount,
          TOKEN_MAPPING[SUPPORTED_CHAINS.ARBITRUM][state.tokenAddress].decimals
        );
        return {
          functionParams: [state.tokenAddress, amountWei],
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
