-- Extensión requerida para restricciones EXCLUDE con igualdad (uuid) + rango (gist)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('reservada', 'completada', 'cancelada', 'no_asistida');

-- CreateTable
CREATE TABLE "despachos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "claveSecretariaHash" TEXT NOT NULL,
    "clavePanelHash" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despachos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profesionales" (
    "id" TEXT NOT NULL,
    "despachoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "profesionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" TEXT NOT NULL,
    "despachoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "precioCentimos" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "despachoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citas" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'reservada',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profesionales_despachoId_idx" ON "profesionales"("despachoId");

-- CreateIndex
CREATE INDEX "servicios_despachoId_idx" ON "servicios"("despachoId");

-- CreateIndex
CREATE INDEX "clientes_despachoId_idx" ON "clientes"("despachoId");

-- CreateIndex
CREATE INDEX "citas_profesionalId_inicio_idx" ON "citas"("profesionalId", "inicio");

-- AddForeignKey
ALTER TABLE "profesionales" ADD CONSTRAINT "profesionales_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "despachos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "despachos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "despachos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "profesionales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RN1 (Principio III, FR-004, FR-005): cero solape de horario por profesional,
-- garantizado a nivel de base de datos (no solo en la capa de aplicación) para
-- que sea imposible incluso bajo condiciones de carrera entre secretarias
-- simultáneas. Solo se considera el hueco ocupado por citas 'reservada' o
-- 'completada'; 'cancelada' y 'no_asistida' liberan el hueco.
ALTER TABLE "citas" ADD CONSTRAINT "citas_sin_solape_por_profesional"
    EXCLUDE USING gist (
        "profesionalId" WITH =,
        tsrange("inicio", "fin") WITH &&
    )
    WHERE (estado IN ('reservada', 'completada'));
