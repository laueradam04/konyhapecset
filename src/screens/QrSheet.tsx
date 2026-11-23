import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useDB } from '../data/store';
import { fmtRange } from '../logic/temp';

export function measureUrl(deviceId: string): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#/meres/${encodeURIComponent(deviceId)}`;
}

export function QrSheet() {
  const db = useDB();
  const devices = db.devices.filter((d) => d.active);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const idsKey = devices.map((d) => d.id).join(',');

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      idsKey
        .split(',')
        .filter(Boolean)
        .map(async (id) => [id, await QRCode.toDataURL(measureUrl(id), { margin: 1, width: 360, errorCorrectionLevel: 'M' })] as const),
    ).then((entries) => {
      if (!cancelled) setCodes(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return (
    <>
      <div className="no-print">
        <a href="#/beallitasok" className="back">
          Beállítások
        </a>
        <header className="page-head">
          <h1>QR-kódok az eszközökre</h1>
          <p className="muted">
            Nyomtasd ki, vágd szét, és ragaszd mindegyiket a saját hűtőjére. Beolvasva rögtön az adott eszköz mérése nyílik meg.
          </p>
        </header>
        <button type="button" className="button primary" onClick={() => window.print()}>
          Nyomtatás
        </button>
      </div>
      {devices.length === 0 ? (
        <p className="empty">Előbb vegyél fel legalább egy eszközt.</p>
      ) : (
        <div className="qr-grid">
          {devices.map((d) => (
            <figure key={d.id} className="qr-card">
              {codes[d.id] ? <img src={codes[d.id]} alt={`QR-kód: ${d.name} mérése`} /> : <div className="qr-placeholder" />}
              <figcaption>
                <strong>{d.name}</strong>
                <span>{fmtRange(d)}</span>
                <span className="small">Olvasd be, és írd be, amit a hőmérő mutat.</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
