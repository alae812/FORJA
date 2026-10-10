'use client';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle, Badge, Spinner } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Sheet';

interface AnalysisResult {
  mode: 'ai' | 'demo';
  observations: string[];
  mediaId: string | null;
  disclaimer: string;
}

export default function CuerpoPage() {
  const [step, setStep] = useState<'intro' | 'consent' | 'upload' | 'result'>('intro');
  const [consent, setConsent] = useState(false);
  const [saveOriginal, setSaveOriginal] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('La foto supera los 8 MB.');
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setStep('upload');
  }

  async function analyze() {
    const file = fileRef.current?.files?.[0];
    if (!file || !consent) return;
    setAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('consent', 'true');
      form.append('saveOriginal', saveOriginal ? 'true' : 'false');
      form.append('purpose', 'Análisis visual de postura y condiciones de la foto');
      const res = await fetch('/api/body-analysis', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo analizar la foto');
      setResult(data);
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setAnalyzing(false);
    }
  }

  async function deleteMedia() {
    if (!result?.mediaId) return;
    await fetch(`/api/body-analysis?id=${result.mediaId}`, { method: 'DELETE' });
    setConfirmDelete(false);
    setResult({ ...result, mediaId: null });
  }

  function reset() {
    setStep('intro');
    setConsent(false);
    setSaveOriginal(false);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">🪞 Análisis visual</h1>

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card glow="violet">
              <SectionTitle>¿Qué hace esta herramienta?</SectionTitle>
              <ul className="text-sm text-mist space-y-2 mb-4">
                <li>· Describe <span className="text-bone font-bold">solo lo visible</span>: postura general y condiciones de la foto (luz, ángulo).</li>
                <li>· <span className="text-bone font-bold">Nunca</span> estima grasa corporal, masa muscular, fuerza, hormonas ni salud a partir de una imagen.</li>
                <li>· No diagnostica nada y no puntúa tu valía como persona.</li>
                <li>· Tu foto <span className="text-bone font-bold">no se publica</span> ni se usa para entrenar modelos.</li>
                <li>· El original <span className="text-bone font-bold">no se guarda por defecto</span>; solo si tú lo eliges.</li>
              </ul>
              <Button onClick={() => setStep('consent')} className="w-full" size="lg">
                Entendido, continuar →
              </Button>
            </Card>
          </motion.div>
        )}

        {step === 'consent' && (
          <motion.div key="consent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card glow="cyan">
              <SectionTitle>Consentimiento explícito</SectionTitle>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-line cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-violet-500"
                />
                <span className="text-sm">
                  <span className="font-bold">Doy mi consentimiento</span> para que FORJA procese
                  esta foto con la finalidad de <em>análisis visual de postura y condiciones de la foto</em>.
                  Puedo retirar mi consentimiento borrando la foto en cualquier momento.
                </span>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-line cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={saveOriginal}
                  onChange={(e) => setSaveOriginal(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-cyan-500"
                />
                <span className="text-sm">
                  <span className="font-bold">Guardar la foto original</span> en mi espacio privado
                  (opcional, para comparar mi progreso).
                </span>
              </label>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickFile} aria-label="Seleccionar foto" />
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep('intro')} className="flex-1">←</Button>
                <Button onClick={() => fileRef.current?.click()} disabled={!consent} className="flex-[2]">
                  📷 Elegir foto
                </Button>
              </div>
              {!consent && (
                <p className="text-xs text-mist mt-2 text-center">Marca el consentimiento para continuar.</p>
              )}
            </Card>
          </motion.div>
        )}

        {step === 'upload' && preview && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <SectionTitle>Vista previa</SectionTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Vista previa de tu foto" className="rounded-2xl w-full max-h-80 object-contain bg-black/40 mb-4" />
              {error && <p className="text-blood text-sm mb-3" role="alert">{error}</p>}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={reset} className="flex-1" disabled={analyzing}>
                  Cancelar
                </Button>
                <Button onClick={analyze} disabled={analyzing} className="flex-[2]">
                  {analyzing ? 'Analizando…' : '🔍 Analizar'}
                </Button>
              </div>
              {analyzing && <div className="mt-4"><Spinner label="Procesando imagen…" /></div>}
            </Card>
          </motion.div>
        )}

        {step === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card glow={result.mode === 'demo' ? undefined : 'cyan'}>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>Resultado</SectionTitle>
                <Badge color={result.mode === 'demo' ? 'ember' : 'cyan'}>
                  {result.mode === 'demo' ? '⚠️ MODO DEMO' : '✨ Análisis IA'}
                </Badge>
              </div>
              <ul className="space-y-2 mb-4">
                {result.observations.map((o, i) => (
                  <li key={i} className="text-sm p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    {o}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-mist">{result.disclaimer}</p>
            </Card>

            {result.mediaId ? (
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">Foto guardada en tu espacio privado</p>
                    <p className="text-xs text-mist">Solo tú puedes verla. Puedes borrarla cuando quieras.</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                    🗑️ Borrar
                  </Button>
                </div>
              </Card>
            ) : (
              <p className="text-xs text-mist text-center">
                El original no se guardó (tu elección). Nada queda almacenado de esta foto.
              </p>
            )}

            <Button variant="secondary" onClick={reset} className="w-full">
              ← Analizar otra foto
            </Button>

            <ConfirmDialog
              open={confirmDelete}
              onCancel={() => setConfirmDelete(false)}
              onConfirm={deleteMedia}
              title="Borrar foto"
              description="La foto se eliminará de tu espacio privado de forma permanente."
              confirmLabel="Sí, borrar"
              danger
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
