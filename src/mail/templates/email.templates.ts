// src/mail/templates/email.templates.ts

export const getVerificationEmailTemplate = (verificationUrl: string) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h2 style="color: #4F46E5;">Welcome to GleamLearn!</h2>
    <p>Please click the button below to verify your email address and activate your account:</p>
    <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-top: 15px;">Verify Email</a>
    <p style="margin-top: 20px;">Or paste this link into your browser: <br/><a href="${verificationUrl}">${verificationUrl}</a></p>
    <p style="color: #666; font-size: 12px; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
  </div>
`;

export const getPasswordResetEmailTemplate = (resetUrl: string) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h2 style="color: #4F46E5;">Password Reset</h2>
    <p>You requested a password reset. Click the button below to choose a new password:</p>
    <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-top: 15px;">Reset Password</a>
    <p style="margin-top: 20px;">Or paste this link into your browser: <br/><a href="${resetUrl}">${resetUrl}</a></p>
    <p style="color: #666; font-size: 12px; margin-top: 30px;">This link expires shortly. If you didn't request this, you can safely ignore this email.</p>
  </div>
`;