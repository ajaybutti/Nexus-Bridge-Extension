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

                    modal.appendChild(sourceParentDiv);
                    backdrop.appendChild(modal);

                    document.body.appendChild(backdrop);
                  });
                }
              } else {
                if (balanceWrapDiv) {
                  const el = balanceWrapDiv as HTMLElement;

                  if ((el as any).__unifiedNodeObserver) {
                    (el as any).__unifiedNodeObserver.disconnect();
                    delete (el as any).__unifiedNodeObserver;
                  }

                  if (el.hasAttribute("data-unified-observer-attached")) {
                    el.removeAttribute("data-unified-observer-attached");
                  }

                  const parent = el.parentElement as HTMLElement;
                  if (parent && (parent as any).__unifiedParentObserver) {
                    (parent as any).__unifiedParentObserver.disconnect();
                    delete (parent as any).__unifiedParentObserver;
                    delete parent.dataset.unifiedParentObserver;
                  }

                  parent
                    ?.querySelectorAll(".custom-unified-btn")
                    .forEach((btn) => btn.remove());

                  const wrapper = el.closest(".flex.flex-col.gap-2");
                  if (wrapper && wrapper.parentNode) {
                    const grandParent = wrapper.parentNode as HTMLElement;
                    while (wrapper.firstChild) {
                      grandParent.insertBefore(wrapper.firstChild, wrapper);
                    }
                    grandParent.removeChild(wrapper);
                  }

                  let text = (el.textContent || "").trim();
                  text = text.replace(/^(?:Unified\s*)+Balance/, "Balance");
                  text = text.replace(/\bBalance\b/, "Balance");
                  if (text === "Balance") text = "Balance";
                  if (el.textContent !== text) el.textContent = text;
                }
              }
            }
          }

          if (
            (mutation.addedNodes[0] as HTMLElement)?.querySelector(
              fellixModalDiv
            )
          ) {
            const balanceWrapDiv = document.querySelector(fellixBalanceWrapDiv);

            const parentContentDiv = document.querySelector(
              fellixParentContentDiv
            ) as HTMLElement;
            const modalDiv = document.querySelector(
              fellixModalDiv
            ) as HTMLElement;
            const unifiedBalanceDiv = balanceWrapDiv!.querySelector(
              fellixUnifiedBalanceDiv
            ) as HTMLElement;
            const tokenEl = document.querySelector(
              fellixTokenDiv
            ) as HTMLElement;

            if (
              balanceWrapDiv &&
              parentContentDiv &&
              modalDiv &&
              balanceWrapDiv &&
              unifiedBalanceDiv &&
              unifiedBalanceDiv.parentNode
            ) {
              const unifiedBalances = await fetchUnifiedBalances();
              const tokenMatchArray = tokenEl.textContent.match(/^[A-Z0-9]+/);
              const tokenText = tokenMatchArray ? tokenMatchArray[0] : "";

              const asset = unifiedBalances.find(
                (bal) =>
                  bal.symbol !== "USDC" &&
                  tokenText.startsWith(bal.symbol) &&
                  bal.breakdown?.some((b) => b.contractAddress !== zeroAddress)
              );
              const assetChain = asset?.breakdown.filter(
                (token) => Number(token.balance) > 0
              );

              if (asset && assetChain) {
                unifiedBalanceDiv.textContent =
                  unifiedBalanceDiv.textContent?.replace(
                    "Available",
                    "Unified Balance"
                  );
                const unifiedBalanceWrapper = document.createElement("div");
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
                    fellixModalWrapDiv
                  ) as HTMLElement | null;
                  if (modalWrapDiv) {
                    sourceCrossDiv.addEventListener("click", () => {
                      modalWrapDiv.setAttribute("data-state", "closed");
                      parentContentDiv!.setAttribute("data-state", "closed");

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
                            script.textContent?.includes("data-aria-hidden")
                          ) {
                            script.textContent = script.textContent
                              .replace(/aria-hidden\s*=\s*["']true["']/g, "")
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
              }
            }
          }

          if ((mutation.addedNodes[0] as HTMLElement).matches(dropdownNode)) {
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

          // Lido Staking Integration - ONLY on Lido website
          if (
            window.location.hostname.includes("lido.fi") || 
            window.location.hostname.includes("stake.lido")
          ) {
            // Debug: Log that we're on Lido
            console.log("🔍 NEXUS: Detected Lido domain, checking for UI elements...");
            
            // Look for various Lido UI elements - Fixed selector
            const stakeButton = document.querySelector('button[data-testid*="stake"], button[class*="stake"], button') as HTMLElement;
            const ethAmountInput = document.querySelector('input[placeholder*="ETH"], input[type="number"], input') as HTMLInputElement;
            const balanceArea = document.querySelector('[class*="balance"], [data-testid*="balance"]') as HTMLElement;
            const mainContainer = document.querySelector('[class*="container"], [class*="content"], main, body') as HTMLElement;
            
            console.log("🔍 NEXUS: Found elements:", {
              stakeButton: !!stakeButton,
              ethAmountInput: !!ethAmountInput,
              balanceArea: !!balanceArea,
              mainContainer: !!mainContainer
            });
            
            if (ethAmountInput || balanceArea || mainContainer || true) { // Always try to inject
              const unifiedBalances = await fetchUnifiedBalances();
              
              console.log("🔍 NEXUS: Unified balances fetched:", unifiedBalances);
              
              // Find ETH balance across all chains
              const ethAsset = unifiedBalances.find((bal: any) =>
                bal.symbol === "ETH" && 
                bal.breakdown?.some((b: any) => 
                  b.contractAddress === "0x0000000000000000000000000000000000000000"
                )
              );

              if (ethAsset) {
                const totalEthBalance = parseFloat(ethAsset.balance || "0");
                const ethChains = ethAsset.breakdown.filter((token: any) => 
                  Number(token.balance) > 0
                );

                console.log("🔍 NEXUS: ETH asset found:", {
                  totalBalance: totalEthBalance,
                  chainsWithBalance: ethChains.length,
                  chains: ethChains.map((c: any) => ({ chain: c.chain.name, balance: c.balance }))
                });

                // Create or update unified balance display
                let unifiedBalanceDiv = document.querySelector('.nexus-unified-eth-balance') as HTMLElement;
                
                if (!unifiedBalanceDiv) {
                  unifiedBalanceDiv = document.createElement('div');
                  unifiedBalanceDiv.className = 'nexus-unified-eth-balance';
                  unifiedBalanceDiv.style.cssText = `
                    position: fixed;
                    top: 120px;
                    right: 20px;
                    width: 300px;
                    padding: 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    font-size: 14px;
                    color: white;
                    z-index: 10000;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                  `;

                  document.body.appendChild(unifiedBalanceDiv);
                }

                if (unifiedBalanceDiv && totalEthBalance > 0) {
                  unifiedBalanceDiv.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                      <span style="font-weight: 600; color: #fff; font-size: 16px;">🌐 Unified ETH</span>
                      <span style="font-weight: bold; color: #ffeb3b; font-size: 18px;">${totalEthBalance.toFixed(4)} ETH</span>
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.9); line-height: 1.4;">
                      <div style="margin-bottom: 8px;">Available across ${ethChains.length} ${ethChains.length === 1 ? 'chain' : 'chains'}:</div>
                      ${ethChains.map((chain: any) => `
                        <div style="margin: 6px 0; display: flex; justify-content: space-between; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px;">
                          <span style="font-weight: 500;">${removeMainnet(chain.chain.name)}</span>
                          <span style="color: #ffeb3b; font-weight: 600;">${parseFloat(chain.balance).toFixed(4)} ETH</span>
                        </div>
                      `).join('')}
                      <div style="margin-top: 12px; padding: 8px; background: rgba(0,163,255,0.2); border-radius: 6px; font-size: 11px; text-align: center;">
                        💡 Nexus will automatically bridge ETH from other chains when you stake
                      </div>
                      <button id="nexus-stake-eth-btn" style="
                        width: 100%;
                        margin-top: 12px;
                        padding: 10px;
                        background: linear-gradient(45deg, #00ff88, #00d4ff);
                        border: none;
                        border-radius: 8px;
                        color: #000;
                        font-weight: bold;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        🚀 Stake with Unified ETH
                      </button>
                      <div style="margin-top: 8px; padding: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; font-size: 10px;">
                        🔍 Debug: Wallet = ${(window as any).ethereum?.selectedAddress || 'None'}
                      </div>
                    </div>
                  `;
                  
                  // Add click handler for the stake button
                  const stakeButton = unifiedBalanceDiv.querySelector('#nexus-stake-eth-btn') as HTMLButtonElement;
                  if (stakeButton) {
                    stakeButton.addEventListener('click', () => {
                      openUnifiedEthStakeModal(totalEthBalance, ethChains);
                    });
                  }
                } else if (unifiedBalanceDiv && totalEthBalance === 0) {
                  // Show debug info even with zero balance
                  unifiedBalanceDiv.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                      <span style="font-weight: 600; color: #fff; font-size: 16px;">🌐 Nexus Debug</span>
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.9); line-height: 1.4;">
                      <div style="margin: 6px 0; padding: 4px 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                        Wallet: ${(window as any).ethereum?.selectedAddress || 'None detected'}
                      </div>
                      <div style="margin: 6px 0; padding: 4px 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                        ETH Balance: ${totalEthBalance} ETH
                      </div>
                    </div>
                  `;
                  unifiedBalanceDiv.style.display = 'block';
                }
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
            <span style="color: #ffeb3b;">${parseFloat(chain.balance).toFixed(4)} ETH</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #fff;">
        ETH Amount to Stake
      </label>
      <div style="position: relative;">
        <input type="text" inputmode="decimal" id="nexus-eth-amount" placeholder="0.0" 
               autocomplete="off"
               spellcheck="false"
               style="
                 width: 100%;
                 padding: 16px 50px 16px 16px;
                 background: rgba(255,255,255,0.1);
                 border: 2px solid rgba(255,255,255,0.2);
                 border-radius: 12px;
                 color: white;
                 font-size: 18px;
                 font-weight: 600;
                 outline: none;
                 transition: all 0.3s ease;
                 box-sizing: border-box;
                 pointer-events: auto;
                 user-select: auto;
                 -webkit-user-select: auto;
                 cursor: text;
               ">
        <span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.6); font-weight: 600; pointer-events: none;">ETH</span>
      </div>
      <button id="nexus-max-btn" style="
        margin-top: 8px;
        padding: 6px 12px;
        background: rgba(0,255,136,0.2);
        border: 1px solid #00ff88;
        border-radius: 6px;
        color: #00ff88;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(0,255,136,0.3)'" onmouseout="this.style.background='rgba(0,255,136,0.2)'">
        MAX: ${totalEthBalance.toFixed(4)} ETH
      </button>
    </div>
    
    <div style="display: flex; gap: 12px;">
      <button id="nexus-cancel-btn" style="
        flex: 1;
        padding: 14px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 10px;
        color: white;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
        Cancel
      </button>
      <button id="nexus-confirm-btn" style="
        flex: 2;
        padding: 14px;
        background: linear-gradient(45deg, #00ff88, #00d4ff);
        border: none;
        border-radius: 10px;
        color: #000;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        🚀 Stake with Unified ETH
      </button>
    </div>
    
    <div style="margin-top: 16px; padding: 12px; background: rgba(0,163,255,0.1); border-radius: 8px; font-size: 12px; text-align: center; color: rgba(255,255,255,0.8);">
      💡 Nexus will bridge ETH from multiple chains and automatically stake on Lido
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Add event listeners
  const ethAmountInput = modalOverlay.querySelector('#nexus-eth-amount') as HTMLInputElement;
  const maxBtn = modalOverlay.querySelector('#nexus-max-btn') as HTMLButtonElement;
  const cancelBtn = modalOverlay.querySelector('#nexus-cancel-btn') as HTMLButtonElement;
  const confirmBtn = modalOverlay.querySelector('#nexus-confirm-btn') as HTMLButtonElement;
  
  // Ensure the input field is fully interactive
  ethAmountInput.addEventListener('focus', (e) => {
    e.stopPropagation();
    ethAmountInput.style.borderColor = '#00ff88';
    console.log("🎯 NEXUS: ETH input focused");
  });
  
  ethAmountInput.addEventListener('blur', (e) => {
    e.stopPropagation();
    ethAmountInput.style.borderColor = 'rgba(255,255,255,0.2)';
  });
  
  // Input validation - only allow numbers and decimal point
  ethAmountInput.addEventListener('input', (e) => {
    e.stopPropagation();
    console.log("⌨️ NEXUS: ETH input event fired!");
    const input = e.target as HTMLInputElement;
    // Remove any non-numeric characters except decimal point
    let value = input.value.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    input.value = value;
    console.log("⌨️ NEXUS: ETH input value changed to:", value);
  });
  
  // Ensure input is clickable and focusable
  ethAmountInput.addEventListener('click', (e) => {
    e.stopPropagation();
    ethAmountInput.focus();
    console.log("🖱️ NEXUS: ETH input clicked and focused");
  });
  
  // Handle keydown events to ensure numbers work
  ethAmountInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    console.log("⌨️ NEXUS: Key pressed:", e.key);
    // Allow: backspace, delete, tab, escape, enter, decimal point
    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  });
  
  // Max button functionality
  maxBtn.addEventListener('click', () => {
    ethAmountInput.value = totalEthBalance.toString();
    console.log("🎯 NEXUS: MAX button clicked, set value to:", totalEthBalance);
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modalOverlay.remove();
  });
  
  // Confirm button - Calculate deficit and trigger bridging
  confirmBtn.addEventListener('click', async () => {
    const stakeAmount = parseFloat(ethAmountInput.value);
    
    if (!stakeAmount || stakeAmount <= 0) {
      alert('Please enter a valid ETH amount');
      return;
    }
    
    if (stakeAmount > totalEthBalance) {
      alert(`Amount exceeds available balance of ${totalEthBalance.toFixed(4)} ETH`);
      return;
    }
    
    console.log(`🚀 NEXUS: User wants to bridge ${stakeAmount} ETH to Ethereum mainnet`);
    
    // Disable button to prevent double-clicks
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Initiating bridging...';
    confirmBtn.style.opacity = '0.6';
    
    try {
      // Calculate how much we're short on Ethereum mainnet
      const ethereumBalance = ethChains.find((chain: any) => chain.chain.name === 'Ethereum Mainnet');
      const currentEthBalance = parseFloat(ethereumBalance?.balance || '0');
      
      // Reserve ETH for gas fees (approximately 0.002 ETH for Lido staking)
      const gasReserve = 0.002;
      const stakeAmountWithGas = stakeAmount + gasReserve;
      const deficit = stakeAmountWithGas - currentEthBalance;
      
      console.log(`💡 NEXUS: Ethereum has ${currentEthBalance} ETH, need ${stakeAmount} ETH + ${gasReserve} ETH gas = ${stakeAmountWithGas} ETH, deficit: ${deficit} ETH`);
      
      if (deficit <= 0) {
        // No bridging needed - user has enough on mainnet (including gas)
        alert(`✅ You already have enough ETH on Ethereum mainnet (including gas)! You can stake directly on Lido.`);
        modalOverlay.remove();
        return;
      }
      
      // Access the Nexus SDK that was initialized in nexusCA.tsx
      if (!(window as any).nexus) {
        throw new Error('Nexus SDK not initialized');
      }
      
      console.log(`💫 NEXUS: Calling ca.bridge() to bridge ${deficit.toFixed(6)} ETH deficit (including ${gasReserve} ETH gas reserve) to Ethereum mainnet`);
      console.log(`🔧 NEXUS: Bridge parameters:`, {
        amount: deficit.toString(),
        token: 'eth',
        chainId: 1,
        deficit: deficit,
        gasReserve: gasReserve,
        stakeAmount: stakeAmount
      });
      
      // Bridge ONLY the deficit amount from other chains
      const bridgeResult = await (window as any).nexus.bridge({
        amount: deficit.toString(),
        token: 'eth',
        chainId: 1, // Ethereum mainnet
      });
      
      console.log(`✅ NEXUS: Bridge result (full object):`, JSON.stringify(bridgeResult, null, 2));
      
      if (bridgeResult.success) {
        // Success! Auto-fill Lido's input and close modal
        alert(`✅ Successfully initiated bridge of ${deficit.toFixed(6)} ETH to Ethereum mainnet!\n\nAmount includes ${gasReserve} ETH gas reserve.\n\nBridging will take 2-5 minutes. Please wait for completion, then try staking again on Lido.`);
        modalOverlay.remove();
      } else {
        // More detailed error handling
        console.log('❌ NEXUS: Bridge result failed:', bridgeResult);
        
        // Check if it's a user rejection vs actual failure
        if (bridgeResult.error && bridgeResult.error.includes && 
            (bridgeResult.error.includes('rejected') || bridgeResult.error.includes('denied') || bridgeResult.error.includes('cancelled'))) {
          alert('❌ Bridging was cancelled by user. Please try again if you want to proceed.');
        } else if (bridgeResult.error && bridgeResult.error.includes && bridgeResult.error.includes('insufficient')) {
          alert('❌ Insufficient balance on source chains to complete the bridge. Please check your balances.');
        } else {
          // Show more detailed error info
          const errorMsg = bridgeResult.error || bridgeResult.message || 'Unknown error';
          alert(`❌ Bridging failed: ${errorMsg}\n\nThis might be temporary. Please check:\n- Your wallet connection\n- Network connectivity\n- Try again in a few moments`);
        }
        
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '🚀 Stake with Unified ETH';
        confirmBtn.style.opacity = '1';
      }
      
    } catch (error: any) {
      console.error('❌ NEXUS: Error during unified ETH bridging:', error);
      
      // More detailed error handling for different types of errors
      let errorMessage = 'Failed to initiate bridging';
      
      if (error.code === 4001) {
        errorMessage = '❌ User rejected the transaction in wallet';
      } else if (error.message && error.message.includes('insufficient')) {
        errorMessage = '❌ Insufficient funds for bridging';
      } else if (error.message && error.message.includes('network')) {
        errorMessage = '❌ Network error - please check your connection';
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = '❌ Request timed out - please try again';
      } else if (error.message) {
        errorMessage = `❌ Error: ${error.message}`;
      } else {
        errorMessage = `❌ Unknown error: ${error}`;
      }
      
      alert(`${errorMessage}\n\n🔧 Troubleshooting tips:\n- Check wallet connection\n- Ensure sufficient balance\n- Try refreshing the page\n- Check browser console for details`);
      
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '🚀 Stake with Unified ETH';
      confirmBtn.style.opacity = '1';
    }
  });
  
  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
  
  // Focus on input and ensure it's ready for user interaction
  setTimeout(() => {
    ethAmountInput.focus();
    ethAmountInput.click(); // Trigger click to ensure focus
    console.log("🎯 NEXUS: ETH input focused and ready for input");
  }, 100);
}

// Function to open unified USDC supply modal for Aave
function openUnifiedUsdcSupplyModal(totalUsdcBalance: number, usdcChains: any[]) {
  console.log("🏦 NEXUS: Opening unified USDC supply modal for Aave");
  
  // Remove existing modal if present
  const existingModal = document.querySelector('.nexus-supply-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'nexus-supply-modal';
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
    pointer-events: none;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #0f3443 0%, #1a5f7a 100%);
    border-radius: 16px;
    padding: 24px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 136, 0.2);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: auto;
    position: relative;
    z-index: 1000000;
  `;
  
  modalContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 24px; font-weight: 600;">💰 Supply with Unified USDC</h2>
      <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">Supply USDC to Aave V3 on Base from all your chains</p>
    </div>
    
    <div style="background: rgba(0,255,136,0.1); border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid rgba(0,255,136,0.2);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-weight: 600; color: #fff;">Available Balance</span>
        <span style="font-weight: bold; color: #00ff88; font-size: 18px;">$${totalUsdcBalance.toFixed(2)} USDC</span>
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.8);">
        ${usdcChains.map((chain: any) => `
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>${removeMainnet(chain.chain.name)}</span>
            <span style="color: #00d4ff;">$${parseFloat(chain.balance).toFixed(2)} USDC</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #fff;">
        USDC Amount to Supply
      </label>
      <div style="position: relative; display: flex; align-items: center; gap: 8px;">
        <button id="nexus-usdc-decrement" style="
          padding: 12px 16px;
          background: rgba(255,59,48,0.2);
          border: 1px solid #ff3b30;
          border-radius: 8px;
          color: #ff3b30;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        " onmouseover="this.style.background='rgba(255,59,48,0.3)'" onmouseout="this.style.background='rgba(255,59,48,0.2)'">
          −
        </button>
        <div style="position: relative; flex: 1;">
          <input 
            type="text" 
            inputmode="decimal" 
            id="nexus-usdc-amount" 
            placeholder="0.00"
            autocomplete="off"
            spellcheck="false"
            style="
              width: 100%;
              padding: 16px 70px 16px 16px;
              background: rgba(255,255,255,0.1);
              border: 2px solid rgba(0,255,136,0.3);
              border-radius: 12px;
              color: white;
              font-size: 18px;
              font-weight: 600;
              outline: none;
              transition: all 0.3s ease;
              box-sizing: border-box;
            ">
          <span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.6); font-weight: 600; pointer-events: none;">USDC</span>
        </div>
        <button id="nexus-usdc-increment" style="
          padding: 12px 16px;
          background: rgba(0,255,136,0.2);
          border: 1px solid #00ff88;
          border-radius: 8px;
          color: #00ff88;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        " onmouseover="this.style.background='rgba(0,255,136,0.3)'" onmouseout="this.style.background='rgba(0,255,136,0.2)'">
          +
        </button>
      </div>
      <button id="nexus-usdc-max-btn" style="
        margin-top: 8px;
        padding: 6px 12px;
        background: rgba(0,255,136,0.2);
        border: 1px solid #00ff88;
        border-radius: 6px;
        color: #00ff88;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(0,255,136,0.3)'" onmouseout="this.style.background='rgba(0,255,136,0.2)'">
        MAX: $${totalUsdcBalance.toFixed(2)} USDC
      </button>
    </div>
    
    <div style="display: flex; gap: 12px;">
      <button id="nexus-usdc-cancel-btn" style="
        flex: 1;
        padding: 14px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 10px;
        color: white;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
        Cancel
      </button>
      <button id="nexus-usdc-confirm-btn" style="
        flex: 2;
        padding: 14px;
        background: linear-gradient(45deg, #00d4ff, #00ff88);
        border: none;
        border-radius: 10px;
        color: #000;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        🏦 Supply with Unified USDC
      </button>
    </div>
    
    <div style="margin-top: 16px; padding: 12px; background: rgba(0,212,255,0.1); border-radius: 8px; font-size: 12px; text-align: center; color: rgba(255,255,255,0.8);">
      💡 Nexus will bridge USDC to Base and handle approval automatically
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Add event listeners - back to regular input
  const usdcAmountInput = modalOverlay.querySelector('#nexus-usdc-amount') as HTMLInputElement;
  const incrementBtn = modalOverlay.querySelector('#nexus-usdc-increment') as HTMLButtonElement;
  const decrementBtn = modalOverlay.querySelector('#nexus-usdc-decrement') as HTMLButtonElement;
  const maxBtn = modalOverlay.querySelector('#nexus-usdc-max-btn') as HTMLButtonElement;
  const cancelBtn = modalOverlay.querySelector('#nexus-usdc-cancel-btn') as HTMLButtonElement;
  const confirmBtn = modalOverlay.querySelector('#nexus-usdc-confirm-btn') as HTMLButtonElement;
  
  // Focus on input
  setTimeout(() => {
    usdcAmountInput.focus();
    console.log("🎯 NEXUS: Focused on USDC input");
  }, 100);
  
  // Input validation - only allow numbers and decimal point
  usdcAmountInput.addEventListener('input', (e) => {
    let value = usdcAmountInput.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    usdcAmountInput.value = value;
  });
  
  // Increment button - add 0.2 USDC
  incrementBtn.addEventListener('click', () => {
    const currentValue = parseFloat(usdcAmountInput.value || '0');
    const newValue = Math.min(currentValue + 0.2, totalUsdcBalance);
    usdcAmountInput.value = newValue.toFixed(2);
    console.log("➕ NEXUS: Incremented to", newValue);
  });
  
  // Decrement button - subtract 0.2 USDC
  decrementBtn.addEventListener('click', () => {
    const currentValue = parseFloat(usdcAmountInput.value || '0');
    const newValue = Math.max(currentValue - 0.2, 0);
    usdcAmountInput.value = newValue.toFixed(2);
    console.log("➖ NEXUS: Decremented to", newValue);
  });
  // Add focus/blur styling
  usdcAmountInput.addEventListener('focus', () => {
    usdcAmountInput.style.borderColor = '#00ff88';
    console.log("✨ NEXUS: Input focused");
  });
  
  usdcAmountInput.addEventListener('blur', () => {
    usdcAmountInput.style.borderColor = 'rgba(0,255,136,0.3)';
    console.log("💤 NEXUS: Input blurred");
  });
  
  // STOP ALL EVENT PROPAGATION - prevent Aave from blocking our input
  usdcAmountInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log("⌨️ NEXUS: Keydown event:", e.key, "keyCode:", e.keyCode);
  }, true);
  
  usdcAmountInput.addEventListener('keypress', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log("⌨️ NEXUS: Keypress event:", e.key, "charCode:", e.charCode);
  }, true);
  
  usdcAmountInput.addEventListener('keyup', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log("⌨️ NEXUS: Keyup event:", e.key);
  }, true);
  
  // Input validation - only allow numbers and decimal point
  usdcAmountInput.addEventListener('input', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log("⌨️ NEXUS: Input event fired!");
    const input = e.target as HTMLInputElement;
    // Remove any non-numeric characters except decimal point
    let value = input.value.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    input.value = value;
    console.log("⌨️ NEXUS: Input value changed to:", value);
  }, true);
  
  // Ensure input is always focusable on click
  usdcAmountInput.addEventListener('click', (e) => {
    e.stopPropagation();
    usdcAmountInput.focus();
    console.log("🖱️ NEXUS: Input clicked and focused");
  });
  
  // Max button functionality
  maxBtn.addEventListener('click', () => {
    usdcAmountInput.value = totalUsdcBalance.toFixed(2);
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modalOverlay.remove();
  });
  
  // Close on overlay background click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
  
  // Confirm button - Calculate deficit and trigger bridging to Base
  confirmBtn.addEventListener('click', async () => {
    const supplyAmount = parseFloat(usdcAmountInput.value || '0');
    
    if (!supplyAmount || supplyAmount <= 0) {
      alert('Please enter a valid USDC amount');
      return;
    }
    
    if (supplyAmount > totalUsdcBalance) {
      alert(`Amount exceeds available balance of $${totalUsdcBalance.toFixed(2)} USDC`);
      return;
    }
    
    console.log(`🏦 NEXUS: User wants to bridge ${supplyAmount} USDC to Base for Aave supply`);
    
    // Disable button to prevent double-clicks
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Initiating bridging...';
    confirmBtn.style.opacity = '0.6';
    
    try {
      // Calculate how much we're short on Base chain (chainId: 8453)
      const baseBalance = usdcChains.find((chain: any) => chain.chain.id === 8453);
      const currentBaseUsdc = parseFloat(baseBalance?.balance || '0');
      
      // NO gas reservation for USDC (gas paid in native ETH)
      const deficit = supplyAmount - currentBaseUsdc;
      
      console.log(`💡 NEXUS: Base has ${currentBaseUsdc} USDC, need ${supplyAmount} USDC, deficit: ${deficit} USDC`);
      
      if (deficit <= 0) {
        // No bridging needed - user has enough on Base
        alert(`✅ You already have enough USDC on Base! You can supply directly on Aave.\n\nMake sure you have native ETH on Base for gas fees.`);
        modalOverlay.remove();
        
        // Auto-fill Aave's USDC input
        setTimeout(() => {
          const aaveInput = document.querySelector('input[type="text"], input[type="number"]') as HTMLInputElement;
          if (aaveInput) {
            aaveInput.value = supplyAmount.toString();
            aaveInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`✅ NEXUS: Auto-filled Aave input with ${supplyAmount} USDC`);
          }
        }, 500);
        return;
      }
      
      // Access the Nexus SDK that was initialized in nexusCA.tsx
      if (!(window as any).nexus) {
        throw new Error('Nexus SDK not initialized');
      }
      
      console.log(`💫 NEXUS: Calling ca.bridge() to bridge ${deficit.toFixed(2)} USDC deficit to Base (chainId: 8453)`);
      
      // Set destination chainId for progress tracking
      if ((window as any).nexusDestinationChainId) {
        (window as any).nexusDestinationChainId.current = 8453;
        console.log("🎯 NEXUS: Set destination chainId to 8453 (Base)");
      }
      
      // Bridge ONLY the deficit amount from other chains to Base
      const bridgeResult = await (window as any).nexus.bridge({
        amount: deficit.toString(),
        token: 'usdc',
        chainId: 8453, // Base chain
      });
      
      console.log(`✅ NEXUS: Bridge result:`, bridgeResult);
      
      if (bridgeResult.success) {
        // Success! Auto-fill Aave's input and close modal
        alert(`✅ Successfully bridged ${deficit.toFixed(2)} USDC to Base!\n\nAave's input will be auto-filled with ${supplyAmount.toFixed(2)} USDC.\n\nMake sure you have native ETH on Base for gas fees.\n\nApprove USDC and then supply to Aave!`);
        
        // Auto-fill Aave's USDC amount input
        setTimeout(() => {
          const aaveInput = document.querySelector('input[type="text"], input[type="number"]') as HTMLInputElement;
          if (aaveInput) {
            aaveInput.value = supplyAmount.toString();
            // Trigger input event so Aave's validation updates
            aaveInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`✅ NEXUS: Auto-filled Aave input with ${supplyAmount} USDC`);
          }
        }, 500);
        
        modalOverlay.remove();
      } else {
        // User rejected or bridging failed
        console.log('❌ NEXUS: Bridging was rejected or failed');
        alert('Bridging was cancelled or failed. Please try again.');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '🏦 Supply with Unified USDC';
        confirmBtn.style.opacity = '1';
      }
      
    } catch (error: any) {
      console.error('❌ NEXUS: Error during unified USDC bridging:', error);
      alert(`Failed to initiate bridging: ${error?.message || error}`);
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '🏦 Supply with Unified USDC';
      confirmBtn.style.opacity = '1';
    }
  });
  
  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
  
  // Focus on input
  setTimeout(() => {
    usdcAmountInput.focus();
  }, 100);
}

