# Kathy POS

Sistema de inventario y ventas de **Kathy Coffe Heladería**: punto de venta táctil para cajeros, caja con apertura y cierre, inventario, reportes y panel de administración.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript estricto · MongoDB Atlas + Mongoose · Auth.js (usuario y contraseña) · Tailwind CSS v4 + shadcn/ui · Motion · Recharts · Zod · Vitest + Playwright.

## Roles

- **Admin**: dashboard (día, semana, mes, año), productos y categorías con fotos, inventario (entradas, mermas, conteos), usuarios, reportes, anulación de ventas y exportación CSV.
- **Cajero**: abrir caja con base, vender (variantes, toppings, efectivo/tarjeta/Nequi/Daviplata con cambio), cerrar caja (esperado vs. contado), inventario en solo lectura.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa MONGODB_URI y AUTH_SECRET
npm run seed                 # crea el admin (admin / 123456) y las categorías base
npm run dev                  # http://localhost:3000
```

Cambia la contraseña del admin desde `/admin/usuarios` después del primer ingreso.

### Variables de entorno

| Variable | Uso |
|---|---|
| `MONGODB_URI` | Conexión a MongoDB Atlas (las ventas usan transacciones: requiere replica set, Atlas ya lo trae) |
| `AUTH_SECRET` | Firma de sesiones. Genera con `openssl rand -base64 32` |
| `CLOUDINARY_*` | Opcional. Sin estas variables, las fotos de productos se guardan en MongoDB |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` · `npm run typecheck` | Calidad de código |
| `npm test` | Tests unitarios (cálculo de caja, stock, periodos en hora Colombia, CSV) |
| `npm run test:e2e` | E2E con Playwright contra la base `<nombre>_test` (nunca toca la base real). Detén `npm run dev` antes |
| `npm run seed` | Admin + categorías. Con `SEED_DEMO=1` agrega productos y cajero de ejemplo (solo para pruebas) |

## Reglas de negocio

- `createSale` es una transacción: verifica turno abierto, recalcula precios en el servidor, descuenta stock con `$inc` condicionado a `stock >= qty` y registra el movimiento. Dos cajas vendiendo la última unidad: solo una pasa.
- Las ventas guardan copia de nombre y precio de cada ítem.
- Reportes con agregaciones `$dateTrunc` en zona `America/Bogota`.
- Cada Server Action valida con Zod y verifica el rol en el servidor.
- Montos en pesos colombianos como enteros.

## Despliegue en Vercel

1. En Atlas: Network Access → permitir `0.0.0.0/0` (o la integración Vercel–Atlas).
2. Importa el repositorio en Vercel y define `MONGODB_URI` y `AUTH_SECRET` en Environment Variables.
3. Despliega y corre `npm run seed` una vez apuntando a la base de producción.
