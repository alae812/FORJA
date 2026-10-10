/**
 * FORJA — Personajes y escenarios originales.
 * Todo el contenido narrativo de FORJA es creación original para este proyecto.
 */
import type { BackgroundKey, CharacterKey } from '@/types';

export interface CharacterBio {
  key: CharacterKey;
  name: string;
  title: string;
  description: string;
  /** descriptor visual para el retrato SVG original */
  visual: string;
  color: string; // acento
}

export const CHARACTERS: Record<CharacterKey, CharacterBio> = {
  naia: {
    key: 'naia',
    name: 'Naia',
    title: 'Espíritu de la Forja',
    description:
      'Un espíritu antiguo que habita las brasas de la forja. Elige a un aprendiz cada generación y lo guía con calidez… y con burlas cuando hace falta.',
    visual: 'Figura femenina etérea de brasas naranjas y luz cian, cabello como chispas ascendentes.',
    color: '#22d3ee',
  },
  rook: {
    key: 'rook',
    name: 'Rook',
    title: 'Maestro de Fuerza',
    description:
      'Ex-campeón de levantamiento de la Arena. Enorme, de voz grave y corazón blando. Cree que la fuerza se construye con paciencia, no con prisa.',
    visual: 'Hombre corpulento de barba trenzada, cicatriz en la ceja, martillo de forja al hombro.',
    color: '#fb923c',
  },
  mira: {
    key: 'mira',
    name: 'Mira',
    title: 'Maestra de Estamina',
    description:
      'Velocista legendaria de la Pista Infinita. Enérgica y competitiva: si te ve caminar, te reta a correr.',
    visual: 'Mujer atlética de coleta alta, líneas de viento en su ropa, zapatillas desgastadas por miles de kilómetros.',
    color: '#a78bfa',
  },
  temo: {
    key: 'temo',
    name: 'Temo',
    title: 'Sabio de la Recuperación',
    description:
      'Anciano guardián de la Biblioteca. Habla en metáforas de agua y piedra: el descanso también es entrenamiento.',
    visual: 'Anciano de túnica verde oscura, bastón de madera retorcida, ojos tranquilos como un lago.',
    color: '#34d399',
  },
  kade: {
    key: 'kade',
    name: 'Kade',
    title: 'Rival del Yunque',
    description:
      'Joven prodigio de la Forja del Norte. Arrogante, brillante e incansable: el espejo que te obliga a superarte.',
    visual: 'Joven de mirada afilada, chaqueta oscura con ribetes rojos, chispa desafiante en la sonrisa.',
    color: '#f87171',
  },
};

export interface BackgroundMeta {
  key: BackgroundKey;
  name: string;
  description: string;
  /** gradientes CSS originales para renderizar el escenario sin assets */
  gradient: string;
  accent: string;
}

export const BACKGROUNDS: Record<BackgroundKey, BackgroundMeta> = {
  forge: {
    key: 'forge',
    name: 'La Forja',
    description: 'Corazón de brasas donde Naia aguarda.',
    gradient: 'radial-gradient(ellipse 80% 60% at 50% 100%, #7c2d12 0%, #1c0a05 55%, #0a0603 100%)',
    accent: '#fb923c',
  },
  dojo: {
    key: 'dojo',
    name: 'Dojo del Amanecer',
    description: 'Madera y silencio antes del primer golpe.',
    gradient: 'linear-gradient(180deg, #1e1b4b 0%, #4c1d95 45%, #b45309 100%)',
    accent: '#fbbf24',
  },
  rooftop: {
    key: 'rooftop',
    name: 'Azotea Nocturna',
    description: 'La ciudad duerme; tú entrenas.',
    gradient: 'linear-gradient(180deg, #020617 0%, #1e1b4b 60%, #312e81 100%)',
    accent: '#22d3ee',
  },
  track: {
    key: 'track',
    name: 'Pista Infinita',
    description: 'El óvalo donde Mira forja la estamina.',
    gradient: 'linear-gradient(180deg, #7c2d12 0%, #c2410c 50%, #1c0a05 100%)',
    accent: '#a78bfa',
  },
  library: {
    key: 'library',
    name: 'Biblioteca del Sabio',
    description: 'Pergaminos, té y las enseñanzas de Temo.',
    gradient: 'linear-gradient(180deg, #052e16 0%, #14532d 55%, #0a0f0a 100%)',
    accent: '#34d399',
  },
  arena: {
    key: 'arena',
    name: 'La Arena',
    description: 'Donde Kade espera tu desafío.',
    gradient: 'radial-gradient(ellipse 90% 70% at 50% 40%, #7f1d1d 0%, #1c0505 60%, #000000 100%)',
    accent: '#f87171',
  },
};
