type Partner = {
  name: string;
  logoUrl: string;
};

const partners: Partner[] = [
  { name: "Satbayev University", logoUrl: "https://logo.clearbit.com/satbayev.university?size=256" },
  { name: "Kaspi.kz", logoUrl: "https://logo.clearbit.com/kaspi.kz?size=256" },
  { name: "Chevron", logoUrl: "https://logo.clearbit.com/chevron.com?size=256" },
  { name: "Astana Hub", logoUrl: "https://logo.clearbit.com/astanahub.com?size=256" },
  { name: "MakerSpace", logoUrl: "https://logo.clearbit.com/makerspace.com?size=256" },
  { name: "Tech Garden", logoUrl: "https://logo.clearbit.com/techgarden.kz?size=256" },
];

const marqueeItems = [...partners, ...partners];

export function PartnersTicker() {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm transition-all hover:shadow-xl md:px-8 md:py-8">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        Нам доверяют и с нами работают
      </p>

      <div className="group relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />

        <div className="flex w-max animate-partners-marquee items-center gap-12 pr-12 group-hover:[animation-play-state:paused] hover:[animation-play-state:paused]">
          {marqueeItems.map((partner, index) => {
            return (
              <div
                key={`${partner.name}-${index}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-2 transition-all duration-300 group-hover:opacity-60 hover:scale-[1.03] hover:opacity-100"
              >
                <img
                  src={partner.logoUrl}
                  alt={partner.name}
                  className="h-8 w-8 rounded-md object-contain grayscale transition-all duration-300 hover:grayscale-0"
                  loading="lazy"
                  decoding="async"
                />
                <span className="whitespace-nowrap text-sm font-semibold text-slate-600">{partner.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
