import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionResult,
} from "viem";
import { MulticallAbi, MulticallAddress } from "../utils/multicall";
import Decimal from "decimal.js";
import { createResponse } from "../utils/response";
import { debugInfo } from "../utils/debug";

function injectNetworkInterceptor() {
  const originalFetch = window.fetch;

  // @ts-expect-error
  window.decodeFunctionData = decodeFunctionData;
  // @ts-expect-error
  window.MulticallAbi = MulticallAbi;
  // @ts-expect-error
  window.decodeFunctionResult = decodeFunctionResult;

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
        console.error("Failed to parse request body as JSON:", error);
        return originalFetch.apply(this, args);
      }
      if (
        payload.method === "eth_call" &&
        payload.params?.[0] &&
        payload.params[0].to?.toLowerCase() === MulticallAddress
      ) {
        debugInfo(
          "Intercepted eth_call request:",
          payload.params[0].to,
          payload.params[0].data
        );
        const decoded = decodeFunctionData({
          abi: MulticallAbi,
          data: payload.params[0].data,
        });
        debugInfo(
          "Decoded multicall data:",
          decoded,
          decoded.functionName === "aggregate3"
        );
        if (decoded.functionName === "aggregate3") {
          const responseData = await response.clone().json();
          debugInfo("Multicall response data:", responseData);
          if (!responseData.result) {
            console.warn(
              "No result in multicall response, returning original response"
            );
            return response;
          }
          const decodedResult = decodeFunctionResult({
            abi: MulticallAbi,
            functionName: "aggregate3",
            data: responseData.result,
          }) as { success: boolean; returnData: string }[];
          debugInfo("Decoded multicall response:", decodedResult);
          const params = decoded.args![0] as {
            target: string;
            callData: `0x${string}`;
            allowFailure: boolean;
          }[];
          debugInfo("Multicall params:", params);
          const unifiedBalances = await window.arcana.ca.getUnifiedBalances();
          debugInfo("Unified balances:", unifiedBalances);
          params.forEach((param, pIndex) => {
            try {
              debugInfo(
                "Decoding callData for target:",
                param.target,
                "callData:",
                param.callData
              );
              const decodedParam = decodeFunctionData({
                abi: MulticallAbi,
                data: param.callData,
              });
              debugInfo(
                "Decoded callData:",
                decodedParam,
                "for target:",
                param.target,
                "and account: ",
                decodedParam.args![0]
              );
              if (decodedParam.functionName !== "balanceOf") {
                debugInfo(
                  "Skipping non-balanceOf function call for target:",
                  param.target
                );
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
              decodedResult[pIndex].returnData = encodeFunctionResult({
                abi: MulticallAbi,
                functionName: "balanceOf",
                result: BigInt(
                  new Decimal(asset.balance)
                    .mul(Decimal.pow(10, asset.decimals))
                    .floor()
                    .toFixed()
                ),
              });
              debugInfo(
                "Modified returnData for target:",
                param.target,
                "to:",
                decodedResult[pIndex].returnData
              );
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
          debugInfo("modified result:", modifiedResult);
          return createResponse({
            jsonrpc: "2.0",
            id: payload.id,
            result: modifiedResult,
          });
        }
      }
    }
    debugInfo("Fetch response:", response);
    return response;
  };
}

injectNetworkInterceptor();
