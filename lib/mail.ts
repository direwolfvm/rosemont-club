export async function sendMail(
  to: string,
  subject: string,
  text: string,
  options: { replyTo?: string } = {},
) {
  const {
    MAILGUN_API_KEY: key,
    MAILGUN_DOMAIN: domain,
    MAIL_FROM: from,
  } = process.env;
  if (!key || !domain || !from) throw new Error("Email is not configured.");
  const form = new URLSearchParams({
    from,
    to,
    subject,
    text,
    "o:tracking": "no",
    "o:tracking-clicks": "no",
    "o:tracking-opens": "no",
    ...(options.replyTo ? { "h:Reply-To": options.replyTo } : {}),
  });
  const base = process.env.MAILGUN_API_BASE_URL || "https://api.mailgun.net";
  const response = await fetch(
    `${base}/v3/${encodeURIComponent(domain)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from("api:" + key).toString("base64"),
      },
      body: form,
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new Error(
      "Email could not be sent. Please try again or contact the site administrator.",
    );
}
