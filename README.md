# Mis aplicativos

Aplicación web para guardar y abrir enlaces de tus aplicativos. La app almacena en Supabase únicamente el nombre y la URL de cada enlace; no guarda usuarios ni contraseñas de los aplicativos.

## Cómo funciona

- **GitHub Pages** sirve la interfaz web. El repositorio y la página son públicos.
- **GitHub OAuth** permite iniciar sesión en la app con una cuenta GitHub.
- **Supabase Auth** administra la sesión y **Row Level Security (RLS)** limita las filas para que cada persona autenticada solo pueda consultar y modificar sus propios enlaces.
- Cualquier persona puede llegar a la página pública de inicio de sesión, pero no puede leer tus filas de Supabase con su cuenta.

> La clave Publishable de Supabase se incluye en el JavaScript público del sitio. Eso es normal para una aplicación web estática: la protección de los datos depende de RLS. Nunca publiques una clave `sb_secret_`, `service_role` ni el Client Secret de GitHub.

## Configuración inicial de Supabase

### 1. Crear un proyecto

En [Supabase Dashboard](https://supabase.com/dashboard), crea un proyecto. Guarda la contraseña de base de datos en un lugar seguro; no la necesitas para configurar la app.

### 2. Crear la tabla y activar RLS

1. Abre el **SQL Editor** del proyecto y crea una consulta nueva.
2. Copia el contenido completo de [`supabase/schema.sql`](supabase/schema.sql), pégalo y pulsa **Run**.
3. El mensaje **Success. No rows returned** es normal: el script crea la tabla, permisos, índice y políticas, no devuelve registros.

La tabla `public.app_links` contiene `user_id`, `name` y `url` además de identificadores y fechas. Las políticas RLS comprueban que `user_id` coincida con el usuario de la sesión.

### 3. Crear una OAuth App en GitHub

1. En Supabase, ve a **Authentication → Sign In / Providers → GitHub** y copia el **Callback URL** que aparece allí. Su formato es `https://<referencia-del-proyecto>.supabase.co/auth/v1/callback`.
2. En GitHub, abre [Developer settings](https://github.com/settings/developers) de tu cuenta personal y entra a **OAuth Apps → New OAuth App** (o **Register a new application**).
3. Completa:
   - **Application name:** Mis aplicativos
   - **Homepage URL:** `https://thebug13.github.io/gestor-aplicativos/`
   - **Redirect URI / Authorization callback URL:** pega el Callback URL copiado de Supabase. No uses aquí la URL de GitHub Pages.
4. Registra la app. Copia su **Client ID** y genera un **Client secret**.
5. Regresa a Supabase, habilita el proveedor **GitHub**, pega allí el Client ID y Client secret y guarda. El Client secret se configura solo en Supabase.

### 4. Permitir la URL de la app

En Supabase, abre **Authentication → URL Configuration**:

- Configura **Site URL** como `https://thebug13.github.io/gestor-aplicativos/`.
- Agrega esa misma dirección exacta a **Redirect URLs**, incluida la barra final.

La app devuelve al usuario a la página de GitHub Pages después de iniciar sesión.

### 5. Añadir la URL y Publishable key del proyecto

1. En Supabase, pulsa **Connect** y copia **Project URL** y **Publishable key**. También puedes copiar la clave desde **Settings → API Keys → Publishable key**.
2. En GitHub, abre [`js/config.js`](js/config.js), selecciona **Edit** y reemplaza los valores de ejemplo:

```js
window.GESTOR_CONFIG = {
  supabaseUrl: "https://TU-REFERENCIA.supabase.co",
  supabaseAnonKey: "sb_publishable_TU_CLAVE_PUBLICA"
};
```

El nombre de propiedad `supabaseAnonKey` debe conservarse, aunque pegues una clave nueva que empiece por `sb_publishable_`. Pega la URL completa y la clave completa, sin espacios adicionales. No pegues `sb_secret_`, `service_role` ni el Client secret de GitHub aquí.

3. Guarda con **Commit changes**. La clave Publishable se verá en el código público del repositorio; está diseñada para usarse en el navegador. RLS debe permanecer activo para proteger la tabla.

## Publicar con GitHub Pages

El repositorio ya incluye [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Para activar la publicación:

1. En el repositorio, abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Abre la pestaña **Actions** y espera a que la ejecución más reciente termine en verde.
4. La página estará en [https://thebug13.github.io/gestor-aplicativos/](https://thebug13.github.io/gestor-aplicativos/).

El flujo se inicia con cada push a `main` o `master`. El artefacto de Pages usa un nombre diferente para cada ejecución e intento, para evitar conflictos al reintentar un despliegue. Si un intento antiguo falla por encontrar artefactos duplicados, no lo vuelvas a ejecutar: usa la ejecución nueva que se inicia tras un cambio.

## Comprobar que funciona

1. Abre la URL de GitHub Pages y pulsa **Continuar con GitHub**.
2. Autoriza la aplicación si GitHub te lo solicita.
3. Agrega un enlace de prueba, recarga la página y confirma que siga apareciendo.
4. Elimina el enlace de prueba cuando termines.

Si el login falla, revisa que el Callback URL de GitHub sea el que muestra Supabase y que la URL de Pages esté en **Redirect URLs**. Si la página muestra que falta configurar `js/config.js`, verifica que reemplazaste ambos valores y que el cambio ya se desplegó.

## Importar los datos anteriores

El archivo local `mis-aplicativos-datos.json` está excluido por `.gitignore` y no se debe subir al repositorio. Para migrar datos, usa **Ajustes → Importar enlaces** en la app. La importación conserva solo el nombre y la URL; no importes ni guardes usuarios o contraseñas.

## Privacidad

El repositorio y el sitio de GitHub Pages son públicos. La lista de enlaces no se almacena en GitHub: se guarda en Supabase y las políticas RLS de la tabla restringen las filas por usuario autenticado. Supabase almacena el nombre y URL de los enlaces en la nube.