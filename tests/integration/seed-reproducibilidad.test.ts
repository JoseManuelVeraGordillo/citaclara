// Reproducibilidad de la semilla determinista (Principio V, FR-015, SC-004):
// regenerar la semilla dos veces debe producir exactamente los mismos datos.
//
// Requiere una base de datos PostgreSQL de test accesible en
// `DATABASE_URL_TEST` (o `DATABASE_URL`), migrada (`npx prisma migrate deploy`).
// Ejecuta `prisma migrate reset` internamente: usar solo contra una base de
// datos de test, nunca contra la de desarrollo/producción.

import { execFileSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

function ejecutar(comando: string, args: string[]): string {
  return execFileSync(comando, args, {
    encoding: 'utf-8',
    env: { ...process.env },
    shell: process.platform === 'win32',
  });
}

function regenerarYObtenerSnapshot(): unknown {
  ejecutar('npx', ['prisma', 'migrate', 'reset', '--force']);
  ejecutar('npx', ['tsx', 'prisma/seed.ts']);
  const salida = ejecutar('npx', ['tsx', 'prisma/scripts/seed-snapshot.ts']);
  return JSON.parse(salida);
}

describe('Reproducibilidad de la semilla determinista (Principio V, SC-004)', () => {
  afterAll(async () => {
    const { prisma } = await import('@/lib/db/prisma');
    await prisma.$disconnect();
  });

  it('dos regeneraciones sucesivas producen exactamente los mismos datos', () => {
    const snapshot1 = regenerarYObtenerSnapshot();
    const snapshot2 = regenerarYObtenerSnapshot();
    expect(snapshot2).toEqual(snapshot1);
  }, 120_000);
});
