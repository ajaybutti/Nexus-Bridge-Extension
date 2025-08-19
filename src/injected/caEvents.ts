import { CA } from "@arcana/ca-sdk";

function createDiv(exampleDiv: HTMLDivElement, id: string, event: string) {
  const div = document.createElement("div");
  exampleDiv.getAttributeNames().forEach((attr) => {
    div.setAttribute(attr, exampleDiv.getAttribute(attr)!);
  });
  div.id = id;
  div.dataset.event = event;
  return div;
}

function updateModalTitleDescription(title: string, desc?: string) {
  const modal = document.querySelector(".modal")!;
  const mainDiv =
    modal.children[1].children[0].children[0].children[1].children[0];
  mainDiv.children[0].innerHTML = title;
  if (desc) mainDiv.children[1].innerHTML = desc;
}

export function setCAEvents(ca: CA) {
  const state = {
    steps: [] as {
      typeID: string;
      type: string;
      done: boolean;
      data?: any;
    }[],
    totalSources: 0,
  };

  ca.caEvents.on("expected_steps", (data) => {
    state.steps = data.map((s: { typeID: number }) => ({ ...s, done: false }));
    const modal = document.querySelector(".modal")!;
    const mainDiv =
      modal.children[1].children[0].children[0].children[1].children[1];
    const exampleDiv =
      mainDiv.children.length === 3
        ? (mainDiv.children[1] as HTMLDivElement)
        : (mainDiv.children[0] as HTMLDivElement);
    mainDiv.setAttribute(
      "style",
      mainDiv.getAttribute("style")!.replace("hidden", "visible")
    );
    state.steps.forEach((s) => {
      switch (s.type) {
        case "INTENT_SUBMITTED": {
          const div = createDiv(exampleDiv, s.typeID, s.type);
          div.innerHTML = `
          <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(255, 255, 255); text-align: center; display: block;" bis_skin_checked="1">Verifying Intent</div>
          <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(148, 158, 156); text-align: center; display: block;" bis_skin_checked="1"></div>
          `;
          mainDiv.insertBefore(div, exampleDiv);
          break;
        }
        case "INTENT_COLLECTION": {
          state.totalSources = s.data.total;
          break;
        }
        case "INTENT_COLLECTION_COMPLETE": {
          const div = createDiv(exampleDiv, s.typeID, s.type);
          div.innerHTML = `
          <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(255, 255, 255); text-align: center; display: block;" bis_skin_checked="1">Collecting from Sources</div>
          <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(148, 158, 156); text-align: center; display: block; font-weight: bold" bis_skin_checked="1">0/${state.totalSources}</div>
          `;
          mainDiv.insertBefore(div, exampleDiv);
          break;
        }
        case "INTENT_FULFILLED": {
          const div = createDiv(exampleDiv, s.typeID, s.type);
          div.innerHTML = `
          <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(255, 255, 255); text-align: center; display: block;" bis_skin_checked="1">Supplying to Destination</div>
          <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(148, 158, 156); text-align: center; display: block;" bis_skin_checked="1"></div>
          `;
          mainDiv.insertBefore(div, exampleDiv);
          break;
        }
        default:
          break;
      }
    });
    updateModalTitleDescription("Signing Intent");
  });

  ca.caEvents.on("step_complete", (data) => {
    const modal = document.querySelector(".modal")!;
    const mainDiv =
      modal.children[1].children[0].children[0].children[1].children[1];
    const incrementor = mainDiv.children.length === 6 ? 1 : 0;
    switch (data.type) {
      case "INTENT_ACCEPTED": {
        updateModalTitleDescription("Submitting Intent");
        break;
      }
      case "INTENT_SUBMITTED": {
        updateModalTitleDescription("Collecting from Sources");
        mainDiv.children[0 + incrementor].innerHTML = `
        <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(255, 255, 255); text-align: center; display: block;" bis_skin_checked="1">Intent Verified</div>
        <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(80, 210, 193) !important; text-align: center; display: block;" bis_skin_checked="1"><a href="${data.data.explorerURL}" style="text-decoration: underline; color: currentColor" target="_blank">View Intent</a></div>
        `;
        break;
      }
      case "INTENT_COLLECTION": {
        mainDiv.children[1 + incrementor].innerHTML = `
        <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(255, 255, 255); text-align: center; display: block;" bis_skin_checked="1">Collecting from Sources</div>
        <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(80, 210, 193); text-align: center; display: block; font-weight: bold" bis_skin_checked="1">${data.data.confirmed}/${state.totalSources}</div>
        `;
      }
      case "INTENT_COLLECTION_COMPLETE": {
        updateModalTitleDescription("Supplying Liquidity");
        mainDiv.children[1 + incrementor].innerHTML = `
        <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(255, 255, 255); text-align: center; display: block;" bis_skin_checked="1">Collected from Sources</div>
        <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(80, 210, 193); text-align: center; display: block; font-weight: bold" bis_skin_checked="1">${state.totalSources}/${state.totalSources}</div>
        `;
        break;
      }
      case "INTENT_FULFILLED": {
        updateModalTitleDescription("Depositing to HyperLiquid");
        mainDiv.children[2 + incrementor].innerHTML = `
        <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(255, 255, 255); text-align: center; display: block;" bis_skin_checked="1">Supplied to Destination</div>
        <div class="sc-bjfHbI jxtURp body12Regular" style="color: rgb(80, 210, 193); text-align: center; display: block; font-weight: bold" bis_skin_checked="1"></div>
        `;
        break;
      }
      default:
        break;
    }
    const v = state.steps.find((s) => {
      return s.typeID === data.typeID;
    });
    if (v) {
      v.done = true;
    }
  });
}

export function unsetCAEvents(ca: CA) {
  ca.caEvents.removeAllListeners();
}
