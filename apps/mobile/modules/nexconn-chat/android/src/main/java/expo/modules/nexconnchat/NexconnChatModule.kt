package expo.modules.nexconnchat

import ai.nexconn.call.api.NCCallEngine
import ai.nexconn.call.api.handler.NCCallAPIResultHandler
import ai.nexconn.call.api.handler.NCCallEventHandler
import ai.nexconn.call.api.handler.event.NCCallConnectedEvent
import ai.nexconn.call.api.handler.event.NCCallEndedEvent
import ai.nexconn.call.api.handler.event.NCCallLocalCallLogReceivedEvent
import ai.nexconn.call.api.handler.event.NCCallMediaTypeChangeRequestReceivedEvent
import ai.nexconn.call.api.handler.event.NCCallMediaTypeChangeResultReceivedEvent
import ai.nexconn.call.api.handler.event.NCCallReceivedEvent
import ai.nexconn.call.api.handler.event.NCCallRemoteCameraStateChangedEvent
import ai.nexconn.call.api.handler.event.NCCallRemoteMicrophoneStateChangedEvent
import ai.nexconn.call.api.handler.event.NCCallRemoteUserInvitedEvent
import ai.nexconn.call.api.handler.event.NCCallRemoteUserStateChangedEvent
import ai.nexconn.call.api.handler.event.NCCallServerCallLogReceivedEvent
import ai.nexconn.call.api.handler.event.NCCallStartTimeReceivedEvent
import ai.nexconn.call.api.handler.event.NCCallTypeChangedEvent
import ai.nexconn.call.api.handler.result.NCCallAcceptCallResult
import ai.nexconn.call.api.handler.result.NCCallStartCallResult
import ai.nexconn.call.api.model.NCCallCode
import ai.nexconn.call.api.model.NCCallMediaType
import ai.nexconn.call.api.model.NCCallType
import ai.nexconn.call.api.params.NCCallAcceptCallParams
import ai.nexconn.call.api.params.NCCallEndCallParams
import ai.nexconn.call.api.params.NCCallInitParams
import ai.nexconn.call.api.params.NCCallStartCallParams
import ai.nexconn.chat.NCEngine
import ai.nexconn.chat.channel.DirectChannel
import ai.nexconn.chat.error.NCError
import ai.nexconn.chat.handler.ConnectHandler
import ai.nexconn.chat.handler.ConnectionStatusHandler
import ai.nexconn.chat.handler.MessageHandler
import ai.nexconn.chat.handler.SendMessageHandler
import ai.nexconn.chat.message.Message
import ai.nexconn.chat.message.TextMessage
import ai.nexconn.chat.message.model.MessageReceivedEvent
import ai.nexconn.chat.model.ConnectionStatusChangedEvent
import ai.nexconn.chat.params.AreaCode
import ai.nexconn.chat.params.ConnectParams
import ai.nexconn.chat.params.InitParams
import ai.nexconn.chat.params.SendMessageParams
import android.content.Context
import android.util.Log
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "NexconnChat"
private const val MESSAGE_HANDLER_ID = "MudraMessageHandler"
private const val STATUS_HANDLER_ID = "MudraConnectionHandler"
internal const val CALL_TAG = "NexconnCall"

/** Shared between the module and NexconnCallView: ready = NCCallEngine.initialize succeeded. */
internal object NexconnCallState {
  @Volatile var installed = false
  @Volatile var ready = false
}

/**
 * Thin Expo bridge over the Nexconn Android Chat SDK (ai.nexconn.chat:chat).
 * Exposes initialize / connect / sendDirectText / disconnect and forwards
 * received messages and connection-status changes to JavaScript as events.
 *
 * Also bridges the Nexconn Android Call SDK (ai.nexconn.chat:call) for a 1:1 audio-video
 * inspection call, in the order the official docs require:
 * NCCallEngine.install() -> NCEngine.initialize -> NCEngine.connect -> NCCallEngine.initialize.
 * Every call path is wrapped so a call failure never breaks chat or crashes the app.
 */
class NexconnChatModule : Module() {
  @Volatile private var initialized = false
  private val callLock = Any()
  private var pendingStart: Promise? = null
  private var pendingAccept: Promise? = null

  private fun callError(code: NCCallCode?): String =
    "code=${code?.name ?: "UNKNOWN"} ${code?.reason ?: ""}".trim()

