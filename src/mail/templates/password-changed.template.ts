// src/mail/template/password-changed.template.ts
export const getPasswordChangedEmailTemplate = (
  fullName: string, 
  supportEmail: string = 'gleamlearn.ai@gmail.com', 
  year: number = new Date().getFullYear()
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
    
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
      background: linear-gradient(135deg, #8B5E3C 0%, #2F855A 100%);
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
    .cta-button {
      background-color: #DC2626;
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 10px;
      display: inline-block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
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
    Your account password has been updated.
  </div>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 class="brand-title">GleamLearn 🎓</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Security Notification</p>
      </div>
      <div class="email-body">
        <h2>Password Successfully Changed</h2>
        <p>Hi ${fullName},</p>
        <p>This is a confirmation that the password for your GleamLearn account was successfully changed.</p>
        <p>If you made this change, you can safely disregard this email.</p>
        
        <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 20px; margin: 25px 0; color: #991B1B; font-size: 14px;">
          <strong>Didn't make this change?</strong> If you did not update your password, your account may have been compromised. Please contact our support team immediately.
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${supportEmail}" class="cta-button">Contact Support Immediately</a>
        </div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">This is an automated security alert from GleamLearn.</p>
        <p style="margin: 0;">© ${year} GleamLearn. All rights reserved. • For support: <a href="mailto:${supportEmail}" style="color: #8B5E3C; text-decoration: none;">${supportEmail}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;