# Plan de Pruebas — Duitama Taxi Pricing API
**Decreto 033 del 16 de enero de 2026**

Base URL: `http://localhost:3000`

> La hora y fecha se toman automáticamente del servidor (zona horaria Colombia UTC-5).
> Para verificar tarifas nocturnas/diurnas ejecute las pruebas en el horario correspondiente.

---

## Estructura de respuesta exitosa

```json
{
  "success": true,
  "timestamp": "2026-03-10T14:30:00.000Z",
  "request_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "data": {
    "origen": "...",
    "destino": "...",
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

## Estructura de respuesta de error

```json
{
  "success": false,
  "timestamp": "2026-03-10T14:30:00.000Z",
  "request_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "error": {
    "code": "SECTOR_NOT_FOUND",
    "message": "No se encontró sector para..."
  }
}
```

---

## 1. Health Check

```http
GET /health
```
```json
{ "status": "ok", "decreto": "033-2026", "version": "1.0.0" }
```

---

## 2. GET /api/v2026/sector — Consultar sector de un barrio

### 2.1 Barrios tabla general (sin Terminal)
```http
GET /api/v2026/sector?barrio=San Fernando
```
```json
{ "success": true, "data": { "barrio": "San Fernando", "sector": "primer sector" } }
```

```http
GET /api/v2026/sector?barrio=Parte Alta Milagrosa
```
```json
{ "success": true, "data": { "barrio": "Parte Alta Milagrosa", "sector": "segundo sector" } }
```

```http
GET /api/v2026/sector?barrio=Barrio León XIII
```
```json
{ "success": true, "data": { "barrio": "Barrio León XIII", "sector": "tarifa especial" } }
```

```http
GET /api/v2026/sector?barrio=Sauna La Frontera
```
```json
{ "success": true, "data": { "barrio": "Sauna La Frontera", "sector": "tercer sector" } }
```

```http
GET /api/v2026/sector?barrio=Cogollo Alto
```
```json
{ "success": true, "data": { "barrio": "Cogollo Alto", "sector": "cuarto sector" } }
```

### 2.2 Barrio no existente → 404
```http
GET /api/v2026/sector?barrio=BarrioInventado
```
```json
{ "success": false, "error": { "code": "BARRIO_NOT_FOUND", "message": "Barrio \"BarrioInventado\" no encontrado" } }
```

### 2.3 Sin parámetro → 400
```http
GET /api/v2026/sector
```
```json
{ "success": false, "error": { "code": "MISSING_PARAM", "message": "Parámetro 'barrio' requerido" } }
```

---

## 3. GET /api/v2026/zones — Zonas para mapa

```http
GET /api/v2026/zones
```

Verificar array con 5 objetos:

| sector | tarifa_dia | tarifa_nocturna | color |
|---|---|---|---|
| primer sector | 7000 | 7500 | #4CAF50 |
| segundo sector | 7900 | 8600 | #2196F3 |
| tarifa especial | 8600 | 9200 | #FF9800 |
| tercer sector | 10200 | 10900 | #9C27B0 |
| cuarto sector | 12600 | 13100 | #F44336 |

---

## 4. GET /api/v2026/barrios — Barrios por sector

```http
GET /api/v2026/barrios
```

Verificar que `data` tenga dos claves: `general` y `terminal`, cada una con los 5 sectores.

```json
{
  "data": {
    "general": {
      "primer sector": ["Santander", "Sevilla", ...],
      "segundo sector": [...],
      "tarifa especial": [...],
      "tercer sector": [...],
      "cuarto sector": [...]
    },
    "terminal": {
      "primer sector": ["Cándido Quintero", "La Esperanza", ...],
      "segundo sector": [...],
      "tarifa especial": [...],
      "tercer sector": [...],
      "cuarto sector": ["Sauna La Frontera", "Las Margaritas", ...]
    }
  }
}
```

> Nota: Los sectores difieren entre `general` y `terminal`. Por ejemplo, `Sauna La Frontera` es **tercer sector** en viajes generales pero **cuarto sector** desde/hacia el Terminal.

---

## 5. GET /api/v2026/rutas-especiales — Rutas con tarifa fija

```http
GET /api/v2026/rutas-especiales
```

| id | tarifa_dia | tarifa_nocturna |
|---|---|---|
| ruta_1 | 15000 | 15800 |
| ruta_2 | 16200 | 16700 |
| ruta_3 | 19100 | 19700 |
| ruta_4 | 22200 | 23300 |
| servicio_horas | 36100 | 36100 |

---

## 6. POST /api/v2026/calculate-fare — Tarifas generales (tabla izquierda)

> Verificar en toda respuesta exitosa: `success: true`, `timestamp` ISO 8601, `request_id` UUID v4, `hora_consulta` HH:MM, `fecha_consulta` YYYY-MM-DD.

### 6.1 Primer sector (día: $7.000 · noche: $7.500)
```json
{ "origen": "Santander", "destino": "San Fernando" }
```
```json
{ "tarifa": 7000, "tipo": "diurna", "sector_aplicado": "primer sector", "recargos": [] }
```

### 6.2 Segundo sector (día: $7.900 · noche: $8.600)
```json
{ "origen": "Parte Alta Milagrosa", "destino": "Comunal" }
```
```json
{ "tarifa": 7900, "tipo": "diurna", "sector_aplicado": "segundo sector" }
```

### 6.3 Tarifa especial (día: $8.600 · noche: $9.200)
```json
{ "origen": "San Fernando", "destino": "Barrio León XIII" }
```
```json
{ "tarifa": 8600, "tipo": "diurna", "sector_aplicado": "tarifa especial" }
```

### 6.4 Tercer sector (día: $10.200 · noche: $10.900)
```json
{ "origen": "Sauna La Frontera", "destino": "San Fernando" }
```
```json
{ "tarifa": 10200, "tipo": "diurna", "sector_aplicado": "tercer sector" }
```

### 6.5 Cuarto sector (día: $12.600 · noche: $13.100)
```json
{ "origen": "Cogollo Alto", "destino": "San Fernando" }
```
```json
{ "tarifa": 12600, "tipo": "diurna", "sector_aplicado": "cuarto sector" }
```

---

## 7. POST /api/v2026/calculate-fare — Tarifas desde/hacia Terminal (tabla derecha)

> Cuando origen o destino es "Terminal de Transporte" o "Carrera 42", la API usa automáticamente la tabla derecha del decreto. El campo `detalle` incluirá `(desde/hacia Terminal)`.

### 7.1 Terminal → San Fernando (primer sector)
```json
{ "origen": "Terminal de Transporte", "destino": "San Fernando" }
```
```json
{ "tarifa": 7000, "tipo": "diurna", "sector_aplicado": "primer sector", "detalle": "Tarifa base primer sector diurna (desde/hacia Terminal)" }
```

### 7.2 Terminal → Parte Alta Milagrosa (segundo sector)
```json
{ "origen": "Terminal de Transporte", "destino": "Parte Alta Milagrosa" }
```
```json
{ "tarifa": 7900, "tipo": "diurna", "sector_aplicado": "segundo sector", "detalle": "Tarifa base segundo sector diurna (desde/hacia Terminal)" }
```

### 7.3 Terminal → Barrio León XIII (tarifa especial)
```json
{ "origen": "Terminal de Transporte", "destino": "Barrio León XIII" }
```
```json
{ "tarifa": 8600, "tipo": "diurna", "sector_aplicado": "tarifa especial", "detalle": "Tarifa base tarifa especial diurna (desde/hacia Terminal)" }
```

### 7.4 Terminal → Capilla Tocogua (tercer sector)
```json
{ "origen": "Terminal de Transporte", "destino": "Capilla Tocogua" }
```
```json
{ "tarifa": 10200, "tipo": "diurna", "sector_aplicado": "tercer sector", "detalle": "Tarifa base tercer sector diurna (desde/hacia Terminal)" }
```

### 7.5 Terminal → Sauna La Frontera (cuarto sector — difiere de tabla general)
```json
{ "origen": "Terminal de Transporte", "destino": "Sauna La Frontera" }
```
```json
{ "tarifa": 12600, "tipo": "diurna", "sector_aplicado": "cuarto sector", "detalle": "Tarifa base cuarto sector diurna (desde/hacia Terminal)" }
```

> ⚠️ Comparar con viaje general: `{ "origen": "Sauna La Frontera", "destino": "San Fernando" }` → **tercer sector $10.200**. Desde el Terminal el mismo barrio es **cuarto sector $12.600**.

### 7.6 Terminal → Las Margaritas (cuarto sector desde Terminal)
```json
{ "origen": "Terminal de Transporte", "destino": "Las Margaritas" }
```
```json
{ "tarifa": 12600, "tipo": "diurna", "sector_aplicado": "cuarto sector" }
```

### 7.7 Terminal → Altos de Surba y Bonza (cuarto sector desde Terminal)
```json
{ "origen": "Terminal de Transporte", "destino": "Altos de Surba y Bonza" }
```
```json
{ "tarifa": 12600, "tipo": "diurna", "sector_aplicado": "cuarto sector" }
```

### 7.8 Carrera 42 como origen (alias del Terminal)
```json
{ "origen": "Carrera 42", "destino": "San Fernando" }
```
```json
{ "tarifa": 7000, "tipo": "diurna", "sector_aplicado": "primer sector", "detalle": "Tarifa base primer sector diurna (desde/hacia Terminal)" }
```

### 7.9 Terminal como destino
```json
{ "origen": "San Fernando", "destino": "Terminal de Transporte" }
```
```json
{ "tarifa": 7000, "tipo": "diurna", "sector_aplicado": "primer sector", "detalle": "Tarifa base primer sector diurna (desde/hacia Terminal)" }
```

---

## 8. Sector más alto entre origen y destino (tabla general)

| Caso | Esperado |
|---|---|
| `Santander` + `Cogollo Alto` | cuarto sector $12.600 |
| `Sauna La Frontera` + `Parte Alta Milagrosa` | tercer sector $10.200 |
| `Santander` + `Barrio León XIII` | tarifa especial $8.600 |
| `Parte Alta Milagrosa` + `Cogollo Alto` | cuarto sector $12.600 |

---

## 9. Tarifas especiales únicas

### 9.1 Ruta 1 — Cogollo / Campohermoso ($15.000 día / $15.800 noche)
```json
{ "origen": "Terminal de Transporte", "destino": "Cogollo" }
```
```json
{ "tarifa": 15000, "sector_aplicado": "tarifa especial única", "detalle": "Ruta del Mundial / Cogollo / Campohermoso" }
```

### 9.2 Ruta 2 — Seminario Mayor ($16.200 día / $16.700 noche)
```json
{ "origen": "Tribuna Mirador", "destino": "Altos de Surba y Bonza" }
```

### 9.3 Ruta 3 — Ciudadela Industrial ($19.100 día / $19.700 noche)
```json
{ "origen": "Ciudadela Industrial", "destino": "Lecheboy" }
```

### 9.4 Ruta 4 — Vereda La Trinidad ($22.200 día / $23.300 noche)
```json
{ "origen": "La Trinidad", "destino": "La Helida" }
```

---

## 10. Recargo especial de $600

| Sector | Día | +Recargo | Noche | +Recargo |
|---|---|---|---|---|
| Primer sector | 7.000 | 7.600 | 7.500 | 8.100 |
| Segundo sector | 7.900 | 8.500 | 8.600 | 9.200 |
| Tarifa especial | 8.600 | 9.200 | 9.200 | 9.800 |
| Tercer sector | 10.200 | 10.800 | 10.900 | 11.500 |
| Cuarto sector | 12.600 | 13.200 | 13.100 | 13.700 |
| Ruta 1 | 15.000 | 15.600 | 15.800 | 16.400 |
| Ruta 2 | 16.200 | 16.800 | 16.700 | 17.300 |
| Ruta 3 | 19.100 | 19.700 | 19.700 | 20.300 |
| Ruta 4 | 22.200 | 22.800 | 23.300 | 23.900 |

Aplica del 16 al 31 de diciembre y en Jueves/Viernes Santo. Verificar en `data.recargos`:
```json
["Recargo especial: +$600"]
```

---

## 11. Validaciones de entrada

### 11.1 Campo `origen` faltante → 400
```json
{ "destino": "San Fernando" }
```
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "details": { "origen": ["El origen es requerido"] } } }
```

