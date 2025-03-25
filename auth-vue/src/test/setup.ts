import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/lib/styles/main.css";

const vuetify = createVuetify({
  components,
  directives,
});

// @ts-ignore
global.vuetify = vuetify;
