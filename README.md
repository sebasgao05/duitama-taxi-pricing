# duitama-taxi-pricing

API REST para calcular tarifas de taxi en Duitama, Boyacá — Decreto 033 del 16 de enero de 2026.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm run build
npm start
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v2026/calculate-fare` | Calcular tarifa de un viaje |
| `GET` | `/api/v2026/zones` | Sectores con colores para mapa |
| `GET` | `/api/v2026/sector?barrio=...` | Consultar sector de un barrio |
| `GET` | `/api/v2026/barrios` | Barrios agrupados por sector |
| `GET` | `/api/v2026/rutas-especiales` | Rutas con tarifa fija |
| `GET` | `/docs` | Documentación Swagger |
| `GET` | `/health` | Health check |

## Ejemplo de uso

```bash
curl -X POST http://localhost:3000/api/v2026/calculate-fare \
  -H "Content-Type: application/json" \
  -d '{"origen":"San Fernando","destino":"Centro"}'
```

### Respuesta

```json
{
  "tarifa": 7500,
  "tipo": "nocturna",
  "sector_aplicado": "primer sector",
  "detalle": "Tarifa base primer sector nocturna",
  "recargos": []
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
