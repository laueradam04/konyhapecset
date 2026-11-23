import { useState } from 'react';
import type { DeviceKind } from '../data/types';
import { loadDemo, setupKitchen } from '../data/actions';
import { DEFAULT_DEVICES, KINDS, KIND_ORDER } from '../data/defaults';
import { uid } from '../data/store';
import { RangeBar } from '../components';

export function Onboarding() {
  const [mode, setMode] = useState<'welcome' | 'setup'>('welcome');
  return mode === 'welcome' ? <Welcome onSetup={() => setMode('setup')} /> : <Setup onBack={() => setMode('welcome')} />;
}

function Welcome({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="welcome">
      <h1 className="brand">Konyhanapló</h1>
      <p className="lead">
        A hűtők hőmérséklete, a takarítás és az áruátvétel naplója. Telefonról vezetitek, ellenőrzéskor egy gombnyomással kinyomtatod.
      </p>

      <div className="readout is-ok welcome-readout" aria-hidden="true">
        <p className="readout-caption">Hűtő 1 – hús, hal</p>
        <div className="readout-value">
          <span>3,4</span>
          <span className="unit">°C</span>
        </div>
        <RangeBar device={{ min: 0, max: 4 }} value={3.4} />
        <p className="readout-status">Megfelelő érték. Mérte: Kata, 07:31</p>
      </div>

      <ul className="welcome-points">
        <li>QR-kód minden hűtőn: beolvasás, érték beütése, kész.</li>
        <li>Ha egy érték kilóg, a rendszer rákérdez, mit tettetek.</li>
        <li>Havi napló aláírásra készen, hiányzó napok jelölésével.</li>
      </ul>

      <div className="stack">
        <button type="button" className="button primary big" onClick={onSetup}>
          Saját konyha beállítása
        </button>
        <button type="button" className="button big" onClick={loadDemo}>
          Kipróbálom egy kitalált konyhával
        </button>
      </div>
      <p className="small muted">Ebben a változatban az adatok ezen a készüléken maradnak.</p>
    </div>
  );
}

function Setup({ onBack }: { onBack: () => void }) {
  const [unitName, setUnitName] = useState('');
  const [felir, setFelir] = useState('');
  const [staffText, setStaffText] = useState('');
  const [devices, setDevices] = useState(DEFAULT_DEVICES.map((d) => ({ ...d, key: uid() })));
  const [tried, setTried] = useState(false);

  const staffNames = staffText
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
  const validDevices = devices.filter((d) => d.name.trim());

  let error = '';
  if (!unitName.trim()) error = 'Add meg a konyha nevét.';
  else if (staffNames.length === 0) error = 'Írj be legalább egy dolgozót.';
  else if (validDevices.length === 0) error = 'Adj meg legalább egy hűtőt vagy fagyasztót.';

  function setDevice(key: string, patch: Partial<{ name: string; kind: DeviceKind }>) {
    setDevices((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  return (
    <form
      className="stack form setup"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (error) return;
        setupKitchen({ unitName, felir, staffNames, devices: validDevices });
        window.location.hash = '#/';
      }}
    >
      <button type="button" className="back linklike" onClick={onBack}>
        Vissza
      </button>
      <h1>A konyhád beállítása</h1>

      <label className="field">
        <span className="label">A hely neve</span>
        <input type="text" value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="Például: Sarok Büfé" />
      </label>
      <label className="field">
        <span className="label">FELIR-azonosító (nem kötelező)</span>
        <input type="text" value={felir} onChange={(e) => setFelir(e.target.value)} />
      </label>
      <label className="field">
        <span className="label">Dolgozók, soronként egy név</span>
        <textarea rows={3} value={staffText} onChange={(e) => setStaffText(e.target.value)} placeholder={'Kata\nBence'} />
      </label>

      <fieldset className="field plain">
        <legend className="label">Hűtők és fagyasztók</legend>
        <div className="stack">
          {devices.map((d) => (
            <div key={d.key} className="device-line">
              <input
                type="text"
                value={d.name}
                onChange={(e) => setDevice(d.key, { name: e.target.value })}
                aria-label="Eszköz neve"
              />
              <select value={d.kind} onChange={(e) => setDevice(d.key, { kind: e.target.value as DeviceKind })} aria-label="Eszköz típusa">
                {KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {KINDS[k].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button small-button"
                aria-label={`${d.name || 'Eszköz'} eltávolítása`}
                onClick={() => setDevices((list) => list.filter((x) => x.key !== d.key))}
              >
                Kivesz
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button"
            onClick={() => setDevices((list) => [...list, { name: '', kind: 'hűtő', key: uid() }])}
          >
            Még egy eszköz
          </button>
        </div>
        <p className="small muted">A megengedett tartományokat később a beállításokban pontosíthatod.</p>
      </fieldset>

      {tried && error && (
        <p className="notice warn" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button primary big">
        Napló indítása
      </button>
    </form>
  );
}
