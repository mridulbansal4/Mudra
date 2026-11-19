import { useEffect, useRef, useState } from "react";
import { ArchitectureStrip } from "../how/ArchitectureStrip";
import { HOW_CHAPTERS } from "../how/chapters";
import { HowChapterSection } from "../how/HowChapterSection";
import { StateRail } from "../how/StateRail";
import { FadeUp } from "../motion/FadeUp";
import { FloatingDemoCard } from "../site/FloatingDemoCard";
import { SiteFooter } from "../site/SiteFooter";
import { SiteNav } from "../site/SiteNav";
import { Eyebrow } from "../ui/Eyebrow";

export default function HowItWorks() {
  const [activeChapter, setActiveChapter] = useState(0);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    document.title = "how it works — samadhan";
  }, []);

  useEffect(() => {
    const nodes = chapterRefs.current.filter(
      (n): n is HTMLElement => n !== null
    );
    if (nodes.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-chapter-idx"));
            if (!Number.isNaN(idx)) {
              setActiveChapter(idx);
            }
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    for (const node of nodes) io.observe(node);
    return () => io.disconnect();
  }, []);

  const handleSelectChapter = (idx: number) => {
    setActiveChapter(idx);
    const el = chapterRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-dvh w-full bg-pop-black text-fg">
      <SiteNav />

      <main>
        {/* 1. Intro (80vh) */}
        <section className="flex min-h-[80svh] w-full flex-col items-center justify-center px-5 pt-[96px] pb-16 text-center md:px-10">
          <FadeUp className="mx-auto flex max-w-[1200px] flex-col items-center">
            <Eyebrow dot>HOW IT WORKS</Eyebrow>
            <h1 className="t-hero mt-5 lowercase text-fg">
              <span className="block">the anatomy</span>
              <span className="block">of a safe deal.</span>
            </h1>
            <p className="t-lead mt-6 max-w-[520px] lowercase text-fg-2">
              eight states, two phones, one sealed vault. here is every step,
              and what protects you at each one.
            </p>
          </FadeUp>
        </section>

        {/* 2. Sticky State Rail */}
        <StateRail
          activeChapterIndex={activeChapter}
          onSelectChapter={handleSelectChapter}
        />

        {/* 3. Chapters */}
        {HOW_CHAPTERS.map((chapter, idx) => (
          <HowChapterSection
            key={chapter.id}
            chapter={chapter}
            index={idx}
            registerRef={(el) => {
              chapterRefs.current[idx] = el;
            }}
          />
        ))}

        {/* 4. Architecture strip + 5. CTA band */}
        <ArchitectureStrip />
      </main>

      <SiteFooter />
      <FloatingDemoCard />
    </div>
  );
}
