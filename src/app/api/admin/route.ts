import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

const supabaseAdmin = {
  get auth() { return getSupabaseAdmin().auth; },
  get storage() { return getSupabaseAdmin().storage; },
  from(table: string) { return getSupabaseAdmin().from(table); }
} as unknown as SupabaseClient;

// Zod validation schemas for requests
const GETParamsSchema = z.object({
  action: z.enum(["stats", "users", "feedback", "tasks", "tickets"]),
});

const PostActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate-topics"),
    count: z.number().int().positive().optional().default(10),
  }),
  z.object({
    action: z.literal("bulk-import"),
    tasks: z.array(z.object({
      topic: z.string().min(1),
      word_of_the_day: z.string().optional().nullable(),
      definition: z.string().optional().nullable(),
      reading_text: z.string().optional().nullable(),
      bullets: z.array(z.object({ label: z.string(), text: z.string() })).optional().nullable(),
      difficulty_level: z.string().optional().nullable(),
    })),
  }),
  z.object({
    action: z.literal("cleanup-storage"),
    olderThanDays: z.number().int().positive().optional().default(30),
  }),
  z.object({
    action: z.literal("create-task"),
    topic: z.string().min(1),
    word: z.string().optional().nullable(),
    definition: z.string().optional().nullable(),
    readingText: z.string().optional().nullable(),
    difficulty: z.string().optional().nullable(),
    bullets: z.array(z.object({ label: z.string(), text: z.string() })).optional().nullable(),
  }),
  z.object({
    action: z.literal("update-ticket"),
    ticketId: z.string().uuid("Invalid ticketId format"),
    status: z.string().min(1),
  })
]);

