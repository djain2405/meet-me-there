const UTM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.:-]{0,79}$/;

export function cleanUtm(value: unknown): string | undefined {
  const trimmed = String(value ?? "").trim();
  if (!UTM_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function attributionQuery(input: {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}): string {
  const params = new URLSearchParams();
  const source = cleanUtm(input.utm_source);
  const medium = cleanUtm(input.utm_medium);
  const campaign = cleanUtm(input.utm_campaign);
  if (source) params.set("utm_source", source);
  if (medium) params.set("utm_medium", medium);
  if (campaign) params.set("utm_campaign", campaign);
  const query = params.toString();
  return query ? `?${query}` : "";
}
