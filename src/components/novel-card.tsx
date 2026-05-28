import Link from "next/link";

interface NovelCardProps {
  id: string;
  title_en: string;
  title_mm?: string | null;
  author_pen_name?: string | null;
  cover_image_url?: string | null;
  novel_status: string;
  chapters_count?: number | null;
  genres: { id: string; name: string }[];
}

export function NovelCard({ novel }: { novel: NovelCardProps }) {
  const statusColor =
    novel.novel_status === "completed"
      ? "bg-green-500"
      : novel.novel_status === "ongoing"
      ? "bg-blue-500"
      : "bg-red-500";

  return (
    <Link href={`/novels/${novel.id}`} className="group">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:scale-[1.02]">
        {/* Cover image */}
        {novel.cover_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={novel.cover_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
            <span className="text-4xl font-bold text-muted-foreground/30">
              {novel.title_en.charAt(0)}
            </span>
          </div>
        )}

        {/* Status badge — top right */}
        <div className="absolute top-2 right-2 z-10">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold text-white capitalize shadow-sm ${statusColor}`}
          >
            {novel.novel_status}
          </span>
        </div>

        {/* Chapters badge — top left */}
        {novel.chapters_count != null && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-black/60 backdrop-blur-sm">
              {novel.chapters_count} ch.
            </span>
          </div>
        )}

        {/* Gradient overlay + info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-16 pb-3 px-3">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 drop-shadow-sm">
            {novel.title_en}
          </h3>
          {novel.title_mm && (
            <p className="text-[11px] text-white/70 line-clamp-1 mt-0.5">
              {novel.title_mm}
            </p>
          )}
          {novel.author_pen_name && (
            <p className="text-[11px] text-white/60 mt-1">
              {novel.author_pen_name}
            </p>
          )}
          {novel.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {novel.genres.slice(0, 3).map((g) => (
                <span
                  key={g.id}
                  className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium text-white/90 bg-white/15 backdrop-blur-sm"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
