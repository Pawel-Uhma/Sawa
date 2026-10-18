# Wideo demo do pitchu (Remotion)

Film `docs/pitch/wideo/sawa-demo.mp4` (1920×1080, ok. 87 s): intro, prawdziwe `/demo` w telefonie z głosem Sawy (ElevenLabs przez API Sawy) i napisami zdań, zakończenie z mantrą. Plan pitchu: [docs/pitch/plan-pitchu.md](../../docs/pitch/plan-pitchu.md).

1. `npm i`
2. Aplikacja lokalnie z produkcyjnym API: `NEXT_PUBLIC_API_URL=https://api-production-d213.up.railway.app next dev -p 3101` (w `apps/web`).
3. `APP_URL=http://localhost:3101/demo RECORD_MS=112000 node capture.mjs`: Chrome z oknem nagrywa ekran (CDP screencast, 30 kl./s) i zapisuje głos z odtworzeniami w `public/capture/`. Głos trafia też do `audio-cache/`, więc powtórka nie zużywa kredytów ElevenLabs.
4. `node make-cues.mjs`: montaż (wycinki, napisy) w `src/cues.json`.
5. `npx remotion studio` (podgląd) albo `npx remotion render SawaDemo out/sawa-demo.mp4`, potem `ffmpeg -i out/sawa-demo.mp4 -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 192k ../../docs/pitch/wideo/sawa-demo.mp4`.

Nagranie z 17.10 wieczorem powstało z `origin/main` (7684ac6) z dwiema zmianami tylko do filmu: następne miejsce rusza po końcu opowieści (zamiast całej trasy w 90 s) i profil „trochę znam”.
