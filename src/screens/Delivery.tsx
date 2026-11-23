import { useState } from 'react';
import { useCurrentStaff, useDB } from '../data/store';
import { addDelivery } from '../data/actions';
import { StaffPicker, YesNo, staffNameOf } from '../components';
import { fmtTemp, parseReading } from '../logic/temp';
import { fmtShortDateTime } from '../logic/dates';

export function Delivery() {
  const db = useDB();
  const shiftStaff = useCurrentStaff();

  const [supplier, setSupplier] = useState('');
  const [product, setProduct] = useState('');
  const [tempRaw, setTempRaw] = useState('');
  const [packagingOk, setPackagingOk] = useState<boolean | null>(null);
  const [dateOk, setDateOk] = useState<boolean | null>(null);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [staffId, setStaffId] = useState(shiftStaff);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const temp = tempRaw.trim() === '' ? null : parseReading(tempRaw);
  const tempInvalid = tempRaw.trim() !== '' && temp === null;

  const suppliers = Array.from(new Set(db.deliveries.map((d) => d.supplier))).sort((a, b) => a.localeCompare(b, 'hu'));
  const recent = [...db.deliveries].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  let error = '';
  if (!supplier.trim()) error = 'Add meg a beszállítót.';
  else if (!product.trim()) error = 'Add meg, milyen árut vettél át.';
  else if (tempInvalid) error = 'A hőmérséklet legyen szám, például 3,5.';
  else if (packagingOk === null || dateOk === null) error = 'Jelöld a csomagolás és a lejárat állapotát.';
  else if (accepted === null) error = 'Jelöld, átvetted vagy visszautasítottad az árut.';
  else if (!staffId) error = 'Jelöld meg, ki vette át.';

  const riskyAccept = accepted === true && (packagingOk === false || dateOk === false);

  function save() {
    setTried(true);
    if (error) return;
    addDelivery({
      supplier: supplier.trim(),
      product: product.trim(),
      temp,
      packagingOk: packagingOk!,
      dateOk: dateOk!,
      accepted: accepted!,
      staffId,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setSavedMsg(`Mentve: ${product.trim()} (${accepted ? 'átvéve' : 'visszautasítva'}).`);
    setProduct('');
    setTempRaw('');
    setPackagingOk(null);
    setDateOk(null);
    setAccepted(null);
    setNote('');
    setTried(false);
  }

  return (
    <>
      <header className="page-head">
        <h1>Áruátvétel</h1>
        <p className="muted">Minden beérkező tételt rögzíts, a visszautasítottat is.</p>
      </header>

      {savedMsg && (
        <p className="notice ok" role="status">
          {savedMsg} Jöhet a következő tétel.
        </p>
      )}

      <form
        className="stack form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="field">
          <span className="label">Beszállító</span>
          <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} list="suppliers" autoComplete="off" />
          <datalist id="suppliers">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span className="label">Áru</span>
          <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Például: csirkemell, 10 kg" />
        </label>
        <div className="field">
          <label className="label" htmlFor="temp">
            Maghőmérséklet, °C (hűtött és fagyasztott árunál)
          </label>
          <div className="inline">
            <input
              id="temp"
              type="text"
              inputMode="decimal"
              value={tempRaw}
              onChange={(e) => setTempRaw(e.target.value)}
              aria-invalid={tempInvalid}
              placeholder="Például: 3,5"
            />
            <button
              type="button"
              className="button"
              aria-label="Előjel váltása"
              onClick={() => setTempRaw((t) => (t.startsWith('-') ? t.slice(1) : `-${t}`))}
            >
              Mínusz
            </button>
          </div>
        </div>
        <YesNo label="Sértetlen a csomagolás?" value={packagingOk} onChange={setPackagingOk} />
        <YesNo label="Rendben van a lejárati idő?" value={dateOk} onChange={setDateOk} />
        <YesNo label="Döntés" value={accepted} onChange={setAccepted} yes="Átvettem" no="Visszautasítottam" />
        {riskyAccept && (
          <p className="notice warn">Sérült csomagolású vagy lejárt árut ne vegyél át. Ha mégis, írd le az okát.</p>
        )}
        <StaffPicker value={staffId} onChange={setStaffId} label="Ki vette át?" />
        <label className="field">
          <span className="label">Megjegyzés (nem kötelező)</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="submit" className="button primary big">
          Átvétel mentése
        </button>
        {tried && error && (
          <p className="notice warn" role="alert">
            {error}
          </p>
        )}
      </form>

      <section className="block" aria-labelledby="h-recent">
        <h2 id="h-recent">Legutóbbi átvételek</h2>
        {recent.length === 0 ? (
          <p className="empty">Még nincs rögzített átvétel.</p>
        ) : (
          <ul className="rows">
            {recent.map((d) => (
              <li key={d.id} className={`row static ${d.accepted ? 'state-ok' : 'state-alert'}`}>
                <span className="row-main">
                  <strong>{d.product}</strong>
                  <span className="small muted">
                    {d.supplier}, {fmtShortDateTime(d.at)}, {staffNameOf(db, d.staffId)}
                  </span>
                  {d.note && <span className="small">{d.note}</span>}
                </span>
                <span className="row-side">
                  {d.temp !== null && <span className="reading small-reading">{fmtTemp(d.temp)}</span>}
                  <span className="small state-text">{d.accepted ? 'Átvéve' : 'Visszautasítva'}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
