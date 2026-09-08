import { useTranslation } from "react-i18next";
import { Clock4, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { UserProfile } from "@/lib/auth";

export const STUDENT_EMAIL_DOMAIN = "@stud.satbayev.university";

export function isUniversityEmail(email: string | null | undefined) {
  return !!email && email.trim().toLowerCase().endsWith(STUDENT_EMAIL_DOMAIN);
}

export function ApprovalGate({
  profile,
  children,
}: {
  profile: UserProfile | null | undefined;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const status = profile?.approval_status ?? "approved";

  if (!profile || status === "approved") return <>{children}</>;

  const rejected = status === "rejected";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border-4 border-slate-900 shadow-[10px_10px_0_#0f172a]">
        <div className="bg-slate-900 text-white p-5 flex items-center gap-3 border-b-4 border-slate-900">
          {rejected ? <ShieldAlert className="h-6 w-6 text-rose-400" /> : <Clock4 className="h-6 w-6 text-amber-400" />}
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">
            {rejected ? t("approval.rejectedTitle") : t("approval.pendingTitle")}
          </h1>
        </div>
        <div className="p-6 md:p-8 space-y-5">
          <p className="text-sm font-medium text-slate-700">
            {rejected ? t("approval.rejectedDesc") : t("approval.pendingDesc")}
          </p>
          {!rejected && (
            <div className="border-l-4 border-blue-600 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t("approval.hint")}</p>
            </div>
          )}
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white border-4 border-slate-900 px-6 py-6 font-black text-xs tracking-widest uppercase shadow-[4px_4px_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("approval.logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
