# Backend Mayelewoo (NestJS)

Guía rápida para levantar el backend en local y conectarlo con el frontend estático incluido en `../mayelewoo`.

## 1. Requisitos

- Node.js 18+ (recomendado 18 LTS)
- npm 9+
- Acceso a una base MongoDB (puede ser Atlas o local)

## 2. Clonar e instalar dependencias

```bash
npm install
```

## 3. Variables de entorno (`.env`)

Ejemplo mínimo para desarrollo local (crear/ajustar `.env` en la carpeta raíz del backend):

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/mayelewoo
JWT_SECRET=dev_secret_key_change_me
ADMIN_EMAIL=admin@mayelewoo.com
ADMIN_PASSWORD=admin123
FRONTEND_URL=http://localhost:5500
```

Notas:
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` se usan una sola vez al iniciar para crear el usuario admin si no existe.
- Si usas MongoDB Atlas coloca allí la URL completa (con usuario y contraseña).
- `FRONTEND_URL` ayuda a CORS en producción; en desarrollo CORS está abierto (`origin: true`).

## 4. Ejecutar en desarrollo

```bash
npm run start:dev
```

La API quedará en: `http://localhost:3000/api`

Rutas útiles:
- Salud: `GET http://localhost:3000/health`
- Login: `POST http://localhost:3000/api/auth/login`
- Vouchers: `POST http://localhost:3000/api/vouchers` (FormData) / `GET /api/vouchers`
- Contadores: `POST http://localhost:3000/api/contadores` (FormData) / `GET /api/contadores`
- Archivos subidos: `http://localhost:3000/uploads/...`

## 5. Conectar con el frontend

El frontend (carpeta `../mayelewoo`) es HTML/JS estático que detecta si está en `localhost` y usa automáticamente `http://localhost:3000`.

Opciones para servir el frontend:
1. Abrir directamente los HTML (login, vouchers, etc.) en el navegador (funciona, pero algunas APIs pueden bloquear ciertas features si se abre con `file://`).
2. Servir con un server estático simple (recomendado):
	 ```bash
	 # Dentro de la carpeta frontend
	 npx serve . --listen 5500
	 # o
	 python3 -m http.server 5500
	 ```
	 Luego navegar a: `http://localhost:5500/login.html`

Los scripts del frontend ya construyen la URL base según hostname:
- `login.js` -> `${origin}:3000/api`
- `vouchers.js` -> `${origin}:3000/api/vouchers` (añade `/api` internamente)
- `contadores-luz.js` -> `${origin}:3000/api`

## 6. Credenciales iniciales

Al primer arranque se crea el usuario admin definido en `.env` si no existe.

```json
{
	"email": "admin@mayelewoo.com",
	"password": "admin123"
}
```

## 7. Subida de imágenes

- Vouchers: campo `files` (múltiples) → carpeta `uploads/vouchers`
- Contadores: campo `fotoMedidor` (uno) → carpeta `uploads/contadores`
- Acceso público vía `http://localhost:3000/uploads/...`

## 8. Producción (Render / Docker)

Build:
```bash
npm run build
NODE_ENV=production node dist/main.js
```

En Docker (ejemplo simplificado):
```bash
docker build -t mayelewoo-back .
docker run -p 3000:3000 --env-file .env mayelewoo-back
```

## 9. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| 401 al loguear | Admin no creado | Revisar `.env` y reiniciar servidor |
| CORS bloquea peticiones | Front no en whitelist en producción | Añadir URL a `allowedOrigins` en `main.ts` o setear `FRONTEND_URL` |
| 413 Payload Too Large | Imagen excede límites | Ver límites en `main.ts` y multer en controladores |
| Cannot connect Mongo | URI incorrecta/firewall | Probar conexión con `mongosh` |

## 10. Tests

```bash
npm test
```

## 11. Estructura rápida

```
src/
	auth/ (login JWT y creación admin inicial)
	contadores/ (mediciones de luz)
	vouchers/ (registro de vouchers)
	uploads/ (archivos públicos)
```

## 12. Próximos pasos sugeridos

- Añadir protección JWT a rutas administrativas
- Paginación y filtros en listados grandes
- Endpoint para reintento de subida offline
- Logs estructurados (pino)

---
Documentación generada para apoyo de desarrollo local.

