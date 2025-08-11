import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";
import { nodePolyfills, PolyfillOptions } from "vite-plugin-node-polyfills";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

const nodePolyfillsFix = (options?: PolyfillOptions | undefined): Plugin => {
  const origPlugin = nodePolyfills(options);
  return {
    ...origPlugin,
    resolveId(this, source: string, importer: string | undefined, opts: any) {
      const m =
        /^vite-plugin-node-polyfills\/shims\/(buffer|global|process)$/.exec(
          source
        );
      if (m) {
        return `node_modules/vite-plugin-node-polyfills/shims/${m[1]}/dist/index.cjs`;
      } else {
        if (typeof origPlugin.resolveId === "function") {
          return origPlugin.resolveId.call(this, source, importer, opts);
        }
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "manifest.json"],
      browser: process.env.TARGET || "chrome",
      additionalInputs: ["src/injected/nexus-ca.ts"],
    }),
    nodePolyfillsFix({
      exclude: [
        "http",
        "http2",
        "https",
        "child_process",
        "dns",
        "dgram",
        "domain",
        "vm",
        "tls",
        "sys",
        "repl",
        "readline",
        "os",
        "net",
        "cluster",
        "console",
      ],
    }),
  ],
});
