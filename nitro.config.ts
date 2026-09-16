import { defineConfig } from "nitro";

export default defineConfig(
  process.env["VERCEL"] ? { preset: "vercel" } : {}
);

