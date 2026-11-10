# Atelier: Art Mode for Fire TV

A Fire TV app that turns your TV into a framed artwork, modelled on how Samsung's Frame TV Art Mode works: an Art Store of collections, your own photos, digital mats in several styles and colours, brightness and colour-tone controls, a slideshow, sleep timer and night dimming.

All artwork comes from free, open-access museum programmes (public domain / CC0):
the Art Institute of Chicago, the Cleveland Museum of Art and The Metropolitan Museum of Art. No API keys needed.

## Build the APK with GitHub (no software needed)

1. Create a free GitHub account and a new **public** repository.
2. On the repository page choose "uploading an existing file" and drag in everything from the unzipped folder. On a Mac, press Cmd+Shift+. in Finder so the hidden `.github` folder is visible and gets uploaded too.
3. Commit. The Actions tab shows the build running (about 4 minutes).
4. The finished APK is always at:
   `https://github.com/YOUR-USERNAME/YOUR-REPO/releases/latest/download/Atelier.apk`
5. On the Fire TV, open the Downloader app, type that address, and install.

Every build is signed with the same key (app/atelier.keystore), so new builds install straight over the old one.

## Build the APK with Android Studio

1. Install Android Studio (Koala or newer).
2. File > Open, choose this `Atelier` folder. Let Gradle sync (first sync downloads Gradle 8.7 and the Android SDK 34).
3. Build > Build App Bundle(s) / APK(s) > Build APK(s).
   The APK lands in `app/build/outputs/apk/debug/app-debug.apk`.

Command line alternative: `./gradlew assembleDebug` (needs JDK 17 and `ANDROID_HOME` set).

## Install on the Fire TV

1. On the Fire TV: Settings > My Fire TV > About, click the device name 7 times to unlock Developer Options.
2. Settings > My Fire TV > Developer Options: turn on ADB debugging (and Apps from Unknown Sources / install unknown apps).
3. Find the TV's IP: Settings > My Fire TV > About > Network.
4. From your computer:
   ```
   adb connect 192.168.1.50
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
   Accept the prompt on the TV the first time.

No computer handy? Upload the APK somewhere you can reach by URL and install it with the free Downloader app on the Fire TV.

Atelier then appears under Your Apps & Channels. Press and hold the Home button > Apps to move it to the front row.

## Try it on your computer first

Double-click `simulator.html` to open it in Chrome or Edge. It is a single self-contained file, so it works from any folder. (After changing the web app, rebuild it with `python tools/build-simulator.py`.) It runs the real app on a virtual TV on a wall, with a clickable Fire TV remote, a room-light slider, and a button to try your own photos. Make changes, check them in the simulator, then upload to GitHub.

## Using it

Remote in Art Mode:
- OK, Up or Menu: open the menu
- Left / Right (or rewind / fast-forward): previous / next artwork
- Down: show title and artist
- Play/Pause: pause or resume the slideshow
- Back twice: leave Art Mode

Menu tabs:
- Art Store: 13 curated collections plus search across the museum archives. Open any work to preview it on a mat, pick a mat style and colour for that work, favourite it, or put it on the wall. Each collection has Play this collection.
- My Photos: choose Add from phone, scan the QR code (phone must be on the same Wi-Fi), pick photos and tap Send. They're resized to 4K on the phone and appear on the TV within seconds.
- Favourites: your own gallery.
- Music: free background music in nine styles (classical, solo piano, jazz, ambient, chill and lo-fi, acoustic and folk, lounge, hymns and worship, easy listening) from free internet radio, with automatic fallback to another station if one is down. Or choose Spotify, Amazon Music or Apple Music: Atelier opens the app, you start your music, then return to Atelier and it keeps playing while Atelier stays silent.
- Settings: brightness, colour tone (cool to warm), matte finish, frame bezel, default mat, slideshow interval, play from, order, art info, sleep after, night mode.

Mat styles: None (full screen), Modern, Shadowbox, Panoramic, Triptych, Mix (three works together). Twelve mat colours. Mats are remembered per artwork.

Frame bezel draws a white, beige, teak, walnut or black picture-frame border on screen, for TVs that don't have one physically.

## Make it the screensaver (closest to "TV off, art on")

Atelier includes a screensaver service. Fire OS doesn't offer a menu to pick third-party screensavers, but you can set it over ADB:

```
adb shell settings put secure screensaver_components com.atelier.artmode/.ArtDreamService
```

To restore Amazon's screensaver:
```
adb shell settings put secure screensaver_components com.amazon.bueller.photos/.daydream.ScreenSaverService
```
Fire OS updates sometimes reset this setting; just run the command again. The screensaver uses your current art, mats, favourites and slideshow settings (it rotates every 10 minutes if Change every is off).

## What can't be copied from the real thing

- No motion or light sensor, so brightness doesn't adapt to the room automatically. Use Night mode and the Brightness setting instead.
- The Frame's physical matte anti-glare panel can't be reproduced in software; the Matte finish setting adds a subtle canvas grain and soft light to reduce the "screen" look.
- Fire TV can't keep the panel in a low-power always-on art state; the Sleep after setting blanks the art and lets the Fire TV sleep normally.
- Phone upload needs the phone and TV on the same network, and the Atelier app open on the TV.

## Project layout

```
app/src/main/java/com/atelier/artmode/
  MainActivity.kt      WebView host, remote buttons, Back handling, upload server lifecycle
  ArtWeb.kt            Shared WebView setup (serves the UI and your photos)
  ArtBridge.kt         JavaScript bridge: museum API fetches, photo list, QR code, screen-on control
  UploadServer.kt      Local web server for phone uploads (port 8765)
  PhotoStore.kt        Saves photos, converts HEIC, builds rotated thumbnails
  ArtDreamService.kt   Screensaver
app/src/main/assets/web/
  index.html, styles.css, app.js   The TV interface
  upload.html                      The page your phone opens
```

The TV interface is plain HTML/JS, so you can also open `app/src/main/assets/web/index.html` from a local web server in a desktop browser to tweak the look (arrow keys, Enter, Esc). Photo upload only works inside the Fire TV app.
