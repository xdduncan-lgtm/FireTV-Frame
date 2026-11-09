package com.atelier.artmode

import android.content.Context
import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoHTTPD.IHTTPSession
import fi.iki.elonen.NanoHTTPD.Method
import fi.iki.elonen.NanoHTTPD.Response
import java.io.File

/**
 * Tiny web server on the local network. Open http://<tv-ip>:8765 on a phone
 * to send photos to the TV, like sending pictures to a frame from your phone.
 */
class UploadServer(private val ctx: Context, private val onChange: () -> Unit) : NanoHTTPD(ArtWeb.PORT) {

    override fun serve(session: IHTTPSession): Response = try {
        when {
            session.method == Method.GET && (session.uri == "/" || session.uri == "/index.html") -> {
                val html = ctx.assets.open("web/upload.html").bufferedReader().use { it.readText() }
                NanoHTTPD.newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8", html)
            }
            session.method == Method.POST && session.uri == "/upload" -> upload(session)
            session.method == Method.GET && session.uri == "/status" -> {
                val n = ArtWeb.photosDir(ctx).listFiles()?.size ?: 0
                json("{\"ok\":true,\"count\":$n}")
            }
            else -> NanoHTTPD.newFixedLengthResponse(Response.Status.NOT_FOUND, NanoHTTPD.MIME_PLAINTEXT, "Not found")
        }
    } catch (e: Exception) {
        NanoHTTPD.newFixedLengthResponse(Response.Status.INTERNAL_ERROR, NanoHTTPD.MIME_PLAINTEXT, e.message ?: "Error")
    }

    private fun upload(s: IHTTPSession): Response {
        val files = HashMap<String, String>()
        s.parseBody(files)
        val tmp = files["photo"]?.let { File(it) }
            ?: return NanoHTTPD.newFixedLengthResponse(Response.Status.BAD_REQUEST, NanoHTTPD.MIME_PLAINTEXT, "No photo in request")
        val original = s.parameters["photo"]?.firstOrNull() ?: "photo.jpg"
        val name = PhotoStore.save(ctx, tmp, original)
            ?: return NanoHTTPD.newFixedLengthResponse(Response.Status.BAD_REQUEST, NanoHTTPD.MIME_PLAINTEXT, "That file isn't an image the TV can read")
        onChange()
        return json("{\"ok\":true,\"name\":\"$name\"}")
    }

    private fun json(body: String) =
        NanoHTTPD.newFixedLengthResponse(Response.Status.OK, "application/json", body)
}
