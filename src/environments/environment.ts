export const environment = {
  production: false,
  clientId: '4cd6df9a-e2f7-4024-aea6-dd67c49709bc',
  tenantId: 'cb0b9f53-0ba7-4f09-8da2-c2f5ab4b73ee',
  authority:
    'https://login.microsoftonline.com/cb0b9f53-0ba7-4f09-8da2-c2f5ab4b73ee',
  redirectUri: 'http://localhost:4200',
  apiScopes: ['api://4cd6df9a-e2f7-4024-aea6-dd67c49709bc/access_as_user'],
  /**
   * Gateway local del proyecto.
   * El valor de AWS solo sirve para demos temporales; en main debe quedar localhost.
   */
  apiUrl: 'http://localhost:8080/api',
};
