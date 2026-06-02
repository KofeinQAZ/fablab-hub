import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, ExternalLink, X, Archive, ClipboardList, CheckCircle2, XCircle, FileText, UserCheck, ShieldAlert } from "lucide-react";
import { approveAccessRequest } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_admin/admin/requests")({
  component: AdminRequestsPage,
});

interface AccessRequest {
  id: string;
  user_id: string;
  type: "safety_briefing" | "residency";
  status: "pending" | "approved" | "rejected";
  description: string | null;
  cv_url: string | null;
  created_at: string;
  profile: { name: string | null } | null;
}

function AdminRequestsPage() {
  const queryClient = useQueryClient();
  const [showArchive, setShowArchive] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("access_requests")
        .select(
          "id,user_id,type,status,description,cv_url,created_at,profile:profiles!access_requests_user_id_fkey(name)"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as AccessRequest[]) || [];
    },
  });

  // ВЫЧИСЛЕНИЕ ДЕТАЛЬНОЙ СТАТИСТИКИ ПО ЗАЯВКАМ
  const stats = useMemo(() => {
    let pendingTB = 0;
    let pendingRes = 0;
    let approvedTotal = 0;
    let rejectedTotal = 0;

    requests.forEach(r => {
      if (r.status === "pending" && r.type === "safety_briefing") pendingTB++;
      if (r.status === "pending" && r.type === "residency") pendingRes++;
      if (r.status === "approved") approvedTotal++;
      if (r.status === "rejected") rejectedTotal++;
    });

    const conversionRate = approvedTotal + rejectedTotal > 0 
      ? Math.round((approvedTotal / (approvedTotal + rejectedTotal)) * 100) 
      : 0;

    return { pendingTB, pendingRes, approvedTotal, rejectedTotal, conversionRate };
  }, [requests]);

  // МУТАЦИЯ ОДОБРЕНИЯ (Без изменений RLS и Push-уведомлений)
  const approveRequest = useMutation({
    mutationFn: async (request: AccessRequest) => {
      await approveAccessRequest({ data: { requestId: request.id } });

      const title = request.type === 'safety_briefing' ? "✅ ТБ пройден" : "🎉 Статус Резидента";
      const message = request.type === 'safety_briefing' 
        ? "Ваша заявка на инструктаж одобрена. Вам открыт доступ к бронированию станков!" 
        : "Поздравляем! Ваша заявка на Резидентство одобрена. У вас теперь полный доступ.";

      await supabase.from("notifications").insert({
        user_id: request.user_id,
        title,
        message,
        type: "system"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Заявка обработана!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ошибка при одобрении заявки");
    },
  });

  // МУТАЦИЯ ОТКЛОНЕНИЯ (Без изменений)
  const rejectRequest = useMutation({
    mutationFn: async (request: AccessRequest) => {
      const { error } = await (supabase as any)
        .from("access_requests")
        .update({ status: "rejected" })
        .eq("id", request.id);

      if (error) throw error;

      const title = "❌ Заявка отклонена";
      const message = request.type === 'safety_briefing' 
        ? "К сожалению, ваша заявка на прохождение ТБ была отклонена администратором." 
        : "Ваша заявка на статус Резидента отклонена.";

      await supabase.from("notifications").insert({
        user_id: request.user_id,
        title,
        message,
        type: "system"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      toast.success("Заявка отклонена, юзер уведомлен");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ошибка при отклонении заявки");
    },
  });

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const briefingRequests = pendingRequests.filter((r) => r.type === "safety_briefing");
  const residencyRequests = pendingRequests.filter((r) => r.type === "residency");
  const archivedRequests = requests.filter((r) => r.status !== "pending");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4 mt-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 bg-slate-200" />
      ))}
    </div>
  );

  return (
    <main className="space-y-8 animate-in fade-in duration-500 pb-12 p-2">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-4 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Доступы</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">
            Заявки на прохождение ТБ и резидентство
          </p>
        </div>
        
        <Button 
          onClick={() => setShowArchive(!showArchive)}
          className={`border-4 border-slate-900 px-6 py-6 font-black text-xs tracking-widest uppercase transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none ${showArchive ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 hover:bg-slate-50'}`}
        >
          {showArchive ? <><ClipboardList className="mr-2 h-4 w-4" /> Активные заявки</> : <><Archive className="mr-2 h-4 w-4" /> Архив заявок</>}
        </Button>
      </div>

      {/* DETAILED STATISTICS BLOCK (Брутальный стиль) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Ожидают ТБ</h4>
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.pendingTB}</div>
        </div>

        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Ждут статус</h4>
            <UserCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.pendingRes}</div>
        </div>

        <div className="bg-slate-900 border-4 border-slate-900 p-5 shadow-[4px_4px_0_#2563eb] flex flex-col justify-between text-white">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-400">Всего одобрено</h4>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-4xl font-black text-white">{stats.approvedTotal}</div>
        </div>

        <div className="bg-white border-4 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest text-slate-900">Процент одобрения</h4>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-4xl font-black text-slate-900">{stats.conversionRate}<span className="text-xl text-slate-400 ml-1">%</span></div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : showArchive ? (
        // АРХИВ (Брутальный)
        <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
          <div className="bg-slate-900 text-white p-4 md:p-6 border-b-4 border-slate-900">
            <h2 className="text-xl font-black uppercase tracking-tight">История заявок</h2>
          </div>
          <div className="p-4 md:p-6 space-y-4">
            {archivedRequests.length === 0 ? (
              <p className="py-6 text-center font-bold uppercase tracking-widest text-xs text-slate-400">Архив пуст</p>
            ) : (
              archivedRequests.map((request) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-2 border-slate-200 p-4 bg-slate-50 opacity-70 hover:opacity-100 transition-opacity">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-lg font-black uppercase tracking-tight text-slate-900">
                        {request.profile?.name || "Студент"}
                      </p>
                      {request.status === 'approved' ? (
                        <Badge className="bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest border-2 border-slate-900"><CheckCircle2 className="w-3 h-3 mr-1" /> Одобрено</Badge>
                      ) : (
                        <Badge className="bg-red-500 text-white font-black text-[10px] uppercase tracking-widest border-2 border-slate-900"><XCircle className="w-3 h-3 mr-1" /> Отклонено</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <span className={request.type === 'safety_briefing' ? 'text-amber-600' : 'text-blue-600'}>
                        {request.type === 'safety_briefing' ? 'Техника Безопасности' : 'Резидентство'}
                      </span>
                      <span>•</span>
                      <span>{formatDate(request.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // АКТИВНЫЕ ВЛАДКИ
        <Tabs defaultValue="briefing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none bg-slate-900 p-1 border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
            <TabsTrigger value="briefing" className="rounded-none relative font-black uppercase tracking-widest text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-400 py-3">
              ТБ Инструктажи
              {briefingRequests.length > 0 && <span className="absolute top-2 right-2 flex items-center justify-center bg-amber-500 text-white text-[10px] w-5 h-5 rounded-full border-2 border-slate-900">{briefingRequests.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="residency" className="rounded-none relative font-black uppercase tracking-widest text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-400 py-3">
              Статус резидента
              {residencyRequests.length > 0 && <span className="absolute top-2 right-2 flex items-center justify-center bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full border-2 border-slate-900">{residencyRequests.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="briefing" className="mt-8 space-y-4">
            {briefingRequests.length === 0 ? (
              <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] p-8 text-center">
                <p className="font-bold uppercase tracking-widest text-xs text-slate-400">Нет новых заявок на ТБ</p>
              </div>
            ) : (
              briefingRequests.map((request) => (
                <div key={request.id} className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">{request.profile?.name || "Студент"}</p>
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 border-2 border-amber-200">Техника безопасности</span>
                      <span>{formatDate(request.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => approveRequest.mutate(request)} disabled={approveRequest.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-slate-900 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all px-6">
                      <Check className="mr-2 h-4 w-4" /> Одобрить
                    </Button>
                    <Button onClick={() => rejectRequest.mutate(request)} disabled={rejectRequest.isPending} variant="outline" className="border-2 border-slate-900 text-slate-900 hover:bg-red-50 hover:text-red-600 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all px-3">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="residency" className="mt-8 space-y-4">
            {residencyRequests.length === 0 ? (
              <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] p-8 text-center">
                <p className="font-bold uppercase tracking-widest text-xs text-slate-400">Нет новых заявок на резидентство</p>
              </div>
            ) : (
              residencyRequests.map((request) => (
                <div key={request.id} className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] p-4 md:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">{request.profile?.name || "Студент"}</p>
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 border-2 border-blue-200">Резидентство</span>
                      <span>{formatDate(request.created_at)}</span>
                    </div>
                    
                    <div className="bg-slate-50 border-2 border-slate-200 p-4 mb-4">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">О проекте:</p>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{request.description || "Описание не указано"}</p>
                    </div>

                    {request.cv_url && (
                      <a href={request.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 border-2 border-slate-900 font-bold uppercase tracking-widest text-xs transition-colors">
                        <ExternalLink className="h-4 w-4" /> Смотреть CV
                      </a>
                    )}
                  </div>
                  
                  <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <Button onClick={() => approveRequest.mutate(request)} disabled={approveRequest.isPending} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-slate-900 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all py-6 md:py-2">
                      <Check className="mr-2 h-4 w-4" /> Одобрить
                    </Button>
                    <Button onClick={() => rejectRequest.mutate(request)} disabled={rejectRequest.isPending} variant="outline" className="flex-1 md:flex-none border-2 border-slate-900 text-slate-900 hover:bg-red-50 hover:text-red-600 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all py-6 md:py-2">
                      <X className="mr-2 h-4 w-4" /> Отклонить
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}