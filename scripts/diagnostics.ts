import { exec } from 'child_process';
import { promisify } from 'util';
import ping from 'ping';
import os from 'os';

const execAsync = promisify(exec);

async function runSystemDiagnostics() {
  console.log('🔍 Ejecutando diagnósticos del sistema...\n');

  // 1. Verificar librerías NPM
  console.log('1. Verificando librerías NPM...');
  try {
    const ping = await import('ping');
    const dns = await import('dns');
    const net = await import('net');
    if (ping && dns && net) {
      console.log('✅ Librerías NPM están disponibles');
      console.log('   - ping: ✅');
      console.log('   - dns: ✅');
      console.log('   - net: ✅');
    }
  } catch (error) {
    console.log('❌ Algunas librerías NPM NO están disponibles');
    console.log('   Error:', error);
  }

  // 2. Verificar conectividad de red
  console.log('\n2. Verificando conectividad de red...');
  try {
    const result = await ping.promise.probe('8.8.8.8', { timeout: 5 });
    if (result.alive) {
      console.log('✅ Conectividad a internet: OK');
      console.log(`   Latencia: ${result.time} ms`);
    } else {
      console.log('❌ Sin conectividad a internet');
    }
  } catch (error) {
    console.log(
      '❌ Error al verificar conectividad:',
      error instanceof Error ? error.message : 'Error desconocido',
    );
  }

  // 3. Verificar interfaces de red
  console.log('\n3. Interfaces de red disponibles:');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach((name) => {
    const nets = interfaces[name];
    if (nets) {
      nets.forEach((net) => {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`✅ ${name}: ${net.address}`);
        }
      });
    }
  });

  // 4. Verificar puerto de desarrollo
  console.log('\n4. Verificando puerto de desarrollo...');
  try {
    const { stdout } = await execAsync('netstat -ano | findstr :3000');
    if (stdout.trim()) {
      console.log('⚠️  Puerto 3000 está en uso:');
      console.log(stdout);
    } else {
      console.log('✅ Puerto 3000 está disponible');
    }
  } catch (error) {
    console.log(
      '✅ Puerto 3000 está disponible (error al verificar):',
      error instanceof Error ? error.message : 'Error desconocido',
    );
  }

  console.log('\n🔧 Diagnósticos completados.');
}

runSystemDiagnostics().catch(console.error);
