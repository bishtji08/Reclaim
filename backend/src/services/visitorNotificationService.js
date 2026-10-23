const pool = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');

// Cache of recently notified sessions in memory to avoid redundant DB queries
const recentNotifiedCache = new Set();

/**
 * Parses user-agent header into privacy-friendly coarse category
 * Strictly coarse (Desktop, Mobile, Tablet) with NO fingerprinting or tracking
 */
function parseCoarseDevice(userAgent = '') {
  if (!userAgent || typeof userAgent !== 'string') {
    return { deviceType: 'Desktop', browserName: 'Browser' };
  }

  const ua = userAgent.toLowerCase();
  let deviceType = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'Tablet';
  }

  let browserName = 'Other';
  if (/edg\//i.test(ua)) browserName = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browserName = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browserName = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browserName = 'Safari';

  return { deviceType, browserName };
}

/**
 * Dispatches an email notification via Brevo API v3 or SMTP fallback
 */
async function sendEmailAlert({ subject, text, html }) {
  const recipient = env.ownerNotificationEmail;
  if (!recipient) {
    logger.debug('[VisitorAlert] No owner email configured. Skipping email notification.');
    return false;
  }

  // Option 1: Brevo Transactional Email API v3
  if (env.brevoApiKey) {
    try {
      const response = await globalThis.fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: env.brevoSenderName || 'REclaim Lost & Found',
            email: env.brevoSenderEmail || 'no-reply@reclaim-geu.edu'
          },
          to: [{ email: recipient }],
          subject,
          htmlContent: html,
          textContent: text
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.warn(`[VisitorAlert] Brevo API responded with error (${response.status}): ${errText}`);
        return false;
      }

      logger.info(`[VisitorAlert] Dispatched Brevo email alert to ${recipient}`);
      return true;
    } catch (err) {
      logger.warn('[VisitorAlert] Failed to send email via Brevo API:', err.message);
      // Fallback to SMTP below
    }
  }

  // Option 2: Fallback to existing nodemailer / SMTP if available
  try {
    const notificationService = require('./notificationService');
    const sent = await notificationService.sendEmailNotification({
      to: recipient,
      subject,
      text,
      html
    });
    return sent;
  } catch (err) {
    logger.warn('[VisitorAlert] SMTP notification fallback error:', err.message);
    return false;
  }
}

/**
 * Dispatches a Telegram Bot notification
 */
async function sendTelegramAlert({ text }) {
  const token = env.telegramBotToken;
  const chatId = env.telegramChatId;

  if (!token || !chatId) {
    logger.debug('[VisitorAlert] Telegram bot token or chat ID not set. Skipping Telegram notification.');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await globalThis.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.warn(`[VisitorAlert] Telegram API error (${response.status}): ${errText}`);
      return false;
    }

    logger.info(`[VisitorAlert] Telegram notification dispatched to chat ${chatId}`);
    return true;
  } catch (err) {
    logger.warn('[VisitorAlert] Failed to send Telegram alert:', err.message);
    return false;
  }
}

/**
 * Triggered on the very first recording of a new visitor session
 * Enforces atomic deduplication to prevent duplicate alerts
 */
async function notifyNewVisitorSession({
  sessionId,
  visitorType = 'guest',
  landingPath = '/',
  deviceType = 'Desktop',
  browserName = 'Browser',
  startedAt = new Date()
}) {
  if (!sessionId) return;

  // In-memory quick check
  if (recentNotifiedCache.has(sessionId)) {
    return;
  }

  try {
    // Atomic database update: only the single invocation that flips notification_sent to true proceeds
    const updateRes = await pool.query(
      `UPDATE public.visitor_sessions
       SET notification_sent = true
       WHERE session_id = $1 AND notification_sent = false
       RETURNING session_id`,
      [sessionId]
    );

    if (updateRes.rowCount === 0) {
      // Already notified or session doesn't exist
      return;
    }

    // Add to in-memory cache and keep cache bounded
    recentNotifiedCache.add(sessionId);
    if (recentNotifiedCache.size > 2000) {
      const it = recentNotifiedCache.values();
      for (let i = 0; i < 500; i++) {
        recentNotifiedCache.delete(it.next().value);
      }
    }

    const shortId = sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
    const isAuth = visitorType === 'authenticated';
    const typeLabel = isAuth ? 'Authenticated Campus Member' : 'Guest Visitor';
    const timeFormatted = new Date(startedAt).toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const subject = `[REclaim Alert] New Visitor Session (${typeLabel})`;

    // Clean plain text
    const text = `
REclaim Lost & Found - New Visitor Session Recorded
--------------------------------------------------
Status: ${typeLabel}
Session ID: sess_${shortId}...
Landing Page: ${landingPath}
Device / Browser: ${deviceType} (${browserName})
Time: ${timeFormatted} IST

Privacy Protection:
- Zero IP addresses or personal identities collected.
- Fully GDPR / privacy-compliant visitor analytics.
    `.trim();

    // Clean HTML email
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span style="background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Campus Telemetry</span>
          <span style="color: #94a3b8; font-size: 12px;">• Graphic Era University</span>
        </div>
        <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 800;">New Visitor Session Recorded</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">
          A new unique browser session has initiated browsing on the REclaim platform.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Visitor Type:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">
                <span style="background: ${isAuth ? '#ecfdf5' : '#f1f5f9'}; color: ${isAuth ? '#047857' : '#334155'}; padding: 3px 8px; border-radius: 6px; font-size: 12px;">
                  ${typeLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Landing Route:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;"><code>${landingPath}</code></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Device / Client:</td>
              <td style="padding: 6px 0; color: #0f172a;">${deviceType} (${browserName})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Session Ref:</td>
              <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">sess_${shortId}***</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Recorded At:</td>
              <td style="padding: 6px 0; color: #0f172a;">${timeFormatted}</td>
            </tr>
          </table>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; font-size: 12px; color: #166534; line-height: 1.4;">
          🛡️ <strong>Privacy Protection Guarantee:</strong> No IP addresses, names, emails, or hardware fingerprints are collected or retained for visitor sessions.
        </div>
      </div>
    `;

    // Telegram Markdown message
    const telegramText = [
      `🔔 *REclaim GEU — New Visitor Session*`,
      ``,
      `• *Type:* ${isAuth ? '👤 Authenticated Member' : '🌐 Guest Visitor'}`,
      `• *Landing Page:* \`${landingPath}\``,
      `• *Device:* ${deviceType} (${browserName})`,
      `• *Session:* \`sess_${shortId}...\``,
      `• *Time:* ${timeFormatted}`,
      ``,
      `_🛡️ Privacy compliant: No IP or PII tracked._`
    ].join('\n');

    // Run both asynchronously
    await Promise.allSettled([
      sendEmailAlert({ subject, text, html }),
      sendTelegramAlert({ text: telegramText })
    ]);

  } catch (err) {
    logger.warn('[VisitorAlert] Error dispatching visitor notification:', err.message);
  }
}

module.exports = {
  notifyNewVisitorSession,
  parseCoarseDevice
};
