# Rencana Implementasi TTS Sesuai File Referensi (Gemini Flash TTS - Sulafat)

Berdasarkan analisis file HTML yang Anda kirimkan, sistem TTS yang digunakan adalah **Gemini Flash Audio/TTS dari Google** (dengan endpoint `gemini-2.5-flash-preview-tts` dan lini resmi terkininya di Google AI Studio `gemini-3.8-flash-lite-tts`). Sistem ini menghasilkan audio narasi beresolusi 24kHz PCM berkualitas tinggi dengan karakter suara spiritual khas Google: **Sulafat**.

---

## 1. Identifikasi & Spesifikasi Model dari File Anda
Dari kode file Anda:
```javascript
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
const payload = {
    contents: [{ parts: [{ text: textPrompt }] }],
    generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Sulafat" } } }
    }
};
```
- **Karakter Suara Utama**: **Sulafat** (Hangat, Tenang & Syahdu).
- **Daftar Suara Pilihan**: `Sulafat`, `Zephyr`, `Kore`, `Aoede`, `Puck`.
- **Gaya Arahan Narasi**: `"Bacakan dengan syahdu, khusyuk dan jelas: ..."`
- **Format Output**: Audio PCM 24kHz / WAV stereo yang dimixing dengan musik latar ambient.

---

## 2. Rencana Implementasi di Aplikasi

### A. Pengaturan Default Suara
- Menetapkan **Sulafat - Gemini AI** sebagai suara bawaan (*default*) di `DEFAULT_SETTINGS` dan dropdown antarmuka pengguna.
- Menyelaraskan daftar karakter suara di UI agar persis dengan file referensi Anda:
  1. `Sulafat (Hangat, Tenang & Syahdu - Rekomendasi Utama)`
  2. `Zephyr (Jernih & Terang)`
  3. `Kore (Wibawa & Mantap)`
  4. `Aoede (Lembut & Khusyuk)`
  5. `Puck (Segar & Dinamis)`
  6. `Google TTS Gratis (Alternatif Bebas Kuota)`
  7. `Browser Offline (Web Speech API)`

### B. Penyempurnaan Server (`server.ts`)
- Memastikan endpoint `/api/tts` memanggil model Gemini Flash TTS (`gemini-3.8-flash-lite-tts` dan fallback `gemini-2.5-flash-preview-tts`) dengan parameter modalitas `AUDIO` dan `prebuiltVoiceConfig`.
- Menyesuaikan format prompt instruksi syahdu: `"Bacakan dengan syahdu, khusyuk dan pelafalan tartil yang jelas:"` persis seperti pada file referensi.
- Mempertahankan ketahanan auto-fallback ke Google Free TTS jika terjadi lonjakan trafik sesaat (503), sehingga proses pembuatan video Shorts HD Anda tidak pernah terhenti.

### C. Dekoder Audio & Sinkronisasi
- Menjamin fungsi `decodeAudioPayload` mengonversi data audio base64 PCM 24kHz langsung menjadi `AudioBuffer` stereo untuk:
  - Pratinjau audio real-time dan gelombang spektrum visual (*live wave visualizer*).
  - Perekaman video Shorts HD 60FPS dengan musik latar ambient dan fade-out 1 detik.

---

## 3. Tahapan Pengujian
1. Verifikasi suara default Sulafat pada pratinjau audio (`previewAudioMix`).
2. Uji seluruh pilihan karakter suara dari file (`Sulafat`, `Zephyr`, `Kore`, `Aoede`, `Puck`).
3. Pastikan ekspor video HD 60FPS berjalan mulus dengan suara Sulafat.
4. Validasi kompilasi kode dengan `compile_applet` dan `lint_applet`.
