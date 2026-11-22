package expo.modules.nexconnchat

import ai.nexconn.call.api.NCCallEngine
import ai.nexconn.call.api.model.NCCallRenderMode
import ai.nexconn.call.api.view.NCCallLocalVideoTextureView
import ai.nexconn.call.api.view.NCCallRemoteVideoTextureView
import android.content.Context
import android.util.Log
import android.view.ViewGroup
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/**
 * Hosts one video surface of the current Nexconn call.
 * kind = "local" renders this phone's camera, kind = "remote" renders the stream of [userId].
 * Same setup as the official nexconn-call-sample-android VideoView.kt, but with the SDK's
 * TextureView variants so the small local preview can sit on top of the remote video.
 */
class NexconnCallView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true

  private var kind: String? = null
  private var userId: String? = null
  private var boundRemoteUserId: String? = null

  fun setKind(value: String?) {
    if (value == kind) return
    kind = value
    rebuild()
  }

  fun setUserId(value: String?) {
    if (value == userId) return
    userId = value
    rebuild()
  }

  private fun releaseRemote() {
    val prev = boundRemoteUserId ?: return
    boundRemoteUserId = null
    try {
      NCCallEngine.getInstance().removeVideoView(listOf(prev))
    } catch (t: Throwable) {
      Log.w(CALL_TAG, "removeVideoView failed: ${t.message}")
    }
  }

  private fun rebuild() {
    releaseRemote()
    removeAllViews()
    if (!NexconnCallState.ready) {
      Log.w(CALL_TAG, "video view skipped: call engine not initialized")
      return
    }
    val params = LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    try {
      when (kind) {
        "local" -> {
          val v = NCCallLocalVideoTextureView(context)
          v.setRenderMode(NCCallRenderMode.FILL)
          addView(v, params)
          NCCallEngine.getInstance().setLocalVideoView(v)
          Log.i(CALL_TAG, "local video view attached")
        }
        "remote" -> {
          val uid = userId
          if (uid.isNullOrEmpty()) return
          val v = NCCallRemoteVideoTextureView(context, uid, false)
          v.setRenderMode(NCCallRenderMode.FILL)
          addView(v, params)
          NCCallEngine.getInstance().setRemoteVideoView(listOf(v))
          boundRemoteUserId = uid
          Log.i(CALL_TAG, "remote video view attached user=$uid")
        }
      }
    } catch (t: Throwable) {
      Log.w(CALL_TAG, "video view setup failed kind=$kind: ${t.message}")
    }
  }

  override fun onDetachedFromWindow() {
    releaseRemote()
    super.onDetachedFromWindow()
  }
}
