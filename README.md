# Meet Me There

A lean pilot toolkit for matching people attending events alone into small groups before an event. Organizers share a signup link; you manage matching, coordination, and feedback from an admin dashboard.

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
| Marketing home | `/` |
| Privacy | `/privacy` |
| Admin dashboard | `/admin/login` (local default password: `demo`) |

Local development uses a SQLite file at `data/meet-me-there.db` and seeds demo data automatically. Production uses Turso and does **not** seed demo data.

## What organizers get

Share a single link (e.g. in a confirmation email or on the event page):

```
https://meet-me-there.vercel.app/e/your-event-slug
```

Attendees complete a signup form with arrival time, preferences, and safety acknowledgments. Ticketing stays with the organizer. Signups land in **your** admin dashboard — organizers only promote the link.

## What you manage (operator)

1. **Create events:** name, date, venue, public meeting point, ticket URL
2. **Review signups:** contact info, preferences, connector volunteers
3. **Match groups:** assign attendees into groups of 3 to 5, set meeting details and chat links
4. **Email attendees manually:** send meetup details from your inbox using admin data
5. **Send survey links:** copy per-attendee feedback URLs after the event
6. **Share results:** anonymized summary metrics for the organizer

## Pilot workflow (manual email)

| When | Action |
|------|--------|
| Setup | Create event in `/admin`, copy signup URL, send to organizer with paste blurb |
| Link posted | Confirm test signup appears in admin |
| 3 to 5 days before | Review signups, create groups, assign people |
| 24 to 48 hours before | Email each group: meeting time, public spot, optional chat link, connector name |
| Event day | Optional reminder email |
| After event | Email survey links; share anonymized summary with organizer |

### Suggested group email template

```
Hi [names]!

You're matched for [Event] with Meet Me There.

Meet at: [meeting location]
Time: [meeting time]
[Optional: chat link]

[Connector] will help with the first hello. Public spot, no pressure — leave anytime.

See you there,
Divya / Meet Me There
```

## Deploy (Vercel + Turso)

1. Create a Turso database and copy the URL + auth token.
2. In Vercel project env vars, set:
   - `ADMIN_PASSWORD` (strong, required)
   - `NEXT_PUBLIC_SITE_URL=https://meet-me-there.vercel.app`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. Deploy (`git push` or `vercel --prod`).
4. Log into `/admin/login`, create the real event, smoke-test signup → admin.

```bash
npm run build
```

## Tech

- Next.js 16 · React 19 · Tailwind CSS 4
- Turso / libSQL (local SQLite file in development)
- Server actions for forms and admin operations
