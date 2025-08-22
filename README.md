# Nexus Injector

Injects Nexus Chain Abstraction SDK into web3 pages

# Injector in action

https://github.com/user-attachments/assets/db4a9ff3-abf3-49c9-bf18-a476b0fdb8be


## Setup

Install dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

Zip the built extension:

```bash
npm run zip
```

Build and zip the extension in a single step

```bash
npm run build-zip
```

## Extension Installation

- Extract the zip file
- Go to Chrome (or any Chromium browser) and type in `chrome://extensions` on the url bar, hit enter
- Switch ON the `Developer Mode` on top right corner
- Click `Load Unpacked` button on the top left corner and locate the extracted folder and click Open, this should load the extension in the browser

## Quirks

- Injects the SDK and UI into the dapp using content-script
- Currently only works on Hyperliquid
- Uses Vite and React
