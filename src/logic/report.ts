import type { DB, Delivery, Device, Task, TaskDone, TempLog } from '../data/types';
import { dayKey, dayOfMonth, daysInMonth, monthKey } from './dates';

export interface DeviceSection {
  device: Device;
  logs: TempLog[];
  /** Mérések naponként ('ÉÉÉÉ-HH-NN' → mérések) */
  byDay: Record<string, TempLog[]>;
  /** Lezárt napok (ma nem számít), amikor egyáltalán nem volt mérés, a használat kezdete óta. */
  missingDays: number[];
  alerts: number;
  firstDay: string;
}

export interface TaskSummary {
  task: Task;
  doneDays: string[];
  /** Csak napi feladatnál: lezárt napok, amikor kimaradt. */
  missingDays: number[];
}

export interface MonthReport {
  month: string;
  /** A hónap napjai a mai napig (a mai nappal együtt) */
  days: string[];
  devices: DeviceSection[];
  tasks: (TaskDone & { task?: Task })[];
  taskSummary: TaskSummary[];
  deliveries: Delivery[];
  alerts: (TempLog & { device: Device })[];
}

const byAt = <T extends { at: string }>(a: T, b: T) => a.at.localeCompare(b.at);

export function monthReport(db: DB, month: string, now: Date): MonthReport {
  const inMonth = (iso: string) => monthKey(new Date(iso)) === month;
  const todayKey = dayKey(now);
  const dim = daysInMonth(month);

  // A napló a használat kezdetétől számít; az előtte lévő napok nem kerülnek a táblázatba.
  const startDay = db.settings ? dayKey(new Date(db.settings.createdAt)) : '';
  const days: string[] = [];
  for (let day = 1; day <= dim; day++) {
    const key = `${month}-${String(day).padStart(2, '0')}`;
    if (key > todayKey) break;
    if (key < startDay) continue;
    days.push(key);
  }
  // Lezárt napok: a mai nap még tart, azt nem jelöljük hiánynak.
  const closedDays = days.filter((d) => d < todayKey);

  const devices: DeviceSection[] = db.devices
    .map((device) => {
      const logs = db.tempLogs.filter((l) => l.deviceId === device.id && inMonth(l.at)).sort(byAt);
      const byDay: Record<string, TempLog[]> = {};
      for (const l of logs) (byDay[dayKey(new Date(l.at))] ??= []).push(l);
      const firstDay = dayKey(new Date(device.createdAt));
      const missingDays = closedDays.filter((d) => d >= firstDay && !byDay[d]).map(dayOfMonth);
      return { device, logs, byDay, missingDays, alerts: logs.filter((l) => !l.ok).length, firstDay };
    })
    .filter((s) => s.device.active || s.logs.length > 0);

  const taskMap = new Map(db.tasks.map((t) => [t.id, t]));
  const tasks = db.taskDone
    .filter((t) => inMonth(t.at))
    .sort(byAt)
    .map((t) => ({ ...t, task: taskMap.get(t.taskId) }));

  const taskSummary: TaskSummary[] = db.tasks
    .map((task) => {
      const doneDays = Array.from(new Set(tasks.filter((t) => t.taskId === task.id).map((t) => dayKey(new Date(t.at)))));
      const missingDays =
        task.frequency === 'napi' && task.active
          ? closedDays.filter((d) => d >= startDay && !doneDays.includes(d)).map(dayOfMonth)
          : [];
      return { task, doneDays, missingDays };
    })
    .filter((s) => s.task.active || s.doneDays.length > 0);

  const deviceMap = new Map(db.devices.map((d) => [d.id, d]));
  const alerts = devices
    .flatMap((s) => s.logs.filter((l) => !l.ok))
    .sort(byAt)
    .map((l) => ({ ...l, device: deviceMap.get(l.deviceId)! }));

  const deliveries = db.deliveries.filter((d) => inMonth(d.at)).sort(byAt);

  return { month, days, devices, tasks, taskSummary, deliveries, alerts };
}
