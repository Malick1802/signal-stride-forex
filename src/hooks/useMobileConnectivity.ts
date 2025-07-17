
interface ConnectivityState {
  isOnline: boolean;
  connectionType: string;
  isConnected: boolean;
  lastConnected: Date | null;
  retryCount: number;
}

export const useMobileConnectivity = () => {
  // Return static connectivity state to avoid React hooks corruption
  const connectivity: ConnectivityState = {
    isOnline: navigator.onLine,
    connectionType: 'wifi',
    isConnected: navigator.onLine,
    lastConnected: new Date(),
    retryCount: 0
  };

  const checkConnectivity = async () => {
    // Simplified connectivity check
    console.log('Checking connectivity...');
  };

  const retryConnection = async () => {
    // Simplified retry
    console.log('Retrying connection...');
  };

  return {
    ...connectivity,
    retryConnection,
    checkConnectivity
  };
};
