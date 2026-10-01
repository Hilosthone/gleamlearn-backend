export const getLoginWelcomeEmailTemplate = (fullName: string, dashboardUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .email-wrapper {
      animation: fadeIn 0.6s ease-out;
      font-family: 'Plus Jakarta Sans', Inter, Arial, sans-serif;
      background-color: #FCFAF8;
      padding: 40px 20px;
      color: #211A16;
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
      background: linear-gradient(135deg, #8B5E3C 0%, #2F855A 100%);
      padding: 30px;
      text-align: center;
      color: #FFFFFF;
    }
    .email-body {
      padding: 35px 30px;
    }
    .alert-box {
      background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
      border: 1px solid #86EFAC;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 25px 0;
      color: #166534;
      font-size: 15px;
      font-weight: 500;
    }
    .cta-button {
      background-color: #2F855A;
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      display: inline-block;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(47, 133, 90, 0.2);
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
<body class="email-wrapper">
  <div class="email-container">
    <div class="email-header">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">GleamLearn</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">New Session Alert</p>
    </div>
    <div class="email-body">
      <h2 style="color: #8B5E3C; margin-top: 0; font-size: 20px;">Welcome back, ${fullName}! 🎉</h2>
      <p style="color: #211A16; font-size: 15px; line-height: 1.6;">We noticed a successful login to your GleamLearn account. Your personal AI learning ecosystem is ready and waiting for your next study session.</p>
      
      <div class="alert-box">
        💡 Ready to continue building your skills? Jump back into your tailored courses and quizzes today!
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" class="cta-button">Open Dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">If this wasn't you, please secure your account immediately by resetting your password.</p>
      <p style="margin: 0; font-weight: 600; color: #7C3AED;">Warm regards, <br/><strong>GleamLearn AI</strong> 🚀</p>
    </div>
  </div>
</body>
</html>
`;