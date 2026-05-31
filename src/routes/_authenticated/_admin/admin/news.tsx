import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // ЭКРАН 1: СПИСОК СТАТЕЙ
  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto space-y-8 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Newspaper className="h-8 w-8 text-blue-600" /> Управление медиа
            </h1>
            <p className="text-slate-500 mt-1">Список всех новостей и статей на платформе</p>
          </div>
          <Button onClick={openCreateNew} className="bg-[#005BAB] hover:bg-blue-800 rounded-2xl h-12 px-6 font-bold shadow-lg shadow-blue-100">
            <Plus className="mr-2 h-5 w-5" /> Создать пост
          </Button>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="h-24 bg-slate-100 rounded-3xl animate-pulse" />
          ) : articles.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400">
              Пока нет ни одной публикации. Самое время создать первую!
            </div>
          ) : (
            articles.map((article) => (
              <Card key={article.id} className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-all p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <div className="h-16 w-24 rounded-2xl bg-slate-100 shrink-0 overflow-hidden">
                    {article.image_url ? (
                      <img src={article.image_url} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300"><ImageIcon className="h-6 w-6" /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-lg truncate">{article.title}</h3>
                    <div className="flex gap-3 text-sm text-slate-500 mt-1">
                      <span className="uppercase font-bold text-blue-600 text-xs">{article.category === 'news' ? 'Новость' : 'Статья'}</span>
                      <span>•</span>
                      <span>{new Date(article.created_at).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" className="rounded-xl h-12" onClick={() => openEdit(article)}>
                    <Pencil className="h-4 w-4 mr-2" /> Изменить
                  </Button>
                  <Button variant="ghost" className="rounded-xl h-12 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => {
                    if(confirm("Точно удалить?")) deleteArticle.mutate(article.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // ЭКРАН 2: РЕДАКТОР
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={closeEditor} className="rounded-full h-12 w-12 p-0 bg-white shadow-sm border border-slate-100 hover:bg-slate-50">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900">{editingId ? "Редактировать пост" : "Создать новый пост"}</h1>
          <p className="text-slate-500">Блочный конструктор</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[32px] border-none shadow-xl bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 rounded-t-[32px]">
              <CardTitle className="text-lg">Настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Заголовок</Label>
                <Input className="h-12 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Тип</Label>
                <select className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="news">Новость</option>
                  <option value="article">Статья / Гайд</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Кратко (для превью)</Label>
                <Textarea className="resize-none h-20 rounded-xl" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Обложка (URL)</Label>
                <Input className="h-12 rounded-xl" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                {imageUrl && (
                  <div className="mt-3 h-32 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={imageUrl} alt="Превью" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.src = "")} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={() => saveArticle.mutate()} 
            disabled={saveArticle.isPending || !title || blocks.length === 0} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-16 rounded-[24px] text-xl font-black shadow-xl shadow-emerald-100"
          >
            {saveArticle.isPending ? "Сохранение..." : editingId ? "СОХРАНИТЬ" : "ОПУБЛИКОВАТЬ"}
          </Button>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[32px] border-none shadow-xl bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 rounded-t-[32px]">
              <CardTitle className="text-lg">Содержание статьи</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex gap-2 p-2 bg-slate-100 rounded-2xl border border-slate-200">
                <select 
                  className="flex-1 bg-white border-none rounded-xl px-4 text-sm outline-none font-medium"
                  value={selectedBlockType}
                  onChange={(e) => setSelectedBlockType(e.target.value as BlockType)}
                >
                  <option value="paragraph">¶ Текст (Paragraph)</option>
                  <option value="heading">H Заголовок (Heading)</option>
                  <option value="image">🖼 Картинка (Image URL)</option>
                  <option value="youtube">▶ Видео (YouTube URL)</option>
                  <option value="equipment">🛠 Привязка оборудования</option>
                </select>
                <Button onClick={addBlock} className="bg-blue-600 rounded-xl px-6 font-bold">
                  <Plus className="mr-2 h-4 w-4" /> Добавить блок
                </Button>
              </div>

              <div className="space-y-4 mt-6">
                {blocks.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-2xl">
                    Нет блоков. Добавьте первый блок выше.
                  </div>
                ) : (
                  blocks.map((block, index) => (
                    <div key={block.id} className="group relative flex gap-3 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-200 transition-colors">
                      <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveBlock(index, 'up')} className="p-1 hover:bg-slate-100 rounded"><ArrowUp className="h-4 w-4" /></button>
                        <GripVertical className="h-4 w-4 text-slate-300 mx-auto my-1" />
                        <button onClick={() => moveBlock(index, 'down')} className="p-1 hover:bg-slate-100 rounded"><ArrowDown className="h-4 w-4" /></button>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {getBlockIcon(block.type)} {block.type}
                        </div>

                        {block.type === 'paragraph' && (
                          <Textarea placeholder="Поддерживается Markdown (**жирный**, *курсив*)..." className="min-h-[100px] border-none bg-slate-50 rounded-xl focus-visible:ring-1" value={block.content} onChange={(e) => updateBlock(block.id, e.target.value)} />
                        )}
                        {block.type === 'heading' && (
                          <Input placeholder="Заголовок раздела..." className="font-bold text-lg border-none bg-slate-50 rounded-xl h-12 focus-visible:ring-1" value={block.content} onChange={(e) => updateBlock(block.id, e.target.value)} />
                        )}
                        {(block.type === 'image' || block.type === 'youtube') && (
                          <Input placeholder="Вставьте ссылку (URL)..." className="border-none bg-slate-50 rounded-xl h-12 focus-visible:ring-1" value={block.content} onChange={(e) => updateBlock(block.id, e.target.value)} />
                        )}
                        {block.type === 'equipment' && (
                          <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                            <Wrench className="h-5 w-5 text-blue-600" />
                            <select className="flex-1 bg-transparent font-bold text-slate-700 outline-none" value={block.content} onChange={(e) => updateBlock(block.id, e.target.value)}>
                              <option value="" disabled>Выберите станок...</option>
                              {equipmentList.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      <button onClick={() => removeBlock(block.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all h-fit self-start">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}