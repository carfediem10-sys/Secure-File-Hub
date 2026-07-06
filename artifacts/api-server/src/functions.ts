// Firebase Cloud Functions entry point
// Build with: pnpm run build, then deploy functions/
import { onRequest } from "firebase-functions/v2/https";
import app from "./index";

export const api = onRequest(
  { memory: "512MiB", timeoutSeconds: 30, region: "asia-northeast3" },
  app,
);
