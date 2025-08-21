import { CA } from "@arcana/ca-sdk";

export async function hasNexusInit() {
  if (!window.nexus?.getUnifiedBalances) {
    let isNexusInit = false;
    while (!isNexusInit) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      isNexusInit = (window.nexus as CA)?.getUnifiedBalances ? true : false;
    }
  }
  return true;
}
