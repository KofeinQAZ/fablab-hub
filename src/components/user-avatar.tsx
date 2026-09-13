import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  url,
  className,
}: {
  name?: string | null;
  url?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-900 bg-blue-600 h-8 w-8",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="font-black uppercase text-white text-xs">{(name ?? "?").slice(0, 1)}</span>
      )}
    </span>
  );
}
