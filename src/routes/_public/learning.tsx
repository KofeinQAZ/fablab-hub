import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameDay, isSameMonth } from "date-fns";
import { ru, enUS, kk } from "date-fns/locale";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock, FileText, GraduationCap, MapPin, PlayCircle, Ticket, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  KIND_LABEL, lang3, loc, openGuidePdf, seatsLeft, youtubeEmbed,
  type LearningEvent, type LearningGuide, type LearningSkill, type TeamMember,
} from "@/lib/learning";

export const Route = createFileRoute("/_public/learning")({
  head: () => ({ meta: [{ title: "Обучение — FabLab Satbayev" }, { name: "description", content: "Гайды, обучение, курсы и воркшопы FabLab Satbayev с удобной записью." }] }),
  component: LearningPage,
});

const TX = {
  ru: { title: "Обучение", sub: "Гайды, курсы и воркшопы FabLab Satbayev", events: "Ближайшие курсы и воркшопы", calendar: "Календарь", skills: "Чему мы можем научить", guides: "Гайды", tickets: "Мои билеты", enroll: "Записаться", full: "Мест нет", ticket: "Мой билет", left: "мест осталось", noEvents: "Скоро объявим новые занятия", noGuides: "Гайды скоро появятся", login: "Войдите, чтобы записаться", pending: "Запись доступна после одобрения аккаунта", mentors: "Наставники", sessions: "Ближайшие занятия", noSessions: "Ближайших занятий нет", pdf: "Скачать PDF", cancel: "Отменить запись", host: "Ведущий", code: "Код билета", show: "Покажите билет на входе", done: "Вы записаны!", read: "Читать", dayEmpty: "В этот день ничего нет" },
  kz: { title: "Оқыту", sub: "FabLab Satbayev гайдтары, курстары мен воркшоптары", events: "Жақын курстар мен воркшоптар", calendar: "Күнтізбе", skills: "Біз не үйрете аламыз", guides: "Гайдтар", tickets: "Менің билеттерім", enroll: "Жазылу", full: "Орын жоқ", ticket: "Менің билетім", left: "орын қалды", noEvents: "Жаңа сабақтарды жақында жариялаймыз", noGuides: "Гайдтар жақында пайда болады", login: "Жазылу үшін кіріңіз", pending: "Аккаунт мақұлданғаннан кейін жазылуға болады", mentors: "Тәлімгерлер", sessions: "Жақын сабақтар", noSessions: "Жақын сабақтар жоқ", pdf: "PDF жүктеу", cancel: "Жазылудан бас тарту", host: "Жүргізуші", code: "Билет коды", show: "Кіре берісте билетті көрсетіңіз", done: "Сіз жазылдыңыз!", read: "Оқу", dayEmpty: "Бұл күні ештеңе жоқ" },
  en: { title: "Learning", sub: "Guides, courses and workshops at FabLab Satbayev", events: "Upcoming courses & workshops", calendar: "Calendar", skills: "What we can teach", guides: "Guides", tickets: "My tickets", enroll: "Sign up", full: "Fully booked", ticket: "My ticket", left: "seats left", noEvents: "New sessions coming soon", noGuides: "Guides coming soon", login: "Sign in to register", pending: "Registration opens after account approval", mentors: "Mentors", sessions: "Upcoming sessions", noSessions: "No upcoming sessions", pdf: "Download PDF", cancel: "Cancel registration", host: "Host", code: "Ticket code", show: "Show this ticket at the entrance", done: "You're registered!", read: "Read", dayEmpty: "Nothing on this day" },
};

type Reg = { id: string; event_id: string; ticket_code: string; created_at: string };

