import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { MAX_UPLOAD_BYTES, uploadImage, type ImageBucket } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

function errorText(e: unknown, t: (k: string, d: string) => string) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "too-large") return t("upload.errors.tooLarge", "Файл больше 8 МБ — выберите изображение поменьше");
  if (msg === "not-an-image") return t("upload.errors.notImage", "Это не изображение");
  if (msg === "unreadable-image") return t("upload.errors.unreadable", "Не удалось прочитать изображение");
  if (/row-level security|Unauthorized|403/i.test(msg))
    return t("upload.errors.forbidden", "Нет прав на загрузку этого файла");
  return msg;
}

type BaseProps = {
  bucket: ImageBucket;
  folder: string;
  square?: boolean;
  maxSize?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function ImageUpload({
  value,
  onChange,
  bucket,
  folder,
  square,
  maxSize,
  label,
  className,
  disabled,
}: BaseProps & { value: string | null; onChange: (url: string | null) => void }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || disabled) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(t("upload.errors.tooLarge", "Файл больше 8 МБ — выберите изображение поменьше"));
        return;
      }
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      setBusy(true);
      try {
        const url = await uploadImage({ file, bucket, folder, square, maxSize });
        onChange(url);
        toast.success(t("upload.done", "Изображение загружено"));
      } catch (e) {
        toast.error(errorText(e, t as never));
      } finally {
        setBusy(false);
        setPreview(null);
        URL.revokeObjectURL(localPreview);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [bucket, folder, square, maxSize, onChange, disabled, t],
  );

  const shown = preview ?? value;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer border-2 border-dashed border-slate-900 bg-slate-50 transition-colors",
          dragging && "bg-blue-50 border-blue-600",
          square ? "h-40 w-40 rounded-full overflow-hidden border-solid" : "min-h-36",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        {shown ? (
          <img
            src={shown}
            alt=""
            className={cn("h-full w-full object-cover", square ? "" : "max-h-56")}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 h-full py-8 text-slate-400">
            <UploadCloud className="h-7 w-7" />
            <div className="text-[10px] font-black uppercase tracking-widest text-center px-3">
              {t("upload.hint", "Перетащите файл сюда или нажмите, чтобы выбрать")}
            </div>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => inputRef.current?.click()}
          className="h-9 px-3 border-2 border-slate-900 bg-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5 mr-1 inline" />
          {value ? t("upload.replace", "Заменить") : t("upload.choose", "Выбрать файл")}
        </button>
        {value && (
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => onChange(null)}
            className="h-9 px-3 border-2 border-slate-900 bg-rose-500 text-white font-black uppercase tracking-widest text-[10px]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export function ImageUploadMultiple({
  values,
  onChange,
  bucket,
  folder,
  max = 3,
  label,
  className,
  disabled,
}: BaseProps & { values: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || disabled) return;
      const slots = max - values.length;
      if (slots <= 0) {
        toast.error(t("upload.errors.max", "Достигнут лимит изображений"));
        return;
      }
      setBusy(true);
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, slots)) {
        try {
          added.push(await uploadImage({ file, bucket, folder }));
        } catch (e) {
          toast.error(errorText(e, t as never));
        }
      }
      if (added.length) {
        onChange([...values, ...added]);
        toast.success(t("upload.done", "Изображение загружено"));
      }
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [bucket, folder, max, values, onChange, disabled, t],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div>
      )}
      <div className="flex flex-wrap gap-3">
        {values.map((url) => (
          <div key={url} className="relative h-24 w-24 border-2 border-slate-900 overflow-hidden">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== url))}
              className="absolute top-0 right-0 bg-rose-500 text-white p-1 border-l-2 border-b-2 border-slate-900"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {values.length < max && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFiles(e.dataTransfer.files);
            }}
            onClick={() => !busy && inputRef.current?.click()}
            className={cn(
              "h-24 w-24 border-2 border-dashed border-slate-900 bg-slate-50 flex items-center justify-center cursor-pointer",
              dragging && "bg-blue-50 border-blue-600",
              disabled && "opacity-50 pointer-events-none",
            )}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <UploadCloud className="h-5 w-5 text-slate-400" />
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
