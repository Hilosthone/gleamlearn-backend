// src/mail/template/password-reset.template.ts
export const getPasswordResetEmailTemplate = (fullName: string, resetUrl: string, otpCode: string, expiryMinutes: number = 10) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #FCFAF8;
      font-family: 'Inter', Arial, sans-serif;
      color: #211A16;
    }
    .email-wrapper {
      width: 100%;
      background-color: #FCFAF8;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E7DED7;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(139, 94, 60, 0.06);
    }
    .email-header {
      background: linear-gradient(135deg, #8B5E3C 0%, #7C3AED 100%);
      padding: 30px;
      text-align: center;
      color: #FFFFFF;
    }
    .email-body {
      padding: 35px 30px;
    }
    .otp-box {
      background: linear-gradient(135deg, #FFFBEB 0%, #FEF9C3 100%);
      border: 2px dashed #D4A72C;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 25px 0;
    }
    .otp-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 32px;
      font-weight: 700;
      color: #8B5E3C;
      letter-spacing: 6px;
      margin-top: 8px;
    }
    .cta-button {
      background-color: #8B5E3C;
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      display: inline-block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(139, 94, 60, 0.2);
    }
    .footer {
      text-align: center;
      padding: 20px 30px;
      background-color: #FCFAF8;
      border-top: 1px solid #E7DED7;
      color: #8B8179;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    We received a request to reset your password.
  </div>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 style="margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">GleamLearn</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Secure Account Recovery</p>
      </div>
      <div class="email-body">
        <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; color: #8B5E3C; margin-top: 0; font-size: 20px;">Hello, ${fullName}! 🔐</h2>
        <p style="color: #211A16; font-size: 15px; line-height: 1.6;">You recently requested a password reset for your GleamLearn account. Use the secure 6-digit code below or click the button to proceed. This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
        
        <div class="otp-box">
          <p style="margin: 0; color: #713F12; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Password Reset OTP Code</p>
          <div class="otp-code">${otpCode}</div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" class="cta-button">Reset Password</a>
        </div>

        <p style="color: #8B8179; font-size: 13px; line-height: 1.5;">Or copy and paste this link into your browser: <br/><a href="${resetUrl}" style="color: #2563EB; word-break: break-all;">${resetUrl}</a></p>
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">If you didn't request this, you can safely ignore this email.</p>
        <p style="margin: 0; font-weight: 600; color: #7C3AED;">Warm regards, <br/><strong>GleamLearn AI</strong> 🚀</p>
      </div>
    </div>
  </div>
</body>
</html>
`;