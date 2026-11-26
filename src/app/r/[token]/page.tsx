import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { countOf, formatEventDate, likertSummary } from "@/lib/format";
import { getEventByReportToken, getEventSummary } from "@/lib/store";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const event = await getEventByReportToken(token);
  return {
    title: event ? `${event.name} summary · Meet Me There` : "Summary",
    robots: { index: false, follow: false },
  };
}

export default async function OrganizerReportPage({ params }: Props) {
  const { token } = await params;
  const event = await getEventByReportToken(token);
  if (!event) notFound();

  const summary = await getEventSummary(event.id);
  if (!summary) notFound();

  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader badge="For organizers" showNav={false} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="section-badge">Anonymous summary</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">{event.name}</h1>
        <p className="mt-2 text-lg text-muted">
          {formatEventDate(event.date, event.startTime)}
        </p>
        <p className="mt-4 max-w-2xl text-muted">
          Counts and rates only. No names, emails, or comments. This page
          updates if more people respond.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <ReportStat label="Registrations" value={String(summary.totalSignups)} />
          <ReportStat label="I'm coming" value={String(summary.comingCount)} />
          <ReportStat
            label="Admin marked confirmed"
            value={String(summary.adminConfirmedCount)}
          />
          <ReportStat label="Attended" value={String(summary.attendedCount)} />
          <ReportStat label="Did not attend" value={String(summary.absentCount)} />
          <ReportStat
            label="Attendance unknown"
            value={String(summary.attendanceUnknownCount)}
          />
          <ReportStat label="Met the crew" value={String(summary.metGroupYes)} />
          <ReportStat label="Did not meet the crew" value={String(summary.metGroupNo)} />
          <ReportStat
            label="Meetup unknown"
            value={String(summary.meetupUnknownCount)}
          />
          <ReportStat label="Groups" value={String(summary.groupCount)} />
          <ReportStat
            label="People assigned"
            value={countOf(summary.assignedCount, summary.totalSignups)}
          />
          <ReportStat
            label="Survey responses"
            value={countOf(summary.surveyCount, summary.totalSignups)}
          />
          <ReportStat
            label="Met their group"
            value={countOf(summary.metGroupYes, summary.surveyCount)}
          />
          <ReportStat
            label="Would use again"
            value={countOf(summary.wouldUseAgain, summary.surveyCount)}
          />
          <ReportStat
            label="Easier to attend"
            value={likertSummary(summary.easier, summary.surveyCount)}
            detail
          />
          <ReportStat
            label="Felt comfortable"
            value={likertSummary(summary.comfortable, summary.surveyCount)}
            detail
          />
        </dl>
      </main>
    </div>
  );
}

function ReportStat({
  label,
  value,
  detail = false,
}: {
  label: string;
  value: string;
  detail?: boolean;
}) {
  return (
    <div className="fun-card p-5">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd
        className={`mt-2 font-bold text-ink ${detail ? "text-base leading-snug" : "text-2xl"}`}
      >
        {value}
      </dd>
    </div>
  );
}
