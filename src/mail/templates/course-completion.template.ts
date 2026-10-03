// src/mail/templates/course-completion.template.ts

export function getCourseCompletionEmailTemplate(fullName: string, courseTitle: string, certificateUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Completed!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
      color: #333333;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f4f6f8;
      padding: 40px 0;
    }
    .email-content {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .email-body {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .email-body h2 {
      color: #1f2937;
      font-size: 20px;
      margin-top: 0;
    }
    .achievement-card {
      background-color: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .achievement-card p {
      margin: 0;
      color: #4b5563;
      font-size: 15px;
    }
    .achievement-title {
      font-weight: bold;
      color: #111827;
      font-size: 18px;
      margin-bottom: 5px !important;
    }
    .btn-container {
      text-align: center;
      margin: 35px 0 20px 0;
    }
    .btn {
      background-color: #4f46e5;
      color: #ffffff !important;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      display: inline-block;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
    }
    .email-footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-content">
      <div class="email-header">
        <h1>🎓 Congratulations!</h1>
      </div>
      <div class="email-body">
        <h2>Hi ${fullName},</h2>
        <p>Huge milestone unlocked! You have successfully completed all modules and requirements for your course.</p>
        
        <div class="achievement-card">
          <p class="achievement-title">🌟 ${courseTitle}</p>
          <p>Your dedication, consistency, and hard work have truly paid off. We are proud to have you on GleamLearn!</p>
        </div>

        <p>You can now download your official certificate of completion, share it on your professional networks, or keep stacking up new skills on your dashboard.</p>

        <div class="btn-container">
          <a href="${certificateUrl}" class="btn" target="_blank">View & Download Certificate</a>
        </div>
      </div>
      <div class="email-footer">
        <p>&copy; ${new Date().getFullYear()} GleamLearn. Keep growing, keep learning.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}