'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle, Badge } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Sheet';

export default function PrivacidadPage() {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch('/api/account');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forja-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    const res = await fetch('/api/account', { method: 'DELETE' });
    if (res.ok) {
      router.replace('/auth');
    }
    setDeleting(false);
    setConfirmDelete(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black">🔒 Privacidad y datos</h1>

      <Card glow="cyan">
        <SectionTitle>Tus datos, tus reglas</SectionTitle>
        <ul className="text-sm text-mist space-y-2">
          <li>· <span className="text-bone font-bold">Modo demo:</span> tus datos se guardan localmente en este servidor de desarrollo, sin cifrado. No es apto para producción.</li>
          <li>· <span className="text-bone font-bold">Fotos:</span> nunca son públicas. Solo se sirven a tu sesión y puedes borrarlas cuando quieras.</li>
          <li>· <span className="text-bone font-bold">IA:</span> a los proveedores solo se envía el contexto mínimo (resumen narrativo, atributos de juego, evento). Nunca tu nombre real ni tus fotos sin consentimiento explícito.</li>
          <li>· <span className="text-bone font-bold">Sin telemetría invasiva</span> ni analítica de terceros.</li>
          <li>· Con Supabase configurado se aplican políticas RLS: cada héroe solo accede a sus filas.</li>
        </ul>
      </Card>

      <Card>
        <SectionTitle>📥 Exportar mis datos</SectionTitle>
        <p className="text-sm text-mist mb-4">
          Descarga todo lo que la forja guarda de ti: perfil, sesiones, XP, sueño, nutrición,
          historia y ajustes, en JSON.
        </p>
        <Button variant="secondary" onClick={exportData} disabled={exporting} className="w-full">
          {exporting ? 'Preparando…' : '📥 Descargar mis datos (JSON)'}
        </Button>
      </Card>

      <Card>
        <SectionTitle>🗑️ Eliminar mis datos</SectionTitle>
        <p className="text-sm text-mist mb-4">
          Borra <span className="text-blood font-bold">permanentemente</span> tu héroe, sesiones,
          XP, fotos, historia y ajustes. Esta acción no se puede deshacer.
        </p>
        <Button variant="danger" onClick={() => setConfirmDelete(true)} className="w-full">
          Eliminar todos mis datos
        </Button>
        <div className="mt-3 flex justify-center">
          <Badge color="gray">Derecho de supresión · RGPD</Badge>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
        title="¿Eliminar todo?"
        description="Se borrarán tu héroe, todas las sesiones, la XP, las fotos, la historia y los ajustes. No hay vuelta atrás."
        confirmLabel={deleting ? 'Eliminando…' : 'Sí, borrar todo'}
        danger
      />
    </div>
  );
}
