# duitama-taxi-pricing

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

## Endpoints

| Método | Ruta | Descripción | Caché |
|--------|------|-------------|-------|
| `POST` | `/api/v2026/calculate-fare` | Calcular tarifa de un viaje | ❌ |
| `GET` | `/api/v2026/zones` | Sectores con colores para mapa | ✅ |
| `GET` | `/api/v2026/sector?barrio=...` | Consultar sector de un barrio | ✅ |
| `GET` | `/api/v2026/barrios` | Barrios agrupados por sector | ✅ |
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
    "tarifa": 7000,
    "tipo": "diurna",
    "sector_aplicado": "primer sector",
    "detalle": "Tarifa base primer sector diurna",
    "recargos": []
  }
}
```

## Lógica de tarifas

1. Se identifica el sector del origen y del destino
2. Se aplica el sector **más alto** entre ambos
3. Se verifica si aplica una **tarifa especial única** (rutas fijas)
4. Se determina si el horario es **nocturno** (7:00 p.m. – 5:59 a.m.)
5. Se aplica **recargo especial de $600** en Jueves/Viernes Santo y del 16 al 31 de diciembre (no acumulable)

## Sectores y tarifas 2026

| Sector | Día | Nocturno |
|--------|-----|----------|
| Primer sector | $7.000 | $7.500 |
| Segundo sector | $7.900 | $8.600 |
| Tarifa especial | $8.600 | $9.200 |
| Tercer sector | $10.200 | $10.900 |
| Cuarto sector | $12.600 | $13.100 |

## CI/CD

El pipeline usa **GitHub Actions + AWS SAM**:

- `test` — corre en todo PR y push a `main`
- `deploy-qa` — se dispara al abrir un PR, despliega al stack QA
- `deploy-staging` — se dispara al hacer merge a `main`
- `deploy-production` — requiere aprobación manual en GitHub Environments

**Secrets requeridos en GitHub:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md).
