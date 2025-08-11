/// <reference types="vite/client" />

import { NexusSDK } from "@avail-project/nexus/core";

declare global {
  interface Window {
    nexus: NexusSDK;
  }
}
