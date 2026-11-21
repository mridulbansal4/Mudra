import type { FastifyInstance } from "fastify";
import { bodyOf, obj, optStr, str, strArray, ValidationError } from "../http";
import type { NexconnClient } from "./client";

const ID_MAX = 64;
const TEXT_MAX = 8000;
const TOKEN_TTL_SEC = 7 * 24 * 3600;

/** IMPLEMENTATION_CONTRACT §7 - `/internal/nc/*`. Errors bubble to the app error handler (502 for Nexconn). */
export function registerNexconnRoutes(app: FastifyInstance, nc: NexconnClient): void {
  app.post("/internal/nc/token", async (req) => {
    const b = bodyOf(req);
    const userId = str(b, "user_id", { max: ID_MAX });
    const name = str(b, "name", { max: 128 });
    const avatarUrl = optStr(b, "avatar_url", 1024);
    const { accessToken } = await nc.issueToken(userId, name, avatarUrl);
    return { access_token: accessToken, app_key: nc.appKey, expires_in_sec: TOKEN_TTL_SEC, user_id: userId, mode: nc.mode };
  });

  app.post("/internal/nc/channel/create", async (req) => {
    const b = bodyOf(req);
    const channelId = str(b, "channel_id", { max: ID_MAX });
    const name = str(b, "name", { max: 128 });
    const owner = str(b, "owner", { max: ID_MAX });
    const userIds = strArray(b, "user_ids", { required: false });
    const members = Array.from(new Set([owner, ...userIds]));
    await nc.createGroupChannel(channelId, name, owner, members);
    return { channel_id: channelId, created: true, member_count: members.length, mode: nc.mode };
  });

  app.post("/internal/nc/stream/group", async (req) => {
    const b = bodyOf(req);
    const channelId = str(b, "channel_id", { max: ID_MAX });
    const r = await nc.streamGroup(channelId, {
      fromUserId: str(b, "from_user_id", { max: ID_MAX }),
      messageType: optStr(b, "message_type", 64) ?? "x-mudra-bilingual-bubble",
      text: str(b, "text", { max: TEXT_MAX }),
      extras: obj(b, "extras"),
    });
    return { stream_id: r.streamId, chunks: r.chunks, mode: nc.mode };
  });

  app.post("/internal/nc/stream/direct", async (req) => {
    const b = bodyOf(req);
    const toUserId = str(b, "to_user_id", { max: ID_MAX });
    const r = await nc.streamDirect(toUserId, {
      fromUserId: str(b, "from_user_id", { max: ID_MAX }),
      messageType: optStr(b, "message_type", 64) ?? "x-mudra-shopkeeper-reply",
      text: str(b, "text", { max: TEXT_MAX }),
      extras: obj(b, "extras"),
    });
    return { stream_id: r.streamId, chunks: r.chunks, mode: nc.mode };
  });

  app.post("/internal/nc/moderation/freeze", async (req) => {
    const b = bodyOf(req);
    const channelId = str(b, "channel_id", { max: ID_MAX });
    const action = optStr(b, "action", 8) ?? "add";
    if (action !== "add" && action !== "remove") throw new ValidationError("'action' must be 'add' or 'remove'");
    const t0 = performance.now();
    await nc.freeze(channelId, action);
    const latency = Math.round((performance.now() - t0) * 100) / 100;
    return {
      channel_id: channelId,
      frozen: action === "add",
      latency_ms: latency,
      nexconn_api_called: nc.mode === "live",
      mode: nc.mode,
    };
  });

  app.post("/internal/nc/open/create", async (req) => {
    const channelId = str(bodyOf(req), "channel_id", { max: ID_MAX });
    await nc.createOpenChannel(channelId);
    return { channel_id: channelId, created: true, mode: nc.mode };
  });

  app.post("/internal/nc/open/priority-broadcast", async (req) => {
    const b = bodyOf(req);
    const channelId = str(b, "channel_id", { max: ID_MAX });
    const participantIds = strArray(b, "participant_ids", { max: 5 * 100 });
    if (participantIds.length === 0) throw new ValidationError("'participant_ids' must not be empty");
    await nc.addPrioritySenders(channelId, participantIds);
    return { channel_id: channelId, priority_senders: participantIds, mode: nc.mode };
  });

  app.post("/internal/nc/community/subchannel", async (req) => {
    const b = bodyOf(req);
    const channelId = str(b, "channel_id", { max: ID_MAX });
    const subchannelId = str(b, "subchannel_id", { max: ID_MAX });
    await nc.createSubchannel(channelId, subchannelId);
    return { channel_id: channelId, subchannel_id: subchannelId, created: true, mode: nc.mode };
  });

  app.post("/internal/nc/system/voucher", async (req) => {
    const b = bodyOf(req);
    const toUserIds = strArray(b, "to_user_ids");
    if (toUserIds.length === 0) throw new ValidationError("'to_user_ids' must not be empty");
    const payload = obj(b, "payload");
    const { messageId } = await nc.sendSystemVoucher(toUserIds, payload);
    return { message_id: messageId, delivered_to: toUserIds.length, mode: nc.mode };
  });
}
