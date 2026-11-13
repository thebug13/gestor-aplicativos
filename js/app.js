/* Gestor privado de enlaces; nunca envía usuarios ni contraseñas de aplicativos. */
(function () {
  const icons = {
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5"/><path d="M19 5l-9 9"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg>'
  };
  const ui = {
    boot: document.getElementById("boot-error"), bootText: document.getElementById("boot-error-text"),
    login: document.getElementById("login-screen"), loginButton: document.getElementById("github-login"), loginError: document.getElementById("login-error"),
    shell: document.getElementById("shell"), sidebar: document.getElementById("sidebar"), backdrop: document.getElementById("sidebar-backdrop"),
    menuButton: document.getElementById("menu-button"), navApps: document.getElementById("nav-apps"), navSettings: document.getElementById("nav-settings"),
    logout: document.getElementById("logout-button"), appCount: document.getElementById("app-count"), searchWrap: document.getElementById("search-wrap"),
    search: document.getElementById("search-input"), sort: document.getElementById("sort-select"), addButton: document.getElementById("add-button"),
    appsView: document.getElementById("apps-view"), settingsView: document.getElementById("settings-view"), resultCount: document.getElementById("result-count"), grid: document.getElementById("app-grid"),
    exportButton: document.getElementById("export-button"), importButton: document.getElementById("import-button"), importFile: document.getElementById("import-file"),
    dialog: document.getElementById("app-dialog"), dialogTitle: document.getElementById("dialog-title"), appForm: document.getElementById("app-form"),
    dialogClose: document.getElementById("dialog-close"), fieldName: document.getElementById("field-name"), fieldUrl: document.getElementById("field-url"),
    fieldImage: document.getElementById("field-image"), imagePreview: document.getElementById("image-preview"), imageFallback: document.getElementById("image-fallback"), removeImage: document.getElementById("remove-image"),
    formError: document.getElementById("form-error"), formCancel: document.getElementById("form-cancel"), formSave: document.getElementById("form-save"),
    confirmDialog: document.getElementById("confirm-dialog"), confirmTitle: document.getElementById("confirm-title"), confirmMessage: document.getElementById("confirm-message"),
    confirmAccept: document.getElementById("confirm-accept"), toasts: document.getElementById("toasts")
  };
  const state = { session: null, apps: [], view: "apps", editingId: null, selectedImage: null, removeImage: false, previewUrl: null };
  let attemptedSessionUserId = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    try {
      Database.initialize();
      Database.subscribe(function (session) { window.setTimeout(function () { applySession(session); }, 0); });
      await applySession(await Database.getSession());
    } catch (error) {
      showFatal(error.message || "No se pudo conectar con el servicio en línea.");
    }
  }

  function bindEvents() {
    ui.loginButton.addEventListener("click", login);
    ui.logout.addEventListener("click", logout);
    ui.navApps.addEventListener("click", function () { setView("apps"); closeSidebar(); });
    ui.navSettings.addEventListener("click", function () { setView("settings"); closeSidebar(); });
    ui.menuButton.addEventListener("click", function () { ui.sidebar.classList.add("open"); ui.backdrop.hidden = false; });
    ui.backdrop.addEventListener("click", closeSidebar);
    ui.search.addEventListener("input", render);
    ui.sort.addEventListener("change", render);
    ui.addButton.addEventListener("click", function () { openForm(null); });
    ui.grid.addEventListener("click", onGridClick);
    ui.dialogClose.addEventListener("click", closeForm);
    ui.formCancel.addEventListener("click", closeForm);
    ui.fieldImage.addEventListener("change", onImageSelected);
    ui.removeImage.addEventListener("click", clearImage);
    ui.appForm.addEventListener("submit", onSave);
    ui.exportButton.addEventListener("click", exportLinks);
    ui.importButton.addEventListener("click", function () { ui.importFile.click(); });
    ui.importFile.addEventListener("change", importLinks);
  }

  async function applySession(session) {
    state.session = session;
    const signedIn = Boolean(session && session.user);
    ui.boot.hidden = true;
    ui.login.hidden = signedIn;
    ui.shell.hidden = !signedIn;
    if (!signedIn) { state.apps = []; attemptedSessionUserId = null; return; }
    if (attemptedSessionUserId === session.user.id) return;
    attemptedSessionUserId = session.user.id;
    try {
      await loadApps();
      showApp();
    } catch (error) {
      toast("No se pudieron cargar los enlaces: " + (error.message || "revisa la configuración de Supabase."));
    }
  }

  async function login() {
    ui.loginError.textContent = "";
    ui.loginButton.disabled = true;
    try { await Database.signInWithGithub(); }
    catch (error) { ui.loginError.textContent = error.message || "No se pudo iniciar con GitHub."; }
    finally { ui.loginButton.disabled = false; }
  }

  async function logout() {
    try { await Database.signOut(); }
    catch (_error) { toast("No se pudo cerrar la sesión."); }
  }

  function showFatal(message) {
    ui.boot.hidden = false;
    ui.login.hidden = true;
    ui.shell.hidden = true;
    ui.bootText.textContent = message;
  }

  async function loadApps() {
    state.apps = (await Database.getAllApps()).map(sanitizeLink);
    render();
  }

  function sanitizeLink(value) {
    return {
      id: typeof value.id === "string" && value.id ? value.id : createId(),
      name: String(value.name || "").trim(),
      url: normalizeUrl(value.url || ""),
      imagePath: value.imagePath || value.image_path || null,
      imageUrl: value.imageUrl || value.image_url || null,
      createdAt: value.createdAt || value.created_at || Date.now(),
      updatedAt: value.updatedAt || value.updated_at || Date.now()
    };
  }

  function setView(view) {
    state.view = view;
    ui.appsView.hidden = view !== "apps";
    ui.settingsView.hidden = view !== "settings";
    ui.searchWrap.hidden = view !== "apps";
    ui.sort.hidden = view !== "apps";
    ui.navApps.setAttribute("aria-current", view === "apps" ? "page" : "false");
    ui.navSettings.setAttribute("aria-current", view === "settings" ? "page" : "false");
  }

  function showApp() { ui.shell.hidden = false; setView("apps"); render(); }
  function closeSidebar() { ui.sidebar.classList.remove("open"); ui.backdrop.hidden = true; }

  function visibleApps() {
    const query = fold(ui.search.value.trim());
    const filtered = state.apps.filter(function (app) { return !query || fold(app.name).includes(query) || fold(app.url).includes(query); });
    const sort = ui.sort.value;
    filtered.sort(function (a, b) {
      if (sort === "updated-desc") return new Date(b.updatedAt) - new Date(a.updatedAt);
      const order = a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      return sort === "name-desc" ? -order : order;
    });
    return filtered;
  }

  function render() {
    ui.appCount.textContent = String(state.apps.length);
    const apps = visibleApps();
    ui.grid.replaceChildren();
    if (!state.apps.length) {
      ui.resultCount.textContent = "0 enlaces guardados";
      ui.grid.appendChild(emptyState("Todavía no hay enlaces", "Agrega tu primer aplicativo para verlo aquí."));
      return;
    }
    ui.resultCount.textContent = apps.length === state.apps.length ? state.apps.length + " enlaces" : apps.length + " de " + state.apps.length + " enlaces";
    if (!apps.length) { ui.grid.appendChild(emptyState("Sin resultados", "Ningún enlace coincide con la búsqueda.")); return; }
    apps.forEach(function (app) { ui.grid.appendChild(renderCard(app)); });
  }

  function emptyState(title, message) {
    const box = document.createElement("div"); box.className = "empty";
    const heading = document.createElement("h2"); heading.textContent = title;
    const copy = document.createElement("p"); copy.className = "muted"; copy.textContent = message;
    box.append(heading, copy);
    if (!state.apps.length) {
      const button = document.createElement("button"); button.type = "button"; button.className = "primary"; button.textContent = "Agregar enlace";
      button.addEventListener("click", function () { openForm(null); }); box.appendChild(button);
    }
    return box;
  }

  function renderCard(app) {
    const card = document.createElement("article"); card.className = "card link-card"; card.dataset.id = app.id;
    const head = document.createElement("div"); head.className = "card-head";
    const art = document.createElement("div"); art.className = "app-art";
    const fallback = document.createElement("span"); fallback.className = "app-art-fallback"; fallback.textContent = app.name.slice(0, 1).toLocaleUpperCase("es");
    art.appendChild(fallback);
    if (app.imageUrl) {
      const image = document.createElement("img"); image.src = app.imageUrl; image.alt = ""; image.loading = "lazy";
      image.addEventListener("load", function () { fallback.hidden = true; });
      image.addEventListener("error", function () { image.remove(); fallback.hidden = false; });
      art.appendChild(image);
    }
    const details = document.createElement("div"); details.className = "app-details";
    const title = document.createElement("a"); title.className = "saved-title"; title.href = app.url; title.target = "_blank"; title.rel = "noopener noreferrer"; title.textContent = app.name;
    const domain = document.createElement("span"); domain.className = "saved-domain"; domain.textContent = displayHost(app.url);
    details.append(title, domain); head.append(art, details);
    const actions = document.createElement("div"); actions.className = "actions";
    actions.append(actionButton("open", "Abrir", "open"), actionButton("copy", "Copiar enlace", "copy"), actionButton("edit", "Editar", "edit"), actionButton("delete", "Eliminar", "trash", true));
    card.append(head, actions);
    return card;
  }

  function actionButton(action, label, icon, danger) {
    const button = document.createElement("button"); button.type = "button";
    button.className = danger ? "text-button danger" : "text-button"; button.dataset.action = action;
    button.innerHTML = icons[icon]; const span = document.createElement("span"); span.textContent = label; button.appendChild(span); return button;
  }

  function onGridClick(event) {
    const button = event.target.closest("[data-action]"); const card = event.target.closest("[data-id]");
    if (!button || !card) return;
    const app = state.apps.find(function (item) { return item.id === card.dataset.id; }); if (!app) return;
    if (button.dataset.action === "open") window.open(app.url, "_blank", "noopener,noreferrer");
    if (button.dataset.action === "copy") copyLink(app.url);
    if (button.dataset.action === "edit") openForm(app);
    if (button.dataset.action === "delete") removeApp(app);
  }

  async function copyLink(url) {
    try { await Clipboard.copyText(url); toast("Enlace copiado."); }
    catch (_error) { toast("No se pudo copiar el enlace."); }
  }

  async function removeApp(app) {
    if (!await askConfirm("Eliminar enlace", "¿Eliminar «" + app.name + "»?", "Eliminar")) return;
    try {
      await Database.deleteApp(app.id, app.imagePath);
      state.apps = state.apps.filter(function (item) { return item.id !== app.id; }); render(); toast("Enlace eliminado.");
    } catch (_error) { toast("No se pudo eliminar el enlace en línea."); }
  }

  function openForm(app) {
    state.editingId = app ? app.id : null;
    state.selectedImage = null; state.removeImage = false; releasePreview();
    ui.appForm.reset(); ui.formError.textContent = "";
    ui.dialogTitle.textContent = app ? "Editar enlace" : "Agregar enlace";
    if (app) { ui.fieldName.value = app.name; ui.fieldUrl.value = app.url; }
    setImagePreview(app ? app.imageUrl : null, Boolean(app && app.imagePath));
    if (!ui.dialog.open) ui.dialog.showModal(); ui.fieldName.focus();
  }

  function closeForm() {
    if (ui.dialog.open) ui.dialog.close(); state.editingId = null; state.selectedImage = null; state.removeImage = false; releasePreview();
    if (ui.imagePreview) { ui.imagePreview.removeAttribute("src"); ui.imagePreview.hidden = true; ui.imageFallback.hidden = false; ui.removeImage.hidden = true; }
  }

  function onImageSelected() {
    const file = ui.fieldImage.files && ui.fieldImage.files[0]; ui.formError.textContent = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      ui.fieldImage.value = ""; ui.formError.textContent = "Elige una imagen PNG, JPG o WEBP."; return;
    }
    if (file.size > 2 * 1024 * 1024) {
      ui.fieldImage.value = ""; ui.formError.textContent = "La imagen debe pesar máximo 2 MB."; return;
    }
    state.selectedImage = file; state.removeImage = false;
    releasePreview(); state.previewUrl = URL.createObjectURL(file); setImagePreview(state.previewUrl, true);
  }

  function clearImage() {
    const current = state.editingId && state.apps.find(function (item) { return item.id === state.editingId; });
    state.selectedImage = null; state.removeImage = Boolean(current && current.imagePath); ui.fieldImage.value = "";
    releasePreview(); setImagePreview(null, false);
  }

  function setImagePreview(src, canRemove) {
    ui.imagePreview.onload = function () { ui.imagePreview.hidden = false; ui.imageFallback.hidden = true; };
    ui.imagePreview.onerror = function () { ui.imagePreview.hidden = true; ui.imageFallback.hidden = false; };
    if (src) { ui.imagePreview.src = src; ui.imagePreview.hidden = false; ui.imageFallback.hidden = true; }
    else { ui.imagePreview.removeAttribute("src"); ui.imagePreview.hidden = true; ui.imageFallback.hidden = false; }
    ui.removeImage.hidden = !canRemove;
  }

  function releasePreview() { if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; }

  async function onSave(event) {
    event.preventDefault();
    const name = ui.fieldName.value.trim(); const url = normalizeUrl(ui.fieldUrl.value);
    if (!name) { ui.formError.textContent = "Escribe un nombre."; return; }
    if (!url) { ui.formError.textContent = "Escribe un enlace válido que empiece con http o https."; return; }
    const current = state.editingId ? state.apps.find(function (item) { return item.id === state.editingId; }) : null;
    const app = { id: current ? current.id : createId(), name: name, url: url, imagePath: current ? current.imagePath : null, createdAt: current ? current.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
    ui.formSave.disabled = true;
    try {
      const saved = sanitizeLink(await Database.putApp(app, state.selectedImage, state.removeImage));
      const index = state.apps.findIndex(function (item) { return item.id === saved.id; });
      if (index < 0) state.apps.push(saved); else state.apps[index] = saved;
      closeForm(); render(); toast("Enlace guardado en línea.");
    } catch (error) { ui.formError.textContent = error.message || "No se pudo guardar el enlace."; }
    finally { ui.formSave.disabled = false; }
  }

  async function exportLinks() {
    const backup = { format: "mis-aplicativos-links", version: 1, exportedAt: new Date().toISOString(), apps: state.apps.map(function (app) { return { name: app.name, url: app.url }; }) };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "mis-aplicativos-enlaces.json";
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1500);
  }

  async function importLinks() {
    const file = ui.importFile.files && ui.importFile.files[0]; ui.importFile.value = ""; if (!file) return;
    try {
      const data = JSON.parse(await file.text()); const source = Array.isArray(data) ? data : data.apps;
      if (!Array.isArray(source)) throw new Error("El JSON no contiene una lista de enlaces.");
      const links = source.map(function (item) { return { id: createId(), name: String(item.name || "").trim(), url: normalizeUrl(item.url || "") }; })
        .filter(function (item) { return item.name && item.url; });
      if (!links.length) throw new Error("No encontré enlaces válidos en el archivo.");
      await Database.putApps(links); await loadApps(); toast(links.length + " enlaces importados.");
    } catch (error) { toast(error.message || "No se pudo importar el archivo."); }
  }

  function askConfirm(title, message, acceptLabel) {
    ui.confirmTitle.textContent = title; ui.confirmMessage.textContent = message; ui.confirmAccept.textContent = acceptLabel;
    if (!ui.confirmDialog.open) ui.confirmDialog.showModal();
    return new Promise(function (resolve) { ui.confirmDialog.addEventListener("close", function () { resolve(ui.confirmDialog.returnValue === "ok"); }, { once: true }); });
  }

  function toast(message) {
    const item = document.createElement("div"); item.className = "toast"; item.textContent = message; ui.toasts.appendChild(item);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove(); window.setTimeout(function () { item.remove(); }, 2600);
  }

  function createId() { return crypto.randomUUID ? crypto.randomUUID() : "link-" + Date.now() + "-" + Math.random().toString(16).slice(2); }
  function normalizeUrl(value) {
    try { const parsed = new URL(String(value || "").trim()); return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : ""; }
    catch (_error) { return ""; }
  }
  function displayHost(value) {
    try { return new URL(value).hostname.replace(/^www\./i, ""); }
    catch (_error) { return value; }
  }
  function fold(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
})();