// Morpho Integration - Add floating unified USDC button
async function initializeMorphoIntegration() {
  // Check if we're on Morpho domain
  const isMorphoDomain = window.location.hostname.includes("app.morpho.org") || 
                        window.location.hostname === "morpho.org";
  
  if (!isMorphoDomain) {
    console.log("🔮 NEXUS: Not on Morpho domain, skipping Morpho integration");
    return;
  }

  // Guard to prevent multiple initializations
  if ((window as any).__nexusMorphoInitialized) {
    return;
  }
  (window as any).__nexusMorphoInitialized = true;

  console.log("🔮 NEXUS: Morpho integration active on", window.location.href, "- adding unified USDC button");

  // Wait for page to load
  setTimeout(async () => {
    // Create floating unified USDC button
    const unifiedButton = document.createElement('button');
    unifiedButton.id = 'nexus-morpho-unified-button';
    unifiedButton.innerHTML = '🔮 Unified USDC';
    unifiedButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      padding: 12px 20px;
      background: linear-gradient(45deg, #8B5CF6, #A855F7);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Hover effects
    unifiedButton.addEventListener('mouseenter', () => {
      unifiedButton.style.transform = 'scale(1.05)';
      unifiedButton.style.boxShadow = '0 6px 25px rgba(139, 92, 246, 0.4)';
    });
    
    unifiedButton.addEventListener('mouseleave', () => {
      unifiedButton.style.transform = 'scale(1)';
      unifiedButton.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.3)';
    });
    
    // Click handler
    unifiedButton.addEventListener('click', async () => {
      console.log("🔮 NEXUS: Unified USDC button clicked!");
      
      // Fetch unified balances
      const unifiedBalances = await fetchUnifiedBalances();
      const usdcAsset = unifiedBalances.find((bal: any) => bal.symbol === "USDC");
      
      if (!usdcAsset) {
        alert("No USDC found in your unified balances");
        return;
      }
      
      const totalUsdcBalance = parseFloat(usdcAsset.balance || "0");
      const usdcChains = usdcAsset.breakdown.filter((token: any) => Number(token.balance) > 0);
      
      if (totalUsdcBalance > 0) {
        console.log(`🔮 NEXUS: Opening unified USDC popup with $${totalUsdcBalance} across ${usdcChains.length} chains`);
        openUnifiedUsdcDepositModal(totalUsdcBalance, usdcChains);
      } else {
        alert("No USDC available in your unified balances");
      }
    });
    
    // Add button to page
    document.body.appendChild(unifiedButton);
    console.log("🔮 NEXUS: Added unified USDC button to Morpho page");
    
  }, 2000); // Wait 2 seconds for page to fully load
}

