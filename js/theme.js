/* Apply the saved (or system) theme before first paint to avoid a light/dark flash. */
try { document.documentElement.dataset.theme = localStorage.getItem("mk-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch (e) {}
