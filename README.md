# andesstay-frontend

Frontend de **AndesStay**, plataforma de reservas de hostales y cabañas.

## Componente

Aplicación Angular con autenticación Microsoft (MSAL / Azure AD).  
Flujo: **Authorization Code + PKCE**. El frontend solo consume AWS API Gateway (nunca los microservicios directo).

## Integrantes

- Cristian Monsalve
- Héctor Olivares
- Rolando Lillo

## Tecnologías

- Angular
- MSAL Angular (`@azure/msal-angular`, `@azure/msal-browser`)
- Azure AD (IDaaS)

## Cómo levantar (local)

```bash
npm install
npm start
```

La app queda en `http://localhost:4200`.

## Dueño del repositorio

Cristian Monsalve. Todo cambio entra por Pull Request sobre `main`.
