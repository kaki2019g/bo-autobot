(async () => {
  const getBasePath = () => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    if (hostname.endsWith("github.io")) {
      const parts = pathname.split("/").filter(Boolean);
      return parts.length ? `/${parts[0]}/` : "/";
    }
    return "/";
  };

  const basePath = getBasePath();
  const withBase = (path) => {
    if (path.startsWith("/")) {
      return basePath + path.slice(1);
    }
    return basePath + path;
  };

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

  await inject("site-header", withBase("header.html"));
  await inject("site-footer", withBase("footer.html"));

  const updateRootLinks = () => {
    const nodes = document.querySelectorAll('[href^="/"], [src^="/"]');
    nodes.forEach((node) => {
      const attr = node.hasAttribute("href") ? "href" : "src";
      const value = node.getAttribute(attr);
      if (!value || value.startsWith("//")) {
        return;
      }
      node.setAttribute(attr, withBase(value));
    });
  };

  updateRootLinks();

  const script = document.createElement("script");
  script.src = withBase("assets/js/common.js");
  document.body.appendChild(script);
})().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
});
