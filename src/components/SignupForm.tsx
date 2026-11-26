"use client";

import { useActionState } from "react";
import { requestReturnLinkAction, submitSignupAction } from "@/app/e/actions";
import type { PilotEvent, Signup } from "@/lib/types";

type Props = {
  event: PilotEvent;
  attribution?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  defaults?: {
    firstName?: string;
    email?: string;
    phone?: string;
    preferredGroupSize?: Signup["preferredGroupSize"];
    comfortPreferences?: string[];
    willingConnector?: boolean;
  };
  returnToken?: string;
};

const initial: {
  ok: boolean;
  error: string;
  firstName?: string;
  alreadyRegistered?: boolean;
} = {
  ok: false,
  error: "",
};

function FormSection({
  badge,
  title,
  subtitle,
  children,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="fun-card p-6 sm:p-7">
      <span className="section-badge">{badge}</span>
      <h2 className="mt-3 text-xl font-bold text-ink">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      ) : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function SignupForm({ event, attribution, defaults, returnToken }: Props) {
  const [state, action, pending] = useActionState(submitSignupAction, initial);

  if (state.ok && state.alreadyRegistered) {
    return (
      <div className="rounded-3xl border-2 border-teal/30 bg-white p-10 text-center">
        <p className="text-3xl font-bold text-ink">
          You&apos;re already signed up, {state.firstName}.
        </p>
        <p className="mx-auto mt-4 max-w-md text-lg text-muted">
          We kept your original registration for{" "}
          <strong className="text-ink">{event.name}</strong>. Nothing was
          overwritten.
        </p>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="success-pop rounded-3xl border-2 border-teal/30 bg-gradient-to-b from-[#f0faf8] to-white p-10 text-center">
        <div className="floaty mx-auto mb-4 text-5xl" aria-hidden>
          🎉
        </div>
        <p className="text-3xl font-bold text-ink">You&apos;re in, {state.firstName}!</p>
        <p className="mx-auto mt-4 max-w-md text-lg text-muted">
          We&apos;ll match you with a friendly little group before{" "}
          <strong className="text-ink">{event.name}</strong>. Watch your inbox.
          Your meetup details are on the way.
        </p>
        <p className="mt-6 text-sm text-muted">
          Still need a ticket? Grab one from the organizer. We&apos;re just here
          to make arrival less awkward.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="eventId" value={event.id} />
      {returnToken ? <input type="hidden" name="returnToken" value={returnToken} /> : null}
      <input type="hidden" name="utmSource" value={attribution?.utmSource ?? ""} />
      <input type="hidden" name="utmMedium" value={attribution?.utmMedium ?? ""} />
      <input type="hidden" name="utmCampaign" value={attribution?.utmCampaign ?? ""} />

      <FormSection
        badge="Step 1"
        title="First, the basics"
        subtitle="So we know who to say hi to."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              What should we call you? *
            </span>
            <input
              name="firstName"
              required
              defaultValue={defaults?.firstName}
              className="input-fun"
              placeholder="The name you actually go by"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Best email *
            </span>
            <input
              name="email"
              type="email"
              required
              defaultValue={defaults?.email}
              className="input-fun"
              placeholder="Where we'll send your group info"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Phone <span className="font-normal text-muted">(totally optional)</span>
            </span>
            <input
              name="phone"
              type="tel"
              defaultValue={defaults?.phone}
              className="input-fun"
              placeholder="Only if you want day of texts"
            />
          </label>
        </div>
      </FormSection>

      <FormSection
        badge="Step 2"
        title="What's the plan?"
        subtitle="No wrong answers. Even 'maybe' helps us plan."
      >
        <fieldset className="space-y-3">
          <legend className="sr-only">Attendance plans</legend>
          <label className="choice-card">
            <input
              type="radio"
              name="attendanceCertainty"
              value="definitely"
              required
            />
            <span>
              <span className="block font-semibold text-ink">
                I&apos;m going. Count me in!
              </span>
              <span className="text-sm text-muted">
                Ticket sorted (or sorting it soon). Ready for a group.
              </span>
            </span>
          </label>
          <label className="choice-card">
            <input type="radio" name="attendanceCertainty" value="considering" />
            <span>
              <span className="block font-semibold text-ink">
                I&apos;m on the fence
              </span>
              <span className="text-sm text-muted">
                Having a group might be the nudge I need. No pressure.
              </span>
            </span>
          </label>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            When would you arrive? *
          </span>
          <input
            name="arrivalTime"
            required
            className="input-fun"
            placeholder="e.g. 5:45 PM. We'll sync your group"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Eyeing a specific session?
          </span>
          <input
            name="preferredSession"
            className="input-fun"
            placeholder="Workshop, panel, dance floor, whatever you're into"
          />
        </label>
      </FormSection>

      <FormSection
        badge="Step 3"
        title="Your comfort zone"
        subtitle="We'll use this to find your people, not to box you in."
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Ideal group size
          </span>
          <select
            name="preferredGroupSize"
            className="input-fun"
            defaultValue={defaults?.preferredGroupSize ?? "no-preference"}
          >
            <option value="no-preference">Surprise me, any size works</option>
            <option value="3">Cozy trio (~3)</option>
            <option value="4">Small squad (~4)</option>
            <option value="5">Bigger energy (~5)</option>
          </select>
        </label>

        <label className="choice-card">
          <input
            type="checkbox"
            name="comfortPreferences"
            value="women-only"
            defaultChecked={defaults?.comfortPreferences?.includes("women-only")}
          />
          <span>
            <span className="block font-semibold text-ink">
              I&apos;d love a women only group
            </span>
            <span className="text-sm text-muted">
              We&apos;ll do our best to honor this when matching.
            </span>
          </span>
        </label>

        <label className="choice-card border-dashed border-sun bg-[#fffbf0]">
          <input
            type="checkbox"
            name="willingConnector"
            defaultChecked={defaults?.willingConnector}
          />
          <span>
            <span className="block font-semibold text-ink">
              I&apos;ll be the friendly face ✨
            </span>
            <span className="text-sm text-muted">
              Happy to say hi first and help everyone find the meeting spot.
              Connectors make the magic happen.
            </span>
          </span>
        </label>
      </FormSection>

      <FormSection
        badge="Almost there"
        title="Quick ground rules"
        subtitle="So everyone feels safe showing up."
      >
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex gap-2">
            <span className="text-teal">✓</span> 18+ only · public meetup spots
            · platonic vibes always
          </li>
          <li className="flex gap-2">
            <span className="text-teal">✓</span> Your number stays private unless
            you share it
          </li>
          <li className="flex gap-2">
            <span className="text-teal">✓</span> Leave anytime. Your ticket,
            your ride, your call
          </li>
        </ul>

        <label className="choice-card">
          <input type="checkbox" name="ageAcknowledged" required />
          <span className="text-sm font-medium">I&apos;m 18 or older *</span>
        </label>
        <label className="choice-card">
          <input type="checkbox" name="futureEmailOptOut" />
          <span className="text-sm font-medium">
            Don&apos;t email me about future events
          </span>
        </label>
        <label className="choice-card">
          <input type="checkbox" name="conductAcknowledged" required />
          <span className="text-sm font-medium">
            I&apos;m here for good vibes and respectful company *
          </span>
        </label>
      </FormSection>

      {state.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full px-6 py-4 text-lg"
      >
        {pending ? "Saving your spot…" : "Yes, find my people →"}
      </button>
      <p className="text-center text-xs text-muted">
        Takes about 2 minutes. Zero awkward cold opens at the door.{" "}
        <a href="/privacy" className="underline underline-offset-2">
          How we use your info
        </a>
        .
      </p>
    </form>
  );
}

export function ReturnLinkForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(requestReturnLinkAction, {
    message: "",
  });

  return (
    <form action={action} className="fun-card mb-5 p-6">
      <h2 className="text-lg font-bold text-ink">Use my details from last time</h2>
      <p className="mt-1 text-sm text-muted">
        We email a one-time link. The page does not say whether this address is on file.
      </p>
      <input type="hidden" name="eventId" value={eventId} />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          className="input-fun"
          placeholder="Email from your last signup"
        />
        <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
          {pending ? "Sending…" : "Email me a link"}
        </button>
      </div>
      {state.message ? <p className="mt-3 text-sm text-ink">{state.message}</p> : null}
    </form>
  );
}
