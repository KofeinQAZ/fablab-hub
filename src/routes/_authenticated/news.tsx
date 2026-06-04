import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { X, Calendar, User, Wrench, ArrowRight, Search, FileText, Zap, Newspaper, Heading, Type, Image as ImageIcon, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/news")({
  component: NewsFeedPage,
});

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Универсальный хелпер для извлечения локализованного текста с фоллбэком на RU
const getLocalized = (obj: any, field: string, lang: string) => {
  if (!obj) return '';
  if (lang === 'ru') return obj[field] || '';
  return obj[`${field}_${lang}`] || obj[field] || '';
};

function NewsFeedPage() {
  const { t, i18n } = useTranslation();
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  
  const [filter, setFilter] = useState<'all' | 'news' | 'article'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Определяем локаль для дат в зависимости от языка
  const dateLocale = i18n.language === 'kz' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU';

  const { data: profile } = useQuery({
    queryKey: ["header-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["public-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, profiles:author_id (name)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: equipmentList = [] } = useQuery({
    queryKey: ["equipment-list-public"],
    queryFn: async () => {
      const { data } = await supabase.from("equipment").select("id, name, name_kz, name_en");
      return data || [];
    },
  });

  const filteredArticles = articles.filter((article) => {
    const matchesFilter = filter === 'all' || article.category === filter;
    
    // Поиск по локализованным полям
    const searchLower = searchQuery.toLowerCase();
    const title = getLocalized(article, 'title', i18n.language).toLowerCase();
    const excerpt = getLocalized(article, 'excerpt', i18n.language).toLowerCase();
    
    const matchesSearch = title.includes(searchLower) || excerpt.includes(searchLower);
    
    return matchesFilter && matchesSearch;
  });

  let blocks = [];
  if (selectedArticle) {
    const localizedContent = getLocalized(selectedArticle, 'content', i18n.language);
    try {
      blocks = JSON.parse(localizedContent);
      if (!Array.isArray(blocks)) throw new Error("Not array");
    } catch (e) {
      blocks = [{ id: '1', type: 'paragraph', content: localizedContent }];
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-blue-600 selection:text-white">
      <AppHeader profile={profile} />

      {isLoading ? (
        <div className="p-20 text-center font-black uppercase tracking-widest text-xs text-slate-400 animate-pulse">{t('news.loading')}</div>
      ) : (
        <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-500 pb-24">
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b-4 border-slate-900">
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter">{t('news.header.title')}</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm">{t('news.header.subtitle')}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder={t('news.search.placeholder')}
                  className="pl-12 h-14 border-4 border-slate-900 rounded-none font-bold uppercase focus-visible:ring-0 focus-visible:border-blue-600 shadow-[4px_4px_0_#0f172a]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0 h-auto sm:h-14">
                <button 
                  onClick={() => setFilter('all')}
                  className={`flex-1 sm:flex-none px-6 py-3 sm:py-0 border-4 border-slate-900 font-black uppercase tracking-widest text-xs transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}
                >
                  {t('news.tabs.all')}
                </button>
                <button 
                  onClick={() => setFilter('news')}
                  className={`flex-1 sm:flex-none px-6 py-3 sm:py-0 border-4 border-slate-900 font-black uppercase tracking-widest text-xs transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none flex items-center justify-center gap-2 ${filter === 'news' ? 'bg-blue-600 text-white' : 'bg-white text-slate-900'}`}
                >
                  <Zap className="h-4 w-4" /> {t('news.tabs.news')}
                </button>
                <button 
                  onClick={() => setFilter('article')}
                  className={`flex-1 sm:flex-none px-6 py-3 sm:py-0 border-4 border-slate-900 font-black uppercase tracking-widest text-xs transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none flex items-center justify-center gap-2 ${filter === 'article' ? 'bg-amber-400 text-slate-900' : 'bg-white text-slate-900'}`}
                >
                  <FileText className="h-4 w-4" /> {t('news.tabs.guides')}
                </button>
              </div>
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-20 bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
              <Search className="h-10 w-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{t('news.empty.title')}</h3>
              <p className="text-slate-500 mt-2 font-medium">{t('news.empty.desc')}</p>
              <button onClick={() => { setFilter('all'); setSearchQuery(''); }} className="mt-4 text-blue-600 font-bold uppercase tracking-widest text-xs hover:underline">
                {t('news.empty.resetBtn')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((article, index) => {
                const isFeatured = index === 0 && filter === 'all' && searchQuery === '';
                
                // Получаем локализованные данные для карточки
                const localizedTitle = getLocalized(article, 'title', i18n.language);
                const localizedExcerpt = getLocalized(article, 'excerpt', i18n.language);

                return (
                  <Card 
                    key={article.id} 
                    onClick={() => setSelectedArticle(article)}
                    className={`cursor-pointer border-4 border-slate-900 rounded-none bg-white overflow-hidden flex flex-col hover:-translate-y-2 hover:-translate-x-2 transition-all duration-300 group relative ${
                      isFeatured ? "md:col-span-2 lg:col-span-2 row-span-2 shadow-[8px_8px_0_#2563eb] hover:shadow-[14px_14px_0_#2563eb]" : "shadow-[6px_6px_0_#0f172a] hover:shadow-[12px_12px_0_#005BAB]"
                    }`}
                  >
                    <div className={`relative w-full bg-slate-900 overflow-hidden shrink-0 border-b-4 border-slate-900 ${isFeatured ? "h-72 md:h-[450px]" : "h-56"}`}>
                      {article.image_url ? (
                        <img src={article.image_url} alt={localizedTitle} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-black text-2xl uppercase tracking-widest">FABLAB</div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="bg-white border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#0f172a]">
                          {article.category === 'news' ? t('news.badge.news') : t('news.badge.article')}
                        </span>
                      </div>
                    </div>
                    
                    <CardContent className="p-6 md:p-8 flex flex-col flex-1 justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <h2 className={`font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 ${isFeatured ? "text-3xl md:text-5xl" : "text-xl md:text-2xl"}`}>
                          {localizedTitle}
                        </h2>
                        <p className={`text-slate-600 font-medium leading-relaxed line-clamp-3 ${isFeatured ? "text-lg" : "text-sm"}`}>
                          {localizedExcerpt}
                        </p>
                      </div>
                      
                      <div className="pt-4 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t-2 border-slate-100">
                        <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2 py-1"><User className="h-3 w-3 text-blue-600" /> {article.profiles?.name || 'FabLab'}</span>
                        <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2 py-1"><Calendar className="h-3 w-3 text-amber-600" /> {new Date(article.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      )}

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl p-0 bg-slate-50 border-4 border-slate-900 rounded-none shadow-[12px_12px_0_#0f172a] flex flex-col h-[85vh] max-h-[85vh] outline-none z-50">
          
          <DialogTitle className="sr-only">{t('news.dialog.srTitle')}</DialogTitle>

          <button onClick={() => setSelectedArticle(null)} className="absolute top-4 right-4 p-2 bg-white border-4 border-slate-900 shadow-[4px_4px_0_#0f172a] text-slate-900 hover:bg-red-500 hover:text-white transition-colors z-[60]">
            <X className="h-6 w-6" />
          </button>

          <div className="flex-1 overflow-y-auto w-full">
            
            <div className="relative w-full h-64 md:h-[350px] shrink-0 bg-slate-900 border-b-4 border-slate-900">
              {selectedArticle?.image_url ? (
                <img src={selectedArticle.image_url} className="w-full h-full object-cover opacity-70" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-200"><Newspaper className="h-20 w-20 text-slate-400" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              <div className="absolute bottom-6 left-6 md:left-10 md:bottom-10 pr-16">
                <span className="inline-block bg-white border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#0f172a] mb-4">
                  {selectedArticle?.category === 'news' ? t('news.badge.news') : t('news.badge.article')}
                </span>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-tight">
                  {getLocalized(selectedArticle, 'title', i18n.language)}
                </h2>
              </div>
            </div>

            <div className="p-6 md:p-10 space-y-8 max-w-3xl mx-auto">
              
              <div className="flex items-center gap-4 pb-6 border-b-4 border-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-2 bg-slate-200 px-3 py-1 border-2 border-slate-300"><User className="h-4 w-4" /> {selectedArticle?.profiles?.name || t('news.article.adminAuthor')}</span>
                <span className="flex items-center gap-2 bg-slate-200 px-3 py-1 border-2 border-slate-300"><Calendar className="h-4 w-4" /> {selectedArticle && new Date(selectedArticle.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>

              {getLocalized(selectedArticle, 'excerpt', i18n.language) && (
                <div className="bg-white border-4 border-slate-900 p-6 shadow-[6px_6px_0_#0f172a] italic font-medium text-lg text-slate-600 border-l-[12px] border-l-blue-600">
                  {getLocalized(selectedArticle, 'excerpt', i18n.language)}
                </div>
              )}
              
              <div className="space-y-6">
                {blocks.map((block: any) => {
                  switch(block.type) {
                    case 'heading': return <h3 key={block.id} className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 mt-10 mb-4">{block.content}</h3>;
                    case 'paragraph': return <p key={block.id} className="text-lg text-slate-700 leading-relaxed font-medium mb-6 whitespace-pre-wrap">{block.content}</p>;
                    case 'image': return <div key={block.id} className="border-4 border-slate-900 bg-white p-2 shadow-[4px_4px_0_#0f172a] my-8"><img src={block.content} className="w-full h-auto object-cover" alt="" /></div>;
                    case 'youtube': {
                      const yId = getYouTubeId(block.content);
                      if (!yId) return <p key={block.id} className="text-red-500 text-xs font-bold uppercase tracking-widest">{t('news.article.youtubeError')}</p>;
                      return (
                        <div key={block.id} className="aspect-video w-full border-4 border-slate-900 shadow-[6px_6px_0_#0f172a] my-8 bg-slate-900">
                          <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yId}`} allowFullScreen />
                        </div>
                      );
                    }
                    case 'equipment': {
                      const eq = equipmentList.find((e: any) => e.id === block.content);
                      const localizedEqName = getLocalized(eq, 'name', i18n.language);
                      return (
                        <div key={block.id} className="bg-blue-50 border-4 border-slate-900 p-6 my-8 shadow-[6px_6px_0_#0f172a] flex flex-col md:flex-row gap-4 items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-white border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0_#0f172a]"><Wrench className="h-6 w-6 text-blue-600" /></div>
                            <div>
                              <h4 className="font-black text-slate-900 uppercase tracking-tight text-base">{localizedEqName || t('news.article.equipDefaultName')}</h4>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{t('news.article.equipAvailable')}</p>
                            </div>
                          </div>
                          <Link to="/booking" className="w-full md:w-auto">
                            <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white border-2 border-slate-900 font-bold uppercase tracking-widest text-xs px-6 py-3 shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all">
                              {t('news.article.bookBtn')} <ArrowRight className="h-4 w-4 inline ml-2" />
                            </button>
                          </Link>
                        </div>
                      );
                    }
                    default: return null;
                  }
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}