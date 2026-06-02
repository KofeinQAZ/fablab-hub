import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, Trash2, ArrowUp, ArrowDown, Type, Image as ImageIcon, 
  Youtube, Wrench, GripVertical, Heading, Pencil, ArrowLeft, Newspaper 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/admin/news")({
  component: AdminNewsPage,
});

type BlockType = 'paragraph' | 'heading' | 'image' | 'youtube' | 'equipment';

interface Block {
  id: string;
  type: BlockType;
  content: string;
}

function AdminNewsPage() {
  const qc = useQueryClient();
  
  // Управление экранами: 'list' (список) или 'editor' (редактор)
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Состояния редактора
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("news");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>("paragraph");

  // --- ЗАГРУЗКА ДАННЫХ ---
  const { data: equipmentList = [] } = useQuery({
    queryKey: ["equipment-list-for-news"],
    queryFn: async () => {
      const { data } = await supabase.from("equipment").select("id, name");
      return data || [];
    },
  });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // --- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ ---
  const openCreateNew = () => {
    setEditingId(null);
    setTitle(""); setExcerpt(""); setImageUrl(""); setCategory("news"); setBlocks([]);
    setView('editor');
  };

  const openEdit = (article: any) => {
    setEditingId(article.id);
    setTitle(article.title);
    setExcerpt(article.excerpt);
    setImageUrl(article.image_url || "");
    setCategory(article.category);
    
    // Умная парсилка старых текстов
    try {
      const parsed = JSON.parse(article.content);
      setBlocks(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      // Если это старая статья (просто текст), превращаем ее в блок-параграф
      setBlocks([{ id: 'legacy-1', type: 'paragraph', content: article.content }]);
    }
    setView('editor');
  };

  const closeEditor = () => {
    setView('list');
  };

  // --- ЛОГИКА РЕДАКТОРА ---
  const addBlock = () => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedBlockType,
      content: selectedBlockType === 'equipment' && equipmentList.length > 0 ? equipmentList[0].id : ""
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, newContent: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content: newContent } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const saveArticle = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const contentJson = JSON.stringify(blocks);
      const payload = { title, excerpt, content: contentJson, image_url: imageUrl, category, is_published: true };

      if (editingId) {
        const { error } = await supabase.from("articles").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert({ ...payload, author_id: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Успешно обновлено!" : "Опубликовано!");
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      closeEditor();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Статья удалена");
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
    },
  });

  const getBlockIcon = (type: BlockType) => {
    switch(type) {
      case 'heading': return <Heading className="h-4 w-4" />;
      case 'paragraph': return <Type className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'equipment': return <Wrench className="h-4 w-4 text-blue-600" />;
    }
  };

  // ============================================================================
  // ЭКРАН 1: СПИСОК СТАТЕЙ
  // ============================================================================
  if (view === 'list') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-12 p-2">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b-4 border-slate-900 pb-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Медиа</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Управление новостями и статьями</p>
          </div>
          <Button 
            onClick={openCreateNew} 
            className="bg-blue-600 hover:bg-blue-700 text-white border-4 border-slate-900 px-6 py-6 font-black text-xs tracking-widest uppercase transition-all shadow-[4px_4px_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none"
          >
            <Plus className="mr-2 h-4 w-4" /> Создать пост
          </Button>
        </div>

        {/* LIST */}
        <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
          {isLoading ? (
            <div className="p-6">
              <div className="h-24 bg-slate-200 animate-pulse w-full" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 bg-slate-50">
              <p className="font-bold uppercase tracking-widest text-xs text-slate-400">Публикаций пока нет</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {articles.map((article) => (
                <div key={article.id} className="flex flex-col sm:flex-row items-stretch sm:items-center border-b-4 border-slate-900 last:border-b-0 p-4 sm:p-6 gap-4 hover:bg-slate-50 transition-colors">
                  
                  {/* Image */}
                  <div className="h-24 w-36 shrink-0 border-2 border-slate-900 bg-slate-200 overflow-hidden relative">
                    {article.image_url ? (
                      <img src={article.image_url} className="h-full w-full object-cover" alt="cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400"><ImageIcon className="h-8 w-8" /></div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-black text-xl uppercase tracking-tight text-slate-900 truncate mb-2">{article.title}</h3>
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <span className={`px-2 py-1 border-2 border-slate-900 text-white ${article.category === 'news' ? 'bg-amber-500' : 'bg-blue-600'}`}>
                        {article.category === 'news' ? 'Новость' : 'Статья'}
                      </span>
                      <span>•</span>
                      <span>{new Date(article.created_at).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-4 sm:mt-0 sm:self-center">
                    <Button 
                      onClick={() => openEdit(article)}
                      className="bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all px-4"
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Изменить
                    </Button>
                    <Button 
                      onClick={() => { if(confirm("Точно удалить?")) deleteArticle.mutate(article.id); }}
                      className="bg-white hover:bg-red-50 text-red-600 border-2 border-slate-900 font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // ЭКРАН 2: РЕДАКТОР СТАТЬИ
  // ============================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 p-2">
      
      {/* EDITOR HEADER */}
      <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-6">
        <Button 
          onClick={closeEditor} 
          className="bg-white hover:bg-slate-100 text-slate-900 border-4 border-slate-900 h-12 w-12 p-0 shadow-[4px_4px_0_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all rounded-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{editingId ? "Редактор" : "Новый пост"}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Блочный конструктор материала</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ЛЕВАЯ КОЛОНКА (Настройки) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
            <div className="bg-slate-900 text-white p-4 border-b-4 border-slate-900">
              <h2 className="text-lg font-black uppercase tracking-tight">Настройки</h2>
            </div>
            <div className="p-4 md:p-6 space-y-5">
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Заголовок</Label>
                <Input 
                  className="h-12 border-2 border-slate-900 rounded-none bg-slate-50 focus-visible:ring-0 focus-visible:border-blue-600 font-bold" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Тип материала</Label>
                <select 
                  className="w-full h-12 px-4 border-2 border-slate-900 rounded-none bg-slate-50 font-bold text-sm outline-none focus:border-blue-600" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="news">Новость</option>
                  <option value="article">Статья / Гайд</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Кратко (для превью)</Label>
                <Textarea 
                  className="resize-none h-24 border-2 border-slate-900 rounded-none bg-slate-50 focus-visible:ring-0 focus-visible:border-blue-600 font-medium" 
                  value={excerpt} 
                  onChange={(e) => setExcerpt(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Обложка (URL)</Label>
                <Input 
                  className="h-12 border-2 border-slate-900 rounded-none bg-slate-50 focus-visible:ring-0 focus-visible:border-blue-600 font-medium" 
                  placeholder="https://..." 
                  value={imageUrl} 
                  onChange={(e) => setImageUrl(e.target.value)} 
                />
                {imageUrl && (
                  <div className="mt-4 h-40 w-full border-2 border-slate-900 bg-slate-100 overflow-hidden relative">
                    <img src={imageUrl} alt="Превью" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.src = "")} />
                  </div>
                )}
              </div>

            </div>
          </div>

          <Button 
            onClick={() => saveArticle.mutate()} 
            disabled={saveArticle.isPending || !title || blocks.length === 0} 
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white border-4 border-slate-900 h-16 rounded-none text-xl font-black uppercase tracking-widest shadow-[6px_6px_0_#0f172a] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[4px_4px_0_#0f172a] transition-all"
          >
            {saveArticle.isPending ? "Сохранение..." : editingId ? "СОХРАНИТЬ" : "ОПУБЛИКОВАТЬ"}
          </Button>
        </div>

        {/* ПРАВАЯ КОЛОНКА (Контент / Блоки) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_#0f172a]">
            <div className="bg-slate-900 text-white p-4 border-b-4 border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-black uppercase tracking-tight">Содержание</h2>
              
              {/* Добавление блока */}
              <div className="flex gap-2 w-full sm:w-auto">
                <select 
                  className="flex-1 sm:w-48 bg-slate-800 border-2 border-slate-700 text-white rounded-none px-3 py-2 text-xs font-bold uppercase tracking-widest outline-none"
                  value={selectedBlockType}
                  onChange={(e) => setSelectedBlockType(e.target.value as BlockType)}
                >
                  <option value="paragraph">Текст (Paragraph)</option>
                  <option value="heading">Заголовок (Heading)</option>
                  <option value="image">Картинка (URL)</option>
                  <option value="youtube">Видео (YouTube)</option>
                  <option value="equipment">Оборудование</option>
                </select>
                <Button 
                  onClick={addBlock} 
                  className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-400 rounded-none font-bold uppercase tracking-widest text-xs px-4"
                >
                  <Plus className="mr-2 h-4 w-4" /> Блок
                </Button>
              </div>
            </div>

            <div className="p-4 md:p-6 bg-slate-50 min-h-[400px]">
              <div className="space-y-4">
                {blocks.length === 0 ? (
                  <div className="text-center py-16 border-4 border-dashed border-slate-300 bg-white">
                    <p className="font-bold uppercase tracking-widest text-xs text-slate-400">Конструктор пуст. Добавьте первый блок.</p>
                  </div>
                ) : (
                  blocks.map((block, index) => (
                    <div key={block.id} className="group relative flex flex-col sm:flex-row gap-3 p-4 bg-white border-2 border-slate-900 shadow-[4px_4px_0_#0f172a] hover:border-blue-600 transition-colors">
                      
                      {/* Управление блоком */}
                      <div className="flex sm:flex-col gap-1 items-center bg-slate-100 p-1 border-2 border-slate-200 self-start">
                        <button onClick={() => moveBlock(index, 'up')} className="p-1 hover:bg-slate-200 text-slate-600"><ArrowUp className="h-4 w-4" /></button>
                        <GripVertical className="h-4 w-4 text-slate-400 hidden sm:block" />
                        <button onClick={() => moveBlock(index, 'down')} className="p-1 hover:bg-slate-200 text-slate-600"><ArrowDown className="h-4 w-4" /></button>
                      </div>

                      {/* Содержимое блока */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 w-max px-2 py-1 border border-slate-200">
                          {getBlockIcon(block.type)} {block.type}
                        </div>

                        {block.type === 'paragraph' && (
                          <Textarea 
                            placeholder="Напишите текст... (Поддерживается Markdown: **жирный**, *курсив*)" 
                            className="min-h-[120px] border-2 border-slate-200 rounded-none bg-white focus-visible:ring-0 focus-visible:border-blue-600 font-medium" 
                            value={block.content} 
                            onChange={(e) => updateBlock(block.id, e.target.value)} 
                          />
                        )}
                        {block.type === 'heading' && (
                          <Input 
                            placeholder="Заголовок раздела..." 
                            className="font-black text-lg border-2 border-slate-200 rounded-none bg-white h-14 focus-visible:ring-0 focus-visible:border-blue-600" 
                            value={block.content} 
                            onChange={(e) => updateBlock(block.id, e.target.value)} 
                          />
                        )}
                        {(block.type === 'image' || block.type === 'youtube') && (
                          <Input 
                            placeholder="Вставьте ссылку (URL)..." 
                            className="border-2 border-slate-200 rounded-none bg-white h-12 focus-visible:ring-0 focus-visible:border-blue-600 font-medium" 
                            value={block.content} 
                            onChange={(e) => updateBlock(block.id, e.target.value)} 
                          />
                        )}
                        {block.type === 'equipment' && (
                          <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200">
                            <Wrench className="h-5 w-5 text-blue-600" />
                            <select 
                              className="flex-1 bg-transparent font-bold text-slate-900 outline-none" 
                              value={block.content} 
                              onChange={(e) => updateBlock(block.id, e.target.value)}
                            >
                              <option value="" disabled>Выберите станок...</option>
                              {equipmentList.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Удаление блока */}
                      <button 
                        onClick={() => removeBlock(block.id)} 
                        className="sm:opacity-0 group-hover:opacity-100 p-2 bg-red-100 text-red-600 border-2 border-red-200 hover:bg-red-500 hover:text-white transition-all self-end sm:self-start mt-2 sm:mt-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}