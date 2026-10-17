import { supabase } from "@/integrations/supabase/client";

export type LearningGuide = {
  id: string; title: string; title_kz: string | null; title_en: string | null;
  summary: string | null; summary_kz: string | null; summary_en: string | null;
  content: string | null; content_kz: string | null; content_en: string | null;
  cover_url: string | null; video_url: string | null; pdf_path: string | null;
  sort_order: number; is_published: boolean;
};
export type LearningSkill = {
  id: string; title: string; title_kz: string | null; title_en: string | null;
  description: string | null; description_kz: string | null; description_en: string | null;
  image_url: string | null; mentor_ids: string[]; sort_order: number; is_published: boolean;
};
export type LearningEvent = {
  id: string; kind: string; skill_id: string | null;
  title: string; title_kz: string | null; title_en: string | null;
  description: string | null; description_kz: string | null; description_en: string | null;
  cover_url: string | null; host_name: string | null; location: string | null;
  start_time: string; end_time: string; capacity: number; is_published: boolean;
};
export type TeamMember = { id: string; name: string; job_title: string | null; photo_url: string | null };

export const EVENT_KINDS = ["workshop", "course", "training"] as const;
export const KIND_LABEL: Record<string, Record<string, string>> = {
  workshop: { ru: "Воркшоп", kz: "Воркшоп", en: "Workshop" },
  course: { ru: "Курс", kz: "Курс", en: "Course" },
  training: { ru: "Обучение", kz: "Оқыту", en: "Training" },
};

export const lang3 = (l: string) => (l?.startsWith("kz") || l?.startsWith("kk") ? "kz" : l?.startsWith("en") ? "en" : "ru");

/** Pick localized field with RU fallback. */
export function loc<T extends Record<string, unknown>>(row: T, field: string, lang: string): string {
  const l = lang3(lang);
  const v = l === "ru" ? row[field] : row[`${field}_${l}`] || row[field];
  return (v as string) ?? "";
}

export function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export async function openGuidePdf(path: string) {
  const { data, error } = await supabase.storage.from("learning-files").createSignedUrl(path, 3600);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener");
}

export const seatsLeft = (ev: LearningEvent, taken: Record<string, number>) => Math.max(0, ev.capacity - (taken[ev.id] ?? 0));
