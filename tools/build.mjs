import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import {
  site,
  nav,
  services,
  cases,
  packages,
  processSteps,
  principles,
  tech,
  homeFaq,
  serviceFaq,
  posts,
  team,
} from "./data.mjs";
import { serviceContent, caseContent, postContent, aboutContent } from "./content.mjs";
import { icons } from "./icons.mjs";
import { deploy } from "./deploy.config.mjs";

// ВНИМАНИЕ: кейсы, метрики, отзывы и цифры на страницах — демонстрационные.
// Перед публикацией замените их на реальные данные (см. README.md).

site.url = (process.env.SITE_URL || deploy.siteUrl || site.url).replace(/\/$/, "");
site.domain = new URL(site.url).host;

const rawBase = (process.env.BASE_PATH ?? deploy.basePath ?? "").trim();
const BASE_PATH =
  rawBase && rawBase !== "/" ? `/${rawBase.replace(/^\/+|\/+$/g, "")}` : "";
const INDEXING = process.env.INDEXING
  ? process.env.INDEXING === "1"
  : Boolean(deploy.indexing);

const OUT = process.cwd();
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const CONTENT_DATE = "2026-11-22";
const ASSET_VERSION = createHash("sha1")
  .update(await readFile(join(OUT, "css/style.css")))
  .update(await readFile(join(OUT, "css/cozy.css")))
  .update(await readFile(join(OUT, "js/main.js")))
  .digest("hex")
  .slice(0, 10);

/* ------------------------------------------------------------------ utils */

const abs = (path) => {
  const clean = String(path).startsWith("/") ? String(path) : `/${path}`;
  return `${site.url}${BASE_PATH}${clean}`;
};

const HOME_URL = abs("/");
const ORG_ID = `${HOME_URL}#organization`;
const WEBSITE_ID = `${HOME_URL}#website`;
const fileFor = (path) =>
  path === "/" ? "index.html" : path.endsWith("/") ? join(path.slice(1), "index.html") : path.slice(1);

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const jsonld = (data) =>
  JSON.stringify(data, null, 2).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");

const formatDate = (iso) => {
  const [y, m, d] = iso.split("-");
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
};

const lowerFirst = (value = "") => (value ? value.charAt(0).toLowerCase() + value.slice(1) : value);

const translitMap = {
  "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z",
  "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
  "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch",
  "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
};

const slugify = (value) =>
  value
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function enhanceContent(html) {
  const headings = [];
  const used = new Set();
  const withIds = html.replace(/<h2(?![^>]*\bid=)>([\s\S]*?)<\/h2>/g, (match, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    if (!text) return match;
    let id = slugify(text) || `section-${headings.length + 1}`;
    if (used.has(id)) id = `${id}-${headings.length + 1}`;
    used.add(id);
    headings.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });

  if (headings.length < 3) return withIds;

  const toc = `<nav class="toc" aria-label="Содержание">
    <p class="toc__title">Содержание</p>
    <ol>${headings.map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`).join("")}</ol>
  </nav>`;

  return withIds.replace("</p>", `</p>${toc}`);
}

const toc = (html) => enhanceContent(html);



/* ---------------------------------------------------------------- schema */

const organizationSchema = {
  "@type": ["Organization", "ProfessionalService"],
  "@id": ORG_ID,
  name: site.fullName,
  legalName: site.legalName,
  alternateName: site.name,
  url: HOME_URL,
  logo: {
    "@type": "ImageObject",
    url: abs("/assets/apple-touch-icon.png"),
    width: 180,
    height: 180,
  },
  image: abs(site.defaultOg),
  description: site.description,
  email: site.email,
  telephone: site.phone,
  priceRange: site.priceRange,
  foundingDate: String(site.founded),
  address: {
    "@type": "PostalAddress",
    addressLocality: site.city,
    addressRegion: site.region,
    addressCountry: site.country,
  },
  areaServed: { "@type": "Country", name: "Россия" },
  sameAs: [site.telegram, site.vk, site.behance],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: site.phone,
    contactType: "sales",
    areaServed: "RU",
    availableLanguage: ["Russian"],
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "10:00",
    closes: "19:00",
  },
  knowsAbout: [
    "Разработка сайтов",
    "Интернет-магазины",
    "SEO-продвижение",
    "Веб-дизайн",
    "Веб-аналитика",
  ],
};

const websiteSchema = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: HOME_URL,
  name: site.fullName,
  description: site.description,
  publisher: { "@id": ORG_ID },
  inLanguage: "ru-RU",
};

function webPageSchema(page) {
  return {
    "@type": page.schemaType || "WebPage",
    "@id": `${abs(page.path)}#webpage`,
    url: abs(page.path),
    name: page.title,
    description: page.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "ru-RU",
    datePublished: page.published || undefined,
    dateModified: page.updated || BUILD_DATE,
    breadcrumb: page.crumbs?.length ? { "@id": `${abs(page.path)}#breadcrumb` } : undefined,
  };
}

