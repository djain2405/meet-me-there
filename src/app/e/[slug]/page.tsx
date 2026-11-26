import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { ReturnLinkForm, SignupForm } from "@/components/SignupForm";
import { cleanUtm } from "@/lib/attribution";
import { formatEventDate } from "@/lib/format";
import { recordPageCount, visitMetrics } from "@/lib/growth";
import { registrationClosedReason } from "@/lib/registration";
import { getEventBySlug } from "@/lib/store";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  const title = event ? `Find your people · ${event.name}` : "Event not found";
  const description = event
    ? `Sign up to meet a small crew before ${event.name}.`
    : "Event not found";
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function EventSignupPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const event = await getEventBySlug(slug);
  if (!event || event.status === "draft") notFound();
  const closed = registrationClosedReason(event);
  for (const metric of visitMetrics(!closed)) {
    await recordPageCount({ subjectType: "event", subjectId: event.id, metric });
  }
  const attribution = {
    utmSource: cleanUtm(query.utm_source),
    utmMedium: cleanUtm(query.utm_medium),
    utmCampaign: cleanUtm(query.utm_campaign),
  };

  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader badge="You're not flying solo" />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        {/* Hero */}
        <div className="mb-8 text-center sm:text-left">
          <p className="section-badge">Meet Me There × {event.name}</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Going solo?{" "}
            <span className="text-teal">Let&apos;s fix that.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Sign up and we&apos;ll match you with a few friendly people heading
            to the same event. Same meetup spot, same arrival window. You walk
            in together instead of hovering by the snack table.
          </p>
        </div>

        {/* Encouragement strip */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "🤝", text: "Small group, not a crowd" },
            { icon: "📍", text: "Public meetup spot" },
            { icon: "⏱️", text: "2 minutes to sign up" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-2 rounded-2xl border-2 border-peach bg-white px-4 py-3 text-sm font-medium text-ink"
            >
              <span aria-hidden>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>

        {/* Event details */}
        <div className="fun-card mb-8 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-teal">
            The event
          </h2>
          <p className="mt-1 text-xl font-bold text-ink">{event.name}</p>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-cream p-3">
              <dt className="font-semibold text-muted">When</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {formatEventDate(event.date, event.startTime)}
              </dd>
            </div>
            <div className="rounded-xl bg-cream p-3">
              <dt className="font-semibold text-muted">Where</dt>
              <dd className="mt-0.5 font-medium text-ink">{event.venue}</dd>
            </div>
            <div className="rounded-xl bg-[#f0faf8] p-3 sm:col-span-2">
              <dt className="font-semibold text-teal">Where we&apos;ll meet</dt>
              <dd className="mt-0.5 font-medium text-ink">{event.meetingPoint}</dd>
            </div>
            {event.scheduleNotes ? (
              <div className="rounded-xl bg-cream p-3 sm:col-span-2">
                <dt className="font-semibold text-muted">The rundown</dt>
                <dd className="mt-0.5 text-ink">{event.scheduleNotes}</dd>
              </div>
            ) : null}
          </dl>
          {event.ticketUrl ? (
            <p className="mt-4 text-sm text-muted">
              Need a ticket?{" "}
              <a
                href={event.ticketUrl}
                className="font-semibold text-coral underline decoration-2 underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                Grab one from the organizer →
              </a>{" "}
              (we don&apos;t handle ticketing, just the friendly arrival part)
            </p>
          ) : null}
        </div>

        {closed ? (
          <div className="fun-card p-8 text-center">
            <h2 className="text-2xl font-bold text-ink">Signup is closed</h2>
            <p className="mt-3 text-muted">{closed}</p>
          </div>
        ) : (
          <>
            <ReturnLinkForm eventId={event.id} />
            <SignupForm event={event} attribution={attribution} />
          </>
        )}

        <p className="mt-8 text-center text-xs text-muted">
          Questions about the event itself? That&apos;s the organizer&apos;s lane.
          Meet Me There is just here so you don&apos;t have to do the door alone.
        </p>
      </main>
    </div>
  );
}
