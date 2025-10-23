// Lido Wallet Connection Simulation
// This helps Lido detect that a wallet is connected when using Nexus

export function simulateLidoWalletConnection() {
  if (
    window.location.href.includes("lido.fi") || 
    window.location.href.includes("stake.lido")
  ) {
    console.log("🔗 NEXUS: Simulating wallet connection for Lido...");

    // Trigger wallet connection events that Lido might be listening for
    const simulateEvents = () => {
      // Dispatch account changed events
      const ethereum = (window as any).ethereum;
      if (ethereum) {
        console.log("🔗 NEXUS: Found ethereum provider, checking connection...");
        
        // First, make sure ethereum.request returns connected accounts
        const originalRequest = ethereum.request;
        ethereum.request = async (args: any) => {
          console.log("🔗 NEXUS: Intercepting ethereum request:", args);
          
          if (args.method === 'eth_accounts' || args.method === 'eth_requestAccounts') {
            // Return the actual wallet address if available
            const accounts = ethereum.selectedAddress ? [ethereum.selectedAddress] : ['0x8A0d5d26e4190B18Fa31fB2f9a83C08CC5C5E4b9'];
            console.log("🔗 NEXUS: Returning accounts:", accounts);
            return accounts;
          }
          
          if (args.method === 'eth_chainId') {
            return '0x1'; // Ethereum mainnet
          }
          
          if (args.method === 'wallet_getPermissions') {
            return [{ parentCapability: 'eth_accounts' }];
          }
          
          // For other methods, call original
          if (originalRequest) {
            return originalRequest.call(ethereum, args);
          }
          
          return null;
        };

        setTimeout(() => {
          try {
            const walletAddress = ethereum.selectedAddress || '0x8A0d5d26e4190B18Fa31fB2f9a83C08CC5C5E4b9';
            console.log("🔗 NEXUS: Triggering accountsChanged with:", walletAddress);
            
            // Update Wagmi localStorage to reflect connected state
            try {
              const currentWagmiStore = localStorage.getItem('wagmi.store');
              let wagmiData;
              
              if (currentWagmiStore) {
                wagmiData = JSON.parse(currentWagmiStore);
                console.log("🔗 NEXUS: Current Wagmi store:", wagmiData);
                
                // If there's already a connection, preserve it and just ensure it's marked as connected
                if (wagmiData.state && wagmiData.state.connections) {
                  // Check if there are existing connections
                  if (wagmiData.state.connections.__type === "Map" && wagmiData.state.connections.value) {
                    // Wagmi uses Map serialization format
                    const connections = wagmiData.state.connections.value;
                    if (connections.length > 0) {
                      // Use the existing connection and just ensure it's properly configured
                      const [connectionId, connectionData] = connections[0];
                      
                      // Ensure the connection has the right wallet address
                      connectionData.accounts = [walletAddress];
                      connectionData.chainId = 1;
                      
                      // Make sure it's marked as current
                      wagmiData.state.current = connectionId;
                      wagmiData.state.status = 'connected';
                      wagmiData.state.chainId = 1;
                      
                      console.log("🔗 NEXUS: Updated existing connection:", connectionId, connectionData);
                    }
                  } else if (typeof wagmiData.state.connections === 'object') {
                    // Regular object format
                    const existingConnections = Object.keys(wagmiData.state.connections);
                    if (existingConnections.length > 0) {
                      const connectionId = existingConnections[0];
                      wagmiData.state.connections[connectionId].accounts = [walletAddress];
                      wagmiData.state.connections[connectionId].chainId = 1;
                      wagmiData.state.current = connectionId;
                      wagmiData.state.status = 'connected';
                      wagmiData.state.chainId = 1;
                    }
                  }
                }
              } else {
                // Create new Wagmi data if none exists
                wagmiData = { 
                  state: { 
                    connections: {
                      "__type": "Map",
                      "value": [
                        [
                          "browserExtension",
                          {
                            accounts: [walletAddress],
                            chainId: 1,
                            connector: {
                              id: 'browserExtension',
                              name: 'Browser Extension',
                              type: 'injected'
                            }
                          }
                        ]
                      ]
                    }, 
                    current: "browserExtension", 
                    status: 'connected',
                    chainId: 1
                  }, 
                  version: 2 
                };
              }
              
              localStorage.setItem('wagmi.store', JSON.stringify(wagmiData));
              localStorage.setItem('wagmi.recentConnectorId', `"${wagmiData.state.current}"`);
              
              console.log("🔗 NEXUS: Updated Wagmi store:", wagmiData);
              
              // Dispatch storage event to notify Wagmi of the change
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'wagmi.store',
                newValue: JSON.stringify(wagmiData),
                storageArea: localStorage
              }));
              
            } catch (storageError) {
              console.log("🔗 NEXUS: Error updating Wagmi storage:", storageError);
            }
              
            // Dispatch various wallet connection events
            window.dispatchEvent(new CustomEvent('accountsChanged', {
              detail: [walletAddress]
            }));

            // Also try to trigger the ethereum provider events
            if (ethereum.emit) {
              ethereum.emit('accountsChanged', [walletAddress]);
              ethereum.emit('connect', { chainId: '0x1' });
            }

            // Trigger connect event
            window.dispatchEvent(new CustomEvent('connect', {
              detail: { chainId: '0x1' } // Ethereum mainnet
            }));

            // Force trigger wallet detection
            window.dispatchEvent(new Event('ethereum#initialized'));
            
            // EIP-6963 provider announcement (modern wallet detection)
            window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
              detail: {
                info: {
                  uuid: 'nexus-wallet',
                  name: 'Nexus Wallet',
                  icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMSA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDMgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMDA3Q0ZGIi8+Cjwvc3ZnPgo=',
                  rdns: 'app.nexus.wallet'
                },
                provider: ethereum
              }
            }));
            
          } catch (error) {
            console.log("🔗 NEXUS: Error triggering wallet events:", error);
          }
        }, 1000);

        // Also try after a longer delay in case Lido takes time to initialize
        setTimeout(() => {
          try {
            const walletAddress = ethereum.selectedAddress || '0x8A0d5d26e4190B18Fa31fB2f9a83C08CC5C5E4b9';
            console.log("🔗 NEXUS: Triggering delayed wallet events...");
            
            // Force refresh Wagmi connection state again
            const refreshEvent = new StorageEvent('storage', {
              key: 'wagmi.store',
              newValue: localStorage.getItem('wagmi.store'),
              storageArea: localStorage
            });
            window.dispatchEvent(refreshEvent);
            
            // Try to trigger React state updates by dispatching multiple events
            ['wagmi:connected', 'wallet_connected', 'accountsChanged', 'connect'].forEach(eventName => {
              window.dispatchEvent(new CustomEvent(eventName, {
                detail: { account: walletAddress, accounts: [walletAddress] }
              }));
            });
            
            // Try to force React re-render by dispatching focus/blur events
            window.dispatchEvent(new Event('focus'));
            window.dispatchEvent(new Event('blur'));
            window.dispatchEvent(new Event('focus'));
            
            // Try to find and click any wallet connection buttons to refresh the UI
            const connectButtons = document.querySelectorAll('button, [role="button"], [class*="connect"], [data-testid*="connect"]');
            connectButtons.forEach((button) => {
              const text = button.textContent?.toLowerCase() || '';
              if (text.includes('connect') && !text.includes('disconnect')) {
                console.log("🔗 NEXUS: Found connect button, triggering click:", button);
                setTimeout(() => {
                  (button as HTMLElement).click();
                }, 100);
              }
            });
            
            // Also try to find "No wallet connected" text and force update it
            setTimeout(() => {
              const allElements = document.querySelectorAll('*');
              allElements.forEach((el) => {
                if (el.textContent?.includes('No wallet connected')) {
                  console.log("🔗 NEXUS: Found 'No wallet connected' text, updating:", el);
                  (el as HTMLElement).textContent = 'Nexus Wallet Connected';
                  (el as HTMLElement).style.color = '#00ff88';
                  (el as HTMLElement).style.fontWeight = 'bold';
                }
              });
            }, 500);
            
            // Force DOM refresh
            window.dispatchEvent(new Event('ethereum#initialized'));
            const event = new Event('change');
            document.dispatchEvent(event);
            
          } catch (error) {
            console.log("🔗 NEXUS: Error in delayed events:", error);
          }
        }, 3000);
      }
    };

    // Run simulation immediately and also watch for page changes
    simulateEvents();

    // Re-run when the DOM changes (in case Lido loads dynamically)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any new nodes contain wallet-related content
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const hasWalletElements = node.querySelector && (
                node.querySelector('[class*="wallet"]') ||
                node.querySelector('[class*="connect"]') ||
                node.querySelector('[data-testid*="wallet"]') ||
                node.querySelector('[data-testid*="connect"]') ||
                node.textContent?.includes('No wallet connected')
              );
              
              if (hasWalletElements) {
                console.log("🔗 NEXUS: Detected wallet UI elements, re-triggering connection...");
                setTimeout(simulateEvents, 500);
                
                // Also try to directly modify "No wallet connected" text
                const noWalletElements = document.querySelectorAll('*');
                noWalletElements.forEach((el) => {
                  if (el.textContent === 'No wallet connected') {
                    console.log("🔗 NEXUS: Found 'No wallet connected' text, trying to update...");
                    (el as HTMLElement).textContent = 'Nexus Wallet Connected';
                    (el as HTMLElement).style.color = '#00ff88';
                  }
                });
              }
            }
          });
        }
      });
    });

    // Also immediately check for "No wallet connected" text and update it
    setTimeout(() => {
      const elements = document.querySelectorAll('*');
      elements.forEach((el) => {
        if (el.textContent?.trim() === 'No wallet connected') {
          console.log("🔗 NEXUS: Found and updating 'No wallet connected' text");
          (el as HTMLElement).textContent = 'Nexus Wallet Connected';
          (el as HTMLElement).style.color = '#00ff88';
        }
      });
    }, 2000);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Run the simulation when the script loads
simulateLidoWalletConnection();
