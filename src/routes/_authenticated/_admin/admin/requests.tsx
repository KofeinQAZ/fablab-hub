import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, ExternalLink, X } from "lucide-react";
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

  // Загрузка заявок со статусом pending
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("access_requests")
        .select(
          "id,user_id,type,status,description,cv_url,created_at,profile:profiles!access_requests_user_id_fkey(name)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as AccessRequest[]) || [];
    },
  });

  // Мутация для одобрения заявки
  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const result = await approveAccessRequest({ data: { requestId } });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      toast.success("Заявка успешно одобрена!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ошибка при одобрении заявки");
    },
  });

  // Мутация для отклонения заявки
  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await (supabase as any)
        .from("access_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      toast.success("Заявка отклонена");
      setRejectingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ошибка при отклонении заявки");
    },
  });

  const briefingRequests = requests.filter((r) => r.type === "safety_briefing");
  const residencyRequests = requests.filter((r) => r.type === "residency");

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
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Управление заявками доступа</h1>
        <p className="mt-2 text-slate-600">
          Рассмотрите заявки от студентов на прохождение инструктажа и статус резидента
        </p>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <Tabs defaultValue="briefing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-lg bg-slate-100 p-1">
            <TabsTrigger value="briefing" className="rounded-md">
              Заявки на ТБ ({briefingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="residency" className="rounded-md">
              Заявки на резидентство ({residencyRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Заявки на ТБ */}
          <TabsContent value="briefing" className="mt-6 space-y-4">
            {briefingRequests.length === 0 ? (
              <Card className="rounded-2xl border border-slate-200 bg-white">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">Нет заявок на ТБ</p>
                </CardContent>
              </Card>
            ) : (
              briefingRequests.map((request) => (
                <Card
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-slate-900">
                          {request.profile?.name || "Студент"}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">
                            Заявка на ТБ
                          </Badge>
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => approveRequest.mutate(request.id)}
                          disabled={approveRequest.isPending}
                          className="rounded-lg bg-green-600 text-white hover:bg-green-700"
                          size="sm"
                        >
                          <Check className="mr-1 h-4 w-4" />
                          {approveRequest.isPending ? "..." : "Одобрить"}
                        </Button>
                        <Button
                          onClick={() => rejectRequest.mutate(request.id)}
                          disabled={rejectRequest.isPending}
                          variant="destructive"
                          className="rounded-lg"
                          size="sm"
                        >
                          <X className="mr-1 h-4 w-4" />
                          {rejectRequest.isPending ? "..." : "Отклонить"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Заявки на резидентство */}
          <TabsContent value="residency" className="mt-6 space-y-4">
            {residencyRequests.length === 0 ? (
              <Card className="rounded-2xl border border-slate-200 bg-white">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500">Нет заявок на резидентство</p>
                </CardContent>
              </Card>
            ) : (
              residencyRequests.map((request) => (
                <Card
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-slate-900">
                          {request.profile?.name || "Студент"}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">
                            Резидентство
                          </Badge>
                          <span>{formatDate(request.created_at)}</span>
                        </div>

                        <div className="mt-4">
                          <p className="text-sm font-medium text-slate-900">О проекте:</p>
                          <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {request.description || "Описание не указано"}
                          </p>
                        </div>

                        {request.cv_url && (
                          <div className="mt-4">
                            <a
                              href={request.cv_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Открыть CV
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 sm:flex-col">
                        <Button
                          onClick={() => approveRequest.mutate(request.id)}
                          disabled={approveRequest.isPending}
                          className="rounded-lg bg-green-600 text-white hover:bg-green-700"
                          size="sm"
                        >
                          <Check className="mr-1 h-4 w-4" />
                          {approveRequest.isPending ? "..." : "Одобрить"}
                        </Button>
                        <Button
                          onClick={() => rejectRequest.mutate(request.id)}
                          disabled={rejectRequest.isPending}
                          variant="destructive"
                          className="rounded-lg"
                          size="sm"
                        >
                          <X className="mr-1 h-4 w-4" />
                          {rejectRequest.isPending ? "..." : "Отклонить"}
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
