import { Resend } from "resend";
import type { Artwork, DailyPick } from "@/db/schema";
import { formatDisplayDate } from "./date";

const FROM = "Le Musée Quotidien <lettre@musee.art>";
const SITE = "https://musee.art";

function resend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const shell = (body: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f4ee;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ee;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          ${body}
          <tr><td style="padding:32px 8px 0;border-top:1px solid #d9d2c4;">
            <p style="font-size:12px;color:#8a8172;margin:16px 0 0;">
              Le Musée Quotidien · <a href="${SITE}" style="color:#8a8172;">musee.art</a> · one masterpiece a day
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

export async function sendConfirmationEmail(email: string, token: string) {
  const confirmUrl = `${SITE}/api/confirm?token=${token}`;
  await resend().emails.send({
    from: FROM,
    to: email,
    subject: "Confirm your visit — Le Musée Quotidien",
    html: shell(`
      <tr><td style="padding:8px;">
        <p style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#8a8172;margin:0 0 24px;">Le Musée Quotidien</p>
        <h1 style="font-size:26px;font-weight:normal;margin:0 0 16px;">One click and the museum opens.</h1>
        <p style="font-size:16px;line-height:1.6;margin:0 0 28px;">Confirm your subscription to receive one masterpiece each morning — the work, its story, nothing else.</p>
        <p style="margin:0 0 32px;"><a href="${confirmUrl}" style="display:inline-block;background:#1c1a17;color:#f7f4ee;text-decoration:none;padding:12px 28px;font-size:14px;letter-spacing:0.08em;">CONFIRM SUBSCRIPTION</a></p>
        <p style="font-size:13px;color:#8a8172;margin:0 0 24px;">If you didn't request this, simply ignore this email.</p>
      </td></tr>
    `),
  });
}

export function editionEmail(
  pick: DailyPick,
  artwork: Artwork,
  unsubscribeToken: string,
) {
  const dayUrl = `${SITE}/day/${pick.date}`;
  const unsubscribeUrl = `${SITE}/api/unsubscribe?token=${unsubscribeToken}`;
  const storyHtml = pick.story
    .split(/\n{2,}/)
    .map((p) => `<p style="font-size:16px;line-height:1.7;margin:0 0 18px;">${escapeHtml(p)}</p>`)
    .join("");
  return {
    from: FROM,
    subject: pick.teaser,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: shell(`
      <tr><td style="padding:8px;">
        <p style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#8a8172;margin:0 0 8px;">Aujourd'hui au musée · ${formatDisplayDate(pick.date)}</p>
        <a href="${dayUrl}"><img src="${artwork.imageSmallUrl}" alt="${escapeHtml(artwork.title)}" width="544" style="width:100%;height:auto;display:block;margin:16px 0 24px;" /></a>
        <h1 style="font-size:26px;font-weight:normal;font-style:italic;margin:0 0 4px;">${escapeHtml(artwork.title)}</h1>
        <p style="font-size:14px;color:#57503f;margin:0 0 24px;">${escapeHtml(artwork.artist ?? "Unknown artist")}${artwork.dateDisplay ? ` · ${escapeHtml(artwork.dateDisplay)}` : ""}</p>
        ${storyHtml}
        <p style="font-size:12px;color:#8a8172;margin:24px 0 0;">${escapeHtml(artwork.museumName)} · ${escapeHtml(artwork.creditLine)}</p>
        <p style="margin:28px 0 0;"><a href="${dayUrl}" style="color:#1c1a17;font-size:14px;">Visit today's room →</a></p>
        <p style="font-size:12px;color:#8a8172;margin:28px 0 0;"><a href="${unsubscribeUrl}" style="color:#8a8172;">Unsubscribe</a></p>
      </td></tr>
    `),
  };
}

export async function sendEdition(
  pick: DailyPick,
  artwork: Artwork,
  recipients: { email: string; token: string }[],
) {
  const client = resend();
  // Resend batch endpoint caps at 100 emails per call
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    await client.batch.send(
      chunk.map((r) => ({ ...editionEmail(pick, artwork, r.token), to: r.email })),
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