function breadcrumbSchema(page) {
  const items = [{ name: "Главная", url: HOME_URL }, ...page.crumbs.map((c) => ({ name: c.label, url: c.href ? abs(c.href) : abs(page.path) }))];
  return {
    "@type": "BreadcrumbList",
    "@id": `${abs(page.path)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function faqSchema(items) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/* ---------------------------------------------------------------- layout */


function logo(href = "/", label = "ОСНОВА — на главную") {
  return `<a class="logo" href="${href}" aria-label="${esc(label)}">
    <span class="logo-mark">${icons.catFace}</span>
    <span class="logo-word">ОСНОВА<span class="logo-dot">.</span></span>
  </a>`;
}

function header(active = "/") {
  const items = nav
    .map((item) => {
      const isActive = active === item.href || (item.href !== "/" && active.startsWith(item.href));
      return `<a href="${item.href}"${isActive ? ' aria-current="page"' : ""}>${item.label}</a>`;
    })
    .join("");
  return `
  <a class="skip-link" href="#main">Перейти к содержимому</a>
  <header class="site-header" data-header>
    <div class="container header-inner">
      ${logo()}
      <nav class="nav" id="nav" aria-label="Основная навигация">
        <div class="nav-links">${items}</div>
        <div class="nav-mobile">
          <a class="nav-mobile__phone" href="tel:${site.phoneHref}">${site.phone}</a>
          <a class="btn btn--lime btn--block" href="/kontakty/#form">Обсудить проект</a>
        </div>
      </nav>
      <div class="header-actions">
        <a class="header-phone" href="tel:${site.phoneHref}">
          <span>${site.hours}</span>
          <strong>${site.phone}</strong>
        </a>
        <a class="btn btn--dark btn--sm" href="/kontakty/#form">Обсудить проект</a>
        <button class="burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="nav" data-burger>
          <span class="burger-open">${icons.menu}</span>
          <span class="burger-close">${icons.close}</span>
        </button>
      </div>
    </div>
  </header>`;
}

function footer() {
  const serviceLinks = services
    .map((s) => `<a href="${s.href}">${s.title}</a>`)
    .join("");
  return `
  <footer class="footer">
    <div class="container footer-top">
      <div class="footer-brand">
        ${logo()}
        <p>Разрабатываем сайты и digital-продукты, которые приносят заявки. Стратегия, дизайн, разработка и SEO — в одной команде.</p>
        <div class="socials">
          <a href="${site.telegram}" rel="noopener noreferrer" target="_blank">Telegram</a>
          <a href="${site.vk}" rel="noopener noreferrer" target="_blank">VK</a>
          <a href="${site.behance}" rel="noopener noreferrer" target="_blank">Behance</a>
        </div>
        <div class="footer-paws" aria-hidden="true">${icons.paw}${icons.paw}${icons.paw}</div>
      </div>
      <nav class="footer-col" aria-label="Услуги">
        <p class="footer-col__title">Услуги</p>
        ${serviceLinks}
        <a href="/uslugi/">Все услуги</a>
      </nav>
      <nav class="footer-col" aria-label="Студия">
        <p class="footer-col__title">Студия</p>
        <a href="/keysy/">Кейсы</a>
        <a href="/o-studii/">О студии</a>
        <a href="/blog/">Блог</a>
        <a href="/kontakty/">Контакты</a>
      </nav>
      <div class="footer-col footer-contacts">
        <p class="footer-col__title">Связаться</p>
        <a href="tel:${site.phoneHref}">${site.phone}</a>
        <a href="mailto:${site.email}">${site.email}</a>
        <p>${site.addressText}<br>${site.hours}</p>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© ${site.founded}–2026 ${site.legalName}</p>
      <p>ИНН ${site.inn} · ОГРН ${site.ogrn}</p>
      <div class="footer-legal">
        <a href="/privacy/">Политика конфиденциальности</a>
        <a href="/sitemap.xml">Карта сайта</a>
      </div>
    </div>
  </footer>`;
}

function breadcrumbs(crumbs = []) {
  if (!crumbs.length) return "";
  const list = [
    `<li><a href="/">Главная</a></li>`,
    ...crumbs.map((c, i) =>
      i === crumbs.length - 1 || !c.href
        ? `<li><span aria-current="page">${esc(c.label)}</span></li>`
        : `<li><a href="${c.href}">${esc(c.label)}</a></li>`
    ),
  ].join("");
  return `<nav class="breadcrumbs" aria-label="Хлебные крошки"><ol>${list}</ol></nav>`;
}

function head(page) {
  const canonical = abs(page.path);
  const ogImage = abs(page.ogImage || site.defaultOg);
  const robots =
    page.robots ||
    (INDEXING
      ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      : "noindex, nofollow");
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema,
      websiteSchema,
      webPageSchema(page),
      ...(page.crumbs?.length ? [breadcrumbSchema(page)] : []),
      ...(page.schema || []),
    ].filter(Boolean),
  };
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="${robots}">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="author" content="${esc(site.fullName)}">
  <meta name="theme-color" content="#FBF6EE">

  <meta property="og:type" content="${page.ogType || "website"}">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="${esc(site.fullName)}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(page.ogAlt || page.title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  <meta name="twitter:image" content="${ogImage}">

  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="alternate" type="application/rss+xml" title="Блог ОСНОВА — RSS" href="/rss.xml">
  <link rel="stylesheet" href="/css/style.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="/css/cozy.css?v=${ASSET_VERSION}">

  <script type="application/ld+json">${jsonld(graph)}</script>`;
}

function layout(page) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>${head(page)}
</head>
<body>
${header(page.active || page.path)}
<noscript>
  <nav class="noscript-nav" aria-label="Навигация без JavaScript">
    <div class="container">
      <a href="/uslugi/">Услуги</a>
      <a href="/keysy/">Кейсы</a>
      <a href="/o-studii/">О студии</a>
      <a href="/blog/">Блог</a>
      <a href="/kontakty/">Контакты</a>
      <a href="tel:${site.phoneHref}">${site.phone}</a>
    </div>
  </nav>
</noscript>
<main id="main">
${page.body}
</main>
${footer()}
<script src="/js/config.js"></script>
<script src="/js/main.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------ components */

function sectionHead({ number, label, title, lead, link }) {
  return `<div class="section-head">
    <div class="section-head__main">
      <p class="kicker"><span class="kicker__num">${number}</span> ${label}</p>
      <h2>${title}</h2>
    </div>
    <div class="section-head__aside">
      ${lead ? `<p class="section-lead">${lead}</p>` : ""}
      ${link ? `<a class="text-link" href="${link.href}">${link.label} ${icons.arrowUpRight}</a>` : ""}
    </div>
  </div>`;
}

function serviceCard(service, index) {
  return `<a class="service-card" href="${service.href}">
    <div class="service-card__top">
      <span class="service-card__num">${service.number}</span>
      <span class="service-card__icon">${icons[service.icon] || icons.code}</span>
    </div>
    <h3>${service.title}</h3>
    <p>${service.short}</p>
    <div class="service-card__meta">
      <span>${service.price}</span>
      <span>${service.term}</span>
    </div>
    <span class="service-card__link">Подробнее ${icons.arrowUpRight}</span>
  </a>`;
}

function caseCard(item) {
  const [main, ...rest] = item.metrics;
  return `<a class="case-card" href="${item.href}">
    <div class="case-card__visual">
      <div class="case-card__top">
        <span class="case-card__client">${item.client}</span>
        <span class="case-card__industry">${item.industry}</span>
      </div>
      <div class="case-card__metric">
        <strong>${main.value}</strong>
        <span>${main.label}</span>
      </div>
      <div class="case-card__bars" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
    </div>
    <div class="case-card__body">
      <h3>${item.title}</h3>
      <p>${item.short}</p>
      <div class="case-card__footer">
        <ul class="tags">${item.tags.map((t) => `<li>${t}</li>`).join("")}</ul>
        <span class="case-card__more">${icons.arrowUpRight}</span>
      </div>
    </div>
  </a>`;
}

function postCard(post, featured = false) {
  return `<a class="post-card${featured ? " post-card--featured" : ""}" href="${post.href}">
    <div class="post-card__meta">
      <span class="tag">${post.tag}</span>
      <time datetime="${post.date}">${formatDate(post.date)}</time>
      <span>${post.reading}</span>
    </div>
    <h3>${post.title}</h3>
    <p>${post.description}</p>
    <span class="post-card__link">Читать ${icons.arrowUpRight}</span>
  </a>`;
}

function faqBlock(items, title = "Частые вопросы") {
  if (!items?.length) return "";
  return `<section class="faq-block" aria-labelledby="faq-title">
    <h2 id="faq-title">${title}</h2>
    <div class="faq-list">
      ${items
        .map(
          (item, i) => `<details class="faq-item"${i === 0 ? " open" : ""}>
        <summary><span>${item.q}</span><span class="faq-icon" aria-hidden="true"></span></summary>
        <div class="faq-answer"><p>${item.a}</p></div>
      </details>`
        )
        .join("")}
    </div>
  </section>`;
}

function ctaBand({ title = "Расскажите о задаче", text = "Ответим в течение рабочего дня, предложим 2–3 варианта решения и вилку бюджета. Без навязчивых звонков.", label = "Обсудить проект", href = "/kontakty/#form" } = {}) {
  return `<section class="cta-band">
    <span class="cta-cat" aria-hidden="true">${icons.catFace}</span>
    <div class="container cta-band__inner">
      <div class="cta-band__copy">
        <p class="kicker kicker--light"><span class="kicker__num">→</span> Следующий шаг</p>
        <h2>${title}</h2>
        <p>${text}</p>
      </div>
      <div class="cta-band__actions">
        <a class="btn btn--lime btn--lg" href="${href}">${label} ${icons.arrow}</a>
        <a class="cta-band__phone" href="tel:${site.phoneHref}">${site.phone}</a>
      </div>
    </div>
  </section>`;
}

function pageHero({ kicker, title, lead, crumbs, chips = [], aside, className = "" }) {
  return `<section class="page-hero${className ? ` ${className}` : ""}">
    <div class="container">
      ${breadcrumbs(crumbs)}
      <div class="page-hero__grid">
        <div class="page-hero__copy">
          ${kicker ? `<p class="kicker">${kicker}</p>` : ""}
          <h1>${title}</h1>
          ${lead ? `<p class="page-hero__lead">${lead}</p>` : ""}
          ${chips.length ? `<ul class="chips">${chips.map((c) => `<li>${c}</li>`).join("")}</ul>` : ""}
        </div>
        ${aside ? `<div class="page-hero__aside">${aside}</div>` : ""}
      </div>
    </div>
  </section>`;
}

function sidebarCard() {
  return `<aside class="sidebar">
    <div class="sidebar-card">
      <p class="sidebar-card__label">Смета за 1 день</p>
      <h2>Обсудим задачу?</h2>
      <p>Расскажите, что нужно сделать. Предложим решение и назовём вилку бюджета.</p>
      <a class="btn btn--dark btn--block" href="/kontakty/#form">Получить смету</a>
      <ul class="sidebar-list">
        <li>${icons.check} Ответ в течение рабочего дня</li>
        <li>${icons.check} Без навязчивых звонков</li>
        <li>${icons.check} NDA по запросу</li>
      </ul>
    </div>
    <div class="sidebar-card sidebar-card--dark">
      <p class="sidebar-card__label">Или напрямую</p>
      <a class="sidebar-phone" href="tel:${site.phoneHref}">${site.phone}</a>
      <a class="sidebar-mail" href="mailto:${site.email}">${site.email}</a>
      <p class="sidebar-hours">${site.hours}</p>
    </div>
  </aside>`;
}

function leadForm() {  return `<form class="lead-form" data-lead-form novalidate>
    <div class="lead-form__row">
      <label class="field">
        <span>Как вас зовут</span>
        <input type="text" name="name" autocomplete="name" placeholder="Имя" required>
        <small class="field__error"></small>
      </label>
      <label class="field">
        <span>Телефон или email</span>
        <input type="text" name="contact" autocomplete="tel" placeholder="+7 999 000-00-00" required>
        <small class="field__error"></small>
      </label>
    </div>
    <label class="field">
      <span>Что нужно сделать</span>
      <textarea name="task" rows="4" placeholder="Например: корпоративный сайт для производителя, 20 страниц, интеграция с CRM"></textarea>
    </label>
    <label class="checkbox">
      <input type="checkbox" name="consent" required>
      <span>Согласен с <a href="/privacy/">политикой конфиденциальности</a> и обработкой данных</span>
    </label>
    <small class="field__error field__error--consent"></small>
    <button class="btn btn--dark btn--lg btn--block" type="submit">Отправить заявку ${icons.arrow}</button>
    <noscript><p class="form-note">Для отправки формы включите JavaScript или напишите на <a href="mailto:${site.email}">${site.email}</a>.</p></noscript>
    <p class="form-note">Ответим в течение рабочего дня. Без спама и рассылок.</p>
    <p class="form-status" role="status" aria-live="polite"></p>
  </form>`;
}

/* ------------------------------------------------------------------ pages */

const pageList = [];

function addPage(page) {
  pageList.push(page);
  return page;
}

/* Home ------------------------------------------------------------------ */

const homeSchema = [
  faqSchema(homeFaq),
  {
    "@type": "ItemList",
    "@id": `${HOME_URL}#services`,
    name: "Услуги веб-студии ОСНОВА",
    itemListElement: services.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(s.href),
      name: s.title,
    })),
  },
];

