export function allowedOrigin(
  origin: string | null,
  requestUrl: string,
  baseUrl: string | undefined,
  additionalOrigins = "",
) {
  if (!origin) return true;
  const allowed = [
    baseUrl || new URL(requestUrl).origin,
    ...additionalOrigins.split(",").map((value) => value.trim()),
  ].filter(Boolean);
  return allowed.includes(origin);
}
