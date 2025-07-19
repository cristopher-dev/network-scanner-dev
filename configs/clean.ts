import { rimraf } from 'rimraf';
import path from 'path';

// Configuración de directorios para limpiar
const CLEAN_TARGETS = {
  clean: ['node_modules', 'app/dist', 'release/build', 'package-lock.json'],
  dist: ['app/dist'],
  build: ['release/build'],
  node_modules: ['node_modules', 'package-lock.json'],
};

// Función mejorada para limpiar directorios
async function cleanDirectories(targets: string[]): Promise<void> {
  const promises = targets.map(async (target) => {
    try {
      const fullPath = path.resolve(target);
      await rimraf(fullPath);
      console.log(`✅ Cleaned: ${target}`);
    } catch (error) {
      console.warn(`⚠️  Failed to clean ${target}:`, error);
    }
  });

  await Promise.all(promises);
}

// Manejo de comandos
const command = process.argv[2] as keyof typeof CLEAN_TARGETS;

if (command && command in CLEAN_TARGETS) {
  cleanDirectories([...CLEAN_TARGETS[command]])
    .then(() => console.log(`🎉 Clean operation '${command}' completed!`))
    .catch(console.error);
} else {
  console.log('Available commands:');
  console.log('  --clean     Clean all (node_modules, dist, build, package-lock)');
  console.log('  --dist      Clean dist directory only');
  console.log('  --build     Clean build directory only');
  console.log('  --node_modules Clean node_modules and package-lock only');
}
