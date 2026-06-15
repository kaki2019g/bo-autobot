(() => {
  // GitHub Pages配信時のベースパスを判定する。
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
  // ルート始まりのパスをベースパスに合わせて補正する。
  const withBase = (path) => {
    if (path.startsWith("/")) {
      return basePath + path.slice(1);
    }
    return basePath + path;
  };
  window.withBasePath = withBase;

  // GAS設定を読み込み、選択中の環境に対応するエンドポイントを返す。
  const loadGasConfig = async () => {
    const res = await fetch(withBase("assets/config/gas-env.json"), { cache: "no-cache" });
    if (!res.ok) {
      throw new Error("Failed to load GAS config");
    }
    const json = await res.json();
    const env = json && json.env;
    if (env !== "test" && env !== "prod") {
      throw new Error("Invalid GAS environment");
    }
    const endpoints = json && json.gas_endpoints;
    const endpoint = endpoints && endpoints[env];
    if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint)) {
      throw new Error("Invalid GAS endpoint");
    }
    return {
      env,
      endpoint,
      lastCommitAt: json && json.last_commit_at ? json.last_commit_at : ""
    };
  };

  window.gasConfigReady = loadGasConfig();
  window.getGasEndpoint = () => window.gasConfigReady.then((config) => config.endpoint);

  // ヘッダー/フッターのHTMLを読み込んで挿入する。
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

  // テスト環境のみ全ページにバッジを表示する。
  const formatCommitTime = (value) => {
    if (!value) {
      return "";
    }
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    return match ? `${match[1]} ${match[2]}` : String(value);
  };

  const showEnvBadge = (config) => {
    if (!config || config.env !== "test") {
      return;
    }
    const badge = document.createElement("div");
    badge.className = "env-badge env-badge--test";
    const lastCommit = formatCommitTime(config.lastCommitAt);
    badge.textContent = lastCommit ? `テスト環境 / 最終更新: ${lastCommit}` : "テスト環境";
    document.body.appendChild(badge);
  };

  // ルート参照のリンク/画像パスをベースパスへ置き換える。
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

  // 共通パーツ、環境表示、共通スクリプトを順に初期化する。
  const initializePage = async () => {
    await inject("site-header", withBase("header.html"));
    await inject("site-footer", withBase("footer.html"));
    const gasConfig = await window.gasConfigReady;
    showEnvBadge(gasConfig);
    updateRootLinks();

    const script = document.createElement("script");
    script.src = withBase("assets/js/common.js");
    document.body.appendChild(script);
  };

  initializePage().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
  });
})();
