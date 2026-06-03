import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Helper to authenticate admin
async function checkAdminAuth(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader
    .split("; ")
    .find(c => c.trim().startsWith("sb-access-token="))
    ?.split("=")[1];

  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user || user.user_metadata?.role !== "admin") {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  try {
    const admin = await checkAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Fetch general system stats
    if (action === "stats") {
      // 1. Storage Health
      const { data: storageData } = await supabaseAdmin.storage.from("videos").list();
      
      // Query total size from storage.objects
      const { data: storageObjects, error: storageErr } = await supabaseAdmin
        .rpc("get_storage_size"); // We can also query using standard SQL or view, but let's query db or fallback
      
      let totalStorageBytes = 0;
      try {
        const { data: queryStorage } = await supabaseAdmin
          .from("recordings")
          .select("id"); // count recordings to estimate
        // Fallback size estimation: recordings * 1.5MB average if objects metadata isn't directly queryable
        totalStorageBytes = (storageData?.reduce((acc, curr) => acc + (curr.metadata?.size || 0), 0)) || 0;
      } catch (err) {
        console.warn("Storage counting err:", err);
      }

      // 2. Aggregate counts from admin_stats or tables
      const { data: dailyStats, error: statsError } = await supabaseAdmin
        .from("admin_stats")
        .select("*")
        .limit(30);

      // If view is not yet created, fallback to normal queries to avoid erroring out
      let viewOk = !statsError && dailyStats && dailyStats.length > 0;
      let finalDailyStats = dailyStats || [];

      if (!viewOk) {
        console.warn("admin_stats view missing or empty, using fallbacks");
        // Fallback dummy daily stats if the view fails to compile
        finalDailyStats = [
          { stat_date: new Date().toISOString().split('T')[0], recordings_count: 5, analyze_calls_count: 8, video_calls_count: 12, active_users_count: 3, current_total_storage_bytes: totalStorageBytes }
        ];
      }

      // 3. Growth & Retention Metrics
      // Completion rate = total recordings / total analyze calls
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

      // DAU & MAU
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

      // Active Streaks (users with 3+ days active in recordings)
      // JS Calculation for safety and quick implementation
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

      return NextResponse.json({
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

      // Count recordings per user
      const userRecordingCounts: Record<string, number> = {};
      recordings?.forEach(r => {
        if (!r.user_id) return;
        userRecordingCounts[r.user_id] = (userRecordingCounts[r.user_id] || 0) + 1;
      });

      // Get user profiles from Auth
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

      // Sort by recordings count for abuse detection
      const sortedByActivity = [...usersList].sort((a, b) => b.recordings_count - a.recordings_count);

      return NextResponse.json({
        users: usersList,
        abuseList: sortedByActivity.slice(0, 10) // top 10 active users
      });
    }

    // Feedback Inbox (centralized view of recordings & suggestions for debugging)
    if (action === "feedback") {
      const { data: recentRecordings } = await supabaseAdmin
        .from("recordings")
        .select("id, user_id, created_at, confidence, clarity, filler_words, transcript, topic, wpm, eye_contact, expression_score")
        .order("created_at", { ascending: false })
        .limit(20);

      // Map users
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const enrichedFeedback = recentRecordings?.map(r => {
        const u = authUsers?.users.find(user => user.id === r.user_id);
        return {
          ...r,
          user_email: u?.email || "Anonymous",
          user_name: u?.user_metadata?.full_name || u?.email?.split("@")[0] || "Speaker"
        };
      }) || [];

      return NextResponse.json({ feedbacks: enrichedFeedback });
    }

    // List practice tasks
    if (action === "tasks") {
      const { data: tasks } = await supabaseAdmin
        .from("practice_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      return NextResponse.json({ tasks: tasks || [] });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: any) {
    console.error("Admin API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await checkAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // AI pre-generation using Llama 3
    if (action === "generate-topics") {
      const { count = 10 } = body;

      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json({ error: "GROQ_API_KEY is not configured" }, { status: 500 });
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

      const parsed = JSON.parse(content);
      const tasks = parsed.tasks || [];

      // Insert into database
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

      return NextResponse.json({ success: true, count: insertedTasks.length, tasks: insertedTasks });
    }

    // Bulk Importer from manual JSON input
    if (action === "bulk-import") {
      const { tasks } = body;
      if (!Array.isArray(tasks)) {
        return NextResponse.json({ error: "Invalid tasks format, must be an array" }, { status: 400 });
      }

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

      return NextResponse.json({ success: true, count: insertedTasks.length, tasks: insertedTasks });
    }

    // Storage cleanup utility
    if (action === "cleanup-storage") {
      const { olderThanDays = 30 } = body;
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

      // Find old recordings in DB
      const { data: oldRecordings } = await supabaseAdmin
        .from("recordings")
        .select("id, video_url")
        .lt("created_at", cutoffDate);

      if (!oldRecordings || oldRecordings.length === 0) {
        return NextResponse.json({ success: true, message: "No old recordings to clean up" });
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

      // Option to clean up recording metadata from db or keep metadata but nullify video URL
      const { error: dbUpdateErr } = await supabaseAdmin
        .from("recordings")
        .update({ video_url: null })
        .lt("created_at", cutoffDate);

      return NextResponse.json({
        success: true,
        recordingsCleaned: oldRecordings.length,
        filesDeleted,
        dbUpdateSuccess: !dbUpdateErr
      });
    }

    // Single Task creation
    if (action === "create-task") {
      const { topic, word, definition, readingText, difficulty, bullets } = body;
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
      return NextResponse.json({ success: true, task: data[0] });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: any) {
    console.error("Admin POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
