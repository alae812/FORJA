/**
 * Test del adaptador local: la caché en memoria debe invalidarse cuando el
 * fichero cambia en disco. En dev (Turbopack) las páginas y las rutas API
 * pueden evaluar este módulo en ámbitos distintos; sin invalidación, un ámbito
 * no vería los perfiles creados por el otro (bug real detectado en e2e).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { LocalRepository } from '@/lib/db/local';

describe('LocalRepository — invalidación de caché', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forja-test-'));
    process.env.FORJA_DATA_DIR = dir;
  });

  afterEach(async () => {
    delete process.env.FORJA_DATA_DIR;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('dos instancias ven los datos escritos por la otra', async () => {
    const repoA = new LocalRepository();
    const repoB = new LocalRepository(); // simula otro ámbito de módulo

    const profile = await repoA.createProfile({ heroName: 'CacheTest' });
    // repoB nunca ha cargado: debe leer del disco y encontrar el perfil
    const found = await repoB.getProfile(profile.id);
    expect(found?.heroName).toBe('CacheTest');

    // Y a la inversa: A ve lo que escribe B
    await repoB.createProfile({ heroName: 'Otro' });
    expect((await repoA.getProfileByHeroName('otro'))?.heroName).toBe('Otro');
    expect((await repoA.getProfileByHeroName('cachetest'))?.heroName).toBe('CacheTest');
  });

  it('una instancia recarga si el fichero cambia externamente', async () => {
    const repo = new LocalRepository();
    expect(await repo.getProfileByHeroName('externo')).toBeNull();

    // Simula una escritura externa (otro proceso / otro ámbito)
    const file = path.join(dir, 'forja-db.json');
    const raw = JSON.parse(await fs.readFile(file, 'utf8'));
    raw.profiles.push({
      id: 'externo-1',
      heroName: 'Externo',
      createdAt: new Date().toISOString(),
      onboardingDone: true,
      dailyGoalXp: 30,
    });
    await fs.writeFile(file, JSON.stringify(raw), 'utf8');

    expect((await repo.getProfileByHeroName('externo'))?.id).toBe('externo-1');
  });
});
