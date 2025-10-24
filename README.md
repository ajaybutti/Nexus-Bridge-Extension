# NexusBridgExtension
# Nexus Chain Abstraction Browser Extension

A powerful browser extension that brings **unified multi-chain liquidity** to DeFi applications through intelligent transaction interception and automated cross-chain bridging. Built on the [Avail Nexus SDK](https://github.com/availproject/nexus), this extension seamlessly integrates chain abstraction into any Web3 dApp without requiring protocol modifications.

## 🌟 What is This Project?

This browser extension acts as an **intelligent middleware layer** between users and DeFi protocols, automatically detecting insufficient token balances and bridging assets from other chains to fulfill transactions. It transforms the fragmented multi-chain experience into a unified liquidity layer.

### Key Features

- 🔄 **Automatic Cross-Chain Bridging + DeFi Execution**: Detects when you lack sufficient tokens on one chain and automatically sources them from your balances on other chains, then executes the DeFi action
- 💰 **Unified Balance View**: Aggregates your token balances across all supported chains (Ethereum, Arbitrum, Base, Optimism, Polygon, Avalanche, BNB Chain, HyperEVM)
- 🎯 **Protocol-Agnostic Integration**: Works with DeFi protocols like Morpho, Aave, Lido, Hyperliquid, LiFi, and more without requiring any protocol changes
- 🔐 **Non-Custodial**: All transactions are signed by your existing wallet - the extension never holds your funds
- ⚡ **EIP-6963 Multi-Wallet Support**: Automatically detects and works with MetaMask, Rabby, Rainbow, and other Web3 wallets
- 🎨 **Shadow DOM Isolation**: Clean UI injection that doesn't interfere with dApp styling

## 🏗️ Architecture

### Components

1. **Content Script (`nexusCA.tsx`)**: 
   - Intercepts Web3 provider requests using EIP-6963
   - Analyzes transaction data to detect protocol interactions (Lido staking, Aave lending, DEX swaps, etc.)
   - Triggers unified bridging flows when insufficient balances are detected
   - Manages the Nexus SDK lifecycle and event handling

2. **Background Service Worker (`background.ts`)**: 
   - Handles extension lifecycle events
   - Manages persistent state across browser sessions

3. **Popup UI (`popup.tsx`)**: 
   - Shows extension status and connected wallet info
   - Displays provider information and connection state

4. **Injected Components**:
   - `IntentModal`: User interface for approving cross-chain bridge intents
   - `AllowanceModal`: Token allowance approval flow
   - `NexusSteps`: Progress tracking for multi-step bridging operations

### Supported Protocols

The extension has specialized integrations for:

- **Morpho** - USDC vault deposits with automatic bridging and deposit execution on Base
- **Aave V3** - USDC lending with automatic bridging and supply execution on Base, Ethereum, Optimism, Arbitrum, Polygon, Avalanche, BNB Chain, Scroll
- **Lido** - ETH staking with unified ETH across chains and automatic staking execution on Ethereum mainnet
- **Hyperliquid** - Trading with automatic USDC bridging
- **LiFi** - Cross-chain swaps with balance aggregation
- **HypurrFi** - Vault deposits on HyperEVM
- **Generic ERC20 Transfers** - Supports any token transfer with auto-bridging

## 🚀 How It Works

### Example Flow: Morpho USDC Vault Deposit

1. User visits Morpho on Base and tries to deposit 1000 USDC into a vault
2. User only has 400 USDC on Base, but has 600 USDC across Ethereum and Arbitrum
3. Extension intercepts the transaction and detects the 600 USDC deficit
4. Shows unified balance modal with breakdown across chains
5. User approves the intent to bridge 600 USDC from other chains → Base
6. Nexus SDK handles the cross-chain transfer via Circle CCTP
7. After bridging completes (~2-5 minutes), extension automatically calls Morpho's deposit function
8. 1000 USDC gets deposited into the vault and user receives vault tokens - all automated

### Example Flow: Lido Staking

1. User visits Lido and tries to stake 5 ETH
2. User only has 2 ETH on Ethereum, but has 3 ETH on Arbitrum
3. Extension intercepts the transaction and detects the deficit
4. Shows unified balance modal: "You need 3.002 more ETH (including gas)"
5. User approves the intent to bridge from Arbitrum → Ethereum
6. Nexus SDK handles the cross-chain transfer via Circle CCTP
7. After bridging completes, extension automatically calls Lido's submit() function
8. 5 ETH gets staked and user receives stETH - fully automated

### Example Flow: Aave USDC Supply

1. User visits Aave on Base and tries to supply 1000 USDC
2. User has 300 USDC on Base, 400 on Ethereum, 300 on Arbitrum
3. Extension detects 700 USDC deficit on Base
4. Shows intent modal with breakdown of sources
5. User approves → Nexus bridges 700 USDC from multiple chains to Base
6. After arrival, extension automatically calls Aave's supply() function
7. 1000 USDC gets supplied to Aave and user receives aTokens - completely automated

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- A Chromium-based browser (Chrome, Edge, Brave, Arc)
- A Web3 wallet extension (MetaMask, Rabby, etc.)

### Build Instructions

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd nexus-hyperliquid-poc
   npm install
   ```

2. **Build the Extension**
   ```bash
   npm run build
   ```

3. **Create Distribution Zip (Optional)**
   ```bash
   npm run zip
   # or build + zip in one command
   npm run build-zip
   ```

### Load Extension in Browser

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right corner)
3. Click **Load Unpacked**
4. Select the `dist/` folder from the project directory
5. The extension icon should appear in your browser toolbar

### Development Mode

For active development with hot reload:

```bash
npm run dev
```

Then load the `dist/` folder as an unpacked extension. Changes will rebuild automatically.

## 🔧 Project Structure

```
nexus-hyperliquid-poc/
├── src/
│   ├── injected/
│   │   ├── nexusCA.tsx          # Main content script & transaction interceptor
│   │   ├── cache.ts             # Unified balance caching
│   │   ├── caEvents.ts          # Nexus SDK event handlers
│   │   ├── checkNexus.ts        # Nexus initialization checks
│   │   ├── domModifier.ts       # DOM manipulation utilities
│   │   └── networkInterceptor.ts # Network request interceptor
│   ├── components/
│   │   ├── intent-modal.tsx     # Bridge intent approval UI
│   │   ├── allowance-modal.tsx  # Token allowance UI
│   │   ├── event-modal.tsx      # Progress tracking UI
│   │   └── expandable-row.tsx   # Collapsible UI components
│   ├── utils/
│   │   ├── constants.ts         # Token mappings & chain configs
│   │   ├── multicall.ts         # Multicall contract ABIs
│   │   ├── lido.abi.ts         # Lido protocol integration
│   │   ├── aave.abi.ts         # Aave V3 protocol integration
│   │   ├── lifi.abi.ts         # LiFi protocol integration
│   │   └── publicClient.ts     # Viem public client setup
│   ├── background.ts            # Service worker
│   ├── popup.tsx               # Extension popup UI
│   └── manifest.json           # Extension manifest
├── public/                     # Static assets
├── vite.config.ts             # Vite build configuration
└── package.json
```

## 🛠️ Technical Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7 with web extension plugin
- **Web3 Libraries**: 
  - Viem 2.33 (Ethereum interactions)
  - @avail-project/nexus (Chain abstraction SDK)
- **Browser APIs**: Chrome Extension Manifest V3
- **Wallet Integration**: EIP-6963 (Multi-wallet discovery)
- **Styling**: Shadow DOM with isolated CSS

## 🎯 Supported Chains

- Ethereum Mainnet (Chain ID: 1)
- Arbitrum One (Chain ID: 42161)
- Base (Chain ID: 8453)
- Optimism (Chain ID: 10)
- Polygon (Chain ID: 137)
- Avalanche C-Chain (Chain ID: 43114)
- BNB Chain (Chain ID: 56)
- HyperEVM (Chain ID: 999)

## 🔐 Security Considerations

- **Non-Custodial**: Extension never has access to private keys
- **User Approval**: All bridge intents require explicit user confirmation
- **Transaction Simulation**: Nexus SDK simulates all transactions before execution
- **Shadow DOM Isolation**: UI components are isolated from dApp code
- **Read-Only Balance Checks**: Extension only intercepts and analyzes transactions, doesn't modify them without approval

## 🐛 Known Limitations

- **Bridge Timing**: Cross-chain bridges take 2-5 minutes - users must manually retry transactions after bridging completes
- **Gas Estimation**: Currently uses fixed gas reserves (0.002 ETH) for native token bridging
- **Protocol Coverage**: Specialized integrations only cover major protocols (Morpho, Aave, Lido, Hyperliquid) - other protocols use generic ERC20 detection

## Quirks

- Injects the SDK and UI into the dapp using content-script
- Currently only works on Hyperliquid
- Uses Vite and React

## 🤝 Contributing
Happy to merge with  other defi protocol automation workflows using Nexus bridge 
---

**Built with ❤️ using Avail Nexus SDK**



https://app.morpho.org/base/vault/0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183/steakhouse-usdc?tab=vault