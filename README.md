# ОСНОВА — сайт веб-студии

Статический многостраничный сайт веб-студии: услуги, кейсы, блог, контакты
и SEO-страницы. Без сборщиков и зависимостей — генерируется Node.js-скриптом
в чистый HTML.

> **Важно: контент демонстрационный.** Названия клиентов, метрики кейсов,
> отзывы, цифры «92% клиентов возвращаются», реквизиты и телефон — примеры.
> Перед публикацией замените их на реальные данные. Иначе сайт будет
> вводить посетителей и поисковые системы в заблуждение.

> **Сейчас сайт закрыт от индексации:** на всех страницах стоит
> `noindex, nofollow`, в `robots.txt` — `Disallow: /`. Как открыть —
> см. раздел «Индексация».

## Запуск

Нужен Node.js 18+.

```bash
npm run build   # собрать HTML, sitemap.xml, robots.txt, rss.xml
npm run check   # проверить SEO-разметку и внутренние ссылки
npm run dev     # собрать и запустить локальный сервер на http://localhost:4322/osnova-web-studio/
```

Сборка не обязательна для просмотра: готовые HTML-файлы уже лежат в репозитории.
Сервер нужен только для чистых URL вида `/uslugi/razrabotka-saytov/`.

## Структура

```
index.html                    — главная
uslugi/index.html             — хаб услуг
uslugi/razrabotka-saytov/     — разработка сайтов
uslugi/internet-magazin/      — интернет-магазины
uslugi/seo-prodvizhenie/      — SEO-продвижение
uslugi/podderzhka-sayta/      — поддержка
keysy/index.html              — кейсы
keysy/severny-potok/          — кейс B2B
keysy/flora-market/           — кейс e-commerce
keysy/lab-7/                  — кейс медицины
o-studii/index.html           — о студии
blog/index.html               — блог
blog/skolko-stoit-sayt-2026/  — статья
blog/seo-audit-12-proverok/   — статья
blog/core-web-vitals-2026/    — статья
kontakty/index.html           — контакты и форма
privacy/index.html            — политика конфиденциальности
404.html                      — страница «не найдено»
css/style.css                 — все стили
js/config.js                  — настройки заявок и аналитики
js/main.js                    — меню, формы, аналитика
assets/                       — логотип, favicon, OG-картинки
tools/data.mjs                — контакты, услуги, кейсы, статьи, команда
tools/deploy.config.mjs       — домен, базовый путь и режим индексации
tools/content.mjs             — тексты страниц услуг, кейсов и статей
tools/build.mjs               — генератор HTML и служебных файлов
tools/check.mjs               — проверка SEO и ссылок
tools/make-og.ps1             — генерация OG-картинок (PowerShell)
server.mjs                    — локальный статический сервер
_headers                      — пример заголовков безопасности и кэша
rss.xml, sitemap.xml          — генерируются сборкой
robots.txt, site.webmanifest  — генерируются сборкой
```

## Что уже сделано для SEO

- **Уникальные title и description** на каждой странице, длина в пределах
  рекомендованных значений.
- **Canonical** на всех страницах, один H1, логичная иерархия H2–H3.
- **Чистые URL** с завершающим слешем и хлебными крошками.
- **Внутренняя перелинковка**: услуги ↔ кейсы ↔ блог ↔ контакты.
- **Структурированные данные JSON-LD**: Organization, ProfessionalService,
  WebSite, WebPage, BreadcrumbList, Service, FAQPage, Blog, BlogPosting,
  AboutPage, ContactPage.
- **Open Graph и Twitter Card**, OG-картинки 1200×630 для основных страниц.
- **robots.txt** с Sitemap и Clean-param, **sitemap.xml** со всеми URL,
  **rss.xml** для блога.
- **404** с `noindex` и полезными ссылками.
- **Скорость**: нет внешних шрифтов и JS-библиотек, один CSS-файл, defer для JS,
  графика в SVG/CSS, OG-картинки не загружаются на страницах.
- **Доступность**: skip-link, семантические теги, подписи к полям, focus-visible,
  контраст, `prefers-reduced-motion`.
- **E-E-A-T**: страница о студии, авторы статей, реквизиты, политика
  конфиденциальности, методология кейсов.
- **Мобильная версия** и меню, проверенные на 390 px.

## Как менять контент

### Контакты, название, реквизиты

`tools/data.mjs`, объект `site`. После правок:

```bash
npm run build
```

Телефон, email и часы работы также продублированы в `js/config.js`
и в подвале — проверьте поиском по старому значению.

### Услуги, кейсы, статьи

- Услуги и их метаданные — `tools/data.mjs` (`services`).
- Тексты страниц услуг — `tools/content.mjs` (`serviceContent`).
- Кейсы — `tools/data.mjs` (`cases`) и `tools/content.mjs` (`caseContent`).
- Статьи — `tools/data.mjs` (`posts`) и `tools/content.mjs` (`postContent`).
- Команда — `tools/data.mjs` (`team`).
- FAQ — `tools/data.mjs` (`homeFaq`, `serviceFaq`).

TOC (содержание статьи) и ID заголовков генерируются автоматически
из `<h2>` в тексте.

### OG-картинки

```powershell
powershell -ExecutionPolicy Bypass -File tools/make-og.ps1
```

