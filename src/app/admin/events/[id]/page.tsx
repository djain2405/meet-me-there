import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { GroupMatcher, SignupStatusSelect } from "@/components/GroupMatcher";
import { countOf, likertSummary } from "@/lib/format";
import {
  getEventById,
  getEventSummary,
  getGroupsForEvent,
  getSignupsForEvent,
  getStore,
} from "@/lib/store";
import {
  sendCrewIntroductionAction,
  updateEmailSettingsAction,
  updateEventStatusAction,
} from "@/app/admin/actions";
import { emailProviderConfigured } from "@/lib/emailDelivery";
import { listCommunications, previewCrewIntroduction } from "@/lib/emailQueue";
import { eventOperations, sourceTotals, sumPageCounts } from "@/lib/growth";
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
  const reportUrl = `${siteUrl}/r/${event.reportToken}`;
  const organizerNote = `Here is the anonymous summary for ${event.name}: ${reportUrl}. Counts and rates only. No names, emails, or comments. The page updates if more people respond.`;
  const surveys = store.surveys.filter((s) => s.eventId === id);
  const responded = new Set(surveys.map((s) => s.signupId));
  const mailReady = emailProviderConfigured();
  const communications = await listCommunications(id);
  const introductions = await Promise.all(
    groups.map(async (group) => ({
      group,
      preview: await previewCrewIntroduction(group.id),
    })),
  );
  const operations = eventOperations(signups, groups, communications);
  const sources = sourceTotals(signups);
  const pageCounts = await sumPageCounts("event", [id]);

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
          <a
            href={`/admin/qr?download=1&url=${encodeURIComponent(signupUrl)}`}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            Download QR
          </a>
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
        {(["recruiting", "matching", "live", "completed", "cancelled"] as const).map(
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

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Automatic emails</h2>
        <p className="mt-1 text-sm text-stone-600">
          Every switch stays off until you enable it for this event. Nothing is
          sent until an email provider is configured.
        </p>
        {mailReady ? null : (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Email is not configured, so these switches will not send anything.
          </p>
        )}
        <form action={updateEmailSettingsAction} className="mt-4 space-y-3">
          <input type="hidden" name="eventId" value={event.id} />
          <EmailSwitch
            name="emailSignupConfirmation"
            label="Signup confirmation, after a new registration is saved"
            checked={event.emailSignupConfirmation}
          />
          <EmailSwitch
            name="emailAttendanceAsk"
            label="Still joining? about 24 hours before, with the crew when one is assigned"
            checked={event.emailAttendanceAsk}
          />
          <EmailSwitch
            name="emailAttendanceNudge"
            label="Nudge about 12 hours before, only for people who have not answered"
            checked={event.emailAttendanceNudge}
          />
          <EmailSwitch
            name="emailGroupReminder"
            label="Group reminder 1 to 2 hours before, only for people who said they are coming and have a crew"
            checked={event.emailGroupReminder}
          />
          <button
            type="submit"
            className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white"
          >
            Save email switches
          </button>
        </form>

        <div className="mt-6 space-y-4">
          {introductions.map(({ group, preview }) => (
            <article key={group.id} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium">{group.name} introduction</h3>
                <form action={sendCrewIntroductionAction.bind(null, group.id, event.id)}>
                  <button
                    type="submit"
                    className="rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Send introduction
                  </button>
                </form>
              </div>
              {preview && preview.recipients.length > 0 ? (
                <div className="mt-3 text-sm text-stone-600">
                  <p>
                    To: {preview.recipients.map((person) => person.firstName).join(", ")}
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-xs text-stone-700">
                    {preview.messages[0]?.subject}
                    {"\n\n"}
                    {preview.messages[0]?.body}
                  </pre>
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">No active crew members yet.</p>
              )}
            </article>
          ))}
        </div>

        <h3 className="mt-6 font-medium">Send log</h3>
        {communications.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No email attempts yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {communications.map((item) => (
              <li key={item.id} className="text-sm text-stone-600">
                <span className="font-medium capitalize">{item.status}</span>
                {" · "}
                {item.kind.replaceAll("_", " ")}
                {" · "}
                {item.recipientEmail}
                {item.failureReason ? ` · ${item.failureReason}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Send surveys</h2>
        <p className="mt-1 text-sm text-stone-600">
          Each email opens with that person&apos;s own link. Their email is
          already on the signup, so the survey does not ask for it.
        </p>
        <ul className="mt-4 divide-y divide-stone-100">
          {signups.map((s) => {
            const personalUrl = `${siteUrl}/survey/${s.surveyToken}`;
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{s.firstName}</p>
                  <p className="text-sm text-stone-500">{s.email}</p>
                </div>
                {responded.has(s.id) ? (
                  <span className="text-sm font-medium text-teal-dark">
                    Responded
                  </span>
                ) : (
                  <a
                    href={surveyMailto(s.firstName, s.email, event.name, personalUrl)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                  >
                    Email survey
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {summary ? (
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="font-semibold">Organizer summary (anonymized)</h2>
          <p className="mt-1 text-sm text-stone-600">
            Unlisted page. Counts only. No names, emails, or comments.
          </p>
          <p className="mt-3 break-all text-sm text-stone-800">{reportUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyLinkButton text={reportUrl} label="Copy report link" />
            <CopyLinkButton text={organizerNote} label="Copy organizer note" />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Registrations" value={String(summary.totalSignups)} />
            <Stat label="I'm coming" value={String(summary.comingCount)} />
            <Stat label="Admin marked confirmed" value={String(summary.adminConfirmedCount)} />
            <Stat label="Attended" value={String(summary.attendedCount)} />
            <Stat label="Attendance unknown" value={String(summary.attendanceUnknownCount)} />
            <Stat label="Met the crew" value={String(summary.metGroupYes)} />
            <Stat label="Meetup unknown" value={String(summary.meetupUnknownCount)} />
            <Stat label="Groups" value={String(summary.groupCount)} />
            <Stat
              label="Assigned"
              value={countOf(summary.assignedCount, summary.totalSignups)}
            />
            <Stat
              label="Survey responses"
              value={countOf(summary.surveyCount, summary.totalSignups)}
            />
            <Stat
              label="Met their group"
              value={countOf(summary.metGroupYes, summary.surveyCount)}
            />
            <Stat
              label="Would use again"
              value={countOf(summary.wouldUseAgain, summary.surveyCount)}
            />
            <Stat
              label="Easier to attend"
              value={likertSummary(summary.easier, summary.surveyCount)}
              detail
            />
            <Stat
              label="Felt comfortable"
              value={likertSummary(summary.comfortable, summary.surveyCount)}
              detail
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
                <th className="px-4 py-3">Source</th>
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
                  <td className="px-4 py-3 text-stone-600">{s.utmSource || "—"}</td>
                  <td className="px-4 py-3">
                    <SignupStatusSelect signupId={s.id} status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    {responded.has(s.id) ? (
                      <span className="text-sm font-medium text-teal-dark">
                        Responded
                      </span>
                    ) : (
                      <a
                        href={surveyMailto(
                          s.firstName,
                          s.email,
                          event.name,
                          `${siteUrl}/survey/${s.surveyToken}`,
                        )}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                      >
                        Email survey
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Activity</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Page loads" value={String(pageCounts.page_load)} />
          <Stat label="Registration starts" value={String(pageCounts.registration_start)} />
          <Stat label="Unassigned" value={String(operations.unassigned)} />
          <Stat label="Crews under 3" value={String(operations.crewsUnderMinimum)} />
          <Stat label="I'm coming" value={String(operations.coming)} />
          <Stat label="Declined" value={String(operations.declined)} />
          <Stat label="Mail queued" value={String(operations.queued)} />
          <Stat label="Mail sent" value={String(operations.sent)} />
          <Stat label="Mail failed" value={String(operations.failed)} />
        </dl>
        <h3 className="mt-6 font-medium">Signup sources</h3>
        <ul className="mt-2 space-y-1 text-sm text-stone-600">
          {sources.map((item) => (
            <li key={item.source}>
              {item.source}: {item.count}
            </li>
          ))}
        </ul>
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

function EmailSwitch({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-sm text-stone-700">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        className="mt-1"
      />
      <span>{label}</span>
    </label>
  );
}

function surveyMailto(
  firstName: string,
  email: string,
  eventName: string,
  surveyUrl: string,
): string {
  const subject = `How was ${eventName}?`;
  const body = `Hey ${firstName} — thanks for showing up with your Meet Me There group at ${eventName}. One minute, if you have it:\n\n${surveyUrl}\n\nOrganizers only see totals, never your name or email.`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function Stat({
  label,
  value,
  detail = false,
}: {
  label: string;
  value: string;
  detail?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd
        className={`mt-1 font-bold text-stone-900 ${detail ? "text-base leading-snug" : "text-2xl"}`}
      >
        {value}
      </dd>
    </div>
  );
}
