type YouTubeLiveEmbedProps = {
  title: string;
  embedUrl: string;
};

export function YouTubeLiveEmbed({ title, embedUrl }: YouTubeLiveEmbedProps) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 shadow-[0_18px_44px_rgba(12,6,9,0.28)]">
      <div className="aspect-video w-full">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedUrl}
          title={title}
        />
      </div>
    </div>
  );
}
