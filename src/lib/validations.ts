import { z } from "zod";

// ============================================
// Utility validators
// ============================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z.string().regex(UUID_REGEX, "Invalid UUID format");

/** URL that must be https (or http for local dev) */
const safeUrlSchema = z
  .string()
  .max(2048, "URL too long")
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const url = new URL(val);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid HTTP/HTTPS URL" }
  );

const optionalSafeUrl = safeUrlSchema.optional();

/**
 * Validate a redirect path is local-only (prevents open redirects).
 * Must start with "/" and not "//" (protocol-relative).
 */
export function isLocalRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/**
 * Sanitize a PostgREST filter value by escaping special characters
 * that could break or manipulate the filter syntax.
 */
export function sanitizePostgrestValue(value: string): string {
  // Remove characters that have special meaning in PostgREST filter syntax
  return value.replace(/[,.()"\\]/g, "");
}

// ============================================
// Novel form validation
// ============================================

export const novelFormSchema = z.object({
  title_en: z
    .string()
    .min(1, "English title is required")
    .max(500, "Title too long"),
  title_mm: z.string().max(500, "Title too long").optional(),
  author_pen_name: z.string().max(200, "Author name too long").optional(),
  synopsis: z.string().max(10000, "Synopsis too long").optional(),
  cover_image_url: optionalSafeUrl,
  fb_page_url: optionalSafeUrl,
  tg_username: z
    .string()
    .max(100, "Username too long")
    .optional(),
  tg_group_url: optionalSafeUrl,
  tg_channel_url: optionalSafeUrl,
  novel_status: z.enum(["ongoing", "completed", "dropped"]),
  chapters_count: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(100000, "Too many chapters")
    .optional(),
  source_url: optionalSafeUrl,
  translation_status: z.enum(["translating", "paused", "completed", "dropped"]).optional(),
  translation_note: z.string().max(1000, "Note too long").optional(),
  translated_chapters: z
    .number()
    .int()
    .min(0, "Cannot be negative")
    .max(100000, "Too many chapters")
    .optional(),
  last_translated_at: z.string().max(30).optional(),
  extra_info: z.record(z.string(), z.unknown()).optional(),
  genre_ids: z.array(uuidSchema).max(20, "Too many genres"),
  reading_links: z
    .array(
      z.object({
        platform_name: z.string().min(1).max(100),
        url: z.string().max(2048).refine(
          (val) => {
            try {
              const u = new URL(val);
              return u.protocol === "https:" || u.protocol === "http:";
            } catch {
              return false;
            }
          },
          { message: "Must be a valid URL" }
        ),
      })
    )
    .max(20, "Too many links")
    .optional(),
});

export type ValidatedNovelFormData = z.infer<typeof novelFormSchema>;

// ============================================
// Genre validation
// ============================================

export const genreFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long"),
  name_mm: z.string().max(100, "Name too long").nullable(),
});

// ============================================
// Invite signup validation
// ============================================

export const inviteSignupSchema = z.object({
  token: z.string().min(1, "Token is required").max(64),
  email: z.string().email("Invalid email").max(254, "Email too long"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password too long"),
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name too long"),
});

// ============================================
// Public submission validation
// ============================================

export const submissionFormSchema = z.object({
  title_en: z
    .string()
    .min(1, "English title is required")
    .max(500, "Title too long"),
  title_mm: z.string().max(500, "Title too long").optional(),
  author_pen_name: z.string().max(200, "Author name too long").optional(),
  synopsis: z.string().max(10000, "Synopsis too long").optional(),
  cover_image_url: optionalSafeUrl,
  fb_page_url: optionalSafeUrl,
  tg_username: z.string().max(100, "Username too long").optional(),
  tg_group_url: optionalSafeUrl,
  tg_channel_url: optionalSafeUrl,
  novel_status: z.enum(["ongoing", "completed", "dropped"]),
  chapters_count: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(100000, "Too many chapters")
    .optional(),
  source_url: optionalSafeUrl,
  source_links: z
    .array(
      z.object({
        platform_name: z.string().min(1, "Platform name required").max(100),
        url: z.string().max(2048).refine(
          (val) => {
            try {
              const u = new URL(val);
              return u.protocol === "https:" || u.protocol === "http:";
            } catch {
              return false;
            }
          },
          { message: "Must be a valid URL" }
        ),
      })
    )
    .max(20, "Too many links")
    .optional(),
  genre_ids: z.array(uuidSchema).max(20, "Too many genres"),
  submitter_name: z
    .string()
    .min(1, "Your name is required")
    .max(100, "Name too long"),
  submitter_contact: z.string().max(200, "Contact info too long").optional(),
});
