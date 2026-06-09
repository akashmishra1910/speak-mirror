import { LoginSchema, SignupSchema, ProfileUpdateSchema } from "@/lib/validation";

describe("Validation Schemas", () => {
  describe("LoginSchema", () => {
    it("validates correct email and password configurations", () => {
      const valid = { email: "test@example.com", password: "password123" };
      const parsed = LoginSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it("invalidates missing fields or incorrect email formats", () => {
      const invalid = { email: "not-an-email", password: "12" };
      const parsed = LoginSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("SignupSchema", () => {
    it("validates correct sign-up details", () => {
      const valid = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        agreedToTerms: true,
      };
      const parsed = SignupSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it("rejects when terms check is missing or false", () => {
      const invalid = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        agreedToTerms: false,
      };
      const parsed = SignupSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("ProfileUpdateSchema", () => {
    it("accepts valid profile items", () => {
      const valid = {
        display_name: "Developer Pro",
        primary_goal: "Interview prep",
        experience_level: "Advanced",
        onboarding_completed: true,
      };
      const parsed = ProfileUpdateSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });
});
