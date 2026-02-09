# n8n Workflow Setup für Podcast Creator → Jogg.ai

## Schnellstart

### 1. Workflow importieren

1. Öffne n8n (lokal oder Cloud)
2. Gehe zu **Workflows** → **Import from File**
3. Wähle `podcast-to-joggai.json` aus diesem Ordner

### 2. Webhook URL kopieren

Nach dem Import:
1. Klicke auf den **"Webhook - Script Export"** Node
2. Kopiere die **Production URL** (z.B. `https://your-n8n.app.n8n.cloud/webhook/podcast-export`)
3. Füge diese URL in der Podcast Creator App unter **Einstellungen** ein

---

## Workflow Optionen

### Option A: Mit Browserless.io (Automatisch)

Für vollautomatische Jogg.ai Integration:

1. **Browserless.io Account erstellen:**
   - Gehe zu [browserless.io](https://browserless.io)
   - Erstelle einen Account (Free Tier verfügbar)
   - Kopiere deinen API Key

2. **In n8n konfigurieren:**
   - Gehe zu **Settings** → **Variables**
   - Füge hinzu: `BROWSERLESS_API_KEY` = dein API Key

3. **Jogg.ai Authentication:**
   - Da Jogg.ai Login erfordert, musst du entweder:
     - Cookies aus deinem Browser exportieren
     - Oder den Browserless Node anpassen für Login

### Option B: Mit Benachrichtigungen (Manuell)

Wenn du kein Browserless nutzt:

1. **Telegram Benachrichtigung aktivieren:**
   - Erstelle einen Telegram Bot via @BotFather
   - Setze `TELEGRAM_CHAT_ID` und `TELEGRAM_BOT_TOKEN` in n8n Variables
   - Aktiviere den "Telegram Notification" Node (Rechtsklick → Enable)

2. **Email Benachrichtigung aktivieren:**
   - Konfiguriere SMTP in n8n (Settings → Credentials → SMTP)
   - Setze `NOTIFICATION_EMAIL` in n8n Variables
   - Aktiviere den "Email Notification" Node

---

## Umgebungsvariablen

Setze diese in n8n unter **Settings** → **Variables**:

| Variable | Beschreibung | Beispiel |
|----------|-------------|----------|
| `BROWSERLESS_API_KEY` | Browserless.io API Key | `abc123...` |
| `TELEGRAM_CHAT_ID` | Deine Telegram Chat ID | `123456789` |
| `NOTIFICATION_EMAIL` | Email für Benachrichtigungen | `you@example.com` |

---

## Workflow Ablauf

```
┌─────────────────┐
│  Podcast App    │
│  exportiert     │
│  Script         │
└────────┬────────┘
         │ POST /webhook/podcast-export
         ▼
┌─────────────────┐
│  Webhook        │
│  empfängt       │
│  Script Data    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Format Script  │
│  für Jogg.ai    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Browserless vorhanden?             │
├──────────────┬──────────────────────┤
│     JA       │         NEIN         │
│      │       │          │           │
│      ▼       │          ▼           │
│ Browserless  │   Speichere Script   │
│ → Jogg.ai    │   + Notification     │
└──────────────┴──────────────────────┘
```

---

## Jogg.ai Browser Automation Details

Der Browserless Node versucht:

1. `https://app.jogg.ai/video-podcast` zu öffnen
2. Login-Status zu prüfen
3. Script in das Textfeld einzufügen
4. Screenshot zur Verifizierung zu erstellen

**Hinweis:** Du musst möglicherweise den Puppeteer-Code anpassen, je nach Jogg.ai UI-Änderungen.

---

## Troubleshooting

### Webhook funktioniert nicht
- Stelle sicher, dass der Workflow **aktiviert** ist (Toggle oben rechts)
- Prüfe, ob die URL korrekt in der App eingetragen ist
- Teste mit: `curl -X POST https://your-webhook-url -H "Content-Type: application/json" -d '{"script":"Test"}'`

### Browserless Fehler
- Prüfe API Key in den Variables
- Erhöhe das Timeout im HTTP Request Node
- Schau in die Browserless Logs

### Keine Benachrichtigungen
- Prüfe ob die Nodes aktiviert sind (nicht grau)
- Teste Telegram/Email Credentials separat

---

## Erweiterungsmöglichkeiten

1. **Voice Cloning**: Füge einen Node hinzu, der Audiosamples an Jogg.ai sendet
2. **Avatar Upload**: Automatisches Hochladen von Avatarfotos
3. **Status Webhook**: Sende Status-Updates zurück an die App
4. **Queue System**: Füge eine Warteschlange für mehrere Scripts hinzu
