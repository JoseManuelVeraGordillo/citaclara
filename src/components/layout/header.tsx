'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { salir } from '@/lib/auth/actions';

const ENLACES = [
  { href: '/agenda', etiqueta: 'Agenda' },
  { href: '/portal/solicitar-acceso', etiqueta: 'Portal cliente' },
  { href: '/panel', etiqueta: 'Panel de analítica' },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-lg font-semibold tracking-tight">CitaClara</p>
          <p className="text-sm text-muted-foreground">Nuria Lagar Abogados</p>
        </div>

        <nav className="flex items-center gap-1">
          {ENLACES.map((enlace) => {
            const activo = pathname?.startsWith(enlace.href);
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  activo
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {enlace.etiqueta}
              </Link>
            );
          })}
        </nav>

        <form action={salir}>
          <Button type="submit" variant="outline" size="sm">
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
