import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "meet_me_there_admin";

export async function requireAdmin() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/admin/login");
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value === "1";
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "demo";
  return password === expected;
}

export async function setAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
