import "server-only";

const FROM = process.env.EMAIL_FROM ?? "Canteen <onboarding@resend.dev>";

/**
 * Delivers a sign-in code through Resend's REST API. Without RESEND_API_KEY the
 * code is printed to the server console in development so contributors can sign
 * in locally with zero setup; production refuses to run without a provider.
 */
export async function sendSignInCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.info(`\n  Canteen sign-in code for ${email}: ${code}\n`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: `${code} is your Canteen code`,
      text: `Your Canteen sign-in code is ${code}\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
      html: codeEmailHtml(code),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Resend responded ${response.status}: ${await response.text()}`,
    );
  }
}

function codeEmailHtml(code: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16181d">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border-radius:16px;padding:32px">
          <tr><td style="font-size:20px;font-weight:700;letter-spacing:-0.02em">Canteen</td></tr>
          <tr><td style="padding-top:24px;font-size:15px;line-height:1.5">Here's your sign-in code:</td></tr>
          <tr><td style="padding-top:12px;font-size:34px;font-weight:700;letter-spacing:0.2em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${code}</td></tr>
          <tr><td style="padding-top:24px;font-size:13px;line-height:1.5;color:#78716c">It expires in 10 minutes. If you didn't ask for it, you can safely ignore this email.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
