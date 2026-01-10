# Building Fidel AI as an Android APK

## Quick Start (Recommended for Beginners)

### Option 1: PWABuilder (No coding required)
This is the EASIEST way to create an APK:

1. **Deploy your app** to a hosting service:
   - Vercel: https://vercel.com (Recommended)
   - Netlify: https://netlify.com
   - GitHub Pages
   
2. **Go to PWABuilder**: https://www.pwabuilder.com

3. **Enter your deployed URL** and click "Start"

4. **Download APK**:
   - Click "Package for Stores"
   - Select "Android"
   - Choose "Generate" 
   - Download the APK file

5. **Distribute**: Share the APK file directly with users or upload to Google Play Store

---

## Option 2: Capacitor (Advanced - Full Native Features)

### Prerequisites
- Android Studio installed (download from https://developer.android.com/studio)
- Java JDK 17+ installed

### Steps to Build APK

#### 1. Initialize Android Project
```bash
npm run android:init
```

#### 2. Build and Sync
```bash
npm run android:sync
```

#### 3. Open in Android Studio
```bash
npm run android:open
```

#### 4. Build APK in Android Studio
- Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
- APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

#### OR Build via Command Line (if Gradle is set up)
```bash
npm run android:build
```

---

## Quick Commands Reference

| Command | Description |
|---------|-------------|
| `npm run android:init` | Create Android project |
| `npm run android:sync` | Build web app and sync to Android |
| `npm run android:open` | Open project in Android Studio |
| `npm run android:build` | Build APK via command line |

---

## Configuration

### App Details (in `capacitor.config.ts`)
- **App ID**: `com.fidelai.app`
- **App Name**: `Fidel AI`
- **Icon**: Uses `icon.png` from your project

### Customization
Edit `capacitor.config.ts` to change:
- App ID (for Play Store)
- App name
- Splash screen
- Permissions

---

## Distribution

### Direct Distribution (No Play Store)
1. Build the APK
2. Share the `.apk` file via:
   - Google Drive
   - Dropbox
   - Direct download link
   - WhatsApp/Telegram

**Note**: Users need to enable "Install from Unknown Sources" in Android settings

### Google Play Store
1. Create a Google Play Developer account ($25 one-time fee)
2. Build a **signed release APK** (not debug)
3. Upload to Play Console
4. Fill in app details
5. Submit for review

---

## Troubleshooting

### "Android Studio not found"
- Install Android Studio: https://developer.android.com/studio
- Set ANDROID_HOME environment variable

### "Gradle build failed"
- Open Android Studio
- Let it download required SDKs
- Sync Gradle files

### "App crashes on launch"
- Check `capacitor.config.ts` has correct `webDir: 'dist'`
- Run `npm run build` before syncing
- Check Android logs in Android Studio

---

## Next Steps

1. **For quick testing**: Use PWABuilder (Option 1)
2. **For production app**: Use Capacitor (Option 2) with signed release build
3. **Add native features**: Install Capacitor plugins for camera, geolocation, etc.

---

## Support

- Capacitor Docs: https://capacitorjs.com/docs
- PWABuilder Docs: https://docs.pwabuilder.com
- Android Studio Guide: https://developer.android.com/studio/intro
