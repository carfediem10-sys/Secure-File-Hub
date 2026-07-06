// Firebase Cloud Functions entry point
// Build with: pnpm run build, then deploy dist/
import { onRequest } from "firebase-functions/v2/https";
import app from "./app";

export const api = onRequest(
  { memory: "512MiB", timeoutSeconds: 30, region: "asia-northeast3" },
  app,
);
