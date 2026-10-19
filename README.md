# AndesStay — Frontend

## Nombre

`andesstay-frontend`

## Componente

Frontend web de AndesStay (aplicación Angular).

## Descripción

Aplicación Angular de la plataforma de reservas de hostales y cabañas.  
Autenticación con Azure AD (MSAL) usando **Authorization Code + PKCE**.  
El frontend solo consume el BFF / API Gateway (`apiUrl`). No llama directo a los microservicios de dominio.

## Integrantes

- Cristian Monsalve
- Héctor Olivares
- Rolando Lillo

**Dueño del repositorio:** Cristian Monsalve

## Tecnologías

- Angular 19
- TypeScript
- MSAL Angular (`@azure/msal-angular`, `@azure/msal-browser`)
- Azure AD / Microsoft Entra ID

## Cómo levantar (local)

```bash
npm install
npm start
```

App: `http://localhost:4200`.

Configura `src/environments/environment.ts` → `apiUrl` apuntando al BFF o Gateway (ej. lab local `http://localhost:8083/api`). **No** subir URLs personales ni secretos a `main`.

## Pantallas (tras login)

| Ruta | Uso | Roles |
| --- | --- | --- |
| `/login` | Inicio de sesión MSAL | público |
| `/dashboard` | Sesión + `GET /api/me` | Cliente, Operador, Auditor, Admin |
| `/catalogo` | Unidades, tarifa, disponibilidad; Admin crea/edita | Operación: Admin/Operador; Cliente recibe 403 del BFF |
| `/reservas` | Listado y cambio de estado | Admin, Operador, Cliente (estado: Admin/Operador) |
| `/reservas/nueva` | Alta de reserva | Cliente, Operador, Admin |
| `/auditoria` | Métricas/eventos | Auditor, Admin |

## Usuarios de prueba

Mismo tenant (`proyectomonsalve.onmicrosoft.com`):

- `andesstay.admin@…` → Admin  
- `andesstay.operador@…` → Operador  
- `andesstay.cliente@…` → Cliente  
- `andesstay.auditor@…` → Auditor  

Contraseñas fuera de Git. Detalle de identidad: repo [andesstay-docs](https://github.com/cristianmonsalve14/andesstay-docs) → `IDENTIDAD.md`.

## Docs del equipo

- Arquitectura y matriz: [andesstay-docs](https://github.com/cristianmonsalve14/andesstay-docs)
- Issue documentación: [docs#3](https://github.com/cristianmonsalve14/andesstay-docs/issues/3)

## Convención de ramas

- La rama `main` está protegida: **prohibido push directo**.
- Todo cambio entra por **Pull Request**.
- Se exige **al menos 1 reviewer** distinto al autor antes del merge.
