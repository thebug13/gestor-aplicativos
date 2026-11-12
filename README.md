# Mis aplicativos

Aplicación web para organizar enlaces de tus aplicativos. Guarda el nombre y la URL; permite agregar una imagen opcional para identificar cada enlace. No almacena usuarios ni contraseñas de los aplicativos.

## Cómo funciona y dónde se guardan los datos

- **GitHub Pages** publica la interfaz web. El repositorio y la página son públicos.
- **GitHub OAuth** permite iniciar sesión con GitHub.
- **Supabase** guarda los enlaces y las imágenes en la nube.
- Las tablas y el bucket de imágenes usan políticas **Row Level Security (RLS)**: cada usuario autenticado solo puede consultar y modificar sus propios enlaces e imágenes.
- Las tarjetas muestran el nombre y el dominio corto. La URL completa se abre al pulsar el nombre o **Abrir**; no se muestra larga en la tarjeta.

La clave **Publishable** de Supabase y la URL del proyecto son visibles en el JavaScript y el navegador. Eso es normal para un sitio estático: la clave está diseñada para ser pública. La privacidad depende de las políticas RLS. **Nunca** pongas aquí una clave `sb_secret_`, `service_role` ni el Client Secret de GitHub.

## Configuración de Supabase

### 1. Crear el proyecto y la tabla

1. En [Supabase Dashboard](https://supabase.com/dashboard), crea un proyecto.
2. Abre **SQL Editor** y crea una consulta nueva.
3. Copia el contenido completo de [`supabase/schema.sql`](supabase/schema.sql), pégalo y pulsa **Run**.
4. **Success. No rows returned** es el resultado esperado: el SQL crea tablas, permisos y políticas, no registros.

El esquema es seguro para volver a ejecutar. Si ya habías configurado la app, vuelve a ejecutar el esquema actualizado para añadir la columna de imagen, el bucket privado y sus políticas; conserva los enlaces existentes.

### 2. Configurar GitHub OAuth

1. En Supabase, abre **Authentication → Sign In / Providers → GitHub** y copia el **Callback URL**. Su formato es `https://<referencia-del-proyecto>.supabase.co/auth/v1/callback`.
2. En GitHub, abre [Developer settings](https://github.com/settings/developers) de tu cuenta personal y entra a **OAuth Apps → New OAuth App** (o **Register a new application**).
3. Completa:
   - **Application name:** Mis aplicativos
   - **Homepage URL:** `https://thebug13.github.io/gestor-aplicativos/`
   - **Redirect URI / Authorization callback URL:** pega el Callback URL copiado de Supabase. No pongas aquí la URL de GitHub Pages.
4. Registra la aplicación y copia su **Client ID**. Genera un **Client secret**.
5. En Supabase, habilita el proveedor GitHub, pega allí el Client ID y Client secret y guarda. No publiques el Client secret ni lo pongas en archivos del sitio.

### 3. Configurar las URLs de autenticación

En Supabase, abre **Authentication → URL Configuration**:

- **Site URL:** `https://thebug13.github.io/gestor-aplicativos/`
- **Redirect URLs:** agrega esa misma dirección exacta, incluida la barra final.

### 4. Configurar la URL y clave Publishable

1. En Supabase, pulsa **Connect** y copia **Project URL** y **Publishable key**. También puedes copiar la clave en **Settings → API Keys → Publishable key**.
2. En GitHub, abre [`js/config.js`](js/config.js), pulsa **Edit** y reemplaza los valores de ejemplo:

```js
window.GESTOR_CONFIG = {
  supabaseUrl: "https://TU-REFERENCIA.supabase.co",
  supabaseAnonKey: "sb_publishable_TU_CLAVE_PUBLICA"
};
```

Conserva el nombre `supabaseAnonKey`, aunque la clave nueva comience con `sb_publishable_`. Pega los valores completos, sin espacios, y guarda con **Commit changes**. La Publishable key es pública por diseño; la secret key no.

### 5. Activar GitHub Pages

1. En el repositorio, abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Abre **Actions** y espera que la ejecución más reciente termine en verde.
4. La página estará en [https://thebug13.github.io/gestor-aplicativos/](https://thebug13.github.io/gestor-aplicativos/).

El flujo se ejecuta cuando hay cambios en `main` o `master`. Cada ejecución e intento usa un nombre distinto para su artefacto de Pages. Si falla un intento antiguo por artefactos duplicados, abre la ejecución nueva en **Actions**; no repitas el intento antiguo.

## Usar imágenes en los enlaces

1. Inicia sesión y pulsa **Agregar enlace** o **Editar**.
2. Selecciona una imagen PNG, JPG o WEBP de hasta **2 MB**.
3. Guarda. La imagen se sube a un bucket privado de Supabase dentro de la carpeta del usuario y se muestra en la tarjeta.
4. Para quitarla, edita el enlace y pulsa **Quitar imagen**. Al borrar un enlace también se elimina su imagen.

Si esta app ya estaba conectada antes de agregar la función de imágenes, vuelve a ejecutar el SQL actualizado de [`supabase/schema.sql`](supabase/schema.sql) para crear el bucket, la columna `image_path` y las políticas de Storage. Las URLs firmadas de las imágenes duran una hora; se generan de nuevo cuando se vuelve a cargar la app.

Las copias JSON de **Ajustes → Exportar JSON** incluyen nombre y URL, no los archivos de imagen. Las imágenes permanecen en Supabase.

## Comprobar y solucionar problemas

1. Abre la página, pulsa **Continuar con GitHub** y autoriza la aplicación si se solicita.
2. Agrega un enlace de prueba, recarga la página y confirma que siga allí.
3. Sube una imagen de prueba, recarga y confirma que aparezca. Elimina el enlace de prueba al terminar.

- Si el login dice que la URL no está permitida, revisa **Site URL** y **Redirect URLs** en Supabase.
- Si GitHub indica que la URL de retorno no coincide, usa exactamente el Callback URL de Supabase en la OAuth App.
- Si aparece un error al subir imágenes, ejecuta el esquema actualizado y confirma que terminara en **Success**.
- Si la página no carga, confirma que **Settings → Pages → Source** sea **GitHub Actions** y revisa la última ejecución en **Actions**.
- Si la app dice que falta configurar `js/config.js`, revisa la URL y la Publishable key y espera a que termine el despliegue.

## Importar los datos anteriores

El archivo local `mis-aplicativos-datos.json` está excluido por `.gitignore`; no lo subas al repositorio. Para migrar enlaces, usa **Ajustes → Importar enlaces**. La importación conserva únicamente nombre y URL, nunca usuarios ni contraseñas.

## Privacidad

GitHub aloja el código y la página pública. Supabase almacena los nombres, las URLs y las imágenes. RLS restringe cada usuario a sus propios datos; las imágenes viven en un bucket privado y se acceden con enlaces firmados de duración limitada.