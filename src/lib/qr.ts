import QRCode from "qrcode";

export function publicQrTarget(raw: string, siteUrl: string): string | null {
  let target: URL;
  let site: URL;
  try {
    target = new URL(raw);
    site = new URL(siteUrl);
  } catch {
    return null;
  }
  if (target.origin !== site.origin) return null;
  if (!/^\/(c|e)\/[^/]+$/.test(target.pathname)) return null;
  return `${target.origin}${target.pathname}`;
}

export async function buildQrResponse(
  authed: boolean,
  rawUrl: string | null,
  siteUrl: string,
): Promise<{ status: number; body: Buffer | string; contentType: string }> {
  if (!authed) {
    return { status: 401, body: "unauthorized", contentType: "text/plain" };
  }
  const target = rawUrl ? publicQrTarget(rawUrl, siteUrl) : null;
  if (!target) {
    return { status: 400, body: "invalid", contentType: "text/plain" };
  }
  const png = await QRCode.toBuffer(target, { type: "png", width: 512, margin: 1 });
  return { status: 200, body: png, contentType: "image/png" };
}
