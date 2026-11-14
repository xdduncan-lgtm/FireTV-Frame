package com.cricket.scoreboard;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private WebView web;

    // Music apps the Music menu offers, in display order (matched by app name).
    private static final String[] MUSIC = {
        "spotify", "amazon music", "pandora", "apple music", "youtube music",
        "iheart", "siriusxm", "tunein", "tidal", "deezer", "soundcloud"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        web.setBackgroundColor(0xFF141C19);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // saves games in progress
        s.setAllowFileAccess(true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient()); // enables the rename dialog
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.requestFocus();
        web.loadUrl("file:///android_asset/index.html");
    }

    /** Lets the page list installed music apps and open one. The app itself never plays audio,
     *  so music started in another app keeps playing when the user comes back here. */
    private class Bridge {
        @JavascriptInterface
        public String musicApps() {
            PackageManager pm = getPackageManager();
            Map<String, String> found = new LinkedHashMap<>();
            for (String cat : new String[]{Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER}) {
                Intent q = new Intent(Intent.ACTION_MAIN).addCategory(cat);
                List<ResolveInfo> list = pm.queryIntentActivities(q, 0);
                for (ResolveInfo r : list) {
                    String pkg = r.activityInfo.packageName;
                    if (pkg.equals(getPackageName()) || found.containsKey(pkg)) continue;
                    String label = String.valueOf(r.loadLabel(pm));
                    if (rank(label) >= 0) found.put(pkg, label);
                }
            }
            List<String[]> apps = new ArrayList<>();
            for (Map.Entry<String, String> e : found.entrySet()) apps.add(new String[]{e.getKey(), e.getValue()});
            Collections.sort(apps, (a, b) -> rank(a[1]) - rank(b[1]));
            JSONArray out = new JSONArray();
            try {
                for (String[] a : apps) out.put(new JSONObject().put("pkg", a[0]).put("label", a[1]));
            } catch (Exception ignored) { }
            return out.toString();
        }

        @JavascriptInterface
        public void openApp(final String pkg) {
            runOnUiThread(() -> {
                PackageManager pm = getPackageManager();
                Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
                if (i == null) i = pm.getLaunchIntentForPackage(pkg);
                if (i != null) {
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try { startActivity(i); } catch (Exception ignored) { }
                }
            });
        }
    }

    private static int rank(String label) {
        String l = label.toLowerCase(Locale.US);
        for (int i = 0; i < MUSIC.length; i++) if (l.contains(MUSIC[i])) return i;
        return -1;
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    // The arrows and OK go straight to the page. Back, Menu and the
    // play/rewind/fast-forward buttons are passed in here.
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        String k = null;
        switch (e.getKeyCode()) {
            case KeyEvent.KEYCODE_MEDIA_REWIND: k = "rewind"; break;
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD: k = "ff"; break;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE: k = "play"; break;
            case KeyEvent.KEYCODE_MENU: k = "menu"; break;
            case KeyEvent.KEYCODE_BACK: k = "back"; break;
        }
        if (k == null) return super.dispatchKeyEvent(e);
        if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) {
            if (k.equals("back")) {
                web.evaluateJavascript("String(window.tvKey ? window.tvKey('back') : false)", v -> {
                    if (v == null || !v.contains("true")) finish();   // Back on the start screen exits
                });
            } else {
                web.evaluateJavascript("window.tvKey && window.tvKey('" + k + "')", null);
            }
        }
        return true;
    }
}
