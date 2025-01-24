import { rmSync } from 'fs';

// Constantes para directorios
const DIRECTORIES = {
  node: 'node_modules',
  dist: 'app/dist',
  build: 'release/build',
  package: 'package-lock.json',
};

// Función para eliminar un directorio
function removeDirectory(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

// Función para limpiar todos los directorios
function cleanAll(): void {
  Object.values(DIRECTORIES).forEach(removeDirectory);
}

// Manejo de comandos
const command = process.argv[2];
switch (command) {
  case '--clean':
    cleanAll();
    break;
  case '--dist':
    removeDirectory(DIRECTORIES.dist);
    break;
  case '--build':
    removeDirectory(DIRECTORIES.build);
    break;
  default:
}
