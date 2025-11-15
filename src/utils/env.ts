// Environment configuration utility
// This file provides a way to access environment variables at runtime

interface EnvironmentConfig {
  REACT_APP_API_URL: string;
  REACT_APP_ENVIRONMENT: string;
  REALTIME_SESSION_ENDPOINT: string;
}

// Default configuration for development
const defaultConfig: EnvironmentConfig = {
  REACT_APP_API_URL: import.meta.env.VITE_API_URL || 'https://aline-service-hhteadf5zq-uc.a.run.app',
  REACT_APP_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
  REALTIME_SESSION_ENDPOINT:
    import.meta.env.VITE_REALTIME_SESSION_ENDPOINT ||
    '/api/openai-realtime-session',
};

// Get runtime configuration from window.ENV (set by Docker container)
// Falls back to build-time environment variables or defaults
function getEnvironmentConfig(): EnvironmentConfig {
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return {
      REACT_APP_API_URL: (window as any).ENV.REACT_APP_API_URL || defaultConfig.REACT_APP_API_URL,
      REACT_APP_ENVIRONMENT: (window as any).ENV.REACT_APP_ENVIRONMENT || defaultConfig.REACT_APP_ENVIRONMENT,
      REALTIME_SESSION_ENDPOINT:
        (window as any).ENV.VITE_REALTIME_SESSION_ENDPOINT ||
        defaultConfig.REALTIME_SESSION_ENDPOINT,
    };
  }
  return defaultConfig;
}

export const ENV = getEnvironmentConfig();

// Utility functions for API calls
export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = ENV.REACT_APP_API_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
  return cleanEndpoint ? `${baseUrl}/${cleanEndpoint}` : baseUrl;
};

export const getRealtimeSessionEndpoint = (): string => {
  const endpoint = ENV.REALTIME_SESSION_ENDPOINT || '/api/openai-realtime-session';
  return endpoint.startsWith('http') ? endpoint : `${endpoint}`;
};

export const isProduction = (): boolean => {
  return ENV.REACT_APP_ENVIRONMENT === 'production';
};

export const isDevelopment = (): boolean => {
  return ENV.REACT_APP_ENVIRONMENT === 'development';
};
