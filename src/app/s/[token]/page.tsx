import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { SurveyEntry } from "@/components/SurveyEntry";
import { getEventBySurveyEntryToken } from "@/lib/store";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick check in. Meet Me There",
  robots: { index: false, follow: false },
};

export default async function SharedSurveyPage({ params }: Props) {
  const { token } = await params;
  const event = await getEventBySurveyEntryToken(token);
  if (!event) notFound();

  return (
    <div className="min-h-screen hero-glow">
      <BrandHeader showNav={false} />
      <main className="mx-auto max-w-xl px-4 py-10">
        <SurveyEntry token={token} eventName={event.name} />
      </main>
    </div>
  );
}
