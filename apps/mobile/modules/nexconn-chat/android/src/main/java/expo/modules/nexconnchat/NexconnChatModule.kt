package expo.modules.nexconnchat

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
import android.util.Log
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "NexconnChat"
private const val MESSAGE_HANDLER_ID = "MudraMessageHandler"
private const val STATUS_HANDLER_ID = "MudraConnectionHandler"

/**
 * Thin Expo bridge over the Nexconn Android Chat SDK (ai.nexconn.chat:chat).
 * Exposes initialize / connect / sendDirectText / disconnect and forwards
 * received messages and connection-status changes to JavaScript as events.
 */
class NexconnChatModule : Module() {
  @Volatile private var initialized = false

  override fun definition() = ModuleDefinition {
    Name("NexconnChat")

    Events("onMessage", "onConnectionStatus")

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

    Function("disconnect") {
      if (initialized) {
        NCEngine.disconnect()
        Log.i(TAG, "disconnected")
      }
    }
  }
}
