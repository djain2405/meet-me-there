export function emailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function deliverEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!emailProviderConfigured()) {
    return { ok: false, reason: "Email is not configured." };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.body,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      return { ok: false, reason: detail.slice(0, 300) || `Email provider returned ${response.status}.` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Email provider request failed.",
    };
  }
}
