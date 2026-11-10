import { randomBytes } from "node:crypto";
import {
  ApiException,
  CommunityChannelManagementApi,
  Configuration,
  GroupChannelManagementApi,
  GroupChannelModerationApi,
  MessageManagementApi,
  NetworkException,
  OpenChannelManagementApi,
  OpenChannelPriorityControlsApi,
  RequiredError,
  SystemMessagesApi,
  UserManagementApi,
  type StreamMessageContent,
} from "../vendor/nexconn-server-sdk/index";
import type { BridgeConfig } from "../config";

export type Mode = "live" | "simulated";

/** Error surfaced to callers as HTTP 502 `{ error: { code, message, retryable } }`. */
export class NexconnBridgeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly upstreamStatus?: number,
    public readonly upstreamCode?: number,
  ) {
    super(message);
    this.name = "NexconnBridgeError";
  }
}

export function mapNexconnError(op: string, err: unknown): NexconnBridgeError {
  if (err instanceof NexconnBridgeError) return err;
  if (err instanceof NetworkException) {
    return new NexconnBridgeError("ERR_NEXCONN_UNREACHABLE", `${op}: ${err.message}`, true);
  }
  if (err instanceof ApiException) {
    const status = err.httpStatus;
    const retryable = status === 0 || status === 429 || status >= 500;
    const code =
      status === 401 || status === 403
        ? "ERR_NEXCONN_AUTH"
        : status === 429
          ? "ERR_NEXCONN_RATE_LIMITED"
          : status >= 500
            ? "ERR_NEXCONN_UPSTREAM"
            : "ERR_NEXCONN_REJECTED";
    const detail = err.errorMessage ?? err.message;
    return new NexconnBridgeError(
      code,
      `${op}: HTTP ${status} (code ${err.errorCode}) ${detail}`,
      retryable,
      status,
      err.errorCode,
    );
  }
  if (err instanceof RequiredError) {
    return new NexconnBridgeError("ERR_NEXCONN_BAD_REQUEST", `${op}: ${err.message}`, false);
  }
  const msg = err instanceof Error ? err.message : String(err);
  return new NexconnBridgeError("ERR_NEXCONN_UPSTREAM", `${op}: ${msg}`, true);
}

/** Nexconn can return HTTP 200 with a business `code`; 200 means success. */
function assertBusinessOk(op: string, data: unknown): void {
  if (data && typeof data === "object" && "code" in data) {
    const code = (data as { code: unknown }).code;
    if (typeof code === "number" && code !== 200) {
      const msg = (data as { errorMessage?: string }).errorMessage ?? "non-success business code";
      throw new NexconnBridgeError("ERR_NEXCONN_REJECTED", `${op}: code ${code} ${msg}`, false, 200, code);
    }
  }
}

const simId = (prefix: string): string => `sim_${prefix}_${randomBytes(9).toString("base64url")}`;

