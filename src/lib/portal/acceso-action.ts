'use server';

import { solicitarAcceso } from '@/lib/portal/acceso';

export interface EstadoSolicitarAcceso {
  mensaje?: string;
}

/** Server Action del formulario de solicitud de acceso (FR-001), compatible con `useActionState`. */
export async function solicitarAccesoFormAction(
  _estadoPrevio: EstadoSolicitarAcceso,
  formData: FormData,
): Promise<EstadoSolicitarAcceso> {
  const telefono = String(formData.get('telefono') ?? '');
  const { mensaje } = await solicitarAcceso(telefono);
  return { mensaje };
}
