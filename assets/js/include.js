(async () => {
  const inject = async (id, url) => {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) {
      throw new Error(`Failed to load ${url}`);
    }
    const html = await res.text();
    const target = document.getElementById(id);
    if (target) {
      target.innerHTML = html;
    }
  };

  await inject("site-header", "/partials/header.html");
  await inject("site-footer", "/partials/footer.html");

  const script = document.createElement("script");
  script.src = "/assets/js/common.js";
  document.body.appendChild(script);
})().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
});
