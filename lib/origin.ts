export function allowedOrigin(
  origin: string | null,
  requestUrl: string,
  baseUrl: string | undefined,
  additionalOrigins = "",
) {
  // No Origin header means a non-browser client. The native iOS app
  // (bundle club.rosemont.ios) sends none and relies on this being allowed;
  // it authenticates with a bearer token, so ambient-cookie CSRF does not
  // apply. Do not reject missing origins without a coordinated client header.
  if (!origin) return true;
  const allowed = [
    baseUrl || new URL(requestUrl).origin,
    ...additionalOrigins.split(",").map((value) => value.trim()),
  ].filter(Boolean);
  return allowed.includes(origin);
}
