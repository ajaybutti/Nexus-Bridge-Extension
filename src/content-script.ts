import Browser from "webextension-polyfill";

const injectProviderScript = (injectionUrl: string) => {
  const container = document.head || document.documentElement;
  const ele = document.createElement("script");
  ele.setAttribute("src", Browser.runtime.getURL(injectionUrl));
  container.append(ele);
  console.log("ele", ele);
  ele.remove();
};

Browser.runtime
  .sendMessage({ type: "getChainAbstractionEnabled" })
  .then((response: any) => {
    console.log("Chain abstraction state:", response);
    if (response.enabled) {
      injectProviderScript("src/injected/nexus-ca.js");
    }
  })
  .catch((error) => {
    console.error("Error fetching chain abstraction state:", error);
  });