### 11.2 Campo `destino` faltante → 400
```json
{ "origen": "Santander" }
```

### 11.3 Body vacío → 400
```json
{}
```

### 11.4 Ambos barrios no registrados → 422
```json
{ "origen": "BarrioFalso", "destino": "OtroBarrioFalso" }
```
```json
{ "success": false, "error": { "code": "SECTOR_NOT_FOUND" } }
```

### 11.5 Tolerancia a tildes y mayúsculas → 200
```json
{ "origen": "san fernando", "destino": "SANTANDER" }
{ "origen": "terminal de transporte", "destino": "sauna la frontera" }
```

---

## 12. Verificación de metadata

```
✓ success === true/false según resultado
✓ timestamp → ISO 8601 UTC
✓ request_id → UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
✓ data.hora_consulta → HH:MM
✓ data.fecha_consulta → YYYY-MM-DD
✓ data.origen y data.destino → coinciden con el input
✓ data.detalle incluye "(desde/hacia Terminal)" cuando aplica
```

---

## 13. Comandos curl de referencia

```bash
# Tarifa general
curl -X POST http://localhost:3000/api/v2026/calculate-fare \
  -H "Content-Type: application/json" \
  -d '{"origen":"Santander","destino":"San Fernando"}'

# Desde Terminal (tabla derecha)
curl -X POST http://localhost:3000/api/v2026/calculate-fare \
  -H "Content-Type: application/json" \
  -d '{"origen":"Terminal de Transporte","destino":"Sauna La Frontera"}'

# Diferencia tabla general vs terminal para el mismo barrio
curl -X POST http://localhost:3000/api/v2026/calculate-fare \
  -H "Content-Type: application/json" \
  -d '{"origen":"Sauna La Frontera","destino":"San Fernando"}'

# Ruta especial única
curl -X POST http://localhost:3000/api/v2026/calculate-fare \
  -H "Content-Type: application/json" \
  -d '{"origen":"Terminal de Transporte","destino":"Cogollo"}'

# Consultar sector
curl "http://localhost:3000/api/v2026/sector?barrio=San%20Fernando"

# Barrios (general + terminal)
curl http://localhost:3000/api/v2026/barrios

# Zonas para mapa
curl http://localhost:3000/api/v2026/zones

# Rutas especiales
curl http://localhost:3000/api/v2026/rutas-especiales

# Health check
curl http://localhost:3000/health
```
