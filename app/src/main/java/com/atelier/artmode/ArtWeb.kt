package com.atelier.artmode

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import java.io.File

/** Shared WebView setup for the app and the screensaver. */
object ArtWeb {
    const val PORT = 8765
    private const val HOST = "appassets.androidplatform.net"

    fun photosDir(c: Context) = File(c.filesDir, "photos").apply { mkdirs() }
    fun thumbsDir(c: Context) = File(c.filesDir, "thumbs").apply { mkdirs() }

    fun url(dream: Boolean) = "https://$HOST/assets/web/index.html" + if (dream) "#dream" else ""

    @SuppressLint("SetJavaScriptEnabled")
    fun configure(web: WebView, ctx: Context, bridge: ArtBridge) {
        val loader = WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(ctx))
            .addPathHandler("/photos/", WebViewAssetLoader.InternalStoragePathHandler(ctx, photosDir(ctx)))
            .addPathHandler("/thumbs/", WebViewAssetLoader.InternalStoragePathHandler(ctx, thumbsDir(ctx)))
            .build()

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        web.setBackgroundColor(Color.BLACK)
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        web.isVerticalScrollBarEnabled = false
        web.isHorizontalScrollBarEnabled = false
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)
        }
        web.addJavascriptInterface(bridge, "Android")
    }
}
