import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Use service role key to bypass RLS and access auth.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel CRON secret if deployed
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Fetch all active tasks from today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('room_tasks')
      .select('id, room_id, topic_of_the_day, rooms(name)')
      .gte('created_at', today.toISOString());

    if (tasksError || !tasks || tasks.length === 0) {
      return NextResponse.json({ message: 'No active tasks found today.' });
    }

    let emailsSent = 0;

    // 3. For each task, find users in that room who HAVEN'T submitted a recording today
    for (const task of tasks) {
      // Get all members of the room
      const { data: members } = await supabaseAdmin
        .from('room_members')
        .select('user_id')
        .eq('room_id', task.room_id);

      if (!members) continue;

      // Get all users who HAVE submitted for this task
      const { data: submissions } = await supabaseAdmin
        .from('recordings')
        .select('user_id')
        .eq('task_id', task.id);

      const submittedUserIds = new Set(submissions?.map(s => s.user_id) || []);

      // Find members who haven't submitted
      const pendingUserIds = members
        .map(m => m.user_id)
        .filter(id => !submittedUserIds.has(id));

      if (pendingUserIds.length === 0) continue;

      // Fetch emails for pending users from auth.users (requires service_role)
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      
      const pendingUsers = authUsers?.users.filter(u => pendingUserIds.includes(u.id)) || [];

      // 4. Send emails to pending users
      for (const user of pendingUsers) {
        if (!user.email) continue;
        
        const roomName = (task.rooms as any)?.name || 'your team';
        
        try {
          if (process.env.GMAIL_APP_PASSWORD) {
            await transporter.sendMail({
              from: `"SpeakMirror" <${process.env.GMAIL_USER}>`,
              to: user.email,
              subject: `Reminder: Daily SpeakMirror Task for ${roomName}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Hi there! 👋</h2>
                  <p>You have a pending daily speaking task for <strong>${roomName}</strong>.</p>
                  <p><strong>Topic of the day:</strong> ${task.topic_of_the_day}</p>
                  <br/>
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/rooms/${task.room_id}" 
                     style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Complete Task Now
                  </a>
                  <br/><br/>
                  <p style="color: #666; font-size: 14px;">Keep up the great practice to improve your communication skills!</p>
                </div>
              `
            });
            emailsSent++;
          } else {
            console.log(`[Mock Email] Would send reminder to ${user.email} for task ${task.id}`);
          }
        } catch (emailErr) {
          console.error("Failed to send email to", user.email, emailErr);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: process.env.GMAIL_APP_PASSWORD 
        ? `Sent ${emailsSent} reminder emails.` 
        : `Mocked ${emailsSent} reminder emails. Set GMAIL_APP_PASSWORD to actually send.`
    });

  } catch (err: any) {
    console.error('CRON Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
