import { useRef, useState } from 'react';
import type { Device, DeviceKind, Frequency } from '../data/types';
import { isValidDB, useDB } from '../data/store';
import { addStaff, addTask, replaceAll, resetAll, saveSettings, updateStaff, updateTask, upsertDevice } from '../data/actions';
import { FREQ_LABEL, KINDS, KIND_ORDER } from '../data/defaults';
import { ConfirmButton } from '../components';
import { fmtRange, parseReading, toInput } from '../logic/temp';
import { dayKey } from '../logic/dates';

export function Settings() {
  return (
    <>
      <header className="page-head">
        <h1>Beállítások</h1>
      </header>
      <KitchenForm />
      <StaffSection />
      <DeviceSection />
      <TaskSection />
      <DataSection />
    </>
  );
}

function KitchenForm() {
  const db = useDB();
  const s = db.settings!;
  const [unitName, setUnitName] = useState(s.unitName);
  const [felir, setFelir] = useState(s.felir);
  const [address, setAddress] = useState(s.address);
  const [saved, setSaved] = useState(false);
  const dirty = unitName !== s.unitName || felir !== s.felir || address !== s.address;

  return (
    <section className="block" aria-labelledby="h-kitchen">
      <h2 id="h-kitchen">A konyha adatai</h2>
      <p className="small muted">Ezek kerülnek a havi napló fejlécére.</p>
      <form
        className="stack form panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!unitName.trim()) return;
          saveSettings({ unitName: unitName.trim(), felir: felir.trim(), address: address.trim() });
          setSaved(true);
        }}
      >
        <label className="field">
          <span className="label">Név</span>
          <input type="text" value={unitName} onChange={(e) => { setUnitName(e.target.value); setSaved(false); }} required />
        </label>
        <label className="field">
          <span className="label">FELIR-azonosító</span>
          <input type="text" value={felir} onChange={(e) => { setFelir(e.target.value); setSaved(false); }} />
        </label>
        <label className="field">
          <span className="label">Cím</span>
          <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); setSaved(false); }} />
        </label>
        <div className="inline">
          <button type="submit" className="button primary" disabled={!dirty || !unitName.trim()}>
            Adatok mentése
          </button>
          {saved && !dirty && <span className="small muted" role="status">Mentve.</span>}
        </div>
      </form>
    </section>
  );
}

function StaffSection() {
  const db = useDB();
  const [name, setName] = useState('');
  return (
    <section className="block" aria-labelledby="h-staff">
      <h2 id="h-staff">Dolgozók</h2>
      <ul className="rows">
        {db.staff.map((s) => (
          <li key={s.id} className="row static">
            <span className={s.active ? '' : 'muted'}>
              {s.name}
              {s.active ? '' : ' (már nem dolgozik itt)'}
            </span>
            <button type="button" className="button small-button" onClick={() => updateStaff(s.id, { active: !s.active })}>
              {s.active ? 'Kivétel a listából' : 'Visszavétel'}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="inline add-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addStaff(name);
          setName('');
        }}
      >
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Új dolgozó neve" aria-label="Új dolgozó neve" />
        <button type="submit" className="button" disabled={!name.trim()}>
          Hozzáadás
        </button>
      </form>
      <p className="small muted">A régi dolgozók neve a korábbi bejegyzéseknél megmarad.</p>
    </section>
  );
}

function DeviceSection() {
  const db = useDB();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="block" aria-labelledby="h-devices">
      <div className="block-head">
        <h2 id="h-devices">Hűtők és eszközök</h2>
        <a href="#/qr" className="button small-button">
          QR-kódok nyomtatása
        </a>
      </div>
      <ul className="rows">
        {db.devices.map((d) =>
          editing === d.id ? (
            <li key={d.id} className="editor-row">
              <DeviceEditor initial={d} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={d.id} className="row static">
              <span className="row-main">
                <strong className={d.active ? '' : 'muted'}>
                  {d.name}
                  {d.active ? '' : ' (nem használt)'}
                </strong>
                <span className="small muted">
                  {KINDS[d.kind].label}, {fmtRange(d)}, naponta {d.checksPerDay} mérés
                </span>
              </span>
              <button type="button" className="button small-button" onClick={() => setEditing(d.id)}>
                Szerkesztés
              </button>
            </li>
          ),
        )}
        {editing === 'new' && (
          <li className="editor-row">
            <DeviceEditor onDone={() => setEditing(null)} />
          </li>
        )}
      </ul>
      {editing !== 'new' && (
        <button type="button" className="button add-row" onClick={() => setEditing('new')}>
          Új eszköz
        </button>
      )}
      <p className="small muted">
        Az alapértékek csak kiindulópontok: a konyhád HACCP-tervében szereplő határokat állítsd be.
      </p>
    </section>
  );
}

