import { useState } from 'react';
import type { Frequency, Task, TaskDone } from '../data/types';
import { useCurrentStaff, useDB } from '../data/store';
import { completeTask, resetAll, undoTask } from '../data/actions';
import { ConfirmButton, DeviceRows, Icon, ShiftBar, staffNameOf, useNow } from '../components';
import { deviceToday, doneInPeriod } from '../logic/tasks';
import { dayKey, fmtDayLong, fmtShortDateTime, fmtTime } from '../logic/dates';

const GROUPS: { f: Frequency; title: string }[] = [
  { f: 'napi', title: 'Mai teendők' },
  { f: 'heti', title: 'Ezen a héten' },
  { f: 'havi', title: 'Ebben a hónapban' },
];

export function Today() {
  const db = useDB();
  const now = useNow();
  const staffId = useCurrentStaff();
  const [message, setMessage] = useState('');
  const [undoFor, setUndoFor] = useState<string | null>(null);

  const devices = db.devices.filter((d) => d.active);
  const tempDone = devices.filter((d) => deviceToday(d, db.tempLogs, now).state === 'ok').length;

  const tasks = db.tasks.filter((t) => t.active);
  const taskDoneCount = tasks.filter((t) => doneInPeriod(t, db.taskDone, now)).length;

  const today = dayKey(now);
  const deliveriesToday = db.deliveries.filter((d) => dayKey(new Date(d.at)) === today);
  const rejectedToday = deliveriesToday.filter((d) => !d.accepted).length;

  function toggle(task: Task, done: TaskDone | undefined) {
    if (done) {
      setUndoFor(task.id);
      return;
    }
    if (!staffId) {
      setMessage('Előbb jelöld meg fent, ki van műszakban.');
      return;
    }
    completeTask(task.id, staffId);
    setMessage('');
  }

  return (
    <>
      {db.settings?.demo && (
        <div className="demo-strip">
          <span>Ez egy kitalált konyha két hétnyi naplóval, nyugodtan kattintgass.</span>
          <ConfirmButton
            label="Saját konyha beállítása"
            question="A demó adatai törlődnek."
            confirmLabel="Rendben"
            className="linklike"
            onConfirm={resetAll}
          />
        </div>
      )}

      <header className="page-head">
        <h1>{db.settings?.unitName}</h1>
        <p className="muted">{fmtDayLong(now)}</p>
      </header>

      <ShiftBar />

      <section className="block" aria-labelledby="h-temp">
        <div className="block-head">
          <h2 id="h-temp">Hőmérséklet</h2>
          <span className="count">
            {tempDone} / {devices.length} kész
          </span>
        </div>
        <DeviceRows db={db} now={now} />
      </section>

      <section className="block" aria-labelledby="h-tasks">
        <div className="block-head">
          <h2 id="h-tasks">Takarítás</h2>
          <span className="count">
            {taskDoneCount} / {tasks.length} kész
          </span>
        </div>
        {message && (
          <p className="notice warn" role="alert">
            {message}
          </p>
        )}
        {GROUPS.map((g) => {
          const list = tasks.filter((t) => t.frequency === g.f);
          if (list.length === 0) return null;
          return (
            <div key={g.f} className="task-group">
              <h3>{g.title}</h3>
              <ul className="rows">
                {list.map((t) => {
                  const done = doneInPeriod(t, db.taskDone, now);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`task${done ? ' is-done' : ''}`}
                        aria-pressed={!!done}
                        onClick={() => toggle(t, done)}
                      >
                        <span className="box" aria-hidden="true">
                          {done && <Icon.check />}
                        </span>
                        <span className="task-text">
                          <span>{t.title}</span>
                          {done && (
                            <span className="small muted">
                              {staffNameOf(db, done.staffId)},{' '}
                              {g.f === 'napi' ? fmtTime(done.at) : fmtShortDateTime(done.at)}
                            </span>
                          )}
                        </span>
                      </button>
                      {done && undoFor === t.id && (
                        <div className="undo">
                          <span>Visszavonod a pipát?</span>
                          <button
                            type="button"
                            className="button danger"
                            onClick={() => {
                              undoTask(done.id);
                              setUndoFor(null);
                            }}
                          >
                            Visszavonás
                          </button>
                          <button type="button" className="button" onClick={() => setUndoFor(null)}>
                            Mégse
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <p className="empty">
            Nincs felvett takarítási feladat. <a href="#/beallitasok">Feladat hozzáadása</a>
          </p>
        )}
      </section>

      <section className="block" aria-labelledby="h-deliv">
        <div className="block-head">
          <h2 id="h-deliv">Áruátvétel</h2>
        </div>
        <div className="panel split">
          <p>
            {deliveriesToday.length === 0
              ? 'Ma még nem volt átvétel.'
              : `Ma ${deliveriesToday.length} tétel${rejectedToday ? `, ebből ${rejectedToday} visszautasítva` : ''}.`}
          </p>
          <a className="button primary" href="#/atvetel">
            Áru átvétele
          </a>
        </div>
      </section>
    </>
  );
}
