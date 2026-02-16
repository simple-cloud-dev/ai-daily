import type { Digest } from '@ai-daily/types';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderDigestEmailHtml(params: {
  digest: Digest;
  userName?: string | null;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): string {
  const itemsHtml = params.digest.items
    .map(
      (item) => `
      <article style="padding:16px 0;border-bottom:1px solid #d8dde6;">
        <a href="${escapeHtml(item.url)}" style="font-size:18px;font-weight:700;color:#0a1221;text-decoration:none;">${escapeHtml(item.title)}</a>
        <p style="margin:8px 0 4px;font-size:12px;color:#506079;">${escapeHtml(item.sourceLabel)} · ${new Date(item.publishedAt).toLocaleString()}</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#111827;">${escapeHtml(item.summary)}</p>
      </article>
    `,
    )
    .join('');

  return `
<!doctype html>
<html lang="en">
  <body style="margin:0;background:#eef3ff;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;padding:24px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.04em;color:#5b687f;text-transform:uppercase;">AI Daily Digest</p>
                <h1 style="margin:0 0 8px;font-size:28px;line-height:1.2;color:#0a1221;">Your AI Briefing${params.userName ? `, ${escapeHtml(params.userName)}` : ''}</h1>
                <p style="margin:0 0 20px;font-size:14px;color:#5b687f;">Generated ${new Date(params.digest.generatedAt).toLocaleString()}</p>
                ${itemsHtml}
                <footer style="padding-top:20px;font-size:12px;color:#5b687f;">
                  <p>Powered by AI Daily Digest</p>
                  <p>
                    <a href="${escapeHtml(params.preferencesUrl)}" style="color:#1f5bff;">Manage preferences</a>
                    &nbsp;·&nbsp;
                    <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#1f5bff;">Unsubscribe</a>
                  </p>
                </footer>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
