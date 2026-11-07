export type Key = 'left' | 'right' | 'jump' | 'act' | 'down';
const KEYS: Key[] = ['left', 'right', 'jump', 'act', 'down'];

const keyHeld: Record<Key, boolean> = { left: false, right: false, jump: false, act: false, down: false };
const touchHeld: Record<Key, boolean> = { left: false, right: false, jump: false, act: false, down: false };
const cur: Record<Key, boolean> = { left: false, right: false, jump: false, act: false, down: false };
const prev: Record<Key, boolean> = { left: false, right: false, jump: false, act: false, down: false };
// presses that happened and ended between two frames are kept until read
const latched: Record<Key, boolean> = { left: false, right: false, jump: false, act: false, down: false };

const MAP: Record<string, Key> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'down', KeyS: 'down',
  KeyE: 'act', KeyF: 'act', Enter: 'act', ShiftLeft: 'act'
};

let device: 'keyboard' | 'touch' = 'keyboard';
const listeners: Array<() => void> = [];

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

window.addEventListener('keydown', e => {
  if (isTypingTarget(e.target)) return;
  const k = MAP[e.code];
  if (!k) return;
  if (!keyHeld[k]) latched[k] = true;
  keyHeld[k] = true;
  device = 'keyboard';
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  listeners.forEach(fn => fn());
});
window.addEventListener('keyup', e => {
  const k = MAP[e.code];
  if (k) keyHeld[k] = false;
});
window.addEventListener('blur', () => {
  for (const k of KEYS) {
    keyHeld[k] = false;
    touchHeld[k] = false;
  }
});

export const Controls = {
  update(): void {
    for (const k of KEYS) {
      prev[k] = cur[k];
      cur[k] = keyHeld[k] || touchHeld[k] || latched[k];
      latched[k] = false;
    }
  },
  down: (k: Key): boolean => cur[k],
  pressed: (k: Key): boolean => cur[k] && !prev[k],
  released: (k: Key): boolean => !cur[k] && prev[k],
  setTouch(k: Key, v: boolean): void {
    if (v && !touchHeld[k]) latched[k] = true;
    touchHeld[k] = v;
    device = 'touch';
    if (v) listeners.forEach(fn => fn());
  },
  clear(): void {
    for (const k of KEYS) {
      keyHeld[k] = touchHeld[k] = cur[k] = prev[k] = latched[k] = false;
    }
  },
  get device() {
    return device;
  },
  onAnyInput(fn: () => void): void {
    listeners.push(fn);
  }
};
