# duitama-taxi-pricing

[![Last Commit](https://img.shields.io/github/last-commit/sebasgao05/duitama-taxi-pricing?logo=git&logoColor=white)](https://github.com/sebasgao05/duitama-taxi-pricing/commits/main)
[![Coverage](https://codecov.io/gh/sebasgao05/duitama-taxi-pricing/branch/main/graph/badge.svg)](https://codecov.io/gh/sebasgao05/duitama-taxi-pricing)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/sebasgao05/duitama-taxi-pricing/ci.yml?branch=main&logo=githubactions&logoColor=white&label=CI%2FCD)](https://github.com/sebasgao05/duitama-taxi-pricing/actions/workflows/ci.yml)
[![Open Issues](https://img.shields.io/github/issues/sebasgao05/duitama-taxi-pricing?logo=github)](https://github.com/sebasgao05/duitama-taxi-pricing/issues)
[![Open PRs](https://img.shields.io/github/issues-pr/sebasgao05/duitama-taxi-pricing?logo=github&label=pull%20requests)](https://github.com/sebasgao05/duitama-taxi-pricing/pulls)

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Zod](https://img.shields.io/badge/Zod-4.3-3E67B1?logo=zod&logoColor=white)](https://zod.dev)
[![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest&logoColor=white)](https://jestjs.io)
[![AWS SAM](https://img.shields.io/badge/AWS%20SAM-Lambda-FF9900?logo=awslambda&logoColor=white)](https://aws.amazon.com/serverless/sam)

API REST para calcular tarifas de taxi en Duitama, Boyacá — Decreto 033 del 16 de enero de 2026.

## Arquitectura

```
GitHub Actions
    │
    ├── PR abierto  → test → deploy QA   (API Gateway + Lambda)
    ├── Merge main  → test → deploy Staging → (aprobación) → deploy Production
    │
    └── AWS SAM → CloudFormation
                      └── API Gateway REST ──(caché GET, solo production)──► Lambda (Node.js 20)
                                                                                  └── Express App
```

Los artefactos se empaquetan con SAM y se suben a S3 antes del deploy.

> El stage de API Gateway (`/qa`, `/staging`, `/production`) se elimina automáticamente del path antes de llegar a Express, por lo que las rutas funcionan igual en todos los ambientes.

## Ambientes

| Ambiente | Trigger | Caché API Gateway | URL |
|----------|---------|-------------------|-----|
| QA | PR a `main` | ❌ | generada por SAM |
| Staging | Push a `main` | ❌ | generada por SAM |
| Production | Aprobación manual | ✅ 600s en GET | generada por SAM |

## Instalación local

**Requisitos:** Node.js ≥ 18, npm ≥ 9

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor local con hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm run build:lambda` | Compilar + copiar swagger.yaml a dist/ |
| `npm start` | Servidor producción |
| `npm test` | Correr tests |
| `npm run test:coverage` | Tests con cobertura |

## Seguridad

- Headers HTTP seguros con `helmet` (CSP configurado para permitir Swagger UI desde CDN)
- Inputs de headers HTTP sanitizados para prevenir XSS en `/docs`
- Sin rate limiting — API pública sin autenticación
- Ver [SECURITY.md](./SECURITY.md) para reportar vulnerabilidades

## Endpoints

| Método | Ruta | Descripción | Caché |
|--------|------|-------------|-------|
| `POST` | `/api/v2026/calculate-fare` | Calcular tarifa de un viaje | ❌ |
| `GET` | `/api/v2026/zones` | Sectores con colores para mapa | ✅ |
| `GET` | `/api/v2026/sector?barrio=...` | Consultar sector de un barrio | ✅ |
| `GET` | `/api/v2026/barrios` | Barrios agrupados por sector (general + terminal) | ✅ |
| `GET` | `/api/v2026/rutas-especiales` | Rutas con tarifa fija | ✅ |
| `GET` | `/docs` | Documentación Swagger | — |
| `GET` | `/health` | Health check | ❌ |

## Ejemplo de uso

```bash
curl -X POST http://localhost:3000/api/v2026/calculate-fare \
  -H "Content-Type: application/json" \
  -d '{"origen":"San Fernando","destino":"Centro"}'
```

### Respuesta

```json
{
  "success": true,
  "timestamp": "2026-03-10T14:30:00.000Z",
  "request_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "data": {
    "origen": "San Fernando",
    "destino": "Centro",
    "hora_consulta": "09:30",
    "fecha_consulta": "2026-03-10",
    "fuente": "barrios.json → primer_sector",
    "tarifa": 7000,
    "tipo": "diurna",
    "sector_aplicado": "primer sector",
    "detalle": "Tarifa base primer sector diurna",
    "recargos": []
  }
}
```

## Lógica de tarifas

El cálculo sigue un orden de prioridad estricto:

1. **Ruta especial única** — Si origen o destino pertenece a una zona de ruta especial, se aplica tarifa fija (override total)
2. **Tabla Terminal** — Si origen o destino es Terminal de Transporte o Carrera 42, se usa la tabla terminal para el otro barrio
3. **Tabla general** — Para todos los demás casos, se toma el sector **más alto** entre origen y destino
4. Se determina si el horario es **nocturno** (7:00 p.m. – 5:59 a.m.)
5. Se aplica **recargo especial de $600** en Jueves/Viernes Santo y del 16 al 31 de diciembre (no acumulable)

> El matching de barrios es **exacto** (tras normalizar tildes y mayúsculas). No hay aproximaciones.

## Sectores y tarifas 2026

### Tabla general

| Sector | Día | Nocturno |
|--------|-----|----------|
| Primer sector | $7.000 | $7.500 |
| Segundo sector | $7.900 | $8.600 |
| Tarifa especial | $8.600 | $9.200 |
| Tercer sector | $10.200 | $10.900 |
| Cuarto sector | $12.600 | $13.100 |

### Rutas especiales únicas

| Ruta | Día | Nocturno |
|------|-----|----------|
| Ruta 1 — Cogollo / Campohermoso | $15.000 | $15.800 |
| Ruta 2 — Tribuna Mirador / Seminario Mayor | $16.200 | $16.700 |
| Ruta 3 — Ciudadela Industrial / Lecheboy | $19.100 | $19.700 |
| Ruta 4 — Vereda La Trinidad / La Helida | $22.200 | $23.300 |
| Servicio por horas | $36.100 | $36.100 |

> Algunos barrios tienen sector diferente según si el viaje involucra el Terminal. Ej: `Sauna La Frontera` es tercer sector en tabla general pero cuarto sector desde/hacia el Terminal.

## CI/CD

El pipeline usa **GitHub Actions + AWS SAM**:

- `test` — corre en todo PR y push a `main`
- `deploy-qa` — se dispara al abrir un PR, despliega al stack QA
- `deploy-staging` — se dispara al hacer merge a `main`
- `deploy-production` — requiere aprobación manual en GitHub Environments

**Secrets requeridos en GitHub:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Documentación externa

| Plataforma | Enlace | Descripción |
|------------|--------|-------------|
| Mintlify | [mintlify.wiki/sebasgao05/duitama-taxi-pricing](https://mintlify.wiki/sebasgao05/duitama-taxi-pricing/) | Documentación de referencia de la API |
| DeepWiki | [deepwiki.com/sebasgao05/duitama-taxi-pricing](https://deepwiki.com/sebasgao05/duitama-taxi-pricing) | Documentación técnica del repositorio |

## Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md).
