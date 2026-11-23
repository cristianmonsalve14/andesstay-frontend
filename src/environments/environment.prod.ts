/**
 * Entorno de laboratorio / EC2 (C-01).
 * redirectUri = origen público del FE en el puerto 80.
 * apiUrl = HTTP API (execute-api) + /api — el navegador no llama al BFF :8080.
 * Alineado con andesstay-infra PR #18 (FRONTEND_PUBLIC_ORIGIN / GATEWAY).
 */
export const environment = {
  production: true,
  clientId: '4cd6df9a-e2f7-4024-aea6-dd67c49709bc',
  tenantId: 'cb0b9f53-0ba7-4f09-8da2-c2f5ab4b73ee',
  authority:
    'https://login.microsoftonline.com/cb0b9f53-0ba7-4f09-8da2-c2f5ab4b73ee',
  redirectUri: 'http://54.211.241.28',
  apiScopes: ['api://4cd6df9a-e2f7-4024-aea6-dd67c49709bc/access_as_user'],
  apiUrl: 'https://lmv59t05gg.execute-api.us-east-1.amazonaws.com/prod/api',
};
