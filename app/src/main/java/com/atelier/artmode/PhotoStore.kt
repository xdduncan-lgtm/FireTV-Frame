package com.atelier.artmode

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object File2 {
    fun thumbFor(ctx: Context, photo: File) =
        File(ArtWeb.thumbsDir(ctx), photo.name.substringBeforeLast('.') + ".jpg")
}

/** Saves photos sent from a phone and makes small thumbnails for the grid. */
object PhotoStore {
    private val webSafe = setOf("jpg", "jpeg", "png", "webp", "gif")

    /** Returns the saved file name, or null if the upload is not a readable image. */
    fun save(ctx: Context, src: File, originalName: String): String? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(src.path, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        val ext = originalName.substringAfterLast('.', "jpg").lowercase(Locale.US)
        val base = "IMG_" + SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date()) +
            "_" + (1000..9999).random()
        val dir = ArtWeb.photosDir(ctx)

        val dest: File
        if (ext in webSafe) {
            dest = File(dir, "$base.$ext")
            src.copyTo(dest, overwrite = true)
        } else {
            // HEIC and other formats the WebView can't show: convert to JPEG.
            val bmp = decode(src, 3840) ?: return null
            dest = File(dir, "$base.jpg")
            FileOutputStream(dest).use { bmp.compress(Bitmap.CompressFormat.JPEG, 92, it) }
            bmp.recycle()
        }
        makeThumb(dest, File2.thumbFor(ctx, dest))
        return dest.name
    }

    fun delete(ctx: Context, name: String): Boolean {
        val dir = ArtWeb.photosDir(ctx)
        val f = File(dir, name)
        if (!f.canonicalPath.startsWith(dir.canonicalPath + File.separator)) return false
        File2.thumbFor(ctx, f).delete()
        return f.delete()
    }

    private fun makeThumb(photo: File, out: File) {
        val bmp = decode(photo, 640) ?: return
        FileOutputStream(out).use { bmp.compress(Bitmap.CompressFormat.JPEG, 85, it) }
        bmp.recycle()
    }

    /** Decodes with downsampling so the long edge is at most ~maxEdge, honouring EXIF rotation. */
    private fun decode(f: File, maxEdge: Int): Bitmap? {
        val b = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(f.path, b)
        var sample = 1
        while (maxOf(b.outWidth, b.outHeight) / (sample * 2) >= maxEdge) sample *= 2
        val bmp = BitmapFactory.decodeFile(f.path, BitmapFactory.Options().apply { inSampleSize = sample })
            ?: return null
        val deg = try {
            when (ExifInterface(f.path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }
        } catch (e: Exception) { 0f }
        if (deg == 0f) return bmp
        val rotated = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, Matrix().apply { postRotate(deg) }, true)
        if (rotated != bmp) bmp.recycle()
        return rotated
    }
}
