import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { Button } from "@heroui/react";
import type { FsmState } from "@mudra/shared-types";
import { formatInr } from "@mudra/shared-types";
import { TopNav, Banner } from "../components/Chrome";
import { StoryBar } from "../components/StoryBar";
import { DealRoom, VoucherChain } from "../components/DealRoom";
import { useSession } from "../lib/session";
import { api, errorText } from "../lib/api";
import { useLiveDeal, type LiveDeal } from "../lib/deal";
import { bootNexconn, type NexconnStatus } from "../lib/nexconn-boot";

interface OpenLots {
  open_channel_id?: string;
  active_lots?: { lot_id: string; title: string; current_bid_paise: number; assay_verified?: boolean }[];
  community_subchannels?: { subchannel_id: string; slug: string; title: string; active_members?: number }[];
}

export default function Desk() {
  const s = useSession();
  const nav = useNavigate();
  const { dealId } = useParams();
  const [deals, setDeals] = useState<LiveDeal[]>([]);
  const [market, setMarket] = useState<OpenLots | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [ncStatus, setNcStatus] = useState<NexconnStatus>("connecting");
  const [creating, setCreating] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!s) return;
    try {
      const r = await api.get<{ deals: LiveDeal[] }>("/api/v1/deals", s.jwt);
      setDeals(r.deals ?? []);
      setListErr(null);
    } catch (e) {
      setListErr(errorText(e));
    }
  }, [s]);

  useEffect(() => {
    if (!s) return;
    void loadList();
    api.get<OpenLots>("/api/v1/marketplace/open-lots").then(setMarket).catch(() => undefined);
    void bootNexconn({ appKey: s.appKey, token: s.nexconnToken, mode: s.mode, userName: s.displayName }).then(setNcStatus);
  }, [s, loadList]);

  const activeId = dealId ?? deals[0]?.deal_id;
  const { deal, refresh } = useLiveDeal(activeId, s?.jwt);

  if (!s) return <Navigate to="/auth" replace />;

  const createDeal = async () => {
    setCreating(true);
    try {
      const d = await api.post<LiveDeal>(
        "/api/v1/deals",
        {
          title: "Refurbished ThinkPad X1 Carbon Gen 10",
          seller_nexconn_id: "seller_vikram_hi_8821",
          amount_paise: 5200000,
          currency: "INR",
          checklist_items: [
            { id: "chk_serial", label: "Show serial sticker on live video", verified: false },
            { id: "chk_battery", label: "Battery cycle count below 300", verified: false },
          ],
        },
        s.jwt,
      );
      await loadList();
      nav(`/app/deals/${d.deal_id}`);
    } catch (e) {
      setListErr(errorText(e));
    } finally {
      setCreating(false);
    }
  };

  const joinSub = async (slug: string) => {
    try {
      const r = await api.post<{ subchannel_id: string; joined: boolean }>(
        "/api/v1/community/subchannels",
        { community_channel_id: "comm_mudra_bharat_trade", category_slug: slug, action: "CREATE_OR_GET" },
        s.jwt,
      );
      setJoinMsg(`Joined ${slug} (${r.subchannel_id}) via createCommunitySubchannel`);
    } catch (e) {
      setJoinMsg(errorText(e));
    }
  };

  const viewerRole = s.role === "seller" ? "seller" : "buyer";

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <TopNav wide />
      {deal ? <StoryBar state={deal.escrow_contract.fsm_state as FsmState} /> : null}
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="hidden min-h-0 overflow-y-auto border-r hairline bg-well/50 px-3 py-4 lg:block" aria-label="Channels">
          <div className="mb-1 flex items-center justify-between px-2">
            <h2 className="text-[13px] font-medium text-ink-2">Deals · Direct and Group</h2>
            <span className={`text-[11.5px] ${ncStatus === "connected" ? "text-vault" : "text-ink-3"}`}>
              {ncStatus === "connected" ? "Nexconn live" : ncStatus === "simulated" ? "Simulated" : ncStatus}
            </span>
          </div>
          <ul className="space-y-1">
            {deals.map((d) => (
              <li key={d.deal_id}>
                <Link
                  to={`/app/deals/${d.deal_id}`}
                  className={`flex h-9 items-center justify-between rounded-md px-2 text-[13.5px] no-underline ${
                    d.deal_id === activeId ? "bg-paper text-ink" : "text-ink-2 hover:bg-paper"
                  }`}
                >
                  <span className="truncate">{d.title}</span>
                  <span className="num ml-2 shrink-0 text-[11.5px] text-ink-3">{formatInr(d.escrow_contract.amount_paise)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Button className="mt-2" size="sm" variant="ghost" isDisabled={creating} onPress={() => void createDeal()}>
            {creating ? "Creating" : "Start a new deal room"}
          </Button>

          <h2 className="mb-1 mt-6 px-2 text-[13px] font-medium text-ink-2">Open flash lots</h2>
          <ul className="space-y-1 px-2 text-[13px] text-ink-2">
            {(market?.active_lots ?? []).map((l) => (
              <li key={l.lot_id} className="flex justify-between gap-2">
                <span className="truncate">{l.title}</span>
                <span className="num shrink-0 text-ink-3">{formatInr(l.current_bid_paise)}</span>
              </li>
            ))}
            {!market ? <li className="text-ink-3">Unavailable</li> : null}
          </ul>

          <h2 className="mb-1 mt-6 px-2 text-[13px] font-medium text-ink-2">Community subchannels</h2>
          <ul className="space-y-1">
            {(market?.community_subchannels ?? []).map((c) => (
              <li key={c.subchannel_id}>
                <button className="press flex h-9 w-full items-center justify-between rounded-md px-2 text-left text-[13.5px] text-ink-2 hover:bg-paper" onClick={() => void joinSub(c.slug)}>
                  <span># {c.slug}</span>
                  <span className="num text-[11.5px] text-ink-3">{c.active_members ?? ""}</span>
                </button>
              </li>
            ))}
          </ul>
          {joinMsg ? <p className="mt-2 px-2 text-[12px] text-ink-3">{joinMsg}</p> : null}
          <div className="mt-6 border-t hairline px-2 pt-3 text-[12.5px] text-ink-3">
            Signed in as {s.displayName} ({s.role}, {s.locale})
          </div>
        </aside>

        <div className="relative min-h-0">
          {listErr ? <div className="p-4"><Banner tone="danger">{listErr}</Banner></div> : null}
          {deal ? (
            <DealRoom deal={deal} viewerRole={viewerRole} viewerLocale={s.locale} jwt={s.jwt} refresh={refresh} simulatedCamera={s.simulatedCamera} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-[15px] text-ink-2">No deal room selected.</p>
              <div className="flex gap-2">
                <Button variant="primary" onPress={() => void createDeal()}>
                  Start a new deal room
                </Button>
                <Button variant="outline" onPress={() => nav("/sandbox")}>
                  Load the seeded Juki demo
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="hidden min-h-0 overflow-y-auto border-l hairline px-4 py-4 lg:block" aria-label="Deal evidence">
          {deal ? (
            <>
              <h3 className="mb-2 text-[14px] font-medium text-ink">Checklist</h3>
              <ul className="mb-6 space-y-1.5">
                {deal.checklist_items.map((c) => (
                  <li key={c.id} className="flex gap-2 text-[13.5px]">
                    <span className={c.verified ? "text-vault" : "text-ink-3"}>{c.verified ? "Verified" : "Open"}</span>
                    <span className="text-ink-2">{c.label}</span>
                  </li>
                ))}
              </ul>
              <VoucherChain deal={deal} />
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
