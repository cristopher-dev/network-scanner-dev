#!/usr/bin/env node

/**
 * Script para analizar archivos no utilizados en el proyecto
 * Genera reportes detallados y permite limpiar archivos automáticamente
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPORT_DIR = 'reports';
const UNUSED_FILES_REPORT = path.join(REPORT_DIR, 'unused-files.json');
const UNUSED_DEPS_REPORT = path.join(REPORT_DIR, 'unused-dependencies.json');

// Crear directorio de reportes si no existe
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

interface UnimportedResult {
  unimported: string[];
  unused: string[];
}

function runUnimported(): UnimportedResult {
  try {
    console.log('🔍 Analizando archivos no utilizados...');

    // Ejecutar unimported y capturar la salida
    const output = execSync('npx unimported --json', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const result = JSON.parse(output);
    return result;
  } catch (error: any) {
    console.error('❌ Error ejecutando unimported:', error.message);
    process.exit(1);
  }
}

function generateReport(data: UnimportedResult) {
  console.log('📊 Generando reportes...');

  // Reporte de archivos no utilizados
  const unusedFilesReport = {
    timestamp: new Date().toISOString(),
    count: data.unimported?.length || 0,
    files: data.unimported || [],
  };

  // Reporte de dependencias no utilizadas
  const unusedDepsReport = {
    timestamp: new Date().toISOString(),
    count: data.unused?.length || 0,
    dependencies: data.unused || [],
  };

  fs.writeFileSync(UNUSED_FILES_REPORT, JSON.stringify(unusedFilesReport, null, 2));
  fs.writeFileSync(UNUSED_DEPS_REPORT, JSON.stringify(unusedDepsReport, null, 2));

  console.log(`✅ Reportes generados en el directorio '${REPORT_DIR}'`);
  console.log(`📁 Archivos no utilizados: ${unusedFilesReport.count}`);
  console.log(`📦 Dependencias no utilizadas: ${unusedDepsReport.count}`);
}

function showSummary(data: UnimportedResult) {
  console.log('\n📋 RESUMEN DE ANÁLISIS');
  console.log('='.repeat(50));

  if (data.unimported && data.unimported.length > 0) {
    console.log(`\n🗃️  ARCHIVOS NO UTILIZADOS (${data.unimported.length}):`);
    data.unimported.forEach((file, index) => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`   ${index + 1}. ${relativePath}`);
    });
  }

  if (data.unused && data.unused.length > 0) {
    console.log(`\n📦 DEPENDENCIAS NO UTILIZADAS (${data.unused.length}):`);
    data.unused.forEach((dep, index) => {
      console.log(`   ${index + 1}. ${dep}`);
    });
  }

  if (
    (!data.unimported || data.unimported.length === 0) &&
    (!data.unused || data.unused.length === 0)
  ) {
    console.log('\n✨ ¡Excelente! No se encontraron archivos o dependencias no utilizadas.');
  }
}

// Ejecutar análisis
const result = runUnimported();
generateReport(result);
showSummary(result);

console.log('\n💡 COMANDOS ÚTILES:');
console.log('   npm run unimported          - Ejecutar análisis básico');
console.log('   npm run unimported:report   - Generar este reporte detallado');
console.log('   npm run unimported:update   - Actualizar listas de ignorar');
console.log('   npm run deadfile:clean      - Limpiar archivos muertos');
