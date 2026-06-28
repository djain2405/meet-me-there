import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { DEMO_EVENT_SLUG } from "@/lib/demo";
import { formatEventDate } from "@/lib/format";
import { listEvents } from "@/lib/store";
import { createEventAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

export default async function AdminHomePage() {
  await requireAdmin();
  const events = await listEvents();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="mt-1 text-stone-600">
            Create events and share signup links with organizers.
          </p>
        </div>
        <Link
          href={`/e/${DEMO_EVENT_SLUG}`}
          className="text-sm text-teal-dark underline"
          target="_blank"
        >
          Preview demo signup page →
        </Link>
      </div>

      <div className="mb-10 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Create new event</h2>
        <form action={createEventAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            placeholder="Event name *"
            required
            className="rounded-xl border border-stone-300 px-3 py-2"
          />
          <input
            name="slug"
            placeholder="url-slug *"
            required
            className="rounded-xl border border-stone-300 px-3 py-2"
          />
          <input
            name="date"
            type="date"
            required
            className="rounded-xl border border-stone-300 px-3 py-2"
          />
          <input
            name="startTime"
            placeholder="Start time (e.g. 6:00 PM)"
            className="rounded-xl border border-stone-300 px-3 py-2"
          />
          <input
            name="venue"
            placeholder="Venue *"
            required
            className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
          />
          <input
            name="meetingPoint"
            placeholder="Public meeting point *"
            required
            className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
          />
          <input
            name="ticketUrl"
            placeholder="Organizer ticket URL"
            className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-xl bg-coral px-4 py-2 font-semibold text-white sm:col-span-2"
          >
            Create event
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {events.map((event) => {
          const signupUrl = `${siteUrl}/e/${event.slug}`;
          return (
            <article
              key={event.id}
              className="rounded-2xl border border-stone-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="hover:text-teal-dark"
                    >
                      {event.name}
                    </Link>
                  </h2>
                  <p className="text-sm text-stone-500">
                    {formatEventDate(event.date, event.startTime)}
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize">
                    {event.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CopyLinkButton text={signupUrl} label="Copy signup link" />
                  <Link
                    href={`/e/${event.slug}`}
                    target="_blank"
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
