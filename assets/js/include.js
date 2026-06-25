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

  // GitHub Pagesのベースパスを除いた現在ページのパスを取得する。
  const getLocalPath = () => {
    let pathname = window.location.pathname || "/";
    if (basePath !== "/" && pathname.startsWith(basePath)) {
      pathname = `/${pathname.slice(basePath.length)}`;
    }
    if (!pathname.startsWith("/")) {
      pathname = `/${pathname}`;
    }
    return pathname;
  };

  // GAS設定と販売チャネル設定を読み込み、通常版/インフォトップ版を切り替える。
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
    const gasProfile = json && json.gas_profile ? json.gas_profile : "normal";
    const profileEndpoints = json && json.gas_endpoint_profiles && json.gas_endpoint_profiles[gasProfile];
    const endpoints = profileEndpoints || (json && json.gas_endpoints);
    const endpoint = endpoints && endpoints[env];
    if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint)) {
      throw new Error("Invalid GAS endpoint");
    }
    const salesChannel = json && json.sales_channel ? json.sales_channel : "normal";
    const salesChannels = json && json.sales_channels ? json.sales_channels : {};
    const salesConfig = salesChannels[salesChannel] || salesChannels.normal || {};
    return {
      env,
      gasProfile,
      endpoint,
      salesChannel,
      salesConfig,
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

  const resolveConfiguredUrl = (url) => {
    if (!url || url === "#") {
      return "";
    }
    if (/^https?:\/\//.test(url)) {
      return url;
    }
    return withBase(url);
  };

  // インフォトップ版ではLPと特商法ページ以外の旧ページをTOPへ集約する。
  const redirectInfotopLegacyPage = (config) => {
    if (!config || config.salesChannel !== "infotop") {
      return false;
    }
    const allowedPaths = ["/", "/index", "/index.html", "/info/legal", "/info/legal.html"];
    const localPath = getLocalPath();
    if (allowedPaths.indexOf(localPath) !== -1) {
      return false;
    }
    window.location.replace(withBase("/"));
    return true;
  };

  // 販売チャネルごとの購入導線、文言、デモ版表示を反映する。
  const applySalesChannel = (config) => {
    if (!config) {
      return;
    }
    const salesChannel = config.salesChannel || "normal";
    const salesConfig = config.salesConfig || {};
    document.documentElement.dataset.salesChannel = salesChannel;

    const purchaseUrl = resolveConfiguredUrl(salesConfig.purchase_url);
    document.querySelectorAll("[data-purchase-link]").forEach((node) => {
      if (purchaseUrl) {
        node.setAttribute("href", purchaseUrl);
      }
      if (salesChannel === "infotop") {
        node.setAttribute("rel", "noopener");
      }
    });

    document.querySelectorAll("[data-infotop-text]").forEach((node) => {
      if (salesChannel === "infotop") {
        node.textContent = node.getAttribute("data-infotop-text") || node.textContent;
      }
    });

    // インフォトップ版で必要な短い改行入り文言だけをHTMLとして反映する。
    document.querySelectorAll("[data-infotop-html]").forEach((node) => {
      if (salesChannel === "infotop") {
        node.innerHTML = node.getAttribute("data-infotop-html") || node.innerHTML;
      }
    });

    document.querySelectorAll("[data-channel-hidden]").forEach((node) => {
      const hiddenChannels = String(node.getAttribute("data-channel-hidden") || "")
        .split(/\s+/)
        .filter(Boolean);
      if (hiddenChannels.indexOf(salesChannel) !== -1) {
        node.classList.add("is-channel-hidden");
      }
    });

    if (salesConfig.hide_demo && /\/products\/bo-autobot-demo\.html$/.test(window.location.pathname)) {
      window.location.replace(withBase("/products/bo-autobot.html"));
      return;
    }

    if (
      salesConfig.checkout_redirect &&
      /\/checkout\/checkout\.html$/.test(window.location.pathname)
    ) {
      window.location.replace(purchaseUrl || withBase("/products/bo-autobot.html"));
    }
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
      if (basePath !== "/" && value.startsWith(basePath)) {
        return;
      }
      node.setAttribute(attr, withBase(value));
    });
  };

  // 共通パーツ、環境表示、共通スクリプトを順に初期化する。
  const initializePage = async () => {
    const gasConfig = await window.gasConfigReady;
    if (redirectInfotopLegacyPage(gasConfig)) {
      return;
    }
    await inject("site-header", withBase("header.html"));
    await inject("site-footer", withBase("footer.html"));
    applySalesChannel(gasConfig);
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