function DeviceEditor({ initial, onDone }: { initial?: Device; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<DeviceKind>(initial?.kind ?? 'hűtő');
  const [min, setMin] = useState(toInput(initial?.min ?? KINDS['hűtő'].min));
  const [max, setMax] = useState(toInput(initial?.max ?? KINDS['hűtő'].max));
  const [checks, setChecks] = useState<1 | 2>(initial?.checksPerDay ?? KINDS['hűtő'].checksPerDay);
  const [active, setActive] = useState(initial?.active ?? true);
  const [tried, setTried] = useState(false);

  function changeKind(k: DeviceKind) {
    setKind(k);
    setMin(toInput(KINDS[k].min));
    setMax(toInput(KINDS[k].max));
    setChecks(KINDS[k].checksPerDay);
  }

  const minN = parseReading(min);
  const maxN = parseReading(max);
  let error = '';
  if (!name.trim()) error = 'Adj nevet az eszköznek, például „Hűtő 1 – hús”.';
  else if (minN === null || maxN === null) error = 'A határértékek legyenek számok, például -18 vagy 4,5.';
  else if (minN >= maxN) error = 'Az alsó határ legyen kisebb a felsőnél.';

  return (
    <form
      className="stack form"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (error || minN === null || maxN === null) return;
        upsertDevice({ id: initial?.id, name: name.trim(), kind, min: minN, max: maxN, checksPerDay: checks, active });
        onDone();
      }}
    >
      <label className="field">
        <span className="label">Név</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Például: Hűtő 1 – hús" />
      </label>
      <label className="field">
        <span className="label">Típus</span>
        <select value={kind} onChange={(e) => changeKind(e.target.value as DeviceKind)}>
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {KINDS[k].label}
            </option>
          ))}
        </select>
      </label>
      <div className="two-col">
        <label className="field">
          <span className="label">Alsó határ, °C</span>
          <input type="text" value={min} onChange={(e) => setMin(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Felső határ, °C</span>
          <input type="text" value={max} onChange={(e) => setMax(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span className="label">Mérések naponta</span>
        <select value={checks} onChange={(e) => setChecks(Number(e.target.value) as 1 | 2)}>
          <option value={1}>1 (reggel)</option>
          <option value={2}>2 (reggel és délután)</option>
        </select>
      </label>
      {initial && (
        <label className="choice">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span>Használatban van</span>
        </label>
      )}
      {tried && error && (
        <p className="notice warn" role="alert">
          {error}
        </p>
      )}
      <div className="inline">
        <button type="submit" className="button primary">
          {initial ? 'Változások mentése' : 'Eszköz hozzáadása'}
        </button>
        <button type="button" className="button" onClick={onDone}>
          Mégse
        </button>
      </div>
    </form>
  );
}

function TaskSection() {
  const db = useDB();
  const [title, setTitle] = useState('');
  const [freq, setFreq] = useState<Frequency>('napi');
  return (
    <section className="block" aria-labelledby="h-tasklist">
      <h2 id="h-tasklist">Takarítási feladatok</h2>
      <ul className="rows">
        {db.tasks.map((t) => (
          <li key={t.id} className="row static">
            <span className="row-main">
              <span className={t.active ? '' : 'muted'}>{t.title}</span>
              <span className="small muted">
                {FREQ_LABEL[t.frequency]}
                {t.active ? '' : ', szünetel'}
              </span>
            </span>
            <button type="button" className="button small-button" onClick={() => updateTask(t.id, { active: !t.active })}>
              {t.active ? 'Szüneteltetés' : 'Újraindítás'}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="stack add-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          addTask(title, freq);
          setTitle('');
        }}
      >
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Új feladat, például: sütő tisztítása" aria-label="Új feladat" />
        <div className="inline">
          <select value={freq} onChange={(e) => setFreq(e.target.value as Frequency)} aria-label="Gyakoriság">
            <option value="napi">Naponta</option>
            <option value="heti">Hetente</option>
            <option value="havi">Havonta</option>
          </select>
          <button type="submit" className="button" disabled={!title.trim()}>
            Hozzáadás
          </button>
        </div>
      </form>
    </section>
  );
}

function DataSection() {
  const db = useDB();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  function exportJson() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `konyhanaplo-mentes-${dayKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importJson(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isValidDB(parsed) || !parsed.settings) {
        setMsg('Ez a fájl nem Konyhanapló-mentés. Válaszd a „Mentés letöltése” gombbal készült fájlt.');
        return;
      }
      replaceAll(parsed);
      setMsg('Visszaállítva a mentésből.');
    } catch {
      setMsg('A fájlt nem sikerült beolvasni. Válaszd a „Mentés letöltése” gombbal készült fájlt.');
    }
  }

  return (
    <section className="block" aria-labelledby="h-data">
      <h2 id="h-data">Adatok</h2>
      <p className="small muted">
        Ez a változat az adatokat csak ezen a készüléken, a böngészőben tárolja. Hetente tölts le mentést.
      </p>
      <div className="stack panel">
        <button type="button" className="button" onClick={exportJson}>
          Mentés letöltése
        </button>
        <button type="button" className="button" onClick={() => fileRef.current?.click()}>
          Visszaállítás mentésből
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importJson(f);
            e.target.value = '';
          }}
        />
        {msg && (
          <p className="small" role="status">
            {msg}
          </p>
        )}
        <ConfirmButton
          label="Minden adat törlése"
          question="Minden mérés, feladat és beállítás törlődik."
          confirmLabel="Törlés"
          className="button danger"
          onConfirm={resetAll}
        />
      </div>
    </section>
  );
}
