import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { defineSamadhanCards } from "@samadhan/nc-lit-cards";
import "./styles/globals.css";
import Landing from "./routes/Landing";

import { getSession } from "./lib/session";

// Simulated mode defines the Lit cards up front. With a live Nexconn session, ChatUI's
// app.ready() defines them from registerCustomMessages (see lib/nexconn-boot.ts) instead.
if (getSession()?.mode !== "live") defineSamadhanCards();

const Auth = lazy(() => import("./routes/Auth"));
const Onboarding = lazy(() => import("./routes/Onboarding"));
const Desk = lazy(() => import("./routes/Desk"));
const Sandbox = lazy(() => import("./routes/Sandbox"));
const Arena = lazy(() => import("./routes/Arena"));
const Dispatch = lazy(() => import("./routes/Dispatch"));
const Guide = lazy(() => import("./routes/Guide"));
const Traction = lazy(() => import("./routes/Traction"));

function Loading() {
  return <div className="p-8 text-[14px] text-ink-3">Loading</div>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/app" element={<Desk />} />
          <Route path="/app/deals/:dealId" element={<Desk />} />
          <Route path="/sandbox" element={<Sandbox />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/traction" element={<Traction />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
