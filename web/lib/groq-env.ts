import "server-only";
import fs from "node:fs";
import { GROQ_ENV_PATH } from "./paths";

export type GroqEnv = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function loadGroqEnv(): GroqEnv | null {
  const parsed: Partial<GroqEnv> = {};
  if (fs.existsSync(GROQ_ENV_PATH)) {
    for (const raw of fs.readFileSync(GROQ_ENV_PATH, "utf-8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const idx = line.indexOf("=");
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (k === "GROQ_API_KEY") parsed.apiKey = v;
      if (k === "GROQ_BASE_URL") parsed.baseUrl = v;
      if (k === "GROQ_TOPIC_MODEL") parsed.model = v;
    }
  }
  const apiKey = process.env.GROQ_API_KEY || parsed.apiKey;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: parsed.baseUrl || "https://api.groq.com/openai/v1",
    model: parsed.model || "llama-3.1-8b-instant",
  };
}

export function parseRetryDelay(errorText: string): number | null {
  const ms = errorText.match(/try again in (\d+(?:\.\d+)?)ms/);
  if (ms) return Math.ceil(parseFloat(ms[1])) + 100;
  const s = errorText.match(/try again in (\d+(?:\.\d+)?)s/);
  if (s) return Math.ceil(parseFloat(s[1]) * 1000) + 100;
  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
