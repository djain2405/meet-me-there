import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { formatEventDate } from "@/lib/format";
import { isPastOrClosed, showAlreadyHappened } from "@/lib/registration";
import type { PilotEvent } from "@/lib/types";
import { listCommunications } from "@/lib/emailQueue";
import { eventOperations, sourceTotals, sumPageCounts } from "@/lib/growth";
import {
  getGroupsForEvent,
  getOrganizerById,
  getSignupsForEvent,
  listEvents,
} from "@/lib/store";
import {
  attachEventAction,
  createNextEventAction,
  detachEventAction,
  updateOrganizerAction,
} from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function OrganizerDetailPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const organizer = await getOrganizerById(id);
  if (!organizer) notFound();

  const events = await listEvents();
  const attached = events.filter((event) => event.organizerId === organizer.id);
  const available = events.filter((event) => event.organizerId !== organizer.id);
  const upcoming = attached
    .filter((event) => !isPastOrClosed(event))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const past = attached
    .filter((event) => isPastOrClosed(event))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  const createNextEventId = upcoming.length > 0 ? undefined : past[0]?.id;
  const publicUrl = `${siteUrl}/c/${organizer.slug}`;
  const eventIds = attached.map((event) => event.id);
  const [organizerCounts, eventCounts, bundles] = await Promise.all([
    sumPageCounts("organizer", [organizer.id]),
    sumPageCounts("event", eventIds),
    Promise.all(
      attached.map(async (event) => {
        const [signups, groups, communications] = await Promise.all([
          getSignupsForEvent(event.id),
          getGroupsForEvent(event.id),
          listCommunications(event.id),
        ]);
        return { signups, groups, communications };
      }),
    ),
  ]);
  const operations = bundles.reduce(
    (total, bundle) => {
      const next = eventOperations(bundle.signups, bundle.groups, bundle.communications);
      return {
        signups: total.signups + next.signups,
        coming: total.coming + next.coming,
        declined: total.declined + next.declined,
        unassigned: total.unassigned + next.unassigned,
        crews: total.crews + next.crews,
        crewsUnderMinimum: total.crewsUnderMinimum + next.crewsUnderMinimum,
        queued: total.queued + next.queued,
        sent: total.sent + next.sent,
        failed: total.failed + next.failed,
      };
    },
    {
      signups: 0,
      coming: 0,
      declined: 0,
      unassigned: 0,
      crews: 0,
      crewsUnderMinimum: 0,
      queued: 0,
      sent: 0,
      failed: 0,
    },
  );
  const sources = sourceTotals(bundles.flatMap((bundle) => bundle.signups));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/admin/organizers" className="text-sm text-stone-500 hover:text-stone-800">
        ← All organizers
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{organizer.name}</h1>
      <p className="mt-2 break-all text-sm text-stone-600">{publicUrl}</p>
      <div className="mt-3 flex gap-2">
        <CopyLinkButton text={publicUrl} label="Copy page link" />
        <a
          href={`/admin/qr?download=1&url=${encodeURIComponent(publicUrl)}`}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
        >
          Download QR
        </a>
        <Link
          href={`/admin/organizers/${organizer.id}/card`}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
        >
          Print card
        </Link>
        <Link
          href={`/c/${organizer.slug}`}
          target="_blank"
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
        >
          Preview
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "slug"
            ? "That event URL is already in use."
            : "Date and URL slug are required."}
        </p>
      ) : null}

      <form
        action={updateOrganizerAction}
        className="mt-8 grid gap-3 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2"
      >
        <h2 className="font-semibold sm:col-span-2">Organizer details</h2>
        <p className="text-sm text-stone-500 sm:col-span-2">
          The public URL stays <span className="font-medium">/c/{organizer.slug}</span>.
        </p>
        <input type="hidden" name="id" value={organizer.id} />
        <input
          name="name"
          required
          defaultValue={organizer.name}
          className="rounded-xl border border-stone-300 px-3 py-2"
        />
        <input
          name="city"
          defaultValue={organizer.city}
          placeholder="City"
          className="rounded-xl border border-stone-300 px-3 py-2"
        />
        <input
          name="contactEmail"
          type="email"
          defaultValue={organizer.contactEmail}
          placeholder="Contact email"
          className="rounded-xl border border-stone-300 px-3 py-2"
        />
        <input
          name="websiteUrl"
          defaultValue={organizer.websiteUrl}
          placeholder="Official website"
          className="rounded-xl border border-stone-300 px-3 py-2"
        />
        <textarea
          name="description"
          defaultValue={organizer.description}
          rows={3}
          placeholder="Short community description"
          className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
        />
        <input
          name="defaultMeetingPoint"
          defaultValue={organizer.defaultMeetingPoint}
          placeholder="Default meeting point for new events"
          className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
        />
        <textarea
          name="defaultAttendeeInstructions"
          defaultValue={organizer.defaultAttendeeInstructions}
          rows={2}
          placeholder="Default attendee instructions for new events"
          className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
        />
        <input
          name="defaultTimezone"
          defaultValue={organizer.defaultTimezone}
          placeholder="Default time zone, e.g. America/Los_Angeles"
          className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
        />
        <button
          type="submit"
          className="rounded-xl bg-teal px-4 py-2 font-semibold text-white sm:col-span-2"
        >
          Save details
        </button>
      </form>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Activity</h2>
        <dl className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
          <div>Organizer page loads: {organizerCounts.page_load}</div>
          <div>Event page loads: {eventCounts.page_load}</div>
          <div>Registration starts: {eventCounts.registration_start}</div>
          <div>Signups: {operations.signups}</div>
          <div>I&apos;m coming: {operations.coming}</div>
          <div>Declined: {operations.declined}</div>
          <div>Unassigned: {operations.unassigned}</div>
          <div>Crews: {operations.crews}</div>
          <div>Crews under 3: {operations.crewsUnderMinimum}</div>
          <div>Mail queued / sent / failed: {operations.queued} / {operations.sent} / {operations.failed}</div>
        </dl>
        <h3 className="mt-6 font-medium">Signup sources</h3>
        {sources.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No signups yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-stone-600">
            {sources.map((item) => (
              <li key={item.source}>
                {item.source}: {item.count}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Events</h2>
        <form action={attachEventAction} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="organizerId" value={organizer.id} />
          <select
            name="eventId"
            required
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Attach an existing event
            </option>
            {available.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} · {event.date}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium"
          >
            Attach
          </button>
        </form>

        <EventGroup
          title="Upcoming"
          empty="No upcoming events."
          events={upcoming}
          organizerId={organizer.id}
          showCreateNext
        />
        <EventGroup
          title="Past and closed"
          empty="No past or closed events."
          events={past}
          organizerId={organizer.id}
          createNextEventId={createNextEventId}
        />
      </section>
    </main>
  );
}

function EventGroup({
  title,
  empty,
  events,
  organizerId,
  showCreateNext = false,
  createNextEventId,
}: {
  title: string;
  empty: string;
  events: PilotEvent[];
  organizerId: string;
  showCreateNext?: boolean;
  createNextEventId?: string;
}) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="font-medium hover:text-teal-dark"
                  >
                    {event.name}
                  </Link>
                  <p className="text-sm text-stone-500">
                    {formatEventDate(event.date, event.startTime)} · /e/{event.slug}
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
                <form action={detachEventAction}>
                  <input type="hidden" name="organizerId" value={organizerId} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <button type="submit" className="text-sm text-stone-500 underline">
                    Remove from organizer
                  </button>
                </form>
              </div>
              {showCreateNext || event.id === createNextEventId ? (
                <form action={createNextEventAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="organizerId" value={organizerId} />
                  <input type="hidden" name="sourceEventId" value={event.id} />
                  <input
                    name="date"
                    type="date"
                    required
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                  />
                  <input
                    name="slug"
                    required
                    placeholder="new url slug"
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Create next event
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
