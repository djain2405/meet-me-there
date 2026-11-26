import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { attributionQuery } from "@/lib/attribution";
import { formatEventDate } from "@/lib/format";
import { recordPageCount } from "@/lib/growth";
import { getOrganizerBySlug, listUpcomingEventsForOrganizer } from "@/lib/store";

export const dynamic = "force-dynamic";

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
  const organizer = await getOrganizerBySlug(slug);
  const title = organizer ? `${organizer.name} · Meet Me There` : "Community";
  const description = organizer?.description
    ? organizer.description
    : "Pick an upcoming event and find a small crew before you arrive.";
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function OrganizerPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const organizer = await getOrganizerBySlug(slug);
  if (!organizer) notFound();
  await recordPageCount({ subjectType: "organizer", subjectId: organizer.id, metric: "page_load" });

  const events = await listUpcomingEventsForOrganizer(organizer.id);
  const sourceQuery = attributionQuery(query);

  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader badge={organizer.city || "Community"} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="section-badge">Meet Me There</p>
        <h1 className="mt-3 text-4xl font-bold text-ink">{organizer.name}</h1>
        <p className="mt-4 text-lg text-muted">
          {organizer.description ||
            "Going solo? Pick an upcoming event and we'll help you find a small crew before you arrive."}
        </p>
        {organizer.websiteUrl ? (
          <p className="mt-4">
            <a
              href={organizer.websiteUrl}
              className="font-semibold text-teal underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Official community page
            </a>
          </p>
        ) : null}

        <section className="mt-10">
          <h2 className="text-xl font-bold text-ink">Upcoming events</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-muted">No upcoming events are open right now.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {events.map((event) => (
                <li key={event.id} className="fun-card p-5">
                  <h3 className="text-lg font-bold text-ink">{event.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {formatEventDate(event.date, event.startTime)}
                  </p>
                  <p className="mt-1 text-sm text-ink">{event.venue}</p>
                  <p className="mt-1 text-sm text-teal">Open for crew signup</p>
                  <Link
                    href={`/e/${event.slug}${sourceQuery}`}
                    className="btn-primary mt-4 inline-block px-5 py-2"
                  >
                    Join a crew
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
