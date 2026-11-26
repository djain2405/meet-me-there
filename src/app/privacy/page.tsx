import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "@/components/BrandHeader";

export const metadata: Metadata = {
  title: "Privacy · Meet Me There",
  description: "How Meet Me There collects and uses signup information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader badge="Privacy" />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold text-ink">Privacy</h1>
        <p className="mt-4 text-muted">
          Meet Me There helps solo attendees find a small group before an event.
          This page explains what we collect for that purpose.
        </p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-ink">
          <div>
            <h2 className="font-bold">What we collect</h2>
            <p className="mt-1 text-muted">
              When you sign up: first name, email, optional phone number, arrival
              timing, group-size preferences, optional comfort preferences, and
              whether you are willing to be a friendly group connector.
            </p>
          </div>
          <div>
            <h2 className="font-bold">Why we collect it</h2>
            <p className="mt-1 text-muted">
              To match you into a small group, share meetup details, send
              optional post-event feedback, and share anonymized summary
              metrics with the event organizer (for example signup counts and
              survey percentages). Organizers do not automatically receive your
              raw email or phone.
            </p>
          </div>
          <div>
            <h2 className="font-bold">Shared links</h2>
            <p className="mt-1 text-muted">
              The follow-up survey link is personal to your signup, so you are
              not asked to type your email again. Your response is saved on that
              signup. The organizer report is a separate unlisted page of
              aggregate counts. It is not a public directory, and it does not
              include names, emails, phone numbers, or comments.
            </p>
          </div>
          <div>
            <h2 className="font-bold">Who runs this</h2>
            <p className="mt-1 text-muted">
              Meet Me There is operated as a pilot by the Meet Me There operator.
              Event ticketing and venue details remain with the event organizer.
            </p>
          </div>
          <div>
            <h2 className="font-bold">Retention and deletion</h2>
            <p className="mt-1 text-muted">
              We keep signup data for the duration of the pilot and a short
              follow-up window afterward. To request deletion of your signup,
              email the operator using the contact on your meetup message or
              reply to any Meet Me There email you received.
            </p>
          </div>
        </section>

        <p className="mt-10 text-sm text-muted">
          <Link href="/" className="font-semibold text-teal underline underline-offset-2">
            ← Back home
          </Link>
        </p>
      </main>
    </div>
  );
}
