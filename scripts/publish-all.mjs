import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const configPath = path.join(projectRoot, "assets/config/gas-env.json");
const isDryRun = process.argv.includes("--dry-run");

// Gitコマンドの実行結果を統一的に検査し、失敗時に後続処理を止める。
function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
  });

  if (!options.quiet) {
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    if (output) {
      console.log(output);
    }
  }

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`git ${args.join(" ")} に失敗しました。`);
  }

  return result;
}

// コマンド判定に使うGit出力だけを余分な表示なしで取得する。
function getGitOutput(args) {
  return runGit(args, { quiet: true }).stdout.trim();
}

// porcelain形式から変更対象パスを抽出し、コミットメッセージ生成に利用する。
function getChangedPaths() {
  const status = runGit(["status", "--porcelain=v1"], { quiet: true }).stdout.trimEnd();
  if (!status) {
    return [];
  }

  return status.split("\n").map((line) => {
    const value = line.slice(3).trim();
    const renameSeparator = " -> ";
    return value.includes(renameSeparator) ? value.split(renameSeparator).at(-1) : value;
  });
}

// 変更ファイルの種類を要約し、外部サービスなしで安定したメッセージを生成する。
function createCommitMessage(paths) {
  const categories = [];
  const addCategory = (category) => {
    if (!categories.includes(category)) {
      categories.push(category);
    }
  };

  for (const filePath of paths) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === ".html") addCategory("page content");
    else if (extension === ".css") addCategory("styles");
    else if ([".js", ".mjs", ".cjs"].includes(extension)) addCategory("scripts");
    else if (extension === ".json") addCategory("configuration");
    else if ([".md", ".txt"].includes(extension)) addCategory("documentation");
    else if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(extension)) addCategory("images");
    else addCategory("project files");
  }

  if (categories.length === 1) {
    return `Update ${categories[0]}`;
  }
  if (categories.length === 2) {
    return `Update ${categories[0]} and ${categories[1]}`;
  }

  const lastCategory = categories.at(-1);
  return `Update ${categories.slice(0, -1).join(", ")}, and ${lastCategory}`;
}

