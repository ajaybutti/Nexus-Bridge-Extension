import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionResult,
  ethAddress,
  zeroAddress,
} from "viem";
import { MulticallAbi, MulticallAddress } from "../utils/multicall";
import Decimal from "decimal.js";
import { createResponse } from "../utils/response";
import { debugInfo } from "../utils/debug";
import { fetchUnifiedBalances } from "./cache";

function injectNetworkInterceptor() {
  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  // @ts-expect-error
  window.decodeFunctionData = decodeFunctionData;
  // @ts-expect-error
  window.MulticallAbi = MulticallAbi;
  // @ts-expect-error
  window.decodeFunctionResult = decodeFunctionResult;

  // XMLHttpRequest.prototype.open = function (
  //   method: string,
  //   url: string | URL,
  //   async: boolean = true,
  //   username?: string | null,
  //   password?: string | null
  // ) {
  //   const _url = url as string;
  //   const xhr = this;
  //   this.addEventListener(
  //     "readystatechange",
  //     async function () {
  //       if (this.readyState === 4) {
  //         try {
  //           if (
  //             _url?.includes("https://api.enso.finance/api/v1/wallet/balances")
  //           ) {
  //             let dataArray: any[] = [];

  //             if (Array.isArray(xhr.responseText)) {
  //               dataArray = xhr.responseText;
  //             } else if (
  //               xhr.responseText &&
  //               typeof xhr.responseText === "object"
  //             ) {
  //               dataArray = [xhr.responseText];
  //             } else if (typeof xhr.responseText === "string") {
  //               try {
  //                 dataArray = JSON.parse(xhr.responseText);
  //               } catch (err) {
  //                 console.error("Invalid JSON responseData:", err);
  //               }
  //             }

  //             const unifiedBalances = await fetchUnifiedBalances();

  //             dataArray.forEach((item: any, idx: number) => {
  //               const asset = unifiedBalances.find((asset: any) =>
  //                 asset.breakdown?.some((b: any) => {
  //                   if (!b.contractAddress) return false;

  //                   const contract = b.contractAddress.toLowerCase();

  //                   return (
  //                     item.token?.toLowerCase() === contract ||
  //                     (item.token?.toLowerCase() === ethAddress.toLowerCase() &&
  //                       contract === zeroAddress.toLowerCase())
  //                   );
  //                 })
  //               );

  //               if (asset) {
  //                 const amount = new Decimal(asset.balance)
  //                   .mul(Decimal.pow(10, asset.decimals || 0))
  //                   .floor()
  //                   .toFixed();

  //                 dataArray[idx] = { ...item, amount };
  //               } else {
  //                 console.log("No match for item:", item.token);
  //               }
  //             });

  //             console.log(dataArray, "dataArray");

  //             Object.defineProperty(xhr, "responseText", {
  //               get: () => JSON.stringify(dataArray),
  //             });

  //             Object.defineProperty(xhr, "response", {
  //               get: () => JSON.stringify(dataArray),
  //             });

  //             Object.defineProperty(xhr, "status", {
  //               get: () => 200,
  //             });

  //             Object.defineProperty(xhr, "statusText", {
  //               get: () => "OK",
  //             });
  //           }
  //         } catch (e) {
  //           console.warn("Failed to patch XHR response:", e);
  //         }
  //       }
  //     },
  //     false
  //   );

  //   return originalOpen.apply(this, [method, url, async, username, password]);
  // };

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    if (args[1] && args[1].body) {
      const requestBody = args[1].body as any;
      let payloadString;
      try {
        payloadString = new TextDecoder().decode(requestBody);
      } catch (error) {
        payloadString = requestBody;
      }
      let payload;
      try {
        payload = JSON.parse(payloadString);
      } catch (error) {
        return originalFetch.apply(this, args);
      }

      if (payload.method === "eth_getBalance" && payload.params?.[0]) {
        const unifiedBalances = await fetchUnifiedBalances();
        const chainIdHex = await window.nexus.request({
          method: "eth_chainId",
        });
        const chainId = parseInt(String(chainIdHex), 16);
        const ETH = unifiedBalances?.find((asset: any) =>
          asset.breakdown.find(
            (b: any) =>
              b.contractAddress === zeroAddress &&
              b.chain.id === Number(chainId)
          )
        );

        if (ETH) {
          return createResponse({
            jsonrpc: "2.0",
            id: payload.id,
            result: new Decimal(ETH.balance)
              .mul(Decimal.pow(10, 18))
              .toHexadecimal(),
          });
        }
      }

      if (
        payload.method === "eth_call" &&
        payload.params?.[0] &&
        payload.params[0].to?.toLowerCase() === MulticallAddress
      ) {
        const decoded = decodeFunctionData({
          abi: MulticallAbi,
          data: payload.params[0].data,
        });

        if (decoded.functionName === "balanceOf") {
          debugInfo("BALANCE OF CALLED", decoded);
        }
        if (decoded.functionName === "aggregate3") {
          const responseData = await response.clone().json();

          if (!responseData.result) {
            debugInfo(
              "No result in aggregate3 response, returning original response"
            );
            return response;
          }
          try {
            const decodedResult = decodeFunctionResult({
              abi: MulticallAbi,
              functionName: "aggregate3",
              data: responseData.result,
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

                if (decodedParam.functionName === "getUserWalletBalances") {
                  const balanceResult: any = decodeFunctionResult({
                    abi: MulticallAbi,
                    functionName: "getUserWalletBalances",
                    data: decodedResult[pIndex]?.returnData as `0x${string}`,
                  });

                  for (let i = 0; i < balanceResult[0].length; i++) {
                    const tokenAddress = balanceResult[0][i].toLowerCase();

                    const asset = unifiedBalances.find((bal) =>
                      bal.breakdown.some(
                        (asset) =>
                          asset.contractAddress.toLowerCase() ===
                          tokenAddress.toLowerCase()
                      )
                    );

                    if (asset) {
                      balanceResult[1][i] = BigInt(
                        new Decimal(asset?.balance)
                          .mul(Decimal.pow(10, asset.decimals))
                          .floor()
                          .toFixed()
                      );
                    }
                  }

                  decodedResult[pIndex].returnData = encodeFunctionResult({
                    abi: MulticallAbi,
                    functionName: "getUserWalletBalances",
                    result: balanceResult,
                  });
                }

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
                // console.log(
                //   "Failed to decode callData for target:",
                //   param.target,
                //   "Error:",
                //   error
                // );
              }
            });
            const modifiedResult = encodeFunctionResult({
              abi: MulticallAbi,
              functionName: "aggregate3",
              result: decodedResult,
            });

            return createResponse({
              jsonrpc: "2.0",
              id: payload.id,
              result: modifiedResult,
            });
          } catch (e) {
            console.log(e, "error");
            // debugInfo(
            //   "error occured, falling back to send original response",
            //   e
            // );
            return response;
          }
        }
      }
    }
    return response;
  };
}

injectNetworkInterceptor();
