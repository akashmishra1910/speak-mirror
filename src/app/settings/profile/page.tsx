"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { 
  Target, 
  Mic, 
  Users, 
  Sprout, 
  TrendingUp, 
  Trophy, 
  Sparkles, 
  Volume2, 
  Timer, 
  Ban, 
  Eye, 
  Clock, 
  Loader2, 
  Save 
} from "lucide-react";

interface ProfileData {
  goal: "interview_prep" | "public_speaking" | "team_presentations" | "personal_growth" | null;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  focus_metric: "confidence" | "clarity" | "pacing" | "fillers" | "eye_contact" | null;
  practice_duration: 1 | 3 | 5 | null;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<ProfileData>({
    goal: null,
    experience_level: null,
    focus_metric: null,
    practice_duration: null,
  });
  
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch current profile preferences
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("goal, experience_level, focus_metric, practice_duration")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setFormData({
            goal: data.goal || null,
            experience_level: data.experience_level || null,
            focus_metric: data.focus_metric || null,
            practice_duration: data.practice_duration || null,
          });
        }
      } catch (err) {
        console.error("Failed to load profile settings:", err);
        setStatusMsg({ type: "error", text: "Failed to load profile settings." });
      } finally {
        setIsFetching(false);
      }
    }

    if (!isLoading) {
      if (!user) {
        router.push("/auth");
      } else {
        loadProfile();
      }
    }
  }, [user, isLoading, router]);

  const handleSelect = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setStatusMsg(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          goal: formData.goal,
          experience_level: formData.experience_level,
          focus_metric: formData.focus_metric,
          practice_duration: formData.practice_duration,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setStatusMsg({ type: "success", text: "Preferences saved successfully!" });
      router.refresh();
    } catch (err: any) {
      console.error("Failed to save profile settings:", err);
      setStatusMsg({ type: "error", text: err.message || "Failed to save settings. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isFetching) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-zinc-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-24 text-zinc-100 selection:bg-cyan-500/30">
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        
        {/* Header */}
        <div className="mb-8 border-b border-zinc-800/60 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">
            Speaker Profile Settings
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Update your preferences and focus metrics to adjust SpeakMirror prompts and coaching suggestions.
          </p>
        </div>

        {statusMsg && (
          <div className={`mb-6 rounded-lg border p-3.5 text-sm ${
            statusMsg.type === "success" 
              ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-400" 
              : "border-red-500/20 bg-red-950/20 text-red-400"
          }`}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* SECTION 1: GOALS */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-400" />
              Primary Goal
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Adjusts prompt complexity and theme parameters.</p>
            <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { id: "interview_prep", label: "Interview Prep", icon: Target, desc: "Prepare for job interviews" },
                { id: "public_speaking", label: "Public Speaking", icon: Mic, desc: "Deliver speeches with power" },
                { id: "team_presentations", label: "Team Presentations", icon: Users, desc: "Succeed at meetings & reviews" },
                { id: "personal_growth", label: "Personal Growth", icon: Sprout, desc: "Improve daily communication" }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = formData.goal === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelect("goal", item.id as any)}
                    className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/30 ${
                      isSelected 
                        ? "border-cyan-500 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500" 
                        : "border-zinc-800 bg-zinc-900/30"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? "text-cyan-400" : "text-zinc-500"}`} />
                    <span className="mt-3 font-semibold text-zinc-100 text-sm">{item.label}</span>
                    <span className="mt-1 text-xs text-zinc-400">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: EXPERIENCE */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Speaking Confidence
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Determines dynamic topic prompts difficulty.</p>
            <div className="mt-3.5 flex flex-col gap-3">
              {[
                { id: "beginner", label: "Beginner", icon: Sprout, desc: "I get nervous speaking in front of others." },
                { id: "intermediate", label: "Intermediate", icon: TrendingUp, desc: "I can hold my own in meetings but want more impact." },
                { id: "advanced", label: "Advanced", icon: Trophy, desc: "I want to fine-tune my pacing, emotional delivery, & filler words." }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = formData.experience_level === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelect("experience_level", item.id as any)}
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/30 ${
                      isSelected 
                        ? "border-cyan-500 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500" 
                        : "border-zinc-800 bg-zinc-900/30"
                    }`}
                  >
                    <div className={`rounded-lg p-2 ${isSelected ? "bg-cyan-500/10 text-cyan-400" : "bg-zinc-800 text-zinc-400"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-100 text-sm">{item.label}</span>
                      <span className="block mt-0.5 text-xs text-zinc-400">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: FOCUS METRIC */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              Target Focus Metric
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Highlights stats related to this speaking goal on analysis cards.</p>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {[
                { id: "confidence", label: "Confidence", icon: Sparkles, desc: "Develop a strong posture and assertive presentation style" },
                { id: "clarity", label: "Clarity", icon: Volume2, desc: "Speak clearly and articulate words distinctly" },
                { id: "pacing", label: "Pacing", icon: Timer, desc: "Maintain a steady speaking rhythm (words per minute)" },
                { id: "fillers", label: "Filler Words", icon: Ban, desc: "Eliminate repetitive 'um', 'ah', and 'like' filler phrases" },
                { id: "eye_contact", label: "Eye Contact", icon: Eye, desc: "Maintain connection with the camera and mirror audience" }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = formData.focus_metric === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelect("focus_metric", item.id as any)}
                    className={`flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/30 ${
                      isSelected 
                        ? "border-cyan-500 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500" 
                        : "border-zinc-800 bg-zinc-900/30"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "text-cyan-400" : "text-zinc-500"}`} />
                    <div>
                      <span className="font-semibold text-zinc-100 text-sm">{item.label}</span>
                      <span className="block mt-0.5 text-xs text-zinc-400">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: PRACTICE DURATION */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              Daily Practice Goal
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Increments streak tracking parameters on completion.</p>
            <div className="mt-3.5 flex flex-col gap-3.5">
              {[
                { id: 1, label: "1 min", sub: "Quick burst", desc: "Great for building a daily habit without friction" },
                { id: 3, label: "3 min", sub: "Standard", desc: "The recommended daily amount for continuous speaking improvement" },
                { id: 5, label: "5 min", sub: "Deep practice", desc: "Intense, philosophical prompt structures and detailed analytics" }
              ].map(item => {
                const isSelected = formData.practice_duration === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelect("practice_duration", item.id as any)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/30 ${
                      isSelected 
                        ? "border-cyan-500 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500" 
                        : "border-zinc-800 bg-zinc-900/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className={`h-5 w-5 ${isSelected ? "text-cyan-400" : "text-zinc-500"}`} />
                      <div>
                        <span className="font-semibold text-zinc-100 text-sm">{item.label}</span>
                        <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase text-zinc-400">
                          {item.sub}
                        </span>
                        <span className="block mt-1 text-xs text-zinc-400">{item.desc}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end border-t border-zinc-800/60 pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_4px_12px_rgba(6,182,212,0.3)] transition-all hover:from-cyan-400 hover:to-cyan-300 disabled:opacity-50 disabled:hover:from-cyan-500 disabled:hover:to-cyan-400 disabled:shadow-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Preferences
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
