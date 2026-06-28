import Link from "next/link";
import { loginAction } from "@/app/admin/actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center hero-glow px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-teal-dark">
          <span className="text-xl" aria-hidden>👋</span>
          <span className="font-bold">Meet Me There</span>
        </Link>
        <form action={loginAction} className="fun-card p-8">
          <h1 className="text-xl font-bold text-ink">Operator login</h1>
          <p className="mt-2 text-sm text-muted">
            Run your pilots, match groups, pull organizer reports. Demo password:{" "}
            <code className="rounded bg-peach px-1.5 py-0.5 text-coral-dark">demo</code>
          </p>
          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Hmm, that password didn&apos;t work. Try again?
            </p>
          ) : null}
          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Password</span>
            <input
              name="password"
              type="password"
              required
              className="input-fun"
            />
          </label>
          <button type="submit" className="btn-primary mt-4 w-full py-3">
            Let&apos;s go →
          </button>
        </form>
      </div>
    </div>
  );
}
