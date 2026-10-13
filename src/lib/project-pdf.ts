import { supabase } from "@/integrations/supabase/client";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const loc = (o: any, f: string, lang: string) => (lang === "ru" ? o?.[f] : o?.[`${f}_${lang}`] || o?.[f]) || "";

const STATUS: Record<string, string> = { in_progress: "В работе", completed: "Завершён", paused: "На паузе" };

/** Opens a print-ready project passport; the browser's "Save as PDF" produces the file. */
export async function exportProjectPdf(projectId: string, lang = "ru") {
  const win = window.open("", "_blank");
  if (!win) throw new Error("Разрешите всплывающие окна для экспорта PDF");
  win.document.write("<p style='font-family:sans-serif;padding:40px'>Готовим PDF…</p>");

  const { data: p, error } = await supabase
    .from("projects")
    .select(`*, profiles:public_profiles!projects_author_id_fkey (name),
      clubs (title, title_kz, title_en),
      project_members (role, profiles:public_profiles!project_members_user_id_fkey (name)),
      project_updates (id, title, content, created_at, image_urls, is_achievement)`)
    .eq("id", projectId)
    .single();
  if (error || !p) { win.close(); throw error ?? new Error("Проект не найден"); }
  const proj: any = p;
  const updates = [...(proj.project_updates ?? [])].sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const fmt = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const title = loc(proj, "title", lang);
  const team = [proj.profiles?.name ? `${proj.profiles.name} (автор)` : "", ...(proj.project_members ?? []).map((m: any) => m.profiles?.name + (m.role ? ` (${m.role})` : ""))].filter(Boolean);
  const achievements = updates.filter((u: any) => u.is_achievement).length;

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)} — FabLab Satbayev</title>
<style>
@page{size:A4;margin:16mm}
*{box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#0f172a;margin:0;font-size:11pt;line-height:1.5}
.brand{display:flex;justify-content:space-between;border-bottom:4px solid #0f172a;padding-bottom:8px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:9pt}
.brand b{color:#2563eb}
h1{font-size:30pt;line-height:1.05;text-transform:uppercase;margin:18px 0 8px;letter-spacing:-.02em}
.cover{width:100%;max-height:90mm;object-fit:cover;border:3px solid #0f172a;margin:10px 0}
.meta{display:grid;grid-template-columns:repeat(4,1fr);border:3px solid #0f172a;margin:12px 0}
.meta div{padding:8px 10px;border-right:2px solid #0f172a}.meta div:last-child{border:0}
.meta small{display:block;font-size:7pt;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#64748b}
.meta strong{font-size:11pt}
h2{font-size:14pt;text-transform:uppercase;border-left:8px solid #2563eb;padding-left:10px;margin:22px 0 10px}
.desc{white-space:pre-wrap}
.entry{border:2px solid #0f172a;padding:12px 14px;margin:0 0 12px;break-inside:avoid;box-shadow:4px 4px 0 #0f172a}
.entry.ach{background:#fffbeb;border-color:#f59e0b}
.date{font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#64748b}
.entry h3{margin:2px 0 6px;font-size:12pt}
.tag{background:#f59e0b;color:#0f172a;font-size:7pt;font-weight:900;padding:2px 6px;text-transform:uppercase;margin-left:6px}
.imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
.imgs img{width:100%;height:38mm;object-fit:cover;border:2px solid #0f172a}
.foot{margin-top:24px;border-top:2px solid #0f172a;padding-top:6px;font-size:8pt;color:#64748b;display:flex;justify-content:space-between}
.bar{position:fixed;top:0;left:0;right:0;background:#2563eb;color:#fff;padding:10px;text-align:center;font-weight:800}
.bar button{margin-left:12px;font-weight:900;padding:6px 14px;border:2px solid #0f172a;background:#fff;cursor:pointer}
@media print{.bar{display:none}} @media screen{body{max-width:210mm;margin:60px auto;padding:0 16px}}
</style></head><body>
<div class="bar">Выберите «Сохранить как PDF» в окне печати<button onclick="print()">Скачать PDF</button></div>
<div class="brand"><span>FabLab <b>Satbayev</b> · Паспорт проекта</span><span>${esc(proj.clubs ? loc(proj.clubs, "title", lang) : "")}</span></div>
<h1>${esc(title)}</h1>
${proj.image_url ? `<img class="cover" src="${esc(proj.image_url)}">` : ""}
<div class="meta">
<div><small>Статус</small><strong>${esc(STATUS[proj.status] ?? proj.status)}</strong></div>
<div><small>Старт</small><strong>${esc(fmt(proj.created_at))}</strong></div>
<div><small>Записей девлога</small><strong>${updates.length}</strong></div>
<div><small>Достижений</small><strong>${achievements}</strong></div>
</div>
<h2>О проекте</h2><div class="desc">${esc(loc(proj, "description", lang))}</div>
${team.length ? `<h2>Команда</h2><div>${team.map(esc).join(" · ")}</div>` : ""}
<h2>Девлог</h2>
${updates.length ? updates.map((u: any) => `<div class="entry${u.is_achievement ? " ach" : ""}">
<div class="date">${esc(fmt(u.created_at))}${u.is_achievement ? '<span class="tag">Достижение</span>' : ""}</div>
${u.title ? `<h3>${esc(u.title)}</h3>` : ""}<div class="desc">${esc(u.content)}</div>
${u.image_urls?.length ? `<div class="imgs">${u.image_urls.map((s: string) => `<img src="${esc(s)}">`).join("")}</div>` : ""}
</div>`).join("") : "<p>Записей пока нет.</p>"}
<div class="foot"><span>fablab · Satbayev University</span><span>Сформировано ${esc(fmt(new Date().toISOString()))}</span></div>
<script>window.onload=()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r}))).then(()=>setTimeout(()=>print(),300))}</script>
</body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