export async function GET(request: Request) {
  try {
    // 1. Centralized admin authorization guard
    try {
      await requireAdmin(request);
    } catch (authErr: any) {
      return errorResponse(authErr.message || "Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const parsedParams = GETParamsSchema.safeParse({
      action: searchParams.get("action"),
    });

    if (!parsedParams.success) {
      return errorResponse(parsedParams.error.issues[0].message, 400);
    }

    const { action } = parsedParams.data;

    // Fetch general system stats
    if (action === "stats") {
      const { data: storageData } = await supabaseAdmin.storage.from("videos").list();
      
      let totalStorageBytes = 0;
      try {
        totalStorageBytes = (storageData?.reduce((acc, curr) => acc + (curr.metadata?.size || 0), 0)) || 0;
      } catch (err) {
        console.warn("Storage counting err:", err);
      }

      const { data: dailyStats, error: statsError } = await supabaseAdmin
        .from("admin_stats")
        .select("*")
        .limit(30);

      const viewOk = !statsError;
      let finalDailyStats = dailyStats || [];

      if (!viewOk) {
        console.warn("admin_stats view missing or empty, using fallbacks");
        finalDailyStats = [
          { stat_date: new Date().toISOString().split('T')[0], recordings_count: 5, analyze_calls_count: 8, video_calls_count: 12, active_users_count: 3, current_total_storage_bytes: totalStorageBytes }
        ];
      }

      const { count: totalRecordings } = await supabaseAdmin
        .from("recordings")
        .select("*", { count: "exact", head: true });

      const { count: totalAnalyzeCalls } = await supabaseAdmin
        .from("api_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("route", "/api/analyze");

      const sessionCompletionRate = totalAnalyzeCalls && totalAnalyzeCalls > 0
        ? Math.round(((totalRecordings || 0) / totalAnalyzeCalls) * 100)
        : 100;

      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const past30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: dauRecordings } = await supabaseAdmin.from("recordings").select("user_id").gte("created_at", past24h);
      const { data: dauLogs } = await supabaseAdmin.from("api_usage_logs").select("user_id").gte("created_at", past24h);
      const dauSet = new Set([
        ...(dauRecordings?.map(r => r.user_id) || []),
        ...(dauLogs?.map(l => l.user_id) || [])
      ].filter(Boolean));
      const dau = dauSet.size;

      const { data: mauRecordings } = await supabaseAdmin.from("recordings").select("user_id").gte("created_at", past30d);
      const { data: mauLogs } = await supabaseAdmin.from("api_usage_logs").select("user_id").gte("created_at", past30d);
      const mauSet = new Set([
        ...(mauRecordings?.map(r => r.user_id) || []),
        ...(mauLogs?.map(l => l.user_id) || [])
      ].filter(Boolean));
      const mau = mauSet.size;

      const dauMauRatio = mau > 0 ? Math.round((dau / mau) * 1000) / 10 : 0;

      const { data: allRecsForStreaks } = await supabaseAdmin
        .from("recordings")
        .select("user_id, created_at")
        .order("created_at", { ascending: false });

      const userRecordDates: Record<string, Set<string>> = {};
      allRecsForStreaks?.forEach(r => {
        if (!r.user_id) return;
        const dateStr = new Date(r.created_at).toDateString();
        if (!userRecordDates[r.user_id]) {
          userRecordDates[r.user_id] = new Set();
        }
        userRecordDates[r.user_id].add(dateStr);
      });

      let activeStreakUsersCount = 0;
      Object.keys(userRecordDates).forEach(uid => {
        if (userRecordDates[uid].size >= 3) {
          activeStreakUsersCount++;
        }
      });

      return successResponse({
        totalRecordings: totalRecordings || 0,
        totalAnalyzeCalls: totalAnalyzeCalls || 0,
        sessionCompletionRate,
        dau,
        mau,
        dauMauRatio,
        activeStreakUsersCount,
        storageBytes: totalStorageBytes,
        dailyStats: finalDailyStats,
        databaseViewStatus: viewOk ? "active" : "missing_migration"
      });
    }

    // Abuse Monitor & User Search
    if (action === "users") {
      const { data: recordings } = await supabaseAdmin
        .from("recordings")
        .select("user_id, created_at");

      const userRecordingCounts: Record<string, number> = {};
      recordings?.forEach(r => {
        if (!r.user_id) return;
        userRecordingCounts[r.user_id] = (userRecordingCounts[r.user_id] || 0) + 1;
      });

      const { data: authUsers, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
      if (usersErr) throw usersErr;

      const usersList = authUsers.users.map(u => ({
        id: u.id,
        email: u.email || "No Email",
        name: u.user_metadata?.full_name || u.email?.split("@")[0] || "Anonymous",
        role: u.user_metadata?.role || "user",
        created_at: u.created_at,
        recordings_count: userRecordingCounts[u.id] || 0
      }));

      const sortedByActivity = [...usersList].sort((a, b) => b.recordings_count - a.recordings_count);

      return successResponse({
        users: usersList,
        abuseList: sortedByActivity.slice(0, 10)
      });
    }

    // Feedback Inbox (centralized view of recordings & suggestions for debugging)
    if (action === "feedback") {
      const { data: recentRecordings } = await supabaseAdmin
        .from("recordings")
        .select("id, user_id, created_at, confidence, clarity, filler_words, transcript, topic, wpm, eye_contact, expression_score")
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const enrichedFeedback = recentRecordings?.map(r => {
        const u = authUsers?.users.find(user => user.id === r.user_id);
        return {
          ...r,
          user_email: u?.email || "Anonymous",
          user_name: u?.user_metadata?.full_name || u?.email?.split("@")[0] || "Speaker"
        };
      }) || [];

      return successResponse({ feedbacks: enrichedFeedback });
    }

    // List practice tasks
    if (action === "tasks") {
      const { data: tasks } = await supabaseAdmin
        .from("practice_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      return successResponse({ tasks: tasks || [] });
    }

    // Fetch customer support tickets
    if (action === "tickets") {
      const { data: tickets, error: ticketsError } = await supabaseAdmin
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketsError) {
        console.warn("support_tickets table missing or query failed.", ticketsError.message);
        return successResponse({
          tickets: [],
          databaseStatus: "missing_migration"
        });
      }

      return successResponse({
        tickets: tickets || [],
        databaseStatus: "active"
      });
    }

    return errorResponse("Invalid action", 400);

  } catch (err: any) {
    console.error("Admin API Error:", err);
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}

export async function POST(request: Request) {
  try {
    // 1. Centralized admin authorization guard
    try {
      await requireAdmin(request);
    } catch (authErr: any) {
      return errorResponse(authErr.message || "Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = PostActionSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const payload = parsed.data;

    // AI pre-generation using Llama 3
    if (payload.action === "generate-topics") {
      const { count } = payload;

      if (!process.env.GROQ_API_KEY) {
        return errorResponse("GROQ_API_KEY is not configured", 500);
      }

      const prompt = `You are an expert communication coach. Generate exactly ${count} unique, highly engaging speaking prompts/topics for a public speaking practice app. 
Generate a mix of Beginner, Intermediate, and Advanced difficulty levels. Make sure the topics are varied (professional, casual, philosophical, and storytelling).

For each topic, provide:
1. "topic": the topic title or prompt
2. "word_of_the_day": a useful vocabulary word related to the topic
3. "definition": the definition of the word
4. "reading_text": a short paragraph (2-3 sentences) for a reading practice
5. "bullets": exactly 5 incomplete sentences using the 4W and 1H framework (Who, What, Where, When, How) tailored to the topic
6. "difficulty_level": "Beginner", "Intermediate", or "Advanced"

Return ONLY a JSON object with this schema:
{
  "tasks": [
    {
      "topic": "...",
      "word_of_the_day": "...",
      "definition": "...",
      "reading_text": "...",
      "difficulty_level": "...",
      "bullets": [
        { "label": "Who", "text": "..." },
        { "label": "What", "text": "..." },
        { "label": "Where", "text": "..." },
        { "label": "When", "text": "..." },
        { "label": "How", "text": "..." }
      ]
    }
  ]
}`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You respond strictly with valid JSON." },
          { role: "user", content: prompt }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      const content = chatCompletion.choices[0]?.message?.content;
      if (!content) throw new Error("No topics generated");

      const parsedJson = JSON.parse(content);
      const tasks = parsedJson.tasks || [];

      const insertedTasks = [];
      for (const t of tasks) {
        const { data, error } = await supabaseAdmin
          .from("practice_tasks")
          .insert({
            topic_of_the_day: t.topic,
            word_of_the_day: t.word_of_the_day,
            definition: t.definition,
            reading_text: t.reading_text,
            bullets: t.bullets,
            difficulty_level: t.difficulty_level || "Beginner"
          })
          .select();
        
        if (!error && data) {
          insertedTasks.push(data[0]);
        }
      }

      return successResponse({ count: insertedTasks.length, tasks: insertedTasks });
    }

    // Bulk Importer from manual JSON input
    if (payload.action === "bulk-import") {
      const { tasks } = payload;
      const insertedTasks = [];
      for (const t of tasks) {
        if (!t.topic) continue;
        const { data, error } = await supabaseAdmin
          .from("practice_tasks")
          .insert({
            topic_of_the_day: t.topic,
            word_of_the_day: t.word_of_the_day || null,
            definition: t.definition || null,
            reading_text: t.reading_text || null,
            bullets: t.bullets || [
              { label: "Who", text: "The main people involved..." },
              { label: "What", text: "The core idea or challenge..." },
              { label: "Where", text: "This took place in the context of..." },
              { label: "When", text: "This originally occurred when..." },
              { label: "How", text: "Ultimately, it was approached by..." }
            ],
            difficulty_level: t.difficulty_level || "Beginner"
          })
          .select();

        if (!error && data) {
          insertedTasks.push(data[0]);
        }
      }

      return successResponse({ count: insertedTasks.length, tasks: insertedTasks });
    }

    // Storage cleanup utility
    if (payload.action === "cleanup-storage") {
      const { olderThanDays } = payload;
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: oldRecordings } = await supabaseAdmin
        .from("recordings")
        .select("id, video_url")
        .lt("created_at", cutoffDate);

      if (!oldRecordings || oldRecordings.length === 0) {
        return successResponse({ message: "No old recordings to clean up" });
      }

      const videoFileNames = oldRecordings
        .map(r => r.video_url?.split("/").pop())
        .filter(Boolean) as string[];

      let filesDeleted = 0;
      if (videoFileNames.length > 0) {
        const { data: deleteData, error: deleteErr } = await supabaseAdmin
          .storage
          .from("videos")
          .remove(videoFileNames);
        
        if (!deleteErr && deleteData) {
          filesDeleted = deleteData.length;
        }
      }

      const { error: dbUpdateErr } = await supabaseAdmin
        .from("recordings")
        .update({ video_url: null })
        .lt("created_at", cutoffDate);

      return successResponse({
        recordingsCleaned: oldRecordings.length,
        filesDeleted,
        dbUpdateSuccess: !dbUpdateErr
      });
    }

    // Single Task creation
    if (payload.action === "create-task") {
      const { topic, word, definition, readingText, difficulty, bullets } = payload;
      const { data, error } = await supabaseAdmin
        .from("practice_tasks")
        .insert({
          topic_of_the_day: topic,
          word_of_the_day: word || null,
          definition: definition || null,
          reading_text: readingText || null,
          bullets: bullets || [
            { label: "Who", text: "The main people involved..." },
            { label: "What", text: "The core idea or challenge..." },
            { label: "Where", text: "This took place in the context of..." },
            { label: "When", text: "This originally occurred when..." },
            { label: "How", text: "Ultimately, it was approached by..." }
          ],
          difficulty_level: difficulty || "Beginner"
        })
        .select();

      if (error) throw error;
      return successResponse({ task: data[0] });
    }

    // Update support ticket status
    if (payload.action === "update-ticket") {
      const { ticketId, status } = payload;
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId)
        .select();

      if (error) throw error;
      return successResponse({ ticket: data?.[0] });
    }

    return errorResponse("Invalid action", 400);

  } catch (err: any) {
    console.error("Admin POST Error:", err);
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
