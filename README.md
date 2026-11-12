# Mis aplicativos

Gestor de enlaces de aplicativos. En la nube solo guarda el nombre y la URL. La lista requiere iniciar sesión con GitHub; cada persona solo puede ver sus propias filas gracias a Row Level Security (RLS).

## Configurar el servicio privado

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor** y ejecuta [`supabase/schema.sql`](supabase/schema.sql).
3. En **Authentication → Providers → GitHub**, habilita GitHub y sigue las instrucciones de Supabase para crear una OAuth App de GitHub. Configura en GitHub la URL de callback que muestra Supabase.
4. En **Authentication → URL Configuration**, configura el URL del sitio con la URL publicada de GitHub Pages y agrega esa misma dirección a **Redirect URLs**.
5. En los ajustes/API del proyecto Supabase, copia el Project URL y la clave pública **anon/publishable** en [`js/config.js`](js/config.js).
6. En GitHub, selecciona **Settings → Pages → Build and deployment → GitHub Actions**. El flujo incluido publicará el sitio cuando hagas push a `main` o `master`.

La URL y la clave pública de Supabase se usan desde el navegador. El sitio estático puede ser visible públicamente; las filas de la lista siguen protegidas por las políticas RLS de Supabase. **Nunca** pegues `service_role`, una secret key ni el Client Secret de GitHub en `js/config.js`. El Client Secret de GitHub se configura solo en Supabase.

## Datos anteriores

El archivo local `mis-aplicativos-datos.json` está excluido por `.gitignore`; no lo publiques. Si importas un JSON desde Ajustes, el aplicativo sube únicamente `name` y `url`. Ignora los campos de usuario y contraseña del archivo de origen.

GitHub Pages aloja los archivos estáticos; Supabase guarda los enlaces y controla el acceso privado. Configura ambos servicios antes de publicar.
