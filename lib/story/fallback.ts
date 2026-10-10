/**
 * FORJA — Escenas de reserva originales (sin IA).
 * Se usan cuando no hay proveedor de IA configurado o si este falla.
 * El modo de la escena queda registrado (aiGenerated: false) y la UI
 * lo indica honestamente como contenido original de FORJA.
 */
import type { StoryScene, StoryTriggerEvent } from '@/types';

interface FallbackParams {
  heroName: string;
  level: number;
  camino?: string;
}

type SceneFactory = (p: FallbackParams) => Omit<StoryScene, 'id' | 'createdAt'>;

const SCENES: Record<StoryTriggerEvent, SceneFactory> = {
  onboarding_complete: ({ heroName }) => ({
    arcId: 'llamada',
    title: 'La chispa inicial',
    narration:
      `Las brasas de la forja se avivan solas cuando ${heroName} cruza el umbral. ` +
      `Entre las chispas toma forma Naia, el Espíritu de la Forja.\n\n` +
      `«Vaya… otra alma valiente —dice, ladeando la cabeza—. Llevo cien años esperando a alguien que no huya del calor. ` +
      `Dime, ${heroName}: ¿qué vienes a forjar aquí?»`,
    backgroundKey: 'forge',
    characterKey: 'naia',
    triggerEvent: 'onboarding_complete',
    aiGenerated: false,
    choices: [
      {
        id: 'camino-fuerza',
        label: '«Vengo a forjar fuerza.»',
        effect: { flag: 'camino:fuerza', xpBonus: 5 },
      },
      {
        id: 'camino-ritmo',
        label: '«Vengo a forjar constancia.»',
        effect: { flag: 'camino:ritmo', xpBonus: 5 },
      },
      {
        id: 'camino-sabiduria',
        label: '«Vengo a forjarme a mí mismo.»',
        effect: { flag: 'camino:sabiduria', xpBonus: 5 },
      },
    ],
  }),

  first_session: ({ heroName, camino }) => ({
    arcId: 'primer-golpe',
    title: 'El primer golpe',
    narration:
      `El yunque retumba con tu primera sesión, ${heroName}. Rook se acerca, cruza sus enormes brazos y asiente despacio.\n\n` +
      `«El primer golpe es el más difícil —dice con voz grave—. No por el peso, sino porque hay que decidir darlo. ` +
      `Ya lo diste. Ahora viene lo importante: volver mañana.»` +
      (camino === 'fuerza' ? `\n\nNaia sonríe entre las brasas: «Lo sabía. Tienes manos de herrero.»` : ''),
    backgroundKey: 'forge',
    characterKey: 'rook',
    triggerEvent: 'first_session',
    aiGenerated: false,
    choices: [
      {
        id: 'juramento',
        label: '«Volveré. Lo juro por la forja.»',
        effect: { flag: 'juramento_forja:true', xpBonus: 10 },
      },
      {
        id: 'pregunta',
        label: '«¿Cuál es el secreto, maestro?»',
        effect: { flag: 'pregunta_secreto:true' },
      },
    ],
  }),

  streak_3: ({ heroName }) => ({
    arcId: 'ritmo',
    title: 'Ritmo de guerra',
    narration:
      `Tres días. Tres brasas encendidas. Mira te espera en la Pista Infinita con los brazos en jarras.\n\n` +
      `«¿Ves eso, ${heroName}? —señala el horizonte—. La mayoría corre un día y descansa una semana. ` +
      `Tú has convertido el esfuerzo en ritmo. El ritmo, con el tiempo, se convierte en identidad.»`,
    backgroundKey: 'track',
    characterKey: 'mira',
    triggerEvent: 'streak_3',
    aiGenerated: false,
    choices: [
      {
        id: 'seguir',
        label: '«Mañana también. Sin excusas.»',
        effect: { flag: 'racha_firme:true', xpBonus: 10 },
      },
      {
        id: 'descansar',
        label: '«Mañana descanso… pero vuelvo pasado.»',
        effect: { flag: 'descanso_planeado:true' },
      },
    ],
  }),

  personal_best: ({ heroName }) => ({
    arcId: 'ritmo',
    title: 'Más allá del límite',
    narration:
      `Naia surge de las brasas con los ojos brillantes como dos soles pequeños.\n\n` +
      `«¿Lo has sentido, ${heroName}? Ese momento en que el cuerpo dice "basta" y tú sigues un poco más. ` +
      `Acabas de superar tu mejor marca. El yunque guarda ese golpe: nadie te lo puede quitar.»`,
    backgroundKey: 'forge',
    characterKey: 'naia',
    triggerEvent: 'personal_best',
    aiGenerated: false,
    choices: [
      {
        id: 'celebrar',
        label: '«¡Lo conseguí!» (celebrarlo)',
        effect: { flag: 'marca_celebrada:true', xpBonus: 10 },
      },
      {
        id: 'humildad',
        label: '«Solo es el principio.»',
        effect: { flag: 'ambicion:true' },
      },
    ],
  }),

  return_after_rest: ({ heroName }) => ({
    arcId: 'regreso',
    title: 'El regreso',
    narration:
      `Temo te recibe en la Biblioteca con una taza de té humeante. No hay reproche en su mirada, solo calma.\n\n` +
      `«El río no se disculpa por detenerse en un remanso, ${heroName} —dice—. Descansar no es rendirse; ` +
      `rendirse es no volver. Y tú has vuelto. Eso es lo único que cuenta.»`,
    backgroundKey: 'library',
    characterKey: 'temo',
    triggerEvent: 'return_after_rest',
    aiGenerated: false,
    choices: [
      {
        id: 'volver-fuerte',
        label: '«Vuelvo con más ganas.»',
        effect: { flag: 'regreso_firme:true', xpBonus: 10 },
      },
      {
        id: 'volver-suave',
        label: '«Empezaré suave, sin prisa.»',
        effect: { flag: 'regreso_suave:true' },
      },
    ],
  }),

  level_up: ({ heroName, level }) => ({
    arcId: 'llamada',
    title: `Ascenso al nivel ${level}`,
    narration:
      `Un anillo de luz recorre la forja. Las brasas se alzan en espiral a tu alrededor, ${heroName}.\n\n` +
      `«Mírate —susurra Naia—. Nivel ${level}. No es que tu cuerpo haya cambiado por arte de magia: ` +
      `es que tu constancia ya pesa más que el hierro. La forja te reconoce.»`,
    backgroundKey: 'forge',
    characterKey: 'naia',
    triggerEvent: 'level_up',
    aiGenerated: false,
    choices: [
      {
        id: 'seguir-subiendo',
        label: '«A por el siguiente nivel.»',
        effect: { flag: `nivel_${level}_alcanzado:true` },
      },
    ],
  }),

  weekly_goal: ({ heroName }) => ({
    arcId: 'ritmo',
    title: 'Semana de hierro',
    narration:
      `Rook golpea el yunque con el puño y el eco recorre toda la forja.\n\n` +
      `«¡Cuatro sesiones en siete días! —ruge, y por primera vez lo ves sonreír de oreja a oreja—. ` +
      `${heroName}, eso no lo hace cualquiera. El hierro solo se vuelve acero con fuego constante.»`,
    backgroundKey: 'arena',
    characterKey: 'rook',
    triggerEvent: 'weekly_goal',
    aiGenerated: false,
    choices: [
      {
        id: 'orgullo',
        label: '«El acero se está forjando.»',
        effect: { flag: 'semana_hierro:true', xpBonus: 15 },
      },
    ],
  }),

  manual: ({ heroName }) => ({
    arcId: 'llamada',
    title: 'Entre brasas',
    narration:
      `La forja arde en silencio. Naia flota sobre las brasas y te mira con curiosidad.\n\n` +
      `«¿Descansando entre sesiones, ${heroName}? Bien. Hasta el fuego necesita aire para respirar. ` +
      `Cuando estés listo, el yunque te espera.»`,
    backgroundKey: 'forge',
    characterKey: 'naia',
    triggerEvent: 'manual',
    aiGenerated: false,
    choices: [
      { id: 'entrenar', label: '«Voy a entrenar.»' },
      { id: 'descansar', label: '«Hoy descanso.»', effect: { flag: 'pausa_narrativa:true' } },
    ],
  }),
};

/** Construye la escena de reserva para un evento, personalizada con flags reales */
export function buildFallbackScene(
  trigger: StoryTriggerEvent,
  params: FallbackParams,
): Omit<StoryScene, 'id' | 'createdAt'> {
  const factory = SCENES[trigger] ?? SCENES.manual;
  return factory(params);
}

/** Lista de eventos con escena de reserva disponible */
export function supportedTriggers(): StoryTriggerEvent[] {
  return Object.keys(SCENES) as StoryTriggerEvent[];
}