const homeBody = `
  <section class="hero">
    <div class="hero-grid" aria-hidden="true"></div>
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="container hero-inner">
      <div class="hero-copy">
        <p class="kicker kicker--light"><span class="kicker__dot"></span> Веб-студия полного цикла · Москва</p>
        <h1>Сайты, которые<br>приносят <em>заявки</em></h1>
        <p class="hero-lead">Стратегия, дизайн, разработка и SEO в одной команде. Запускаем за 6–10 недель и считаем результат в заявках, а не в пикселях.</p>
        <div class="hero-actions">
          <a class="btn btn--lime btn--lg" href="/kontakty/#form">Обсудить проект ${icons.arrow}</a>
          <a class="btn btn--ghost btn--lg" href="/keysy/">Смотреть кейсы</a>
        </div>
        <div class="hand-note">с любовью к деталям <span>↘</span></div>
        <dl class="hero-stats">
          <div><dt>с ${site.founded}</dt><dd>года на рынке</dd></div>
          <div><dt>60+</dt><dd>проектов</dd></div>
          <div><dt>6–10</dt><dd>недель до запуска</dd></div>
          <div><dt>по договору</dt><dd>фиксированная смета</dd></div>
        </dl>
      </div>
      <div class="hero-panel" aria-hidden="true">
        <div class="metric-card metric-card--main">
          <div class="hero-cat" aria-hidden="true">${icons.catSleep}${icons.yarn}</div>
          <div class="metric-card__head"><span>Результат после запуска</span><span class="metric-card__dot"></span></div>
          <strong class="metric-card__value">+62%</strong>
          <span class="metric-card__label">заявок за 6 месяцев</span>
          <div class="metric-card__chart">
            <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
        </div>
        <div class="metric-card metric-card--small metric-card--a">
          <span>LCP на мобильных</span>
          <strong>1,7 с</strong>
        </div>
        <div class="metric-card metric-card--small metric-card--b">
          <span>Конверсия сайта</span>
          <strong>2,8%</strong>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="services">
    <div class="container">
      ${sectionHead({
        number: "01",
        label: "Услуги",
        title: "От лендинга<br>до e-commerce",
        lead: "Берём на себя весь цикл: от исследования и прототипа до запуска, аналитики и развития.",
        link: { href: "/uslugi/", label: "Все услуги" },
      })}
      <div class="services-grid">${services.map(serviceCard).join("")}</div>
    </div>
  </section>

  <section class="section section--paper2" id="cases">
    <div class="container">
      ${sectionHead({
        number: "02",
        label: "Кейсы",
        title: "Результат,<br>который можно проверить",
        lead: "Показываем не только скриншоты, но и цифры до и после: заявки, трафик, скорость.",
        link: { href: "/keysy/", label: "Все кейсы" },
      })}
      <div class="cases-grid">${cases.map(caseCard).join("")}</div>
    </div>
  </section>

  <section class="section" id="process">
    <div class="container">
      ${sectionHead({
        number: "03",
        label: "Процесс",
        title: "Пять этапов<br>без сюрпризов",
        lead: "Вы всегда знаете, что происходит сейчас, что нужно согласовать и когда будет следующий результат.",
      })}
      <ol class="process">
        ${processSteps
          .map(
            (step) => `<li class="process-step">
          <span class="process-step__num">${step.number}</span>
          <div class="process-step__body">
            <div class="process-step__head"><h3>${step.title}</h3><span>${step.term}</span></div>
            <p>${step.text}</p>
          </div>
        </li>`
          )
          .join("")}
      </ol>
    </div>
  </section>

  <section class="section section--dark">
    <div class="container">
      ${sectionHead({
        number: "04",
        label: "Подход",
        title: "Почему с нами<br>спокойно",
        lead: "Мы не продаём «магию». Мы выстраиваем процесс, в котором результат можно увидеть и проверить.",
      })}
      <div class="principles-grid">
        ${principles
          .map(
            (p, i) => `<article class="principle">
          <span class="principle__num">${String(i + 1).padStart(2, "0")}</span>
          <h3>${p.title}</h3>
          <p>${p.text}</p>
        </article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="tech-strip" aria-label="Технологии">
    <div class="container">
      <p class="tech-strip__label">Работаем с инструментами, которые проверены проектами</p>
    </div>
    <div class="marquee">
      <div class="marquee__track">
        ${[...tech, ...tech].map((t) => `<span>${t}</span>`).join("")}
      </div>
    </div>
  </section>

  <section class="section" id="pricing">
    <div class="container">
      ${sectionHead({
        number: "05",
        label: "Стоимость",
        title: "Понятные вилки,<br>а не «от 1 рубля»",
        lead: "Ниже — ориентиры. Точная смета зависит от объёма, интеграций и контента. Фиксируем её в договоре.",
      })}
      <div class="pricing-grid">
        ${packages
          .map(
            (p) => `<article class="price-card${p.featured ? " price-card--featured" : ""}">
          ${p.featured ? '<span class="price-card__badge">Чаще всего выбирают</span>' : ""}
          <div class="price-card__head">
            <h3>${p.name}</h3>
            <p>${p.text}</p>
          </div>
          <div class="price-card__price">${p.price}<span>${p.term}</span></div>
          <ul class="checklist checklist--compact">${p.features.map((f) => `<li>${icons.check} ${f}</li>`).join("")}</ul>
          <a class="btn ${p.featured ? "btn--lime" : "btn--outline"} btn--block" href="/kontakty/#form">Рассчитать проект</a>
        </article>`
          )
          .join("")}
      </div>
      <p class="pricing-note">Нужны SEO, поддержка или отдельная интеграция? <a href="/uslugi/">Смотрите все услуги</a> или <a href="/kontakty/">спросите нас</a>.</p>
    </div>
  </section>

  <section class="section section--paper2" id="faq">
    <div class="container container--narrow">
      ${sectionHead({
        number: "06",
        label: "Вопросы",
        title: "Отвечаем честно",
        lead: "Если не нашли ответ — напишите, ответим в течение рабочего дня.",
      })}
      ${faqBlock(homeFaq)}
    </div>
  </section>

  ${ctaBand()}
