# FOCVS — Deep Work Soundscapes

App mobile alternativa a Brain.fm / Headspace Focus.  
Zero abbonamenti. Tutto locale. Suoni generati proceduralmente via Web Audio API.

## Funzionalità

- 🎵 **8 Soundscapes** — Rain, Brown Noise, White Noise, Café, Foresta, Fuoco, Oceano, Tastiera
- 🎚 **Mixer** — volume indipendente per ogni canale
- 🧠 **Binaural Beats** — Delta / Theta / Alpha / Beta / Gamma
- ⏱ **Timer Pomodoro** — 25 / 45 / 60 / 90 min + modalità libera
- 📍 **Tracciamento sessioni** — 4 sessioni per ciclo

---

## Come buildare

### Prerequisiti
- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Account Expo (gratuito) → https://expo.dev

### 1. Installa dipendenze
```bash
npm install
```

### 2. Test rapido sul telefono (senza build)
```bash
npx expo start
```
Poi scansiona il QR code con l'app **Expo Go** (iOS/Android).

---

### 3. Build per Android (.apk / .aab)

```bash
# Installa EAS CLI
npm install -g eas-cli

# Login
eas login

# Configura (solo la prima volta)
eas build:configure

# Build APK per installazione diretta
eas build -p android --profile preview
```

Il file `.apk` verrà scaricato e puoi installarlo direttamente sul telefono.

---

### 4. Build per iOS

Richiede macOS + Xcode, oppure un Apple Developer Account ($99/anno).

```bash
eas build -p ios --profile preview
```

Per testare senza pagare: usa **Expo Go** su iOS.

---

## Struttura progetto

```
focvs-app/
├── App.js          ← tutta l'app (UI + logica)
├── app.json        ← configurazione Expo
├── assets/         ← icone e splash screen
└── package.json
```

## Note tecniche

L'audio viene generato tramite **Web Audio API** in una WebView nascosta.  
Nessun file audio, nessuna dipendenza esterna — tutto sintetizzato in real-time.

Per l'audio in background su iOS, è già configurato `UIBackgroundModes: ["audio"]` in `app.json`.
# biblio
# focvs
