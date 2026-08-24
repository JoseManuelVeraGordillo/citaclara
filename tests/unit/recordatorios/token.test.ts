// Seguridad del token de cancelación: longitud, aleatoriedad, no correlativo (FR-007a).
import { describe, expect, it } from 'vitest';
import { generarTokenCancelacion } from '@/lib/recordatorios/token';

describe('generarTokenCancelacion (FR-007a)', () => {
  it('genera un token hexadecimal de al menos 32 bytes (64 caracteres hex)', () => {
    const token = generarTokenCancelacion();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('genera tokens distintos en llamadas consecutivas, sin patrón correlativo', () => {
    const tokens = Array.from({ length: 20 }, () => generarTokenCancelacion());
    expect(new Set(tokens).size).toBe(20);

    // No deben compartir un prefijo largo común (indicativo de un contador/patrón).
    for (let i = 1; i < tokens.length; i++) {
      let prefijoComun = 0;
      while (
        prefijoComun < tokens[i].length &&
        tokens[i][prefijoComun] === tokens[i - 1][prefijoComun]
      ) {
        prefijoComun++;
      }
      expect(prefijoComun).toBeLessThan(8);
    }
  });
});
