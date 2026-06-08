# Midnight Lace — Frontend

**Repo principal (backend incluido):** [midnight-lace](https://github.com/fedeabeledo/midnight-lace)

Una obra del **Grupo 1**:

- Abeledo, Federico
- Ghillino, Rocío Belén
- Novello, Victoria Abril
- Romero, Mailén Belén

---

## Prefacio

Este es el repositorio del frontend de _Midnight Lace_. Está hecho en React Native con Expo y mucho amor.

La app tiene login, registro multi-paso, gestión de productos propios, catálogo de subastas y mucho más!!! La integración con el backend está en proceso :)

---

## Primera entrega

Puede encontrar flashbacks de la primera entrega en el [repo principal](https://github.com/fedeabeledo/midnight-lace)

---

## Segunda entrega

Plasmamos las pantallas prototipadas en Figma en React Native, viendo que cosas podiamos cambiar en el camino. Ya sea para mejorar o para integrar mejor con el backend.

Como se dijo anteriormente, todo lo referente al backend se encuentra en el [repo principal](https://github.com/fedeabeledo/midnight-lace), mientras que el frontend está acá mismo!!!

---

## Demo en Android

Si tenés un celular Android, vas a tener la suerte y el privilegio de probar el proyecto desde tu celu con un APK!

Para instalarlo:

1. Escaneá el QR o abrí el link directo desde tu celular.
2. Descargá el APK.
3. Si Android se pone desconfiado y pregunta si querés permitir instalar apps desde el navegador, aceptá.
4. Instalá la app y abrila como cualquier aplicación normal.

<p align="center">
  <img src="docs/midnight-lace-apk-qr.png" alt="QR para descargar el APK" width="240" />
</p>

Link directo:

https://raw.githubusercontent.com/vickylinda/MidnightLace-frontend/main/docs/midnight-lace.apk

> Por ahora esta opción es solo para Android. iOS decidió ser iOS.

---

## Stack

- React Native
- Expo
- Amor, mucho amor

---

## Correr el proyecto

```bash
npm install
npx expo start          # Expo Go
```

Variables de entorno en `.env.local`:

```
EXPO_PUBLIC_API_BASE_URL=https://midnight-lace.fedeabeledo.com
EXPO_PUBLIC_API_KEY=esto-es-ultra-secreto-no-lo-puedo-poner-aca
EXPO_PUBLIC_GEOAPIFY_API_KEY=esto-tambien-es-ultra-secreto
```

---

## Decisiones relevantes

### Registro multi-paso

El registro está dividido en tres pantallas:

1. **Datos + DNI** — nombre, email, documento, domicilio, fotos del DNI
2. **Autorización** — pantalla de espera mientras el sistema ultra complejo y automatizado revisa la solicitud
3. **Verificación** — el usuario recibe un código por correo
4. **Contraseña** — finalmente el usuario setea la contraseña y estamos todos contentos

Esto sigue el ciclo de estados del backend: `pendiente` → `verificación` → `activo`.

---

## Estado de integración con el backend

### Conectado

| Pantalla               | Endpoints                                  |
| ---------------------- | ------------------------------------------ |
| Login                  | `POST /v1/auth/login`                      |
| Registro (datos + DNI) | `POST /v1/auth/registro`, `GET /v1/paises` |
| Verificación de email  | `POST /v1/auth/verificar`                  |
| Seteo de contraseña    | `POST /v1/auth/contrasenia`                |
| Mis productos          | `GET /v1/productos`                        |
| Crear producto         | `POST /v1/productos`                       |

### Sin conectar (datos estáticos o mock)

| Pantalla                        | Pendiente                                              |
| ------------------------------- | ------------------------------------------------------ |
| Home                            | Subastas activas                                       |
| Perfil                          | `GET` / `PUT /v1/perfil`                               |
| Métodos de pago                 | `GET` / `POST` / `DELETE /v1/medios-pago`              |
| Todas las subastas              | `GET /v1/subastas` + WebSocket                         |
| Mi actividad                    | Pujas del usuario                                      |
| Resetear contraseña             | `POST /v1/auth/restablecer` |
| Pago de multa                   | Endpoint de multas                                     |