`;

addPage({
  path: "/",
  title: "Веб-студия ОСНОВА — разработка сайтов и SEO в Москве",
  description:
    "Веб-студия полного цикла: разработка сайтов и интернет-магазинов, SEO-продвижение, поддержка. Фиксированная смета, запуск за 6–10 недель, результат в заявках.",
  ogImage: "/assets/og/home.png",
  active: "/",
  body: homeBody,
  schema: homeSchema,
});

/* Services hub ---------------------------------------------------------- */

const servicesHubBody = `
  ${pageHero({
    kicker: "01 / Услуги",
    title: "Сайты, магазины<br>и трафик",
    lead: "Четыре направления, которые закрывают полный цикл: от идеи и дизайна до продвижения и поддержки. Можно заказать всё вместе или отдельный этап.",
    crumbs: [{ label: "Услуги" }],
    chips: ["Полный цикл", "Фиксированная смета", "Работаем по всей России"],
    aside: `<div class="hero-note"><span>Средний срок</span><strong>6–10 недель</strong><p>от брифа до запуска корпоративного сайта</p></div>`,
  })}

  <section class="section">
    <div class="container">
      <h2 class="sr-only">Направления работы</h2>
      <div class="services-grid services-grid--large">${services.map(serviceCard).join("")}</div>
    </div>
  </section>

  <section class="section section--paper2">
    <div class="container">
      ${sectionHead({
        number: "02",
        label: "Как выбрать",
        title: "С чего начать",
        lead: "Не обязательно заказывать всё сразу. Начните с задачи, которую нужно решить в первую очередь.",
      })}
      <div class="choice-grid">
        <article class="choice-card"><h3>Нужно запустить продукт или рекламу</h3><p>Начните с лендинга: одна страница, понятный оффер, форма и аналитика. Дальше можно масштабировать до корпоративного сайта.</p><a class="text-link" href="/uslugi/razrabotka-saytov/">Разработка сайтов ${icons.arrowUpRight}</a></article>
        <article class="choice-card"><h3>Нужны продажи в интернете</h3><p>Интернет-магазин с каталогом, оплатой, доставкой и интеграцией с 1С. После запуска — работа над конверсией.</p><a class="text-link" href="/uslugi/internet-magazin/">Интернет-магазины ${icons.arrowUpRight}</a></article>
        <article class="choice-card"><h3>Сайт есть, но нет трафика</h3><p>Начните с SEO-аудита: проверим технику, структуру и контент. Скажем, можно ли расти на текущем сайте.</p><a class="text-link" href="/uslugi/seo-prodvizhenie/">SEO-продвижение ${icons.arrowUpRight}</a></article>
        <article class="choice-card"><h3>Сайт работает, но требует развития</h3><p>Возьмём на поддержку: обновления, безопасность, правки и небольшие улучшения по данным.</p><a class="text-link" href="/uslugi/podderzhka-sayta/">Поддержка ${icons.arrowUpRight}</a></article>
      </div>
    </div>
  </section>

  ${ctaBand({ title: "Не знаете, что выбрать?", text: "Опишите задачу — предложим минимальный достаточный объём работ и покажем, что можно отложить." })}
