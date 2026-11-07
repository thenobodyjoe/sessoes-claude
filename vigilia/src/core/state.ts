import { clamp } from './util';

export type PersonFate = 'none' | 'woken' | 'pushed-knowing' | 'pushed-blind' | 'left-knowing' | 'left-blind';

export interface Flags {
  birdFreed: boolean;
  breadTaken: boolean;
  breadShared: boolean;
  womanHome: boolean;
  personFate: PersonFate;
  usedLog: boolean;
  sawPersonSigns: boolean;
  knelt: boolean;
  cloakGiven: boolean;
  wateredFig: boolean;
  dugWithStranger: boolean;
  sawWounds: boolean;
}

export interface SaveData {
  v: 1;
  phase: 1 | 2;
  phase1Done: boolean;
  demoDone: boolean;
  heart: number;
  candleLit: boolean;
  flags: Flags;
  log: string[];
}

export const freshFlags = (): Flags => ({
  birdFreed: false,
  breadTaken: false,
  breadShared: false,
  womanHome: false,
  personFate: 'none',
  usedLog: false,
  sawPersonSigns: false,
  knelt: false,
  cloakGiven: false,
  wateredFig: false,
  dugWithStranger: false,
  sawWounds: false
});

export const freshSave = (): SaveData => ({
  v: 1,
  phase: 1,
  phase1Done: false,
  demoDone: false,
  heart: 0,
  candleLit: true,
  flags: freshFlags(),
  log: []
});

const KEY = 'vigilia.save.v1';
let memory: string | null = null;

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    s.setItem('__vig', '1');
    s.removeItem('__vig');
    return s;
  } catch {
    return null;
  }
}

function parseSave(raw: string): SaveData | null {
  try {
    const o = JSON.parse(raw);
    if (!o || o.v !== 1) return null;
    const base = freshSave();
    const flags = { ...base.flags, ...(typeof o.flags === 'object' && o.flags ? o.flags : {}) } as Flags;
    return {
      v: 1,
      phase: o.phase === 2 ? 2 : 1,
      phase1Done: !!o.phase1Done,
      demoDone: !!o.demoDone,
      heart: clamp(Number(o.heart) || 0, -10, 10),
      candleLit: o.candleLit !== false,
      flags,
      log: Array.isArray(o.log) ? o.log.slice(0, 60).map(String) : []
    };
  } catch {
    return null;
  }
}

export function loadSave(): SaveData {
  let raw = memory;
  const s = storage();
  if (s) {
    try {
      raw = s.getItem(KEY) ?? raw;
    } catch {
      /* storage unavailable */
    }
  }
  return (raw && parseSave(raw)) || freshSave();
}

export function writeSave(d: SaveData): void {
  const raw = JSON.stringify(d);
  memory = raw;
  const s = storage();
  if (s) {
    try {
      s.setItem(KEY, raw);
    } catch {
      /* storage unavailable */
    }
  }
}

export function eraseSave(): void {
  memory = null;
  const s = storage();
  if (s) {
    try {
      s.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }
}

export function exportCode(d: SaveData): string {
  const bytes = new TextEncoder().encode(JSON.stringify(d));
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return 'VIG1-' + btoa(bin);
}

export function importCode(code: string): SaveData | null {
  const c = code.trim();
  if (!c.startsWith('VIG1-')) return null;
  try {
    const bin = atob(c.slice(5));
    const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    return parseSave(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export const cloneSave = (d: SaveData): SaveData => JSON.parse(JSON.stringify(d));
