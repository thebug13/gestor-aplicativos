/* Supabase: datos remotos privados por usuario mediante Row Level Security. */
(function (root) {
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
      .select("id,name,url,created_at,updated_at")
      .order("name", { ascending: true });
    if (result.error) throw result.error;
    return result.data.map(function (row) {
      return { id: row.id, name: row.name, url: row.url, createdAt: row.created_at, updatedAt: row.updated_at };
    });
  }

  async function putApp(app) {
    const owner = requireUser();
    const result = await client.from("app_links").upsert({
      id: app.id, user_id: owner, name: app.name, url: app.url, updated_at: new Date().toISOString()
    }).select("id,name,url,created_at,updated_at").single();
    if (result.error) throw result.error;
    return { id: result.data.id, name: result.data.name, url: result.data.url, createdAt: result.data.created_at, updatedAt: result.data.updated_at };
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
    const result = await client.from("app_links").delete().eq("id", id).eq("user_id", owner);
    if (result.error) throw result.error;
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
