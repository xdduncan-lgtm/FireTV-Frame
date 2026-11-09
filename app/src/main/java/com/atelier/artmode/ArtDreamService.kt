package com.atelier.artmode

import android.os.Handler
import android.os.Looper
import android.service.dreams.DreamService
import android.webkit.WebView

/** Screensaver: shows your art whenever the Fire TV goes idle, the closest thing to "TV off, art on". */
class ArtDreamService : DreamService(), ArtBridge.Host {

    private var web: WebView? = null
    private val main = Handler(Looper.getMainLooper())

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        isInteractive = false
        isFullscreen = true
        isScreenBright = true
        val w = WebView(this)
        ArtWeb.configure(w, this, ArtBridge(this, w, this))
        setContentView(w)
        w.loadUrl(ArtWeb.url(dream = true))
        web = w
    }

    override fun onDetachedFromWindow() {
        web?.destroy()
        web = null
        super.onDetachedFromWindow()
    }

    override fun keepScreenOn(on: Boolean) {}
    override fun exit() { main.post { finish() } }
}
