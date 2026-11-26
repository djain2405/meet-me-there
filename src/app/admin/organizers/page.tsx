import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { listOrganizers } from "@/lib/store";
import { createOrganizerAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OrganizersPage({ searchParams }: Props) {
  await requireAdmin();
  const { error } = await searchParams;
  const organizers = await listOrganizers();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Organizers</h1>
      <p className="mt-1 text-stone-600">
        Each organizer gets one permanent page for every upcoming event.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "slug"
            ? "That URL is already in use. Pick another slug."
            : "Name and URL slug are required."}
        </p>
      ) : null}

      <form
        action={createOrganizerAction}
        className="mt-8 grid gap-3 rounded-2xl border border-stone-200 bg-white p-6 sm:grid-cols-2"
      >
        <h2 className="font-semibold sm:col-span-2">Create organizer</h2>
        <input
          name="name"
          required
          placeholder="Name *"
          className="rounded-xl border border-stone-300 px-3 py-2"
        />
        <input
          name="slug"
          required
          placeholder="url slug *"
          className="rounded-xl border border-stone-300 px-3 py-2"
        />
        <input
          name="city"
          placeholder="City"
          className="rounded-xl border border-stone-300 px-3 py-2"
        />
        <input
          name="contactEmail"
          type="email"
          placeholder="Contact email"
          className="rounded-xl border border-stone-300 px-3 py-2"
        />
        <input
          name="websiteUrl"
          placeholder="Official website"
          className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
        />
        <textarea
          name="description"
          placeholder="Short community description"
          rows={3}
          className="rounded-xl border border-stone-300 px-3 py-2 sm:col-span-2"
        />
        <button
          type="submit"
          className="rounded-xl bg-coral px-4 py-2 font-semibold text-white sm:col-span-2"
        >
          Create organizer
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {organizers.map((organizer) => {
          const url = `${siteUrl}/c/${organizer.slug}`;
          return (
            <article
              key={organizer.id}
              className="rounded-2xl border border-stone-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    <Link href={`/admin/organizers/${organizer.id}`}>
                      {organizer.name}
                    </Link>
                  </h2>
                  <p className="text-sm text-stone-500">{url}</p>
                </div>
                <div className="flex gap-2">
                  <CopyLinkButton text={url} label="Copy page link" />
                  <Link
                    href={`/admin/organizers/${organizer.id}`}
                    className="rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
