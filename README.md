# Claude Code Time Tracker

Claude Code'da harcanan zamanı **proje bazında** takip eden kişisel bir araç.

Her prompt gönderildiğinde bir hook tetiklenir, satır CSV'ye yazılır. Next.js dashboard CSV'yi okuyup günlük / haftalık / aylık raporlar gösterir. Opsiyonel olarak Groq LLM her oturum için kısa bir konu başlığı üretir.

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
                          (opsiyonel) Groq → konu özetleri
```

## Mimari

- **`scripts/log-prompt.sh`** — Claude Code `UserPromptSubmit` hook'u. Her prompt için CSV'ye satır ekler: `timestamp_utc, session_id, cwd, prompt_excerpt`.
- **`scripts/project-time`** — terminalden rapor üreten Python CLI (Groq özetiyle).
- **`scripts/backfill-from-transcripts.py`** — eski Claude Code transcript'lerinden (`~/.claude/projects`) CSV'yi geriye dönük doldurur.
- **`web/`** — Next.js 16 dashboard. CSV'yi okur, proje / gün bazında zaman dağılımı, oturum listesi, top projeler vs. gösterir.
- **`data/`** — kişisel CSV ve cache dosyaları (git'e gitmez, `.gitignore`'da).

## Gereksinimler

- macOS (yollar `~/Documents/projects/time-tracker` varsayar — bkz. [Önemli not](#önemli-not-yollar-sabit))
- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code)
- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Python 3.10+
- `jq` (hook için zorunlu — `brew install jq`)
- Groq API key (opsiyonel — konu özetleri için)

## Önemli not: yollar sabit

Hem `scripts/project-time`, hem `web/lib/paths.ts`, hem `log-prompt.sh` projeyi şu yolda bekler:

```
~/Documents/projects/time-tracker
```

Klonladıktan sonra mutlaka bu yola koy:

```bash
mkdir -p ~/Documents/projects
git clone <repo-url> ~/Documents/projects/time-tracker
cd ~/Documents/projects/time-tracker
```

Başka yere koyarsan `scripts/project-time` ve `web/lib/paths.ts` dosyalarındaki `TRACKER_ROOT` sabitini güncellemen gerekir.

## Kurulum

### 1. Bağımlılıklar

```bash
cd ~/Documents/projects/time-tracker/web
pnpm install
```

### 2. Groq (opsiyonel, konu özetleri için)

```bash
cd ~/Documents/projects/time-tracker/scripts
cp groq.env.example groq.env
# groq.env aç, GROQ_API_KEY satırına kendi key'ini koy
```

Groq olmadan da dashboard çalışır — sadece "Konu" kolonu boş kalır.

### 3. Claude Code hook'unu bağla

`~/.claude/settings.json` dosyana ekle (yoksa oluştur):

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

Sonrasında her Claude Code prompt'u `data/project-time.csv`'ye satır yazar.

### 4. (Opsiyonel) Geçmiş transcript'lerden backfill

Daha önce Claude Code kullanıyorsan eski transcript'lerden CSV'yi doldurabilirsin:

```bash
python3 ~/Documents/projects/time-tracker/scripts/backfill-from-transcripts.py
```

`~/.claude/projects` ve `~/Downloads/logs` altındaki JSONL'leri tarar, var olan satırları atlar.

## Çalıştırma

### Web dashboard

```bash
cd ~/Documents/projects/time-tracker/web
pnpm dev
```

→ <http://localhost:4040>

Üstteki seçiciyle bugün / bu hafta / bu ay / tüm zaman aralıklarını değiştirebilirsin. Bir projeye tıklayarak detay sayfasına (oturum listesi, günlük dağılım) gidebilirsin.

### Terminal raporu

```bash
~/Documents/projects/time-tracker/scripts/project-time            # bugün
~/Documents/projects/time-tracker/scripts/project-time --week     # bu hafta
~/Documents/projects/time-tracker/scripts/project-time --help
```

## Proje yapısı

```
time-tracker/
├── data/                              # CSV + cache (git'e gitmez)
│   ├── project-time.csv
│   ├── session-topics.json
│   └── session-summaries.json
├── scripts/
│   ├── log-prompt.sh                  # Claude Code hook
│   ├── project-time                   # CLI rapor
│   ├── backfill-from-transcripts.py
│   └── groq.env.example
└── web/                               # Next.js 16 dashboard
    ├── app/
    ├── components/
    ├── lib/
    └── package.json
```

## Süre nasıl hesaplanıyor

Bir prompt'tan diğerine geçen süre toplanır. İki prompt arası **10 dakikadan uzunsa** (idle cap) o ara 10 dk olarak sayılır — molalar süreyi şişirmesin diye. Tek başına bir prompt 2 dk sayılır.

## Lisans

Kişisel proje — istediğin gibi kullan.
