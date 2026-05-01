#!/usr/bin/env bash
# UserPromptSubmit hook — her prompt gönderildiğinde proje-süre CSV'sine satır ekler.
# Alanlar: timestamp_utc, session_id, cwd, prompt_excerpt (ilk 400 karakter)
set -u
DATA_DIR="$HOME/Documents/projects/time-tracker/data"
mkdir -p "$DATA_DIR" 2>/dev/null
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
jq -r --arg ts "$ts" \
  '[$ts, (.session_id // ""), (.cwd // ""), ((.prompt // "") | tostring | .[0:400])] | @csv' \
  >> "$DATA_DIR/project-time.csv" 2>/dev/null
exit 0
