import { randomBytes } from 'node:crypto';

/**
 * Token impredecible del enlace de cancelación de un recordatorio
 * (Clarification, FR-007a): 32 bytes de una fuente criptográfica, en hex.
 * Es el único dato que identifica el recordatorio a cancelar (research.md
 * §5) — no debe ser posible adivinarlo ni deducirlo de otro dato de la cita.
 */
export function generarTokenCancelacion(): string {
  return randomBytes(32).toString('hex');
}
