# Konyhanapló

Digitális HACCP-napló kis vendéglátóhelyeknek: hűtőhőmérséklet, takarítás, áruátvétel, havi nyomtatható napló. Böngészőben fut, telefonon és tableten is; app telepítése nem kell.

## Mit tud a 0.1-es változat
- **Mérés:** QR-kód minden eszközön, nagy gombos számbillentyűzet (mínusz gombbal a fagyasztóhoz), hőmérő-skála. Tartományon kívüli értéknél kötelező megadni a beavatkozást.
- **Mai áttekintés:** melyik eszköz van kész, hiányzik, vagy van rajta eltérés; napi, heti és havi takarítási feladatok pipálással; ki van műszakban.
- **Áruátvétel:** beszállító, áru, maghőmérséklet, csomagolás, lejárat, átvétel vagy visszautasítás.
- **Havi napló:** napok × eszközök táblázat, hiányzó napok jelölése, eltérések listája, takarítás-összesítő, átvételek, aláírási hely. Nyomtatás vagy PDF egy gombbal (kb. 2 oldal egy hónap).
- **Beállítások:** dolgozók, eszközök határértékekkel, feladatok, QR-lap nyomtatása, mentés letöltése és visszaállítása.
- **Demó mód:** két hétnyi kitalált adat, hogy interjún meg tudd mutatni.

Az adatok ebben a változatban a böngészőben (localStorage) vannak, egy eszközön.

## Futtatás

```bash
npm install
npm run dev      # fejlesztői szerver
npm test         # logika tesztjei
npm run build    # statikus build a dist/ mappába
```

A `dist/` bármilyen statikus tárhelyre feltölthető (Cloudflare Pages, Netlify, GitHub Pages). Hash-alapú útvonalakat használ, ezért külön szerverbeállítás nem kell.

## Felépítés

```
src/
  data/       típusok, alapértékek, tároló (store.ts), műveletek, demó adatok
  logic/      tiszta függvények: hőmérséklet, dátumok, feladat-állapot, havi napló + tesztek
  screens/    Ma, Mérés, Áruátvétel, Napló, Beállítások, QR-lap, első indítás
  components.tsx, styles.css
docs/validacio-kerdesek.md   interjúkérdések vendéglátósoknak
```

## Következő lépések (ha az interjúk igazolják az igényt)
1. **Supabase-tároló:** bejelentkezés a tulajdonosnak, egy konyha több eszközön szinkronban, sorszintű jogosultság (RLS). A `store.ts` felülete erre készült, a képernyőkhöz nem kell nyúlni.
2. **Telepíthető webapp (PWA):** offline mérés, szinkron, amikor van net.
3. **Emlékeztető:** e-mail vagy push, ha délig nincs reggeli mérés.
4. **Tanácsadói fiók:** egy HACCP-tanácsadó több ügyfél konyháját látja, saját logóval.
5. **Előfizetés:** Barion vagy Stripe, havi díj konyhánként.

A határértékek alapértelmezései (hűtő 0–5 °C, fagyasztó −18 °C alatt, melegentartás legalább 63 °C) csak kiindulópontok; mindig a konyha saját HACCP-terve az irányadó.
