import { useEffect } from "react";
import { S1Hero } from "../landing/S1Hero";
import { S2Manifesto } from "../landing/S2Manifesto";
import { S3PhoneSection } from "../landing/S3PhoneSection";
import { S4Scrolly } from "../landing/S4Scrolly";
import { S5Spheres } from "../landing/S5Spheres";
import { S6HorizontalRail } from "../landing/S6HorizontalRail";
import { S7TwoPhoneTeaser } from "../landing/S7TwoPhoneTeaser";
import { S8TrustBand } from "../landing/S8TrustBand";
import { S9Footer } from "../landing/S9Footer";
import { FloatingDemoCard } from "../site/FloatingDemoCard";
import { SiteNav } from "../site/SiteNav";

export default function Landing() {
  useEffect(() => {
    document.title = "Mudra";
  }, []);

  return (
    <div className="min-h-dvh w-full bg-pop-black text-fg">
      <SiteNav introLogo />
      <main>
        <S1Hero />
        <S2Manifesto />
        <S3PhoneSection />
        <S4Scrolly />
        <S5Spheres />
        <S6HorizontalRail />
        <S7TwoPhoneTeaser />
        <S8TrustBand />
      </main>
      <S9Footer />
      <FloatingDemoCard />
    </div>
  );
}
