import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "@/components/BrandHeader";
import { DEMO_EVENT_SLUG } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Meet Me There. Show up solo, never feel alone",
  description:
    "A friendly way for event goers to find their people before the doors even open. One link for organizers. Zero awkward hovering at the entrance.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader badge="Pilot · live demo" />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 text-center sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border-2 border-peach bg-white px-4 py-1.5 text-sm font-semibold text-coral-dark shadow-sm">
            <span aria-hidden>✨</span>
            For anyone who almost talked themselves out of going
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.1] text-ink sm:text-6xl">
            You were going to go alone.
            <br />
            <span className="bg-gradient-to-r from-coral to-teal bg-clip-text text-transparent">
              You don&apos;t have to show up that way.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            Meet Me There matches you with a small group before the event. Same
            vibe, same arrival time, one easy spot to find each other. Less
            hovering. More &quot;oh hey, I know you from the group.&quot;
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/e/${DEMO_EVENT_SLUG}`}
              className="btn-primary px-8 py-4 text-lg"
            >
              Try the attendee experience →
            </Link>
            <a href="#for-organizers" className="btn-secondary px-8 py-4 text-lg">
              I run events
            </a>
          </div>
          <p className="mt-6 text-sm text-muted">
            Free pilot · 2 min signup · tickets still through your organizer
          </p>
        </section>

        {/* Attendee benefits */}
        <section className="border-y-2 border-peach/60 bg-white py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-3xl font-bold text-ink">
              Why people actually sign up
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              Not another networking thing. Just a softer landing at the door.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <VibeCard
                emoji="🙋"
                title="Someone expects you"
                body="Your group knows you're coming. That tiny bit of accountability? It gets you out the door."
              />
              <VibeCard
                emoji="📍"
                title="One spot, zero guessing"
                body="A public meeting point everyone agrees on. No wandering with your phone at 20% battery."
              />
              <VibeCard
                emoji="💬"
                title="Ice already broken"
                body="A few messages before you arrive means the first hello isn't with a total stranger."
              />
            </div>
          </div>
        </section>

        {/* How it feels */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold text-ink">
            What actually happens
          </h2>
          <div className="mx-auto mt-12 grid max-w-3xl gap-4">
            {[
              {
                step: "1",
                title: "You raise your hand",
                body: "Quick signup: when you're arriving, what you're into, what would make you comfortable.",
              },
              {
                step: "2",
                title: "We introduce your people",
                body: "A small group (think 3 to 5), matched by timing and vibe. Optional group chat. Optional friendly connector.",
              },
              {
                step: "3",
                title: "You meet at the door",
                body: "Same public spot. Same time. Walk in together like you planned it, because you did.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="fun-card flex gap-5 p-6"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal to-teal-dark text-lg font-bold text-white">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink">{item.title}</h3>
                  <p className="mt-1 text-muted">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Social proof style quotes */}
        <section className="bg-lavender/50 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Quote
                text="I had a ticket for three weeks and almost bailed the morning of. Having two names to look for changed everything."
                who="Pilot attendee"
              />
              <Quote
                text="We added one link to our confirmation email. Eight solo signups, three groups, zero extra work on our team."
                who="Event organizer"
              />
            </div>
          </div>
        </section>

        {/* Organizers */}
        <section id="for-organizers" className="mx-auto max-w-5xl px-4 py-16">
          <div className="fun-card overflow-hidden">
            <div className="bg-gradient-to-r from-teal to-teal-dark px-8 py-10 text-white sm:px-12">
              <p className="text-sm font-bold uppercase tracking-widest text-white/70">
                For organizers
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                Turn &quot;I&apos;m not sure I&apos;ll go&quot; into &quot;see you there&quot;
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-white/85">
                Drop one link in your confirmation email or event page. We handle
                signup, matching, and feedback. You keep ticketing, venue, and
                everything else exactly as is.
              </p>
            </div>
            <div className="grid gap-6 bg-white p-8 sm:grid-cols-3 sm:p-12">
              <OrganizerPerk
                title="One link"
                body="No integration. No dev ticket. Paste and promote."
              />
              <OrganizerPerk
                title="Real outcomes"
                body="Attendance, comfort, and satisfaction, anonymized for you."
              />
              <OrganizerPerk
                title="First pilot free"
                body="Test the experience before you commit to anything."
              />
            </div>
            <div className="flex flex-wrap gap-4 border-t-2 border-peach/60 bg-[#fffbf7] px-8 py-6 sm:px-12">
              <Link href="/admin/login" className="btn-primary px-6 py-3">
                See the operator dashboard
              </Link>
              <Link
                href={`/e/${DEMO_EVENT_SLUG}`}
                className="btn-secondary px-6 py-3"
              >
                Preview what attendees see
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 pt-4">
          <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-coral via-[#ff8f6b] to-sun p-10 text-center text-white shadow-lg sm:p-14">
            <h2 className="text-3xl font-bold sm:text-4xl">
              The event is worth showing up to.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/90">
              You shouldn&apos;t have to psych yourself up in the parking lot.
              Let&apos;s make the first five minutes easier.
            </p>
            <Link
              href={`/e/${DEMO_EVENT_SLUG}`}
              className="mt-8 inline-block rounded-full bg-white px-8 py-4 text-lg font-bold text-coral-dark shadow-md transition hover:scale-[1.02]"
            >
              See the live demo →
            </Link>
            <p className="mt-4 text-sm text-white/75">
              Demo password for admin: <strong>demo</strong>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-peach py-8 text-center text-sm text-muted">
        Meet Me There · Your ticket, your event. We just help you find your people
      </footer>
    </div>
  );
}

function VibeCard({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="fun-card p-6 text-center sm:text-left">
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      <h3 className="mt-3 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Quote({ text, who }: { text: string; who: string }) {
  return (
    <blockquote className="fun-card p-6">
      <p className="text-lg leading-relaxed text-ink">&ldquo;{text}&rdquo;</p>
      <footer className="mt-4 text-sm font-semibold text-teal">{who}</footer>
    </blockquote>
  );
}

function OrganizerPerk({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}
