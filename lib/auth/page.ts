/** Helper de autenticación para Server Components (páginas) */
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getSessionProfileId } from './session';
import type { Profile } from '@/types';

export async function getPageProfile(): Promise<Profile | null> {
  const id = await getSessionProfileId();
  if (!id) return null;
  return getDb().getProfile(id);
}

/** Perfil o redirección a /auth */
export async function requirePageProfile(): Promise<Profile> {
  const profile = await getPageProfile();
  if (!profile) redirect('/auth');
  if (!profile.onboardingDone) redirect('/onboarding');
  return profile;
}
