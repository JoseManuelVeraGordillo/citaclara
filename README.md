<div align="center">

# 📅 CitaClara

**Aplicación moderna de gestión de citas**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

---

## ¿Qué es CitaClara?

CitaClara es una aplicación web para la **gestión de citas** construida con un stack moderno y completo. Diseñada para ser rápida, intuitiva y escalable.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js (App Router) |
| **Lenguaje** | TypeScript |
| **Base de datos** | Prisma ORM |
| **Estilos** | Tailwind CSS + shadcn/ui |
| **Testing unitario** | Vitest |
| **Testing e2e** | Playwright |
| **Calidad** | ESLint + Prettier |
| **Despliegue** | Vercel (recomendado) |

---

## Estructura del proyecto

```
citaclara/
├── src/                # Código fuente de la aplicación
├── prisma/             # Schema y migraciones de base de datos
├── tests/              # Suite de tests (unitarios + e2e)
├── specs/              # Especificaciones de funcionalidad
├── scripts/            # Scripts de utilidad
├── middleware.ts        # Middleware de autenticación/rutas
├── CLAUDE.md           # Configuración para asistente de IA
└── .claude/skills/     # Skills de desarrollo con IA
```

---

## Instalación y desarrollo

```bash
# Clonar
git clone https://github.com/JoseManuelVeraGordillo/citaclara.git
cd citaclara

# Instalar dependencias
npm install

# Configurar base de datos
cp .env.example .env
npx prisma migrate dev

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## Testing

```bash
# Tests unitarios
npm run test

# Tests e2e
npx playwright test
```

---

## Metodología

Este proyecto utiliza **Spec-Driven Development (SDD)**: cada funcionalidad se especifica formalmente antes de implementarse, con historias de usuario, escenarios de aceptación y criterios de éxito verificables.

---

## Autor

[José Manuel Vera Gordillo](https://github.com/JoseManuelVeraGordillo)
