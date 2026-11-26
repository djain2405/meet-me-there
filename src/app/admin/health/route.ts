import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await isAdminAuthenticated();
  if (!authed) return new Response("unauthorized", { status: 401 });
  return new Response("ok");
}