`;

addPage({
  path: "/uslugi/",
  title: "Услуги веб-студии — сайты, магазины, SEO и поддержка",
  description:
    "Разработка сайтов и интернет-магазинов, SEO-продвижение и поддержка. Полный цикл: аналитика, дизайн, разработка, запуск и рост. Смета за 1 день.",
  ogImage: "/assets/og/services.png",
  active: "/uslugi/",
  crumbs: [{ label: "Услуги" }],
  body: servicesHubBody,
});

/* Service pages --------------------------------------------------------- */

for (const service of services) {
  const faqs = serviceFaq[service.slug] || [];
  const path = service.href;
  const crumbs = [{ label: "Услуги", href: "/uslugi/" }, { label: service.title }];
  const related = cases.slice(0, 3);
  const body = `
    ${pageHero({
      kicker: `${service.number} / Услуги`,
      title: service.title,
      lead: service.short,
      crumbs,
      chips: [service.price, service.term, "Договор и фиксированная смета"],
      aside: `<div class="hero-note"><span>Результат</span><strong>${service.result}</strong><p>метрики фиксируем до старта</p></div>`,
    })}

    <div class="container layout">
      <article class="prose">
        ${enhanceContent(serviceContent[service.slug] || "")}
        ${faqBlock(faqs, "Вопросы об услуге")}
      </article>
      ${sidebarCard()}
    </div>

    <section class="section section--paper2">
      <div class="container">
        ${sectionHead({
          number: "→",
          label: "Кейсы",
          title: "Как это выглядит<br>в проектах",
          lead: "Похожие задачи и измеримый результат после запуска.",
          link: { href: "/keysy/", label: "Все кейсы" },
        })}
        <div class="cases-grid">${related.map(caseCard).join("")}</div>
      </div>
    </section>

    ${ctaBand({
      title: `Нужна услуга «${service.title.toLowerCase()}»?`,
      text: "Опишите задачу и пришлите ссылку на текущий сайт, если он есть. Ответим с вариантами решения и вилкой бюджета.",
    })}
  `;

  addPage({
    path,
    title:
      service.slug === "razrabotka-saytov"
        ? "Разработка сайтов под ключ — от 450 000 ₽ | ОСНОВА"
        : service.slug === "internet-magazin"
        ? "Разработка интернет-магазина — от 700 000 ₽ | ОСНОВА"
        : service.slug === "seo-prodvizhenie"
        ? "SEO-продвижение сайтов — от 80 000 ₽/мес | ОСНОВА"
        : "Поддержка и развитие сайтов — от 30 000 ₽/мес | ОСНОВА",
    description:
      service.slug === "razrabotka-saytov"
        ? "Разработка корпоративных сайтов, лендингов и B2B-порталов под ключ. Аналитика, дизайн, разработка, SEO-база и аналитика. Срок 6–10 недель, смета в договоре."
        : service.slug === "internet-magazin"
        ? "Создание интернет-магазинов с каталогом, оплатой, доставкой и интеграцией с 1С. Работаем с Shop-Script, Битрикс и headless. Срок 8–14 недель."
        : service.slug === "seo-prodvizhenie"
        ? "SEO-продвижение сайтов: технический аудит, семантика, контент и аналитика. Без обещаний топ-1. Первые результаты через 3–4 месяца, от 80 000 ₽/мес."
        : "Поддержка сайтов: мониторинг, бэкапы, обновления, безопасность и развитие. SLA от 2 часов, прозрачный трекер задач. От 30 000 ₽/мес.",
    ogImage: `/assets/og/${service.slug}.png`,
    active: "/uslugi/",
    crumbs,
    body,
    schema: faqs.length
      ? [
          faqSchema(faqs),
          {
            "@type": "Service",
            "@id": `${abs(path)}#service`,
            name: service.title,
            serviceType: service.title,
            description: service.short,
            provider: { "@id": ORG_ID },
            areaServed: { "@type": "Country", name: "Россия" },
            offers: {
              "@type": "Offer",
              priceCurrency: "RUB",
              price: service.price.replace(/[^\d]/g, ""),
              priceSpecification: {
                "@type": "PriceSpecification",
                priceCurrency: "RUB",
                minPrice: service.price.replace(/[^\d]/g, ""),
                description: service.price,
              },
              url: abs(path),
      availability: "https://schema.org/InStock",
            },
          },
        ]
      : [],
  });
}

/* Cases ----------------------------------------------------------------- */

const casesHubBody = `
  ${pageHero({
    kicker: "02 / Кейсы",
    title: "Проекты<br>с цифрами",
    lead: "Три истории о том, как сайт перестал быть визиткой и начал приносить заявки. Для каждого проекта показываем задачу, решение и результат.",
    crumbs: [{ label: "Кейсы" }],
    chips: ["B2B", "E-commerce", "Медицина"],
    aside: `<div class="hero-note"><span>Лучший результат</span><strong>×3</strong><p>рост заявок за 8 месяцев</p></div>`,
  })}

  <section class="section">
    <div class="container">
      <h2 class="sr-only">Все проекты</h2>
      <div class="cases-grid cases-grid--large">${cases.map(caseCard).join("")}</div>
    </div>
  </section>

  <section class="section section--paper2">
    <div class="container">
      ${sectionHead({
        number: "→",
        label: "Подход",
        title: "Что общего<br>у этих проектов",
        lead: "Разные отрасли, но одинаковый принцип: сначала задача и метрики, потом дизайн и код.",
      })}
      <div class="principles-grid principles-grid--light">
        <article class="principle"><span class="principle__num">01</span><h3>Исследование до макетов</h3><p>Интервью, конкуренты и сценарии. Мы не рисуем, пока не понимаем, кому и что продаём.</p></article>
        <article class="principle"><span class="principle__num">02</span><h3>Структура под поиск</h3><p>Семантика и внутренняя перелинковка закладываются в прототип, а не добавляются после запуска.</p></article>
        <article class="principle"><span class="principle__num">03</span><h3>Скорость как часть дизайна</h3><p>Бюджет производительности фиксируем на старте: изображения, шрифты, JS и кэш.</p></article>
        <article class="principle"><span class="principle__num">04</span><h3>Аналитика с первого дня</h3><p>Цели и события настраиваются до запуска, чтобы видеть эффект, а не догадываться о нём.</p></article>
      </div>
    </div>
  </section>

  ${ctaBand({ title: "Хотите такой же результат?", text: "Расскажите о задаче. Покажем похожие проекты и предложим план работ с реалистичными сроками." })}
`;

addPage({
  path: "/keysy/",
  title: "Кейсы веб-студии ОСНОВА — сайты с измеримым результатом",
  description:
    "Кейсы разработки сайтов и интернет-магазинов: рост заявок, конверсии и органического трафика. Задача, решение, результат и технологии.",
  ogImage: "/assets/og/cases.png",
  active: "/keysy/",
  crumbs: [{ label: "Кейсы" }],
  body: casesHubBody,
});

