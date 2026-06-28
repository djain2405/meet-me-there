import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { SurveyForm } from "@/components/SurveyForm";
import { getSignupBySurveyToken, getSurveyForSignup } from "@/lib/store";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Quick check-in — Meet Me There",
};

export default async function SurveyPage({ params }: Props) {
  const { token } = await params;
  const result = await getSignupBySurveyToken(token);
  if (!result) notFound();

  const { signup, event } = result;
  const existing = await getSurveyForSignup(signup.id);

  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader showNav={false} />

      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="section-badge">60-second check-in</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">
          Hey {signup.firstName} — how&apos;d it go?
        </h1>
        <p className="mt-3 text-lg text-muted">
          Your honest take on <strong className="text-ink">{event.name}</strong>{" "}
          helps the next solo attendee walk in with more confidence.
        </p>
        <div className="mt-8">
          <SurveyForm
            signupId={signup.id}
            eventId={event.id}
            firstName={signup.firstName}
            eventName={event.name}
            alreadySubmitted={!!existing}
          />
        </div>
      </main>
    </div>
  );
}
