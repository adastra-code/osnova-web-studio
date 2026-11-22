import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { posts, site } from "./data.mjs";
import { deploy } from "./deploy.config.mjs";

const BASE = (process.env.SITE_URL || deploy.siteUrl || site.url).replace(/\/$/, "");
const rawBase = (process.env.BASE_PATH ?? deploy.basePath ?? "").trim();
const BASE_PATH =
  rawBase && rawBase !== "/" ? `/${rawBase.replace(/^\/+|\/+$/g, "")}` : "";
const PREFIX = `${BASE}${BASE_PATH}`;

const ROOT = process.cwd();
const errors = [];
const warnings = [];

const robotsTxt = await readFile(join(ROOT, "robots.txt"), "utf8").catch(() => "");
const CLOSED = /^Disallow:\s*\/\s*$/m.test(robotsTxt);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "tools" || entry.name === "css" || entry.name === "js" || entry.name === "assets") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}



const pages = (await walk(ROOT)).sort();
const seenTitles = new Map();
const seenDescriptions = new Map();
const seenCanonicals = new Map();

const hasFile = async (path) => {
  try {
    const info = await stat(join(ROOT, path));
    return info.isFile();
  } catch {
    return false;
  }
};

for (const file of pages) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const html = await readFile(file, "utf8");
  const is404 = rel === "404.html";

  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
  if (!title) errors.push(`${rel}: нет <title>`);
  else if (title.length > 70) warnings.push(`${rel}: title ${title.length} символов (>70)`);
  else if (title.length < 20) warnings.push(`${rel}: title слишком короткий (${title.length})`);
  if (title) {
    if (seenTitles.has(title)) errors.push(`${rel}: дубль title с ${seenTitles.get(title)}`);
    else seenTitles.set(title, rel);
  }

  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!description) errors.push(`${rel}: нет meta description`);
  else if (description.length > 175) warnings.push(`${rel}: description ${description.length} символов (>175)`);
  else if (description.length < 70) warnings.push(`${rel}: description короткий (${description.length})`);
  if (description) {
    if (seenDescriptions.has(description)) errors.push(`${rel}: дубль description с ${seenDescriptions.get(description)}`);
    else seenDescriptions.set(description, rel);
  }

  if (!/<html lang="ru">/.test(html)) errors.push(`${rel}: не указан lang="ru"`);

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) errors.push(`${rel}: нет canonical`);
  else if (!canonical.startsWith(`${PREFIX}/`)) errors.push(`${rel}: canonical не совпадает с доменом ${PREFIX}`);
  if (canonical) {
    if (seenCanonicals.has(canonical)) errors.push(`${rel}: дубль canonical с ${seenCanonicals.get(canonical)}`);
    else seenCanonicals.set(canonical, rel);
  }

  const h1 = [...html.matchAll(/<h1[^>]*>[\s\S]*?<\/h1>/g)];
  if (h1.length !== 1) errors.push(`${rel}: H1 найдено ${h1.length}, должен быть 1`);

  const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1] || "";
  if (is404 && !robots.includes("noindex")) errors.push(`${rel}: 404 должен быть noindex`);
  if (!is404 && CLOSED && !robots.includes("noindex")) errors.push(`${rel}: сайт закрыт, но страница индексируется`);
  if (!is404 && !CLOSED && robots.includes("noindex")) errors.push(`${rel}: страница закрыта от индексации`);

  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!jsonLdBlocks.length) errors.push(`${rel}: нет JSON-LD`);
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1]);
      if (!data["@context"]?.includes("schema.org")) errors.push(`${rel}: JSON-LD без @context`);
      if (!Array.isArray(data["@graph"]) || data["@graph"].length < 3) warnings.push(`${rel}: JSON-LD @graph подозрительно короткий`);
    } catch (error) {
      errors.push(`${rel}: невалидный JSON-LD — ${error.message}`);
    }
  }

  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (!ogImage) {
    errors.push(`${rel}: нет og:image`);
  } else if (!ogImage.startsWith(`${PREFIX}/assets/og/`) || !ogImage.endsWith(".png")) {
    errors.push(`${rel}: некорректный og:image — ${ogImage}`);
  } else if (!(await hasFile(ogImage.slice(PREFIX.length + 1)))) {
    errors.push(`${rel}: файл og:image не найден — ${ogImage}`);
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length) warnings.push(`${rel}: повторяются id — ${[...new Set(duplicates)].join(", ")}`);

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    let href = match[1];
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    if (BASE_PATH) {
      if (href === BASE_PATH) href = "/";
      else if (href.startsWith(`${BASE_PATH}/`)) href = href.slice(BASE_PATH.length);
      else {
        errors.push(`${rel}: ссылка без базового пути — ${href}`);
        continue;
      }
    }
    if (href.startsWith("/assets/") || href.startsWith("/css/") || href.endsWith(".xml") || href.endsWith(".txt") || href.endsWith(".webmanifest")) continue;
    const clean = href.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = clean.endsWith("/") ? `${clean.slice(1)}index.html` : clean.slice(1);
    if (!(await hasFile(target))) errors.push(`${rel}: битая ссылка ${match[1]}`);
  }

  for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
    let asset = match[1].split("?")[0];
    if (BASE_PATH && asset.startsWith(`${BASE_PATH}/`)) asset = asset.slice(BASE_PATH.length);
    if (!/^\/(assets|css|js)\//.test(asset)) continue;
    if (!(await hasFile(asset.slice(1)))) errors.push(`${rel}: не найден файл ${match[1]}`);
  }

  if (!/<meta name="viewport"/.test(html)) errors.push(`${rel}: нет viewport`);
  if (!/<link rel="icon"/.test(html)) errors.push(`${rel}: нет favicon`);

  const scripts = [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  if (!scripts.some((src) => src.includes("/js/main.js"))) warnings.push(`${rel}: не подключён main.js`);
}

// sitemap
const sitemap = await readFile(join(ROOT, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const pageUrls = pages
  .map((f) => relative(ROOT, f).replaceAll("\\", "/"))
  .filter((f) => f !== "404.html")
  .map((f) => (f === "index.html" ? `${PREFIX}/` : `${PREFIX}/${f.replace(/index\.html$/, "")}`));

for (const url of pageUrls) {
  if (!locs.includes(url)) errors.push(`sitemap.xml: нет ${url}`);
}
for (const loc of locs) {
  if (!pageUrls.includes(loc)) warnings.push(`sitemap.xml: лишний или неверный URL ${loc}`);
}

if (CLOSED) {
  if (!robotsTxt.includes("Disallow: /")) errors.push("robots.txt: нет Disallow: /");
} else {
  if (!robotsTxt.includes(`Sitemap: ${PREFIX}/sitemap.xml`)) errors.push("robots.txt: нет Sitemap");
  if (!robotsTxt.includes(`Allow: ${BASE_PATH || ""}/`)) errors.push("robots.txt: нет Allow");
}

const rss = await readFile(join(ROOT, "rss.xml"), "utf8").catch(() => "");
if (!rss) errors.push("rss.xml: файл не найден");
else if ((rss.match(/<item>/g) || []).length !== posts.length) warnings.push("rss.xml: число записей не совпадает с блогом");

console.log(`Проверено HTML-страниц: ${pages.length}`);
console.log(`URL в sitemap: ${locs.length}`);
console.log(`Ошибки: ${errors.length}`);
errors.forEach((e) => console.log(`  ✗ ${e}`));
console.log(`Предупреждения: ${warnings.length}`);
warnings.forEach((w) => console.log(`  ! ${w}`));

if (errors.length) process.exitCode = 1;
