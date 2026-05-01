# Claude Code Time Tracker

Claude Code'da sarflangan vaqtni **loyiha bo'yicha** kuzatadigan shaxsiy asbob.

Har bir prompt yuborilganda hook ishga tushadi va CSV'ga qator yoziladi. Next.js dashboard CSV'ni o'qib kunlik / haftalik / oylik hisobotlarni ko'rsatadi. Ixtiyoriy ravishda Groq LLM har bir sessiya uchun qisqa mavzu sarlavhasini yaratadi.

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
                          (ixtiyoriy) Groq → mavzu xulosalari
```

## Arxitektura

- **`scripts/log-prompt.sh`** — Claude Code `UserPromptSubmit` hook'i. Har bir prompt uchun CSV'ga qator qo'shadi: `timestamp_utc, session_id, cwd, prompt_excerpt`.
- **`scripts/project-time`** — terminaldan hisobot chiqaradigan Python CLI (Groq xulosalari bilan).
- **`scripts/backfill-from-transcripts.py`** — eski Claude Code transcript'laridan (`~/.claude/projects`) CSV'ni orqaga qarab to'ldiradi.
- **`web/`** — Next.js 16 dashboard. CSV'ni o'qiydi, loyiha / kun bo'yicha vaqt taqsimoti, sessiyalar ro'yxati, eng faol loyihalar va hokazolarni ko'rsatadi.
- **`data/`** — shaxsiy CSV va cache fayllari (git'ga tushmaydi, `.gitignore`'da).

## Talablar

- macOS (yo'llar `~/Documents/projects/time-tracker` deb belgilangan — qarang [Muhim eslatma](#muhim-eslatma-yollar-qattiq-belgilangan))
- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code)
- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Python 3.10+
- `jq` (hook uchun majburiy — `brew install jq`)
- Groq API key (ixtiyoriy — mavzu xulosalari uchun)

## Muhim eslatma: yo'llar qattiq belgilangan

`scripts/project-time`, `web/lib/paths.ts` va `log-prompt.sh` loyihani quyidagi yo'lda kutadi:

```
~/Documents/projects/time-tracker
```

Klonlagandan keyin albatta shu yo'lga qo'y:

```bash
mkdir -p ~/Documents/projects
git clone <repo-url> ~/Documents/projects/time-tracker
cd ~/Documents/projects/time-tracker
```

Boshqa joyga qo'ysang `scripts/project-time` va `web/lib/paths.ts` fayllaridagi `TRACKER_ROOT` qiymatini yangilashing kerak.

## O'rnatish

### 1. Bog'liqliklar

```bash
cd ~/Documents/projects/time-tracker/web
pnpm install
```

### 2. Groq (ixtiyoriy, mavzu xulosalari uchun)

```bash
cd ~/Documents/projects/time-tracker/scripts
cp groq.env.example groq.env
# groq.env'ni och, GROQ_API_KEY qatoriga o'z key'ingni qo'y
```

Groq'siz ham dashboard ishlaydi — faqat "Mavzu" ustuni bo'sh qoladi.

### 3. Claude Code hook'ini ulash

`~/.claude/settings.json` fayliga qo'sh (yo'q bo'lsa yarat):

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

Shundan keyin har bir Claude Code prompt'i `data/project-time.csv`'ga qator yozadi.

### 4. (Ixtiyoriy) Eski transcript'lardan backfill

Avval Claude Code ishlatgan bo'lsang, eski transcript'lardan CSV'ni to'ldirishing mumkin:

```bash
python3 ~/Documents/projects/time-tracker/scripts/backfill-from-transcripts.py
```

`~/.claude/projects` va `~/Downloads/logs` ostidagi JSONL'larni skanlaydi, mavjud qatorlarni o'tkazib yuboradi.

## Ishga tushirish

### Web dashboard

```bash
cd ~/Documents/projects/time-tracker/web
pnpm dev
```

→ <http://localhost:4040>

Yuqoridagi tanlovchidan bugun / shu hafta / shu oy / butun davr oraliqlarini almashtirish mumkin. Loyiha ustiga bosib batafsil sahifaga (sessiyalar ro'yxati, kunlik taqsimot) o'tasiz.

### Terminal hisoboti

```bash
~/Documents/projects/time-tracker/scripts/project-time            # bugun
~/Documents/projects/time-tracker/scripts/project-time --week     # shu hafta
~/Documents/projects/time-tracker/scripts/project-time --help
```

## Loyiha tuzilmasi

```
time-tracker/
├── data/                              # CSV + cache (git'ga tushmaydi)
│   ├── project-time.csv
│   ├── session-topics.json
│   └── session-summaries.json
├── scripts/
│   ├── log-prompt.sh                  # Claude Code hook'i
│   ├── project-time                   # CLI hisobot
│   ├── backfill-from-transcripts.py
│   └── groq.env.example
└── web/                               # Next.js 16 dashboard
    ├── app/
    ├── components/
    ├── lib/
    └── package.json
```

## Vaqt qanday hisoblanadi

Bir prompt'dan ikkinchisigacha o'tgan vaqt qo'shiladi. Ikki prompt orasi **10 daqiqadan uzun bo'lsa** (idle cap), bu oraliq 10 daqiqa deb sanaladi — tanaffuslar vaqtni shishirmasligi uchun. Yakka prompt 2 daqiqa hisoblanadi.

## Litsenziya

Shaxsiy loyiha — xohlaganingdek foydalan.
