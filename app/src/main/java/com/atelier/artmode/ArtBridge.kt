package com.atelier.artmode

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.URL
import java.util.Collections
import java.util.concurrent.Executors

/** Methods the web UI can call through `window.Android`. */
class ArtBridge(private val ctx: Context, private val web: WebView, private val host: Host) {

    interface Host {
        fun keepScreenOn(on: Boolean)
        fun exit()
    }

    private val main = Handler(Looper.getMainLooper())
    private val pool = Executors.newFixedThreadPool(4)

    /** Fetches museum API JSON natively (avoids CORS); answers via window.__nativeFetchDone. */
    @JavascriptInterface
    fun httpGet(id: Int, url: String) {
        pool.execute {
            var ok = false
            var body: String
            try {
                val u = URL(url)
                if (u.protocol != "https") throw IOException("Only https is allowed")
                val c = u.openConnection() as HttpURLConnection
                c.connectTimeout = 15000
                c.readTimeout = 25000
                c.instanceFollowRedirects = true
                c.setRequestProperty("User-Agent", "AtelierArtMode/1.0 (Fire TV)")
                c.setRequestProperty("AIC-User-Agent", "AtelierArtMode/1.0 (Fire TV)")
                c.setRequestProperty("Accept", "application/json")
                val code = c.responseCode
                if (code in 200..299) {
                    body = c.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                    ok = true
                } else {
                    body = "HTTP $code"
                }
                c.disconnect()
            } catch (e: Exception) {
                body = e.message ?: "Network error"
            }
            val quoted = JSONObject.quote(body)
                .replace("\u2028", "\\u2028")
                .replace("\u2029", "\\u2029")
            val js = "window.__nativeFetchDone && window.__nativeFetchDone($id,$ok,$quoted)"
            main.post { web.evaluateJavascript(js, null) }
        }
    }

    @JavascriptInterface
    fun listPhotos(): String {
        val arr = JSONArray()
        val files = ArtWeb.photosDir(ctx).listFiles()?.filter { it.isFile }?.sortedByDescending { it.lastModified() }
            ?: emptyList()
        for (f in files) {
            val thumb = File2.thumbFor(ctx, f)
            arr.put(JSONObject().apply {
                put("name", f.name)
                put("url", "/photos/" + f.name)
                put("thumb", if (thumb.exists()) "/thumbs/" + thumb.name else "/photos/" + f.name)
                put("time", f.lastModified())
            })
        }
        return arr.toString()
    }

    @JavascriptInterface
    fun deletePhoto(name: String): Boolean = PhotoStore.delete(ctx, name)

    @JavascriptInterface
    fun uploadUrl(): String = localIp()?.let { "http://$it:${ArtWeb.PORT}" } ?: ""

    @JavascriptInterface
    fun uploadQr(): String {
        val url = uploadUrl()
        if (url.isEmpty()) return ""
        return try {
            val m = QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 420, 420,
                mapOf(EncodeHintType.MARGIN to 1))
            val bmp = Bitmap.createBitmap(m.width, m.height, Bitmap.Config.RGB_565)
            for (x in 0 until m.width) for (y in 0 until m.height) {
                bmp.setPixel(x, y, if (m.get(x, y)) Color.BLACK else Color.WHITE)
            }
            val out = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
            "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        } catch (e: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun setKeepScreenOn(on: Boolean) = host.keepScreenOn(on)

    @JavascriptInterface
    fun exitApp() = host.exit()

    private fun localIp(): String? = try {
        Collections.list(NetworkInterface.getNetworkInterfaces())
            .filter { it.isUp && !it.isLoopback }
            .flatMap { Collections.list(it.inetAddresses) }
            .firstOrNull { it is Inet4Address && it.isSiteLocalAddress }
            ?.hostAddress
    } catch (e: Exception) {
        null
    }
}
