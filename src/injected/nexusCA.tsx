import { debugInfo } from "../utils/debug";
// Rely on chrome.runtime global for MV3 to resolve stylesheet URL
import Decimal from "decimal.js";
import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionResult,
  erc20Abi,
  parseAbi,
} from "viem";
import {
  erc20TransferAbi,
  MulticallAbi,
  MulticallAddress,
} from "../utils/multicall";
import { createRoot, Root } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { TOKEN_MAPPING } from "../utils/constants";
import { clearCache, fetchUnifiedBalances } from "./cache";
import { LifiAbi } from "../utils/lifi.abi";
import { LidoAbi, LIDO_STETH_ADDRESS, LIDO_DOMAINS } from "../utils/lido.abi";
import { AaveV3PoolAbi, AAVE_V3_POOL_ADDRESSES, USDC_ADDRESSES, AAVE_DOMAINS, AAVE_SUPPLY_FUNCTION_SIG } from "../utils/aave.abi";
import IntentModal from "../components/intent-modal";
import AllowanceModal from "../components/allowance-modal";
import { setCAEvents } from "./caEvents";
import { formatDecimalAmount } from "../utils/lib";
import {
  EthereumProvider,
  NexusSDK,
  OnAllowanceHook,
  OnAllowanceHookData,
  OnIntentHookData,
  ProgressStep,
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS,
  UserAsset,
} from "@avail-project/nexus";
import { publicClient } from "../utils/publicClient";
import type {} from "@avail-project/nexus";
import { NexusSteps } from "../components/event-modal";
import { createPortal } from "react-dom";

interface ExtendedStep extends ProgressStep {
  done: boolean;
  data?: any; // if you want to store explorerURL, hash, etc.
}

type EVMProvider = EthereumProvider & {
  isConnected?: () => Promise<boolean>;
  selectedAddress?: string;
};

