import { createApp } from "./app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  createApp(root);
}

export {};
