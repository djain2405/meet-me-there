import Link from "next/link";
import { AdminLiveRefresh } from "@/components/AdminLiveRefresh";
import { logoutAction } from "./actions";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthenticated();

  return (
    <div className="min-h-screen bg-stone-100">
      {authed ? (
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="font-semibold text-teal-dark">
                Meet Me There Admin
              </Link>
              <Link href="/admin" className="text-sm text-stone-600 hover:text-stone-900">
                Overview
              </Link>
              <Link
                href="/admin/organizers"
                className="text-sm text-stone-600 hover:text-stone-900"
              >
                Organizers
              </Link>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-stone-500 hover:text-stone-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
      ) : null}
      {authed ? <AdminLiveRefresh /> : null}
      {children}
    </div>
  );
}
