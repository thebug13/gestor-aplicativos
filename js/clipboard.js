/* Copia texto al portapapeles desde un gesto del usuario. */
(function (root) {
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    if (!copied) {
      throw new Error("No se pudo copiar.");
    }
  }

  root.Clipboard = { copyText: copyText };
})(typeof globalThis !== "undefined" ? globalThis : window);
