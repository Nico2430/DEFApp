DEFApp - version completa actualizada

Incluye:
- Clientes, Stock, Pedidos, Movimientos, Pagos y Saldos.
- Pedidos editables/eliminables.
- Adjuntos PDF/JPG/JPEG/PNG en pedidos.
- Boton para ver archivo adjunto desde la tabla de pedidos.
- Impresion de pedido en 3 copias: OFICINA, HOJAS y MARCOS.
- Remito en transito con logo EMDABER y numeracion automatica desde 2500.
- Fechas visibles en formato DD-MM-AAAA.
- Campo de texto adicional en pedidos.
- Icono de escritorio con el logo DEF.

Configuracion local:
1. Copiar .env.example como .env.
2. Completar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY con los datos del proyecto Supabase.
3. Opcional: completar VITE_LOGIN_ALIAS y VITE_LOGIN_EMAIL para usar un nombre de usuario en lugar de email.

Importante para RLS:
Ejecutar supabase/database.sql en Supabase > SQL Editor.
Ese SQL crea las politicas de RLS y el bucket pedido-archivos.

Para subir a GitHub:
- No subir .env, node_modules, dist ni release.
- .gitignore ya excluye esos archivos/carpetas.
- .env.example queda como plantilla sin datos privados.

Para ejecutar:
npm install
npm run dev

Para generar instalador:
npm run dist

El instalador queda en la carpeta release.

Actualizaciones automaticas desde GitHub:
1. En package.json, reemplazar build.publish.owner y build.publish.repo por el usuario y repositorio reales de GitHub.
2. Cada actualizacion debe subir la version en package.json, por ejemplo de 1.0.0 a 1.0.1.
3. Crear un token de GitHub con permisos para publicar releases y usarlo como variable GH_TOKEN.
4. Publicar la nueva version con:
   npm run publish:github

La app revisa actualizaciones al abrirse. Solo muestra aviso cuando GitHub Releases tiene una version mas nueva. Si aceptas, descarga la actualizacion y luego pregunta si queres reiniciar e instalarla.

Nota:
El auto-update de Electron funciona mejor con el instalador NSIS. El .exe portable se puede generar para distribucion manual, pero la actualizacion automatica completa esta pensada para la version instalada.
