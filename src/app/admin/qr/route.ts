import { isAdminAuthenticated } from "@/lib/auth";
import { buildQrResponse } from "@/lib/qr";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const url = requestUrl.searchParams.get("url");
  const download = requestUrl.searchParams.get("download") === "1";
  const result = await buildQrResponse(await isAdminAuthenticated(), url, siteUrl);
  const body = typeof result.body === "string" ? result.body : new Uint8Array(result.body);
  return new Response(body, {
    status: result.status,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, no-store",
      ...(result.status === 200
        ? {
            "Content-Disposition": `${download ? "attachment" : "inline"}; filename="meet-me-there-qr.png"`,
          }
        : {}),
    },
  });
}
