import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Package, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type InventoryItem = {
  id: string;
  name: string;
  name_kz?: string | null;
  name_en?: string | null;
  description?: string | null;
  description_kz?: string | null;
  description_en?: string | null;
  inventory_number: string;
  image_url?: string | null;
  status: "available" | "checked_out" | "maintenance";
  holder_id?: string | null;
  checked_out_at?: string | null;
  [key: string]: any;
};

const getLocalized = (obj: any, field: string, lang: string) => {
  if (!obj) return "";
  if (lang === "ru") return obj[field] || "";
  return obj[`${field}_${lang}`] || obj[field] || "";
};

export function translateInventoryError(message: string, t: any) {
  const raw = (message || "").toLowerCase();
  if (raw.includes("already yours")) return t("inventory.errors.alreadyYours", "Этот предмет уже закреплён за вами");
  if (raw.includes("already checked out")) return t("inventory.errors.taken", "Предмет уже на руках у другого пользователя");
  if (raw.includes("maintenance")) return t("inventory.errors.maintenance", "Предмет на обслуживании");
  if (raw.includes("not approved")) return t("inventory.errors.notApproved", "Ваш аккаунт ещё не одобрен администратором");
  if (raw.includes("banned")) return t("inventory.errors.banned", "Ваш аккаунт заблокирован");
  if (raw.includes("not your item")) return t("inventory.errors.notYours", "Этот предмет закреплён не за вами");
  if (raw.includes("not authenticated")) return t("inventory.errors.auth", "Войдите в аккаунт");
  return message;
}

export function InventoryItemDialog({
  open,
  item,
  userId,
  onClose,
}: {
  open: boolean;
  item: InventoryItem | null;
  userId: string | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  const isMine = !!item && item.status === "checked_out" && item.holder_id === userId;
  const canTake = !!item && item.status === "available";

  const action = useMutation({
    mutationFn: async (kind: "take" | "return") => {
      if (!item) return;
      const fn = kind === "take" ? "checkout_inventory_item" : "return_inventory_item";
      const { error } = await (supabase as any).rpc(fn, { _item_id: item.id });
      if (error) throw new Error(translateInventoryError(error.message, t));
    },
    onSuccess: (_d, kind) => {
      toast.success(
        kind === "take"
          ? t("inventory.toast.taken", "Готово! Предмет закреплён за вами")
          : t("inventory.toast.returned", "Спасибо! Предмет возвращён на склад"),
      );
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!item) return null;

  const name = getLocalized(item, "name", i18n.language);
  const description = getLocalized(item, "description", i18n.language);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-xl p-0 border-4 border-slate-900 bg-white rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col max-h-[90vh] outline-none [&>button]:hidden">
        <div className="p-6 border-b-4 border-slate-900 bg-emerald-400 text-slate-900 flex justify-between items-start gap-4">
          <div>
            <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-tight">{name}</DialogTitle>
            <p className="font-bold uppercase tracking-widest text-[10px] mt-2">#{item.inventory_number}</p>
          </div>
          <button onClick={onClose} className="p-1.5 bg-white text-slate-900 border-2 border-slate-900 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0_#0f172a] shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 bg-slate-50">
          <div className="border-4 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a] h-56 flex items-center justify-center overflow-hidden">
            {item.image_url ? (
              <img src={item.image_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-16 w-16 text-slate-300" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-black uppercase tracking-widest text-[10px] border-2 border-slate-900 px-2 py-1 shadow-[2px_2px_0_#0f172a] ${
                item.status === "available"
                  ? "bg-emerald-400 text-slate-900"
                  : item.status === "checked_out"
                    ? "bg-amber-400 text-slate-900"
                    : "bg-rose-500 text-white"
              }`}
            >
              {item.status === "available"
                ? t("inventory.status.available", "На складе")
                : item.status === "checked_out"
                  ? t("inventory.status.checkedOut", "На руках")
                  : t("inventory.status.maintenance", "Обслуживание")}
            </span>
            {isMine && (
              <span className="font-black uppercase tracking-widest text-[10px] border-2 border-slate-900 px-2 py-1 bg-blue-600 text-white shadow-[2px_2px_0_#0f172a] flex items-center gap-1">
                <User className="h-3 w-3" /> {t("inventory.status.mine", "Закреплён за вами")}
              </span>
            )}
          </div>

          {description && (
            <div className="space-y-2">
              <div className="font-black uppercase tracking-widest text-xs text-slate-900 border-b-2 border-slate-200 pb-2">
                {t("inventory.descriptionTitle", "Описание")}
              </div>
              <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">{description}</p>
            </div>
          )}

          <div className="pt-2">
            {isMine ? (
              <Button
                onClick={() => action.mutate("return")}
                disabled={action.isPending}
                className="w-full h-16 rounded-none text-sm font-black uppercase tracking-widest border-4 border-slate-900 bg-slate-900 hover:bg-slate-800 text-white shadow-[6px_6px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all"
              >
                {t("inventory.btn.return", "Вернуть на склад")}
              </Button>
            ) : (
              <Button
                onClick={() => action.mutate("take")}
                disabled={!canTake || action.isPending}
                className="w-full h-16 rounded-none text-sm font-black uppercase tracking-widest border-4 border-slate-900 bg-emerald-500 hover:bg-emerald-600 text-white shadow-[6px_6px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all disabled:bg-slate-300 disabled:border-slate-400 disabled:shadow-none disabled:text-slate-500"
              >
                {canTake
                  ? t("inventory.btn.take", "Взять себе")
                  : item.status === "checked_out"
                    ? t("inventory.errors.taken", "Предмет уже на руках у другого пользователя")
                    : t("inventory.status.maintenance", "Обслуживание")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
