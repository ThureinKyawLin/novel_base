export type Role = "admin" | "mod";
export type NovelStatus = "ongoing" | "completed" | "dropped";
export type TranslationStatus = "translating" | "paused" | "completed" | "dropped";
export type InvitationStatus = "active" | "used" | "expired";
export type AuditAction = "create" | "update" | "delete";

export interface Genre {
  id: string;
  name: string;
  name_mm: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
  created_at: string;
}

export interface ReadingLink {
  id: string;
  novel_id: string;
  platform_name: string;
  url: string;
  created_at: string;
}

export interface Novel {
  id: string;
  title_en: string;
  title_mm: string | null;
  author_pen_name: string | null;
  synopsis: string | null;
  cover_image_url: string | null;
  fb_page_url: string | null;
  tg_username: string | null;
  tg_group_url: string | null;
  tg_channel_url: string | null;
  novel_status: NovelStatus;
  chapters_count: number | null;
  source_url: string | null;
  translation_status: TranslationStatus | null;
  translation_note: string | null;
  translated_chapters: number | null;
  last_translated_at: string | null;
  extra_info: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  genres?: Genre[];
  reading_links?: ReadingLink[];
  created_by_profile?: Profile | null;
  updated_by_profile?: Profile | null;
}

export interface NovelGenre {
  novel_id: string;
  genre_id: string;
}

export interface Invitation {
  id: string;
  token: string;
  created_by: string | null;
  used_by: string | null;
  role: Role;
  expires_at: string | null;
  used_at: string | null;
  status: InvitationStatus;
  created_at: string;
  // Joined
  created_by_profile?: Profile | null;
  used_by_profile?: Profile | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  // Joined
  user_profile?: Profile | null;
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  id: string;
  title_en: string;
  title_mm: string | null;
  author_pen_name: string | null;
  synopsis: string | null;
  cover_image_url: string | null;
  fb_page_url: string | null;
  tg_username: string | null;
  tg_group_url: string | null;
  tg_channel_url: string | null;
  novel_status: NovelStatus;
  chapters_count: number | null;
  source_url: string | null;
  source_links: { platform_name: string; url: string }[];
  genre_ids: string[];
  submitter_name: string;
  submitter_contact: string | null;
  status: SubmissionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  // Joined
  reviewed_by_profile?: Profile | null;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Form types
export interface NovelFormData {
  title_en: string;
  title_mm?: string;
  author_pen_name?: string;
  synopsis?: string;
  cover_image_url?: string;
  fb_page_url?: string;
  tg_username?: string;
  tg_group_url?: string;
  tg_channel_url?: string;
  novel_status: NovelStatus;
  chapters_count?: number;
  source_url?: string;
  translation_status?: TranslationStatus;
  translation_note?: string;
  translated_chapters?: number;
  last_translated_at?: string;
  extra_info?: Record<string, unknown>;
  genre_ids: string[];
  reading_links?: { platform_name: string; url: string }[];
}
