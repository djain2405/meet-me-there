# Meet Me There

A lean pilot toolkit for matching people attending events alone into small groups before an event. Organizers share a signup link; you manage matching, coordination, and feedback from an admin dashboard.

**Works out of the box** — no database setup required. Demo data seeds automatically on first run.

## Quick start

```bash
nvm use 20
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000

| Page | URL |
|------|-----|
| Marketing / demo home | `/` |
| Demo attendee signup | `/e/riverside-summer-social` |
| Admin dashboard | `/admin/login` (password: `demo`) |

## What organizers get

Share a single link (e.g. in a confirmation email or on the event page):

```
https://yoursite.com/e/your-event-slug
```

Attendees complete a signup form with arrival time, preferences, and safety acknowledgments. Ticketing stays with the organizer.

## What you manage (operator)

1. **Create events** — name, date, venue, public meeting point, ticket URL
2. **Review signups** — contact info, preferences, connector volunteers
3. **Match groups** — assign attendees into groups of 3–5, set meeting details and chat links
4. **Send survey links** — copy per-attendee feedback URLs after the event
5. **Share results** — anonymized summary metrics for the organizer

## Pilot workflow

| When | Action |
|------|--------|
| 1–2 weeks before | Create event, share signup link |
| 3–5 days before | Review signups, start matching |
| 24–48 hours before | Finalize groups, send meeting instructions |
| Event day | Send reminder (manual for now) |
| After event | Distribute survey links, review feedback |
| Within 1 week | Share organizer summary from admin |

## Deploy

```bash
npm run build
```

Set `ADMIN_PASSWORD` and `NEXT_PUBLIC_SITE_URL` in your hosting environment. Data persists in `data/store.json` on the server filesystem — for production at scale, plan a database migration.

## Tech

- Next.js 16 · React 19 · Tailwind CSS 4
- File-based JSON store (zero-config demo)
- Server actions for forms and admin operations
