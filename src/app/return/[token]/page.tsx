import { SignupForm } from "@/components/SignupForm";
import { BrandHeader } from "@/components/BrandHeader";
import { formatEventDate } from "@/lib/format";
import { returnPrefill } from "@/lib/returning";
import { getEventById } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function ReturnLinkPage({ params }: Props) {
  const { token } = await params;
  const prefill = await returnPrefill(token);
  const event = prefill ? await getEventById(prefill.eventId) : null;

  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader badge="Your details" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        {!prefill || !event ? (
          <div className="fun-card p-8 text-center">
            <h1 className="text-2xl font-bold text-ink">This link is no longer valid.</h1>
            <p className="mt-3 text-muted">Ask for a new link from the event page.</p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-ink">{event.name}</h1>
            <p className="mt-2 text-muted">{formatEventDate(event.date, event.startTime)}</p>
            <p className="mt-4 text-sm text-muted">
              These details are from your latest signup. Saving creates a new registration
              for this event.
            </p>
            <div className="mt-6">
              <SignupForm
                event={event}
                returnToken={token}
                defaults={{
                  firstName: prefill.signup.firstName,
                  email: prefill.signup.email,
                  phone: prefill.signup.phone,
                  preferredGroupSize: prefill.signup.preferredGroupSize,
                  comfortPreferences: prefill.signup.comfortPreferences,
                  willingConnector: prefill.signup.willingConnector,
                }}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
