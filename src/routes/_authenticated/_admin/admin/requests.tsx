import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, ExternalLink, X, Archive, ClipboardList, CheckCircle2, XCircle } from "lucide-react";
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
  const [rejectingId, setRejectingId] = useState<string | null>(null);
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

  // ВНИМАНИЕ: Изменили параметр с ID на весь объект Request, чтобы знать кому слать пуш
  const approveRequest = useMutation({
    mutationFn: async (request: AccessRequest) => {
      // 1. Одобряем саму заявку
      await approveAccessRequest({ data: { requestId: request.id } });

      // 2. Генерируем текст уведомления
      const title = request.type === 'safety_briefing' ? "✅ ТБ пройден" : "🎉 Статус Резидента";
      const message = request.type === 'safety_briefing' 
        ? "Ваша заявка на инструктаж одобрена. Вам открыт доступ к бронированию станков!" 
        : "Поздравляем! Ваша заявка на Резидентство одобрена. У вас теперь полный доступ.";

      // 3. Отправляем уведомление
      await supabase.from("notifications").insert({
        user_id: request.user_id,
        title,
        message,
        type: "system"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] }); // <--- ДОБАВЬ ЭТУ СТРОЧКУ
      toast.success("Заявка обработана!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ошибка при одобрении заявки");
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (request: AccessRequest) => {
      // 1. Отклоняем заявку
      const { error } = await (supabase as any)
        .from("access_requests")
        .update({ status: "rejected" })
        .eq("id", request.id);

      if (error) throw error;

      // 2. Генерируем текст уведомления
      const title = "❌ Заявка отклонена";
      const message = request.type === 'safety_briefing' 
        ? "К сожалению, ваша заявка на прохождение ТБ была отклонена администратором." 
        : "Ваша заявка на статус Резидента отклонена.";

      // 3. Отправляем уведомление
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
      setRejectingId(null);
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
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4 mt-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Управление заявками доступа</h1>
          <p className="mt-2 text-slate-600">
            Рассмотрите заявки от студентов на прохождение инструктажа и статус резидента
          </p>
        </div>
        
        <Button 
          variant={showArchive ? "default" : "outline"}
          onClick={() => setShowArchive(!showArchive)}
          className={`h-12 rounded-xl font-bold px-6 shrink-0 ${showArchive ? 'bg-slate-900' : 'bg-white'}`}
        >
          {showArchive ? <><ClipboardList className="mr-2 h-5 w-5" /> Активные заявки</> : <><Archive className="mr-2 h-5 w-5" /> Архив заявок</>}
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : showArchive ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 mb-4">История заявок</h2>
          {archivedRequests.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200 bg-white">
              <CardContent className="p-8 text-center text-slate-500">
                Архив пуст. Вы еще не обработали ни одной заявки.
              </CardContent>
            </Card>
          ) : (
            archivedRequests.map((request) => (
              <Card key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-slate-900">
                          {request.profile?.name || "Студент"}
                        </p>
                        {request.status === 'approved' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Одобрено</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none"><XCircle className="w-3 h-3 mr-1" /> Отклонено</Badge>
                        )}
                      </div>
                      
                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="outline" className={`rounded-md ${request.type === 'safety_briefing' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                          {request.type === 'safety_briefing' ? 'Заявка на ТБ' : 'Резидентство'}
                        </Badge>
                        <span>{formatDate(request.created_at)}</span>
                      </div>

                      {request.description && (
                        <div className="mt-3">
                          <p className="text-sm text-slate-700 line-clamp-2">
                            {request.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Tabs defaultValue="briefing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-lg bg-slate-100 p-1">
            <TabsTrigger value="briefing" className="rounded-md relative">
              Заявки на ТБ
              {briefingRequests.length > 0 && <span className="ml-2 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] w-5 h-5 rounded-full">{briefingRequests.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="residency" className="rounded-md relative">
              Заявки на резидентство
              {residencyRequests.length > 0 && <span className="ml-2 inline-flex items-center justify-center bg-emerald-600 text-white text-[10px] w-5 h-5 rounded-full">{residencyRequests.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="briefing" className="mt-6 space-y-4">
            {briefingRequests.length === 0 ? (
              <Card className="rounded-2xl border border-slate-200 bg-white">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">Нет новых заявок на ТБ</p>
                </CardContent>
              </Card>
            ) : (
              briefingRequests.map((request) => (
                <Card key={request.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-slate-900">{request.profile?.name || "Студент"}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">Заявка на ТБ</Badge>
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => approveRequest.mutate(request)} disabled={approveRequest.isPending} className="rounded-lg bg-green-600 text-white hover:bg-green-700" size="sm">
                          <Check className="mr-1 h-4 w-4" /> Одобрить
                        </Button>
                        <Button onClick={() => rejectRequest.mutate(request)} disabled={rejectRequest.isPending} variant="destructive" className="rounded-lg" size="sm">
                          <X className="mr-1 h-4 w-4" /> Отклонить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="residency" className="mt-6 space-y-4">
            {residencyRequests.length === 0 ? (
              <Card className="rounded-2xl border border-slate-200 bg-white">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">Нет новых заявок на резидентство</p>
                </CardContent>
              </Card>
            ) : (
              residencyRequests.map((request) => (
                <Card key={request.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-slate-900">{request.profile?.name || "Студент"}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">Резидентство</Badge>
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm font-medium text-slate-900">О проекте:</p>
                          <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{request.description || "Описание не указано"}</p>
                        </div>
                        {request.cv_url && (
                          <div className="mt-4">
                            <a href={request.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                              <ExternalLink className="h-4 w-4" /> Открыть CV
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 sm:flex-col">
                        <Button onClick={() => approveRequest.mutate(request)} disabled={approveRequest.isPending} className="rounded-lg bg-green-600 text-white hover:bg-green-700" size="sm">
                          <Check className="mr-1 h-4 w-4" /> Одобрить
                        </Button>
                        <Button onClick={() => rejectRequest.mutate(request)} disabled={rejectRequest.isPending} variant="destructive" className="rounded-lg" size="sm">
                          <X className="mr-1 h-4 w-4" /> Отклонить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}