function LearningPage() {
  const { i18n } = useTranslation();
  const L = lang3(i18n.language);
  const tx = TX[L];
  const dfLocale = L === "en" ? enUS : L === "kz" ? kk : ru;
  const qc = useQueryClient();
  const { data: auth } = useCurrentProfile();
  const profile = auth?.profile;
  const canEnroll = !!profile && profile.approval_status === "approved" && !profile.is_banned;

  const { data: events = [] } = useQuery({
    queryKey: ["learning-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_events").select("*").eq("is_published", true).order("start_time");
      if (error) throw error;
      return data as LearningEvent[];
    },
  });
  const { data: taken = {} } = useQuery({
    queryKey: ["learning-seats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_learning_seats");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r: { event_id: string; taken: number }) => [r.event_id, r.taken])) as Record<string, number>;
    },
  });
  const { data: skills = [] } = useQuery({
    queryKey: ["learning-skills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_skills").select("*").eq("is_published", true).order("sort_order");
      if (error) throw error;
      return data as LearningSkill[];
    },
  });
  const { data: guides = [] } = useQuery({
    queryKey: ["learning-guides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_guides").select("*").eq("is_published", true).order("sort_order");
      if (error) throw error;
      return data as LearningGuide[];
    },
  });
  const { data: team = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_team_members");
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });
  const { data: regs = [] } = useQuery({
    queryKey: ["my-learning-regs", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_registrations").select("id, event_id, ticket_code, created_at").eq("user_id", profile!.id);
      if (error) throw error;
      return data as Reg[];
    },
  });

  const [ticketFor, setTicketFor] = useState<string | null>(null);
  const [guide, setGuide] = useState<LearningGuide | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [day, setDay] = useState<Date>(() => new Date());

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.end_time) >= now);
  const regByEvent = useMemo(() => Object.fromEntries(regs.map((r) => [r.event_id, r])), [regs]);
  const eventById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);

  const enroll = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc("register_for_learning_event", { _event_id: eventId });
      if (error) throw error;
      return eventId;
    },
    onSuccess: (eventId) => {
      qc.invalidateQueries({ queryKey: ["my-learning-regs"] });
      qc.invalidateQueries({ queryKey: ["learning-seats"] });
      toast.success(tx.done);
      setTicketFor(eventId);
    },
    onError: (e: Error) => {
      qc.invalidateQueries({ queryKey: ["learning-seats"] });
      toast.error(/no_seats/.test(e.message) ? tx.full : /not_approved/.test(e.message) ? tx.pending : e.message);
    },
  });
  const cancel = useMutation({
    mutationFn: async (regId: string) => {
      const { error } = await supabase.from("learning_registrations").delete().eq("id", regId);
      if (error) throw error;
    },
    onSuccess: () => {
      setTicketFor(null);
      qc.invalidateQueries({ queryKey: ["my-learning-regs"] });
      qc.invalidateQueries({ queryKey: ["learning-seats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const when = (e: LearningEvent) => `${format(new Date(e.start_time), "d MMMM, HH:mm", { locale: dfLocale })} — ${format(new Date(e.end_time), "HH:mm")}`;

  const EnrollButton = ({ ev }: { ev: LearningEvent }) => {
    const reg = regByEvent[ev.id];
    if (reg) return <Button onClick={() => setTicketFor(ev.id)} className="border-2 border-slate-900 bg-emerald-500 font-black uppercase text-slate-900 hover:bg-emerald-600"><Ticket className="mr-2 h-4 w-4" />{tx.ticket}</Button>;
    if (seatsLeft(ev, taken) === 0) return <Button disabled className="border-2 border-slate-900 bg-slate-200 font-black uppercase text-slate-600">{tx.full}</Button>;
    if (!profile) return <Button asChild variant="outline" className="border-2 border-slate-900 font-black uppercase"><Link to="/login">{tx.login}</Link></Button>;
    if (!canEnroll) return <p className="text-xs font-bold text-slate-500">{tx.pending}</p>;
    return <Button disabled={enroll.isPending} onClick={() => enroll.mutate(ev.id)} className="border-2 border-slate-900 bg-blue-600 font-black uppercase text-white hover:bg-blue-700">{tx.enroll}</Button>;
  };

  // calendar
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  const onDay = (d: Date) => events.filter((e) => isSameDay(new Date(e.start_time), d));

  const ticketEv = ticketFor ? eventById[ticketFor] : null;
  const ticketReg = ticketFor ? regByEvent[ticketFor] : null;
  const myTickets = regs.map((r) => eventById[r.event_id]).filter((e): e is LearningEvent => !!e && new Date(e.end_time) >= now);

  const sectionTitle = (Icon: typeof BookOpen, text: string, id: string) => (
    <h2 id={id} className="flex scroll-mt-24 items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900 md:text-3xl">
      <span className="flex h-10 w-10 items-center justify-center border-4 border-slate-900 bg-amber-400"><Icon className="h-5 w-5" /></span>{text}
    </h2>
  );

  return (
    <main className="mx-auto max-w-7xl space-y-14 p-4 pb-24 md:p-8">
      <header className="border-4 border-slate-900 bg-white p-6 shadow-[6px_6px_0_#2563eb] md:p-10">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center border-4 border-slate-900 bg-blue-600 text-white"><GraduationCap className="h-7 w-7" /></div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 md:text-5xl">{tx.title}</h1>
            <p className="mt-1 text-sm font-bold text-slate-500 md:text-base">{tx.sub}</p>
          </div>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2">
          {[["#learn-events", tx.events], ["#learn-calendar", tx.calendar], ["#learn-skills", tx.skills], ["#learn-guides", tx.guides]].map(([h, l]) => (
            <a key={h} href={h} className="border-2 border-slate-900 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-amber-300">{l}</a>
          ))}
        </nav>
      </header>

      {myTickets.length > 0 && (
        <section className="space-y-4">
          {sectionTitle(Ticket, tx.tickets, "learn-tickets")}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {myTickets.map((e) => (
              <button key={e.id} onClick={() => setTicketFor(e.id)} className="min-w-64 border-4 border-slate-900 bg-emerald-50 p-4 text-left shadow-[4px_4px_0_#0f172a]">
                <div className="text-xs font-black uppercase text-emerald-700">{KIND_LABEL[e.kind]?.[L] ?? e.kind}</div>
                <div className="mt-1 font-black text-slate-900">{loc(e, "title", L)}</div>
                <div className="mt-1 text-sm font-bold text-slate-600">{when(e)}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        {sectionTitle(CalendarDays, tx.events, "learn-events")}
        {upcoming.length === 0 ? (
          <p className="border-4 border-dashed border-slate-300 p-10 text-center font-bold text-slate-500">{tx.noEvents}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => {
              const left = seatsLeft(e, taken);
              return (
                <article key={e.id} className="flex flex-col border-4 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a]">
                  {e.cover_url && <img src={e.cover_url} alt={loc(e, "title", L)} loading="lazy" className="aspect-video w-full border-b-4 border-slate-900 object-cover" />}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="border-2 border-slate-900 bg-amber-400 px-2 py-0.5 text-xs font-black uppercase">{KIND_LABEL[e.kind]?.[L] ?? e.kind}</span>
                      <span className={`text-xs font-black uppercase ${left === 0 ? "text-red-600" : "text-emerald-700"}`}>{left === 0 ? tx.full : `${left} ${tx.left}`}</span>
                    </div>
                    <h3 className="text-xl font-black leading-tight text-slate-900">{loc(e, "title", L)}</h3>
                    <div className="space-y-1 text-sm font-bold text-slate-600">
                      <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" />{when(e)}</p>
                      {e.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" />{e.location}</p>}
                      {e.host_name && <p className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" />{tx.host}: {e.host_name}</p>}
                    </div>
                    {loc(e, "description", L) && <p className="line-clamp-4 whitespace-pre-line text-sm text-slate-700">{loc(e, "description", L)}</p>}
                    <div className="mt-auto pt-2"><EnrollButton ev={e} /></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-6">
        {sectionTitle(CalendarDays, tx.calendar, "learn-calendar")}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="border-4 border-slate-900 bg-white p-4 shadow-[6px_6px_0_#0f172a]">
            <div className="mb-4 flex items-center justify-between">
              <button aria-label="prev" onClick={() => setMonth(addMonths(month, -1))} className="border-2 border-slate-900 p-2 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>
              <div className="text-lg font-black uppercase">{format(month, "LLLL yyyy", { locale: dfLocale })}</div>
              <button aria-label="next" onClick={() => setMonth(addMonths(month, 1))} className="border-2 border-slate-900 p-2 hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: 7 }, (_, i) => <div key={i} className="py-1 text-[11px] font-black uppercase text-slate-500">{format(addDays(gridStart, i), "EEEEEE", { locale: dfLocale })}</div>)}
              {days.map((d) => {
                const list = onDay(d);
                const sel = isSameDay(d, day);
                return (
                  <button key={d.toISOString()} onClick={() => setDay(d)} className={`flex aspect-square flex-col items-center justify-center border-2 text-sm font-bold transition ${sel ? "border-slate-900 bg-blue-600 text-white" : list.length ? "border-slate-900 bg-amber-100" : "border-transparent hover:border-slate-300"} ${isSameMonth(d, month) ? "" : "opacity-40"}`}>
                    {format(d, "d")}
                    {list.length > 0 && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${sel ? "bg-white" : "bg-blue-600"}`} />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-4 border-slate-900 bg-white p-4 shadow-[6px_6px_0_#0f172a]">
            <div className="mb-3 text-sm font-black uppercase">{format(day, "d MMMM, EEEE", { locale: dfLocale })}</div>
            {onDay(day).length === 0 ? <p className="text-sm font-bold text-slate-500">{tx.dayEmpty}</p> : (
              <div className="space-y-3">
                {onDay(day).map((e) => (
                  <div key={e.id} className="space-y-2 border-2 border-slate-900 bg-slate-50 p-3">
                    <div className="text-[11px] font-black uppercase text-blue-700">{KIND_LABEL[e.kind]?.[L] ?? e.kind} · {format(new Date(e.start_time), "HH:mm")}–{format(new Date(e.end_time), "HH:mm")}</div>
                    <div className="font-black">{loc(e, "title", L)}</div>
                    {new Date(e.end_time) >= now && <EnrollButton ev={e} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {sectionTitle(GraduationCap, tx.skills, "learn-skills")}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => {
            const mentors = team.filter((m) => s.mentor_ids.includes(m.id));
            const sessions = upcoming.filter((e) => e.skill_id === s.id).slice(0, 3);
            return (
              <article key={s.id} className="flex flex-col border-4 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a]">
                {s.image_url && <img src={s.image_url} alt={loc(s, "title", L)} loading="lazy" className="aspect-video w-full border-b-4 border-slate-900 object-cover" />}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-xl font-black text-slate-900">{loc(s, "title", L)}</h3>
                  {loc(s, "description", L) && <p className="whitespace-pre-line text-sm text-slate-700">{loc(s, "description", L)}</p>}
                  {mentors.length > 0 && (
                    <div>
                      <div className="mb-2 text-[11px] font-black uppercase text-slate-500">{tx.mentors}</div>
                      <div className="flex flex-wrap gap-2">
                        {mentors.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 border-2 border-slate-900 bg-slate-50 py-1 pl-1 pr-3">
                            {m.photo_url ? <img src={m.photo_url} alt={m.name} className="h-8 w-8 object-cover" /> : <span className="flex h-8 w-8 items-center justify-center bg-slate-200 text-xs font-black">{m.name[0]}</span>}
                            <div className="leading-tight"><div className="text-xs font-black">{m.name}</div>{m.job_title && <div className="text-[10px] font-bold text-slate-500">{m.job_title}</div>}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-auto border-t-2 border-slate-200 pt-3">
                    <div className="mb-2 text-[11px] font-black uppercase text-slate-500">{tx.sessions}</div>
                    {sessions.length === 0 ? <p className="text-sm font-bold text-slate-400">{tx.noSessions}</p> : (
                      <div className="space-y-2">
                        {sessions.map((e) => (
                          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-bold">{format(new Date(e.start_time), "d MMM, HH:mm", { locale: dfLocale })}</span>
                            <EnrollButton ev={e} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        {sectionTitle(BookOpen, tx.guides, "learn-guides")}
        {guides.length === 0 ? <p className="border-4 border-dashed border-slate-300 p-10 text-center font-bold text-slate-500">{tx.noGuides}</p> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {guides.map((g) => (
              <button key={g.id} onClick={() => setGuide(g)} className="flex flex-col border-4 border-slate-900 bg-white text-left shadow-[4px_4px_0_#0f172a] transition hover:-translate-y-0.5">
                {g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" className="aspect-video w-full border-b-4 border-slate-900 object-cover" /> : <div className="flex aspect-video w-full items-center justify-center border-b-4 border-slate-900 bg-blue-600 text-white"><BookOpen className="h-10 w-10" /></div>}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="font-black text-slate-900">{loc(g, "title", L)}</h3>
                  {loc(g, "summary", L) && <p className="line-clamp-3 text-sm text-slate-600">{loc(g, "summary", L)}</p>}
                  <div className="mt-auto flex gap-2 pt-2 text-slate-500">
                    {g.video_url && <PlayCircle className="h-4 w-4" />}{g.pdf_path && <FileText className="h-4 w-4" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!guide} onOpenChange={(o) => !o && setGuide(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-4 border-slate-900">
          {guide && (
            <>
              <DialogHeader><DialogTitle className="text-2xl font-black">{loc(guide, "title", L)}</DialogTitle></DialogHeader>
              {guide.cover_url && <img src={guide.cover_url} alt="" className="w-full border-2 border-slate-900" />}
              {youtubeEmbed(guide.video_url) && (
                <div className="aspect-video w-full border-2 border-slate-900"><iframe src={youtubeEmbed(guide.video_url)!} title="video" className="h-full w-full" allowFullScreen /></div>
              )}
              {loc(guide, "content", L) && <div className="whitespace-pre-line text-base leading-relaxed text-slate-800">{loc(guide, "content", L)}</div>}
              {guide.pdf_path && (
                <Button onClick={() => openGuidePdf(guide.pdf_path!).catch((e) => toast.error(e.message))} className="w-fit border-2 border-slate-900 bg-blue-600 font-black uppercase text-white"><FileText className="mr-2 h-4 w-4" />{tx.pdf}</Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!ticketEv && !!ticketReg} onOpenChange={(o) => !o && setTicketFor(null)}>
        <DialogContent className="max-w-sm border-0 bg-transparent p-0 shadow-none">
          {ticketEv && ticketReg && (
            <div className="border-4 border-slate-900 bg-white shadow-[8px_8px_0_#2563eb]">
              <div className="border-b-4 border-dashed border-slate-900 bg-blue-600 p-5 text-white">
                <div className="text-xs font-black uppercase tracking-widest opacity-80">FabLab Satbayev · {KIND_LABEL[ticketEv.kind]?.[L]}</div>
                <div className="mt-2 text-2xl font-black leading-tight">{loc(ticketEv, "title", L)}</div>
              </div>
              <div className="space-y-2 p-5 text-sm font-bold text-slate-700">
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" />{when(ticketEv)}</p>
                {ticketEv.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{ticketEv.location}</p>}
                {ticketEv.host_name && <p className="flex items-center gap-2"><Users className="h-4 w-4" />{tx.host}: {ticketEv.host_name}</p>}
                <p className="flex items-center gap-2"><Ticket className="h-4 w-4" />{profile?.name}</p>
                <div className="mt-4 border-2 border-slate-900 bg-amber-300 p-3 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest">{tx.code}</div>
                  <div className="font-mono text-3xl font-black tracking-[0.3em]">{ticketReg.ticket_code}</div>
                </div>
                <p className="text-center text-xs text-slate-500">{tx.show}</p>
                <button onClick={() => cancel.mutate(ticketReg.id)} className="w-full pt-2 text-xs font-black uppercase text-red-600 hover:underline">{tx.cancel}</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
