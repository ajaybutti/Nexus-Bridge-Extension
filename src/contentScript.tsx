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
