import { aliases, mdi } from "vuetify/iconsets/mdi";

export const vuetifyConfig = {
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  defaults: {
    // VAppBar: {
    //   style: `border-bottom: 1px solid black;`,
    // },
  },
  theme: {
    defaultTheme: "light",
    // Customize theme colors here
    themes: {
      light: {
        colors: {
          // primary: "rgb(211, 31, 51)",
          // secondary: "blue",
          // background: "light-gray",
        },
      },
    },
  },
};
