import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { requireAdmin } from "@/lib/auth";
import { getOrganizerById } from "@/lib/store";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

type Props = { params: Promise<{ id: string }> };

export default async function OrganizerCardPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const organizer = await getOrganizerById(id);
  if (!organizer) notFound();
  const publicUrl = `${siteUrl}/c/${organizer.slug}`;
  const sentence =
    organizer.description ||
    "Going solo? Find a small crew before you arrive.";

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Link
        href={`/admin/organizers/${organizer.id}`}
        className="text-sm text-stone-500 print:hidden"
      >
        ← {organizer.name}
      </Link>
      <article className="mt-6 rounded-3xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal">Meet Me There</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">{organizer.name}</h1>
        <p className="mt-4 text-lg text-stone-700">{sentence}</p>
        <img
          src={`/admin/qr?url=${encodeURIComponent(publicUrl)}`}
          alt={`QR code for ${organizer.name}`}
          className="mx-auto mt-6 h-56 w-56"
        />
        <p className="mt-4 break-all text-sm text-stone-600">{publicUrl}</p>
      </article>
      <div className="mt-6">
        <PrintButton />
      </div>
    </main>
  );
}
