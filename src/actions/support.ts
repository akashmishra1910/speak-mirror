"use server";

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

  // In production, this is where you would call an email API (like Resend)
  // or insert a row into a `support_tickets` table in Supabase.
  
  return { success: true, message: "Support ticket registered successfully" };
}