for (const item of cases) {
  const path = item.href;
  const crumbs = [{ label: "Кейсы", href: "/keysy/" }, { label: item.client }];
  const otherCases = cases.filter((c) => c.slug !== item.slug);
  const body = `
    <!-- ДЕМО-КЕЙС: замените название клиента, метрики и цитату на реальные -->
    ${pageHero({
      kicker: `${item.industry} · ${item.year}`,
      title: item.title,
      lead: item.short,
      crumbs,
      chips: [item.client, item.duration, ...item.tags.slice(0, 2)],
      className: "page-hero--case",
      aside: `<div class="hero-note"><span>Главный результат</span><strong>${item.metrics[0].value}</strong><p>${item.metrics[0].label}</p></div>`,
    })}

    <div class="case-metrics">
      <div class="container">
        <dl class="metrics-row">
          ${item.metrics.map((m) => `<div><dt>${m.value}</dt><dd>${m.label}</dd></div>`).join("")}
        </dl>
      </div>
    </div>

    <div class="container layout">
      <article class="prose">
        ${enhanceContent(caseContent[item.slug] || "")}
        <h2>Технологии и сроки</h2>
        <ul class="tag-list">${item.stack.map((s) => `<li>${s}</li>`).join("")}</ul>
        <p>Срок проекта — ${item.duration}. Состав команды: проджект-менеджер, дизайнер, разработчик, SEO-специалист и аналитик.</p>
      </article>
      ${sidebarCard()}
    </div>

    <section class="section section--paper2">
      <div class="container">
        ${sectionHead({
          number: "→",
          label: "Ещё кейсы",
          title: "Другие проекты",
          link: { href: "/keysy/", label: "Все кейсы" },
        })}
        <div class="cases-grid">${otherCases.map(caseCard).join("")}</div>
      </div>
    </section>

    ${ctaBand({ title: "Обсудим ваш проект?", text: "Покажем, какие решения сработали в похожих задачах, и предложим план." })}
  `;

  addPage({
    path,
    title: item.seoTitle,
    description: `${item.client}: ${lowerFirst(item.short)} Задача, решение и результат.`,
    ogImage: `/assets/og/${item.slug}.png`,
    ogType: "article",
    active: "/keysy/",
    crumbs,
    body,
    published: `${item.year}-03-15`,
    updated: BUILD_DATE,
    schema: [
      {
        "@type": "Article",
        "@id": `${abs(path)}#article`,
        headline: item.title,
        description: item.short,
        datePublished: `${item.year}-03-15`,
        dateModified: BUILD_DATE,
        author: { "@id": ORG_ID },
        publisher: { "@id": ORG_ID },
        mainEntityOfPage: { "@id": `${abs(path)}#webpage` },
        about: item.tags.map((t) => ({ "@type": "Thing", name: t })),
        image: abs(`/assets/og/${item.slug}.png`),
      },
    ],
  });
}

/* About ----------------------------------------------------------------- */

const aboutBody = `
  ${pageHero({
    kicker: "03 / Студия",
    title: "Команда,<br>которая отвечает<br>за результат",
    lead: "С 2018 года делаем сайты и digital-продукты для бизнеса. Не передаём проект между подрядчиками: стратегия, дизайн, разработка, SEO и аналитика — внутри команды.",
    crumbs: [{ label: "О студии" }],
    chips: ["14 человек", "60+ проектов", "12 отраслей"],
    aside: `<div class="hero-note"><span>Работаем с</span><strong>2018 года</strong><p>по договору, с фиксированной сметой</p></div>`,
  })}

  <div class="stats-band">
    <div class="container">
      <dl class="stats-row">
        <div><dt>8 лет</dt><dd>на рынке</dd></div>
        <div><dt>14</dt><dd>человек в команде</dd></div>
        <div><dt>60+</dt><dd>запущенных проектов</dd></div>
        <div><dt>92%</dt><dd>клиентов возвращаются</dd></div>
      </dl>
    </div>
  </div>

  <div class="container layout">
    <article class="prose">
      ${aboutContent}
      <h2>Команда</h2>
      <div class="team-grid">
        ${team
          .map(
            (person) => `<article class="team-card">
          <span class="team-card__avatar" aria-hidden="true">${person.initials}</span>
          <h3>${person.name}</h3>
          <p class="team-card__role">${person.role}</p>
          <p class="team-card__focus">${person.focus}</p>
        </article>`
          )
          .join("")}
      </div>
    </article>
    ${sidebarCard()}
  </div>

  <section class="section section--paper2">
    <div class="container">
      ${sectionHead({
        number: "→",
        label: "Принципы",
        title: "Что для нас важно",
        lead: "Эти правила не зависят от бюджета и размера проекта.",
      })}
      <div class="principles-grid principles-grid--light">
        ${principles
          .map(
            (p, i) => `<article class="principle"><span class="principle__num">${String(i + 1).padStart(2, "0")}</span><h3>${p.title}</h3><p>${p.text}</p></article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  ${ctaBand({ title: "Познакомимся?", text: "Расскажите о задаче — предложим решение и познакомим с командой, которая будет вести проект." })}
`;

addPage({
  path: "/o-studii/",
  title: "О веб-студии ОСНОВА — команда, принципы, процессы",
  description:
    "ОСНОВА — веб-студия полного цикла с 2018 года. 14 специалистов, 60+ проектов. Работаем по договору, передаём доступы и документацию, гарантия 12 месяцев.",
  ogImage: "/assets/og/about.png",
  active: "/o-studii/",
  crumbs: [{ label: "О студии" }],
  body: aboutBody,
  schemaType: "AboutPage",
});

/* Blog ------------------------------------------------------------------ */

const blogBody = `
  ${pageHero({
    kicker: "04 / Блог",
    title: "Разбираем<br>разработку и SEO",
    lead: "Пишем о том, что проверяем на проектах: сметы, аудиты, скорость, конверсия. Без «10 трендов» и воды.",
    crumbs: [{ label: "Блог" }],
    chips: ["Разработка", "SEO", "Скорость"],
    aside: `<div class="hero-note"><span>Новые материалы</span><strong>2 раза в месяц</strong><p>без спама и рассылок</p></div>`,
  })}

  <section class="section">
    <div class="container">
      <h2 class="sr-only">Все статьи</h2>
      <div class="posts-grid">
        ${posts.map((p, i) => postCard(p, i === 0)).join("")}
      </div>
    </div>
  </section>

  <section class="section section--paper2">
    <div class="container container--narrow">
      ${sectionHead({
        number: "→",
        label: "Подход",
        title: "Зачем мы это пишем",
        lead: "Хорошая статья экономит клиенту месяц переписки. Если материал помогает принять решение — мы считаем задачу выполненной.",
      })}
      <div class="callout">
        <p>Все цифры и сроки в статьях — из наших проектов и открытых исследований. Если данных нет, мы так и говорим, а не придумываем «среднюю температуру по рынку».</p>
      </div>
    </div>
  </section>

  ${ctaBand({ title: "Остались вопросы?", text: "Напишите — ответим и, если нужно, разберём ваш сайт на коротком созвоне." })}
`;

addPage({
  path: "/blog/",
  title: "Блог веб-студии ОСНОВА — разработка, SEO и аналитика",
  description:
    "Статьи о разработке сайтов, SEO-аудите, скорости и конверсии. Практика без воды: сметы, чек-листы и разборы реальных задач.",
  ogImage: "/assets/og/blog.png",
  active: "/blog/",
  crumbs: [{ label: "Блог" }],
  body: blogBody,
  schemaType: "CollectionPage",
  schema: [
    {
      "@type": "Blog",
      "@id": `${abs("/blog/")}#blog`,
      name: "Блог веб-студии ОСНОВА",
      description: "Статьи о разработке сайтов, SEO и аналитике.",
      publisher: { "@id": ORG_ID },
      blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(p.href), datePublished: p.date })),
    },
  ],
});

