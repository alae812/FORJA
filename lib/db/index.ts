/**
 * FORJA — Selector de persistencia.
 * Supabase si hay credenciales; si no, adaptador local (modo demo).
 */
import type { DbRepository } from './repository';
import { localRepository } from './local';
import { supabaseRepository } from './supabase';

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function dbMode(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}

export function getDb(): DbRepository {
  return isSupabaseConfigured() ? supabaseRepository() : localRepository();
}

export type { DbRepository };
