import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { GroupMatcher, SignupStatusSelect } from "@/components/GroupMatcher";
import { pct } from "@/lib/format";
import {
  getEventById,
  getEventSummary,
  getGroupsForEvent,
  getSignupsForEvent,
  getStore,
} from "@/lib/store";
import { updateEventStatusAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEventPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const [signups, groups, summary, store] = await Promise.all([
    getSignupsForEvent(id),
    getGroupsForEvent(id),
    getEventSummary(id),
    getStore(),
  ]);

  const signupUrl = `${siteUrl}/e/${event.slug}`;
  const surveys = store.surveys.filter((s) => s.eventId === id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-stone-800">
        ← All events
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-stone-600">{event.venue}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton text={signupUrl} />
          <Link
            href={`/e/${event.slug}`}
            target="_blank"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            Preview signup
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["recruiting", "matching", "live", "completed"] as const).map(
          (status) => (
            <form key={status} action={updateEventStatusAction.bind(null, id, status)}>
              <button
                type="submit"
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  event.status === status
                    ? "bg-teal text-white"
                    : "bg-stone-200 text-stone-700"
                }`}
              >
                {status}
              </button>
            </form>
          ),
        )}
      </div>

      {summary ? (
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="font-semibold">Organizer summary (anonymized)</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Signups" value={String(summary.totalSignups)} />
            <Stat label="Groups" value={String(summary.groupCount)} />
            <Stat
              label="Assigned"
              value={pct(summary.assignedCount, summary.totalSignups)}
            />
            <Stat
              label="Survey responses"
              value={String(summary.surveyCount)}
            />
            <Stat
              label="Met their group"
              value={pct(summary.metGroupYes, summary.surveyCount)}
            />
            <Stat
              label="Easier to attend"
              value={pct(summary.easierYes, summary.surveyCount)}
            />
            <Stat
              label="Felt comfortable"
              value={pct(summary.comfortableYes, summary.surveyCount)}
            />
            <Stat
              label="Would use again"
              value={pct(summary.wouldUseAgain, summary.surveyCount)}
            />
          </dl>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">
          Signups ({signups.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Arrival</th>
                <th className="px-4 py-3">Prefs</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Survey</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="px-4 py-3 font-medium">{s.firstName}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {s.email}
                    {s.phone ? ` · ${s.phone}` : ""}
                  </td>
                  <td className="px-4 py-3">{s.arrivalTime}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {s.preferredGroupSize}
                    {s.comfortPreferences.length
                      ? ` · ${s.comfortPreferences.join(", ")}`
                      : ""}
                    {s.willingConnector ? " · connector" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <SignupStatusSelect signupId={s.id} status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <CopyLinkButton
                      text={`${siteUrl}/survey/${s.surveyToken}`}
                      label="Survey link"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <GroupMatcher
          eventId={id}
          signups={signups}
          groups={groups}
          meetingPoint={event.meetingPoint}
        />
      </section>

      {surveys.length > 0 ? (
        <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="font-semibold">Survey comments</h2>
          <ul className="mt-4 space-y-3">
            {surveys
              .filter((s) => s.comments)
              .map((s) => (
                <li
                  key={s.signupId}
                  className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700"
                >
                  {s.comments}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold text-stone-900">{value}</dd>
    </div>
  );
}
