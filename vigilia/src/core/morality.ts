import { clamp, piecewise, mix3, Vec3 } from './util';
import type { SaveData } from './state';

export const BAND_NAMES = ['muito ruim', 'ruim', 'médio', 'bom', 'muito bom'] as const;

export function bandIndex(heart: number): number {
  if (heart <= -6) return 0;
  if (heart <= -2) return 1;
  if (heart <= 1) return 2;
  if (heart <= 5) return 3;
  return 4;
}
export const bandName = (heart: number): string => BAND_NAMES[bandIndex(heart)];

export type Act =
  | 'free-bird' | 'ignore-bird'
  | 'share-bread' | 'ignore-woman'
  | 'wake-person' | 'push-knowing' | 'push-blind' | 'left-knowing' | 'left-blind'
  | 'kneel' | 'give-cloak' | 'water-fig' | 'help-dig' | 'saw-wounds';

interface ActDef {
  d: number;
  text: string;
  candle?: 'out' | 'relight';
}

// Omissions count too (Mt 25,45). Grave matter + full knowledge + consent puts the candle out (CIC 1857).
// Blindness that comes from earlier choices still weighs (CIC 1791).
export const ACTS: Record<Act, ActDef> = {
  'free-bird': { d: 2, text: 'Libertou um pássaro preso nos espinhos.' },
  'ignore-bird': { d: -1, text: 'Passou por um pássaro preso nos espinhos.' },
  'share-bread': { d: 3, text: 'Partiu o pão com uma mulher faminta.' },
  'ignore-woman': { d: -2, text: 'Passou com pão na mão por uma mulher faminta.' },
  'wake-person': { d: 3, text: 'Acordou um viajante que morria de frio.' },
  'push-knowing': { d: -5, text: 'Empurrou no abismo um viajante, sabendo que era gente.', candle: 'out' },
  'push-blind': { d: -3, text: 'Empurrou no abismo uma forma escura, sem perceber que era gente. Já não conseguia ver.' },
  'left-knowing': { d: -3, text: 'Viu que a forma escura era gente e seguiu adiante.' },
  'left-blind': { d: -1, text: 'Passou por uma forma escura sem perceber que era gente.' },
  'kneel': { d: 2, text: 'Voltou e se ajoelhou diante do túmulo.', candle: 'relight' },
  'give-cloak': { d: 3, text: 'Deu o próprio manto a quem esperava no frio.' },
  'water-fig': { d: 1, text: 'Abriu o caminho da água até a figueira.' },
  'help-dig': { d: 1, text: 'Cavou com o jardineiro ao redor da figueira.' },
  'saw-wounds': { d: 0, text: 'Viu as mãos feridas do jardineiro.' }
};

export function applyAct(s: SaveData, a: Act): void {
  const def = ACTS[a];
  s.heart = clamp(s.heart + def.d, -10, 10);
  if (def.candle === 'out') s.candleLit = false;
  if (def.candle === 'relight') s.candleLit = true;
  s.log.push(def.text);
}

// How the world looks and behaves around the player, from the (smoothed) heart value.
export interface Look {
  flameR: number;      // radius of the candle light pool, px
  warmR: number;       // radius inside which faint details become visible, px
  flame: number;       // flame size multiplier
  lightCol: Vec3;
  lightI: number;
  sat: number;         // global saturation
  satNear: number;     // saturation inside the candle light
  ambient: Vec3;
  vignette: number;
  hunch: number;       // posture, radians-ish
  heavy: number;       // 0 light steps .. 1 heavy steps
  speedMul: number;
  birdFlee: number;    // distance at which birds take off (0 = they stay)
  childMood: number;   // -1 hides .. +1 approaches
}

const COLD: Vec3 = [0.62, 0.7, 0.82];
const WARM: Vec3 = [1.0, 0.72, 0.4];

export function lookFor(heart: number, lit: boolean): Look {
  const h = clamp(heart, -10, 10);
  const warmth = piecewise(h, [[-10, 0.15], [0, 0.6], [10, 1]]);
  const look: Look = {
    flameR: piecewise(h, [[-10, 125], [-4, 170], [0, 215], [4, 265], [10, 330]]),
    warmR: piecewise(h, [[-8, 0], [-4, 16], [0, 60], [4, 102], [10, 150]]),
    flame: piecewise(h, [[-10, 0.45], [0, 0.8], [10, 1.15]]),
    lightCol: mix3(COLD, WARM, warmth),
    lightI: piecewise(h, [[-10, 0.72], [10, 1.08]]),
    sat: piecewise(h, [[-10, 0.2], [0, 0.55], [10, 0.88]]),
    satNear: piecewise(h, [[-10, 0.35], [0, 0.85], [10, 1.12]]),
    ambient: [0.4, 0.44, 0.5].map(c => c * piecewise(h, [[-10, 0.8], [0, 1], [10, 1.08]])) as Vec3,
    vignette: piecewise(h, [[-10, 0.95], [0, 0.6], [10, 0.45]]),
    hunch: piecewise(h, [[-10, 0.5], [-2, 0.18], [0, 0.08], [10, -0.02]]),
    heavy: piecewise(h, [[-10, 1], [0, 0.4], [10, 0]]),
    speedMul: piecewise(h, [[-10, 0.86], [0, 0.97], [10, 1]]),
    birdFlee: piecewise(h, [[-10, 330], [-4, 220], [0, 140], [4, 70], [8, 0]]),
    childMood: piecewise(h, [[-6, -1], [-2, -0.4], [1, 0.1], [4, 0.8], [10, 1]])
  };
  if (!lit) {
    // The candle is out: the whole world loses its colour.
    look.flameR = 70;
    look.warmR = 0;
    look.flame = 0;
    look.lightCol = [0.55, 0.58, 0.62];
    look.lightI = 0.35;
    look.sat = 0;
    look.satNear = 0;
    look.vignette = Math.min(1, look.vignette + 0.2);
    look.ambient = [0.36, 0.37, 0.39];
  }
  return look;
}
