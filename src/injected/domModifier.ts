import { debugInfo } from "../utils/debug";

const dropdownNode = "div.sc-bYMpWt.bSFGqc.dropper-select-list.variant_black";
const modalNode = ".sc-bBABsx.fAsTrb";

function hideElement(element: HTMLElement) {
  element.setAttribute("style", "display: none;");
}

function injectDomModifier() {
  let observedEvents = [] as {
    element: HTMLElement;
    event: string;
    callback: (e: Event) => void;
  }[];
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
        // if ((mutation.addedNodes[0] as HTMLElement).matches(modalNode)) {
        //   const element = mutation.addedNodes[0] as HTMLElement;
        //   if (
        //     element
        //       .querySelector("button.sc-ftTHYK.gQDoVZ")
        //       ?.textContent.includes("Deposit")
        //   ) {
        //     function handleDepositClick(e: Event) {

        //     }
        //     const button = element.querySelector(
        //       "button.sc-ftTHYK.gQDoVZ"
        //     ) as HTMLElement;
        //     button.addEventListener("click", handleDepositClick);
        //     observedEvents.push({
        //       element: button,
        //       event: "click",
        //       callback: handleDepositClick,
        //     });
        //   }
        // }

        // if ((mutation.removedNodes[0] as HTMLElement).matches(modalNode)) {
        //   observedEvents.forEach((event) => {
        //     event.element.removeEventListener(event.event, event.callback);
        //   });
        //   observedEvents = [];
        // }
      }
    });
  });

  observer.observe(document.getElementById("root")!, {
    subtree: true,
    childList: true,
  });
}

injectDomModifier();