for (const post of posts) {
  const path = post.href;
  const crumbs = [{ label: "Блог", href: "/blog/" }, { label: post.title }];
  const related = posts.filter((p) => p.slug !== post.slug);
  const body = `
    ${pageHero({
      kicker: `${post.tag} · ${post.reading}`,
      title: post.title,
      lead: post.description,
      crumbs,
      chips: [formatDate(post.date), post.author, post.role],
      className: "page-hero--article",
      aside: `<div class="hero-note"><span>Автор</span><strong>${post.author}</strong><p>${post.role}</p></div>`,
    })}

    <div class="container layout">
      <article class="prose">
        ${enhanceContent(postContent[post.slug] || "")}
        <div class="author-box">
          <span class="author-box__avatar" aria-hidden="true">${post.author.split(" ").map((w) => w[0]).join("")}</span>
          <div>
            <p class="author-box__name">${post.author}</p>
            <p class="author-box__role">${post.role} веб-студии ОСНОВА. Помогает проектировать сайты и выстраивать аналитику.</p>
          </div>
        </div>
        <p class="article-updated">Обновлено: <time datetime="${post.updated}">${formatDate(post.updated)}</time></p>
      </article>
      ${sidebarCard()}
    </div>

    <section class="section section--paper2">
      <div class="container">
        ${sectionHead({
          number: "→",
          label: "Читайте также",
          title: "Другие материалы",
          link: { href: "/blog/", label: "Все статьи" },
        })}
        <div class="posts-grid">${related.map((p) => postCard(p)).join("")}</div>
      </div>
    </section>

    ${ctaBand({ title: "Нужен разбор вашего сайта?", text: "Проведём экспресс-аудит и покажем 3–5 точек роста. Бесплатно, без обязательств." })}
  `;

  addPage({
    path,
    title: post.title,
    description: post.description,
    ogImage: "/assets/og/blog.png",
    ogType: "article",
    ogAlt: post.title,
    active: "/blog/",
    crumbs,
    body,
    published: post.date,
    updated: post.updated,
    schemaType: "Article",
    schema: [
      {
        "@type": "BlogPosting",
        "@id": `${abs(path)}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.updated,
        author: {
          "@type": "Person",
          name: post.author,
          jobTitle: post.role,
          worksFor: { "@id": ORG_ID },
        },
        publisher: { "@id": ORG_ID },
        mainEntityOfPage: { "@id": `${abs(path)}#webpage` },
        image: abs("/assets/og/blog.png"),
        articleSection: post.tag,
        inLanguage: "ru-RU",
      },
    ],
  });
}

/* Contacts -------------------------------------------------------------- */

const contactsBody = `
  ${pageHero({
    kicker: "05 / Контакты",
    title: "Обсудим<br>вашу задачу",
    lead: "Расскажите, что нужно сделать, и пришлите ссылку на текущий сайт. Ответим в течение рабочего дня с вариантами решения и вилкой бюджета.",
    crumbs: [{ label: "Контакты" }],
    chips: ["Ответ в течение дня", "NDA по запросу", "Работаем по всей России"],
  })}

  <section class="section">
    <div class="container contact-layout">
      <div class="contact-info">
        <h2>Как связаться</h2>
        <ul class="contact-list">
          <li><span class="contact-list__icon">${icons.phone}</span><div><span>Телефон</span><a href="tel:${site.phoneHref}">${site.phone}</a></div></li>
          <li><span class="contact-list__icon">${icons.mail}</span><div><span>Email</span><a href="mailto:${site.email}">${site.email}</a></div></li>
          <li><span class="contact-list__icon">${icons.pin}</span><div><span>География</span><p>${site.addressText}</p></div></li>
          <li><span class="contact-list__icon">${icons.clock}</span><div><span>Часы работы</span><p>${site.hours}</p></div></li>
        </ul>
        <div class="contact-socials">
          <a class="btn btn--outline" href="${site.telegram}" target="_blank" rel="noopener noreferrer">Telegram</a>
          <a class="btn btn--outline" href="${site.vk}" target="_blank" rel="noopener noreferrer">VK</a>
        </div>

        <details class="requisites">
          <summary>Реквизиты компании</summary>
          <div>
            <p>${site.legalName}</p>
            <p>ИНН ${site.inn}</p>
            <p>ОГРН ${site.ogrn}</p>
            <p>Юридический адрес: ${site.city}, Россия</p>
          </div>
        </details>

        <div class="contact-note">
          <h3>Что будет после заявки</h3>
          <ol class="steps-list steps-list--compact">
            <li>Уточним задачу и сроки в переписке или на созвоне.</li>
            <li>Предложим 2–3 варианта решения и вилку бюджета.</li>
            <li>Если подходим — подготовим смету и план работ.</li>
          </ol>
        </div>
      </div>

      <div class="contact-form" id="form">
        <h2>Оставить заявку</h2>
        <p class="contact-form__lead">Заполните форму — ответим в течение рабочего дня.</p>
        ${leadForm()}
      </div>
    </div>
  </section>

  ${ctaBand({ title: "Не любите формы?", text: "Напишите в Telegram или позвоните. Ответит человек, а не бот." , label: "Написать в Telegram", href: site.telegram })}
`;

addPage({
  path: "/kontakty/",
  title: "Контакты веб-студии ОСНОВА — обсудить проект",
  description:
    "Свяжитесь с веб-студией ОСНОВА: телефон, email, Telegram. Обсудим задачу, предложим решение и вилку бюджета. Ответ в течение рабочего дня.",
  ogImage: "/assets/og/contacts.png",
  active: "/kontakty/",
  crumbs: [{ label: "Контакты" }],
  body: contactsBody,
  schemaType: "ContactPage",
});

/* Privacy --------------------------------------------------------------- */

const privacyBody = `
  <section class="page-hero page-hero--simple">
    <div class="container container--narrow">
      ${breadcrumbs([{ label: "Политика конфиденциальности" }])}
      <p class="kicker">Документы</p>
      <h1>Политика конфиденциальности</h1>
      <p class="page-hero__lead">Как мы собираем, используем и защищаем персональные данные посетителей сайта. Редакция от ${formatDate(CONTENT_DATE)}.</p>
    </div>
  </section>

  <div class="container container--narrow">
    <article class="prose">
      <h2>1. Общие положения</h2>
      <p>Настоящая политика описывает порядок обработки персональных данных пользователей сайта ${site.domain}. Оператор — ${site.legalName}, ИНН ${site.inn}, ОГРН ${site.ogrn}.</p>
      <p>Используя сайт и отправляя формы, вы соглашаетесь с условиями этой политики.</p>

      <h2>2. Какие данные мы собираем</h2>
      <ul>
        <li>Имя, телефон или email, указанные в формах.</li>
        <li>Текст задачи и ссылки, которые вы добровольно прикладываете.</li>
        <li>Технические данные: IP-адрес, тип устройства и браузера, источник перехода.</li>
        <li>Данные систем веб-аналитики (Яндекс.Метрика, Google Analytics), если они подключены.</li>
      </ul>

      <h2>3. Зачем мы обрабатываем данные</h2>
      <ul>
        <li>Чтобы ответить на обращение и подготовить предложение.</li>
        <li>Чтобы заключить и исполнить договор.</li>
        <li>Чтобы улучшать сайт и качество услуг.</li>
        <li>Чтобы выполнять требования законодательства.</li>
      </ul>
      <p>Мы не продаём и не передаём данные третьим лицам, кроме случаев, предусмотренных законом, и подрядчиков, которые помогают обрабатывать заявки (например, CRM или сервис отправки писем).</p>

      <h2>4. Правовые основания</h2>
      <p>Обработка осуществляется на основании согласия пользователя, выраженного при отправке формы, а также для исполнения договора и соблюдения требований закона.</p>

      <h2>5. Сроки хранения</h2>
      <p>Данные хранятся не дольше, чем нужно для целей обработки, или до отзыва согласия. Обращения без договора — до 12 месяцев. Данные по договорам — в течение срока, установленного законодательством.</p>

      <h2>6. Права пользователя</h2>
      <p>Вы можете запросить сведения об обработке, потребовать уточнения, блокирования или удаления данных, а также отозвать согласие. Напишите на <a href="mailto:${site.email}">${site.email}</a> — ответим в течение 10 рабочих дней.</p>

      <h2>7. Cookies и аналитика</h2>
      <p>Сайт использует cookies для корректной работы и анализа посещаемости. Вы можете отключить cookies в настройках браузера; часть функций при этом может работать некорректно.</p>

      <h2>8. Безопасность</h2>
      <p>Мы ограничиваем доступ к данным, используем защищённые каналы передачи и регулярно проверяем процессы. При инциденте уведомляем затронутых пользователей и принимаем меры по устранению последствий.</p>

      <h2>9. Изменения политики</h2>
      <p>Актуальная редакция всегда доступна на этой странице. При существенных изменениях обновляем дату редакции.</p>

      <h2>10. Контакты</h2>
      <p>По вопросам обработки данных: <a href="mailto:${site.email}">${site.email}</a>, телефон <a href="tel:${site.phoneHref}">${site.phone}</a>.</p>
    </article>
  </div>

  ${ctaBand({ title: "Остались вопросы по данным?", text: "Напишите нам — объясним, какие данные используются и как отозвать согласие." })}
`;

