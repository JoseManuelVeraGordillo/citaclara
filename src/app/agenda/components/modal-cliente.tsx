'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ClienteEncontrado {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
}

export interface ClienteNuevo {
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
}

interface Props {
  onElegirExistente: (cliente: ClienteEncontrado) => void;
  onCrearNuevo: (cliente: ClienteNuevo) => void;
}

/** Búsqueda/creación de ficha de cliente (FR-013, Edge Case de desambiguación por teléfono). */
export function ModalCliente({ onElegirExistente, onCrearNuevo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<'buscar' | 'nuevo'>('buscar');
  const [consulta, setConsulta] = useState('');
  const [resultados, setResultados] = useState<ClienteEncontrado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [nuevo, setNuevo] = useState<ClienteNuevo>({
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
  });

  async function buscar(q: string) {
    setConsulta(q);
    if (q.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const respuesta = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
      const datos = await respuesta.json();
      setResultados(datos.resultados ?? []);
    } finally {
      setBuscando(false);
    }
  }

  function elegir(cliente: ClienteEncontrado) {
    onElegirExistente(cliente);
    setAbierto(false);
  }

  function crear() {
    if (!nuevo.nombre || !nuevo.apellidos || !nuevo.telefono || !nuevo.email) return;
    onCrearNuevo(nuevo);
    setNuevo({ nombre: '', apellidos: '', telefono: '', email: '' });
    setAbierto(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Elegir cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buscar o crear ficha de cliente</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-3">
          <Button
            type="button"
            size="sm"
            variant={modo === 'buscar' ? 'default' : 'ghost'}
            onClick={() => setModo('buscar')}
          >
            Buscar existente
          </Button>
          <Button
            type="button"
            size="sm"
            variant={modo === 'nuevo' ? 'default' : 'ghost'}
            onClick={() => setModo('nuevo')}
          >
            Ficha nueva
          </Button>
        </div>

        {modo === 'buscar' ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="busqueda-cliente">Nombre, apellidos o teléfono</Label>
              <Input
                id="busqueda-cliente"
                value={consulta}
                onChange={(e) => buscar(e.target.value)}
                placeholder="p. ej. Laura García o 612345678"
              />
            </div>
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {buscando && <li className="text-sm text-muted-foreground">Buscando…</li>}
              {!buscando && consulta.trim().length >= 2 && resultados.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  Sin resultados. Prueba con &ldquo;Ficha nueva&rdquo;.
                </li>
              )}
              {resultados.map((cliente) => (
                <li key={cliente.id}>
                  <button
                    type="button"
                    onClick={() => elegir(cliente)}
                    className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {cliente.nombre} {cliente.apellidos} — {cliente.telefono}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nuevo-nombre">Nombre</Label>
                <Input
                  id="nuevo-nombre"
                  value={nuevo.nombre}
                  onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuevo-apellidos">Apellidos</Label>
                <Input
                  id="nuevo-apellidos"
                  value={nuevo.apellidos}
                  onChange={(e) => setNuevo((n) => ({ ...n, apellidos: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-telefono">Teléfono</Label>
              <Input
                id="nuevo-telefono"
                value={nuevo.telefono}
                onChange={(e) => setNuevo((n) => ({ ...n, telefono: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-email">Email</Label>
              <Input
                id="nuevo-email"
                type="email"
                value={nuevo.email}
                onChange={(e) => setNuevo((n) => ({ ...n, email: e.target.value }))}
                required
              />
            </div>
            <Button type="button" onClick={crear} className="w-full">
              Usar esta ficha
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
