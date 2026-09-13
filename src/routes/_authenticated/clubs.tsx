import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ClubFormDialog } from "@/components/club-form-dialog";
import { ProjectsSection, useProjects, getLocalized } from "@/components/projects-section";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { Search, Users, Plus, Trophy, Image as ImageIcon, Rocket, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clubs")({
  component: ClubsPage,
});

type Tab = "all" | "clubs" | "projects" | "feed" | "my";

function ClubsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language === "kz" ? "kk-KZ" : i18n.language === "en" ? "en-US" : "ru-RU";
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [creatingClub, setCreatingClub] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["header-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select(`
          *,
          profiles:public_profiles!clubs_author_id_fkey (name, photo_url),
          club_members (user_id, role),
          club_updates (id, title, content, created_at, image_urls, is_achievement)
        `)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  const { data: myClubApplications = [] } = useQuery({
    queryKey: ["my-club-applications", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_applications")
        .select("club_id, status")
        .eq("applicant_id", profile!.id);
      if (error) throw error;
      return data as any[];
    },
  });

  const matches = (obj: any, fields: string[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return fields.some((f) => getLocalized(obj, f, i18n.language).toLowerCase().includes(q));
  };

  const isMyClub = (club: any) =>
    club.author_id === profile?.id ||
    club.club_members?.some((m: any) => m.user_id === profile?.id) ||
    myClubApplications.some((a) => a.club_id === club.id);

  const isMyProject = (p: any) =>
    p.author_id === profile?.id || p.project_members?.some((m: any) => m.user_id === profile?.id);

  const visibleClubs = clubs.filter((c) => matches(c, ["title", "description"]) && (tab !== "my" || isMyClub(c)));
  const visibleProjects = projects.filter((p) => matches(p, ["title", "description"]) && (tab !== "my" || isMyProject(p)));

  const feed = useMemo(() => {
    const items: any[] = [];
    clubs.forEach((c) => {
      items.push({
        kind: "club",
        id: `club-${c.id}`,
        date: c.created_at,
        title: getLocalized(c, "title", i18n.language),
        text: getLocalized(c, "description", i18n.language),
        author: c.profiles,
        link: { to: "/clubs/$clubId", params: { clubId: c.id } },
        images: c.image_url ? [c.image_url] : [],
        label: t("clubs.feed.newClub", "Новый клуб"),
      });
      (c.club_updates ?? []).forEach((u: any) => {
        items.push({
          kind: u.is_achievement ? "achievement" : "update",
          id: `cu-${u.id}`,
          date: u.created_at,
          title: getLocalized(c, "title", i18n.language),
          text: u.title ? `${u.title}\n${u.content}` : u.content,
          author: c.profiles,
          link: { to: "/clubs/$clubId", params: { clubId: c.id } },
          images: u.image_urls ?? [],
          label: u.is_achievement ? t("clubs.achievement", "Достижение") : t("clubs.feed.clubUpdate", "Девлог клуба"),
        });
      });
    });
    projects.forEach((p: any) => {
      items.push({
        kind: "project",
        id: `proj-${p.id}`,
        date: p.created_at,
        title: getLocalized(p, "title", i18n.language),
        text: getLocalized(p, "description", i18n.language),
        author: p.profiles,
        images: p.image_url ? [p.image_url] : [],
        label: t("clubs.feed.newProject", "Новый проект"),
      });
      (p.project_updates ?? []).forEach((u: any) => {
        items.push({
          kind: u.is_achievement ? "achievement" : "update",
          id: `pu-${u.id}`,
          date: u.created_at,
          title: getLocalized(p, "title", i18n.language),
          text: u.content,
          author: p.profiles,
          images: u.image_urls ?? [],
          label: u.is_achievement ? t("clubs.achievement", "Достижение") : t("clubs.feed.projectUpdate", "Девлог проекта"),
        });
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [clubs, projects, i18n.language, t]);

  const tabBtn = (key: Tab, label: string, active: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`px-5 py-3 border-4 border-slate-900 font-black uppercase tracking-widest text-xs transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none ${
        tab === key ? active : "bg-white text-slate-900"
      }`}
    >
      {label}
    </button>
  );

  const clubGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {visibleClubs.map((club) => {
        const achievements = (club.club_updates ?? [])
          .filter((u: any) => u.is_achievement)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const last = achievements[0];
        return (
          <Link
            key={club.id}
            to="/clubs/$clubId"
            params={{ clubId: club.id }}
            className="border-4 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a] overflow-hidden flex flex-col hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[12px_12px_0_#2563eb] transition-all duration-300 group"
          >
            <div className="h-48 bg-slate-900 relative overflow-hidden border-b-4 border-slate-900">
              {club.image_url ? (
                <img src={club.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100"><ImageIcon className="h-10 w-10 opacity-30" /></div>
              )}
              {club.is_recruiting && (
                <span className="absolute top-3 right-3 bg-amber-400 border-2 border-slate-900 px-2 py-1 font-black uppercase tracking-widest text-[9px] shadow-[2px_2px_0_#0f172a]">
                  {t("clubs.card.recruiting", "Набираем людей")}
                </span>
              )}
            </div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {getLocalized(club, "title", i18n.language)}
              </h3>
              <p className="text-slate-600 font-medium text-sm line-clamp-2 mb-4 flex-1">
                {getLocalized(club, "description", i18n.language)}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {club.tags?.map((tag: string) => (
                  <span key={tag} className="border-2 border-slate-200 bg-slate-50 text-slate-600 font-bold text-[10px] uppercase tracking-widest px-2 py-1">{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-slate-500">
                <Users className="h-4 w-4 text-blue-600" /> {club.club_members?.length ?? 0} {t("clubs.card.members", "участников")}
              </div>
              {last && (
                <div className="mt-4 bg-amber-100 border-2 border-slate-900 px-3 py-2 font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                  <Trophy className="h-3 w-3" /> {last.title || last.content.slice(0, 40)},{" "}
                  {new Date(last.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                </div>
              )}
            </div>
          </Link>
        );
      })}
      {visibleClubs.length === 0 && !clubsLoading && (
        <div className="col-span-full text-center py-20 bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
          <p className="font-black uppercase tracking-widest text-slate-400">{t("clubs.empty", "Пока нет клубов")}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans">
      <AppHeader profile={profile ?? null} />

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 pb-24 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b-4 border-slate-900">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">
              {t("clubs.header.title", "Клубы и проекты")}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm max-w-xl">
              {t("clubs.header.subtitle", "Находи единомышленников, вступай в клубы, следи за проектами лаборатории")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder={t("clubs.search", "Поиск по клубам и проектам")}
                className="pl-12 h-14 border-4 border-slate-900 rounded-none font-bold uppercase focus-visible:ring-0 focus-visible:border-blue-600 shadow-[4px_4px_0_#0f172a]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-14 px-6 bg-blue-600 hover:bg-blue-700 text-white border-4 border-slate-900 rounded-none font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_#0f172a]">
                  <Plus className="h-4 w-4 mr-2" /> {t("clubs.createBtn", "Создать")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-4 border-slate-900 rounded-none p-0 shadow-[6px_6px_0_#0f172a]">
                <DropdownMenuItem
                  onClick={() => setCreatingClub(true)}
                  className="rounded-none font-black uppercase tracking-widest text-[11px] px-4 py-3 cursor-pointer"
                >
                  <Users className="h-4 w-4 mr-2" /> {t("clubs.createClub", "Создать клуб")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/profile" })}
                  className="rounded-none font-black uppercase tracking-widest text-[11px] px-4 py-3 cursor-pointer"
                >
                  <Rocket className="h-4 w-4 mr-2" /> {t("clubs.createProject", "Создать проект")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabBtn("all", t("clubs.tabs.all", "Все"), "bg-slate-900 text-white")}
          {tabBtn("clubs", t("clubs.tabs.clubs", "Клубы"), "bg-blue-600 text-white")}
          {tabBtn("projects", t("clubs.tabs.projects", "Проекты"), "bg-blue-600 text-white")}
          {tabBtn("feed", t("clubs.tabs.feed", "Лента"), "bg-slate-900 text-white")}
          {tabBtn("my", t("clubs.tabs.my", "Мои"), "bg-amber-400 text-slate-900")}
        </div>

        {(tab === "all" || tab === "clubs" || tab === "my") && (
          <section className="space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
              <Users className="h-6 w-6 text-blue-600" /> {t("clubs.tabs.clubs", "Клубы")}
            </h2>
            {clubGrid}
          </section>
        )}

        {(tab === "all" || tab === "projects" || tab === "my") && (
          <section className="space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
              <Rocket className="h-6 w-6 text-blue-600" /> {t("clubs.tabs.projects", "Проекты")}
            </h2>
            <ProjectsSection profile={profile} projects={visibleProjects} isLoading={projectsLoading} />
          </section>
        )}

        {tab === "feed" && (
          <section className="space-y-4 max-w-3xl">
            {feed.map((item) => (
              <div
                key={item.id}
                className={`border-4 p-6 bg-white shadow-[6px_6px_0_#0f172a] ${item.kind === "achievement" ? "border-amber-400 bg-amber-50" : "border-slate-900"}`}
              >
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <UserAvatar name={item.author?.name} url={item.author?.photo_url} className="h-8 w-8 border-2 border-slate-900" />
                  <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">{item.author?.name}</span>
                  <span className={`px-2 py-1 border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] flex items-center gap-1 ${item.kind === "achievement" ? "bg-amber-300" : "bg-slate-100"}`}>
                    {item.kind === "achievement" ? <Trophy className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />} {item.label}
                  </span>
                  <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {new Date(item.date).toLocaleDateString(dateLocale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {item.link ? (
                  <Link to={item.link.to} params={item.link.params} className="text-xl font-black uppercase tracking-tight text-slate-900 hover:text-blue-600">
                    {item.title}
                  </Link>
                ) : (
                  <div className="text-xl font-black uppercase tracking-tight text-slate-900">{item.title}</div>
                )}
                <p className="text-slate-700 font-medium whitespace-pre-wrap mt-2 line-clamp-6">{item.text}</p>
                {item.images?.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {item.images.map((img: string) => (
                      <a key={img} href={img} target="_blank" rel="noreferrer" className="block h-28 w-28 border-2 border-slate-900 overflow-hidden">
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {feed.length === 0 && (
              <div className="text-center py-20 bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
                <p className="font-black uppercase tracking-widest text-slate-400">{t("clubs.feedEmpty", "Лента пока пуста")}</p>
              </div>
            )}
          </section>
        )}
      </main>

      {profile && <ClubFormDialog open={creatingClub} onOpenChange={setCreatingClub} userId={profile.id} />}
    </div>
  );
}