addPage({
  path: "/privacy/",
  title: "Политика конфиденциальности — ОСНОВА",
  description:
    "Политика обработки персональных данных сайта osnova.studio: какие данные собираем, зачем, сколько храним и как отозвать согласие.",
  ogImage: "/assets/og/home.png",
  active: "/",
  crumbs: [{ label: "Политика конфиденциальности" }],
  body: privacyBody,
  schemaType: "WebPage",
});

/* 404 ------------------------------------------------------------------- */

const notFoundBody = `
  <section class="not-found">
    <div class="container">
      <div class="not-found-cat" aria-hidden="true">${icons.catSleep}</div>
      <p class="kicker">Ошибка 404</p>
      <h1>Такой страницы<br><em>нет</em></h1>
      <p class="not-found__lead">Возможно, ссылка устарела или в адресе опечатка. Вот куда можно перейти:</p>
      <div class="not-found__links">
        <a class="btn btn--dark" href="/">На главную ${icons.arrow}</a>
        <a class="btn btn--outline" href="/uslugi/">Услуги</a>
        <a class="btn btn--outline" href="/keysy/">Кейсы</a>
        <a class="btn btn--outline" href="/blog/">Блог</a>
      </div>
    </div>
  </section>
`;

pageList.push({
  path: "/404.html",
  title: "Страница не найдена — ОСНОВА",
  description: "Страница не найдена. Перейдите на главную или выберите нужный раздел сайта.",
  ogImage: "/assets/og/home.png",
  robots: "noindex, follow",
  body: notFoundBody,
  active: "/",
  crumbs: [],
});

/* --------------------------------------------------------------- writing */

const withBase = (html) =>
  BASE_PATH ? html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE_PATH}/`) : html;

async function writePage(page) {
  const rel = fileFor(page.path);
  const file = join(OUT, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, withBase(layout(page)), "utf8");
}

const sitemapPriority = (path) => {
  if (path === "/") return "1.0";
  if (path === "/uslugi/" || path === "/keysy/" || path === "/kontakty/") return "0.9";
  if (path.startsWith("/uslugi/") || path.startsWith("/keysy/")) return "0.8";
  if (path.startsWith("/blog/")) return "0.7";
  if (path === "/privacy/") return "0.3";
  return "0.6";
};

const changefreq = (path) => (path.startsWith("/blog/") || path === "/blog/" ? "monthly" : "weekly");

async function writeSitemap() {
  const pages = pageList.filter((p) => p.path !== "/404.html");
  const urls = pages
    .map(
      (p) => `  <url>
    <loc>${abs(p.path)}</loc>
    <lastmod>${p.updated || BUILD_DATE}</lastmod>
    <changefreq>${changefreq(p.path)}</changefreq>
    <priority>${sitemapPriority(p.path)}</priority>
  </url>`
    )
    .join("\n");
  await writeFile(
    join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    "utf8"
  );
}

async function writeRobots() {
  const allowPath = `${BASE_PATH || ""}/`;
  const content = INDEXING
    ? `User-agent: *
Allow: ${allowPath}
Disallow: ${allowPath}404.html
Disallow: /*?utm_
Disallow: /*?yclid=
Disallow: /*?fbclid=

Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&fbclid

Sitemap: ${abs("/sitemap.xml")}
`
    : `User-agent: *
Disallow: /

# Сайт закрыт от индексации. Откройте через INDEXING=1 при сборке.
`;
  await writeFile(join(OUT, "robots.txt"), content, "utf8");
}

async function writeRss() {
  const xmlEsc = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const items = posts
    .map(
      (post) => `    <item>
      <title>${xmlEsc(post.title)}</title>
      <link>${abs(post.href)}</link>
      <guid isPermaLink="true">${abs(post.href)}</guid>
      <pubDate>${new Date(`${post.date}T09:00:00+03:00`).toUTCString()}</pubDate>
      <category>${xmlEsc(post.tag)}</category>
      <description>${xmlEsc(post.description)}</description>
    </item>`
    )
    .join("\n");

  await writeFile(
    join(OUT, "rss.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Блог веб-студии ОСНОВА</title>
    <link>${abs("/blog/")}</link>
    <description>Разработка сайтов, SEO и скорость без воды.</description>
    <language>ru</language>
    <lastBuildDate>${new Date(`${BUILD_DATE}T09:00:00+03:00`).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`,
    "utf8"
  );
}

async function writeManifest() {
  await writeFile(
    join(OUT, "site.webmanifest"),
    JSON.stringify(
      {
        name: site.fullName,
        short_name: site.name,
        description: site.description,
        start_url: `${BASE_PATH || ""}/`,
        scope: `${BASE_PATH || ""}/`,
        display: "standalone",
        background_color: "#FBF6EE",
        theme_color: "#3E332B",
        lang: "ru",
        icons: [
          { src: `${BASE_PATH}/assets/favicon.svg`, sizes: "any", type: "image/svg+xml" },
          { src: `${BASE_PATH}/assets/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
        ],
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

async function main() {
  await rm(join(OUT, "uslugi"), { recursive: true, force: true });
  await rm(join(OUT, "keysy"), { recursive: true, force: true });
  await rm(join(OUT, "blog"), { recursive: true, force: true });
  await rm(join(OUT, "o-studii"), { recursive: true, force: true });
  await rm(join(OUT, "kontakty"), { recursive: true, force: true });
  await rm(join(OUT, "privacy"), { recursive: true, force: true });

  for (const page of pageList) await writePage(page);
  await writeSitemap();
  await writeRobots();
  await writeRss();
  await writeManifest();

  const count = pageList.length;
  console.log(`Собрано страниц: ${count}`);
  console.log(pageList.map((p) => `  ${p.path}`).join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
