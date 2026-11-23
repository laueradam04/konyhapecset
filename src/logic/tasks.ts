import type { Device, Frequency, Task, TaskDone, TempLog } from '../data/types';
import { dayKey, monthKey, weekKey } from './dates';

export function periodKey(f: Frequency, d: Date): string {
  if (f === 'napi') return dayKey(d);
  if (f === 'heti') return weekKey(d);
  return monthKey(d);
}

/** A feladat legutóbbi elvégzése az aktuális időszakban (nap / hét / hónap). */
export function doneInPeriod(task: Task, done: TaskDone[], now: Date): TaskDone | undefined {
  const k = periodKey(task.frequency, now);
  let found: TaskDone | undefined;
  for (const x of done) {
    if (x.taskId !== task.id) continue;
    if (periodKey(task.frequency, new Date(x.at)) !== k) continue;
    if (!found || x.at > found.at) found = x;
  }
  return found;
}

export type DeviceState = 'ok' | 'partial' | 'missing' | 'alert';

export interface DeviceToday {
  count: number;
  needed: number;
  last?: TempLog;
  state: DeviceState;
}

/** Egy eszköz mai állapota a mérések alapján. */
export function deviceToday(device: Device, logs: TempLog[], now: Date): DeviceToday {
  const k = dayKey(now);
  const today = logs
    .filter((l) => l.deviceId === device.id && dayKey(new Date(l.at)) === k)
    .sort((a, b) => a.at.localeCompare(b.at));
  const last = today[today.length - 1];
  let state: DeviceState;
  if (last && !last.ok) state = 'alert';
  else if (today.length === 0) state = 'missing';
  else if (today.length < device.checksPerDay) state = 'partial';
  else state = 'ok';
  return { count: today.length, needed: device.checksPerDay, last, state };
}
