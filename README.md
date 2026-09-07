# AndesStay — Frontend

## Nombre

`andesstay-frontend`

## Componente

Frontend web de AndesStay (aplicación Angular).

## Descripción

Aplicación Angular de la plataforma de reservas de hostales y cabañas.  
Autenticación con Azure AD (MSAL) usando **Authorization Code + PKCE**.  
El frontend solo consume AWS API Gateway. No llama directo a los microservicios.

## Integrantes

- Cristian Monsalve
- Héctor Olivares
- Rolando Lillo

**Dueño del repositorio:** Cristian Monsalve

## Tecnologías

- Angular
- TypeScript
- MSAL Angular (`@azure/msal-angular`, `@azure/msal-browser`)
- Azure AD (IDaaS)

## Convención de ramas

- La rama `main` está protegida: **prohibido push directo**.
- Todo cambio entra por **Pull Request**.
- Se exige **al menos 1 reviewer** distinto al autor antes del merge.