  private fun takeStart(): Promise? = synchronized(callLock) { pendingStart.also { pendingStart = null } }

  private fun takeAccept(): Promise? = synchronized(callLock) { pendingAccept.also { pendingAccept = null } }

  private fun safeEmit(event: String, body: Map<String, Any?>) {
    try {
      sendEvent(event, body)
    } catch (t: Throwable) {
      Log.w(CALL_TAG, "emit $event failed: ${t.message}")
    }
  }

  private fun initCallEngine(ctx: Context) {
    synchronized(callLock) {
      if (NexconnCallState.ready || !NexconnCallState.installed) return
      try {
        NCCallEngine.initialize(NCCallInitParams(ctx))
        val engine = NCCallEngine.getInstance()
        engine.setCallEventHandler(callEvents)
        engine.setAPIResultHandler(callResults)
        NexconnCallState.ready = true
        Log.i(CALL_TAG, "call engine initialized sdk=${NCCallEngine.getVersion()}")
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "call engine initialize failed: ${t.message}")
      }
    }
  }

  private val callEvents = object : NCCallEventHandler {
    override fun onCallReceived(event: NCCallReceivedEvent) {
      try {
        val s = event.callSession
        Log.i(CALL_TAG, "call received id=${s?.callId} from=${s?.callerUserId} extra=${event.extra}")
        safeEmit(
          "onCallReceived",
          mapOf("callId" to s?.callId, "callerUserId" to s?.callerUserId, "extra" to (event.extra ?: ""))
        )
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "onCallReceived failed: ${t.message}")
      }
    }

    override fun onCallConnected(event: NCCallConnectedEvent) {
      try {
        val s = event.callSession
        val remote = s?.remoteParticipants?.firstOrNull()?.userId
        Log.i(CALL_TAG, "call connected id=${s?.callId} remote=$remote media=${s?.mediaType}")
        val engine = NCCallEngine.getInstance()
        if (s?.mediaType == NCCallMediaType.AUDIO_VIDEO) engine.enableCamera(true)
        engine.enableMicrophone(true)
        engine.enableSpeaker(true)
        safeEmit("onCallConnected", mapOf("callId" to s?.callId, "remoteUserId" to remote))
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "onCallConnected failed: ${t.message}")
      }
    }

    override fun onCallEnded(event: NCCallEndedEvent) {
      try {
        val id = event.session?.callId
        val reason = event.reason?.name ?: "UNKNOWN"
        Log.i(CALL_TAG, "call ended id=$id reason=$reason")
        try {
          NCCallEngine.getInstance().enableCamera(false)
        } catch (t: Throwable) {
          Log.w(CALL_TAG, "enableCamera(false) failed: ${t.message}")
        }
        takeStart()?.reject("NEXCONN_CALL", "call ended before it started: $reason", null)
        takeAccept()?.reject("NEXCONN_CALL", "call ended before it was accepted: $reason", null)
        safeEmit("onCallEnded", mapOf("callId" to id, "reason" to reason))
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "onCallEnded failed: ${t.message}")
      }
    }

    override fun onRemoteUserStateChanged(event: NCCallRemoteUserStateChangedEvent) {
      Log.i(CALL_TAG, "remote user ${event.userId} state=${event.userState} reason=${event.reason}")
    }

    override fun onRemoteUserInvited(event: NCCallRemoteUserInvitedEvent?) {}
    override fun onServerCallLogReceived(event: NCCallServerCallLogReceivedEvent?) {}
    override fun onRemoteMicrophoneStateChanged(event: NCCallRemoteMicrophoneStateChangedEvent?) {}
    override fun onRemoteCameraStateChanged(event: NCCallRemoteCameraStateChangedEvent?) {}
    override fun onMediaTypeChangeRequestReceived(event: NCCallMediaTypeChangeRequestReceivedEvent?) {}
    override fun onMediaTypeChangeResultReceived(event: NCCallMediaTypeChangeResultReceivedEvent?) {}
    override fun onCallTypeChanged(event: NCCallTypeChangedEvent?) {}
    override fun onLocalCallLogReceived(event: NCCallLocalCallLogReceivedEvent?) {}
    override fun onStartTimeReceived(event: NCCallStartTimeReceivedEvent?) {}
  }

  private val callResults = object : NCCallAPIResultHandler {
    override fun onStartCall(result: NCCallStartCallResult) {
      val p = takeStart() ?: return
      if (result.code == NCCallCode.SUCCESS && result.callId != null) {
        Log.i(CALL_TAG, "start call ok id=${result.callId}")
        p.resolve(result.callId)
      } else {
        Log.w(CALL_TAG, "start call failed ${callError(result.code)}")
        p.reject("NEXCONN_CALL", "start call failed: ${callError(result.code)}", null)
      }
    }

    override fun onAcceptCall(result: NCCallAcceptCallResult) {
      val p = takeAccept() ?: return
      if (result.code == NCCallCode.SUCCESS) {
        Log.i(CALL_TAG, "accept call ok id=${result.callId}")
        p.resolve(result.callId)
      } else {
        Log.w(CALL_TAG, "accept call failed ${callError(result.code)}")
        p.reject("NEXCONN_CALL", "accept call failed: ${callError(result.code)}", null)
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("NexconnChat")

    Events("onMessage", "onConnectionStatus", "onCallReceived", "onCallConnected", "onCallEnded")

    View(NexconnCallView::class) {
      Prop("kind") { view: NexconnCallView, kind: String? -> view.setKind(kind) }
      Prop("userId") { view: NexconnCallView, userId: String? -> view.setUserId(userId) }
    }

    Function("sdkVersion") {
      NCEngine.getVersion()
    }

    Function("currentUserId") {
      if (initialized) NCEngine.getCurrentUserId() else null
    }

    Function("initialize") { appKey: String ->
      synchronized(this@NexconnChatModule) {
        if (initialized) return@Function true
        val ctx = appContext.reactContext?.applicationContext ?: return@Function false

        // The Call SDK must be installed before the Chat SDK is initialized (official order).
        try {
          NCCallEngine.install()
          NexconnCallState.installed = true
        } catch (t: Throwable) {
          Log.w(CALL_TAG, "NCCallEngine.install failed, calls disabled: ${t.message}")
        }

        NCEngine.initialize(InitParams(ctx, appKey).apply { areaCode = AreaCode.SG })

        NCEngine.addMessageHandler(MESSAGE_HANDLER_ID, object : MessageHandler {
          override fun onMessageReceived(event: MessageReceivedEvent) {
            val m = event.message
            Log.i(TAG, "message received id=${m.messageId} from=${m.senderUserId} channel=${m.channelIdentifier?.channelType}")
            sendEvent(
              "onMessage",
              mapOf(
                "messageId" to m.messageId,
                "senderUserId" to m.senderUserId,
                "channelId" to m.channelIdentifier?.channelId,
                "text" to ((m.content as? TextMessage)?.text ?: ""),
                "sentTime" to m.sentTime.toDouble(),
              )
            )
          }
        })

        NCEngine.addConnectionStatusHandler(STATUS_HANDLER_ID, object : ConnectionStatusHandler {
          override fun onConnectionStatusChanged(event: ConnectionStatusChangedEvent) {
            Log.i(TAG, "connection status ${event.status.name}")
            sendEvent("onConnectionStatus", mapOf("status" to event.status.name))
          }
        })

        initialized = true
        Log.i(TAG, "initialized sdk=${NCEngine.getVersion()} area=SG")
        true
      }
    }

    AsyncFunction("connect") { token: String, promise: Promise ->
      if (!initialized) {
        promise.reject("NEXCONN_CONNECT", "initialize() must be called before connect()", null)
        return@AsyncFunction
      }
      NCEngine.connect(ConnectParams(token), object : ConnectHandler {
        override fun onResult(userId: String?, error: NCError?) {
          if (error == null && userId != null) {
            Log.i(TAG, "connect success userId=$userId")
            // Call SDK is initialized only after the Chat SDK connected (official order).
            appContext.reactContext?.applicationContext?.let { initCallEngine(it) }
            promise.resolve(userId)
          } else {
            Log.w(TAG, "connect failed code=${error?.code} message=${error?.message}")
            promise.reject("NEXCONN_CONNECT", "code=${error?.code} ${error?.message ?: "connect failed"}", error)
          }
        }
      })
    }

    AsyncFunction("sendDirectText") { toUserId: String, text: String, promise: Promise ->
      if (!initialized) {
        promise.reject("NEXCONN_SEND", "Nexconn is not initialized", null)
        return@AsyncFunction
      }
      DirectChannel(toUserId).sendMessage(
        SendMessageParams(TextMessage(text)),
        object : SendMessageHandler {
          override fun onAttached(message: Message) {}

          override fun onResult(message: Message?, error: NCError?) {
            if (error == null) {
              Log.i(TAG, "direct message sent id=${message?.messageId} to=$toUserId")
              promise.resolve(message?.messageId)
            } else {
              Log.w(TAG, "direct message failed to=$toUserId code=${error.code} message=${error.message}")
              promise.reject("NEXCONN_SEND", "code=${error.code} ${error.message ?: "send failed"}", error)
            }
          }
        }
      )
    }

    Function("callSdkVersion") {
      try {
        NCCallEngine.getVersion()
      } catch (t: Throwable) {
        null
      }
    }

    Function("callReady") {
      NexconnCallState.ready
    }

    AsyncFunction("startVideoCall") { calleeId: String, dealId: String, promise: Promise ->
      if (!NexconnCallState.ready) {
        promise.reject("NEXCONN_CALL", "call engine is not ready (Nexconn not connected)", null)
        return@AsyncFunction
      }
      // A newer request supersedes a stale one, so a lost SDK callback can never wedge calls.
      synchronized(callLock) {
        pendingStart?.reject("NEXCONN_CALL", "superseded by a newer call", null)
        pendingStart = promise
      }
      try {
        val params = NCCallStartCallParams(listOf(calleeId), NCCallType.SINGLE, NCCallMediaType.AUDIO_VIDEO)
        params.extra = dealId
        NCCallEngine.getInstance().startCall(params)
        Log.i(CALL_TAG, "start call to=$calleeId deal=$dealId")
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "startCall threw: ${t.message}")
        takeStart()?.reject("NEXCONN_CALL", "start call failed: ${t.message}", null)
      }
    }

    AsyncFunction("acceptCall") { callId: String, promise: Promise ->
      if (!NexconnCallState.ready) {
        promise.reject("NEXCONN_CALL", "call engine is not ready", null)
        return@AsyncFunction
      }
      synchronized(callLock) {
        pendingAccept?.reject("NEXCONN_CALL", "superseded by a newer accept", null)
        pendingAccept = promise
      }
      try {
        NCCallEngine.getInstance().acceptCall(NCCallAcceptCallParams(callId))
        Log.i(CALL_TAG, "accept call id=$callId")
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "acceptCall threw: ${t.message}")
        takeAccept()?.reject("NEXCONN_CALL", "accept call failed: ${t.message}", null)
      }
    }

    // Ends (or declines) the given call, or the current call when callId is null.
    AsyncFunction("endCall") { callId: String?, promise: Promise ->
      if (!NexconnCallState.ready) {
        promise.resolve(false)
        return@AsyncFunction
      }
      try {
        val engine = NCCallEngine.getInstance()
        val id = callId ?: engine.currentCallSession?.callId
        if (id == null) {
          promise.resolve(false)
          return@AsyncFunction
        }
        engine.endCall(NCCallEndCallParams(id))
        Log.i(CALL_TAG, "end call id=$id")
        promise.resolve(true)
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "endCall threw: ${t.message}")
        promise.reject("NEXCONN_CALL", "end call failed: ${t.message}", null)
      }
    }

    Function("enableCamera") { on: Boolean ->
      try {
        if (NexconnCallState.ready) NCCallEngine.getInstance().enableCamera(on)
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "enableCamera failed: ${t.message}")
      }
    }

    Function("enableMicrophone") { on: Boolean ->
      try {
        if (NexconnCallState.ready) NCCallEngine.getInstance().enableMicrophone(on)
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "enableMicrophone failed: ${t.message}")
      }
    }

    Function("switchCamera") {
      try {
        if (NexconnCallState.ready) NCCallEngine.getInstance().switchCamera()
      } catch (t: Throwable) {
        Log.w(CALL_TAG, "switchCamera failed: ${t.message}")
      }
    }

    Function("disconnect") {
      if (initialized) {
        NCEngine.disconnect()
        Log.i(TAG, "disconnected")
      }
    }
  }
}
