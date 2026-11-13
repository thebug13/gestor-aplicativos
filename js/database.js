/* Supabase: datos remotos privados por usuario mediante Row Level Security. */
(function (root) {
  const IMAGE_BUCKET = "app-link-images";
  const IMAGE_URL_TTL_SECONDS = 3600;
  let client = null;
  let userId = null;

  function initialize() {
    const config = root.GESTOR_CONFIG || {};
    if (!root.supabase || !config.supabaseUrl || !config.supabaseAnonKey ||
        config.supabaseUrl.includes("YOUR_") || config.supabaseAnonKey.includes("YOUR_")) {
      throw new Error("Falta configurar js/config.js con la URL y la clave pública (anon) de Supabase.");
    }
    client = root.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  function subscribe(callback) {
    return client.auth.onAuthStateChange(function (_event, session) {
      userId = session && session.user ? session.user.id : null;
      callback(session);
    });
  }

  async function getSession() {
    const result = await client.auth.getSession();
    if (result.error) throw result.error;
    userId = result.data.session && result.data.session.user ? result.data.session.user.id : null;
    return result.data.session;
  }

  async function signInWithGithub() {
    const redirectTo = window.location.origin + window.location.pathname;
    const result = await client.auth.signInWithOAuth({ provider: "github", options: { redirectTo: redirectTo } });
    if (result.error) throw result.error;
  }

  async function signOut() {
    const result = await client.auth.signOut();
    if (result.error) throw result.error;
  }

  function requireUser() {
    if (!client || !userId) throw new Error("Inicia sesión con GitHub para continuar.");
    return userId;
  }

  async function getAllApps() {
    requireUser();
    const result = await client.from("app_links")
      .select("id,name,url,image_path,created_at,updated_at")
      .order("name", { ascending: true });
    if (result.error) throw result.error;
    return Promise.all(result.data.map(toApp));
  }

  async function toApp(row) {
    let imageUrl = null;
    if (row.image_path) {
      const signed = await client.storage.from(IMAGE_BUCKET).createSignedUrl(row.image_path, IMAGE_URL_TTL_SECONDS);
      if (!signed.error && signed.data) imageUrl = signed.data.signedUrl;
    }
    return { id: row.id, name: row.name, url: row.url, imagePath: row.image_path || null, imageUrl: imageUrl, createdAt: row.created_at, updatedAt: row.updated_at };
  }

  async function putApp(app, imageFile, removeImage) {
    const owner = requireUser();
    const oldPath = app.imagePath || null;
    let imagePath = removeImage ? null : oldPath;
    let uploadedPath = null;
    if (imageFile) {
      const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
      const extension = extensions[imageFile.type];
      if (!extension || imageFile.size > 2 * 1024 * 1024) throw new Error("Elige PNG, JPG o WEBP de máximo 2 MB.");
      imagePath = owner + "/" + app.id + "-" + Date.now() + "." + extension;
      const uploaded = await client.storage.from(IMAGE_BUCKET).upload(imagePath, imageFile, {
        cacheControl: "3600", contentType: imageFile.type, upsert: false
      });
      if (uploaded.error) throw uploaded.error;
      uploadedPath = imagePath;
    }
    const result = await client.from("app_links").upsert({
      id: app.id, user_id: owner, name: app.name, url: app.url, image_path: imagePath, updated_at: new Date().toISOString()
    }).select("id,name,url,image_path,created_at,updated_at").single();
    if (result.error) {
      if (uploadedPath) await client.storage.from(IMAGE_BUCKET).remove([uploadedPath]);
      throw result.error;
    }
    if (oldPath && oldPath !== imagePath) await client.storage.from(IMAGE_BUCKET).remove([oldPath]);
    return toApp(result.data);
  }

  async function putApps(apps) {
    const owner = requireUser();
    if (!apps.length) return;
    const rows = apps.map(function (app) {
      return { id: app.id, user_id: owner, name: app.name, url: app.url, updated_at: new Date().toISOString() };
    });
    const result = await client.from("app_links").upsert(rows);
    if (result.error) throw result.error;
  }

  async function replaceApps(apps) {
    const owner = requireUser();
    const removed = await client.from("app_links").delete().eq("user_id", owner);
    if (removed.error) throw removed.error;
    await putApps(apps);
  }

  async function deleteApp(id) {
    const owner = requireUser();
    const existing = await client.from("app_links").select("image_path").eq("id", id).eq("user_id", owner).maybeSingle();
    if (existing.error) throw existing.error;
    const result = await client.from("app_links").delete().eq("id", id).eq("user_id", owner);
    if (result.error) throw result.error;
    if (existing.data && existing.data.image_path) await client.storage.from(IMAGE_BUCKET).remove([existing.data.image_path]);
  }

  root.Database = {
    initialize: initialize,
    subscribe: subscribe,
    getSession: getSession,
    signInWithGithub: signInWithGithub,
    signOut: signOut,
    getAllApps: getAllApps,
    putApp: putApp,
    putApps: putApps,
    replaceApps: replaceApps,
    deleteApp: deleteApp
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
