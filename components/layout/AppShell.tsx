'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

const TABS = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/entrenar', label: 'Entrenar', icon: '⚔️' },
  { href: '/historia', label: 'Historia', icon: '📖' },
  { href: '/informe', label: 'Informe', icon: '📊' },
  { href: '/personaje', label: 'Héroe', icon: '🧝' },
];

const HIDDEN_ON = ['/auth', '/onboarding'];

/**
 * AppShell con Suspense: usePathname no está disponible durante el
 * prerender estático, así que el cromo de navegación se resuelve en el cliente.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex flex-col max-w-2xl mx-auto w-full">
          <main className="flex-1 w-full px-4 pt-4 pb-28">{children}</main>
        </div>
      }
    >
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <div className="min-h-dvh flex flex-col max-w-2xl mx-auto w-full">
      {!hideNav && (
        <header className="sticky top-0 z-30 glass border-b border-line/60">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2" aria-label="FORJA inicio">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-xl font-black text-[#06060c] shadow-[0_0_18px_rgba(167,139,250,0.5)]" aria-hidden>
                F
              </span>
              <span className="font-display text-xl font-black tracking-widest text-glow-violet">
                FORJA
              </span>
            </Link>
            <Link
              href="/ajustes"
              className="w-9 h-9 rounded-xl glass flex items-center justify-center text-lg hover:border-neon-violet/60 transition-colors"
              aria-label="Ajustes"
            >
              ⚙️
            </Link>
          </div>
        </header>
      )}

      <main className={`flex-1 w-full px-4 pt-4 ${hideNav ? '' : 'pb-28'} sm:pb-28`}>
        {children}
      </main>

      {!hideNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-line/60"
          aria-label="Navegación principal"
        >
          <div className="max-w-2xl mx-auto grid grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
            {TABS.map((tab) => {
              const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-[11px] font-bold transition-colors ${
                    active ? 'text-neon-cyan' : 'text-mist hover:text-bone'
                  }`}
                >
                  <span className={`text-xl ${active ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : ''}`} aria-hidden>
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
