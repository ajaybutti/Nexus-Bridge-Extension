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

injectDomModifier();
