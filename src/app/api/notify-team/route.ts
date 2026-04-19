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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, roomName, task } = body;

    if (!roomId || !task) {
      return NextResponse.json({ error: "Missing roomId or task details" }, { status: 400 });
    }

    // 1. Get all members of the room
    const { data: members, error: membersError } = await supabaseAdmin
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId);

    if (membersError || !members || members.length === 0) {
      return NextResponse.json({ message: 'No members found in this room.' });
    }

    const memberIds = members.map(m => m.user_id);

    // 2. Fetch emails for members from auth.users (requires service_role)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers) {
       console.error("Failed to list users:", authError);
       return NextResponse.json({ error: "Failed to fetch user emails" }, { status: 500 });
    }

    const targetUsers = authUsers.users.filter(u => memberIds.includes(u.id));

    let emailsSent = 0;

    // 3. Send emails to all members
    for (const user of targetUsers) {
      if (!user.email) continue;
      
      try {
        if (process.env.GMAIL_APP_PASSWORD) {
          await transporter.sendMail({
            from: `"SpeakMirror" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: `New SpeakMirror Task assigned for ${roomName || 'your team'}!`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #2563eb;">New Practice Task Assigned! 🎯</h2>
                <p>A new daily speaking task has just been assigned for your team <strong>${roomName || 'Room'}</strong>.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1f2937;">Topic of the day:</h3>
                  <p style="font-size: 18px; font-weight: bold; color: #2563eb;">${task.topic_of_the_day}</p>
                  
                  <h4 style="margin-bottom: 4px; color: #4b5563;">Word of the Day:</h4>
                  <p style="margin-top: 0;"><strong>${task.word_of_the_day}</strong> ${task.word_meaning ? `(${task.word_meaning})` : ''}</p>
                  
                  ${task.idiom_of_the_day ? `
                    <h4 style="margin-bottom: 4px; color: #4b5563;">Idiom of the Day:</h4>
                    <p style="margin-top: 0;"><strong>${task.idiom_of_the_day}</strong></p>
                  ` : ''}
                </div>
                
                <br/>
                <div style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/rooms/${roomId}" 
                     style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Start Practicing Now
                  </a>
                </div>
                <br/><br/>
                <p style="color: #6b7280; font-size: 14px; text-align: center;">You have 24 hours to submit your video! Good luck!</p>
              </div>
            `
          });
          emailsSent++;
        } else {
          console.log(`[Mock Email] Would send task assignment to ${user.email} for room ${roomId}`);
        }
      } catch (emailErr) {
        console.error("Failed to send email to", user.email, emailErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: process.env.GMAIL_APP_PASSWORD 
        ? `Sent ${emailsSent} assignment emails.` 
        : `Mocked ${emailsSent} assignment emails. Set GMAIL_APP_PASSWORD to actually send.`
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
