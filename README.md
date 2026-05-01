# Claude Code Time Tracker

A personal tool that tracks how much time you spend in Claude Code, **broken down by project**.

Every time you submit a prompt, a hook fires and appends a row to a CSV. A Next.js dashboard reads that CSV and shows daily / weekly / monthly reports. Optionally, a Groq LLM generates a short topic title for each session.

```
~/.claude/settings.json (UserPromptSubmit hook)
        │
        ▼
scripts/log-prompt.sh  ──►  data/project-time.csv
                                    │
                                    ▼
                          web/  (Next.js dashboard, port 4040)
                                    │
                                    ▼
                          (optional) Groq → topic summaries
```

## Architecture

- **`scripts/log-prompt.sh`** — Claude Code `UserPromptSubmit` hook. Appends one row per prompt to the CSV: `timestamp_utc, session_id, cwd, prompt_excerpt`.
- **`scripts/project-time`** — Python CLI that prints reports in the terminal (with optional Groq topic summaries).
- **`scripts/backfill-from-transcripts.py`** — backfills the CSV from existing Claude Code transcripts (`~/.claude/projects`).
- **`web/`** — Next.js 16 dashboard. Reads the CSV and shows time by project, daily breakdown, session list, top projects, etc.
- **`data/`** — personal CSV and cache files (gitignored).

## Requirements

- macOS (paths assume `~/Documents/projects/time-tracker` — see [Important note](#important-note-paths-are-hardcoded))
- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code)
- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Python 3.10+
- `jq` (required by the hook — `brew install jq`)
- Groq API key (optional — only for topic summaries)

## Important note: paths are hardcoded

`scripts/project-time`, `web/lib/paths.ts`, and `log-prompt.sh` all expect the project at:

```
~/Documents/projects/time-tracker
```

After cloning, place it at exactly that path:

```bash
mkdir -p ~/Documents/projects
git clone https://github.com/sherozovich/time-tracker.git ~/Documents/projects/time-tracker
cd ~/Documents/projects/time-tracker
```

If you clone it elsewhere, you must update the `TRACKER_ROOT` constant in `scripts/project-time` and `web/lib/paths.ts`.

## Setup

### 1. Install dependencies

```bash
cd ~/Documents/projects/time-tracker/web
pnpm install
```

### 2. Groq (optional, for topic summaries)

```bash
cd ~/Documents/projects/time-tracker/scripts
cp groq.env.example groq.env
# open groq.env and paste your key into GROQ_API_KEY
```

The dashboard works without Groq — the "Topic" column just stays empty.

### 3. Wire up the Claude Code hook

Add this to `~/.claude/settings.json` (create the file if it doesn't exist):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash $HOME/Documents/projects/time-tracker/scripts/log-prompt.sh"
          }
        ]
      }
    ]
  }
}
```

From now on every Claude Code prompt appends a row to `data/project-time.csv`.

### 4. (Optional) Backfill from existing transcripts

If you've used Claude Code before, you can backfill the CSV from your old transcripts:

```bash
python3 ~/Documents/projects/time-tracker/scripts/backfill-from-transcripts.py
```

It scans `~/.claude/projects` and `~/Downloads/logs` for JSONL files and skips rows that already exist.

## Running

### Web dashboard

```bash
cd ~/Documents/projects/time-tracker/web
pnpm dev
```

→ <http://localhost:4040>

Use the selector at the top to switch between today / this week / this month / all time. Click a project to see its detail page (session list, daily breakdown).

### Terminal report

```bash
~/Documents/projects/time-tracker/scripts/project-time            # today
~/Documents/projects/time-tracker/scripts/project-time --week     # this week
~/Documents/projects/time-tracker/scripts/project-time --help
```

## Project structure

```
time-tracker/
├── data/                              # CSV + cache (gitignored)
│   ├── project-time.csv
│   ├── session-topics.json
│   └── session-summaries.json
├── scripts/
│   ├── log-prompt.sh                  # Claude Code hook
│   ├── project-time                   # CLI report
│   ├── backfill-from-transcripts.py
│   └── groq.env.example
└── web/                               # Next.js 16 dashboard
    ├── app/
    ├── components/
    ├── lib/
    └── package.json
```

## How time is calculated

Time between consecutive prompts is summed up. If two prompts are more than **10 minutes apart** (idle cap), that gap counts as 10 minutes — so breaks don't inflate your numbers. A standalone prompt counts as 2 minutes.

## License

Personal project — use it however you like.
