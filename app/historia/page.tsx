'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { SceneView } from '@/components/story/SceneView';
import { Card, Badge, Spinner, EmptyState, SectionTitle } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import type { StoryScene } from '@/types';

interface Arc { id: string; title: string; description: string; unlocked: boolean }
interface Overview {
  arcs: Arc[];
  currentScene: StoryScene | null;
  aiConfigured: boolean;
}

function HistoriaInner() {
  const search = useSearchParams();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [scene, setScene] = useState<StoryScene | null>(null);
  const [mode, setMode] = useState<'ai' | 'fallback'>('fallback');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const applyOverview = useCallback((data: Overview) => {
    setOverview(data);
    if (data.currentScene) {
      setScene(data.currentScene);
      setMode(data.currentScene.aiGenerated ? 'ai' : 'fallback');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/story')
      .then((r) => r.json())
      .then((data: Overview) => {
        if (!cancelled) applyOverview(data);
      });
    return () => {
      cancelled = true;
    };
  }, [applyOverview]);

  async function refresh() {
    const data: Overview = await fetch('/api/story').then((r) => r.json());
    applyOverview(data);
  }

  // Generación automática al llegar desde onboarding o tras una sesión
  useEffect(() => {
    const trigger = search.get('trigger');
    const fresh = search.get('fresh');
    if (!trigger || !overview) return;
    if (trigger === 'onboarding_complete' && fresh !== '1') return;
    // Evitar regenerar si ya hay una escena fresca del mismo trigger
    if (overview.currentScene && overview.currentScene.triggerEvent === trigger && fresh !== '1') return;
    generate(trigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview]);

  async function generate(trigger: string, playerNote?: string) {
    setGenerating(true);
    setNotice(null);
    try {
      const res = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ triggerEvent: trigger, playerNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo generar la escena');
      setScene(data.scene);
      setMode(data.mode);
      if (data.mode === 'fallback') {
        setNotice(
          overview?.aiConfigured
            ? 'La IA no respondió; la forja te ofrece una escena original.'
            : 'Modo historia original FORJA (sin IA configurada).',
        );
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Error al generar la escena');
    } finally {
      setGenerating(false);
    }
  }

  async function choose(choiceId: string) {
    if (!scene) return;
    setChoosing(true);
    try {
      const res = await fetch('/api/story/choice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sceneId: scene.id, choiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo registrar la elección');
      const parts: string[] = [];
      if (data.applied?.xpBonus) parts.push(`+${data.applied.xpBonus} XP de sabiduría`);
      if (data.applied?.unlockCosmetic) parts.push('¡recompensa desbloqueada!');
      setNotice(parts.length > 0 ? `Tu elección queda registrada. ${parts.join(' ')}` : 'Tu elección queda registrada en la historia.');
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Error');
    } finally {
      setChoosing(false);
    }
  }

  if (loading) return <Spinner label="Abriendo el libro de la forja…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">📖 Historia</h1>
        {overview && !overview.aiConfigured && (
          <Badge color="gray">Historia original</Badge>
        )}
      </div>

      {notice && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="!py-3 !px-4 border-neon-cyan/30">
            <p className="text-sm text-neon-cyan">{notice}</p>
          </Card>
        </motion.div>
      )}

      {generating ? (
        <Spinner label="La forja escribe tu capítulo…" />
      ) : scene ? (
        <SceneView scene={scene} mode={mode} onChoice={choose} choosing={choosing} />
      ) : (
        <EmptyState
          icon="📜"
          title="Tu historia empieza aquí"
          description="Genera tu primer capítulo y conoce a Naia, el Espíritu de la Forja."
          action={<Button onClick={() => generate('manual')}>Comenzar la historia</Button>}
        />
      )}

      <Card>
        <SectionTitle>Arcos de la historia</SectionTitle>
        <ul className="space-y-2">
          {overview?.arcs.map((arc) => (
            <li
              key={arc.id}
              className={`p-3 rounded-xl border ${arc.unlocked ? 'border-line bg-white/[0.02]' : 'border-white/5 opacity-40'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-sm">{arc.title}</p>
                {!arc.unlocked && <Badge color="gray">🔒</Badge>}
              </div>
              <p className="text-xs text-mist mt-0.5">{arc.description}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default function HistoriaPage() {
  return (
    <Suspense fallback={<Spinner label="Abriendo el libro de la forja…" />}>
      <HistoriaInner />
    </Suspense>
  );
}
