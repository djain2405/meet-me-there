import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { formatEventDate } from "@/lib/format";
import type { Organizer, PilotEvent } from "@/lib/types";
import {
  isPastOrClosed,
  isUpcomingPublicEvent,
  showAlreadyHappened,
} from "@/lib/registration";
import {
  getStore,
  listDuplicateSignups,
  listOrganizers,
} from "@/lib/store";
import { createEventAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

type Props = { searchParams: Promise<{ organizer?: string; error?: string }> };

export default async function AdminHomePage({ searchParams }: Props) {
  await requireAdmin();
  const { organizer: organizerFilter, error } = await searchParams;
  const [store, organizers, duplicates] = await Promise.all([
    getStore(),
    listOrganizers(),
    listDuplicateSignups(),
  ]);

  const events = store.events.filter((event) => {
    if (!organizerFilter) return true;
    if (organizerFilter === "none") return !event.organizerId;
    return event.organizerId === organizerFilter;
  });
  const upcomingEvents = events
    .filter((event) => !isPastOrClosed(event))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const pastEvents = events
    .filter((event) => isPastOrClosed(event))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  const visibleIds = new Set(events.map((event) => event.id));
  const upcoming = events.filter((event) => isUpcomingPublicEvent(event));

  const attention: { href: string; text: string }[] = [];
  for (const event of upcoming) {
    const signups = store.signups.filter((signup) => signup.eventId === event.id);
    const unassigned = signups.filter(
      (signup) =>
        !signup.groupId &&
        signup.status !== "declined" &&
        signup.status !== "no-show",
    );
    if (unassigned.length > 0) {
      attention.push({
        href: `/admin/events/${event.id}`,
        text: `${event.name}: ${unassigned.length} unassigned`,
      });
    }
    const declinedInCrew = signups.filter(
      (signup) => signup.status === "declined" && signup.groupId,
    );
    if (declinedInCrew.length > 0) {
      attention.push({
        href: `/admin/events/${event.id}`,
        text: `${event.name}: ${declinedInCrew.length} declined and still in a crew`,
      });
    }
  }
  for (const duplicate of duplicates) {
    if (!visibleIds.has(duplicate.eventId)) continue;
    const event = store.events.find((item) => item.id === duplicate.eventId);
    attention.push({
      href: `/admin/events/${duplicate.eventId}`,
      text: `${event?.name ?? "Event"}: ${duplicate.count} signups share ${duplicate.email}`,
    });
  }

  const unassignedCount = upcoming.reduce((total, event) => {
    return (
      total +
      store.signups.filter(
        (signup) =>
          signup.eventId === event.id &&
          !signup.groupId &&
          signup.status !== "declined" &&
          signup.status !== "no-show",
      ).length
    );
  }, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-stone-600">
          Upcoming events and signups that need a crew.
        </p>
      </div>

      {error === "missing-fields" ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Fill in the event name, URL, date, venue, and meeting point.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming events" value={String(upcoming.length)} />
        <Stat label="Unassigned" value={String(unassignedCount)} />
        <Stat label="Needs attention" value={String(attention.length)} />
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Attention needed</h2>
        {attention.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Nothing waiting right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {attention.map((item) => (
              <li key={item.text}>
                <Link href={item.href} className="text-sm text-teal-dark underline">
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="mt-8 flex flex-wrap items-end gap-3" action="/admin">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-stone-700">Organizer</span>
          <select
            name="organizer"
            defaultValue={organizerFilter ?? ""}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2"
          >
            <option value="">All organizers</option>
            <option value="none">Needs an organizer</option>
            {organizers.map((organizer) => (
              <option key={organizer.id} value={organizer.id}>
                {organizer.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium"
        >
          Filter
        </button>
      </form>

      <EventSection
        title="Upcoming"
        empty="No upcoming events."
        events={upcomingEvents}
        organizers={organizers}
        siteUrl={siteUrl}
      />
      <EventSection
        title="Past and closed"
        empty="No past or closed events."
        events={pastEvents}
        organizers={organizers}
        siteUrl={siteUrl}
      />

      <div className="mb-10 mt-10 rounded-2xl border border-stone-200 bg-white p-6">
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
            placeholder="url slug *"
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
            placeholder="Public meeting point (organizer default if blank)"
            className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
          />
          <input
            name="ticketUrl"
            placeholder="Organizer ticket URL"
            className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
          />
          <select
            name="organizerId"
            defaultValue=""
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 sm:col-span-2"
          >
            <option value="">No organizer yet</option>
            {organizers.map((organizer) => (
              <option key={organizer.id} value={organizer.id}>
                {organizer.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-coral px-4 py-2 font-semibold text-white sm:col-span-2"
          >
            Create event
          </button>
        </form>
      </div>
    </main>
  );
}

function EventSection({
  title,
  empty,
  events,
  organizers,
  siteUrl,
}: {
  title: string;
  empty: string;
  events: PilotEvent[];
  organizers: Organizer[];
  siteUrl: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-semibold">{title}</h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">{empty}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {events.map((event) => {
            const organizer = organizers.find((item) => item.id === event.organizerId);
            const signupUrl = `${siteUrl}/e/${event.slug}`;
            return (
              <article
                key={event.id}
                className="rounded-2xl border border-stone-200 bg-white p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="hover:text-teal-dark"
                      >
                        {event.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-stone-500">
                      {formatEventDate(event.date, event.startTime)}
                      {organizer ? ` · ${organizer.name}` : " · No organizer"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize">
                        {event.status}
                      </span>
                      {showAlreadyHappened(event) ? (
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          Already happened
                        </span>
                      ) : null}
                    </div>
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
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}
