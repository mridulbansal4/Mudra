import type { DemoAction } from "./store";

export interface BroadcastPacket {
  id: string;
  action: DemoAction;
}

const CHANNEL_NAME = "samadhan-demo";

export function connectDemoBroadcast(onReceive: (action: DemoAction) => void) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return {
      post: (_action: DemoAction) => {},
      close: () => {},
    };
  }

  const seenIds = new Set<string>();
  const channel = new BroadcastChannel(CHANNEL_NAME);

  channel.onmessage = (event: MessageEvent<BroadcastPacket>) => {
    const packet = event.data;
    if (!packet || typeof packet.id !== "string" || seenIds.has(packet.id)) {
      return;
    }
    seenIds.add(packet.id);
    onReceive(packet.action);
  };

  return {
    post: (action: DemoAction) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      seenIds.add(id);
      try {
        channel.postMessage({ id, action } satisfies BroadcastPacket);
      } catch {
        // Ignore broadcast error if channel is closed
      }
    },
    close: () => {
      channel.close();
    },
  };
}
