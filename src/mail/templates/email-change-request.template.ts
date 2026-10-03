// src/mail/template/email-change-request.template.ts
export const getEmailChangeRequestEmailTemplate = (
  fullName: string, 
  newEmail: string, 
  otpCode: string, 
  expiryMinutes: number = 10, 
  supportEmail: string = 'gleamlearn.ai@gmail.com', 
  year: number = new Date().getFullYear()
) => `
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
      box-shadow: 0 4px 24px rgba(139, 94, 60, 0.05);
    }
    .email-header {
      background: linear-gradient(135deg, #8B5E3C 0%, #D4A72C 100%);
      padding: 35px 30px;
      text-align: left;
      color: #FFFFFF;
    }
    .brand-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .email-body {
      padding: 35px 30px;
    }
    h2 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #8B5E3C;
      font-size: 22px;
      margin-top: 0;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #211A16;
      margin: 0 0 16px 0;
    }
    .otp-box {
      background: linear-gradient(135deg, #FFFBEB 0%, #FEF9C3 100%);
      border: 2px dashed #D4A72C;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 25px 0;
    }
    .otp-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 34px;
      font-weight: 700;
      color: #8B5E3C;
      letter-spacing: 6px;
      margin-top: 8px;
    }
    .footer {
      text-align: left;
      padding: 24px 30px;
      background-color: #FCFAF8;
      border-top: 1px solid #E7DED7;
      color: #8B8179;
      font-size: 13px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    Confirm your request to change your account email address.
  </div>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 class="brand-title">GleamLearn 🎓</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Account Settings Update</p>
      </div>
      <div class="email-body">
        <h2>Email Change Request</h2>
        <p>Hi ${fullName},</p>
        <p>We received a request to update your GleamLearn account email address to <strong>${newEmail}</strong>.</p>
        <p>Please use the secure code below to confirm this change:</p>
        
        <div class="otp-box">
          <p style="margin: 0; color: #713F12; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Confirmation Code</p>
          <div class="otp-code">${otpCode}</div>
        </div>

        <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
        <p style="font-size: 14px; color: #8B8179;">If you didn't request this change, please ignore this email or contact support immediately to secure your account.</p>
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">This is an automated security notice from GleamLearn.</p>
        <p style="margin: 0;">© ${year} GleamLearn. All rights reserved. • For support: <a href="mailto:${supportEmail}" style="color: #8B5E3C; text-decoration: none;">${supportEmail}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;