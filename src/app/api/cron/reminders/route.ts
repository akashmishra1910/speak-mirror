import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/api-response';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    // 1. Verify Vercel CRON secret if deployed
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    // 2. Fetch all active tasks from today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('room_tasks')
      .select('id, room_id, topic_of_the_day, rooms(name, organization_id)')
      .gte('created_at', today.toISOString());

    let emailsSent = 0;

    // Fetch all users list once to check both assignments and streaks
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

    if (!tasksError && tasks && tasks.length > 0) {
      // 3. For each task, find users in that room who HAVEN'T submitted a recording today
      for (const task of tasks) {
        // Get all members of the room or organization
        const organizationId = (task.rooms as any)?.organization_id;
        let memberIds: string[] = [];

        if (organizationId) {
          const { data: orgUsers } = await supabaseAdmin
            .from('organization_users')
            .select('user_id')
            .eq('organization_id', organizationId);
          
          if (orgUsers) {
            memberIds = orgUsers.map(ou => ou.user_id);
          }
        } else {
          const { data: members } = await supabaseAdmin
            .from('room_members')
            .select('user_id')
            .eq('room_id', task.room_id);
          
          if (members) {
            memberIds = members.map(m => m.user_id);
          }
        }

        if (memberIds.length === 0) continue;

        // Get all users who HAVE submitted for this task
        const { data: submissions } = await supabaseAdmin
          .from('recordings')
          .select('user_id')
          .eq('task_id', task.id);

        const submittedUserIds = new Set(submissions?.map(s => s.user_id) || []);

        // Find members who haven't submitted
        const pendingUserIds = memberIds.filter(id => !submittedUserIds.has(id));

        if (pendingUserIds.length === 0) continue;

        const pendingUsers = authUsers?.users.filter(u => pendingUserIds.includes(u.id)) || [];

        // 4. Send emails to pending users
        for (const member of pendingUsers) {
          if (!member.email) continue;
          
          const roomName = (task.rooms as any)?.name || 'your team';
          
          try {
            if (process.env.GMAIL_APP_PASSWORD) {
              await transporter.sendMail({
                from: `"SpeakMirror" <${process.env.GMAIL_USER}>`,
                to: member.email,
                subject: `Reminder: Daily SpeakMirror Task for ${roomName}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Hi there! 👋</h2>
                    <p>You have a pending daily speaking task for <strong>${roomName}</strong>.</p>
                    <p><strong>Topic of the day:</strong> ${task.topic_of_the_day}</p>
                    <br/>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/rooms/${task.room_id}" 
                       style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      Complete Task Now
                    </a>
                    <br/><br/>
                    <p style="color: #666; font-size: 14px;">Keep up the great practice to improve your communication skills!</p>
                  </div>
                `
              });
              emailsSent++;
            } else {
              console.log(`[Mock Email] Would send reminder to ${member.email} for task ${task.id}`);
              emailsSent++;
            }
          } catch (emailErr) {
            console.error("Failed to send email to", member.email, emailErr);
          }
        }
      }
    }

    // 5. Streak Saver Nudge for Personal Space
    const { data: allRecordings, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('user_id, created_at')
      .order('created_at', { ascending: false });

    if (!recError && allRecordings && authUsers?.users) {
      const todayStr = new Date().toDateString();
      const todayMidnight = new Date();
      todayMidnight.setUTCHours(0, 0, 0, 0);
      const yesterdayMidnight = todayMidnight.getTime() - 86400000;

      for (const authUser of authUsers.users) {
        if (!authUser.email) continue;
        
        // Filter recordings for this user
        const userRecs = allRecordings.filter(r => r.user_id === authUser.id);
        
        // Check if practiced today
        const practicedToday = userRecs.some(r => new Date(r.created_at).toDateString() === todayStr);
        if (practicedToday) continue; // Already practiced today, streak is safe!

        // Calculate streak
        const dates = userRecs.map(r => {
          const d = new Date(r.created_at);
          return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        });
        const uniqueTimestamps = Array.from(new Set(dates)).sort((a, b) => b - a);

        if (uniqueTimestamps.length === 0) continue; // No historical recordings, no active streak to save

        const mostRecent = uniqueTimestamps[0];
        
        // Streak is active only if most recent practice was yesterday (since they didn't practice today)
        if (mostRecent !== yesterdayMidnight) continue;

        let currentStreak = 1;
        for (let i = 0; i < uniqueTimestamps.length - 1; i++) {
          const diff = uniqueTimestamps[i] - uniqueTimestamps[i + 1];
          if (diff === 86400000) {
            currentStreak++;
          } else if (diff > 86400000) {
            break;
          }
        }

        if (currentStreak > 0) {
          try {
            if (process.env.GMAIL_APP_PASSWORD) {
              await transporter.sendMail({
                from: `"SpeakMirror" <${process.env.GMAIL_USER}>`,
                to: authUser.email,
                subject: `Don't lose your ${currentStreak}-day speaking streak! ⏳`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #fafafa;">
                    <h2 style="color: #f97316;">Don't lose your streak! 🔥</h2>
                    <p style="font-size: 16px;">You have an active <strong>${currentStreak}-day speaking streak</strong> on SpeakMirror.</p>
                    <p style="font-size: 16px;">Spend just <strong>1 minute</strong> in the mirror today to complete a Daily Warm-up and keep it alive!</p>
                    <br/>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/practice" 
                       style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      Complete Warm-up Now
                    </a>
                    <br/><br/>
                    <p style="color: #666; font-size: 12px; border-t: 1px solid #e5e7eb; padding-top: 15px; margin-top: 25px;">
                      You are receiving this reminder because push notifications and email reminders are active on your SpeakMirror PWA profile.
                    </p>
                  </div>
                `
              });
              emailsSent++;
            } else {
              console.log(`[Mock Streak Saver] Would send streak saver nudge to ${authUser.email} for ${currentStreak}-day streak`);
              emailsSent++;
            }
          } catch (emailErr) {
            console.error("Failed to send streak saver email to", authUser.email, emailErr);
          }
        }
      }
    }

    return successResponse({
      message: process.env.GMAIL_APP_PASSWORD 
        ? `Sent ${emailsSent} reminder emails.` 
        : `Mocked ${emailsSent} reminder emails. Set GMAIL_APP_PASSWORD to actually send.`
    });

  } catch (err: any) {
    console.error('CRON Error:', err);
    return errorResponse(err.message || "Failed to process CRON reminders", 500);
  }
}
