import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import buildingPhoto from "@/assets/fablab-building.webp";
import workspace from "@/assets/atmosphere-workspace.jpg.asset.json";
import electronics from "@/assets/atmosphere-electronics.jpg.asset.json";
import teamwork from "@/assets/atmosphere-teamwork.jpg.asset.json";
import workshop from "@/assets/atmosphere-workshop.jpg.asset.json";

export function AtmosphereCarousel() {
  const { t } = useTranslation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const photos = [
    { src: buildingPhoto, fallback: buildingPhoto, label: "FabLab Satbayev" },
    { src: workspace.url, fallback: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=85", label: t("landing.atmosphere.mainHall") },
    { src: electronics.url, fallback: "https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=1400&q=85", label: t("landing.tech.items.electronics") },
    { src: teamwork.url, fallback: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=85", label: t("landing.atmosphere.teams") },
    { src: workshop.url, fallback: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1400&q=85", label: t("landing.atmosphere.cncPark") },
  ];
  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update();
    api.on("select", update);
    return () => { api.off("select", update); };
  }, [api]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:px-8 md:py-16">
      <Carousel opts={{ align: "start", loop: true }} setApi={setApi} aria-label={t("landing.atmosphere.title")}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5 border-b-2 border-foreground pb-5">
          <div>
            <h2 className="text-3xl font-black uppercase sm:text-4xl">{t("landing.atmosphere.title")}</h2>
            <p className="mt-2 max-w-xl text-base text-muted-foreground">{t("landing.atmosphere.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="mr-2 font-mono text-sm tabular-nums" aria-live="polite">{String(current + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
            <CarouselPrevious aria-label={t("booking.map.previousPhoto")} className="static h-11 w-11 translate-y-0 rounded-none border-2 border-foreground" />
            <CarouselNext aria-label={t("booking.map.nextPhoto")} className="static h-11 w-11 translate-y-0 rounded-none border-2 border-foreground" />
          </div>
        </div>
        <CarouselContent>
          {photos.map((photo, index) => (
            <CarouselItem key={photo.src} className="basis-[90%] md:basis-[80%]">
              <figure className="overflow-hidden border-2 border-foreground bg-card">
                <div className="aspect-[4/3] overflow-hidden bg-muted sm:aspect-[16/9]">
                  <img src={photo.src} alt={photo.label} loading="lazy" onError={(event) => { const image = event.currentTarget; if (image.dataset.fallback) return; image.dataset.fallback = "true"; image.src = photo.fallback; }} className="h-full w-full object-cover" />
                </div>
                <figcaption className="flex items-center justify-between gap-3 border-t-2 border-foreground px-4 py-4 text-base font-bold uppercase">
                  <span>{photo.label}</span><span className="font-mono text-sm text-primary">{String(index + 1).padStart(2, "0")}</span>
                </figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-5 flex justify-center gap-2">
          {photos.map((photo, index) => <Button key={photo.src} variant="ghost" size="icon" aria-label={`${photo.label}, ${index + 1}`} aria-current={current === index ? "true" : undefined} onClick={() => api?.scrollTo(index)} className="h-11 w-11 rounded-none"><span className={`h-1.5 w-7 ${current === index ? "bg-primary" : "bg-border"}`} /></Button>)}
        </div>
      </Carousel>
    </section>
  );
}