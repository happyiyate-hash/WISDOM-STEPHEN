/**
 * TokenCare - High-Security Responsive Email HTML Templates
 *
 * Designed with universal inline CSS for full email client support (Gmail, Outlook, Apple Mail, Yahoo).
 * Features TokenCare's signature dark emerald cyber aesthetic (#06080E, #0D111C, #22C55E).
 */

export interface BaseEmailParams {
  userName?: string;
  userEmail?: string;
  appName?: string;
}

export interface OtpEmailParams extends BaseEmailParams {
  code: string;
  expireMinutes?: number;
}

export interface LoginVerificationParams extends OtpEmailParams {
  ipAddress?: string;
  location?: string;
  deviceInfo?: string;
  loginTime?: string;
}

export interface ForgotPasswordParams extends OtpEmailParams {
  resetLink?: string;
}

export interface SecurityAlertParams extends BaseEmailParams {
  alertType?: 'NEW_LOGIN' | 'PASSWORD_CHANGED' | '2FA_ENABLED' | 'SUSPICIOUS_ATTEMPT';
  ipAddress?: string;
  location?: string;
  deviceInfo?: string;
  eventTime?: string;
}

export interface InvitationParams extends BaseEmailParams {
  inviterName?: string;
  inviteCode?: string;
  inviteLink?: string;
  rewardAmount?: string;
}