Скрипт создаёт PNG 1200×630 в `assets/og/` и `assets/apple-touch-icon.png`.
После изменения текста заголовков обновите картинки.

### Домен

По умолчанию используются настройки из `tools/deploy.config.mjs`:
`https://adastra-code.github.io` и базовый путь `/osnova-web-studio`.

Для другого домена измените конфиг или переопределите переменные:

```bash
SITE_URL=https://example.com BASE_PATH=/ npm run build
```

На Windows PowerShell:

```powershell
$env:SITE_URL="https://example.com"; $env:BASE_PATH="/"; npm run build
```

`BASE_PATH=/` означает «сайт в корне домена». Домен подставляется
в canonical, Open Graph, JSON-LD, sitemap и robots.txt.

## Формы

`js/config.js`:

- `leadsEndpoint` — URL вебхука (Formspree, Make/n8n, CRM, своя функция).
  Пока пусто — форма открывает почтовый клиент с готовым письмом на `email`.
- `email` — резервный адрес.
- `metrikaId` — номер счётчика Яндекс.Метрики. Пока пусто — аналитика
  не загружается.

Если указываете внешний `leadsEndpoint`, добавьте его домен в
`connect-src` в `_headers` (или в заголовки вашего хостинга).

События Метрики: `form_submit`, `form_email`, `phone_click`, `email_click`,
`telegram_click`.

## Публикация

Сайт опубликован на GitHub Pages:

**https://adastra-code.github.io/osnova-web-studio/**

Репозиторий: **https://github.com/adastra-code/osnova-web-studio**

### GitHub Pages

Настройки публикации лежат в `tools/deploy.config.mjs`:
`siteUrl`, `basePath` и `indexing`. Поэтому обычный `npm run build`
собирает версию для GitHub Pages.

Сборка для проекта в подпапке (если нужно переопределить):

```bash
SITE_URL=https://adastra-code.github.io BASE_PATH=/osnova-web-studio npm run build
```

PowerShell:

```powershell
$env:SITE_URL="https://adastra-code.github.io"; $env:BASE_PATH="/osnova-web-studio"; npm run build
npm run check
```

Затем закоммитить и запушить. В настройках репозитория:
**Settings → Pages → Source: Deploy from a branch → main / (root)**.
Файл `.nojekyll` уже добавлен, чтобы GitHub Pages отдавал все файлы как есть.

Локальный предпросмотр:

```powershell
npm run dev
```

Откройте `http://localhost:4322/osnova-web-studio/`.

### Другой хостинг

Подойдёт любой статический хостинг: Netlify, Vercel, Cloudflare Pages,
обычный сервер.

1. Соберите сайт с нужным доменом (или измените `tools/deploy.config.mjs`).
2. Загрузите **содержимое папки** `web-studio/` (не весь репозиторий).
3. Настройте 301-редиректы: `http → https`, `www → без www`.
4. Включите gzip/brotli и кэш для `/assets`, `/css`, `/js`
   (пример — в `_headers`).
5. Отправьте `sitemap.xml` в Яндекс.Вебмастер и Google Search Console.
6. Проверьте `robots.txt`, canonical и структурированные данные
   в валидаторах.

Для GitHub Pages: содержимое папки `web-studio/` лежит в отдельном
репозитории, сборка использует `BASE_PATH=/osnova-web-studio`,
поэтому ссылки и стили работают в подпапке. `404.html` подхватывается
автоматически.

## Индексация

Сейчас сайт **закрыт от индексации**:

- на всех страницах — `<meta name="robots" content="noindex, nofollow">`;
- в `robots.txt` — `Disallow: /`;
- sitemap сгенерирован, но не отправлен в поисковые системы.

Чтобы открыть сайт для поиска:

```powershell
$env:INDEXING="1"
npm run build
npm run check
```

Затем закоммитьте изменения, отправьте `sitemap.xml` в Яндекс.Вебмастер
и Google Search Console. Уже проиндексированные страницы исчезают
из поиска не мгновенно — обычно от нескольких дней до нескольких недель.

## Чек-лист перед запуском

- [ ] Заменить телефон, email, реквизиты и соцсети на реальные.
- [ ] Заменить демо-кейсы, метрики и отзывы.
- [ ] Проверить цифры «60+ проектов», «14 человек», «92%».
- [ ] Установить реальный домен в `tools/deploy.config.mjs` и пересобрать.
- [ ] Перегенерировать OG-картинки под новый бренд.
- [ ] Указать `leadsEndpoint` и проверить доставку заявок.
- [ ] Вписать `metrikaId`, проверить цели.
- [ ] Проверить политику конфиденциальности с юристом.
- [ ] Прогнать `npm run check`.
- [ ] Проверить Lighthouse / PageSpeed Insights на проде.
- [ ] Открыть индексацию (`INDEXING=1`) и отправить sitemap.
- [ ] Добавить сайт в Вебмастер и Search Console.
- [ ] Если есть физический офис — добавить адрес, карту и обновить JSON-LD.

## Важно

Новый сайт лежит в папке `web-studio/` и не пересекается с сайтом
по натяжным потолкам в корне репозитория. Сборка и `server.mjs` работают
только внутри `web-studio/`.
