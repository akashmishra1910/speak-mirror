import { User as SupabaseUser, Session as SupabaseSession } from "@supabase/supabase-js";

export type User = SupabaseUser;
export type Session = SupabaseSession;

export interface Profile {
  id: string;
  display_name: string | null;
  primary_goal: string | null;
  experience_level: string | null;
  onboarding_completed: boolean;
  updated_at: string;
}

export interface SpeechAnalysis {
  id: string;
  recording_id: string;
  wpm: number;
  filler_words: string[];
  filler_count: number;
  pause_duration: number;
  primary_emotion: string;
  confidence: number;
  clarity: number;
  transcript: string;
  feedback: string;
  created_at: string;
}

export interface Recording {
  id: string;
  user_id: string;
  organization_id: string;
  topic: string;
  video_url: string;
  confidence: number;
  clarity: number;
  wpm: number | null;
  filler_words: number | null;
  transcript: string | null;
  eye_contact: number | null;
  expression_score: number | null;
  primary_emotion: string | null;
  pause_duration: number | null;
  coach_comment: string | null;
  annotations: any | null;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  time_limit: number;
  points: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type: "info" | "success" | "warning" | "challenge";
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  subscription_tier: "FREE" | "PRO" | "TEAM";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  organization_id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  invite_token?: string;
  task_of_the_day?: string;
}

export interface DashboardMetrics {
  totalSessions: number;
  averageConfidence: number;
  averageClarity: number;
  totalFillerWords: number;
  streakCount: number;
  completedChallenges: number;
}

export interface AIResponse {
  wpm: number;
  fillerWords: string[];
  fillerCount: number;
  pauseDuration: number;
  primaryEmotion: string;
  confidence: number;
  clarity: number;
  feedback: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
