const dropdownNode = "div.sc-bYMpWt.bSFGqc.dropper-select-list.variant_black";
const titleNode = "div.sc-bjfHbI.lgpQZk.body18Regular";
const dropdownParentNode = "div.sc-iJnaPW.bwRIip.variant_black";

function hideElement(element: HTMLElement | Element) {
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
        if ((mutation.addedNodes[0] as HTMLElement)?.querySelector(titleNode)) {
          const node = (mutation.addedNodes[0] as HTMLElement).querySelector(
            titleNode
          )!;
          node.innerHTML = node.innerHTML.replace(
            " from Arbitrum",
            " from <span style='text-decoration: line-through'>Arbitrum</span> Everywhere"
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

  observer.observe(document.getElementById("root")!, {
    subtree: true,
    childList: true,
  });
}

injectDomModifier();
