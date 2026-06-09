import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const TaskSchema = z.object({
  topic_of_the_day: z.string().min(1, "Topic of the day is required"),
  word_of_the_day: z.string().min(1, "Word of the day is required"),
  word_meaning: z.string().optional().nullable(),
  idiom_of_the_day: z.string().optional().nullable(),
});

const RequestBodySchema = z.object({
  roomId: z.string().uuid("Invalid roomId format"),
  roomName: z.string().min(1, "Room name is required").optional().nullable(),
  task: TaskSchema,
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const body = await request.json();
    const parsed = RequestBodySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { roomId, roomName, task } = parsed.data;

    // 1. Authenticate user
    let user;
    try {
      user = await requireAuth(request);
    } catch (authErr: any) {
      return errorResponse(authErr.message || "Unauthorized", 401);
    }

    // 2. Fetch room details to check if it's organization-scoped
    const { data: roomData, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('organization_id')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return errorResponse("Room not found", 404);
    }

    let memberIds: string[] = [];

    if (roomData.organization_id) {
      // Fetch members from organization_users mapping table instead
      const { data: orgUsers, error: orgUsersError } = await supabaseAdmin
        .from('organization_users')
        .select('user_id')
        .eq('organization_id', roomData.organization_id);

      if (orgUsersError || !orgUsers) {
        return errorResponse("Failed to fetch organization members", 500);
      }

      memberIds = orgUsers.map(ou => ou.user_id);
    } else {
      // Fallback: Get all members of the room from room_members
      const { data: dbMembers, error: membersError } = await supabaseAdmin
        .from('room_members')
        .select('user_id')
        .eq('room_id', roomId);

      if (membersError || !dbMembers) {
        return errorResponse("Failed to fetch room members", 500);
      }

      memberIds = dbMembers.map(m => m.user_id);
    }

    // 3. Authorization check: is the requesting user member of the room?
    const isMember = memberIds.includes(user.id);
    if (!isMember) {
      return errorResponse("Forbidden: You are not a member of this room", 403);
    }

    if (memberIds.length === 0) {
      return successResponse({ message: 'No members found in this room.' });
    }

    // 4. Fetch emails for members from auth.users (requires service_role)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers) {
       console.error("Failed to list users:", authError);
       return errorResponse("Failed to fetch user emails", 500);
    }

    const targetUsers = authUsers.users.filter(u => memberIds.includes(u.id));

    let emailsSent = 0;

    // 5. Send emails to all members
    for (const member of targetUsers) {
      if (!member.email) continue;
      
      try {
        if (process.env.GMAIL_APP_PASSWORD) {
          await transporter.sendMail({
            from: `"SpeakMirror" <${process.env.GMAIL_USER}>`,
            to: member.email,
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
          console.log(`[Mock Email] Would send task assignment to ${member.email} for room ${roomId}`);
          emailsSent++;
        }
      } catch (emailErr) {
        console.error("Failed to send email to", member.email, emailErr);
      }
    }

    return successResponse({
      message: process.env.GMAIL_APP_PASSWORD 
        ? `Sent ${emailsSent} assignment emails.` 
        : `Mocked ${emailsSent} assignment emails. Set GMAIL_APP_PASSWORD to actually send.`
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
