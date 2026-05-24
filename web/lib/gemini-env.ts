import "server-only";
import fs from "node:fs";
import { GROQ_ENV_PATH } from "./paths";

export type GeminiEnv = {
  apiKey: string;
  model: string;
};

export function loadGeminiEnv(): GeminiEnv | null {
  const parsed: Partial<GeminiEnv> = {};
  if (fs.existsSync(GROQ_ENV_PATH)) {
    for (const raw of fs.readFileSync(GROQ_ENV_PATH, "utf-8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const idx = line.indexOf("=");
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (k === "GEMINI_API_KEY") parsed.apiKey = v;
      if (k === "GEMINI_MODEL") parsed.model = v;
    }
  }
  const apiKey = process.env.GEMINI_API_KEY || parsed.apiKey;
  if (!apiKey) return null;
  return {
    apiKey,
    model: parsed.model || "gemini-3.5-flash",
  };
}
