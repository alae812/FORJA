'use client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CHARACTERS } from '@/lib/story/characters';
import { BackgroundArt } from './BackgroundArt';
import { CharacterPortrait } from './CharacterPortrait';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/primitives';
import type { StoryScene } from '@/types';

/**
 * Visor de novela visual: escenario, retrato, narración con aparición gradual
 * y elecciones. Las elecciones se envían al servidor para persistirlas.
 */
export function SceneView({
  scene,
  mode,
  onChoice,
  choosing,
}: {
  scene: StoryScene;
  /** 'ai' | 'fallback' — se muestra honestamente */
  mode: 'ai' | 'fallback';
  onChoice: (choiceId: string) => void;
  choosing: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const character = scene.characterKey ? CHARACTERS[scene.characterKey] : null;

  return (
    <motion.div
      key={scene.id}
      initial={reduceMotion ? {} : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-3xl overflow-hidden"
    >
      <div className="relative">
        <BackgroundArt key_={scene.backgroundKey} className="h-44 sm:h-56" />
        {character && (
          <motion.div
            initial={reduceMotion ? {} : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="absolute -bottom-8 left-4"
          >
            <div className="ring-2 ring-white/20 rounded-2xl shadow-2xl">
              <CharacterPortrait key_={character.key} size={88} />
            </div>
          </motion.div>
        )}
        <div className="absolute top-3 right-3">
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-black/60 border border-white/10 text-mist">
            {mode === 'ai' ? '✨ Escena generada por IA' : '📜 Historia original FORJA'}
          </span>
        </div>
      </div>

      <div className="pt-12 px-5 pb-5">
        {character && (
          <p className="font-display font-bold text-lg" style={{ color: character.color }}>
            {character.name}
            <span className="text-mist text-sm font-normal ml-2">{character.title}</span>
          </p>
        )}
        <h3 className="font-display text-xl font-black mt-1 mb-3">{scene.title}</h3>

        <motion.div
          className="narration text-[15px] leading-relaxed text-bone/90 mb-5 min-h-[6rem]"
          initial={false}
        >
          {revealed || reduceMotion ? (
            scene.narration
          ) : (
            <Typewriter key={scene.id} text={scene.narration} onDone={() => setRevealed(true)} />
          )}
        </motion.div>

        {!revealed && !reduceMotion ? (
          <Button variant="secondary" size="sm" onClick={() => setRevealed(true)} className="mb-4">
            Mostrar todo ⏩
          </Button>
        ) : (
          <div className="space-y-2.5" role="group" aria-label="Tus elecciones">
            <AnimatePresence>
              {choosing ? (
                <Spinner label="La forja registra tu elección…" />
              ) : (
                scene.choices.map((choice, i) => (
                  <motion.div
                    key={choice.id}
                    initial={reduceMotion ? {} : { opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                  >
                    <Button
                      variant="secondary"
                      className="w-full !justify-start text-left"
                      onClick={() => onChoice(choice.id)}
                    >
                      <span className="text-neon-cyan font-black mr-1" aria-hidden>▸</span>
                      {choice.label}
                      {choice.effect?.xpBonus ? (
                        <span className="ml-auto text-xs text-ember font-bold whitespace-nowrap">
                          +{choice.effect.xpBonus} XP
                        </span>
                      ) : null}
                    </Button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Narración con aparición gradual de diálogo (el padre ya gestiona reduced motion).
 *  Se monta de nuevo por escena (key), así que el estado inicial es correcto. */
function Typewriter({ text, onDone }: { text: string; onDone: () => void }) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 3;
      if (n >= text.length) {
        setCount(text.length);
        clearInterval(id);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      } else {
        setCount(n);
      }
    }, 24);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span aria-label={text}>
      <span aria-hidden>{text.slice(0, count)}</span>
      <span className="inline-block w-2 h-4 bg-neon-cyan/80 ml-0.5 animate-pulse" aria-hidden />
    </span>
  );
}
