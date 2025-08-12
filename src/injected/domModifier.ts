const dropdownNode = "div.sc-bYMpWt.bSFGqc.dropper-select-list.variant_black";

function hideElement(element: HTMLElement) {
  element.setAttribute("style", "display: none;");
}

function injectDomModifier() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "childList" &&
        mutation.addedNodes.length > 0 &&
        mutation.addedNodes[0] instanceof HTMLElement
      ) {
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
          }
          if (element.innerHTML.includes("USDC.e")) {
            for (
              let i = 0;
              i < element.children[0].children[0].children.length;
              i++
            ) {
              const child = element.children[0].children[0].children[
                i
              ] as HTMLElement;
              if (child.innerHTML.includes("USDC.e")) {
                hideElement(child);
              }
            }
          }
        }
      }
    });
  });

  observer.observe(document.getElementById("root")!, {
    subtree: true,
    childList: true,
  });
}

injectDomModifier();
