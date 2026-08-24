-- CreateEnum
CREATE TYPE "EstadoRecordatorio" AS ENUM ('enviado', 'omitido_sin_email');

-- CreateTable
-- Recordatorios de cita por email (feature 002-recordatorios-cita).
-- Ver specs/002-recordatorios-cita/data-model.md.
CREATE TABLE "recordatorios" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "citaInicio" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoRecordatorio" NOT NULL,
    "token" TEXT,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladoEn" TIMESTAMP(3),

    CONSTRAINT "recordatorios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recordatorios_token_key" ON "recordatorios"("token");

-- CreateIndex
CREATE INDEX "recordatorios_citaId_idx" ON "recordatorios"("citaId");

-- CreateIndex
-- Deduplicacion (FR-004): como maximo un recordatorio por cita/fecha.
CREATE UNIQUE INDEX "recordatorios_citaId_citaInicio_key" ON "recordatorios"("citaId", "citaInicio");

-- AddForeignKey
ALTER TABLE "recordatorios" ADD CONSTRAINT "recordatorios_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
