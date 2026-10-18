import { createApp } from "./app";
import { env } from "./lib/env";

const app = createApp();

console.log(`saimotv-lab-api ouvindo em http://localhost:${env.PORT} (origem web permitida: ${env.WEB_ORIGIN})`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
