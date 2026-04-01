# Guía de Contribución

¡Gracias por querer contribuir a **duitama-taxi-pricing**! Este documento explica el proceso para proponer cambios, ya sea corregir un error, actualizar tarifas o agregar nuevas funcionalidades.

---

## Tabla de contenidos

1. [Antes de empezar](#1-antes-de-empezar)
2. [Configurar el entorno local](#2-configurar-el-entorno-local)
3. [Tipos de contribución](#3-tipos-de-contribución)
4. [Flujo de trabajo con Git](#4-flujo-de-trabajo-con-git)
5. [Convención de commits](#5-convención-de-commits)
6. [Estándares de código](#6-estándares-de-código)
7. [Tests](#7-tests)
8. [Abrir un Pull Request](#8-abrir-un-pull-request)
9. [Proceso de revisión](#9-proceso-de-revisión)

---

## 1. Antes de empezar

- Revisa los [issues abiertos](../../issues) para ver si tu idea o bug ya fue reportado.
- Si no existe, **abre un issue primero** antes de escribir código. Esto evita trabajo duplicado.
- Para cambios pequeños (typos, comentarios) puedes ir directo al PR.

---

## 2. Configurar el entorno local

**Requisitos:** Node.js ≥ 18, npm ≥ 9

```bash
# 1. Haz fork del repositorio y clónalo
git clone https://github.com/<tu-usuario>/duitama-taxi-pricing.git
cd duitama-taxi-pricing

# 2. Instala dependencias
npm install

# 3. Copia las variables de entorno
cp .env.example .env

# 4. Levanta el servidor en modo desarrollo
npm run dev
```

Verifica que todo funciona visitando `http://localhost:3000/health`.

---

## 3. Tipos de contribución

| Tipo | Descripción | Requiere issue previo |
|------|-------------|----------------------|
| 🐛 Bug fix | Corregir un error en la lógica de tarifas o la API | Sí |
| 📋 Actualización de datos | Cambiar tarifas, barrios o rutas especiales en `/src/data/` | Sí |
| ✨ Nueva funcionalidad | Agregar un endpoint o lógica nueva | Sí |
| 📝 Documentación | Mejorar README, Swagger, ejemplos | No |
| 🔧 Refactor | Mejorar código sin cambiar comportamiento | No |

---

## 4. Flujo de trabajo con Git

```bash
# 1. Sincroniza tu fork con el repositorio original
git remote add upstream https://github.com/owner/duitama-taxi-pricing.git
git fetch upstream
git checkout main
git merge upstream/main

# 2. Crea una rama descriptiva desde main
git checkout -b fix/calculo-recargo-diciembre
# o
git checkout -b feat/endpoint-historial

# 3. Haz tus cambios y commits (ver convención abajo)

# 4. Sube tu rama
git push origin fix/calculo-recargo-diciembre

# 5. Abre el Pull Request en GitHub
```

**Nomenclatura de ramas:**

| Prefijo | Uso |
|---------|-----|
| `feat/` | Nueva funcionalidad |
| `fix/` | Corrección de bug |
| `data/` | Actualización de tarifas o barrios |
| `docs/` | Solo documentación |
| `refactor/` | Refactorización |

---

## 5. Convención de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>: <descripción corta en español>

[cuerpo opcional]

[referencia al issue: Closes #12]
```

**Tipos válidos:** `feat`, `fix`, `data`, `docs`, `refactor`, `test`, `chore`

**Ejemplos:**

```
fix: corregir cálculo de recargo en Semana Santa
data: actualizar tarifa cuarto sector a $12.600
feat: agregar endpoint de historial de consultas
docs: agregar ejemplos de curl en README
```

---

## 6. Estándares de código

- **TypeScript estricto** — no uses `any` sin justificación.
- La lógica de negocio va en `src/services/`, nunca en controladores.
- Los datos estáticos van en `src/data/` como JSON.
- Sanitiza siempre los inputs que se inyecten en HTML (ver `/docs` en `server.ts` como referencia).
- Mantén los archivos existentes como referencia de estilo.

---

## 7. Tests

Todo cambio en lógica de tarifas **debe incluir o actualizar tests**:

```bash
# Correr todos los tests
npm test

# Ver cobertura
npm run test:coverage
```

- Los tests están en `src/__tests__/`.
- Un PR con tests en rojo **no será mergeado**.

---

## 8. Abrir un Pull Request

Al abrir el PR, la plantilla te pedirá:

- Descripción del cambio
- Issue relacionado
- Tipo de cambio (bug fix, feature, datos, docs)
- Confirmación de que los tests pasan
- Capturas o ejemplos si aplica

**El CI corre automáticamente** al abrir o actualizar el PR. Asegúrate de que pase antes de pedir revisión.

---

## 9. Proceso de revisión

1. Un mantenedor revisará el PR en un plazo de **7 días hábiles**.
2. Puede pedir cambios — responde en el mismo PR, no abras uno nuevo.
3. Una vez aprobado, el mantenedor hace el merge a `main`.
4. Los PRs sin actividad por **30 días** serán cerrados.

---

## ¿Dudas?

Abre un issue con la etiqueta `question` y con gusto te ayudamos.
