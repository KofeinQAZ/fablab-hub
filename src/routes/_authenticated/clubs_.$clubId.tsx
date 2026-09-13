import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { ImageUploadMultiple } from "@/components/image-upload";
import { ClubFormDialog } from "@/components/club-form-dialog";
import { getLocalized } from "@/components/projects-section";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Users, Trophy, Calendar, Image as ImageIcon, ArrowLeft, Pencil, Plus, X, LogOut,
  ShieldCheck, Mail, Phone, CheckCircle2, History,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/clubs_/$clubId")({
  component: ClubPage,
});

function ClubPage() {
  const { clubId } = useParams({ from: "/_authenticated/clubs_/$clubId" });
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "kz" ? "kk-KZ" : i18n.language === "en" ? "en-US" : "ru-RU";
  const qc = useQueryClient();

  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [updateImages, setUpdateImages] = useState<string[]>([]);
  const [isAchievement, setIsAchievement] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["header-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  const { data: club, isLoading } = useQuery({
    queryKey: ["club", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select(`
          *,
          profiles:public_profiles!clubs_author_id_fkey (name, photo_url),
          club_members (id, user_id, role, profiles:public_profiles!club_members_user_id_fkey (name, photo_url)),
          club_updates (id, title, content, image_urls, is_achievement, created_at),
          projects (id, title, title_kz, title_en, description, description_kz, description_en, image_url, status)
        `)
        .eq("id", clubId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: myApplication } = useQuery({
    queryKey: ["my-club-application", clubId, profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("club_applications")
        .select("*")
        .eq("club_id", clubId)
        .eq("applicant_id", profile!.id)
        .maybeSingle();
      return data;
    },
  });

  const members = (club?.club_members ?? []) as any[];
  const myMembership = members.find((m) => m.user_id === profile?.id);
  const isCaptain = club?.author_id === profile?.id || myMembership?.role === "captain";
  const isModerator = isCaptain || myMembership?.role === "moderator" || profile?.role === "admin";
  const isMember = !!myMembership;
  const updates = [...(club?.club_updates ?? [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const achievements = updates.filter((u: any) => u.is_achievement);

  const { data: applications = [] } = useQuery({
    queryKey: ["club-applications", clubId],
    enabled: isModerator,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_applications")
        .select("*, profiles:public_profiles!club_applications_applicant_id_fkey (name, photo_url)")
        .eq("club_id", clubId)
        .eq("status", "pending");
      if (error) throw error;
      return data as any[];
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("club_applications").insert({
        club_id: clubId,
        applicant_id: profile!.id,
        cover_letter: coverLetter || null,
      });
      if (error) throw error;
      const recipients = new Set<string>([club.author_id, ...members.filter((m) => m.role !== "member").map((m) => m.user_id)]);
      await supabase.from("notifications").insert(
        [...recipients].map((uid) => ({
          user_id: uid,
          title: t("clubs.notify.newApplicationTitle", "Новая заявка в клуб"),
          message: t("clubs.notify.newApplicationMsg", {
            defaultValue: "{{name}} хочет вступить в клуб «{{club}}»",
            name: profile!.name,
            club: getLocalized(club, "title", i18n.language),
          }),
          type: "club",
        }))
      );
    },
    onSuccess: () => {
      toast.success(t("clubs.applySuccess", "Заявка отправлена"));
      setApplyOpen(false);
      setCoverLetter("");
      qc.invalidateQueries({ queryKey: ["my-club-application"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ app, status }: { app: any; status: "accepted" | "rejected" }) => {
      const { error } = await supabase.from("club_applications").update({ status }).eq("id", app.id);
      if (error) throw error;
      if (status === "accepted") {
        const { error: mErr } = await supabase.from("club_members").insert({ club_id: clubId, user_id: app.applicant_id, role: "member" });
        if (mErr && !mErr.message.includes("duplicate")) throw mErr;
      }
      await supabase.from("notifications").insert({
        user_id: app.applicant_id,
        title: status === "accepted" ? t("clubs.notify.acceptedTitle", "Вас приняли в клуб") : t("clubs.notify.rejectedTitle", "Заявка в клуб отклонена"),
        message: getLocalized(club, "title", i18n.language),
        type: "club",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-applications", clubId] });
      qc.invalidateQueries({ queryKey: ["club", clubId] });
      toast.success(t("clubs.reviewDone", "Готово"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", profile!.id);
      if (error) throw error;
      await supabase.from("club_applications").delete().eq("club_id", clubId).eq("applicant_id", profile!.id);
    },
    onSuccess: () => {
      toast.success(t("clubs.left", "Вы покинули клуб"));
      qc.invalidateQueries({ queryKey: ["club", clubId] });
      qc.invalidateQueries({ queryKey: ["my-club-application"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const promoteMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: "moderator" | "member" }) => {
      const { error } = await supabase.from("club_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club", clubId] });
      toast.success(t("clubs.roleUpdated", "Роль обновлена"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addUpdateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("club_updates").insert({
        club_id: clubId,
        author_id: profile!.id,
        title: updateTitle.trim() || null,
        content: updateContent,
        image_urls: updateImages,
        is_achievement: isAchievement,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("clubs.updateAdded", "Запись опубликована"));
      setUpdateOpen(false);
      setUpdateTitle(""); setUpdateContent(""); setUpdateImages([]); setIsAchievement(false);
      qc.invalidateQueries({ queryKey: ["club", clubId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !club) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <AppHeader profile={profile ?? null} />
        <div className="max-w-5xl mx-auto p-8"><div className="h-96 bg-slate-200 border-4 border-slate-300 animate-pulse" /></div>
      </div>
    );
  }

  const roleLabel = (role: string) =>
    role === "captain" ? t("clubs.role.captain", "Капитан")
      : role === "moderator" ? t("clubs.role.moderator", "Модератор")
        : t("clubs.role.member", "Участник");

  const block = "bg-white border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a]";
  const heading = "text-2xl font-black uppercase tracking-tight text-slate-900 mb-6 flex items-center gap-3";

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans">
      <AppHeader profile={profile ?? null} />

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        <Link to="/clubs" className="inline-flex items-center gap-2 font-black uppercase tracking-widest text-[11px] text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> {t("clubs.back", "Ко всем клубам")}
        </Link>

        {/* Обложка */}
        <div className="relative h-64 md:h-96 bg-slate-900 border-4 border-slate-900 shadow-[8px_8px_0_#0f172a] overflow-hidden">
          {club.image_url ? (
            <img src={club.image_url} alt="" className="w-full h-full object-cover opacity-70" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-200"><ImageIcon className="h-20 w-20 text-slate-400" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-tight">
              {getLocalized(club, "title", i18n.language)}
            </h1>
            <div className="flex flex-wrap gap-2 mt-4">
              {club.tags?.map((tag: string) => (
                <span key={tag} className="bg-white border-2 border-slate-900 px-2 py-1 font-black uppercase tracking-widest text-[10px]">{tag}</span>
              ))}
              {club.is_recruiting && (
                <span className="bg-amber-400 border-2 border-slate-900 px-2 py-1 font-black uppercase tracking-widest text-[10px]">
                  {t("clubs.card.recruiting", "Набираем людей")}
                </span>
              )}
            </div>
          </div>
          {isModerator && (
            <button onClick={() => setEditOpen(true)} className="absolute top-4 right-4 p-2 bg-white border-4 border-slate-900 shadow-[4px_4px_0_#0f172a] hover:bg-blue-600 hover:text-white transition-colors">
              <Pencil className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Капитан и модераторы */}
        <div className={block}>
          <h2 className={heading}><ShieldCheck className="h-6 w-6 text-blue-600" /> {t("clubs.leadership", "Руководство клуба")}</h2>
          <div className="flex flex-wrap gap-4">
            {members.filter((m) => m.role !== "member").map((m) => (
              <div key={m.id} className="flex items-center gap-3 border-2 border-slate-900 bg-slate-50 px-3 py-2">
                <UserAvatar name={m.profiles?.name} url={m.profiles?.photo_url} className="h-10 w-10" />
                <div>
                  <div className="font-black uppercase tracking-tight text-sm">{m.profiles?.name}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">{roleLabel(m.role)}</div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-slate-500">
              <Calendar className="h-4 w-4" /> {new Date(club.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* О клубе */}
        <div className={block}>
          <h2 className={heading}><span className="w-4 h-4 bg-blue-600 border-2 border-slate-900" /> {t("clubs.about", "О клубе")}</h2>
          <p className="text-slate-700 font-medium whitespace-pre-wrap text-lg leading-relaxed">
            {getLocalized(club, "description", i18n.language)}
          </p>
          {club.meeting_schedule && (
            <div className="mt-6 bg-slate-50 border-2 border-slate-900 px-4 py-3 font-black uppercase tracking-widest text-[11px] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" /> {club.meeting_schedule}
            </div>
          )}
        </div>

        {/* Вступление */}
        <div className="bg-blue-600 border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a] text-white">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-200" /> {t("clubs.join.title", "Вступить в клуб")}
          </h2>
          {isMember ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 h-14 bg-emerald-400 text-slate-900 border-4 border-slate-900 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> {t("clubs.join.youAreMember", "Вы участник")}
              </div>
              {!isCaptain && (
                <Button
                  onClick={() => leaveMutation.mutate()}
                  className="h-14 bg-white text-slate-900 hover:bg-red-500 hover:text-white border-4 border-slate-900 rounded-none font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_#0f172a]"
                >
                  <LogOut className="h-4 w-4 mr-2" /> {t("clubs.join.leave", "Покинуть клуб")}
                </Button>
              )}
            </div>
          ) : myApplication?.status === "pending" ? (
            <div className="h-14 bg-white text-slate-500 border-4 border-slate-900 font-black uppercase tracking-widest text-xs flex items-center justify-center">
              {t("clubs.join.pending", "Заявка на рассмотрении")}
            </div>
          ) : myApplication?.status === "rejected" ? (
            <div className="h-14 bg-red-100 text-red-700 border-4 border-slate-900 font-black uppercase tracking-widest text-xs flex items-center justify-center">
              {t("clubs.join.rejected", "Заявка отклонена")}
            </div>
          ) : (
            <Button
              onClick={() => setApplyOpen(true)}
              className="w-full h-16 bg-amber-400 hover:bg-amber-500 text-slate-900 border-4 border-slate-900 rounded-none font-black text-lg uppercase tracking-widest shadow-[6px_6px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
            >
              {t("clubs.join.apply", "Подать заявку")}
            </Button>
          )}
        </div>

        {/* Заявки для модераторов */}
        {isModerator && applications.length > 0 && (
          <div className={block}>
            <h2 className={heading}><Users className="h-6 w-6 text-blue-600" /> {t("clubs.applications", "Заявки на вступление")}</h2>
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border-2 border-slate-900 p-4 bg-slate-50 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <UserAvatar name={app.profiles?.name} url={app.profiles?.photo_url} className="h-10 w-10" />
                    <div>
                      <div className="font-black uppercase tracking-tight">{app.profiles?.name}</div>
                      {app.cover_letter && <p className="text-sm text-slate-600 font-medium mt-1">{app.cover_letter}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => reviewMutation.mutate({ app, status: "accepted" })} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px]">
                      {t("clubs.accept", "Принять")}
                    </Button>
                    <Button onClick={() => reviewMutation.mutate({ app, status: "rejected" })} className="bg-white hover:bg-red-500 hover:text-white text-slate-900 border-2 border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px]">
                      {t("clubs.reject", "Отклонить")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Участники */}
        <div className={block}>
          <h2 className={heading}><Users className="h-6 w-6 text-blue-600" /> {t("clubs.members", "Участники")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
              <div key={m.id} className="border-2 border-slate-900 bg-slate-50 p-3 flex items-center gap-3">
                <UserAvatar name={m.profiles?.name} url={m.profiles?.photo_url} className="h-10 w-10" />
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase tracking-tight text-sm truncate">{m.profiles?.name}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{roleLabel(m.role)}</div>
                  {isCaptain && m.role !== "captain" && (
                    <button
                      onClick={() => promoteMutation.mutate({ memberId: m.id, role: m.role === "moderator" ? "member" : "moderator" })}
                      className="mt-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                    >
                      {m.role === "moderator" ? t("clubs.demote", "Снять модератора") : t("clubs.promote", "Сделать модератором")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Проекты клуба */}
        {club.projects?.length > 0 && (
          <div className={block}>
            <h2 className={heading}><span className="w-4 h-4 bg-blue-600 border-2 border-slate-900" /> {t("clubs.projects", "Проекты клуба")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {club.projects.map((p: any) => (
                <Link key={p.id} to="/clubs" className="border-2 border-slate-900 bg-white shadow-[4px_4px_0_#0f172a] overflow-hidden hover:-translate-y-1 transition-transform">
                  <div className="h-32 bg-slate-100">
                    {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 opacity-30" /></div>}
                  </div>
                  <div className="p-4">
                    <div className="font-black uppercase tracking-tight text-sm line-clamp-2">{getLocalized(p, "title", i18n.language)}</div>
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-1">{getLocalized(p, "description", i18n.language)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Достижения */}
        {achievements.length > 0 && (
          <div className="bg-amber-50 border-4 border-amber-400 p-6 md:p-8 shadow-[6px_6px_0_#0f172a]">
            <h2 className={heading}><Trophy className="h-6 w-6 text-amber-500" /> {t("clubs.achievements", "Достижения")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements.map((a: any) => (
                <div key={a.id} className="border-2 border-slate-900 bg-white shadow-[4px_4px_0_#0f172a] overflow-hidden">
                  {a.image_urls?.[0] && <img src={a.image_urls[0]} alt="" className="h-32 w-full object-cover border-b-2 border-slate-900" />}
                  <div className="p-4">
                    <div className="font-black uppercase tracking-tight text-sm">{a.title || a.content.slice(0, 60)}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      {new Date(a.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Девлог */}
        <div className={block}>
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
              <History className="h-6 w-6 text-blue-600" /> {t("clubs.devlog", "Девлог")}
            </h2>
            {isModerator && (
              <Button onClick={() => setUpdateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px] shadow-[2px_2px_0_#0f172a]">
                <Plus className="h-4 w-4 mr-2" /> {t("clubs.addUpdate", "Добавить запись")}
              </Button>
            )}
          </div>
          {updates.length === 0 ? (
            <p className="font-black uppercase tracking-widest text-slate-400 text-xs">{t("clubs.devlogEmpty", "Записей пока нет")}</p>
          ) : (
            <div className="space-y-6">
              {updates.map((u: any) => (
                <div key={u.id} className={`relative pl-8 border-l-4 ${u.is_achievement ? "border-amber-400" : "border-slate-900"}`}>
                  <div className={`absolute -left-[14px] top-0 w-6 h-6 border-4 border-slate-900 ${u.is_achievement ? "bg-amber-400" : "bg-blue-400"}`} />
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {u.is_achievement && (
                      <span className="bg-amber-300 border-2 border-slate-900 px-2 py-1 font-black uppercase tracking-widest text-[9px] flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> {t("clubs.achievement", "Достижение")}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 border-2 border-slate-200">
                      {new Date(u.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {u.title && <div className="font-black uppercase tracking-tight mb-1">{u.title}</div>}
                  <p className="text-slate-700 font-medium whitespace-pre-wrap">{u.content}</p>
                  {u.image_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {u.image_urls.map((img: string) => (
                        <a key={img} href={img} target="_blank" rel="noreferrer" className="block h-28 w-28 border-2 border-slate-900 overflow-hidden">
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Контакты */}
        <div className="bg-amber-100 border-4 border-slate-900 p-6 md:p-8 shadow-[6px_6px_0_#0f172a]">
          <h2 className={heading}><span className="w-4 h-4 bg-amber-500 border-2 border-slate-900" /> {t("clubs.contacts", "Контакты для связи")}</h2>
          {isMember ? (
            <div className="flex flex-col sm:flex-row gap-4">
              {club.profiles?.contact_email && (
                <a href={`mailto:${club.profiles.contact_email}`} className="flex-1 flex items-center justify-center gap-3 p-4 bg-white border-4 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[4px_4px_0_#0f172a]">
                  <Mail className="h-5 w-5 text-blue-600" /> {club.profiles.contact_email}
                </a>
              )}
              {club.profiles?.contact_telegram && (
                <a href={`https://t.me/${String(club.profiles.contact_telegram).replace("@", "")}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-3 p-4 bg-white border-4 border-slate-900 font-black uppercase tracking-widest text-[10px] shadow-[4px_4px_0_#0f172a]">
                  <Phone className="h-5 w-5 text-blue-600" /> {club.profiles.contact_telegram}
                </a>
              )}
              {!club.profiles?.contact_email && !club.profiles?.contact_telegram && (
                <div className="p-4 bg-white border-4 border-slate-900 font-black uppercase tracking-widest text-xs text-slate-400 text-center w-full">
                  {t("projects_page.dialog.contactsHidden")}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-white border-4 border-slate-900 font-black uppercase tracking-widest text-xs text-slate-400 text-center">
              {t("clubs.contactsLocked", "Контакты откроются после вступления в клуб")}
            </div>
          )}
        </div>
      </main>

      {/* Заявка */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a]">
          <div className="bg-slate-900 p-6 flex justify-between items-start border-b-4 border-slate-900 text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">{t("clubs.join.apply", "Подать заявку")}</DialogTitle>
            <button onClick={() => setApplyOpen(false)} className="p-2 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {t("clubs.join.letterLabel", "Почему хочешь вступить / чем можешь помочь")}
              </Label>
              <Textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="h-32 border-2 border-slate-900 rounded-none bg-slate-50 font-medium focus-visible:ring-0 focus-visible:border-blue-600 resize-none"
              />
            </div>
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-900 rounded-none font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_#0f172a]"
            >
              {t("clubs.join.send", "Отправить заявку")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Новая запись девлога */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-md p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] max-h-[88vh] overflow-y-auto">
          <div className="bg-slate-900 p-5 flex justify-between items-start border-b-4 border-slate-900 text-white sticky top-0 z-10">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">{t("clubs.addUpdate", "Добавить запись")}</DialogTitle>
            <button onClick={() => setUpdateOpen(false)} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t("clubs.updateTitleLabel", "Заголовок (необязательно)")}</Label>
              <Input value={updateTitle} onChange={(e) => setUpdateTitle(e.target.value)} className="h-12 border-2 border-slate-900 rounded-none font-bold focus-visible:ring-0 focus-visible:border-blue-600" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t("profile.updateForm.textLabel")}</Label>
              <Textarea value={updateContent} onChange={(e) => setUpdateContent(e.target.value)} className="h-32 border-2 border-slate-900 rounded-none bg-slate-50 font-medium focus-visible:ring-0 focus-visible:border-blue-600 resize-none" />
            </div>
            {profile && (
              <ImageUploadMultiple
                label={t("profile.updateForm.imagesLabel", "Фото к записи (до 3)")}
                bucket="devlog-images"
                folder={profile.id}
                max={3}
                values={updateImages}
                onChange={setUpdateImages}
              />
            )}
            <label className="flex items-center gap-3 p-3 border-2 border-slate-900 bg-amber-50 cursor-pointer">
              <input type="checkbox" checked={isAchievement} onChange={(e) => setIsAchievement(e.target.checked)} className="h-5 w-5 accent-amber-500" />
              <span className="font-black uppercase tracking-widest text-[11px] flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> {t("clubs.markAchievement", "Отметить как достижение")}
              </span>
            </label>
            <Button
              onClick={() => addUpdateMutation.mutate()}
              disabled={!updateContent.trim() || addUpdateMutation.isPending}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-slate-900 border-2 border-slate-900 rounded-none font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_#0f172a]"
            >
              {t("profile.updateForm.publishBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {profile && <ClubFormDialog open={editOpen} onOpenChange={setEditOpen} club={club} userId={profile.id} />}
    </div>
  );
}
