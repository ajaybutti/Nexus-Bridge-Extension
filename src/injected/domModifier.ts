import { zeroAddress } from "viem";
import { fetchUnifiedBalances } from "./cache";
import { stakeEthWithLido, getStEthBalance } from "./lido-stake";
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

function injectDomModifier() {
  if (document.getElementById("root") || document.documentElement) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(async (mutation) => {
        if (
          mutation.type === "childList" &&
          mutation.addedNodes.length > 0 &&
          mutation.addedNodes[0] instanceof HTMLElement
        ) {
          if (
            (mutation.addedNodes[0] as HTMLElement)?.querySelector(
              asterDexModalDiv
            )
          ) {
            const balanceWrapDiv = document.querySelector(
              asterDexBalanceWrapDiv
            );
            const parentContentDiv = document.querySelector(
              asterDexParentContentDiv
            ) as HTMLElement;
            const modalDiv = document.querySelector(
              asterDexModalDiv
            ) as HTMLElement;
            const unifiedBalanceDiv = balanceWrapDiv!.querySelector(
              asterDexUnifiedBalanceDiv
            ) as HTMLElement;
            const tokenEl = document.querySelector(
              asterDexTokenDiv
            ) as HTMLElement | null;

            if (tokenEl) {
              const observer = new MutationObserver(async () => {
                const tokenText = tokenEl.innerText?.trim();
                if (tokenText) {
                  if (
                    balanceWrapDiv &&
                    parentContentDiv &&
                    modalDiv &&
                    balanceWrapDiv &&
                    unifiedBalanceDiv &&
                    unifiedBalanceDiv.parentNode
                  ) {
                    const unifiedBalances = await fetchUnifiedBalances();

                    const asset = unifiedBalances.find((bal) => {
                      if (!tokenText.startsWith(bal.symbol)) return false;

                      if (bal.symbol === "USDC") {
                        const has999Chain = bal.breakdown?.some(
                          (b) => b.chain.id === 999
                        );
                        if (has999Chain) return false;
                      }

                      return bal.breakdown?.some((b) => {
                        if (
                          b.chain.id === 999 &&
                          b.contractAddress === zeroAddress
                        ) {
                          return false;
                        }

                        return true;
                      });
                    });

                    const assetChain = asset?.breakdown.filter(
                      (token) => Number(token.balance) > 0
                    );

                    if (asset && assetChain) {
                      const balanceWrapperSource =
                        unifiedBalanceDiv?.parentNode as HTMLElement | null;
                      if (balanceWrapperSource) {
                        const sourceButton = balanceWrapperSource.querySelector(
                          "div.text-right.underline.cursor-pointer"
                        ) as HTMLElement | null;
                        if (sourceButton) {
                          sourceButton.remove();
                        }
                      }

                      const text = unifiedBalanceDiv.textContent?.trim() || "";
                      unifiedBalanceDiv.textContent = text.startsWith("Unified")
                        ? text
                        : `Unified ${text}`;
                      const unifiedBalanceWrapper =
                        document.createElement("div");
                      unifiedBalanceWrapper.className = "flex flex-col gap-2";
                      unifiedBalanceDiv.parentNode.insertBefore(
                        unifiedBalanceWrapper,
                        unifiedBalanceDiv
                      );
                      unifiedBalanceWrapper.appendChild(unifiedBalanceDiv);

                      const sourceDiv = document.createElement("div");
                      sourceDiv.className = `${unifiedBalanceDiv.className} text-right underline cursor-pointer`;
                      sourceDiv.textContent = "View Sources";
                      unifiedBalanceWrapper.appendChild(sourceDiv);

                      sourceDiv.addEventListener("click", () => {
                        modalDiv.style.display = "none";

                        const sourceParentDiv = document.createElement("div");
                        sourceParentDiv.className = `${modalDiv.className} p-3 py-4 px-6`;
                        const sourceHeaderRow = document.createElement("div");
                        sourceHeaderRow.className =
                          "flex items-center justify-between mb-4 relative";

                        const sourceBackDiv = document.createElement("div");
                        sourceBackDiv.textContent = "←";
                        sourceBackDiv.className = "cursor-pointer text-white";
                        sourceHeaderRow.appendChild(sourceBackDiv);

                        sourceBackDiv.addEventListener("click", () => {
                          sourceParentDiv.remove();
                          modalDiv.style.display = "block";
                        });

                        const sourceTitleDiv = document.createElement("div");
                        sourceTitleDiv.textContent = "My Sources";
                        sourceTitleDiv.className =
                          "absolute left-1/2 transform -translate-x-1/2 font-semibold text-white";
                        sourceHeaderRow.appendChild(sourceTitleDiv);

                        const sourceCrossDiv = document.createElement("div");
                        sourceCrossDiv.textContent = "X";
                        sourceCrossDiv.className = "cursor-pointer text-white";
                        sourceHeaderRow.appendChild(sourceCrossDiv);
                        const modalWrapDiv = document.querySelector(
                          asterDexModalWrapDiv
                        ) as HTMLElement | null;
                        if (modalWrapDiv) {
                          sourceCrossDiv.addEventListener("click", () => {
                            modalWrapDiv.setAttribute("data-state", "closed");
                            parentContentDiv!.setAttribute(
                              "data-state",
                              "closed"
                            );

                            modalWrapDiv.removeAttribute("style");
                            parentContentDiv.removeAttribute("style");

                            modalWrapDiv.style.setProperty(
                              "display",
                              "none",
                              "important"
                            );
                            parentContentDiv.style.setProperty(
                              "display",
                              "none",
                              "important"
                            );
                            modalWrapDiv.style.setProperty(
                              "pointer-events",
                              "none",
                              "important"
                            );
                            parentContentDiv.style.setProperty(
                              "pointer-events",
                              "none",
                              "important"
                            );

                            document
                              .querySelectorAll<HTMLElement>(
                                "[aria-hidden], [data-aria-hidden]"
                              )
                              .forEach((el) => {
                                el.removeAttribute("aria-hidden");
                                el.removeAttribute("data-aria-hidden");
                              });

                            document
                              .querySelectorAll<HTMLScriptElement>("script")
                              .forEach((script) => {
                                if (
                                  script.textContent?.includes("aria-hidden") ||
                                  script.textContent?.includes(
                                    "data-aria-hidden"
                                  )
                                ) {
                                  script.textContent = script.textContent
                                    .replace(
                                      /aria-hidden\s*=\s*["']true["']/g,
                                      ""
                                    )
                                    .replace(
                                      /data-aria-hidden\s*=\s*["']true["']/g,
                                      ""
                                    );
                                }
                              });
                            document
                              .querySelectorAll<HTMLElement>("*")
                              .forEach((el) => {
                                if (el.style.pointerEvents) {
                                  el.style.removeProperty("pointer-events");
                                }
                              });
                          });
                        }

                        sourceParentDiv.appendChild(sourceHeaderRow);

                        const sourceTokenWrapDiv =
                          document.createElement("div");
                        sourceTokenWrapDiv.className =
                          "flex justify-between items-center gap-4 mb-4";

                        const sourceLeftDiv = document.createElement("div");
                        sourceLeftDiv.className = "flex items-center gap-2";
                        const tokenImg = document.createElement("img");
                        tokenImg.src = asset?.icon!;
                        tokenImg.className = "w-10 h-10 object-cover rounded";
                        const tokenTitle = document.createElement("div");

                        tokenTitle.textContent = `${asset?.symbol}`;
                        sourceLeftDiv.appendChild(tokenImg);
                        sourceLeftDiv.appendChild(tokenTitle);

                        const sourceRightDiv = document.createElement("div");
                        sourceRightDiv.className = "text-right font-medium";
                        sourceRightDiv.textContent = `${
                          parseFloat(asset?.balance!).toFixed(4) || 0
                        } ${asset?.symbol}`;

                        sourceTokenWrapDiv.appendChild(sourceLeftDiv);
                        sourceTokenWrapDiv.appendChild(sourceRightDiv);

                        sourceParentDiv.appendChild(sourceTokenWrapDiv);

                        const chainCountDiv = document.createElement("div");
                        chainCountDiv.textContent = `Across ${
                          assetChain?.length
                        } ${assetChain?.length > 1 ? "Chains" : "Chain"}`;
                        chainCountDiv.className =
                          "text-white mb-4 border-b border-white pb-2";
                        sourceParentDiv.appendChild(chainCountDiv);

                        const chainWrapDiv = document.createElement("div");
                        chainWrapDiv.className = "flex flex-col gap-4";

                        assetChain.forEach((item) => {
                          const chainDiv = document.createElement("div");
                          chainDiv.className =
                            "flex justify-between items-center gap-4";

                          const chainLeftDiv = document.createElement("div");
                          chainLeftDiv.className = "flex items-center gap-2";
                          const chainImg = document.createElement("img");
                          chainImg.src = item.chain.logo;
                          chainImg.className = "w-10 h-10 object-cover rounded";
                          const leftTitle = document.createElement("div");
                          leftTitle.textContent = removeMainnet(
                            item.chain.name
                          );
                          chainLeftDiv.appendChild(chainImg);
                          chainLeftDiv.appendChild(leftTitle);

                          const chainRightDiv = document.createElement("div");
                          chainRightDiv.className = "text-right font-medium";
                          chainRightDiv.textContent = `${parseFloat(
                            item.balance.toString()
                          ).toFixed(4)} ${asset!.symbol}`;

                          chainDiv.appendChild(chainLeftDiv);
                          chainDiv.appendChild(chainRightDiv);

                          chainWrapDiv.appendChild(chainDiv);
                        });

                        sourceParentDiv.appendChild(chainWrapDiv);
                        parentContentDiv.appendChild(sourceParentDiv);
                      });
                    } else {
                      if (unifiedBalanceDiv) {
                        unifiedBalanceDiv.textContent =
                          unifiedBalanceDiv.textContent?.replace(
                            /Unified Balance/,
                            "Balance"
                          );
                      }

                      const unifiedBalanceWrapper =
                        unifiedBalanceDiv?.parentNode as HTMLElement | null;
                      if (unifiedBalanceWrapper) {
                        const sourceButton =
                          unifiedBalanceWrapper.querySelector(
                            "div.text-right.underline.cursor-pointer"
                          ) as HTMLElement | null;
                        if (sourceButton) {
                          sourceButton.remove();
                        }
                      }
                    }
                  }
                }
              });

              observer.observe(tokenEl, {
                characterData: true,
                subtree: true,
                childList: true,
              });
            }
          }

          if (
            (mutation.addedNodes[0] as HTMLElement)?.matches(
              liminalModalWrapDiv
            )
          ) {
            const balanceWrapDiv = document.querySelector(
              liminalBalanceWrapDiv
            ) as HTMLElement | null;
            const tokenWrapDiv = document.querySelector(liminalTokenWrapDiv);

            if (tokenWrapDiv) {
              const tokenEl = tokenWrapDiv.querySelector("span");
              const unifiedBalances = await fetchUnifiedBalances();
              const tokenText = tokenEl!.textContent?.trim();
              const chainTextEl =
                tokenWrapDiv.querySelector(liminalChainWrapDiv);
              const chainText =
                chainTextEl!.textContent?.trim().replace(/^on\s+/, "") || "";

              const asset = unifiedBalances.find(
                (bal) =>
                  bal.symbol !== "USDC" &&
                  tokenText.startsWith(bal.symbol) &&
                  bal.breakdown?.some(
                    (b) =>
                      b.contractAddress !== zeroAddress &&
                      b.chain.name === getChainName(chainText)
                  )
              );
              const assetChain = asset?.breakdown.filter(
                (token) => Number(token.balance) > 0
              );

              if (assetChain) {
                if (balanceWrapDiv && balanceWrapDiv.textContent) {
                  const el = balanceWrapDiv as HTMLElement;

                  let text = (el.textContent || "").trim();
                  text = text.replace(/^(?:Unified\s*)+Balance/, "Balance");
                  text = text.replace(/\bBalance\b/, "Unified Balance");
                  if (text === "Balance") text = "Unified Balance";
                  if (el.textContent !== text) el.textContent = text;

                  if (!el.dataset.unifiedObserverAttached) {
                    el.dataset.unifiedObserverAttached = "1";
                    const nodeObserver = new MutationObserver((mutations) => {
                      const cur = (el.textContent || "").trim();
                      const desired = cur
                        .replace(/^(?:Unified\s*)+Balance/, "Balance")
                        .replace(/\bBalance\b/, "Unified Balance");
                      const final =
                        desired === "Balance" ? "Unified Balance" : desired;
                      if (cur !== final) {
                        el.textContent = final;
                      }
                    });
                    nodeObserver.observe(el, {
                      characterData: true,
                      childList: true,
                      subtree: true,
                    });

                    (el as any).__unifiedNodeObserver = nodeObserver;
                  }

                  const parent = (el.parentElement ||
                    el.parentNode) as HTMLElement | null;
                  if (parent && !parent.dataset.unifiedParentObserver) {
                    parent.dataset.unifiedParentObserver = "1";

                    const parentObserver = new MutationObserver((mutations) => {
                      for (const m of mutations) {
                        if (m.type === "childList") {
                          const candidate = parent.querySelector(
                            ".flex.items-center.gap-1"
                          ) as HTMLElement | null;
                          if (!candidate) continue;

                          const cur = (candidate.textContent || "").trim();
                          const desired = cur
                            .replace(/^(?:Unified\s*)+Balance/, "Balance")
                            .replace(/\bBalance\b/, "Unified Balance");
                          const final =
                            desired === "Balance" ? "Unified Balance" : desired;
                          if (candidate.textContent !== final)
                            candidate.textContent = final;

                          if (!candidate.dataset.unifiedObserverAttached) {
                            candidate.dataset.unifiedObserverAttached = "1";
                            const obs = new MutationObserver(() => {
                              const c = (candidate.textContent || "").trim();
                              const d = c
                                .replace(/^(?:Unified\s*)+Balance/, "Balance")
                                .replace(/\bBalance\b/, "Unified Balance");
                              const f = d === "Balance" ? "Unified Balance" : d;
                              if (candidate.textContent !== f)
                                candidate.textContent = f;
                            });
                            obs.observe(candidate, {
                              characterData: true,
                              childList: true,
                              subtree: true,
                            });
                            (candidate as any).__unifiedNodeObserver = obs;
                          }
                        }
                      }
                    });

                    parentObserver.observe(parent, {
                      childList: true,
                      subtree: true,
                    });
                    (parent as any).__unifiedParentObserver = parentObserver;
                  }
                }

                const currentSymbols = (assetChain || [])
                  .map((t: any) => t.symbol)
                  .sort();

                if (
                  balanceWrapDiv &&
                  JSON.stringify(currentSymbols) !==
                    JSON.stringify(prevAssetSymbols)
                ) {
                  const parent = balanceWrapDiv.parentNode as HTMLElement;
                  parent
                    .querySelectorAll(".custom-unified-btn")
                    .forEach((btn) => btn.remove());

                  prevAssetSymbols = currentSymbols;
                  const unifiedBalanceWrapper = document.createElement("div");
                  unifiedBalanceWrapper.className = "flex flex-col gap-2";
                  balanceWrapDiv.parentNode!.insertBefore(
                    unifiedBalanceWrapper,
                    balanceWrapDiv
                  );
                  unifiedBalanceWrapper.appendChild(balanceWrapDiv);

                  const sourceDiv = document.createElement("div");
                  sourceDiv.className = `${balanceWrapDiv.className} text-right underline cursor-pointer custom-unified-btn`;
                  sourceDiv.textContent = "View Sources";
                  unifiedBalanceWrapper.appendChild(sourceDiv);

                  sourceDiv.addEventListener("click", () => {
                    let backdrop = document.getElementById(
                      "custom-unified-modal"
                    );
                    if (backdrop) backdrop.remove();

                    backdrop = document.createElement("div");
                    backdrop.className =
                      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
                    backdrop.id = "custom-unified-modal";

                    const modal = document.createElement("div");
                    modal.style.backgroundColor = "rgb(47,47,47)";
                    modal.className =
                      "rounded-lg shadow-lg relative text-white";

                    const sourceParentDiv = document.createElement("div");
                    sourceParentDiv.className = `w-[400px] p-3 py-4 px-6`;

                    const sourceHeaderRow = document.createElement("div");
                    sourceHeaderRow.className =
                      "flex items-center justify-end mb-4 relative";

                    const modalTitle = document.createElement("div");
                    modalTitle.textContent = "My Sources";
                    modalTitle.className =
                      "absolute left-1/2 transform -translate-x-1/2 font-semibold text-white";
                    sourceHeaderRow.appendChild(modalTitle);
                    const closeBtn = document.createElement("button");
                    closeBtn.innerHTML = "X";
                    closeBtn.className = "cursor-pointer text-white";
                    closeBtn.onclick = () => backdrop!.remove();
                    sourceHeaderRow.appendChild(closeBtn);
                    sourceParentDiv.appendChild(sourceHeaderRow);

                    const sourceTokenWrapDiv = document.createElement("div");
                    sourceTokenWrapDiv.className =
                      "flex justify-between items-center gap-4 mb-4";

                    const sourceLeftDiv = document.createElement("div");
                    sourceLeftDiv.className = "flex items-center gap-2";
                    const tokenImg = document.createElement("img");
                    tokenImg.src = asset?.icon!;
                    tokenImg.className = "w-10 h-10 object-cover rounded";
                    const tokenTitle = document.createElement("div");

                    tokenTitle.textContent = `${asset?.symbol}`;
                    sourceLeftDiv.appendChild(tokenImg);
                    sourceLeftDiv.appendChild(tokenTitle);

                    const sourceRightDiv = document.createElement("div");
                    sourceRightDiv.className = "text-right font-medium";
                    sourceRightDiv.textContent = `${
                      parseFloat(asset?.balance!).toFixed(2) || 0
                    } ${asset?.symbol}`;

                    sourceTokenWrapDiv.appendChild(sourceLeftDiv);
                    sourceTokenWrapDiv.appendChild(sourceRightDiv);

                    sourceParentDiv.appendChild(sourceTokenWrapDiv);

                    const chainCountDiv = document.createElement("div");
                    chainCountDiv.textContent = `Across ${assetChain?.length} ${
                      assetChain?.length > 1 ? "Chains" : "Chain"
                    }`;
                    chainCountDiv.className =
                      "text-white mb-4 border-b border-white pb-2";
                    sourceParentDiv.appendChild(chainCountDiv);

                    const chainWrapDiv = document.createElement("div");
                    chainWrapDiv.className = "flex flex-col gap-4";

                    assetChain.forEach((item) => {
                      const chainDiv = document.createElement("div");
                      chainDiv.className =
                        "flex justify-between items-center gap-4";

                      const chainLeftDiv = document.createElement("div");
                      chainLeftDiv.className = "flex items-center gap-2";
                      const chainImg = document.createElement("img");
                      chainImg.src = item.chain.logo;
                      chainImg.className = "w-10 h-10 object-cover rounded";
                      const leftTitle = document.createElement("div");
                      leftTitle.textContent = removeMainnet(item.chain.name);
                      chainLeftDiv.appendChild(chainImg);
                      chainLeftDiv.appendChild(leftTitle);

                      const chainRightDiv = document.createElement("div");
                      chainRightDiv.className = "text-right font-medium";
                      chainRightDiv.textContent = `${parseFloat(
                        item.balance.toString()
                      ).toFixed(2)} ${asset!.symbol}`;

                      chainDiv.appendChild(chainLeftDiv);
                      chainDiv.appendChild(chainRightDiv);

                      chainWrapDiv.appendChild(chainDiv);
                    });

                    sourceParentDiv.appendChild(chainWrapDiv);
                    parentContentDiv.appendChild(sourceParentDiv);
                  });
                } else {
                  if (unifiedBalanceDiv) {
                    unifiedBalanceDiv.textContent =
                      unifiedBalanceDiv.textContent?.replace(
                        /Unified Balance/,
                        "Balance"
                      );
                  }

                  const unifiedBalanceWrapper =
                    unifiedBalanceDiv?.parentNode as HTMLElement | null;
                  if (unifiedBalanceWrapper) {
                    const sourceButton =
                      unifiedBalanceWrapper.querySelector(
                        "div.text-right.underline.cursor-pointer"
                      ) as HTMLElement | null;
                    if (sourceButton) {
                      sourceButton.remove();
                    }
                  }
                }
              }
            });

            observer.observe(tokenEl, {
              characterData: true,
              subtree: true,
              childList: true,
            });
          }
        }

        if (
          (mutation.addedNodes[0] as HTMLElement)?.matches(
            liminalModalWrapDiv
          )
        ) {
          const balanceWrapDiv = document.querySelector(
            liminalBalanceWrapDiv
          ) as HTMLElement | null;
          const tokenWrapDiv = document.querySelector(liminalTokenWrapDiv);

          if (tokenWrapDiv) {
            const tokenEl = tokenWrapDiv.querySelector("span");
            const unifiedBalances = await fetchUnifiedBalances();
            const tokenText = tokenEl!.textContent?.trim();
            const chainTextEl =
              tokenWrapDiv.querySelector(liminalChainWrapDiv);
            const chainText =
              chainTextEl!.textContent?.trim().replace(/^on\s+/, "") || "";

            const asset = unifiedBalances.find(
              (bal) =>
                bal.symbol !== "USDC" &&
                tokenText.startsWith(bal.symbol) &&
                bal.breakdown?.some(
                  (b) =>
                    b.contractAddress !== zeroAddress &&
                    b.chain.name === getChainName(chainText)
                )
            );
            const assetChain = asset?.breakdown.filter(
              (token) => Number(token.balance) > 0
            );

            if (assetChain) {
              if (balanceWrapDiv && balanceWrapDiv.textContent) {
                const el = balanceWrapDiv as HTMLElement;

                let text = (el.textContent || "").trim();
                text = text.replace(/^(?:Unified\s*)+Balance/, "Balance");
                text = text.replace(/\bBalance\b/, "Unified Balance");
                if (text === "Balance") text = "Unified Balance";
                if (el.textContent !== text) el.textContent = text;

                if (!el.dataset.unifiedObserverAttached) {
                  el.dataset.unifiedObserverAttached = "1";
                  const nodeObserver = new MutationObserver((mutations) => {
                    const cur = (el.textContent || "").trim();
                    const desired = cur
                      .replace(/^(?:Unified\s*)+Balance/, "Balance")
                      .replace(/\bBalance\b/, "Unified Balance");
                    const final =
                      desired === "Balance" ? "Unified Balance" : desired;
                    if (cur !== final) {
                      el.textContent = final;
                    }
                  });
                  nodeObserver.observe(el, {
                    characterData: true,
                    childList: true,
                    subtree: true,
                  });

                  (el as any).__unifiedNodeObserver = nodeObserver;
                }

                const parent = (el.parentElement ||
                  el.parentNode) as HTMLElement | null;
                if (parent && !parent.dataset.unifiedParentObserver) {
                  parent.dataset.unifiedParentObserver = "1";

                  const parentObserver = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                      if (m.type === "childList") {
                        const candidate = parent.querySelector(
                          ".flex.items-center.gap-1"
                        ) as HTMLElement | null;
                        if (!candidate) continue;

                        const cur = (candidate.textContent || "").trim();
                        const desired = cur
                          .replace(/^(?:Unified\s*)+Balance/, "Balance")
                          .replace(/\bBalance\b/, "Unified Balance");
                        const final =
                          desired === "Balance" ? "Unified Balance" : desired;
                        if (candidate.textContent !== final)
                          candidate.textContent = final;

                        if (!candidate.dataset.unifiedObserverAttached) {
                          candidate.dataset.unifiedObserverAttached = "1";
                          const obs = new MutationObserver(() => {
                            const c = (candidate.textContent || "").trim();
                            const d = c
                              .replace(/^(?:Unified\s*)+Balance/, "Balance")
                              .replace(/\bBalance\b/, "Unified Balance");
                            const f = d === "Balance" ? "Unified Balance" : d;
                            if (candidate.textContent !== f)
                              candidate.textContent = f;
                          });
                          obs.observe(candidate, {
                            characterData: true,
                            childList: true,
                            subtree: true,
                          });
                          (candidate as any).__unifiedNodeObserver = obs;
                        }
                      }
                    }
                  });

                  parentObserver.observe(parent, {
                    childList: true,
                    subtree: true,
                  });
                  (parent as any).__unifiedParentObserver = parentObserver;
                }
              }

              const currentSymbols = (assetChain || [])
                .map((t: any) => t.symbol)
                .sort();

              if (
                balanceWrapDiv &&
                JSON.stringify(currentSymbols) !==
                  JSON.stringify(prevAssetSymbols)
              ) {
                const parent = balanceWrapDiv.parentNode as HTMLElement;
                parent
                  .querySelectorAll(".custom-unified-btn")
                  .forEach((btn) => btn.remove());

                prevAssetSymbols = currentSymbols;
                const unifiedBalanceWrapper = document.createElement("div");
                unifiedBalanceWrapper.className = "flex flex-col gap-2";
                balanceWrapDiv.parentNode!.insertBefore(
                  unifiedBalanceWrapper,
                  balanceWrapDiv
                );
                unifiedBalanceWrapper.appendChild(balanceWrapDiv);

                const sourceDiv = document.createElement("div");
                sourceDiv.className = `${balanceWrapDiv.className} text-right underline cursor-pointer custom-unified-btn`;
                sourceDiv.textContent = "View Sources";
                unifiedBalanceWrapper.appendChild(sourceDiv);

                sourceDiv.addEventListener("click", () => {
                  let backdrop = document.getElementById(
                    "custom-unified-modal"
                  );
                  if (backdrop) backdrop.remove();

                  backdrop = document.createElement("div");
                  backdrop.className =
                    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
                  backdrop.id = "custom-unified-modal";

                  const modal = document.createElement("div");
                  modal.style.backgroundColor = "rgb(47,47,47)";
                  modal.className =
                    "rounded-lg shadow-lg relative text-white";

                  const sourceParentDiv = document.createElement("div");
                  sourceParentDiv.className = `w-[400px] p-3 py-4 px-6`;

                  const sourceHeaderRow = document.createElement("div");
                  sourceHeaderRow.className =
                    "flex items-center justify-end mb-4 relative";

                  const modalTitle = document.createElement("div");
                  modalTitle.textContent = "My Sources";
                  modalTitle.className =
                    "absolute left-1/2 transform -translate-x-1/2 font-semibold text-white";
                  sourceHeaderRow.appendChild(modalTitle);
                  const closeBtn = document.createElement("button");
                  closeBtn.innerHTML = "X";
                  closeBtn.className = "cursor-pointer text-white";
                  closeBtn.onclick = () => backdrop!.remove();
                  sourceHeaderRow.appendChild(closeBtn);
                  sourceParentDiv.appendChild(sourceHeaderRow);

                  const sourceTokenWrapDiv = document.createElement("div");
                  sourceTokenWrapDiv.className =
                    "flex justify-between items-center gap-4 mb-4";

                  const sourceLeftDiv = document.createElement("div");
                  sourceLeftDiv.className = "flex items-center gap-2";
                  const tokenImg = document.createElement("img");
                  tokenImg.src = asset?.icon!;
                  tokenImg.className = "w-10 h-10 object-cover rounded";
                  const tokenTitle = document.createElement("div");

                  tokenTitle.textContent = `${asset?.symbol}`;
                  sourceLeftDiv.appendChild(tokenImg);
                  sourceLeftDiv.appendChild(tokenTitle);

                  const sourceRightDiv = document.createElement("div");
                  sourceRightDiv.className = "text-right font-medium";
                  sourceRightDiv.textContent = `${
                    parseFloat(asset?.balance!).toFixed(2) || 0
                  } ${asset?.symbol}`;

                  sourceTokenWrapDiv.appendChild(sourceLeftDiv);
                  sourceTokenWrapDiv.appendChild(sourceRightDiv);

                  sourceParentDiv.appendChild(sourceTokenWrapDiv);

                  const chainCountDiv = document.createElement("div");
                  chainCountDiv.textContent = `Across ${assetChain?.length} ${
                    assetChain?.length > 1 ? "Chains" : "Chain"
                  }`;
                  chainCountDiv.className =
                    "text-white mb-4 border-b border-white pb-2";
                  sourceParentDiv.appendChild(chainCountDiv);

                  const chainWrapDiv = document.createElement("div");
                  chainWrapDiv.className = "flex flex-col gap-4";

                  assetChain.forEach((item) => {
                    const chainDiv = document.createElement("div");
                    chainDiv.className =
                      "flex justify-between items-center gap-4";

                    const chainLeftDiv = document.createElement("div");
                    chainLeftDiv.className = "flex items-center gap-2";
                    const chainImg = document.createElement("img");
                    chainImg.src = item.chain.logo;
                    chainImg.className = "w-10 h-10 object-cover rounded";
                    const leftTitle = document.createElement("div");
                    leftTitle.textContent = removeMainnet(item.chain.name);
                    chainLeftDiv.appendChild(chainImg);
                    chainLeftDiv.appendChild(leftTitle);

                    const chainRightDiv = document.createElement("div");
                    chainRightDiv.className = "text-right font-medium";
                    chainRightDiv.textContent = `${parseFloat(
                      item.balance.toString()
                    ).toFixed(2)} ${asset!.symbol}`;

                    chainDiv.appendChild(chainLeftDiv);
                    chainDiv.appendChild(chainRightDiv);

                    chainWrapDiv.appendChild(chainDiv);
                  });

                  sourceParentDiv.appendChild(chainWrapDiv);
                  parentContentDiv.appendChild(sourceParentDiv);
                });
              } else {
                if (unifiedBalanceDiv) {
                  unifiedBalanceDiv.textContent =
                    unifiedBalanceDiv.textContent?.replace(
                      /Unified Balance/,
                      "Balance"
                    );
                }

                const unifiedBalanceWrapper =
                  unifiedBalanceDiv?.parentNode as HTMLElement | null;
                if (unifiedBalanceWrapper) {
                  const sourceButton =
                    unifiedBalanceWrapper.querySelector(
                      "div.text-right.underline.cursor-pointer"
                    ) as HTMLElement | null;
                  if (sourceButton) {
                    sourceButton.remove();
                  }
                }
              }
            }
          });

          observer.observe(tokenEl, {
            characterData: true,
            subtree: true,
            childList: true,
          });
        }
      });

      if ((mutation.addedNodes[0] as HTMLElement)?.matches(dropdownNode)) {
        const element = mutation.addedNodes[0] as HTMLElement;

        if (element.innerHTML.includes("Arbitrum")) {
          for (
            let i = 0;
            i < element.children[0].children[0].children.length;
            i++
          ) {
            const child = element.children[0].children[0].children[
              i
            ] as HTMLElement;
            if (!child.innerHTML.includes("Arbitrum")) {
              hideElement(child);
            }
          }
        } else if (element.innerHTML.includes("USDC")) {
          for (
            let i = 0;
            i < element.children[0].children[0].children.length;
            i++
          ) {
            const child = element.children[0].children[0].children[
              i
            ] as HTMLElement;
            if (child.innerText !== "USDC" && child.innerText !== "USDT") {
              hideElement(child);
            }
          }
        }
      }

      if (
        (mutation.addedNodes[0] as HTMLElement)?.querySelector(titleNode)
      ) {
        const node = (mutation.addedNodes[0] as HTMLElement).querySelector(
          titleNode
        )!;

        node.innerHTML = node.innerHTML.replace(
          " from Arbitrum",
          " from <span style='text-decoration: line-through; text-decoration-thickness: 4px;'>Arbitrum</span> Everywhere"
        );
      }

      if (
        (mutation.addedNodes[0] as HTMLElement)?.querySelector(
          dropdownParentNode
        )
      ) {
        const nodes = (
          mutation.addedNodes[0] as HTMLElement
        ).querySelectorAll(dropdownParentNode);

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
        console.log("� NEXUS: Detected Lido domain, initializing unified ETH integration...");
        
        // Check if unified button already exists
        if (!document.querySelector('.nexus-lido-unified-button')) {
          // Get unified balances
          const unifiedBalances = await fetchUnifiedBalances();
          
          // Find ETH across all chains
          const ethAsset = unifiedBalances.find((bal: any) => bal.symbol === "ETH");
          
          if (ethAsset && parseFloat(ethAsset.balance || "0") > 0) {
            console.log("� NEXUS: Creating unified ETH button for Lido");
            
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

// Function to open unified ETH stake modal
function openUnifiedEthStakeModal(totalEthBalance: number, ethChains: any[]) {
  console.log("🚀 NEXUS: Opening unified ETH stake modal");
  
  // Remove existing modal if present
  const existingModal = document.querySelector('.nexus-stake-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'nexus-stake-modal';
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
      <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 24px; font-weight: 600;">🌐 Stake with Unified ETH</h2>
      <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">Enter amount to stake from all your chains</p>
    </div>
    
    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-weight: 600; color: #fff;">Available Balance</span>
        <span style="font-weight: bold; color: #00ff88; font-size: 18px;">${totalEthBalance.toFixed(4)} ETH</span>
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.8);">
        ${ethChains.map((chain: any) => `
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>${removeMainnet(chain.chain.name)}</span>
            <span style="color: #ffeb3b; font-weight: 600;">${parseFloat(chain.balance).toFixed(4)} ETH</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 600;">ETH Amount to Stake</label>
      <input 
        type="number" 
        id="eth-amount-input" 
        placeholder="0.1"
        step="0.0001"
        max="${totalEthBalance}"
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
        Min: 0.0001 ETH • Max: ${totalEthBalance.toFixed(4)} ETH
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

  // Get input element
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

  // Bridge + Stake button handler
  bridgeStakeBtn.addEventListener('click', async () => {
    const stakeAmount = parseFloat(ethAmountInput.value || '0');
    
    if (!stakeAmount || stakeAmount <= 0) {
      alert('Please enter a valid ETH amount');
      return;
    }

    if (stakeAmount > totalEthBalance) {
      alert(`Amount exceeds your total ETH balance of ${totalEthBalance.toFixed(4)} ETH`);
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
                  🚀 Awesome! Close
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

// Lido unified ETH modal function
function openLidoUnifiedEthModal(ethAsset: any) {
  console.log("🔥 NEXUS: Opening Lido unified ETH modal");
  
  const totalEth = parseFloat(ethAsset.balance || "0");
  const ethChains = ethAsset.breakdown.filter((token: any) => Number(token.balance) > 0);
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
                  🚀 Awesome! Close
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

// Lido integration function
function initializeLidoIntegration() {
  if (!window.location.hostname.includes('lido.fi')) return;
  
  console.log("🔥 NEXUS: Lido integration starting on", window.location.href);
  
  // Function to add the button
  const addUnifiedButton = () => {
    if (document.getElementById('nexus-lido-unified-eth-btn')) return; // Already added
    
    console.log("🔥 NEXUS: Adding Unified ETH button to Lido");
    
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
      // Create a simple ethAsset object for the unified ETH modal
      const ethAsset = {
        balance: "0",
        breakdown: [
          {
            chain: { name: "Ethereum" },
            balance: "0"
          }
        ]
      };
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
