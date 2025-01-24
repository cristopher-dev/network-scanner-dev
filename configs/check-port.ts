import detectPort from 'detect-port';
import { port } from '../DevConfig.json';

const DEFAULT_PORT = parseInt(port, 10);

async function validatePort(requestedPort: number): Promise<void> {
  try {
    const availablePort = await detectPort(requestedPort);

    if (requestedPort !== availablePort) {
      throw new Error(`Puerto ${requestedPort} no está disponible`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error validando puerto:', error.message);
    }
    process.exit(1);
  }
}

validatePort(DEFAULT_PORT);
