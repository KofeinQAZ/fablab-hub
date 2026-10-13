import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InventoryItemDialog, type InventoryItem } from "@/components/inventory-item-dialog";
import type { UserProfile } from "@/lib/auth";

const getLocalized = (obj: any, field: string, lang: string) => {
  if (!obj) return "";
  if (lang === "ru") return obj[field] || "";
  return obj[`${field}_${lang}`] || obj[field] || "";
};

export function InventorySection({ userId, profile, active }: { userId: string | null; profile?: UserProfile | null; active: boolean }) {
  const { t, i18n } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
  });

  // Deep-link из QR: /booking?inventoryId=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("inventoryId");
    if (id) {
      setSelectedId(id);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  if (!active) {
    return (
      <InventoryItemDialog open={!!selected} item={selected} userId={userId} profile={profile} onClose={() => setSelectedId(null)} />
    );
  }

  return (
    <>
      <div className="border-4 border-foreground bg-muted p-5 flex items-center gap-3 shadow-[6px_6px_0_var(--foreground)]">
        <QrCode className="h-8 w-8 shrink-0 text-foreground" />
        <p className="font-black uppercase tracking-normal text-sm text-foreground leading-relaxed">
          {t("inventory.hint", "Отсканируйте QR-код на инструменте камерой телефона — откроется его карточка, где можно закрепить предмет за собой.")}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 border-4 border-foreground bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border-4 border-dashed border-border p-12 text-center font-black uppercase tracking-normal text-muted-foreground text-xs">
          {t("inventory.empty", "Инвентарь пока пуст")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => {
            const name = getLocalized(item, "name", i18n.language);
            const isMine = item.status === "checked_out" && item.holder_id === userId;
            return (
              <Card
                key={item.id}
                className="border-2 border-foreground rounded-none bg-card shadow-[6px_6px_0_var(--foreground)] hover:shadow-[12px_12px_0_var(--primary)] hover:-translate-y-0.5 motion-reduce:transform-none transition-all duration-300 flex flex-col overflow-hidden"
              >
                <div onClick={() => setSelectedId(item.id)} className="h-44 bg-muted border-b-4 border-foreground relative cursor-pointer flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-14 w-14 text-muted-foreground" />
                  )}
                  <span
                    className={`absolute top-3 right-3 font-black uppercase tracking-normal text-xs border-2 border-foreground px-2 py-1 shadow-[2px_2px_0_var(--foreground)] ${
                      item.status === "available"
                        ? "bg-accent text-foreground"
                        : item.status === "checked_out"
                          ? "bg-zone-yellow text-foreground"
                          : "bg-destructive text-primary-foreground"
                    }`}
                  >
                    {item.status === "available"
                      ? t("inventory.status.available", "На складе")
                      : item.status === "checked_out"
                        ? t("inventory.status.checkedOut", "На руках")
                        : t("inventory.status.maintenance", "Обслуживание")}
                  </span>
                </div>
                <CardContent className="p-6 flex flex-col flex-1 justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="font-black text-xl text-foreground uppercase tracking-normal leading-tight line-clamp-2">{name}</h3>
                    <p className="text-xs font-bold uppercase tracking-normal text-muted-foreground">#{item.inventory_number}</p>
                    {isMine && (
                      <p className="text-xs font-black uppercase tracking-normal text-primary">
                        {t("inventory.status.mine", "Закреплён за вами")}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => setSelectedId(item.id)}
                    className="w-full h-14 rounded-none border-2 border-foreground bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-normal text-xs shadow-[4px_4px_0_var(--foreground)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
                  >
                    {isMine ? t("inventory.btn.return", "Вернуть на склад") : t("inventory.btn.open", "Открыть карточку")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InventoryItemDialog open={!!selected} item={selected} userId={userId} profile={profile} onClose={() => setSelectedId(null)} />
    </>
  );
}