/** Split text into at most `parts` chunks on whitespace boundaries (stream seq parts). */
export function chunkText(text: string, parts = 3): string[] {
  if (text.length <= 40 || parts <= 1) return [text];
  const target = Math.ceil(text.length / parts);
  const out: string[] = [];
  let rest = text;
  while (rest.length > target && out.length < parts - 1) {
    let cut = rest.lastIndexOf(" ", target);
    if (cut <= 0) cut = target;
    out.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  out.push(rest);
  return out.filter((c) => c.length > 0);
}

export interface StreamArgs {
  fromUserId: string;
  messageType: string;
  text: string;
  extras?: Record<string, unknown>;
}

type StreamSend = (
  content: StreamMessageContent,
) => (cfg: Configuration) => Promise<{ data: { code: number; result?: { messageId?: string } } }>;

export class NexconnClient {
  readonly mode: Mode;
  private readonly cfg?: Configuration;

  constructor(private readonly config: BridgeConfig["nexconn"]) {
    this.mode = config.simulated ? "simulated" : "live";
    if (!config.simulated) {
      const cfg = new Configuration({ baseOptions: { timeout: config.timeoutMs } });
      cfg.setNexconnCredentials(config.appKey, config.secretKey);
      cfg.setPrimaryBackupDomains(config.primaryDomain, config.secondaryDomain);
      this.cfg = cfg;
    }
  }

  get appKey(): string {
    return this.mode === "live" ? this.config.appKey : "sim_app_key";
  }

  private async call<T>(op: string, fn: (cfg: Configuration) => Promise<{ data: T }>): Promise<T> {
    if (!this.cfg) {
      throw new NexconnBridgeError("ERR_NEXCONN_NOT_CONFIGURED", `${op}: no live configuration`, false);
    }
    try {
      const res = await fn(this.cfg);
      assertBusinessOk(op, res.data);
      return res.data;
    } catch (err) {
      throw mapNexconnError(op, err);
    }
  }

  async issueToken(userId: string, name: string, avatarUrl?: string): Promise<{ accessToken: string }> {
    if (this.mode === "simulated") return { accessToken: simId(`tok_${userId}`) };
    const data = await this.call("UserManagementApi.issueAccessToken", (cfg) =>
      new UserManagementApi(cfg).issueAccessToken({ userId, name, ...(avatarUrl ? { avatarUrl } : {}) }),
    );
    const token = data.result?.accessToken;
    if (!token) throw new NexconnBridgeError("ERR_NEXCONN_UPSTREAM", "issueAccessToken: empty token", true);
    return { accessToken: token };
  }

  async createGroupChannel(channelId: string, name: string, owner: string, userIds: string[]): Promise<void> {
    if (this.mode === "simulated") return;
    await this.call("GroupChannelManagementApi.createGroupChannel", (cfg) =>
      new GroupChannelManagementApi(cfg).createGroupChannel({ channelId, name, owner, userIds }),
    );
  }

  /**
   * Streams `text` as up to 3 seq chunks sent sequentially; the first chunk's returned
   * messageId is reused for later chunks so clients render one growing bubble.
   */
  streamGroup(channelId: string, args: StreamArgs): Promise<{ streamId: string; chunks: number }> {
    return this.stream(
      "MessageManagementApi.sendGroupChannelStreamMessage",
      args,
      (content) => (cfg) =>
        new MessageManagementApi(cfg).sendGroupChannelStreamMessage({
          fromUserId: args.fromUserId,
          toChannelId: channelId,
          messageType: args.messageType,
          content,
        }),
    );
  }

  streamDirect(toUserId: string, args: StreamArgs): Promise<{ streamId: string; chunks: number }> {
    return this.stream(
      "MessageManagementApi.sendDirectChannelStreamMessage",
      args,
      (content) => (cfg) =>
        new MessageManagementApi(cfg).sendDirectChannelStreamMessage({
          fromUserId: args.fromUserId,
          toUserId,
          messageType: args.messageType,
          content,
        }),
    );
  }

  private async stream(op: string, args: StreamArgs, send: StreamSend): Promise<{ streamId: string; chunks: number }> {
    const chunks = chunkText(args.text);
    if (this.mode === "simulated") return { streamId: simId("stream"), chunks: chunks.length };
    let messageId: string | undefined;
    for (let i = 0; i < chunks.length; i++) {
      const content: StreamMessageContent = {
        content: chunks[i]!,
        seq: i + 1,
        complete: i === chunks.length - 1,
        ...(messageId ? { messageId } : {}),
        extra: args.extras ?? {},
      };
      const data = await this.call(op, send(content));
      messageId = messageId ?? data.result?.messageId;
    }
    return { streamId: messageId ?? `nc_stream_${randomBytes(9).toString("base64url")}`, chunks: chunks.length };
  }

  async freeze(channelId: string, action: "add" | "remove"): Promise<void> {
    if (this.mode === "simulated") return;
    await this.call(`GroupChannelModerationApi.${action}GroupChannelFreezeList`, (cfg) => {
      const api = new GroupChannelModerationApi(cfg);
      return action === "add"
        ? api.addGroupChannelFreezeList({ channelIds: [channelId] })
        : api.removeGroupChannelFreezeList({ channelIds: [channelId] });
    });
  }

  async createOpenChannel(channelId: string): Promise<void> {
    if (this.mode === "simulated") return;
    await this.call("OpenChannelManagementApi.createOpenChannel", (cfg) =>
      new OpenChannelManagementApi(cfg).createOpenChannel({ channelId }),
    );
  }

  async addPrioritySenders(channelId: string, participantIds: string[]): Promise<void> {
    if (this.mode === "simulated") return;
    await this.call("OpenChannelPriorityControlsApi.addOpenChannelPrioritySenderList", (cfg) =>
      new OpenChannelPriorityControlsApi(cfg).addOpenChannelPrioritySenderList({ channelId, participantIds }),
    );
  }

  async createSubchannel(channelId: string, subchannelId: string): Promise<void> {
    if (this.mode === "simulated") return;
    await this.call("CommunityChannelManagementApi.createCommunitySubchannel", (cfg) =>
      new CommunityChannelManagementApi(cfg).createCommunitySubchannel({ channelId, subchannelId }),
    );
  }

  async sendSystemVoucher(toUserIds: string[], payload: Record<string, unknown>): Promise<{ messageId: string }> {
    if (this.mode === "simulated") return { messageId: simId("sysmsg") };
    const data = await this.call("SystemMessagesApi.sendSystemChannelMessage", (cfg) =>
      new SystemMessagesApi(cfg).sendSystemChannelMessage({
        fromUserId: this.config.systemVoucherBotId,
        toUserIds,
        messageType: "x-samadhan-system-voucher",
        content: JSON.stringify(payload),
      }),
    );
    const id = (data as { result?: { messageId?: string } }).result?.messageId;
    return { messageId: id ?? "nc_sysmsg_sent" };
  }
}