// 日本時間の現在時刻をlast_commit_at用のISO 8601形式へ変換する。
function createJapanTimestamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+09:00`;
}

// ブランチごとの環境値と更新日時をJSONへ反映し、整合性を保つ。
async function writeEnvironmentConfig(environment, timestamp, sourceText = null) {
  const text = sourceText ?? await readFile(configPath, "utf8");
  const config = JSON.parse(text);
  config.env = environment;
  config.last_commit_at = timestamp;
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

// 対象ブランチ、リモート同期状態、環境設定を公開処理前に検査する。
async function validatePreconditions() {
  const currentBranch = getGitOutput(["branch", "--show-current"]);
  if (currentBranch !== "develop") {
    throw new Error(`developブランチで実行してください。現在: ${currentBranch || "detached HEAD"}`);
  }

  const config = JSON.parse(await readFile(configPath, "utf8"));
  if (config.env !== "test") {
    throw new Error(`developのgas-env.jsonはenv=testである必要があります。現在: ${config.env}`);
  }

  const developRelation = runGit(
    ["merge-base", "--is-ancestor", "origin/develop", "develop"],
    { allowFailure: true, quiet: true },
  );
  if (developRelation.status !== 0) {
    throw new Error("developがorigin/developより遅れているか、履歴が分岐しています。先に同期状態を確認してください。");
  }

  const localMaster = getGitOutput(["rev-parse", "master"]);
  const remoteMaster = getGitOutput(["rev-parse", "origin/master"]);
  if (localMaster !== remoteMaster) {
    throw new Error("masterとorigin/masterが一致しません。先に同期状態を確認してください。");
  }

  const remoteContentDiff = runGit(
    ["diff", "--quiet", "origin/master", "origin/develop", "--", ".", ":(exclude)assets/config/gas-env.json"],
    { allowFailure: true, quiet: true },
  );
  if (remoteContentDiff.status === 1) {
    throw new Error("リモートのmasterとdevelopにgas-env.json以外の差異があります。自動マージを中止します。");
  }
  if (remoteContentDiff.status !== 0) {
    throw new Error("リモートブランチの内容比較に失敗しました。");
  }
}

// リモート内容の一致を確認済みの場合に限り、競合箇所へdevelopの内容を採用する。
async function resolveMergeConflicts(timestamp) {
  const conflicts = getGitOutput(["diff", "--name-only", "--diff-filter=U"])
    .split("\n")
    .filter(Boolean);
  const configRelativePath = "assets/config/gas-env.json";

  for (const conflictPath of conflicts) {
    if (conflictPath === configRelativePath) {
      continue;
    }

    const existsInDevelop = runGit(["cat-file", "-e", `develop:${conflictPath}`], {
      allowFailure: true,
      quiet: true,
    });
    if (existsInDevelop.status === 0) {
      runGit(["checkout", "develop", "--", conflictPath]);
    } else if (existsInDevelop.status === 1) {
      runGit(["rm", "--", conflictPath]);
    } else {
      throw new Error(`${conflictPath}のdevelop側データを確認できませんでした。`);
    }
  }

  const developConfig = getGitOutput(["show", `develop:${configRelativePath}`]);
  await writeEnvironmentConfig("prod", timestamp, developConfig);
  runGit(["add", configRelativePath]);
}

// リモート未反映のdevelopコミットに含まれるファイル一覧を取得する。
function getAheadPaths() {
  const output = getGitOutput(["diff", "--name-only", "origin/develop..develop"]);
  return output ? output.split("\n").filter(Boolean) : [];
}

// masterの環境設定がprodのままか、マージコミット前に最終確認する。
async function validateProductionConfig() {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  if (config.env !== "prod") {
    throw new Error(`masterのgas-env.jsonがenv=prodではありません。現在: ${config.env}`);
  }
}

// dry-runではファイルやGit履歴を変更せず、公開対象と生成メッセージだけを表示する。
async function showDryRun(workingPaths) {
  await validatePreconditions();
  runGit(["diff", "--check"]);
  const aheadPaths = getAheadPaths();
  const publishPaths = [...new Set([...aheadPaths, ...workingPaths])];
  if (publishPaths.length === 0) {
    throw new Error("コミットまたは公開対象の変更がありません。");
  }

  console.log("\n[DRY RUN] 変更対象:");
  for (const filePath of publishPaths) {
    console.log(`- ${filePath}`);
  }
  if (workingPaths.length > 0) {
    console.log(`\nDevelop commit: ${createCommitMessage(workingPaths)}`);
  } else {
    console.log("\nDevelop commit: 既存の未プッシュコミットを使用");
  }
  const mergeSummary = createCommitMessage(publishPaths).replace(/^Update /, "update ");
  console.log(`Master merge: Merge develop into master (${mergeSummary})`);
  console.log("\nファイル変更、コミット、マージ、プッシュは実行していません。");
}

// developのコミット作成からmasterへのマージ、両ブランチの同時プッシュまでを実行する。
async function publish() {
  console.log("リモートの状態を取得しています...");
  runGit(["fetch", "origin"]);
  await validatePreconditions();

  let workingPaths = getChangedPaths();
  let timestamp;
  if (workingPaths.length > 0) {
    timestamp = createJapanTimestamp();
    await writeEnvironmentConfig("test", timestamp);
    workingPaths = getChangedPaths();
    const commitMessage = createCommitMessage(workingPaths);
    runGit(["add", "-A"]);
    runGit(["diff", "--cached", "--check"]);
    runGit(["commit", "-m", commitMessage]);
  } else {
    const config = JSON.parse(await readFile(configPath, "utf8"));
    timestamp = config.last_commit_at;
  }

  const publishPaths = getAheadPaths();
  if (publishPaths.length === 0) {
    throw new Error("公開対象となるdevelopの未プッシュコミットがありません。");
  }
  const mergeSummary = createCommitMessage(publishPaths).replace(/^Update /, "update ");
  const mergeMessage = `Merge develop into master (${mergeSummary})`;

  let mergeStarted = false;
  try {
    runGit(["switch", "master"]);
    const mergeResult = runGit(["merge", "--no-ff", "--no-commit", "develop"], { allowFailure: true });
    mergeStarted = true;
    await resolveMergeConflicts(timestamp);
    if (mergeResult.status !== 0) {
      console.log("競合箇所へdevelopの内容を採用し、gas-env.jsonをprod設定で解決しました。");
    }
    await validateProductionConfig();
    runGit(["diff", "--cached", "--check"]);
    runGit(["commit", "-m", mergeMessage]);
    mergeStarted = false;

    runGit(["switch", "develop"]);
    runGit(["push", "--atomic", "origin", "develop", "master"]);
    console.log("developとmasterへのコミット・マージ・プッシュが完了しました。");
  } catch (error) {
    const currentBranch = getGitOutput(["branch", "--show-current"]);
    if (currentBranch === "master" && mergeStarted) {
      runGit(["merge", "--abort"], { allowFailure: true });
    }
    if (getGitOutput(["branch", "--show-current"]) !== "develop") {
      runGit(["switch", "develop"], { allowFailure: true });
    }
    throw error;
  }
}

try {
  const changedPaths = getChangedPaths();

  if (isDryRun) {
    await showDryRun(changedPaths);
  } else {
    await publish();
  }
} catch (error) {
  console.error(`公開処理を中止しました: ${error.message}`);
  process.exitCode = 1;
}
