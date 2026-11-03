import type { App } from "vue";
import Blurb from "./Blurb.vue";
import CtaBand from "./CtaBand.vue";
import FeatureGrid from "./FeatureGrid.vue";
import Hero from "./Hero.vue";

/** Register marketing section components for use in VitePress markdown pages. */
export function registerMarketingComponents(app: App): void {
  app.component("Hero", Hero);
  app.component("Blurb", Blurb);
  app.component("FeatureGrid", FeatureGrid);
  app.component("CtaBand", CtaBand);
}
