import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        register: resolve(__dirname, "register.html"),
        explore: resolve(__dirname, "explore.html"),
        profile: resolve(__dirname, "profile.html"),
        hostActivity: resolve(__dirname, "hostActivity.html"),
        completeProfile: resolve(__dirname, "complete-profile.html"),
        admin: resolve(__dirname, "admin.html"),
        community: resolve(__dirname, "community.html"),
        quiz: resolve(__dirname, "quiz.html"),
      },
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
