import Browser from "webextension-polyfill";

console.log("Hello from the background!");

Browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details);
});

Browser.runtime.onMessage.addListener(async (message: any) => {
  if (message.type === "chainAbstractionStateChanged") {
    console.log("Chain abstraction state changed:", message.enabled);
    Browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs && tabs[0]) {
        Browser.tabs.reload(tabs[0].id!);
      }
    });
  }
  if (message.type === "getChainAbstractionEnabled") {
    console.log("Fetching chain abstraction state");
    const result = await Browser.storage.local.get("chainAbstractionEnabled");
    return { enabled: result.chainAbstractionEnabled || false };
  }
  return true; // Keep the message channel open for sendResponse
});
