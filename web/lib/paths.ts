import path from "node:path";
import os from "node:os";

export const HOME = os.homedir();
export const TRACKER_ROOT = path.join(HOME, "Documents", "projects", "time-tracker");
export const PROJECTS_ROOT = path.join(HOME, "Documents", "projects");
export const CSV_PATH = path.join(TRACKER_ROOT, "data", "project-time.csv");
export const TOPIC_CACHE_PATH = path.join(TRACKER_ROOT, "data", "session-topics.json");
export const GROQ_ENV_PATH = path.join(TRACKER_ROOT, "scripts", "groq.env");

export const TZ = "Europe/Istanbul";
