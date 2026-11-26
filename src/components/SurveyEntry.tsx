"use client";

import { useActionState } from "react";
import {
  lookupSurveyByEmail,
  type SurveyLookupState,
} from "@/app/s/actions";
import { SurveyForm } from "@/components/SurveyForm";

type Props = {
  token: string;
  eventName: string;
};

const initial: SurveyLookupState = { error: "", match: null };

export function SurveyEntry({ token, eventName }: Props) {
  const [state, action, pending] = useActionState(lookupSurveyByEmail, initial);

  if (state.match) {
    return (
      <>
        <p className="section-badge">60 second check in</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">
          Hey {state.match.firstName}, how&apos;d it go?
        </h1>
        <p className="mt-3 text-lg text-muted">
          Your honest take on{" "}
          <strong className="text-ink">{state.match.eventName}</strong> helps
          the next solo attendee walk in with more confidence.
        </p>
        <div className="mt-8">
          <SurveyForm
            signupId={state.match.signupId}
            eventId={state.match.eventId}
            firstName={state.match.firstName}
            eventName={state.match.eventName}
            alreadySubmitted={state.match.alreadySubmitted}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <p className="section-badge">60 second check in</p>
      <h1 className="mt-3 text-3xl font-bold text-ink">How&apos;d it go?</h1>
      <p className="mt-3 text-lg text-muted">
        Use the email you signed up with for{" "}
        <strong className="text-ink">{eventName}</strong>. Organizers only see
        totals, never your name or email.
      </p>
      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
        <label className="block">
          <span className="mb-1.5 block font-bold text-ink">Signup email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input-fun"
            placeholder="you@example.com"
          />
        </label>
        {state.error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="btn-primary w-full py-4">
          {pending ? "Checking…" : "Continue →"}
        </button>
      </form>
    </>
  );
}
