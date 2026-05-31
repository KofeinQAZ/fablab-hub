import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Calendar, User, Wrench, ArrowRight, Search, FileText, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/news")({
  component: NewsFeedPage,
});

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function NewsFeedPage() {
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  
  // Состояния для фильтров и поиска
  const [filter, setFilter] = useState<'all' | 'news' | 'article'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      const { data } = await supabase.from("equipment").select("id, name");
      return data || [];
    },
  });

  // Логика фильтрации и поиска
  const filteredArticles = articles.filter((article) => {
    const matchesFilter = filter === 'all' || article.category === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      article.title.toLowerCase().includes(searchLower) || 
      article.excerpt?.toLowerCase().includes(searchLower);
    
    return matchesFilter && matchesSearch;
  });

  let blocks = [];
  if (selectedArticle) {
    try {
      blocks = JSON.parse(selectedArticle.content);
      if (!Array.isArray(blocks)) throw new Error("Not array");
    } catch (e) {
      blocks = [{ id: '1', type: 'paragraph', content: selectedArticle.content }];
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} />

      {isLoading ? (
        <div className="p-20 text-center text-xl font-bold text-slate-400 animate-pulse">Собираем свежие новости...</div>
      ) : (
        <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-10">
          
          {/* СОВРЕМЕННАЯ ШАПКА */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Журнал Фаблаба</h1>
              <p className="text-slate-500 font-medium">Полезные гайды, анонсы и истории из нашей мастерской.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Поиск */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Поиск по статьям..." 
                  className="pl-9 h-12 rounded-2xl bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Переключатель категорий (Табы) */}
              <div className="flex items-center p-1 bg-slate-200/50 rounded-2xl shrink-0 h-12">
                <button 
                  onClick={() => setFilter('all')}
                  className={`flex-1 sm:flex-none px-4 h-full flex items-center justify-center rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Все
                </button>
                <button 
                  onClick={() => setFilter('news')}
                  className={`flex-1 sm:flex-none px-4 h-full flex items-center gap-2 justify-center rounded-xl text-sm font-bold transition-all ${filter === 'news' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <Zap className="h-4 w-4 text-blue-600" /> Новости
                </button>
                <button 
                  onClick={() => setFilter('article')}
                  className={`flex-1 sm:flex-none px-4 h-full flex items-center gap-2 justify-center rounded-xl text-sm font-bold transition-all ${filter === 'article' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <FileText className="h-4 w-4 text-emerald-600" /> Гайды
                </button>
              </div>
            </div>
          </div>

          {/* ЕСЛИ НИЧЕГО НЕ НАЙДЕНО */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <Search className="h-10 w-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Ничего не найдено</h3>
              <p className="text-slate-500 mt-2">Попробуйте изменить запрос или сбросить фильтры.</p>
              <button onClick={() => { setFilter('all'); setSearchQuery(''); }} className="mt-4 text-blue-600 font-bold hover:underline">
                Сбросить поиск
              </button>
            </div>
          ) : (
            /* СЕТКА КАРТОЧЕК */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredArticles.map((article, index) => {
                const isFeatured = index === 0 && filter === 'all' && searchQuery === '';

                return (
                  <Card 
                    key={article.id} 
                    onClick={() => setSelectedArticle(article)}
                    className={`group overflow-hidden rounded-[32px] border-none shadow-xl shadow-slate-200/50 bg-white transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10 cursor-pointer flex flex-col ${
                      isFeatured ? "md:col-span-2 lg:col-span-2 row-span-2" : ""
                    }`}
                  >
                    <div className={`relative w-full bg-slate-100 overflow-hidden shrink-0 ${isFeatured ? "h-72 md:h-[450px]" : "h-56"}`}>
                      {article.image_url ? (
                        <img src={article.image_url} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 font-black text-2xl">FABLAB</div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <Badge className="bg-white/95 backdrop-blur text-slate-900 border-none shadow-sm uppercase font-black text-[10px] tracking-wider px-3 py-1">
                          {article.category === 'news' ? 'Новость' : 'Статья'}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className={`p-6 md:p-8 flex flex-col flex-1 ${isFeatured ? "space-y-4" : "space-y-3"}`}>
                      <div className="space-y-3 flex-1">
                        <h2 className={`font-black text-slate-900 leading-tight group-hover:text-[#005BAB] transition-colors ${isFeatured ? "text-3xl md:text-5xl" : "text-xl"}`}>
                          {article.title}
                        </h2>
                        <p className={`text-slate-500 line-clamp-3 ${isFeatured ? "text-lg" : "text-sm"}`}>
                          {article.excerpt}
                        </p>
                      </div>
                      <div className="pt-6 mt-4 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {article.profiles?.name || 'FabLab'}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(article.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ОКНО ЧТЕНИЯ СТАТЬИ (Осталось без изменений, так как оно тебе нравится) */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[32px] border-none shadow-2xl h-[90vh] md:h-[85vh] flex flex-col bg-white">
          <div className="relative w-full h-48 md:h-72 shrink-0 bg-slate-100">
            {selectedArticle?.image_url && <img src={selectedArticle.image_url} className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button onClick={() => setSelectedArticle(null)} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition">
              <X className="h-6 w-6" />
            </button>
            <div className="absolute bottom-6 left-6 md:bottom-8 md:left-10 pr-6">
              <Badge className="bg-blue-600 text-white border-none shadow-md uppercase font-black text-[10px] tracking-wider px-3 py-1 mb-3">
                {selectedArticle?.category === 'news' ? 'Новость' : 'Статья'}
              </Badge>
              <DialogTitle className="text-3xl md:text-5xl font-black text-white leading-tight">
                {selectedArticle?.title}
              </DialogTitle>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100 text-sm font-bold text-slate-400">
                <span className="flex items-center gap-2"><User className="h-4 w-4" /> {selectedArticle?.profiles?.name || 'Администрация FabLab'}</span>
                <span>•</span>
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {selectedArticle && new Date(selectedArticle.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="py-4 space-y-6">
                {blocks.map((block: any) => {
                  switch(block.type) {
                    case 'heading': return <h2 key={block.id} className="text-2xl md:text-3xl font-black text-slate-900 mt-8 mb-4">{block.content}</h2>;
                    case 'paragraph': return <p key={block.id} className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">{block.content}</p>;
                    case 'image': return <img key={block.id} src={block.content} className="w-full rounded-2xl shadow-sm my-8" />;
                    case 'youtube': {
                      const yId = getYouTubeId(block.content);
                      if (!yId) return <p key={block.id} className="text-red-500 text-sm">Ошибка: неверная ссылка YouTube</p>;
                      return (
                        <div key={block.id} className="aspect-video w-full rounded-2xl overflow-hidden shadow-md my-8 bg-slate-100">
                          <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yId}`} allowFullScreen />
                        </div>
                      );
                    }
                    case 'equipment': {
                      const eq = equipmentList.find((e: any) => e.id === block.content);
                      return (
                        <div key={block.id} className="bg-blue-50/50 border border-blue-100 rounded-[24px] p-6 my-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Wrench className="h-6 w-6 text-blue-600" /></div>
                            <div>
                              <h4 className="font-black text-slate-900">{eq?.name || 'Оборудование'}</h4>
                              <p className="text-sm text-slate-500 mt-1">Доступно для бронирования в мастерской</p>
                            </div>
                          </div>
                          <Link to="/booking" className="w-full md:w-auto">
                            <button className="w-full md:w-auto bg-[#005BAB] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors shadow-md shadow-blue-200">
                              Забронировать <ArrowRight className="h-4 w-4" />
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