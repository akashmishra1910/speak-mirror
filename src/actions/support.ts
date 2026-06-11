"use server";

import nodemailer from "nodemailer";


export interface SupportPayload {
  email: string;
  category: string;
  message: string;
}

export async function submitSupportRequest(payload: SupportPayload) {
  console.log("========================================");
  console.log("📨 RECEIVED SUPPORT REQUEST / FEEDBACK");
  console.log("Timestamp:", new Date().toISOString());
  console.log("User Email:", payload.email);
  console.log("Category:", payload.category);
  console.log("Message:", payload.message);
  console.log("========================================");




  const recipientEmail = "teamclassiq@gmail.com";

  // Check if credentials exist for sending emails
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const categoryLabel = {
        bug: "Bug Report 🐛",
        feature: "Feature Request 💡",
        account: "Account Issue 🔑",
        other: "General Feedback 💬",
      }[payload.category] || payload.category;

      await transporter.sendMail({
        from: `"SpeakMirror Support" <${process.env.GMAIL_USER}>`,
        to: recipientEmail,
        replyTo: payload.email,
        subject: `[SpeakMirror Support] ${categoryLabel} from ${payload.email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
            <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">New Support Inquiry / Feedback 📨</h2>
            <p>You have received a new support ticket submitted from the SpeakMirror app widget.</p>
            
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #f3f4f6;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; width: 120px; color: #4b5563; font-size: 14px;">User Email:</td>
                  <td style="padding: 6px 0; color: #111827; font-size: 14px;"><a href="mailto:${payload.email}">${payload.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #4b5563; font-size: 14px;">Category:</td>
                  <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${categoryLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #4b5563; font-size: 14px;">Timestamp:</td>
                  <td style="padding: 6px 0; color: #111827; font-size: 14px; font-family: monospace;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <h3 style="color: #374151; font-size: 15px; margin-bottom: 8px;">Message Content:</h3>
            <div style="background-color: #ffffff; border-left: 4px solid #4f46e5; padding: 12px 16px; margin-bottom: 20px; font-style: italic; font-size: 15px; line-height: 1.6; color: #1f2937;">
              "${payload.message.replace(/\n/g, "<br />")}"
            </div>
            
            <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;">
              This is an automated notification from SpeakMirror. Please reply directly to this email to contact the user.
            </div>
          </div>
        `,
      });
      console.log(`Support email successfully dispatched to ${recipientEmail}`);
    } catch (err: any) {
      console.error("Failed to send support email via Nodemailer:", err.message);
    }
  } else {
    console.warn("Gmail transport credentials not configured in environment variables. Email was only logged to console.");
  }

  return { success: true, message: "Support ticket registered successfully" };
}
