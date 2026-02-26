import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // This safely fakes the Node environment for SockJS/Stomp
    // without breaking React's internal build process!
    global: "window",
    "process.env": {},
  },
});
