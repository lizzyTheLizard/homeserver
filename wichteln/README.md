# Wichteln

Kleine Next.js-App zum anonymen Wichteln. Daten werden in `data/db.json` gespeichert.

## Start

```bash
pnpm install
cp .env.local.example .env.local   # Admin-Zugang anpassen
pnpm dev                           # Entwicklung: http://localhost:3000
pnpm build && pnpm start           # Produktion
```

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