const providers = [] as {
  info: {
    name: string;
    icon: string;
    rdns: string;
    uuid: string;
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
let reactRootElement: Element | null = null;

function render(App: React.FC) {
  // Create a Shadow DOM host to avoid leaking styles into the dApp and vice-versa
  let host = document.getElementById("nexus-root-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "nexus-root-host";
    host.style.position = "fixed";
    host.style.zIndex = "9999999999";
    const shadow = host.attachShadow({ mode: "open" });
    const root = document.createElement("div");
    root.id = "nexus-root";
    shadow.appendChild(root);
    document.body.appendChild(host);
    reactRootElement = root;
  }

  if (!reactRoot) {
    if (!reactRootElement) {
      const shadow = (host as any).shadowRoot as ShadowRoot | null;
      reactRootElement = shadow?.getElementById("nexus-root") || null;
    }
    reactRoot = createRoot(reactRootElement!);
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

function ShadowPortal({ children }: { children: React.ReactNode }) {
  // Make sure reactRootElement is the shadow-root container
  if (!reactRootElement) return null;
  return createPortal(children, reactRootElement!);
}

type Step = {
  typeID: string;
  type: string;
  done: boolean;
  data?: any;
};

function NexusApp() {
  const ca = new NexusSDK();
  const [intent, setIntent] = useState<OnIntentHookData | null>(null);

  const [allowance, setAllowance] = useState<OnAllowanceHookData | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);
  const [currentSource, setCurrentSource] = useState(0);
  const [totalSources, setTotalSources] = useState(0);
  const [currentAllowance, setCurrentAllowance] = useState(0);
  const [totalAllowances, setTotalAllowances] = useState(0);
  const [title, setTitle] = useState("Signing Intent");
  const [intentStepsOpen, setIntentStepsOpen] = useState<boolean>(false);
  const [txURL, setTxURL] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number>(1);

  const unifiedBalancesRef = useRef<UserAsset[] | null>(null);

  const requiredAmountRef = useRef<string | null>(null);
  
  // Track destination chainId for bridging (set when ca.bridge() is called)
  const destinationChainIdRef = useRef<number | null>(null);

  ca.setOnIntentHook(({ intent, allow, deny, refresh }) => {
    debugInfo("ON INTENT HOOK", { intent, allow, deny, refresh });
    setIntent({ intent, allow, deny, refresh });
  });

  ca.setOnAllowanceHook(
    ({ allow, deny, sources }: Parameters<OnAllowanceHook>[0]) => {
      debugInfo("ON ALLOWANCE HOOK", { allow, deny, sources });
      setAllowance({ allow, deny, sources });
    }
  );

  const handleExpectedSteps = (data: Step[]) => {
    try {
      // Check if this is Aave flow (Base chain) - use destination chainId if available
      const targetChainId = destinationChainIdRef.current || chainId;
      const isAaveFlow = targetChainId === 8453 && window.location.hostname.includes("aave.com");
      
      const newSteps = [
        ...data.map((s) => ({
          ...s,
          done: false,
        })),
        // Don't add SUBMIT_TRANSACTION step for Aave - user will manually approve & supply
        ...(!isAaveFlow ? [{
          type: "SUBMIT_TRANSACTION",
          typeID: "ST",
          done: false,
        }] : []),
      ];
      setIntentStepsOpen(true);
      setSteps(newSteps);
      setCurrentSource(0);
      setTotalSources(0);
      setCurrentAllowance(0);
      setTotalAllowances(0);

      let allowanceCount = 0;
      let sourcesCount = 0;
      newSteps.forEach((s) => {
        if (s.type === "ALLOWANCE_USER_APPROVAL") {
          allowanceCount++;
        }
        if (s.type === "INTENT_COLLECTION" && s.data?.total) {
          sourcesCount = s.data.total;
        }
      });

      setTotalAllowances(allowanceCount);
      setTotalSources(sourcesCount);
      setTitle("Signing Intent");
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleStepComplete = (data: any) => {
    try {
      switch (data.type) {
        case "ALLOWANCE_ALL_DONE":
          setTitle("Allowances setup done");
          break;

        case "ALLOWANCE_USER_APPROVAL":
          setTitle(`Setting up allowances on ${data.data.chainName}`);
          break;

        case "ALLOWANCE_APPROVAL_MINED":
          setCurrentAllowance((prev) => prev + 1);
          break;

        case "INTENT_ACCEPTED":
          setTitle("Submitting Intent");
          break;

        case "INTENT_SUBMITTED":
          setTitle("Collecting from Sources");
          break;

        case "INTENT_COLLECTION":
          setCurrentSource((prev) => prev + 1);
          break;

        case "INTENT_COLLECTION_COMPLETE":
          // Use destination chainId if available (from ca.bridge call), otherwise current chainId
          const targetChainId = destinationChainIdRef.current || chainId;
          const destinationChainName = 
            targetChainId === 1 ? "Ethereum Mainnet" : 
            targetChainId === 999 ? "HyperEVM" :
            targetChainId === 42161 ? "Arbitrum One" :
            targetChainId === 8453 ? "Base" :
            targetChainId === 10 ? "Optimism" :
            targetChainId === 137 ? "Polygon" :
            targetChainId === 43114 ? "Avalanche" :
            targetChainId === 56 ? "BNB Chain" :
            `Chain ${targetChainId}`;
          setTitle(`Receiving on ${destinationChainName}`);
          break;

        case "INTENT_FULFILLED":
          // Check if this is Aave USDC bridging (Base chain, no auto-submit)
          const isAaveFlow = (destinationChainIdRef.current === 8453 || chainId === 8453) && window.location.hostname.includes("aave.com");
          if (isAaveFlow) {
            setTitle("Switching to Base...");
            // Switch to Base chain after bridging completes
            (window as any).ethereum?.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x2105" }], // Base = 8453 = 0x2105
            }).then(() => {
              setTitle("✅ Ready to Supply on Aave");
            }).catch((error: any) => {
              console.error("Failed to switch to Base:", error);
              setTitle("Bridging Complete - Switch to Base Manually");
            });
          } else {
            setTitle("Completing Transaction");
          }
          break;

        case "SUBMIT_TRANSACTION":
          // Don't show this step for Aave since there's no auto-submit
          const isAave = (destinationChainIdRef.current === 8453 || chainId === 8453) && window.location.hostname.includes("aave.com");
          if (!isAave) {
            setTitle("Submitting Transaction");
          }
          break;

        default:
          break;
      }

      setSteps((prev) =>
        prev.map((s) =>
          s.typeID === data.typeID ? { ...s, done: true, data: data.data } : s
        )
      );
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    debugInfo(
      "Detected Providers:",
      providers.length,
      providers.map((p) => ({
        name: p.info.name,
        hasSelectedAddress: !!p.provider.selectedAddress,
      }))
    );

    let activeProvider: {
      info: { name: string; icon?: string };
      provider: EVMProvider;
      address: string;
    } | null = null;

    const initializeCA = async () => {
      // Find the first provider with an active connection
      for (const provider of providers) {
        debugInfo(`=== Checking provider: ${provider.info.name} ===`);

        try {
          let address = provider.provider.selectedAddress;
          debugInfo(
            `Initial selectedAddress for ${provider.info.name}:`,
            address
          );

          // If selectedAddress is not available, try requesting accounts
          if (!address) {
            debugInfo(
              `No selectedAddress, trying eth_accounts for ${provider.info.name}`
            );
            try {
              const accounts = (await provider.provider.request?.({
                method: "eth_accounts",
              })) as string[] | undefined;
              debugInfo(
                `eth_accounts result for ${provider.info.name}:`,
                accounts
              );
              address = accounts?.[0] || undefined;
            } catch (ethAccountsError) {
              debugInfo(
                `eth_accounts failed for ${provider.info.name}:`,
                ethAccountsError
              );
            }
          }

          if (address) {
            debugInfo(
              `Found active provider: ${provider.info.name} with address:`,
              address
            );
            activeProvider = {
              info: provider.info,
              provider: provider.provider,
              address,
            };

            // Set up CA with the active provider
            await provider.provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x1" }],
            });
            await ca.initialize(provider.provider);
            window.nexus = ca;
            // Expose destination chainId ref for progress tracking
            (window as any).nexusDestinationChainId = destinationChainIdRef;
            if (
              window.origin === "https://app.hyperlend.finance" ||
              window.origin === "https://www.usefelix.xyz" ||
              window.origin === "https://liminal.money"
            ) {
              await provider.provider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x3e7" }],
              });
            }
            setCAEvents(ca);
            fetchUnifiedBalances().then((balances) => {
              unifiedBalancesRef.current = balances;
            });

            // Send update for the active provider
            const message = {
              type: "NEXUS_PROVIDER_UPDATE",
              providerName: provider.info.name,
              walletAddress: address,
              providerIcon: provider.info.icon ?? null,
            };
            debugInfo("Posting message for active provider:", message);
            // Add delay to ensure content script is ready
            setTimeout(() => window.postMessage(message, "*"), 100);

            break; // Stop looking once we find an active provider
          }
        } catch (error) {
          debugInfo(`Error checking provider ${provider.info.name}:`, error);
        }
      }

      if (!activeProvider) {
        console.log("No active provider found");
        // Send a message indicating no provider is active
        setTimeout(
          () =>
            window.postMessage(
              {
                type: "NEXUS_PROVIDER_UPDATE",
                providerName: null,
                walletAddress: null,
                providerIcon: null,
              },
              "*"
            ),
          100
        );
      }
    };

    initializeCA();

    // Set up event listeners for all providers, but only update if it's the active one
    for (const provider of providers) {
      provider.provider.on("accountsChanged", async (event) => {
        // debugInfo("ON ACCOUNT CHANGED", event, provider.info.name);
        if (event.length) {
          const address = event[0] || provider.provider.selectedAddress;
          // Re-initialize CA with the new active provider
          // ca.setEVMProvider(provider.provider);

          await provider.provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x1" }],
          });
          await ca.initialize(provider.provider).then(async () => {
            window.nexus = ca;
            if (
              window.origin === "https://app.hyperlend.finance" ||
              window.origin === "https://www.usefelix.xyz" ||
              window.origin === "https://liminal.money"
            ) {
              await provider.provider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x3e7" }],
              });
            }
            setCAEvents(ca);
            fetchUnifiedBalances().then((balances) => {
              unifiedBalancesRef.current = balances;
            });
            try {
              window.postMessage(
                {
                  type: "NEXUS_PROVIDER_UPDATE",
                  providerName: provider.info.name,
                  walletAddress: address,
                  providerIcon: provider.info.icon ?? null,
                },
                "*"
              );
              console.log(
                "Account changed - updated active provider:",
                provider.info.name,
                address
              );
            } catch {}
          });
        } else {
          // Check if this was the active provider that got disconnected
          if (
            activeProvider &&
            activeProvider.info.name === provider.info.name
          ) {
            ca.deinit();

            clearCache();
            activeProvider = null;
            try {
              window.postMessage(
                {
                  type: "NEXUS_PROVIDER_UPDATE",
                  providerName: null,
                  walletAddress: null,
                  providerIcon: null,
                },
                "*"
              );
            } catch {}
          }
        }
      });

      // provider.provider.on("connect", async (event) => {
      //   debugInfo("ON CONNECT", event, provider.info.name);

      //   let address = provider.provider.selectedAddress;
      //   if (!address) {
      //     try {
      //       const accounts = (await provider.provider.request?.({
      //         method: "eth_accounts",
      //       })) as string[] | undefined;
      //       address = accounts?.[0] || undefined;
      //     } catch {}
      //   }

      //   if (address) {
      //     // Update active provider
      //     activeProvider = {
      //       info: provider.info,
      //       provider: provider.provider,
      //       address,
      //     };
      //     ca.setEVMProvider(provider.provider);
      //     ca.init().then(() => {
      //       window.nexus = ca;
      //       setCAEvents(ca);
      //       fetchUnifiedBalances();
      //       try {
      //         window.postMessage(
      //           {
      //             type: "NEXUS_PROVIDER_UPDATE",
      //             providerName: provider.info.name,
      //             walletAddress: address,
      //             providerIcon: provider.info.icon ?? null,
      //           },
      //           "*"
      //         );
      //         console.log(
      //           "Connect event - new active provider:",
      //           provider.info.name,
      //           address
      //         );
      //       } catch {}
      //     });
      //   }
      // });

      // Set up request interceptor for this provider
      const originalRequest = provider.provider.request;
      debugInfo("Adding Request Interceptor", provider);
      provider.provider.request = async function (...args) {
        debugInfo("Intercepted in useEffect", ...args);

        const { method, params } = args[0] as {
          method: string;
          params?: any[];
        };

        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          params[0].data.toLowerCase().startsWith("0x0efe6a8b")
        ) {
          const unifiedBalances = await fetchUnifiedBalances();
          unifiedBalancesRef.current = unifiedBalances;

          const decodedData = decodeFunctionData({
            abi: MulticallAbi,
            data: params[0].data,
          });

          const newArgs = decodedData?.args as any;
          const paramAmount = newArgs[1].toString();
          const tokenAddress = newArgs[0].toLowerCase();

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

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan(paramAmount)
          ) {
            document.body.style.pointerEvents = "auto";
            const requiredAmount = new Decimal(paramAmount)
              .minus(
                Decimal.mul(
                  actualToken?.balance || "0",
                  Decimal.pow(10, actualToken?.decimals || 0)
                )
              )
              .div(Decimal.pow(10, actualToken?.decimals || 0))
              .toFixed();

            requiredAmountRef.current = formatDecimalAmount(requiredAmount);
            const chainIdHex = await window.nexus.request({
              method: "eth_chainId",
            });
            const chainId = parseInt(String(chainIdHex), 16);
            setChainId(chainId);
            const handler = await ca.bridge({
              amount: requiredAmount,
              token: TOKEN_MAPPING[chainId][tokenAddress]
                .symbol as SUPPORTED_TOKENS,
              chainId: chainId as SUPPORTED_CHAINS_IDS,
            });
            console.log("BRIDGE Response", handler);
            if (!handler.success) {
              const errorMessage = {
                code: 4001,
                message: "User rejected the request.",
                details: "User denied intent.",
                version: "viem@2.33.3",
              };
              setError(true);
              throw errorMessage;
            }
            const hashResponse = await originalRequest.apply(this, args);
            setTxURL(hashResponse as string);
            return hashResponse;
          }
        }

        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          (params[0].data.toLowerCase().startsWith("0x4d8160ba") ||
            params[0].data.toLowerCase().startsWith("0xb9303701"))
        ) {
          const unifiedBalances = await fetchUnifiedBalances();

          unifiedBalancesRef.current = unifiedBalances;
          const abiItem = parseAbi([
            "function createSaltedOrder((address,uint256,bytes,uint256,uint256,bytes,address,bytes,bytes,bytes,bytes),uint64,bytes,uint32,bytes,bytes)",
          ]);

          const decodedData = decodeFunctionData({
            abi: [...MulticallAbi, ...abiItem],
            data: params[0].data,
          });

          const newArgs = decodedData?.args as any;

          const paramAmount = Array.isArray(newArgs[0])
            ? (newArgs[0][1] as bigint).toString()
            : (newArgs[1] as bigint).toString();
          const tokenAddress = Array.isArray(newArgs[0])
            ? (newArgs[0][0] as string).toLowerCase()
            : (newArgs[0] as string).toLowerCase();

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

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan(paramAmount)
          ) {
            const requiredAmount = new Decimal(paramAmount)
              .minus(
                Decimal.mul(
                  actualToken?.balance || "0",
                  Decimal.pow(10, actualToken?.decimals || 0)
                )
              )
              .div(Decimal.pow(10, actualToken?.decimals || 0))
              .toFixed();

            requiredAmountRef.current = formatDecimalAmount(requiredAmount);
            const chainIdHex = await window.nexus.request({
              method: "eth_chainId",
            });
            const chainId = parseInt(String(chainIdHex), 16);
            setChainId(chainId);
            const handler = await ca.bridge({
              amount: requiredAmount,
              token: TOKEN_MAPPING[chainId][tokenAddress]
                .symbol as SUPPORTED_TOKENS,
              chainId: chainId as SUPPORTED_CHAINS_IDS,
            });
            console.log("BRIDGE Response", handler);
            if (!handler.success) {
              const errorMessage = {
                code: 4001,
                message: "User rejected the request.",
                details: "User denied intent.",
                version: "viem@2.33.3",
              };
              setError(true);
              throw errorMessage;
            }
            const hashResponse = await originalRequest.apply(this, args);
            setTxURL(hashResponse as string);
            return hashResponse;
          }
        }

        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          params[0].data.toLowerCase().startsWith("0x6e553f65")
        ) {
          const unifiedBalances = await fetchUnifiedBalances();

          unifiedBalancesRef.current = unifiedBalances;

          const decodedData = decodeFunctionData({
            abi: MulticallAbi,
            data: params[0].data,
          });

          const paramAmount = (decodedData.args?.[0] as bigint).toString();
          const tokenAddress = await publicClient.readContract({
            address: params[0]?.to,
            abi: MulticallAbi,
            functionName: "asset",
          });
          const tokenIndex = unifiedBalances.findIndex((bal) =>
            bal.breakdown.find(
              (token) =>
                token.contractAddress.toLowerCase() ===
                (tokenAddress as string).toLowerCase()
            )
          );
          if (tokenIndex === -1) {
            return originalRequest.apply(this, args);
          }
          const actualToken = unifiedBalances[tokenIndex].breakdown.find(
            (token) =>
              token.contractAddress.toLowerCase() ===
              (tokenAddress as string).toLowerCase()
          );

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan(paramAmount)
          ) {
            document.body.style.pointerEvents = "auto";
            const requiredAmount = new Decimal(paramAmount)
              .minus(
                Decimal.mul(
                  actualToken?.balance || "0",
                  Decimal.pow(10, actualToken?.decimals || 0)
                )
              )
              .div(Decimal.pow(10, actualToken?.decimals || 0))
              .toFixed();

            requiredAmountRef.current = formatDecimalAmount(requiredAmount);
            const chainIdHex = await window.nexus.request({
              method: "eth_chainId",
            });
            const chainId = parseInt(String(chainIdHex), 16);
            setChainId(chainId);
            const handler = await ca.bridge({
              amount: requiredAmount,
              token: TOKEN_MAPPING[chainId][
                (tokenAddress as string).toLowerCase()
              ].symbol as SUPPORTED_TOKENS,
              chainId: chainId as SUPPORTED_CHAINS_IDS,
            });
            console.log("BRIDGE Response", handler);
            if (!handler.success) {
              const errorMessage = {
                code: 4001,
                message: "User rejected the request.",
                details: "User denied intent.",
                version: "viem@2.33.3",
              };
              setError(true);
              throw errorMessage;
            }
            const hashResponse = await originalRequest.apply(this, args);
            setTxURL(hashResponse as string);
            return hashResponse;
          }
        }

        // Intercept ETH balance calls for Lido - return unified ETH balance
        if (method === "eth_getBalance" && params?.[0]) {
          const isLidoDomain = LIDO_DOMAINS.some(domain => 
            window.origin.includes(domain)
          ) || window.origin.includes("lido");
          
          if (isLidoDomain) {
            const unifiedBalances = await fetchUnifiedBalances();
            const ethAsset = unifiedBalances.find((bal: any) =>
              bal.symbol === "ETH" && 
              bal.breakdown?.some((b: any) => 
                b.contractAddress === "0x0000000000000000000000000000000000000000"
              )
            );
            
            if (ethAsset) {
              // Return unified ETH balance instead of just mainnet balance
              const unifiedEthBalance = new Decimal(ethAsset.balance)
                .mul(Decimal.pow(10, 18))
                .floor()
                .toString();
              
              debugInfo("LIDO ETH BALANCE OVERRIDE", {
                original: await originalRequest.apply(this, args),
                unified: unifiedEthBalance,
                unifiedDecimal: ethAsset.balance
              });
              
              return `0x${BigInt(unifiedEthBalance).toString(16)}`;
            }
          }
        }

        if (
          method === "eth_call" &&
          params?.[0] &&
          params[0].data.toLowerCase().startsWith("0x70a08231")
        ) {
          debugInfo("BALANCE OF CALLED INSIDE REQUEST", params);
          
          // Also intercept ETH balance calls through smart contracts for Lido
          const isLidoDomain = LIDO_DOMAINS.some(domain => 
            window.origin.includes(domain)
          ) || window.origin.includes("lido");
          
          if (isLidoDomain) {
            const unifiedBalances = await fetchUnifiedBalances();
            const ethAsset = unifiedBalances.find((bal: any) =>
              bal.symbol === "ETH" && 
              bal.breakdown?.some((b: any) => 
                b.contractAddress === "0x0000000000000000000000000000000000000000"
              )
            );
            
            if (ethAsset) {
              // Check if this is asking for ETH balance (native token)
              const decodedData = decodeFunctionData({
                abi: [{ name: "balanceOf", type: "function", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }],
                data: params[0].data,
              });
              
              // If asking for ETH balance, return unified balance
              if (params[0].to === "0x0000000000000000000000000000000000000000" || 
                  params[0].to?.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
                const unifiedEthBalance = new Decimal(ethAsset.balance)
                  .mul(Decimal.pow(10, 18))
                  .floor()
                  .toString();
                
                debugInfo("LIDO ETH BALANCE OF OVERRIDE", {
                  to: params[0].to,
                  unified: unifiedEthBalance,
                  unifiedDecimal: ethAsset.balance
                });
                
                return `0x${BigInt(unifiedEthBalance).toString(16).padStart(64, '0')}`;
              }
            }
          }
        }

        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          (params[0].data.toLowerCase().startsWith("0xe28c8be3") ||
            params[0].data.toLowerCase().startsWith("0xf24f0847"))
        ) {
          const unifiedBalances = await fetchUnifiedBalances();
          unifiedBalancesRef.current = unifiedBalances;
          const abiItem = parseAbi([
            "function zapIn(address tokenIn, uint256 amountIn, uint256 amountOutMin, uint256 minimumMint, uint256 deadline, address[] tokens, (address tokenIn, address tokenOut, uint8 routerIndex, uint24 fee, uint256 amountIn, bool stable)[][], uint256 expectedAmountOut, uint256 feeBps)",
            "function zapInGluex(address tokenIn,uint256 amountIn,bytes gluexData,uint256 amountOutMin,uint256 minimumMint,uint256 deadline)",
          ]);
          const decodedData = decodeFunctionData({
            abi: abiItem,
            data: params[0].data,
          });

          const paramAmount = decodedData.args[1].toString();
          const tokenAddress = decodedData.args[0].toLowerCase();
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

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan(paramAmount)
          ) {
            document.body.style.pointerEvents = "auto";
            const requiredAmount = new Decimal(paramAmount)
              .minus(
                Decimal.mul(
                  actualToken?.balance || "0",
                  Decimal.pow(10, actualToken?.decimals || 0)
                )
              )
              .div(Decimal.pow(10, actualToken?.decimals || 0))
              .toFixed();
            requiredAmountRef.current = formatDecimalAmount(requiredAmount);
            const chainIdHex = await window.nexus.request({
              method: "eth_chainId",
            });
            const chainId = parseInt(String(chainIdHex), 16);
            setChainId(chainId);
            const handler = await ca.bridge({
              amount: requiredAmount,
              token: TOKEN_MAPPING[chainId][tokenAddress.toLowerCase()]
                .symbol as SUPPORTED_TOKENS,
              chainId: chainId as SUPPORTED_CHAINS_IDS,
            });
            console.log("BRIDGE Response", handler);
            if (!handler.success) {
              const errorMessage = {
                code: 4001,
                message: "User rejected the request.",
                details: "User denied intent.",
                version: "viem@2.33.3",
              };
              throw errorMessage;
            }

            return originalRequest.apply(this, args);
          }
        }

        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          (params[0].data.toLowerCase().startsWith("0x095ea7b3") ||
            params[0].data.toLowerCase().startsWith("0xa9059cbb"))
        ) {
          if (window.origin === "https://app.hypurr.fi") {
            const unifiedBalances = await fetchUnifiedBalances();
            unifiedBalancesRef.current = unifiedBalances;
            const decodedData = decodeFunctionData({
              abi: erc20Abi,
              data: params[0].data,
            });

            if (decodedData && decodedData?.args && params[0]?.to) {
              const tokenAddress = String(params[0]?.to).toLowerCase();
              const tokenIndex = unifiedBalances.findIndex((bal) =>
                bal.breakdown.find(
                  (token) =>
                    token.contractAddress.toLowerCase() === tokenAddress
                )
              );
              if (tokenIndex === -1) {
                return originalRequest.apply(this, args);
              }
              const actualToken = unifiedBalances[tokenIndex].breakdown.find(
                (token) => token.contractAddress.toLowerCase() === tokenAddress
              );
              const paramAmount = decodedData?.args?.[1] as bigint;

              if (
                new Decimal(actualToken?.balance || "0")
                  .mul(Decimal.pow(10, actualToken?.decimals || 0))
                  .lessThan(paramAmount)
              ) {
                const requiredAmount = new Decimal(paramAmount)
                  .minus(
                    Decimal.mul(
                      actualToken?.balance || "0",
                      Decimal.pow(10, actualToken?.decimals || 0)
                    )
                  )
                  .div(Decimal.pow(10, actualToken?.decimals || 0))
                  .toFixed();
                requiredAmountRef.current = formatDecimalAmount(requiredAmount);
                const chainIdHex = await window.nexus.request({
                  method: "eth_chainId",
                });
                const chainId = parseInt(String(chainIdHex), 16);
                setChainId(chainId);
                const handler = await ca.bridge({
                  amount: requiredAmount,
                  token: TOKEN_MAPPING[chainId][tokenAddress.toLowerCase()]
                    .symbol as SUPPORTED_TOKENS,
                  chainId: chainId as SUPPORTED_CHAINS_IDS,
                });

                if (!handler.success) {
                  const errorMessage = {
                    code: 4001,
                    message: "User rejected the request.",
                    details: "User denied intent.",
                    version: "viem@2.33.3",
                  };
                  throw errorMessage;
                }
                return originalRequest.apply(this, args);
              }
            }
          }
        }

        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          (params[0].data.toLowerCase().startsWith("0xa9059cbb") || // ERC20 transfer
            params[0].data.toLowerCase().startsWith("0x23b872dd")) // ERC20 transferFrom
        ) {
          const unifiedBalances = await fetchUnifiedBalances();
          unifiedBalancesRef.current = unifiedBalances;
          const tokenAddress = params[0].to.toLowerCase() as string;
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

          debugInfo("amount decoded:", amount);
          debugInfo("actual contract:", decodedData.args![0]);
          debugInfo("actual transaction:", args[0]);

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan(paramAmount)
          ) {
            const modal = document.querySelector(".modal")!;
            const mainDiv =
              modal.children[1].children[0].children[0].children[1].children[0];
            mainDiv.children[0].innerHTML = "Building Intent";
            mainDiv.children[1].innerHTML = "";
            const mainDiv2 =
              modal.children[1].children[0].children[0].children[1].children[1];
            mainDiv2.setAttribute(
              "style",
              mainDiv2.getAttribute("style") + "visibility: hidden;"
            );
            const requiredAmount = new Decimal(paramAmount)
              .minus(
                Decimal.mul(
                  actualToken?.balance || "0",
                  Decimal.pow(10, actualToken?.decimals || 0)
                )
              )
              .div(Decimal.pow(10, actualToken?.decimals || 0))
              .toFixed();
            requiredAmountRef.current = formatDecimalAmount(requiredAmount);
            const handler = await ca.bridge({
              amount: requiredAmount,
              token: TOKEN_MAPPING[42161][
                tokenAddress.toLowerCase()
              ].symbol.toLowerCase() as SUPPORTED_TOKENS,
              chainId: 42161,
            });
            const res = handler;
            debugInfo("BRIDGE Response", res);
            return originalRequest.apply(this, args);
          }
        }

        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          params[0].data.toLowerCase().startsWith("0x4666fc80")
        ) {
          const unifiedBalances = await fetchUnifiedBalances();
          unifiedBalancesRef.current = unifiedBalances;
          const decodedData = decodeFunctionData({
            abi: LifiAbi,
            data: params[0].data,
          });
          debugInfo(
            "LIFI DECODED",
            decodedData.args[5].fromAmount,
            decodedData.args[5].sendingAssetId
          );
          const paramAmount = decodedData.args[5].fromAmount.toString();
          const tokenAddress = decodedData.args[5].sendingAssetId.toLowerCase();

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

          if (
            new Decimal(actualToken?.balance || "0")
              .mul(Decimal.pow(10, actualToken?.decimals || 0))
              .lessThan(paramAmount)
          ) {
            const requiredAmount = new Decimal(paramAmount)
              .minus(
                Decimal.mul(
                  actualToken?.balance || "0",
                  Decimal.pow(10, actualToken?.decimals || 0)
                )
              )
              .div(Decimal.pow(10, actualToken?.decimals || 0))
              .toFixed();
            requiredAmountRef.current = formatDecimalAmount(requiredAmount);
            const handler = await ca.bridge({
              amount: requiredAmount,
              token: TOKEN_MAPPING[42161][
                tokenAddress.toLowerCase()
              ].symbol.toLowerCase() as SUPPORTED_TOKENS,
              chainId: 42161,
            });
            const res = handler;
            debugInfo("BRIDGE Response", res);
            return originalRequest.apply(this, args);
          }
        }

        // Lido Staking Integration - Detect ETH staking transactions
        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          (params[0].to?.toLowerCase() === LIDO_STETH_ADDRESS.toLowerCase() ||
            params[0].data.toLowerCase().startsWith("0xa1903eab") || // submit() function signature
            params[0].data === "0x" || // Direct ETH send to Lido
            (params[0].value && params[0].value !== "0x0")) // Any ETH transfer with value
        ) {
          // Check if this is a Lido staking domain
          const isLidoDomain = LIDO_DOMAINS.some(domain => 
            window.origin.includes(domain)
          ) || window.origin.includes("lido");

          if (isLidoDomain) {
            const unifiedBalances = await fetchUnifiedBalances();
            unifiedBalancesRef.current = unifiedBalances;
            
            // Get ETH amount to stake (from transaction value or function call)
            let paramAmount = "0";
            
            if (params[0].value && params[0].value !== "0x0") {
              // Direct ETH send
              paramAmount = parseInt(params[0].value, 16).toString();
            } else if (params[0].data.toLowerCase().startsWith("0xa1903eab")) {
              // Lido submit() function call - ETH amount is in msg.value
              const ethAmount = params[0].value || "0x0";
              paramAmount = parseInt(ethAmount, 16).toString();
            }
            
            debugInfo("LIDO STAKING DETECTED", {
              amount: paramAmount,
              value: params[0].value,
              to: params[0].to,
              origin: window.origin,
              data: params[0].data?.substring(0, 10)
            });

            // Skip if no ETH is being sent (unless it's a function call to Lido contract)
            if (paramAmount === "0" && !params[0].data.toLowerCase().startsWith("0xa1903eab")) {
              return originalRequest.apply(this, args);
            }

            // Find ETH balance across all chains (native ETH)
            const ethAsset = unifiedBalances.find((bal: any) =>
              bal.symbol === "ETH" && 
              bal.breakdown?.some((b: any) => 
                b.contractAddress === "0x0000000000000000000000000000000000000000"
              )
            );

            if (ethAsset) {
              // ALWAYS use unified ETH for Lido staking (showcases unified ETH concept)
              const ethereumEthBalance = ethAsset.breakdown.find(
                (token: any) => 
                  token.chain.id === 1 && 
                  token.contractAddress === "0x0000000000000000000000000000000000000000"
              );

              const currentEthBalance = new Decimal(ethereumEthBalance?.balance || "0")
                .mul(Decimal.pow(10, 18));
              
              const stakeAmountDecimal = new Decimal(paramAmount).div(Decimal.pow(10, 18));

              debugInfo("LIDO UNIFIED ETH STAKING", {
                stakeAmount: stakeAmountDecimal.toString(),
                currentMainnet: currentEthBalance.div(Decimal.pow(10, 18)).toString(),
                totalUnified: ethAsset.balance,
                breakdown: ethAsset.breakdown.map((b: any) => ({
                  chain: b.chain.name,
                  balance: b.balance
                }))
              });

              // Calculate deficit - only bridge what's missing on Ethereum
              // IMPORTANT: Reserve gas for the Lido staking transaction (~0.002 ETH)
              const gasReserve = new Decimal("0.002"); // Reserve for gas fees
              const stakeAmountWithGas = new Decimal(paramAmount).add(gasReserve.mul(Decimal.pow(10, 18)));
              const deficit = stakeAmountWithGas
                .minus(currentEthBalance)
                .div(Decimal.pow(10, 18));
              
              debugInfo("💡 LIDO DEFICIT CALCULATION (with gas reserve)", {
                stakeAmount: stakeAmountDecimal.toString(),
                gasReserve: gasReserve.toString(),
                totalNeeded: stakeAmountWithGas.div(Decimal.pow(10, 18)).toString(),
                currentEthOnMainnet: currentEthBalance.div(Decimal.pow(10, 18)).toString(),
                deficit: deficit.toString()
              });
              
              // If already have enough ETH on Ethereum (including gas), allow the transaction
              if (deficit.lessThanOrEqualTo(0)) {
                debugInfo("✅ LIDO: Already have enough ETH on Ethereum mainnet (including gas)!");
                return originalRequest.apply(this, args);
              }
              
              // Show unified flow for bridging the deficit
              document.body.style.pointerEvents = "auto";
              requiredAmountRef.current = formatDecimalAmount(deficit.toString());
              setChainId(1); // Ethereum mainnet destination
              
              debugInfo("🌉 LIDO: Bridging deficit to Ethereum", {
                deficitAmount: deficit.toString(),
                sources: ethAsset.breakdown.length + " chains"
              });

              // Show intent modal and bridge ONLY the deficit
              const handler = await ca.bridge({
                amount: deficit.toString(),
                token: "eth" as SUPPORTED_TOKENS,
                chainId: 1, // Ethereum mainnet
              });

              debugInfo("LIDO UNIFIED ETH BRIDGE Response", handler);
              
              if (!handler.success) {
                const errorMessage = {
                  code: 4001,
                  message: "User rejected the request.",
                  details: "User denied unified ETH bridging for Lido staking.",
                  version: "viem@2.33.3",
                };
                setError(true);
                throw errorMessage;
              }
              
              // DO NOT automatically send Lido transaction!
              // User must wait for bridging to complete (2-5 minutes)
              // Then manually click Lido's stake button after ETH arrives
              debugInfo("✅ LIDO BRIDGING INITIATED - User must wait for completion then manually stake");
              
              // Block this transaction - user will retry after bridge completes
              const errorMessage = {
                code: 4001,
                message: "Bridging ETH to Ethereum mainnet...",
                details: "Please wait 2-5 minutes for the bridge to complete, then click Stake again on Lido.",
                version: "viem@2.33.3",
              };
              throw errorMessage;
            }
          }
        }

        // Aave V3 USDC Supply Integration - Detect USDC supply transactions
        if (
          method === "eth_sendTransaction" &&
          params?.[0] &&
          params[0].data &&
          params[0].data.toLowerCase().startsWith(AAVE_SUPPLY_FUNCTION_SIG.toLowerCase())
        ) {
          // Check if this is an Aave domain
          const isAaveDomain = AAVE_DOMAINS.some(domain => 
            window.origin.includes(domain)
          );

          // Check if targeting Aave V3 Pool contract
          const isAavePool = Object.values(AAVE_V3_POOL_ADDRESSES).some(
            addr => params[0].to?.toLowerCase() === addr.toLowerCase()
          );

          if (isAaveDomain && isAavePool) {
            debugInfo("🏦 AAVE V3 SUPPLY DETECTED", {
              to: params[0].to,
              data: params[0].data?.substring(0, 20),
              origin: window.origin
            });

            // Decode supply function to get asset and amount
            try {
              const decoded = decodeFunctionData({
                abi: AaveV3PoolAbi,
                data: params[0].data as `0x${string}`,
              });

              if (decoded.functionName === "supply") {
                const [assetAddress, supplyAmount, onBehalfOf, referralCode] = decoded.args!;
                
                // Check if it's USDC supply
                const isUSDCSupply = Object.values(USDC_ADDRESSES).some(
                  addr => assetAddress.toLowerCase() === addr.toLowerCase()
                );

                if (isUSDCSupply) {
                  const unifiedBalances = await fetchUnifiedBalances();
                  unifiedBalancesRef.current = unifiedBalances;

                  // Find USDC balance across all chains
                  const usdcAsset = unifiedBalances.find((bal: any) =>
                    bal.symbol === "USDC"
                  );

                  if (usdcAsset) {
                    // Determine which chain we're on based on the pool address
                    let targetChainId = 8453; // Default to Base
                    for (const [chainId, poolAddr] of Object.entries(AAVE_V3_POOL_ADDRESSES)) {
                      if (poolAddr.toLowerCase() === params[0].to?.toLowerCase()) {
                        targetChainId = parseInt(chainId);
                        break;
                      }
                    }

                    // Get USDC decimals for this chain (most are 6, BNB is 18)
                    const usdcDecimals = targetChainId === 56 ? 18 : 6;

                    // Get current USDC balance on target chain
                    const targetChainUSDC = usdcAsset.breakdown.find(
                      (token: any) => token.chain.id === targetChainId
                    );

                    const currentUSDCBalance = new Decimal(targetChainUSDC?.balance || "0")
                      .mul(Decimal.pow(10, usdcDecimals));

                    const supplyAmountDecimal = new Decimal(supplyAmount.toString())
                      .div(Decimal.pow(10, usdcDecimals));

                    debugInfo("🏦 AAVE UNIFIED USDC SUPPLY", {
                      targetChain: targetChainId,
                      supplyAmount: supplyAmountDecimal.toString(),
                      currentOnChain: currentUSDCBalance.div(Decimal.pow(10, usdcDecimals)).toString(),
                      totalUnified: usdcAsset.balance,
                      breakdown: usdcAsset.breakdown.map((b: any) => ({
                        chain: b.chain.name,
                        balance: b.balance
                      }))
                    });

                    // Calculate deficit - only bridge what's missing on target chain
                    // NO gas reservation needed (USDC is ERC20, gas paid in native token)
                    const deficit = new Decimal(supplyAmount.toString())
                      .minus(currentUSDCBalance)
                      .div(Decimal.pow(10, usdcDecimals));

                    debugInfo("💡 AAVE USDC DEFICIT CALCULATION", {
                      supplyAmount: supplyAmountDecimal.toString(),
                      currentUSDCOnChain: currentUSDCBalance.div(Decimal.pow(10, usdcDecimals)).toString(),
                      deficit: deficit.toString(),
                      targetChain: targetChainId
                    });

                    // If already have enough USDC on target chain, allow the transaction
                    if (deficit.lessThanOrEqualTo(0)) {
                      debugInfo("✅ AAVE: Already have enough USDC on target chain!");
                      return originalRequest.apply(this, args);
                    }

                    // Check if approval is needed
                    const userAddress = params[0].from || (window as any).ethereum?.selectedAddress;
                    if (userAddress) {
                      try {
                        const allowance = await publicClient.readContract({
                          address: assetAddress as `0x${string}`,
                          abi: erc20Abi,
                          functionName: "allowance",
                          args: [userAddress as `0x${string}`, params[0].to as `0x${string}`],
                        }) as bigint;

                        const currentAllowance = new Decimal(allowance.toString());
                        const requiredAmount = new Decimal(supplyAmount.toString());

                        debugInfo("🔍 AAVE USDC ALLOWANCE CHECK", {
                          currentAllowance: currentAllowance.div(Decimal.pow(10, usdcDecimals)).toString(),
                          requiredAmount: requiredAmount.div(Decimal.pow(10, usdcDecimals)).toString(),
                          needsApproval: currentAllowance.lessThan(requiredAmount)
                        });

                        // If allowance is insufficient, user needs to approve first
                        if (currentAllowance.lessThan(requiredAmount)) {
                          debugInfo("⚠️ AAVE: Insufficient USDC allowance - user needs to approve first");
                          // Let the transaction proceed - Aave UI will handle approval flow
                          return originalRequest.apply(this, args);
                        }
                      } catch (error) {
                        debugInfo("⚠️ AAVE: Could not check allowance", error);
                      }
                    }

                    // Show unified flow for bridging the deficit
                    document.body.style.pointerEvents = "auto";
                    requiredAmountRef.current = formatDecimalAmount(deficit.toString());
                    setChainId(targetChainId);

                    const chainNames: { [key: number]: string } = {
                      1: "Ethereum",
                      8453: "Base",
                      10: "Optimism",
                      42161: "Arbitrum",
                      137: "Polygon",
                      43114: "Avalanche",
                      56: "BNB Chain",
                      534352: "Scroll"
                    };

                    debugInfo("🌉 AAVE: Bridging USDC deficit to " + chainNames[targetChainId], {
                      deficitAmount: deficit.toString(),
                      sources: usdcAsset.breakdown.length + " chains",
                      targetChain: targetChainId
                    });

                    // Bridge ONLY the deficit
                    const handler = await ca.bridge({
                      amount: deficit.toString(),
                      token: "usdc" as SUPPORTED_TOKENS,
                      chainId: targetChainId as SUPPORTED_CHAINS_IDS,
                    });

                    debugInfo("AAVE UNIFIED USDC BRIDGE Response", handler);

                    if (!handler.success) {
                      const errorMessage = {
                        code: 4001,
                        message: "User rejected the request.",
                        details: "User denied unified USDC bridging for Aave supply.",
                        version: "viem@2.33.3",
                      };
                      setError(true);
                      throw errorMessage;
                    }

                    // DO NOT automatically send Aave transaction!
                    // User must wait for bridging to complete (2-5 minutes)
                    // Then Aave UI will handle approval (if needed) and supply
                    debugInfo("✅ AAVE BRIDGING INITIATED - User must wait for completion then continue with Aave UI");

                    // Block this transaction - user will retry after bridge completes
                    const errorMessage = {
                      code: 4001,
                      message: `Bridging USDC to ${chainNames[targetChainId]}...`,
                      details: "Please wait 2-5 minutes for the bridge to complete. Aave will handle approval and supply after USDC arrives.",
                      version: "viem@2.33.3",
                    };
                    throw errorMessage;
                  }
                }
              }
            } catch (error) {
              debugInfo("⚠️ AAVE: Could not decode supply transaction", error);
              // Let transaction proceed if we can't decode it
              return originalRequest.apply(this, args);
            }
          }
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
            unifiedBalancesRef.current = unifiedBalances;
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
        return originalRequest.apply(this, args);
      };
    }

    ca.nexusEvents.on("expected_steps", handleExpectedSteps);
    ca.nexusEvents.on("step_complete", handleStepComplete);
    return () => {
      ca.nexusEvents.off("expected_steps", handleExpectedSteps);
      ca.nexusEvents.off("step_complete", handleStepComplete);
    };
  }, []);

  useEffect(() => {
    if (error) {
      setIntentStepsOpen(false);
      setError(false);
      setTxURL("");
    }
  }, [error]);

  return (
    <>
      {intent && (
        <ShadowPortal>
          <IntentModal
            intentModal={intent}
            setIntentModal={setIntent}
            requiredAmount={requiredAmountRef.current}
            unifiedBalances={unifiedBalancesRef.current}
            setIntentStepsOpen={setIntentStepsOpen}
          />
        </ShadowPortal>
      )}
      {allowance && (
        <ShadowPortal>
          <AllowanceModal
            allowance={allowance}
            setAllowance={setAllowance}
            setIntentStepsOpen={setIntentStepsOpen}
          />
        </ShadowPortal>
      )}
      {intentStepsOpen && !intent && !allowance && (
        <ShadowPortal>
          <NexusSteps
            steps={steps}
            title={title}
            currentSource={currentSource}
            totalSources={totalSources}
            currentAllowance={currentAllowance}
            totalAllowances={totalAllowances}
            setIntentStepsOpen={setIntentStepsOpen}
            txURL={txURL}
            chainId={chainId}
          />
        </ShadowPortal>
      )}
    </>
  );
}

function NexusProviderApp() {
  return <NexusApp />;
}
render(NexusProviderApp);

const observer = new MutationObserver(() => {
  const host = document.getElementById("nexus-root-host");
  if (!host) {
    render(NexusProviderApp);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
