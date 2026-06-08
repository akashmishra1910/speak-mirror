import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileDashboardClient from "@/components/ProfileDashboardClient";


interface Recording {
  id: string;
  created_at: string;
  topic: string;
  confidence: number;
  clarity: number;
  video_url: string;
  wpm?: number | null;
  filler_words?: number | null;
  transcript?: string | null;
  eye_contact?: number | null;
  expression_score?: number | null;
  primary_emotion?: string | null;
  pause_duration?: number | null;
  coach_comment?: string | null;
  annotations?: any | null;
}

export default async function ProfilePage() {
  // 1. Initialize the server-side client
  const supabase = await createClient();

  // 2. Validate session securely via getUser()
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth");
  }

  // 3. Fetch recordings from database
  let initialRecordings: Recording[] = [];
  try {
    const { data, error } = await supabase
      .from("recordings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      initialRecordings = data.map((record: any) => {
        if (record.video_url) {
          const filename = record.video_url.startsWith('http') ? record.video_url.split('/').pop() : record.video_url;
          if (filename) {
            return { ...record, video_url: `/api/video?file=${filename}` };
          }
        }
        return record;
      });
    }
  } catch (err) {
    console.error("Error fetching recordings on server:", err);
  }

  // 4. Render the client dashboard
  return (
    <ProfileDashboardClient 
      user={user} 
      initialRecordings={initialRecordings} 
    />
  );
}
