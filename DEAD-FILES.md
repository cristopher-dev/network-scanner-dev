# Análisis de Archivos No Utilizados (Dead Files)

Este proyecto incluye herramientas para identificar y gestionar archivos y dependencias no utilizadas.

## Herramientas Configuradas

### 1. Unimported

Herramienta principal para detectar archivos y dependencias no utilizadas.

**Comandos disponibles:**

```bash
npm run unimported          # Análisis básico
npm run unimported:report   # Reporte detallado con archivos JSON
npm run unimported:update   # Actualizar listas de ignorar
npm run unimported:fix      # Intentar corregir automáticamente
```

### 2. Deadfile (Backup)

Herramienta alternativa para detectar archivos muertos.

**Comandos disponibles:**

```bash
npm run deadfile            # Análisis básico
npm run deadfile:fix        # Intentar corregir automáticamente
npm run deadfile:clean      # Limpieza usando script personalizado
```

## Archivos de Configuración

### `.unimportedrc.json`

Configuración principal para unimported:

- **entry**: Archivos de entrada del proyecto
- **ignorePatterns**: Patrones de archivos a ignorar
- **ignoreUnused**: Dependencias que se mantienen aunque no se usen directamente
- **ignoreUnimported**: Archivos que se mantienen aunque no se importen

### `.deadfilerc`

Configuración para deadfile (modo de respaldo).

## Reportes

Los reportes se generan en el directorio `reports/`:

- `unused-files.json`: Lista detallada de archivos no utilizados
- `unused-dependencies.json`: Lista de dependencias no utilizadas

## Archivos y Dependencias Actualmente No Utilizados

### Archivos No Utilizados (18):

1. `src/components/ResultsGrid.tsx`
2. `src/main/auth/authManager.ts`
3. `src/main/cache/cacheManager.ts`
4. `src/main/config/validator.ts`
5. `src/main/performance/monitor.ts`
6. `src/main/ReportGenerator.ts`
7. `src/main/serviceDetector.ts`
8. `src/renderer/components/DeviceDetails.tsx`
9. `src/renderer/components/LiveMonitor.tsx`
10. `src/renderer/components/NetworkDashboard.tsx`
11. `src/renderer/components/NetworkStats.tsx`
12. `src/renderer/components/NetworkTopology.tsx`
13. `src/renderer/components/NotificationSystem.tsx`
14. `src/renderer/components/RealTimeMetrics.tsx`
15. `src/renderer/components/ScanningProgress.tsx`
16. `src/renderer/components/StatusPanel.tsx`
17. `src/services/ReportGenerator.ts`
18. `src/services/SecurityScanner.ts`

### Dependencias No Utilizadas (15):

1. `@types/bcryptjs`
2. `@types/file-saver`
3. `@types/jspdf`
4. `@types/netmask`
5. `@types/node-cache`
6. `@types/papaparse`
7. `bcryptjs`
8. `deadfile`
9. `dotenv`
10. `file-saver`
11. `jspdf`
12. `netmask`
13. `papaparse`
14. `systeminformation`
15. `zod`

## Recomendaciones

### ¿Qué hacer con los archivos no utilizados?

1. **Revisar**: Antes de eliminar, verificar si son archivos de funcionalidades futuras o en desarrollo.
2. **Mover**: Considerar mover a una carpeta `drafts/` o `future/` si son para desarrollo futuro.
3. **Eliminar**: Si definitivamente no se usan, eliminar para mantener el código limpio.

### ¿Qué hacer con las dependencias no utilizadas?

1. **Verificar**: Algunas pueden ser dependencias de desarrollo o para funcionalidades futuras.
2. **Documentar**: Si se mantienen para uso futuro, documentar el motivo.
3. **Eliminar**: Remover dependencias definitivamente no utilizadas para reducir el tamaño del bundle.

## Automatización

Para automatizar la limpieza, puedes:

1. Ejecutar `npm run unimported:report` regularmente
2. Revisar los reportes generados en `reports/`
3. Tomar decisiones informadas sobre qué conservar o eliminar
4. Actualizar las listas de ignorar con `npm run unimported:update`

## Integración con CI/CD

Considera agregar checks automáticos en tu pipeline:

```bash
# En tu script de CI/CD
npm run unimported
if [ $? -ne 0 ]; then
  echo "❌ Se encontraron archivos o dependencias no utilizadas"
  exit 1
fi
```
