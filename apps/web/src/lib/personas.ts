import type { Locale, Role } from "@mudra/shared-types";
import { api } from "./api";
import { setSession, type UserSession } from "./session";

export interface Persona {
  preset: string;
  name: string;
  role: Role;
  locale: Locale;
  blurb: string;
}

export const PERSONAS: Persona[] = [
  { preset: "P-01_RAJESH", name: "Rajesh Natarajan", role: "buyer", locale: "ta-IN", blurb: "Tirupur MSME buyer, Tamil. Buying a ₹1.45 lakh overlock machine" },
  { preset: "P-02_VIKRAM", name: "Vikramjeet Singh", role: "seller", locale: "hi-IN", blurb: "Ludhiana machinery dealer, Hindi. Shows the machine on live video" },
  { preset: "P-03_AARAV", name: "Aarav Mehta", role: "buyer", locale: "en-IN", blurb: "Campus GPU trader, English. Fast flips and the bargain arena" },
  { preset: "P-04_MEERA", name: "Meera Krishnan", role: "arbitrator", locale: "en-IN", blurb: "Senior dispute arbitrator. Opens the dispatch freeze desk" },
];

interface AuthResponse {
  user: { id: string; nexconn_user_id: string; display_name: string; role: Role; preferred_locale: Locale };
  nexconn: { app_key?: string; access_token: string; expires_in_sec?: number; mode?: "live" | "simulated" };
  mudra_jwt: string;
  mode?: "live" | "simulated";
}

export async function signIn(input: { preset?: string; displayName: string; role: Role; locale: Locale }, persist = true): Promise<UserSession> {
  const r = await api.post<AuthResponse>("/api/v1/auth/session", {
    persona_preset: input.preset,
    display_name: input.displayName,
    role: input.role,
    preferred_locale: input.locale,
    client_platform: "web",
  });
  const s: UserSession = {
    userId: r.user.id,
    nexconnUserId: r.user.nexconn_user_id,
    displayName: r.user.display_name,
    role: r.user.role,
    locale: r.user.preferred_locale ?? input.locale,
    jwt: r.mudra_jwt,
    nexconnToken: r.nexconn.access_token,
    appKey: r.nexconn.app_key,
    mode: r.nexconn.mode ?? r.mode ?? (r.nexconn.access_token?.startsWith("sim_") ? "simulated" : "live"),
    simulatedCamera: true,
    onboarded: false,
  };
  if (persist) setSession(s);
  return s;
}
