'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/primitives';

/** Acceso demo: crea o recupera tu héroe local */
export default function AuthPage() {
  const router = useRouter();
  const [heroName, setHeroName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = heroName.trim();
    if (name.length < 2) {
      setError('El nombre del héroe necesita al menos 2 letras.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ heroName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo entrar');
      router.replace(data.profile.onboardingDone ? '/' : '/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-4xl font-black text-[#06060c] shadow-[0_0_40px_rgba(167,139,250,0.6)] mb-4" aria-hidden>
            F
          </div>
          <h1 className="font-display text-4xl font-black tracking-widest text-glow-violet">
            FORJA
          </h1>
          <p className="text-mist mt-2">Tu historia de entrenamiento empieza aquí.</p>
        </div>

        <Card glow="violet">
          <h2 className="font-display text-lg font-bold mb-1">Entra como héroe</h2>
          <p className="text-xs text-mist mb-4">
            Modo demo privado: tu héroe se guarda en este dispositivo. Sin contraseña, sin nube.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="heroName" className="block text-sm text-mist mb-1.5">
                Nombre de héroe
              </label>
              <input
                id="heroName"
                className="field-input"
                placeholder="p. ej. AlbaForjada"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
                maxLength={24}
                autoComplete="nickname"
              />
            </div>
            {error && (
              <p className="text-blood text-sm" role="alert">{error}</p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Abriendo la forja…' : '⚔️ Entrar a la forja'}
            </Button>
          </form>
        </Card>

        <p className="text-[11px] text-mist text-center mt-4">
          Al entrar aceptas que tus datos se guarden localmente en modo demo.
        </p>
      </motion.div>
    </div>
  );
}
