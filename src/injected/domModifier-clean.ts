import { zeroAddress } from "viem";
import { fetchUnifiedBalances } from "./cache";
import {
  asterDexBalanceWrapDiv,
  asterDexModalDiv,
  asterDexModalWrapDiv,
  asterDexParentContentDiv,
  asterDexTokenDiv,
  asterDexUnifiedBalanceDiv,
  dropdownNode,
  dropdownParentNode,
  fellixBalanceWrapDiv,
  fellixModalDiv,
  fellixModalWrapDiv,
  fellixParentContentDiv,
  fellixTokenDiv,
  fellixUnifiedBalanceDiv,
  liminalBalanceWrapDiv,
  liminalChainWrapDiv,
  liminalModalWrapDiv,
  liminalTokenWrapDiv,
  titleNode,
} from "./domDiv";
import { removeMainnet } from "../utils/multicall";
import { getChainName } from "../utils/lib";
import { extractVaultAddressFromUrl, approveAndDepositToVault } from "../utils/morpho-vault";
import { stakeEthWithLido, getStEthBalance } from "../utils/lido-stake";

let prevAssetSymbols: string[] = [];

function hideElement(element: HTMLElement | Element) {
  element.setAttribute("style", "display: none;");
}

// Lido unified ETH modal function
function openLidoUnifiedEthModal(ethAsset: any) {
  console.log("🔥 NEXUS: Opening Lido unified ETH modal");
  
  const totalEth = parseFloat(ethAsset.balance || "0");
  const ethChains = ethAsset.breakdown?.filter((token: any) => Number(token.balance) > 0) || [];
  let currentMainnetEth = 0;
  
  // Find mainnet ETH balance
  ethChains.forEach((chain: any) => {
    if (chain.chain.name === "Ethereum" || chain.chain.name === "Mainnet") {
      currentMainnetEth = parseFloat(chain.balance || "0");
    }
  });

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'nexus-lido-modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999999;
    backdrop-filter: blur(5px);
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    border-radius: 16px;
    padding: 24px;
    width: 450px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(79, 70, 229, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  modalContent.innerHTML = `
    <div style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; color: #fff; font-size: 24px; font-weight: 600;">🔥 Unified ETH Staking</h2>
        <button id="close-modal" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; line-height: 1;">×</button>
      </div>
      <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">Bridge ETH to Ethereum mainnet and stake with Lido automatically</p>
    </div>

    <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">💰 Your ETH Balance</div>
      <div style="font-size: 20px; font-weight: bold; color: #A5B4FC; margin-bottom: 8px;">${totalEth.toFixed(4)} ETH Total</div>
      <div style="font-size: 14px; color: rgba(255,255,255,0.7);">
        ${ethChains.map((eth: any) => `${removeMainnet(eth.chain.name)}: ${parseFloat(eth.balance).toFixed(4)} ETH`).join(' • ')}
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">ETH Amount to Stake</label>
      <input 
        type="number" 
        id="eth-amount-input" 
        placeholder="0.1"
        step="0.0001"
        max="${totalEth}"
        style="
          width: 100%;
          padding: 14px;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: white;
          font-size: 16px;
          font-family: inherit;
          box-sizing: border-box;
        "
      />
      <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px;">
        Min: 0.0001 ETH • Max: ${totalEth.toFixed(4)} ETH
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <button id="quick-stake-btn" style="
        padding: 14px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 10px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        💎 Quick Stake<br>
        <span style="font-size: 11px; opacity: 0.8;">Use mainnet ETH</span>
      </button>
      
      <button id="bridge-stake-btn" style="
        padding: 14px;
        background: linear-gradient(45deg, #10B981, #059669);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        🔥 Bridge + Stake<br>
        <span style="font-size: 11px; opacity: 0.9;">Bridge then auto-stake</span>
      </button>
    </div>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Get input elements
  const ethAmountInput = modalContent.querySelector('#eth-amount-input') as HTMLInputElement;
  const quickStakeBtn = modalContent.querySelector('#quick-stake-btn') as HTMLButtonElement;
  const bridgeStakeBtn = modalContent.querySelector('#bridge-stake-btn') as HTMLButtonElement;

  // Close modal handler
  modalContent.querySelector('#close-modal')?.addEventListener('click', () => {
    modalOverlay.remove();
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });

  // Bridge + Stake button handler - This is the main automatic flow
  bridgeStakeBtn.addEventListener('click', async () => {
    const stakeAmount = parseFloat(ethAmountInput.value || '0');
    
    if (!stakeAmount || stakeAmount <= 0) {
      alert('Please enter a valid ETH amount');
      return;
    }

    if (stakeAmount > totalEth) {
      alert(`Amount exceeds your total ETH balance of ${totalEth.toFixed(4)} ETH`);
      return;
    }

    // Calculate deficit (how much ETH we need to bridge to mainnet)
    const deficit = Math.max(0, stakeAmount - currentMainnetEth);
    
    bridgeStakeBtn.disabled = true;
    bridgeStakeBtn.innerHTML = '⏳ Bridging...';
    bridgeStakeBtn.style.opacity = '0.7';

    try {
      console.log(`🔥 NEXUS: Need to stake ${stakeAmount} ETH`);
      console.log(`🔥 NEXUS: Current mainnet ETH: ${currentMainnetEth.toFixed(4)} ETH`);
      console.log(`🔥 NEXUS: Need to bridge: ${deficit.toFixed(4)} ETH`);

      // Set destination chainId to Ethereum mainnet (1)
      if ((window as any).nexus?.setDestinationChainId) {
        (window as any).nexus.setDestinationChainId(1);
        console.log("🔥 NEXUS: Set destination chainId to 1 (Ethereum mainnet)");
      }
      
      // Bridge ETH to Ethereum mainnet if needed
      let bridgeResult = { success: true };
      
      if (deficit > 0.0001) { // Only bridge if deficit is meaningful
        bridgeResult = await (window as any).nexus.bridge({
          amount: deficit.toString(),
          token: 'eth',
          chainId: 1, // Ethereum mainnet
        });
      }
      
      console.log(`🔥 NEXUS: Bridge result:`, bridgeResult);
      
      if (bridgeResult.success) {
        modalOverlay.remove(); // Close the original modal first
        
        console.log(`🔥 NEXUS: Auto-staking ${stakeAmount} ETH with Lido after successful bridge`);
        
        // Show auto-staking loading modal
        const loadingModal = document.createElement('div');
        loadingModal.className = 'nexus-lido-loading-modal';
        loadingModal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999999;
          backdrop-filter: blur(5px);
        `;
        
        const loadingContent = document.createElement('div');
        loadingContent.style.cssText = `
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          border-radius: 16px;
          padding: 32px;
          width: 400px;
          max-width: 90vw;
          box-shadow: 0 20px 60px rgba(79, 70, 229, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
        `;
        
        loadingContent.innerHTML = `
          <div style="margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔥</div>
            <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 24px; font-weight: 600;">Auto Staking...</h2>
            <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">Bridged ${deficit.toFixed(4)} ETH → Now staking with Lido</p>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">🔥 Staking Amount</div>
            <div style="font-size: 20px; font-weight: bold; color: #A5B4FC;">${stakeAmount.toFixed(4)} ETH</div>
          </div>
          
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; color: rgba(255,255,255,0.8);">
            <div style="width: 20px; height: 20px; border: 2px solid #A5B4FC; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span>Staking ETH with Lido...</span>
          </div>
          
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        `;
        
        loadingModal.appendChild(loadingContent);
        document.body.appendChild(loadingModal);
        
        // Wait for bridge to settle, then auto-stake with Lido
        setTimeout(async () => {
          try {
            const result = await stakeEthWithLido(stakeAmount.toString());
            loadingModal.remove();
            
            if (result.success) {
              // Show final success modal
              const successModal = document.createElement('div');
              successModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
                backdrop-filter: blur(5px);
              `;
              
              const successContent = document.createElement('div');
              successContent.style.cssText = `
                background: linear-gradient(135deg, #059669 0%, #10B981 100%);
                border-radius: 16px;
                padding: 32px;
                width: 400px;
                max-width: 90vw;
                box-shadow: 0 20px 60px rgba(16, 185, 129, 0.3);
                border: 1px solid rgba(16, 185, 129, 0.3);
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
              `;
              
              successContent.innerHTML = `
                <div style="margin-bottom: 24px;">
                  <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
                  <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 28px; font-weight: 600;">Staking Complete!</h2>
                  <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px;">Fully automated bridge + Lido staking completed</p>
                </div>
                
                <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>✅ Bridged to Mainnet:</span>
                    <span style="font-weight: bold;">${deficit.toFixed(4)} ETH</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span>✅ Staked with Lido:</span>
                    <span style="font-weight: bold;">${stakeAmount.toFixed(4)} ETH</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>✅ Received stETH:</span>
                    <span style="font-weight: bold;">~${stakeAmount.toFixed(4)} stETH</span>
                  </div>
                </div>
                
                <div style="margin-bottom: 24px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                  <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">Transaction Hash:</div>
                  <div style="font-size: 10px; font-family: monospace; word-break: break-all;">${result.txHash}</div>
                </div>
                
                <button onclick="this.parentElement.parentElement.remove()" style="
                  width: 100%;
                  padding: 16px;
                  background: rgba(255,255,255,0.2);
                  border: 1px solid rgba(255,255,255,0.3);
                  border-radius: 12px;
                  color: white;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                ">
                  🚀   Close
                </button>
              `;
              
              successModal.appendChild(successContent);
              document.body.appendChild(successModal);
              
            } else {
              alert(`⚠️ Bridge succeeded but auto-staking failed:\n\n${result.error}\n\nYou can manually stake your ETH on Lido.`);
            }
          } catch (error: any) {
            loadingModal.remove();
            console.error('🔥 NEXUS: Error during auto-staking:', error);
            alert(`⚠️ Bridge succeeded but auto-staking failed:\n\n${error.message || error}\n\nYou can manually stake your ETH on Lido.`);
          }
        }, 2000); // Wait 2 seconds for bridge to settle
        
      } else {
        // User rejected or bridging failed
        console.log('🔥 NEXUS: Bridging was rejected or failed');
        alert('Bridging was cancelled or failed. Please try again.');
        bridgeStakeBtn.disabled = false;
        bridgeStakeBtn.innerHTML = '🔥 Bridge + Stake<br><span style="font-size: 11px; opacity: 0.9;">Bridge then auto-stake</span>';
        bridgeStakeBtn.style.opacity = '1';
      }
      
    } catch (error: any) {
      console.error('🔥 NEXUS: Error during unified ETH staking:', error);
      alert(`Failed to initiate bridging: ${error?.message || error}`);
      bridgeStakeBtn.disabled = false;
      bridgeStakeBtn.innerHTML = '🔥 Bridge + Stake<br><span style="font-size: 11px; opacity: 0.9;">Bridge then auto-stake</span>';
      bridgeStakeBtn.style.opacity = '1';
    }
  });
  
  // Quick stake button - for users who already have ETH on mainnet
  quickStakeBtn.addEventListener('click', async () => {
    const stakeAmount = parseFloat(ethAmountInput.value || '0');
    
    if (!stakeAmount || stakeAmount <= 0) {
      alert('Please enter a valid ETH amount');
      return;
    }
    
    if (stakeAmount > currentMainnetEth) {
      alert(`Amount exceeds your mainnet balance of ${currentMainnetEth.toFixed(4)} ETH`);
      return;
    }
    
    console.log(`🔥 NEXUS: Quick stake ${stakeAmount} ETH with Lido`);
    
    quickStakeBtn.disabled = true;
    quickStakeBtn.innerHTML = '⏳ Staking...';
    quickStakeBtn.style.opacity = '0.7';
    
    try {
      const result = await stakeEthWithLido(stakeAmount.toString());
      
      if (result.success) {
        modalOverlay.remove();
        alert(`🎉 Staking Successful!\n\n✅ Staked ${stakeAmount.toFixed(4)} ETH with Lido\n✅ Received ~${stakeAmount.toFixed(4)} stETH\n\nTransaction: ${result.txHash}\n\nYour ETH is now earning staking rewards!`);
      } else {
        quickStakeBtn.disabled = false;
        quickStakeBtn.innerHTML = '💎 Quick Stake<br><span style="font-size: 11px; opacity: 0.8;">Use mainnet ETH</span>';
        quickStakeBtn.style.opacity = '1';
        alert(`⚠️ Staking failed:\n\n${result.error}\n\nPlease try again.`);
      }
    } catch (error: any) {
      quickStakeBtn.disabled = false;
      quickStakeBtn.innerHTML = '💎 Quick Stake<br><span style="font-size: 11px; opacity: 0.8;">Use mainnet ETH</span>';
      quickStakeBtn.style.opacity = '1';
      alert(`⚠️ Staking failed:\n\n${error.message || error}\n\nPlease try again.`);
    }
  });
  
  // Focus on input
  setTimeout(() => {
    ethAmountInput.focus();
  }, 100);
}

// Function to open unified USDC supply modal for Aave
async function openUnifiedUsdcSupplyModal(totalUsdcBalance: number, usdcChains: any[]) {
  console.log("🏦 NEXUS: Opening unified USDC supply modal for Aave");
  
  // Remove existing modal if present
  const existingModal = document.querySelector('.nexus-aave-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Detect current chain dynamically FIRST
  let targetChainId = 137; // Default fallback to Polygon
  let targetChainName = "Polygon";
  
  try {
    const currentChainId = await (window as any).ethereum?.request({ method: 'eth_chainId' });
    if (currentChainId) {
      targetChainId = parseInt(currentChainId, 16);
      
      // Map common chain IDs to readable names
      const chainNames: { [key: number]: string } = {
        1: "Ethereum",
        10: "Optimism", 
        56: "BSC",
        137: "Polygon",
        8453: "Base",
        42161: "Arbitrum",
        43114: "Avalanche"
      };
      
      targetChainName = chainNames[targetChainId] || `Chain ${targetChainId}`;
      console.log(`🏦 NEXUS: Detected current chain: ${targetChainName} (${targetChainId})`);
    }
  } catch (error) {
    console.log("🏦 NEXUS: Failed to detect chain, using Polygon as fallback");
  }
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'nexus-aave-modal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999999;
    backdrop-filter: blur(5px);
  `;
  
  // Create modal content NOW that we have targetChainName
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 16px;
    padding: 24px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  modalContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 24px; font-weight: 600;">🌐 Supply with Unified USDC</h2>
      <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">Supply USDC to Aave from all your chains</p>
    </div>
    
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-weight: 600; color: #fff;">Available Balance</span>
        <span style="font-weight: bold; color: #00ff88; font-size: 18px;">$${totalUsdcBalance.toFixed(2)} USDC</span>
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.8);">
        ${usdcChains.map((chain: any) => `
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>${removeMainnet(chain.chain.name)}</span>
            <span style="color: #ffeb3b; font-weight: 600;">$${parseFloat(chain.balance).toFixed(2)} USDC</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">USDC Amount to Supply</label>
      <div style="position: relative;">
        <input 
          type="number" 
          id="usdc-amount-input" 
          placeholder="100.00"
          step="0.01"
          min="0.01"
          max="${totalUsdcBalance}"
          inputmode="decimal"
          style="
            width: 100%;
            padding: 14px 60px 14px 14px;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 16px;
            font-family: inherit;
            box-sizing: border-box;
            -webkit-appearance: none;
            -moz-appearance: textfield;
          "
        />
        <div style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 2px;">
          <button id="increment-btn" style="
            width: 24px;
            height: 20px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            color: white;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          ">▲</button>
          <button id="decrement-btn" style="
            width: 24px;
            height: 20px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            color: white;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          ">▼</button>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="quick-25" style="
          flex: 1;
          padding: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          cursor: pointer;
        ">25%</button>
        <button id="quick-50" style="
          flex: 1;
          padding: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          cursor: pointer;
        ">50%</button>
        <button id="quick-75" style="
          flex: 1;
          padding: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          cursor: pointer;
        ">75%</button>
        <button id="quick-max" style="
          flex: 1;
          padding: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          cursor: pointer;
        ">MAX</button>
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px;">
        Min: $0.01 USDC • Max: $${totalUsdcBalance.toFixed(2)} USDC
      </div>
    </div>

    <button id="bridge-supply-btn" style="
      width: 100%;
      padding: 16px;
      background: linear-gradient(45deg, #667eea, #764ba2);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    ">
      🚀 Bridge + Supply to Aave
      <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Bridge USDC to ${targetChainName} then supply automatically</div>
    </button>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Get input element and ensure it's accessible
  const usdcAmountInput = modalContent.querySelector('#usdc-amount-input') as HTMLInputElement;
  const bridgeSupplyBtn = modalContent.querySelector('#bridge-supply-btn') as HTMLButtonElement;
  
  // Get control buttons
  const incrementBtn = modalContent.querySelector('#increment-btn') as HTMLButtonElement;
  const decrementBtn = modalContent.querySelector('#decrement-btn') as HTMLButtonElement;
  const quick25Btn = modalContent.querySelector('#quick-25') as HTMLButtonElement;
  const quick50Btn = modalContent.querySelector('#quick-50') as HTMLButtonElement;
  const quick75Btn = modalContent.querySelector('#quick-75') as HTMLButtonElement;
  const quickMaxBtn = modalContent.querySelector('#quick-max') as HTMLButtonElement;

  // Debug: make sure input is working
  console.log("🏦 NEXUS: USDC input element:", usdcAmountInput);
  
  // Ensure input is enabled and focusable
  if (usdcAmountInput) {
    usdcAmountInput.disabled = false;
    usdcAmountInput.readOnly = false;
    usdcAmountInput.style.pointerEvents = 'auto';
    console.log("🏦 NEXUS: Input enabled and ready for typing");
  }

  // Add increment/decrement functionality
  incrementBtn?.addEventListener('click', () => {
    const current = parseFloat(usdcAmountInput.value || '0');
    const newValue = Math.min(current + 0.1, totalUsdcBalance);
    usdcAmountInput.value = newValue.toFixed(2);
  });

  decrementBtn?.addEventListener('click', () => {
    const current = parseFloat(usdcAmountInput.value || '0');
    const newValue = Math.max(current - 0.1, 0.01);
    usdcAmountInput.value = newValue.toFixed(2);
  });

  // Add quick amount buttons
  quick25Btn?.addEventListener('click', () => {
    usdcAmountInput.value = (totalUsdcBalance * 0.25).toFixed(2);
  });

  quick50Btn?.addEventListener('click', () => {
    usdcAmountInput.value = (totalUsdcBalance * 0.5).toFixed(2);
  });

  quick75Btn?.addEventListener('click', () => {
    usdcAmountInput.value = (totalUsdcBalance * 0.75).toFixed(2);
  });

  quickMaxBtn?.addEventListener('click', () => {
    usdcAmountInput.value = totalUsdcBalance.toFixed(2);
  });

  // Close modal on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });

  // Bridge + Supply button handler
  bridgeSupplyBtn.addEventListener('click', async () => {
    const supplyAmount = parseFloat(usdcAmountInput.value || '0');
    
    if (!supplyAmount || supplyAmount <= 0) {
      alert('Please enter a valid USDC amount');
      return;
    }

    if (supplyAmount < 0.01) {
      alert('Minimum amount is $0.01 USDC');
      return;
    }

    if (supplyAmount > totalUsdcBalance) {
      alert(`Amount exceeds your total USDC balance of $${totalUsdcBalance.toFixed(2)}`);
      return;
    }

    bridgeSupplyBtn.disabled = true;
    bridgeSupplyBtn.innerHTML = '⏳ Bridging...';

    try {
      console.log(`🏦 NEXUS: Bridging $${supplyAmount} USDC to ${targetChainName} for Aave supply`);
      
      // Set destination to current chain for Aave
      if ((window as any).nexus?.setDestinationChainId) {
        (window as any).nexus.setDestinationChainId(targetChainId);
        console.log(`🏦 NEXUS: Set destination chainId to ${targetChainId} (${targetChainName})`);
      }
      
      const bridgeResult = await (window as any).nexus.bridge({
        amount: supplyAmount.toString(),
        token: 'usdc',
        chainId: targetChainId,
      });
      
      if (bridgeResult.success) {
        modalOverlay.remove();
        alert(`🎉 Bridge Successful!\n\n✅ Bridged $${supplyAmount} USDC to ${targetChainName}\n\nYou can now supply to Aave manually on ${targetChainName}.`);
      } else {
        bridgeSupplyBtn.disabled = false;
        bridgeSupplyBtn.innerHTML = `🚀 Bridge + Supply to Aave<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Bridge USDC to ${targetChainName} then supply automatically</div>`;
        alert('Bridging was cancelled or failed. Please try again.');
      }
      
    } catch (error: any) {
      console.error('🏦 NEXUS: Error during unified USDC bridging:', error);
      bridgeSupplyBtn.disabled = false;
      bridgeSupplyBtn.innerHTML = `🚀 Bridge + Supply to Aave<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Bridge USDC to ${targetChainName} then supply automatically</div>`;
      alert(`Failed to initiate bridging: ${error?.message || error}`);
    }
  });
  
  // Focus on input and ensure it's ready
  setTimeout(() => {
    if (usdcAmountInput) {
      usdcAmountInput.focus();
      usdcAmountInput.click(); // Additional focus attempt
      console.log("🏦 NEXUS: Input focused and ready for typing");
    }
  }, 200);
}

function injectDomModifier() {
  if (document.getElementById("root") || document.documentElement) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(async (mutation) => {
        if (
          mutation.type === "childList" &&
          mutation.addedNodes.length > 0 &&
          mutation.addedNodes[0] instanceof HTMLElement
        ) {
          // Basic DOM modifications for existing integrations
          if ((mutation.addedNodes[0] as HTMLElement)?.querySelector(asterDexModalDiv)) {
            // Handle AsterDex modal
            console.log("🌟 NEXUS: AsterDex modal detected");
          }

          if ((mutation.addedNodes[0] as HTMLElement)?.matches(liminalModalWrapDiv)) {
            // Handle Liminal modal
            console.log("🌊 NEXUS: Liminal modal detected");
          }

          if ((mutation.addedNodes[0] as HTMLElement)?.matches(dropdownNode)) {
            const element = mutation.addedNodes[0] as HTMLElement;
            if (element.innerHTML.includes("Arbitrum")) {
              for (let i = 0; i < element.children[0].children[0].children.length; i++) {
                const child = element.children[0].children[0].children[i] as HTMLElement;
                if (!child.innerHTML.includes("Arbitrum")) {
                  hideElement(child);
                }
              }
            } else if (element.innerHTML.includes("USDC")) {
              for (let i = 0; i < element.children[0].children[0].children.length; i++) {
                const child = element.children[0].children[0].children[i] as HTMLElement;
                if (child.innerText !== "USDC" && child.innerText !== "USDT") {
                  hideElement(child);
                }
              }
            }
          }

          if ((mutation.addedNodes[0] as HTMLElement)?.querySelector(titleNode)) {
            const node = (mutation.addedNodes[0] as HTMLElement).querySelector(titleNode)!;
            node.innerHTML = node.innerHTML.replace(
              " from Arbitrum",
              " from <span style='text-decoration: line-through; text-decoration-thickness: 4px;'>Arbitrum</span> Everywhere"
            );
          }

          if ((mutation.addedNodes[0] as HTMLElement)?.querySelector(dropdownParentNode)) {
            const nodes = (mutation.addedNodes[0] as HTMLElement).querySelectorAll(dropdownParentNode);
            nodes.forEach((node) => {
              if (node.innerHTML.includes("Deposit Chain")) {
                hideElement(node);
              }
            });
          }

          // Lido Integration - Clean unified ETH button approach
          if (
            window.location.hostname.includes("lido.fi") || 
            window.location.hostname.includes("stake.lido")
          ) {
            console.log("🔥 NEXUS: Detected Lido domain, initializing unified ETH integration...");
            
            // Check if unified button already exists
            if (!document.querySelector('.nexus-lido-unified-button')) {
              // Get unified balances
              const unifiedBalances = await fetchUnifiedBalances();
              
              // Find ETH across all chains
              const ethAsset = unifiedBalances.find((bal: any) => bal.symbol === "ETH");
              
              if (ethAsset && parseFloat(ethAsset.balance || "0") > 0) {
                console.log("🔥 NEXUS: Creating unified ETH button for Lido");
                
                // Create floating unified ETH button
                const unifiedBtn = document.createElement('button');
                unifiedBtn.className = 'nexus-lido-unified-button';
                unifiedBtn.innerHTML = `
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">🔥</span>
                    <span style="font-weight: bold;">Unified ETH</span>
                  </div>
                `;
                
                unifiedBtn.style.cssText = `
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  z-index: 999999;
                  padding: 12px 20px;
                  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                  color: white;
                  border: none;
                  border-radius: 12px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
                  transition: all 0.3s ease;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  border: 1px solid rgba(255, 255, 255, 0.2);
                `;

                // Add hover effects
                unifiedBtn.addEventListener('mouseenter', () => {
                  unifiedBtn.style.transform = 'translateY(-2px)';
                  unifiedBtn.style.boxShadow = '0 12px 35px rgba(79, 70, 229, 0.4)';
                });

                unifiedBtn.addEventListener('mouseleave', () => {
                  unifiedBtn.style.transform = 'translateY(0)';
                  unifiedBtn.style.boxShadow = '0 8px 25px rgba(79, 70, 229, 0.3)';
                });

                // Add click handler
                unifiedBtn.addEventListener('click', () => {
                  openLidoUnifiedEthModal(ethAsset);
                });

                document.body.appendChild(unifiedBtn);
                console.log("🔥 NEXUS: Unified ETH button added to Lido");
              }
            }
          }
        }
      });
    });

    if (document.getElementById("root")) {
      observer.observe(document.getElementById("root")!, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    } else {
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }
  }
}

// Aave V3 Integration - Show popup when Aave's Supply modal opens
async function initializeAaveIntegration() {
  // Check if we're on any Aave domain (dashboard or market-specific)
  const isAaveDomain = window.location.hostname.includes("app.aave.com") || 
                      window.location.hostname === "aave.com";
  
  if (!isAaveDomain) {
    console.log("🏦 NEXUS: Not on Aave domain, skipping Aave integration");
    return;
  }

  // Guard to prevent multiple initializations
  if ((window as any).__nexusAaveInitialized) {
    return;
  }
  (window as any).__nexusAaveInitialized = true;

  console.log("🏦 NEXUS: Aave integration active on", window.location.href, "- will show popup when USDC Supply modal opens");

  // Watch for Aave's Supply modal to appear
  const observer = new MutationObserver(async () => {
    // Look for Aave's Supply modal with more flexible detection
    const modalElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p, button'));
    
    // Check for various Supply USDC modal patterns
    const supplyModal = modalElements.find(el => {
      const text = el.textContent?.toLowerCase() || '';
      return (
        (text.includes('supply') && text.includes('usdc')) ||
        text === 'supply usdc' ||
        text.includes('deposit usdc') ||
        (text.includes('supply') && el.closest('[role="dialog"]')) ||
        (text.includes('usdc') && el.closest('[role="modal"]'))
      );
    });
    
    // Also check for USDC token selectors or inputs
    const usdcInputs = Array.from(document.querySelectorAll('input, select')).find(input => {
      const placeholder = (input as HTMLInputElement).placeholder?.toLowerCase() || '';
      const value = (input as HTMLInputElement).value?.toLowerCase() || '';
      const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
      return placeholder.includes('usdc') || value.includes('usdc') || ariaLabel.includes('usdc');
    });
    
    if ((supplyModal || usdcInputs) && !(window as any).__nexusAaveModalShown) {
      console.log("🏦 NEXUS: Aave Supply USDC modal detected!", {
        foundModal: !!supplyModal,
        foundInput: !!usdcInputs,
        modalText: supplyModal?.textContent,
        url: window.location.href
      });
      (window as any).__nexusAaveModalShown = true;
      
      // Wait a bit for modal to fully render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch unified balances
      const unifiedBalances = await fetchUnifiedBalances();
      const usdcAsset = unifiedBalances.find((bal: any) => bal.symbol === "USDC");
      
      if (!usdcAsset) {
        console.log("🏦 NEXUS: No USDC found");
        return;
      }
      
      const totalUsdcBalance = parseFloat(usdcAsset.balance || "0");
      const usdcChains = usdcAsset.breakdown.filter((token: any) => Number(token.balance) > 0);

      if (totalUsdcBalance > 0) {
        console.log(`🏦 NEXUS: Showing unified USDC popup with $${totalUsdcBalance} across ${usdcChains.length} chains`);
        openUnifiedUsdcSupplyModal(totalUsdcBalance, usdcChains);
      }
    }
    
    // Reset flag when modal closes - check if any supply modal is still visible
    if ((window as any).__nexusAaveModalShown) {
      const stillHasModal = modalElements.some(el => {
        const text = el.textContent?.toLowerCase() || '';
        return (
          (text.includes('supply') && text.includes('usdc')) ||
          text === 'supply usdc' ||
          text.includes('deposit usdc')
        );
      });
      
      if (!stillHasModal && !usdcInputs) {
        console.log("🏦 NEXUS: Aave Supply modal closed");
        (window as any).__nexusAaveModalShown = false;
      }
    }
  });
  
  // Observe the whole page for modal changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Lido integration function
function initializeLidoIntegration() {
  if (!window.location.hostname.includes('lido.fi')) return;
  
  console.log("🔥 NEXUS: Lido integration starting on", window.location.href);
  
  // Function to add the button
  const addUnifiedButton = async () => {
    if (document.getElementById('nexus-lido-unified-eth-btn')) return; // Already added
    
    console.log("🔥 NEXUS: Adding Unified ETH button to Lido");
    
    // Get unified balances
    const unifiedBalances = await fetchUnifiedBalances();
    const ethAsset = unifiedBalances.find((bal: any) => bal.symbol === "ETH");
    
    if (!ethAsset || parseFloat(ethAsset.balance || "0") <= 0) {
      console.log("🔥 NEXUS: No ETH balance found, skipping button");
      return;
    }
    
    // Create unified ETH button
    const unifiedBtn = document.createElement('button');
    unifiedBtn.id = 'nexus-lido-unified-eth-btn';
    unifiedBtn.innerHTML = '🚀 Unified ETH<br><span style="font-size: 11px; opacity: 0.8;">Bridge + Auto Stake</span>';
    unifiedBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 16px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      text-align: center;
      line-height: 1.2;
      min-width: 120px;
    `;
    
    unifiedBtn.addEventListener('mouseenter', () => {
      unifiedBtn.style.transform = 'translateY(-2px) scale(1.05)';
      unifiedBtn.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.4)';
    });
    
    unifiedBtn.addEventListener('mouseleave', () => {
      unifiedBtn.style.transform = 'translateY(0) scale(1)';
      unifiedBtn.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.3)';
    });
    
    unifiedBtn.addEventListener('click', () => {
      openLidoUnifiedEthModal(ethAsset);
    });
    
    document.body.appendChild(unifiedBtn);
    console.log("🔥 NEXUS: Unified ETH button successfully added to Lido!");
  };
  
  // Try to add button immediately
  addUnifiedButton();
  
  // Also set up observer for dynamic content
  const observer = new MutationObserver(() => {
    // Just try to add the button if it's not there
    addUnifiedButton();
  });
  
  if (document.getElementById("root")) {
    observer.observe(document.getElementById("root")!, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  } else {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }
}

// Morpho integration placeholder function
function initializeMorphoIntegration() {
  // Placeholder for Morpho integration
  console.log("🔥 NEXUS: Morpho integration initialized");
}

// Initialize integrations
injectDomModifier();

// Initialize Aave integration after a short delay to ensure DOM is ready
setTimeout(() => {
  initializeAaveIntegration();
}, 1000); // Wait 1 second for page to load

// Initialize Morpho integration after a short delay to ensure DOM is ready
setTimeout(() => {
  initializeMorphoIntegration();
}, 1000); // Wait 1 second for page to load

// Initialize Lido integration after a short delay to ensure DOM is ready
setTimeout(() => {
  initializeLidoIntegration();
}, 1000); // Wait 1 second for page to load
