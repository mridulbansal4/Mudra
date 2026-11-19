import { useEffect } from "react";
import { S1Hero } from "../landing/S1Hero";
import { S2Manifesto } from "../landing/S2Manifesto";
import { FloatingDemoCard } from "../site/FloatingDemoCard";
import { SiteFooter } from "../site/SiteFooter";
import { SiteNav } from "../site/SiteNav";

export default function Landing() {
  useEffect(() => {
    document.title = "samadhan — trade like you trust them";
  }, []);

  return (
    <div className="min-h-dvh w-full bg-pop-black text-fg">
      <SiteNav introLogo />
      <main>
        <S1Hero />
        <S2Manifesto />
      </main>
      <SiteFooter />
      <FloatingDemoCard />
    </div>
  );
}
