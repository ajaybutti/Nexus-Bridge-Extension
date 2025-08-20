import Browser from "webextension-polyfill";

const injectProviderScript = (injectionUrl: string) => {
  const container = document.head || document.documentElement;
  const ele = document.createElement("script");
  ele.setAttribute("src", Browser.runtime.getURL(injectionUrl));
  container.append(ele);
  console.log("ele", ele);
  ele.remove();
};

const localState = {
  chainAbstractionStatus: false,
};

// Listen for provider updates from the page context (injected script)
window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as any;
  if (!data || data.type !== "NEXUS_PROVIDER_UPDATE") return;
  try {
    Browser.storage.local.set({
      nexusProviderName: data.providerName ?? null,
      nexusProviderIcon: data.providerIcon ?? null,
      nexusWalletAddress: data.walletAddress ?? null,
    });
  } catch (e) {
    console.debug("Failed to persist provider name", e);
  }
});

Browser.runtime
  .sendMessage({ type: "getChainAbstractionEnabled" })
  .then((response: any) => {
    console.log("Chain abstraction state:", response);
    localState.chainAbstractionStatus = response.enabled;
    if (response.enabled) {
      injectProviderScript("src/injected/nexusCA.js");
      injectProviderScript("src/injected/networkInterceptor.js");
      injectProviderScript("src/injected/domModifier.js");
    }
  })
  .catch((error) => {
    console.error("Error fetching chain abstraction state:", error);
  });

Browser.runtime.onMessage.addListener(
  (event: any, sender: any, sendResponse) => {
    console.log("MESSAGE FROM RUNTIME", event);
    sendResponse(localState.chainAbstractionStatus);
    return true;
  }
);
