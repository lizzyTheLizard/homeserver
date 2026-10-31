# Wichteln

Kleine Next.js-App zum anonymen Wichteln. Alle Daten liegen in PostgreSQL; die Tabellen
werden beim Start automatisch aus den Migrationen in [`db/`](db) angelegt.

## Konfiguration

Die App liest ihre gesamte Konfiguration aus der Umgebung und startet nicht ohne sie:

| Variable | Beschreibung |
| --- | --- |
| `DB_CONNECTION_STRING` | PostgreSQL-Verbindung, z. B. `postgres://homeserver:homeserver@postgresdev:5432/wichteln?sslmode=disable` |
| `SESSION_SECRET` | Geheimnis zum Signieren der Session-Cookies (mindestens 32 Zeichen) |
| `ADMIN_USER` | Benutzername des Admin-Bereichs |
| `ADMIN_PASSWORD` | Passwort des Admin-Bereichs |

## Start

```bash
pnpm install

export DB_CONNECTION_STRING="postgres://homeserver:homeserver@postgresdev:5432/wichteln?sslmode=disable"
export SESSION_SECRET="$(openssl rand -hex 32)"
export ADMIN_USER=admin
export ADMIN_PASSWORD="bitte-aendern"

pnpm --filter @homeserver/wichteln dev    # Entwicklung: http://localhost:3000
pnpm --filter @homeserver/wichteln build  # Produktion bauen
pnpm --filter @homeserver/wichteln start  # Produktion starten
pnpm --filter @homeserver/wichteln test   # Unit- und Datenbanktests
```

Die Migrationen laufen beim ersten Datenbankzugriff. Es gibt keine Datei mehr, in der
Anwendungsdaten oder Secrets abgelegt werden.

## Ablauf

1. **Admin** meldet sich auf der Startseite mit `ADMIN_USER` / `ADMIN_PASSWORD` an,
   erstellt eine Gruppe und gibt die Namen der Teilnehmenden ein. Für jede Person wird
   ein Passwort erzeugt („Alle Zugangsdaten kopieren“ zum Verteilen).
2. **Phase 1:** Teilnehmende melden sich mit Name + Passwort an und tragen ihren Wunsch
   (Titel + Beschreibung) ein; sie können ihn bis zum Start von Phase 2 ändern.
   Der Admin sieht nur, *wer* schon einen Wunsch eingetragen hat.
3. Sind alle Wünsche da, startet der Admin **Phase 2**.
4. Teilnehmende sehen die noch freien Wünsche der anderen (ohne Absender) und wählen einen.
   Der eigene Wunsch wird nie angeboten, und es werden nur Wünsche angezeigt, bei denen
   alle Übrigen danach noch einen fremden Wunsch bekommen können – niemand bleibt also
   am Ende mit dem eigenen Wunsch übrig. Der Admin sieht nur, *wer* schon gewählt hat.
