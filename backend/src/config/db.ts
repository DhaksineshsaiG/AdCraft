import prisma from '../database/prisma';

const state: { isConnected: boolean; lastError?: string } = {
  isConnected: false,
};

export async function connectDB(): Promise<void> {
  if (state.isConnected) return;

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    state.isConnected = true;
    state.lastError = undefined;
    console.info('[DB] PostgreSQL connected via Prisma.');
  } catch (error) {
    state.isConnected = false;
    state.lastError = error instanceof Error ? error.message : String(error);
    console.error('[DB] PostgreSQL connection failed:', state.lastError);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  state.isConnected = false;
  console.info('[DB] PostgreSQL connection closed gracefully.');
}

export function getDBStatus(): {
  isConnected: boolean;
  readyState: number;
  readyStateLabel: string;
} {
  return {
    isConnected: state.isConnected,
    readyState: state.isConnected ? 1 : 0,
    readyStateLabel: state.isConnected ? 'connected' : 'disconnected',
  };
}

export default connectDB;
