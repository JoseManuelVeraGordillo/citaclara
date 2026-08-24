// Entrega del enlace de acceso de un solo uso (FR-001). No se integra ningún
// proveedor real de email/SMS en esta feature (research.md §1, deuda técnica
// consciente): en desarrollo/demo el enlace se escribe en la consola del
// servidor, lista para sustituirse por un proveedor real en una spec futura
// sin tocar la lógica de negocio (generación/validación de token).

export interface EmailSender {
  enviarEnlaceAcceso(destinatario: string, url: string): Promise<void>;
}

/**
 * Último enlace "enviado" por destinatario, solo para que los tests e2e
 * (fuera de producción) puedan verificar el flujo de FR-001 sin un
 * proveedor real de email. Nunca se expone en `NODE_ENV=production`.
 */
export const ultimosEnviosTest = new Map<string, string>();

class EmailSenderConsola implements EmailSender {
  async enviarEnlaceAcceso(destinatario: string, url: string): Promise<void> {
    console.log(`[portal] enlace de acceso para ${destinatario}: ${url}`);
    if (process.env.NODE_ENV !== 'production') {
      ultimosEnviosTest.set(destinatario, url);
    }
  }
}

export const emailSender: EmailSender = new EmailSenderConsola();
