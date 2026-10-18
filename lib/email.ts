import "server-only";

const FROM = process.env.EMAIL_FROM ?? "Canteen <onboarding@resend.dev>";

type Email = { to: string; subject: string; text: string; html: string };

/**
 * Delivers through Resend's REST API. Without RESEND_API_KEY, development
 * prints `devNote` to the server console so contributors can sign in locally
 * with zero setup; production refuses to run without a provider.
 */
async function deliver(email: Email, devNote: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.info(`\n  ${devNote}\n`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, ...email }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Provider error bodies can contain the recipient's address.
    throw new Error(`Resend responded ${response.status}`);
  }
}

export async function sendSignInCode(email: string, code: string) {
  await deliver(
    {
      to: email,
      subject: `${code} is your Canteen code`,
      text: `Your Canteen sign-in code is ${code}\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
      html: layout(`
          <tr><td style="padding-top:24px;font-size:15px;line-height:1.5">Here's your sign-in code:</td></tr>
          <tr><td style="padding-top:12px;font-size:34px;font-weight:700;letter-spacing:0.2em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${code}</td></tr>
          <tr><td style="padding-top:24px;font-size:13px;line-height:1.5;color:#78716c">It expires in 10 minutes. If you didn't ask for it, you can safely ignore this email.</td></tr>`),
    },
    `Canteen sign-in code for ${email}: ${code}`,
  );
}

/**
 * The one opt-in email a question's author gets when a reply arrives. It
 * carries no question, reply or alias, so an inbox shows only that Canteen
 * was used.
 */
export async function sendReplyNotice(email: string, url: string) {
  await deliver(
    {
      to: email,
      subject: "Someone replied on Canteen",
      text: `Someone replied to a question you asked on Canteen.\n\nRead it here: ${url}\n\nYou asked for one email when a reply arrived. Canteen won't send another for this question.`,
      html: layout(`
          <tr><td style="padding-top:24px;font-size:15px;line-height:1.5">Someone replied to a question you asked on Canteen.</td></tr>
          <tr><td style="padding-top:20px"><a href="${url}" style="display:inline-block;background:#16181d;color:#ffffff;border-radius:999px;padding:12px 20px;font-size:14px;font-weight:600;text-decoration:none">Read the reply</a></td></tr>
          <tr><td style="padding-top:24px;font-size:13px;line-height:1.5;color:#78716c">You asked for one email when a reply arrived. Canteen won't send another for this question.</td></tr>`),
    },
    `Canteen reply notice for ${email}: ${url}`,
  );
}

function layout(rows: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16181d">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border-radius:16px;padding:32px">
          <tr><td style="font-size:20px;font-weight:700;letter-spacing:-0.02em">Canteen</td></tr>${rows}
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
