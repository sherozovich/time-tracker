#!/usr/bin/env python3
"""Claude Code transcript JSONL'lerinden CSV'yi backfill et.

Kaynak klasörler:
- ~/Downloads/logs           (eski Mac'ten kopyalanan)
- ~/.claude/projects         (bu Mac'in aktif transcript'leri)

Her user prompt'unu (timestamp, session_id, cwd, prompt_excerpt) olarak
CSV'ye ekler. Var olan (session_id, timestamp) kombinasyonları atlanır.
Subagent transcript'leri atlanır. Tool-result mesajları atlanır.
"""
from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

CSV_PATH = Path.home() / "Documents/projects/time-tracker/data/project-time.csv"
SOURCES = [
    Path.home() / "Downloads" / "logs",
    Path.home() / ".claude" / "projects",
]
PROMPT_CHAR_CAP = 400


def parse_ts(raw: str) -> str | None:
    """ISO timestamp -> 'YYYY-MM-DDTHH:MM:SSZ' formatına normalize et."""
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (ValueError, AttributeError):
        return None


def extract_user_text(message) -> str | None:
    """user message'ın content'inden asıl prompt metnini çıkar. Tool result ise None döner."""
    if not isinstance(message, dict):
        return None
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        # İlk text block'u al. tool_result block'ları atla.
        for c in content:
            if not isinstance(c, dict):
                continue
            if c.get("type") == "tool_result":
                return None  # bu bir tool cevabı, kullanıcı prompt'u değil
            if c.get("type") == "text":
                return c.get("text", "")
    return None


def load_existing_keys() -> set[tuple[str, str]]:
    keys: set[tuple[str, str]] = set()
    if not CSV_PATH.exists():
        return keys
    with CSV_PATH.open(newline="") as f:
        for row in csv.reader(f):
            if len(row) >= 2:
                keys.add((row[1], row[0]))
    return keys


def load_existing_rows() -> list[list[str]]:
    if not CSV_PATH.exists():
        return []
    with CSV_PATH.open(newline="") as f:
        return [row for row in csv.reader(f)]


def iter_transcripts(roots: list[Path]):
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*.jsonl"):
            # subagent transcript'lerini atla — ana oturumlarla duplikasyon olmasın
            if "subagents" in path.parts:
                continue
            yield path


def main() -> int:
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing = load_existing_keys()
    print(f"Mevcut CSV'de {len(existing)} satır var.")

    new_rows: list[tuple[str, str, str, str]] = []
    scanned_files = 0
    seen_in_run: set[tuple[str, str]] = set()

    for jsonl in iter_transcripts(SOURCES):
        scanned_files += 1
        try:
            with jsonl.open() as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        d = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if d.get("type") != "user":
                        continue
                    ts = parse_ts(d.get("timestamp", ""))
                    sid = d.get("sessionId", "")
                    cwd = d.get("cwd", "")
                    if not (ts and sid and cwd):
                        continue
                    prompt = extract_user_text(d.get("message"))
                    if not prompt or not prompt.strip():
                        continue
                    key = (sid, ts)
                    if key in existing or key in seen_in_run:
                        continue
                    seen_in_run.add(key)
                    excerpt = prompt[:PROMPT_CHAR_CAP]
                    new_rows.append((ts, sid, cwd, excerpt))
        except OSError as e:
            print(f"  [uyarı] {jsonl}: {e}", file=sys.stderr)

    print(f"{scanned_files} JSONL taradı, {len(new_rows)} yeni prompt buldu.")

    if not new_rows:
        print("Eklenecek yeni veri yok.")
        return 0

    # Mevcut satırları + yenileri timestamp'e göre sırala, CSV'yi yeniden yaz
    old_rows = load_existing_rows()
    all_rows: list[tuple[str, ...]] = []
    for r in old_rows:
        if len(r) >= 3:
            all_rows.append(tuple(r))
    for r in new_rows:
        all_rows.append(r)

    all_rows.sort(key=lambda r: r[0])

    # Yeniden yaz
    with CSV_PATH.open("w", newline="") as f:
        w = csv.writer(f)
        for r in all_rows:
            w.writerow(r)

    # Özet
    projects: dict[str, int] = {}
    import re
    rx = re.compile(r"^/Users/[^/]+/Documents/projects(?:/([^/]+))?")
    for r in new_rows:
        cwd = r[2]
        m = rx.match(cwd)
        proj = (m.group(1) if (m and m.group(1)) else "(projects kökü)") if m else cwd
        projects[proj] = projects.get(proj, 0) + 1

    print("\nProje başına yeni prompt sayısı:")
    for p, n in sorted(projects.items(), key=lambda x: -x[1]):
        print(f"  {p:<30s} {n:>5d}")

    # En eski ve en yeni timestamp
    ts_list = [r[0] for r in new_rows]
    print(f"\nEn eski: {min(ts_list)}")
    print(f"En yeni: {max(ts_list)}")
    print(f"\nCSV yazıldı: {CSV_PATH} ({len(all_rows)} satır)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