// Function to open unified USDC deposit modal for Morpho
function openUnifiedUsdcDepositModal(totalUsdcBalance: number, usdcChains: any[]) {
  console.log("🔮 NEXUS: Opening unified USDC deposit modal for Morpho");
  
  // Remove existing modal if present
  const existingModal = document.querySelector('.nexus-morpho-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'nexus-morpho-modal';
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
    pointer-events: none;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #2D1B69 0%, #8B5CF6 100%);
    border-radius: 16px;
    padding: 24px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(139, 92, 246, 0.3);
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: auto;
    position: relative;
    z-index: 1000000;
  `;
  
  modalContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 24px; font-weight: 600;">🔮 Unified USDC on Base</h2>
      <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">Bridge and deposit USDC to Morpho Vault on Base chain</p>
    </div>
    
    <div style="background: rgba(139,92,246,0.1); border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid rgba(139,92,246,0.2);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-weight: 600; color: #fff;">Available USDC Balance</span>
        <span style="font-weight: bold; color: #8B5CF6; font-size: 18px;">$${totalUsdcBalance.toFixed(2)} USDC</span>
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.8);">
        ${usdcChains.map((chain: any) => `
          <div style="display: flex; justify-content: space-between; margin: 4px 0;">
            <span>${removeMainnet(chain.chain.name)}</span>
            <span style="color: #8B5CF6;">$${parseFloat(chain.balance).toFixed(2)} USDC</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #fff;">
        USDC Amount for Base Chain
      </label>
      <div style="position: relative; display: flex; align-items: center; gap: 8px;">
        <button id="nexus-morpho-usdc-decrement" style="
          padding: 12px 16px;
          background: rgba(239,68,68,0.2);
          border: 1px solid #ef4444;
          border-radius: 8px;
          color: #ef4444;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        " onmouseover="this.style.background='rgba(239,68,68,0.3)'" onmouseout="this.style.background='rgba(239,68,68,0.2)'">
          −
        </button>
        <div style="position: relative; flex: 1;">
          <input 
            type="text" 
            inputmode="decimal" 
            id="nexus-morpho-usdc-amount" 
            placeholder="0.00"
            autocomplete="off"
            spellcheck="false"
            style="
              width: 100%;
              padding: 16px 70px 16px 16px;
              background: rgba(255,255,255,0.1);
              border: 2px solid rgba(139,92,246,0.3);
              border-radius: 12px;
              color: white;
              font-size: 18px;
              font-weight: 600;
              outline: none;
              transition: all 0.3s ease;
              box-sizing: border-box;
            ">
          <span style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.6); font-weight: 600; pointer-events: none;">USDC</span>
        </div>
        <button id="nexus-morpho-usdc-increment" style="
          padding: 12px 16px;
          background: rgba(139,92,246,0.2);
          border: 1px solid #8B5CF6;
          border-radius: 8px;
          color: #8B5CF6;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        " onmouseover="this.style.background='rgba(139,92,246,0.3)'" onmouseout="this.style.background='rgba(139,92,246,0.2)'">
          +
        </button>
      </div>
      <button id="nexus-morpho-usdc-max-btn" style="
        margin-top: 8px;
        padding: 6px 12px;
        background: rgba(139,92,246,0.2);
        border: 1px solid #8B5CF6;
        border-radius: 6px;
        color: #8B5CF6;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(139,92,246,0.3)'" onmouseout="this.style.background='rgba(139,92,246,0.2)'">
        MAX: $${totalUsdcBalance.toFixed(2)} USDC
      </button>
    </div>
    
    <div style="display: flex; gap: 12px;">
      <button id="nexus-morpho-usdc-cancel-btn" style="
        flex: 1;
        padding: 14px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 10px;
        color: white;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
        Cancel
      </button>
      <button id="nexus-morpho-usdc-confirm-btn" style="
        flex: 2;
        padding: 14px;
        background: linear-gradient(45deg, #8B5CF6, #A855F7);
        border: none;
        border-radius: 10px;
        color: #000;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        🔮 Bridge to Base
      </button>
    </div>
    
    <div style="margin-top: 16px; padding: 12px; background: rgba(139,92,246,0.1); border-radius: 8px; font-size: 12px; text-align: center; color: rgba(255,255,255,0.8);">
      💡 Nexus will bridge USDC to Base chain automatically
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Add event listeners
  const usdcAmountInput = modalOverlay.querySelector('#nexus-morpho-usdc-amount') as HTMLInputElement;
  const incrementBtn = modalOverlay.querySelector('#nexus-morpho-usdc-increment') as HTMLButtonElement;
  const decrementBtn = modalOverlay.querySelector('#nexus-morpho-usdc-decrement') as HTMLButtonElement;
  const maxBtn = modalOverlay.querySelector('#nexus-morpho-usdc-max-btn') as HTMLButtonElement;
  const cancelBtn = modalOverlay.querySelector('#nexus-morpho-usdc-cancel-btn') as HTMLButtonElement;
  const confirmBtn = modalOverlay.querySelector('#nexus-morpho-usdc-confirm-btn') as HTMLButtonElement;
  
  // Focus on input
  setTimeout(() => {
    usdcAmountInput.focus();
    console.log("🎯 NEXUS: Focused on Morpho USDC input");
  }, 100);
  
  // Input validation - only allow numbers and decimal point
  usdcAmountInput.addEventListener('input', (e) => {
    let value = usdcAmountInput.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    usdcAmountInput.value = value;
  });
  
  // Increment button - add 0.2 USDC
  incrementBtn.addEventListener('click', () => {
    const currentValue = parseFloat(usdcAmountInput.value || '0');
    const newValue = Math.min(currentValue + 0.2, totalUsdcBalance);
    usdcAmountInput.value = newValue.toFixed(2);
    console.log("➕ NEXUS: Incremented to", newValue);
  });
  
  // Decrement button - subtract 0.2 USDC
  decrementBtn.addEventListener('click', () => {
    const currentValue = parseFloat(usdcAmountInput.value || '0');
    const newValue = Math.max(currentValue - 0.2, 0);
    usdcAmountInput.value = newValue.toFixed(2);
    console.log("➖ NEXUS: Decremented to", newValue);
  });
  
  // Max button functionality
  maxBtn.addEventListener('click', () => {
    usdcAmountInput.value = totalUsdcBalance.toFixed(2);
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modalOverlay.remove();
  });
  
  // Close on overlay background click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
  
  // Confirm button - Calculate deficit and trigger bridging to Base
  confirmBtn.addEventListener('click', async () => {
    const depositAmount = parseFloat(usdcAmountInput.value || '0');
    
    if (!depositAmount || depositAmount <= 0) {
      alert('Please enter a valid USDC amount');
      return;
    }
    
    if (depositAmount > totalUsdcBalance) {
      alert(`Amount exceeds available balance of $${totalUsdcBalance.toFixed(2)} USDC`);
      return;
    }
    
    console.log(`🔮 NEXUS: User wants to bridge ${depositAmount} USDC to Base for Morpho deposit`);
    
    // Disable button to prevent double-clicks
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Initiating bridging...';
    confirmBtn.style.opacity = '0.6';
    
    try {
      // Calculate how much we're short on Base chain (chainId: 8453)
      const baseBalance = usdcChains.find((chain: any) => chain.chain.id === 8453);
      const currentBaseUsdc = parseFloat(baseBalance?.balance || '0');
      
      // NO gas reservation for USDC (gas paid in native ETH)
      const deficit = depositAmount - currentBaseUsdc;
      
      console.log(`💡 NEXUS: Base has ${currentBaseUsdc} USDC, need ${depositAmount} USDC, deficit: ${deficit} USDC`);
      
      if (deficit <= 0) {
        // No bridging needed - user has enough on Base
        alert(`✅ You already have enough USDC on Base chain!\n\nYou can use Morpho directly with your ${currentBaseUsdc.toFixed(2)} USDC on Base.\n\nMake sure you have native ETH on Base for gas fees.`);
        modalOverlay.remove();
        return;
      }
      
      // Access the Nexus SDK that was initialized in nexusCA.tsx
      if (!(window as any).nexus) {
        throw new Error('Nexus SDK not initialized');
      }
      
      console.log(`💫 NEXUS: Calling ca.bridge() to bridge ${deficit.toFixed(2)} USDC deficit to Base (chainId: 8453)`);
      
      // Set destination chainId for progress tracking
      if ((window as any).nexusDestinationChainId) {
        (window as any).nexusDestinationChainId.current = 8453;
        console.log("🎯 NEXUS: Set destination chainId to 8453 (Base)");
      }
      
      // Bridge ONLY the deficit amount from other chains to Base
      const bridgeResult = await (window as any).nexus.bridge({
        amount: deficit.toString(),
        token: 'usdc',
        chainId: 8453, // Base chain
      });
      
      console.log(`✅ NEXUS: Bridge result:`, bridgeResult);
      
      if (bridgeResult.success) {
        // Success! Show completion message
        alert(`✅ Successfully bridged ${deficit.toFixed(2)} USDC to Base chain!\n\n🔮 Total USDC now available on Base: ${(currentBaseUsdc + deficit).toFixed(2)} USDC\n\nYou can now use Morpho on Base chain!\n\nMake sure you have native ETH on Base for gas fees.`);
        modalOverlay.remove();
      } else {
        // User rejected or bridging failed
        console.log('❌ NEXUS: Bridging was rejected or failed');
        alert('Bridging was cancelled or failed. Please try again.');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '🔮 Bridge to Base';
        confirmBtn.style.opacity = '1';
      }
      
    } catch (error: any) {
      console.error('❌ NEXUS: Error during unified USDC bridging:', error);
      alert(`Failed to initiate bridging: ${error?.message || error}`);
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '🔮 Bridge to Base';
      confirmBtn.style.opacity = '1';
    }
  });
  
  // Focus on input
  setTimeout(() => {
    usdcAmountInput.focus();
  }, 100);
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
