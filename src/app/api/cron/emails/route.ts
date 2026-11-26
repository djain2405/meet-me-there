import { isAdminAuthenticated } from "@/lib/auth";
import { processDueEmails } from "@/lib/emailQueue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response("unauthorized", { status: 401 });
    }
  } else if (!(await isAdminAuthenticated())) {
    return new Response("unauthorized", { status: 401 });
  }

  const result = await processDueEmails();
  return Response.json(result);
}
