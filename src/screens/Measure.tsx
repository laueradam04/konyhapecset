import { useCallback, useEffect, useRef, useState } from 'react';
import type { TempLog } from '../data/types';
import { setCurrentStaff, useCurrentStaff, useDB } from '../data/store';
import { addTempLog } from '../data/actions';
import { ACTIONS, OTHER_ACTION } from '../data/defaults';
import { DeviceRows, Icon, RangeBar, StaffPicker, useNow } from '../components';
import { applyKey, fmtRange, fmtTemp, inRange, parseReading } from '../logic/temp';
import { deviceToday } from '../logic/tasks';
import { fmtTime } from '../logic/dates';

export function MeasurePick() {
  const db = useDB();
  const now = useNow();
  return (
    <>
      <header className="page-head">
        <h1>Mérés</h1>
        <p className="muted">
          Válaszd ki az eszközt, vagy olvasd be a rajta lévő QR-kódot a telefon kamerájával.
        </p>
      </header>
      <DeviceRows db={db} now={now} />
    </>
  );
}

const KEYS: { k: string; area: string; label: string; aria?: string }[] = [
  { k: '7', area: 'k7', label: '7' },
  { k: '8', area: 'k8', label: '8' },
  { k: '9', area: 'k9', label: '9' },
  { k: 'del', area: 'del', label: 'Törlés', aria: 'Utolsó számjegy törlése' },
  { k: '4', area: 'k4', label: '4' },
  { k: '5', area: 'k5', label: '5' },
  { k: '6', area: 'k6', label: '6' },
  { k: '1', area: 'k1', label: '1' },
  { k: '2', area: 'k2', label: '2' },
  { k: '3', area: 'k3', label: '3' },
  { k: '±', area: 'sign', label: 'Mínusz', aria: 'Előjel váltása (fagyasztóhoz)' },
  { k: '0', area: 'k0', label: '0' },
  { k: ',', area: 'dec', label: ',', aria: 'Tizedesvessző' },
];

export function Measure({ id }: { id: string }) {
  const db = useDB();
  const shiftStaff = useCurrentStaff();
  const device = db.devices.find((d) => d.id === id);

  const [raw, setRaw] = useState('');
  const [staffId, setStaffId] = useState(shiftStaff);
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<TempLog | null>(null);

  const value = parseReading(raw);
  const ok = device && value !== null ? inRange(value, device) : false;
  const out = value !== null && !ok;
  const needsNote = out && action === OTHER_ACTION && !note.trim();

  let missing = '';
  if (value === null) missing = 'Írd be a hőmérőn látott értéket.';
  else if (!staffId) missing = 'Jelöld meg, ki mért.';
  else if (out && !action) missing = 'Válaszd ki, mit tettél az eltérés miatt.';
  else if (needsNote) missing = 'Írd le röviden, mit tettél.';
  const canSave = !missing;

  const press = useCallback((k: string) => setRaw((r) => applyKey(r, k)), []);

  const save = useCallback(() => {
    if (!device || value === null || !canSave) return;
    const log = addTempLog(
      { deviceId: device.id, value, staffId, action: out ? action : undefined, note: note.trim() || undefined },
      device,
    );
    setCurrentStaff(staffId);
    setSaved(log);
  }, [device, value, canSave, staffId, out, action, note]);

  // Fizikai billentyűzet (laptop, tablet billentyűzettel)
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (saved) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === ',' || e.key === '.') press(',');
      else if (e.key === '-') press('±');
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') saveRef.current();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, saved]);

  if (!device) {
    return (
      <div className="stack">
        <h1>Nincs ilyen eszköz</h1>
        <p>Lehet, hogy ezt a QR-kódot egy azóta törölt eszközhöz nyomtattátok.</p>
        <a className="button primary" href="#/meres">
          Eszköz kiválasztása
        </a>
      </div>
    );
  }

  if (saved) {
    const now = new Date();
    const next = db.devices.find((d) => d.active && d.id !== device.id && deviceToday(d, db.tempLogs, now).state !== 'ok');
    return (
      <div className="saved">
        <div className={`saved-badge${saved.ok ? '' : ' is-alarm'}`} aria-hidden="true">
          {saved.ok ? <Icon.check /> : <Icon.alert />}
        </div>
        <h1>{saved.ok ? 'Mérés mentve' : 'Mentve, eltéréssel'}</h1>
        <p className="saved-line">
          {device.name}: <strong>{fmtTemp(saved.value)}</strong>, {fmtTime(saved.at)}
        </p>
        {!saved.ok && (
          <p className="notice alarm">
            Eltérés rögzítve. Beavatkozás: {saved.action}
            {saved.note ? ` (${saved.note})` : ''}. Mérd újra, amint lehet.
          </p>
        )}
        <div className="stack">
          {next ? (
            <a className="button primary big" href={`#/meres/${next.id}`}>
              Következő: {next.name}
            </a>
          ) : (
            <p className="notice ok">Ma minden eszközt megmértetek.</p>
          )}
          <a className="button big" href="#/">
            Vissza a mai naplóhoz
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="measure">
      <a href="#/meres" className="back">
        Másik eszköz
      </a>
      <header className="page-head">
        <h1>{device.name}</h1>
        <p className="muted">Megengedett: {fmtRange(device)}</p>
      </header>

      <div className={`readout${out ? ' is-alarm' : ok ? ' is-ok' : ''}`}>
        <p className="readout-caption">{device.name}</p>
        <div className="readout-value" aria-live="polite" aria-label={value === null ? 'Nincs érték' : fmtTemp(value)}>
          <span className={raw ? '' : 'readout-empty'}>{raw ? raw.replace('-', '−') : '––,–'}</span>
          <span className="unit">°C</span>
        </div>
        <RangeBar device={device} value={value} />
        <p className="readout-status">
          {value === null
            ? 'Írd be, amit a hőmérő mutat.'
            : ok
              ? 'Megfelelő érték.'
              : value > device.max
                ? 'Túl meleg, kívül esik a megengedett tartományon.'
                : 'Túl hideg, kívül esik a megengedett tartományon.'}
        </p>
      </div>

      <div className="keypad">
        {KEYS.map((key) => (
          <button
            key={key.k}
            type="button"
            className={`key key-${key.area}`}
            style={{ gridArea: key.area }}
            aria-label={key.aria ?? key.label}
            onClick={() => press(key.k)}
          >
            {key.label}
          </button>
        ))}
      </div>

      <StaffPicker value={staffId} onChange={setStaffId} label="Ki mért?" />

      {out && (
        <fieldset className="corrective">
          <legend>Mit tettél az eltérés miatt?</legend>
          <div className="choice-list">
            {ACTIONS.map((a) => (
              <label key={a} className="choice">
                <input type="radio" name="action" value={a} checked={action === a} onChange={() => setAction(a)} />
                <span>{a}</span>
              </label>
            ))}
          </div>
          <label className="field">
            <span className="label">Megjegyzés {action === OTHER_ACTION ? '' : '(nem kötelező)'}</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Például: melyik árut érintette" />
          </label>
        </fieldset>
      )}

      <div className="save-area">
        <button type="button" className="button primary big" disabled={!canSave} onClick={save}>
          Mérés mentése
        </button>
        {missing && raw !== '' && <p className="small muted hint">{missing}</p>}
      </div>
    </div>
  );
}
