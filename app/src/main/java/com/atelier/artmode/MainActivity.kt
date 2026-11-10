package com.atelier.artmode

import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import fi.iki.elonen.NanoHTTPD
import java.io.IOException

class MainActivity : ComponentActivity(), ArtBridge.Host {

    private lateinit var web: WebView
    private var server: UploadServer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = WebView(this)
        ArtWeb.configure(web, this, ArtBridge(this, web, this))
        setContentView(web)
        hideSystemBars()
        web.loadUrl(ArtWeb.url(dream = false))
        web.requestFocus()

        // Back is handled by the web UI (closes menus); it answers false when the app should exit.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("(window.handleBack ? window.handleBack() : false)") { r ->
                    if (r != "true") finish()
                }
            }
        })
    }

    override fun onStart() {
        super.onStart()
        try {
            server = UploadServer(this) {
                runOnUiThread { web.evaluateJavascript("window.onPhotosChanged && window.onPhotosChanged()", null) }
            }.also { it.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false) }
        } catch (e: IOException) {
            Log.w("Atelier", "Upload server could not start", e)
        }
    }

    override fun onStop() {
        server?.stop()
        server = null
        super.onStop()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        hideSystemBars()
        web.evaluateJavascript("window.onAppResume && window.onAppResume()", null)
    }

    override fun onPause() {
        // Stop Atelier's own music so it never plays behind other apps.
        web.evaluateJavascript("window.onAppPause && window.onAppPause()", null)
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    /** Remote buttons the WebView doesn't see: Menu, media keys. */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val cmd = when (event.keyCode) {
            KeyEvent.KEYCODE_MENU -> "menu"
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD, KeyEvent.KEYCODE_MEDIA_NEXT -> "next"
            KeyEvent.KEYCODE_MEDIA_REWIND, KeyEvent.KEYCODE_MEDIA_PREVIOUS -> "prev"
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_PLAY,
            KeyEvent.KEYCODE_MEDIA_PAUSE -> "playpause"
            else -> null
        }
        if (cmd != null) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                web.evaluateJavascript("window.onRemote && window.onRemote('$cmd')", null)
            }
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    override fun keepScreenOn(on: Boolean) = runOnUiThread {
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun exit() = runOnUiThread { finish() }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE)
    }
}
