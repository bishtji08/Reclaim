const nodemailer = require('nodemailer');
const pool = require('../config/database');
const env = require('../config/env');

let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true' || Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('[NotificationService] Nodemailer SMTP transport initialized');
  } catch (err) {
    console.warn('[NotificationService] Failed to initialize SMTP transporter:', err.message);
  }
}

const sendEmailNotification = async ({ to, subject, html, text }) => {
  if (!to) return false;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'ReClaim Lost & Found'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html: html || `<p>${text}</p>`,
      });
      console.log(`[NotificationService] Email dispatched to ${to}: ${subject}`);
      return true;
    } catch (err) {
      console.error(`[NotificationService] Failed to send email to ${to}:`, err.message);
      return false;
    }
  } else {
    // In development or when SMTP not configured, log email notification safely
    console.log(`[NotificationService:MockEmail] To: ${to} | Subject: ${subject} | Content: ${text}`);
    return true;
  }
};

const notificationService = {
  sendEmailNotification,

  async getUnreadCount(userId) {
    const res = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(res.rows[0]?.unread_count || 0, 10);
  },

  async createNotification({
    userId,
    title,
    message,
    type = 'system',
    relatedItemId = null,
    relatedClaimId = null,
    actionUrl = null,
    userEmail = null,
    sendEmail = true,
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO notifications (
          user_id, title, message, type, related_item_id, related_claim_id, action_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [userId, title, message, type, relatedItemId, relatedClaimId, actionUrl]
      );

      const notification = res.rows[0];

      // Send email if requested
      if (sendEmail) {
        let recipientEmail = userEmail;
        if (!recipientEmail) {
          const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
          recipientEmail = userRes.rows[0]?.email;
        }

        if (recipientEmail) {
          await sendEmailNotification({
            to: recipientEmail,
            subject: `[ReClaim GEU] ${title}`,
            text: message,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
                <h2 style="color: #2563eb; margin-bottom: 8px;">ReClaim Campus Notice</h2>
                <h3 style="color: #1e293b; margin-top: 0;">${title}</h3>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">${message}</p>
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
                  Graphic Era University Lost & Found Automated System. Do not reply directly to this automated email.
                </div>
              </div>
            `,
          });
        }
      }

      return notification;
    } catch (err) {
      console.error('[NotificationService] Error creating notification:', err.message);
      return null;
    }
  },

  async notifyReportConfirmation({ user, item }) {
    return this.createNotification({
      userId: user.id,
      userEmail: user.email,
      title: 'Report Received',
      message: `Your ${item.type} item "${item.title}" has been registered in the campus directory. We will notify you when potential matches or claims are found.`,
      type: 'system',
      relatedItemId: item.id,
    });
  },

  async notifyClaimSubmitted({ itemReporterId, claimerName, item, claimId }) {
    return this.createNotification({
      userId: itemReporterId,
      title: 'New Ownership Claim Submitted',
      message: `${claimerName} submitted a proof-of-ownership claim for your reported item: "${item.title}". Please review the claim details.`,
      type: 'claim',
      relatedItemId: item.id,
      relatedClaimId: claimId,
    });
  },

  async notifyClaimReviewed({ claimerId, itemTitle, status, reviewNotes }) {
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';
    const noteText = reviewNotes ? ` Note from reviewer: "${reviewNotes}"` : '';
    return this.createNotification({
      userId: claimerId,
      title: `Claim ${statusText}`,
      message: `Your claim for item "${itemTitle}" was ${status}.${noteText}`,
      type: 'claim',
    });
  },

  async notifyItemReturned({ userId, itemTitle }) {
    return this.createNotification({
      userId,
      title: 'Item Marked as Returned',
      message: `The item "${itemTitle}" has been officially marked as returned and closed in the directory. Please consider leaving a feedback review to help campus trust.`,
      type: 'status_update',
    });
  },

  async sendVerificationEmail({ email, name, token, frontendUrl }) {
    const baseUrl = (frontendUrl || 'http://localhost:5173').replace(/\/$/, '');
    const verificationUrl = `${baseUrl}?verify_token=${token}&email=${encodeURIComponent(email)}`;
    console.log(`[NotificationService:EmailVerification] Verification link for ${email}: ${verificationUrl}`);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background: #0f172a; padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">RE<span style="color: #3b82f6;">claim</span></h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; font-weight: 500;">Graphic Era University, Dehradun</p>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 12px;">Confirm Your University Account</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Hello ${name || 'Campus Member'},<br/><br/>
            Thank you for registering on REclaim. To protect our campus community and verify student/staff identity, please confirm your email address.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
              Verify Email Address
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px;">
            Or copy and paste this verification URL into your browser:<br/>
            <span style="color: #2563eb; word-break: break-all;">${verificationUrl}</span>
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            If you did not create this account, you can safely ignore this email.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
          Graphic Era University • Bell Road, Clement Town, Dehradun 248002
        </div>
      </div>
    `;

    return sendEmailNotification({
      to: email,
      subject: '[REclaim GEU] Please verify your email address',
      text: `Hello ${name || 'Campus Member'}, please verify your REclaim account by opening this link: ${verificationUrl}`,
      html
    });
  },

  async sendPasswordResetEmail({ email, name, token, frontendUrl }) {
    const baseUrl = (frontendUrl || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${baseUrl}?reset_token=${token}&email=${encodeURIComponent(email)}`;
    console.log(`[NotificationService:PasswordReset] Password reset link for ${email}: ${resetUrl}`);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background: #0f172a; padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">RE<span style="color: #3b82f6;">claim</span></h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; font-weight: 500;">Graphic Era University, Dehradun</p>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 12px;">Reset Your Password</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Hello ${name || 'Campus Member'},<br/><br/>
            We received a request to reset the password for your REclaim account. Click the button below to choose a new secure password:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
              Reset Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px;">
            Or copy and paste this URL into your browser:<br/>
            <span style="color: #2563eb; word-break: break-all;">${resetUrl}</span>
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            This link is valid for 1 hour. If you didn't request a password reset, no action is required.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
          Graphic Era University • Bell Road, Clement Town, Dehradun 248002
        </div>
      </div>
    `;

    return sendEmailNotification({
      to: email,
      subject: '[REclaim GEU] Password Reset Request',
      text: `Hello ${name || 'Campus Member'}, please reset your password using this link: ${resetUrl}`,
      html
    });
  },
};

module.exports = notificationService;
