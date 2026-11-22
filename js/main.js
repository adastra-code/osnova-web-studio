(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const config = window.SITE_CONFIG || {};
  const endpoint = String(config.leadsEndpoint || "").trim();
  const metrikaId = String(config.metrikaId || "").trim();
  const fallbackEmail = String(config.email || "hello@osnova.studio");

  /* ------------------------------------------------------------ analytics */

  const reachGoal = (goal) => {
    if (metrikaId && typeof window.ym === "function") {
      window.ym(metrikaId, "reachGoal", goal);
    }
  };

  if (metrikaId) {
    window.ym =
      window.ym ||
      function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
    window.ym.l = Date.now();
    window.ym(metrikaId, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.appendChild(script);
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (href.startsWith("tel:")) reachGoal("phone_click");
    if (href.startsWith("mailto:")) reachGoal("email_click");
    if (href.includes("t.me/")) reachGoal("telegram_click");
  });

  /* --------------------------------------------------------------- header */

  const header = $("[data-header]");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------- mobile menu */

  const burger = $("[data-burger]");
  const nav = $("#nav");

  if (burger && nav) {
    const setOpen = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      document.querySelector("main")?.toggleAttribute("inert", open);
      document.querySelector(".footer")?.toggleAttribute("inert", open);
      if (open) {
        requestAnimationFrame(() => nav.querySelector("a")?.focus());
      }
    };

    burger.addEventListener("click", () => {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });

    $$("a", nav).forEach((link) => link.addEventListener("click", () => setOpen(false)));

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        burger.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 960 && nav.classList.contains("is-open")) setOpen(false);
    });
  }

  /* ---------------------------------------------------------------- forms */

  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  const isPhone = (value) => /^[+()\d\s-]{10,20}$/.test(value) && value.replace(/\D/g, "").length >= 10;

  const setFieldError = (input, message) => {
    const field = input.closest(".field");
    if (!field) return;
    field.classList.toggle("has-error", Boolean(message));
    const error = $(".field__error", field);
    if (error) error.textContent = message || "";
  };

  const validate = (form) => {
    let valid = true;
    const name = form.elements.name;
    const contact = form.elements.contact;
    const consent = form.elements.consent;

    if (!name.value.trim() || name.value.trim().length < 2) {
      setFieldError(name, "Укажите имя — хотя бы 2 символа");
      valid = false;
    } else {
      setFieldError(name, "");
    }

    const contactValue = contact.value.trim();
    if (!contactValue || (!isEmail(contactValue) && !isPhone(contactValue))) {
      setFieldError(contact, "Укажите телефон или email");
      valid = false;
    } else {
      setFieldError(contact, "");
    }

    const consentError = $(".field__error--consent", form);
    if (consent && !consent.checked) {
      if (consentError) consentError.textContent = "Нужно согласие на обработку данных";
      valid = false;
    } else if (consentError) {
      consentError.textContent = "";
    }

    return valid;
  };

  const buildMailto = (payload) => {
    const subject = `Заявка с сайта: ${payload.name}`;
    const body = [
      `Имя: ${payload.name}`,
      `Контакт: ${payload.contact}`,
      `Задача: ${payload.task || "не указана"}`,
      `Страница: ${payload.page}`,
      `Время: ${payload.sentAt}`,
    ].join("\n");
    return `mailto:${fallbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  $$("form[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = $(".form-status", form);
      const button = $('button[type="submit"]', form);

      if (!validate(form)) {
        const firstError = $(".has-error input, .has-error textarea", form);
        firstError?.focus();
        if (status) {
          status.textContent = "Проверьте обязательные поля.";
          status.className = "form-status is-error";
        }
        return;
      }

      const payload = {
        name: form.elements.name.value.trim(),
        contact: form.elements.contact.value.trim(),
        task: (form.elements.task?.value || "").trim(),
        page: window.location.href,
        referrer: document.referrer || "",
        sentAt: new Date().toISOString(),
      };

      const originalLabel = button?.innerHTML;
      if (button) {
        button.disabled = true;
        button.textContent = "Отправляем…";
      }
      if (status) {
        status.textContent = "";
        status.className = "form-status";
      }

      try {
        if (endpoint) {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          reachGoal("form_submit");
          form.reset();
          if (status) {
            status.textContent = "Заявка отправлена. Ответим в течение рабочего дня.";
            status.className = "form-status is-success";
          }
        } else {
          window.location.href = buildMailto(payload);
          reachGoal("form_email");
          if (status) {
            status.textContent = "Открываем почтовый клиент. Если он не открылся, напишите на " + fallbackEmail + ".";
            status.className = "form-status is-success";
          }
        }
      } catch (error) {
        if (status) {
          status.textContent =
            "Не удалось отправить заявку. Напишите на " + fallbackEmail + " или позвоните нам.";
          status.className = "form-status is-error";
        }
      } finally {
        if (button) {
          button.disabled = false;
          button.innerHTML = originalLabel;
        }
      }
    });

    $$("input, textarea", form).forEach((input) => {
      input.addEventListener("input", () => {
        if (input.closest(".field")?.classList.contains("has-error")) setFieldError(input, "");
      });
      input.addEventListener("change", () => {
        if (input.type === "checkbox") {
          const consentError = $(".field__error--consent", form);
          if (consentError && input.checked) consentError.textContent = "";
        }
      });
    });
  });

  /* --------------------------------------------------------------- misc */

  $$("details.faq-item").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      const parent = item.closest(".faq-list");
      if (!parent) return;
      $$("details.faq-item", parent).forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
})();
