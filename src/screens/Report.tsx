import { useState } from 'react';
import { useDB } from '../data/store';
import { staffNameOf, useNow } from '../components';
import { monthReport } from '../logic/report';
import {
  dayKey,
  dayOfMonth,
  fmtFullDate,
  fmtMonth,
  fmtShortDate,
  fmtTime,
  monthKey,
  shiftMonth,
  weekdayShort,
} from '../logic/dates';
import { fmtNum, fmtRange, fmtTemp, fmtVal } from '../logic/temp';
import { FREQ_LABEL } from '../data/defaults';
import { PREVIEW_BLOCKED, inPreviewFrame } from '../env';

const yesNo = (b: boolean) => (b ? 'rendben' : 'nem');
const dayList = (days: number[]) => days.map((d) => `${d}.`).join(', ');

export function Report() {
  const db = useDB();
  const now = useNow();
  const thisMonth = monthKey(now);
  const todayKey = dayKey(now);
  const [month, setMonth] = useState(thisMonth);
  const [detailed, setDetailed] = useState(false);
  const [printMsg, setPrintMsg] = useState('');
  const r = monthReport(db, month, now);
  const settings = db.settings!;

  const totalLogs = r.devices.reduce((n, s) => n + s.logs.length, 0);
  const totalMissing = r.devices.reduce((n, s) => n + s.missingDays.length, 0);

  return (
    <>
      <header className="page-head no-print">
        <h1>Havi napló</h1>
        <p className="muted">Ellenőrzéskor ezt mutasd meg, vagy nyomtasd ki és írd alá.</p>
      </header>

      <div className="report-tools no-print">
        <div className="month-switch">
          <button type="button" className="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Előző hónap">
            ‹
          </button>
          <strong>{fmtMonth(month)}</strong>
          <button
            type="button"
            className="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= thisMonth}
            aria-label="Következő hónap"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          className="button primary"
          onClick={() => (inPreviewFrame ? setPrintMsg(PREVIEW_BLOCKED) : window.print())}
        >
          Nyomtatás vagy PDF
        </button>
        {printMsg && (
          <p className="notice warn small" role="status">
            {printMsg}
          </p>
        )}
        <label className="choice">
          <input type="checkbox" checked={detailed} onChange={(e) => setDetailed(e.target.checked)} />
          <span>Részletes lista is (minden mérés időponttal és névvel)</span>
        </label>
        <p className="small muted">
          {totalLogs} mérés, {r.tasks.length} elvégzett feladat, {r.deliveries.length} átvétel
          {totalMissing > 0 ? `, ${totalMissing} eszköz-nap mérés nélkül` : ''}.
        </p>
      </div>

      <article className="paper">
        <header className="paper-head">
          <h1>HACCP-napló, {fmtMonth(month)}</h1>
          <p>
            {settings.unitName}
            {settings.felir ? `, FELIR-azonosító: ${settings.felir}` : ''}
            {settings.address ? `, ${settings.address}` : ''}
          </p>
        </header>

        <section className="paper-section">
          <h2>Hőmérséklet</h2>
          {r.devices.length === 0 || r.days.length === 0 ? (
            <p>Ebben a hónapban nincs mérés.</p>
          ) : (
            <div className="tbl-wrap">
              <table className="matrix">
                <thead>
                  <tr>
                    <th>Nap</th>
                    {r.devices.map((s) => (
                      <th key={s.device.id}>
                        {s.device.name}
                        <span className="th-sub">
                          {fmtNum(s.device.min)}…{fmtNum(s.device.max)} °C
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.days.map((day) => (
                    <tr key={day}>
                      <td className="day">
                        {dayOfMonth(day)}. {weekdayShort(day)}
                      </td>
                      {r.devices.map((s) => {
                        const logs = s.byDay[day];
                        if (!logs) {
                          const before = day < s.firstDay;
                          const open = day === todayKey;
                          return (
                            <td key={s.device.id} className={before || open ? 'cell-none' : 'cell-missing'}>
                              {before || open ? '' : 'nincs'}
                            </td>
                          );
                        }
                        return (
                          <td key={s.device.id} className="num">
                            {logs.map((l, i) => (
                              <span key={l.id}>
                                {i > 0 && ' / '}
                                <span className={l.ok ? '' : 'val-bad'}>{fmtVal(l.value)}</span>
                              </span>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="small muted legend">
            Értékek °C-ban, a napi mérések sorrendjében. Pirossal a tartományon kívüli értékek, „nincs” = aznap nem volt mérés.
          </p>
        </section>

        <section className="paper-section">
          <h2>Eltérések és beavatkozások</h2>
          {r.alerts.length === 0 ? (
            <p>Ebben a hónapban nem volt tartományon kívüli mérés.</p>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Időpont</th>
                    <th>Eszköz</th>
                    <th>Érték</th>
                    <th>Beavatkozás</th>
                    <th>Mérte</th>
                  </tr>
                </thead>
                <tbody>
                  {r.alerts.map((l) => (
                    <tr key={l.id}>
                      <td className="nowrap">
                        {fmtShortDate(l.at)} {fmtTime(l.at)}
                      </td>
                      <td>{l.device.name}</td>
                      <td className="num cell-bad">{fmtTemp(l.value)}</td>
                      <td>
                        {l.action ?? 'nincs rögzítve'}
                        {l.note ? ` (${l.note})` : ''}
                      </td>
                      <td>{staffNameOf(db, l.staffId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="paper-section">
          <h2>Takarítás és rendszeres feladatok</h2>
          {r.taskSummary.length === 0 ? (
            <p>Nincs felvett feladat.</p>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Feladat</th>
                    <th>Elvégezve (napok)</th>
                    <th>Kimaradt</th>
                  </tr>
                </thead>
                <tbody>
                  {r.taskSummary.map((s) => (
                    <tr key={s.task.id}>
                      <td>
                        {s.task.title}
                        <span className="th-sub">{FREQ_LABEL[s.task.frequency].toLowerCase()}</span>
                      </td>
                      <td>{s.doneDays.length ? dayList(s.doneDays.map(dayOfMonth)) : '–'}</td>
                      <td className={s.missingDays.length ? 'cell-missing' : ''}>
                        {s.missingDays.length ? dayList(s.missingDays) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="paper-section">
          <h2>Áruátvétel</h2>
          {r.deliveries.length === 0 ? (
            <p>Ebben a hónapban nincs rögzített átvétel.</p>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Időpont</th>
                    <th>Beszállító</th>
                    <th>Áru</th>
                    <th>Hőm.</th>
                    <th>Csomagolás</th>
                    <th>Lejárat</th>
                    <th>Döntés</th>
                    <th>Átvette</th>
                  </tr>
                </thead>
                <tbody>
                  {r.deliveries.map((d) => (
                    <tr key={d.id} className={d.accepted ? '' : 'bad'}>
                      <td className="nowrap">
                        {fmtShortDate(d.at)} {fmtTime(d.at)}
                      </td>
                      <td>{d.supplier}</td>
                      <td>
                        {d.product}
                        {d.note ? ` (${d.note})` : ''}
                      </td>
                      <td className="num">{d.temp === null ? '' : fmtTemp(d.temp)}</td>
                      <td>{yesNo(d.packagingOk)}</td>
                      <td>{yesNo(d.dateOk)}</td>
                      <td>{d.accepted ? 'átvéve' : 'visszautasítva'}</td>
                      <td>{staffNameOf(db, d.staffId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {detailed && (
          <section className="detailed">
            <h2>Részletes mérési lista</h2>
            {r.devices.map((s) => (
              <div key={s.device.id} className="detail-device">
                <h3>
                  {s.device.name} <span className="muted">(megengedett: {fmtRange(s.device)})</span>
                </h3>
                {s.logs.length === 0 ? (
                  <p>Nincs mérés.</p>
                ) : (
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Időpont</th>
                          <th>Érték</th>
                          <th>Mérte</th>
                          <th>Beavatkozás</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.logs.map((l) => (
                          <tr key={l.id} className={l.ok ? '' : 'bad'}>
                            <td className="nowrap">
                              {fmtShortDate(l.at)} {fmtTime(l.at)}
                            </td>
                            <td className="num">{fmtTemp(l.value)}</td>
                            <td>{staffNameOf(db, l.staffId)}</td>
                            <td>{l.ok ? '' : `${l.action ?? 'nincs rögzítve'}${l.note ? ` (${l.note})` : ''}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            <h3>Elvégzett feladatok</h3>
            {r.tasks.length === 0 ? (
              <p>Nincs rögzített feladat.</p>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Időpont</th>
                      <th>Feladat</th>
                      <th>Elvégezte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.tasks.map((t) => (
                      <tr key={t.id}>
                        <td className="nowrap">
                          {fmtShortDate(t.at)} {fmtTime(t.at)}
                        </td>
                        <td>{t.task?.title ?? 'Törölt feladat'}</td>
                        <td>{staffNameOf(db, t.staffId)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <footer className="paper-sign">
          <p>Ellenőrizte (felelős vezető): ..............................................</p>
          <p>Dátum: ..............................</p>
          <p className="small muted">Készült {fmtFullDate(now)}, Konyhanapló.</p>
        </footer>
      </article>
    </>
  );
}
