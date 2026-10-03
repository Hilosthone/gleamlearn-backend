// src/mail/template/new-device.template.ts
export const getNewDeviceEmailTemplate = (
  fullName: string,
  device: string,
  browser: string,
  location: string,
  dateTime: string,
  resetUrl: string,
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
      background: linear-gradient(135deg, #8B5E3C 0%, #E67E22 100%);
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
    .details-box {
      background-color: #FCFAF8;
      border: 1px solid #E7DED7;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      font-size: 14px;
      line-height: 1.7;
    }
    .cta-button {
      background-color: #E67E22;
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 10px;
      display: inline-block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(230, 126, 34, 0.2);
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
  <div class="email-wrapper">
    <div style="display: none; max-height: 0px; overflow: hidden;">
      A new device was used to access your account.
    </div>
    <div class="email-container">
      <div class="email-header">
        <h1 class="brand-title">GleamLearn 🎓</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">New Device Alert</p>
      </div>
      <div class="email-body">
        <h2>New Device Detected</h2>
        <p>Hi ${fullName},</p>
        <p>We noticed a sign-in to your GleamLearn account from a device we haven’t seen before.</p>
        
        <div class="details-box">
          • Device: ${device}<br>
          • Browser: ${browser}<br>
          • Location: ${location}<br>
          • Time: ${dateTime}
        </div>

        <p>If you recognize this activity, you can continue learning normally. If you don’t recognize it, we recommend changing your password immediately.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" class="cta-button">Review Account Security</a>
        </div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">For your security, never share your password or verification codes.</p>
        <p style="margin: 0;">© ${year} GleamLearn. All rights reserved. • For support: <a href="mailto:${supportEmail}" style="color: #8B5E3C; text-decoration: none;">${supportEmail}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;