-- 002-portal-cliente-citas: portal del cliente (FR-001, FR-001a, FR-007a)

-- CreateEnum
CREATE TYPE "OrigenCancelacion" AS ENUM ('secretaria', 'cliente');

-- AlterTable: origen de la cancelación, nulo salvo cuando estado = 'cancelada' (FR-007a)
ALTER TABLE "citas" ADD COLUMN "canceladaPor" "OrigenCancelacion";

-- CreateTable: token de acceso de un solo uso al portal del cliente (FR-001, FR-001a)
CREATE TABLE "solicitudes_acceso_cliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_acceso_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_acceso_cliente_clienteId_idx" ON "solicitudes_acceso_cliente"("clienteId");

-- CreateIndex
CREATE INDEX "solicitudes_acceso_cliente_tokenHash_idx" ON "solicitudes_acceso_cliente"("tokenHash");

-- AddForeignKey
ALTER TABLE "solicitudes_acceso_cliente" ADD CONSTRAINT "solicitudes_acceso_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