// ----------------------------------------------------------------------
// COMMON EMAIL WRAPPER
// ----------------------------------------------------------------------
function renderEmailWrapper({
  title,
  subtitle,
  badgeText = 'Verified',
  badgeBg = '#22C55E',
  contentHtml,
  appName = 'TokenCare',
}: {
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeBg?: string;
  contentHtml: string;
  appName?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} - ${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .digit-box { width: 36px !important; height: 46px !important; font-size: 20px !important; margin: 0 2px !important; }
      .header-title { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #06080E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E4E4E7; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #06080E; padding: 36px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Wrapper -->
        <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="560" style="background-color: #0D111C; border: 1px solid #1F293D; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.85);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #15803D 0%, #22C55E 50%, #4ADE80 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #161F30;">
              <!-- App Logo & Shield Badge -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 14px; padding: 10px 18px; text-align: center;">
                    <span style="font-size: 22px; vertical-align: middle; margin-right: 6px;">🛡️</span>
                    <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; vertical-align: middle;">Token<span style="color: #22C55E;">Care</span></span>
                    <span style="display: inline-block; background-color: ${badgeBg}; color: #000000; font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 6px; text-transform: uppercase; margin-left: 8px; letter-spacing: 0.5px; vertical-align: middle;">${badgeText}</span>
                  </td>
                </tr>
              </table>

              <!-- Header Title & Subtitle -->
              <h1 class="header-title" style="margin: 20px 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">${title}</h1>
              <p style="margin: 0; font-size: 13px; color: #9CA3AF; line-height: 1.5;">${subtitle}</p>
            </td>
          </tr>

          <!-- Dynamic Body Content -->
          ${contentHtml}

          <!-- App Explanation Footer Banner -->
          <tr>
            <td style="padding: 20px 32px; background-color: #080C14; border-top: 1px solid #161F30;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 11px; color: #6B7280; line-height: 1.6;">
                    <strong style="color: #22C55E; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 3px;">What is TokenCare?</strong>
                    TokenCare is a high-security EVM token verification & care donation portal for verifying ERC-20 smart contracts, tracking token liquidity, managing automated care donations, and claiming verified community rewards across Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, and Avalanche.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Copyright Footer -->
          <tr>
            <td style="padding: 18px 32px; text-align: center; background-color: #05070B; border-top: 1px solid #111827;">
              <p style="margin: 0 0 6px 0; font-size: 10px; color: #4B5563;">
                Sent automatically by <strong>TokenCare Security Engine</strong> • Do not reply directly
              </p>
              <p style="margin: 0; font-size: 10px; color: #374151;">
                &copy; ${new Date().getFullYear()} TokenCare Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ----------------------------------------------------------------------
// HELPER: 6-DIGIT OTP DISPLAY BOX
// ----------------------------------------------------------------------
function renderOtpDigits(code: string): string {
  const digits = (code || '842915').padStart(6, '0').split('');
  return `
    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 16px auto 20px auto;">
      <tr>
        ${digits
          .map(
            (d) => `
        <td class="digit-box" style="width: 44px; height: 56px; background-color: #06080E; border: 1.5px solid #22C55E; border-radius: 12px; text-align: center; font-size: 26px; font-weight: 900; color: #4ADE80; font-family: 'Courier New', Courier, monospace; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.22); margin: 0 3px;">
          ${d}
        </td>`
          )
          .join('')}
      </tr>
    </table>`;
}

// ----------------------------------------------------------------------
// 1. VERIFY LOGIN (2FA OTP) HTML TEMPLATE
// ----------------------------------------------------------------------
export function generateLoginVerificationHtml(params: LoginVerificationParams): string {
  const code = params.code || '842915';
  const userName = params.userName || 'TokenCare User';
  const expireMinutes = params.expireMinutes || 10;
  const ipAddress = params.ipAddress || '197.210.226.45';
  const location = params.location || 'Benin City, Nigeria';
  const deviceInfo = params.deviceInfo || 'Chrome on Windows 11';
  const loginTime = params.loginTime || new Date().toUTCString();

  const contentHtml = `
    <tr>
      <td style="padding: 20px 32px 28px 32px; text-align: center;">
        
        <!-- 6-Digit Code Display -->
        ${renderOtpDigits(code)}

        <!-- Expiry Pill -->
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 24px auto;">
          <tr>
            <td style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 30px; padding: 6px 16px; text-align: center;">
              <span style="font-size: 11px; color: #FCA5A5; font-weight: 600;">⏰ Code expires in <strong>${expireMinutes} minutes</strong></span>
            </td>
          </tr>
        </table>

        <!-- Login Context Details -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #06080E; border: 1px solid #1A2436; border-radius: 14px; padding: 16px; text-align: left; margin-bottom: 20px;">
          <tr>
            <td colspan="2" style="font-size: 11px; font-weight: 800; color: #22C55E; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 10px; border-bottom: 1px solid #111827;">
              🔑 Login Request Context
            </td>
          </tr>
          <tr>
            <td style="padding-top: 10px; font-size: 11.5px; color: #9CA3AF; width: 35%;">Device:</td>
            <td style="padding-top: 10px; font-size: 11.5px; color: #FFFFFF; font-weight: 600;">${deviceInfo}</td>
          </tr>
          <tr>
            <td style="padding-top: 6px; font-size: 11.5px; color: #9CA3AF;">IP Address:</td>
            <td style="padding-top: 6px; font-size: 11.5px; color: #4ADE80; font-family: monospace;">${ipAddress}</td>
          </tr>
          <tr>
            <td style="padding-top: 6px; font-size: 11.5px; color: #9CA3AF;">Location:</td>
            <td style="padding-top: 6px; font-size: 11.5px; color: #FFFFFF;">${location}</td>
          </tr>
          <tr>
            <td style="padding-top: 6px; font-size: 11.5px; color: #9CA3AF;">Timestamp:</td>
            <td style="padding-top: 6px; font-size: 11.5px; color: #D1D5DB;">${loginTime}</td>
          </tr>
        </table>

        <!-- Warning Box -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255,255,255,0.02); border: 1px dashed #22304A; border-radius: 12px; padding: 14px; text-align: left;">
          <tr>
            <td style="font-size: 11px; color: #9CA3AF; line-height: 1.5;">
              <strong style="color: #F3F4F6;">⚠️ Didn't request this login?</strong> If this wasn't you, someone may have your password. Reset your account password immediately and do not share this code.
            </td>
          </tr>
        </table>

      </td>
    </tr>`;

  return renderEmailWrapper({
    title: 'Login Verification Code',
    subtitle: `Hello <strong style="color: #E4E4E7;">${userName}</strong>, enter the code below to complete your login.`,
    badgeText: '2FA Auth',
    badgeBg: '#22C55E',
    contentHtml,
    appName: params.appName,
  });
}

// ----------------------------------------------------------------------
// 2. FORGOT PASSWORD OTP HTML TEMPLATE
// ----------------------------------------------------------------------
export function generateForgotPasswordHtml(params: ForgotPasswordParams): string {
  const code = params.code || '842915';
  const userName = params.userName || 'TokenCare User';
  const expireMinutes = params.expireMinutes || 15;

  const contentHtml = `
    <tr>
      <td style="padding: 20px 32px 28px 32px; text-align: center;">
        
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #D1D5DB; line-height: 1.6;">
          We received a request to reset the password for your TokenCare account. Enter the 6-digit authorization code below to verify your identity and set a new password.
        </p>

        <!-- 6-Digit Code Display -->
        ${renderOtpDigits(code)}

        <!-- Expiry Pill -->
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 24px auto;">
          <tr>
            <td style="background-color: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 30px; padding: 6px 18px; text-align: center;">
              <span style="font-size: 11px; color: #FBBF24; font-weight: 700;">⏱️ Valid for <strong>${expireMinutes} minutes</strong> only</span>
            </td>
          </tr>
        </table>

        <!-- Security Guidance Box -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #06080E; border: 1px solid #1E293B; border-radius: 14px; padding: 16px; text-align: left; margin-bottom: 20px;">
          <tr>
            <td style="font-size: 11.5px; color: #9CA3AF; line-height: 1.6;">
              <strong style="color: #4ADE80; display: block; margin-bottom: 4px;">🔒 Password Security Protocol:</strong>
              • Never share this code with anyone, including TokenCare administrators.<br>
              • If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.<br>
              • Check your account security settings if you suspect unauthorized activity.
            </td>
          </tr>
        </table>

      </td>
    </tr>`;

  return renderEmailWrapper({
    title: 'Password Reset Code',
    subtitle: `Identity Verification for <strong style="color: #E4E4E7;">${userName}</strong>`,
    badgeText: 'Password Reset',
    badgeBg: '#EAB308',
    contentHtml,
    appName: params.appName,
  });
}

// ----------------------------------------------------------------------
// 3. SECURITY ALERT HTML TEMPLATE
// ----------------------------------------------------------------------
export function generateSecurityAlertHtml(params: SecurityAlertParams): string {
  const userName = params.userName || 'TokenCare User';
  const alertType = params.alertType || 'NEW_LOGIN';
  const ipAddress = params.ipAddress || '197.210.226.45';
  const location = params.location || 'Benin City, Nigeria';
  const deviceInfo = params.deviceInfo || 'Chrome on Windows 11';
  const eventTime = params.eventTime || new Date().toUTCString();

  const titleMap = {
    NEW_LOGIN: 'New Sign-In Detected',
    PASSWORD_CHANGED: 'Account Password Changed',
    '2FA_ENABLED': 'Two-Factor Auth Enabled',
    SUSPICIOUS_ATTEMPT: 'Suspicious Login Blocked',
  };

  const contentHtml = `
    <tr>
      <td style="padding: 24px 32px 28px 32px; text-align: center;">
        
        <!-- Shield Alert Icon -->
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
          <tr>
            <td style="background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 50%; width: 64px; height: 64px; text-align: center;">
              <span style="font-size: 30px; line-height: 64px;">🚨</span>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 20px 0; font-size: 13px; color: #E4E4E7; line-height: 1.6;">
          Hello <strong style="color: #FFFFFF;">${userName}</strong>, we noticed a security event associated with your TokenCare account. Details are provided below:
        </p>

        <!-- Event Details Table -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #06080E; border: 1px solid #27272A; border-radius: 14px; padding: 18px; text-align: left; margin-bottom: 24px;">
          <tr>
            <td style="padding-bottom: 8px; font-size: 11.5px; color: #9CA3AF; width: 35%;">Event Type:</td>
            <td style="padding-bottom: 8px; font-size: 11.5px; color: #F87171; font-weight: 800;">${titleMap[alertType]}</td>
          </tr>
          <tr>
            <td style="padding-bottom: 8px; font-size: 11.5px; color: #9CA3AF;">Device / Browser:</td>
            <td style="padding-bottom: 8px; font-size: 11.5px; color: #FFFFFF; font-weight: 600;">${deviceInfo}</td>
          </tr>
          <tr>
            <td style="padding-bottom: 8px; font-size: 11.5px; color: #9CA3AF;">IP Address:</td>
            <td style="padding-bottom: 8px; font-size: 11.5px; color: #4ADE80; font-family: monospace;">${ipAddress}</td>
          </tr>
          <tr>
            <td style="padding-bottom: 8px; font-size: 11.5px; color: #9CA3AF;">Location:</td>
            <td style="padding-bottom: 8px; font-size: 11.5px; color: #FFFFFF;">${location}</td>
          </tr>
          <tr>
            <td style="font-size: 11.5px; color: #9CA3AF;">Time:</td>
            <td style="font-size: 11.5px; color: #D1D5DB;">${eventTime}</td>
          </tr>
        </table>

        <!-- Security Action CTA Button -->
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 20px auto;">
          <tr>
            <td style="background-color: #EF4444; border-radius: 12px; padding: 12px 28px; text-align: center;">
              <a href="https://tokencare.app/security" style="color: #FFFFFF; font-size: 13px; font-weight: 800; text-decoration: none; display: inline-block;">
                🔒 Secure My Account Now
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>`;

  return renderEmailWrapper({
    title: titleMap[alertType],
    subtitle: `Security notification for <strong style="color: #E4E4E7;">${userName}</strong>`,
    badgeText: 'Security Alert',
    badgeBg: '#EF4444',
    contentHtml,
    appName: params.appName,
  });
}

// ----------------------------------------------------------------------
// 4. INVITATION / REFERRAL HTML TEMPLATE
// ----------------------------------------------------------------------
export function generateInvitationHtml(params: InvitationParams): string {
  const userName = params.userName || 'Friend';
  const inviterName = params.inviterName || 'Alex (TokenCare Member)';
  const inviteCode = params.inviteCode || 'CARE-984210';
  const rewardAmount = params.rewardAmount || '+15 REWARD Tokens';

  const contentHtml = `
    <tr>
      <td style="padding: 24px 32px 28px 32px; text-align: center;">
        
        <!-- Gift Icon -->
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
          <tr>
            <td style="background-color: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 50%; width: 64px; height: 64px; text-align: center;">
              <span style="font-size: 32px; line-height: 64px;">🎁</span>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #FFFFFF; font-weight: 700;">
          ${inviterName} has invited you to join TokenCare!
        </p>

        <p style="margin: 0 0 24px 0; font-size: 13px; color: #9CA3AF; line-height: 1.6;">
          TokenCare is the Web3 platform for verifying EVM token contracts and earning community care rewards. By joining with this exclusive invitation, both you and ${inviterName} will receive <strong>${rewardAmount}</strong> upon account verification.
        </p>

        <!-- Invite Code Box -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #06080E; border: 1.5px dashed #22C55E; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <tr>
            <td style="font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; padding-bottom: 6px;">
              Your Exclusive Invite Code
            </td>
          </tr>
          <tr>
            <td style="font-size: 24px; font-weight: 900; color: #4ADE80; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px;">
              ${inviteCode}
            </td>
          </tr>
        </table>

        <!-- Registration CTA Button -->
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
          <tr>
            <td style="background: linear-gradient(90deg, #15803D 0%, #22C55E 100%); border-radius: 12px; padding: 14px 32px; text-align: center; box-shadow: 0 4px 20px rgba(34, 197, 94, 0.35);">
              <a href="https://tokencare.app/register?ref=${inviteCode}" style="color: #000000; font-size: 13.5px; font-weight: 900; text-decoration: none; display: inline-block; letter-spacing: 0.3px;">
                🚀 Claim Reward & Create Account
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>`;

  return renderEmailWrapper({
    title: 'You Are Invited!',
    subtitle: `Special invitation for <strong style="color: #E4E4E7;">${userName}</strong>`,
    badgeText: 'VIP Invite',
    badgeBg: '#22C55E',
    contentHtml,
    appName: params.appName,
  });
}

// ----------------------------------------------------------------------
// 5. GENERIC 6-DIGIT OTP HTML TEMPLATE
// ----------------------------------------------------------------------
export function generateOtpEmailHtml(params: OtpEmailParams): string {
  return generateLoginVerificationHtml(params);
}
