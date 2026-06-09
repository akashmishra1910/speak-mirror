import { z } from "zod";

// Authentication Schemas
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  agreedToTerms: z.literal(true, {
    message: "You must agree to the terms to proceed",
  }),
});

// Profile Validation
export const ProfileUpdateSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").optional(),
  primary_goal: z.enum(["Interview prep", "Public speaking", "Team presentations", "Personal growth"]).optional(),
  experience_level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  onboarding_completed: z.boolean().optional(),
});

// Challenge Validation
export const ChallengeCreationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  time_limit: z.number().int().positive("Time limit must be a positive integer"),
  points: z.number().int().nonnegative("Points must be a non-negative integer"),
});

// Team and Room Validation
export const TeamCreationSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters"),
  subscription_tier: z.enum(["FREE", "PRO", "TEAM"]).default("FREE"),
});

export const RoomCreationSchema = z.object({
  name: z.string().min(3, "Room name must be at least 3 characters"),
  organization_id: z.string().uuid("Invalid organization ID"),
});

// Recording and Upload Validation
export const RecordingUploadSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  video_url: z.string().url("Invalid video URL"),
  confidence: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  wpm: z.number().int().nonnegative().optional().nullable(),
  filler_words: z.number().int().nonnegative().optional().nullable(),
  transcript: z.string().optional().nullable(),
  eye_contact: z.number().min(0).max(100).optional().nullable(),
  expression_score: z.number().min(0).max(100).optional().nullable(),
  primary_emotion: z.string().optional().nullable(),
  pause_duration: z.number().nonnegative().optional().nullable(),
  organization_id: z.string().uuid("Invalid organization ID"),
  coach_comment: z.string().optional().nullable(),
  annotations: z.any().optional().nullable(),
});

// AI Analysis Validation
export const AIAnalysisRequestSchema = z.object({
  audioBase64: z.string().min(1, "Audio payload is required"),
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  expectedWord: z.string().optional(),
  expectedIdiom: z.string().optional(),
});
