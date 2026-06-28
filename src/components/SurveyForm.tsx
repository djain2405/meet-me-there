"use client";

import { useActionState } from "react";
import { submitSurveyAction } from "@/app/survey/actions";

type Props = {
  signupId: string;
  eventId: string;
  firstName: string;
  eventName: string;
  alreadySubmitted: boolean;
};

const initial = { ok: false as boolean, error: "" };

export function SurveyForm({
  signupId,
  eventId,
  firstName,
  eventName,
  alreadySubmitted,
}: Props) {
  const [state, action, pending] = useActionState(submitSurveyAction, initial);

  if (alreadySubmitted || state.ok) {
    return (
      <div className="success-pop rounded-3xl border-2 border-teal/30 bg-gradient-to-b from-[#f0faf8] to-white p-10 text-center">
        <div className="floaty mx-auto mb-3 text-4xl" aria-hidden>
          💛
        </div>
        <p className="text-2xl font-bold text-ink">You&apos;re the best, {firstName}!</p>
        <p className="mt-3 text-muted">
          Your take on <strong className="text-ink">{eventName}</strong> helps us
          make the next one even better.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="signupId" value={signupId} />
      <input type="hidden" name="eventId" value={eventId} />

      <fieldset className="fun-card space-y-3 p-5">
        <legend className="text-base font-bold text-ink">
          Did you find your group? *
        </legend>
        <label className="choice-card">
          <input type="radio" name="metGroup" value="yes" required />
          <span>
            <span className="font-semibold">Yep — we connected!</span>
          </span>
        </label>
        <label className="choice-card">
          <input type="radio" name="metGroup" value="no" />
          <span>
            <span className="font-semibold">Not this time</span>
            <span className="block text-sm text-muted">
              That&apos;s useful to know too.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="fun-card p-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block font-bold text-ink">
            Did having a group make showing up easier? *
          </span>
          <select name="madeAttendanceEasier" required className="input-fun" defaultValue="">
            <option value="" disabled>
              Pick one
            </option>
            <option value="yes">Yes — total game-changer</option>
            <option value="somewhat">A little bit</option>
            <option value="no">Not really</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block font-bold text-ink">
            Did you feel comfortable and safe? *
          </span>
          <select name="feltComfortableSafe" required className="input-fun" defaultValue="">
            <option value="" disabled>
              Pick one
            </option>
            <option value="yes">Yes, all good</option>
            <option value="somewhat">Mostly</option>
            <option value="no">Not quite</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <label className="choice-card">
          <input type="checkbox" name="wouldUseAgain" />
          <span className="text-sm font-medium">
            I&apos;d do Meet Me There again at another event
          </span>
        </label>
        <label className="choice-card">
          <input type="checkbox" name="interestedInFutureEvent" />
          <span className="text-sm font-medium">
            I&apos;d hang out with someone from my group again
          </span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block font-bold text-ink">
          Anything we should know? <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          name="comments"
          rows={4}
          className="input-fun"
          placeholder="The good, the awkward, the brilliant — we're all ears."
        />
      </label>

      {state.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary w-full py-4">
        {pending ? "Sending…" : "Send it →"}
      </button>
    </form>
  );
}
