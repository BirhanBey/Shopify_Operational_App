"use strict";

(function () {
  const LOG_PREFIX = "[Product Page Operations]";
  const config = window.__EDITOR_PRODUCT_CONFIG__ || {};
  const appUrl = (config.appUrl || "").trim();
  const shopDomain =
    config.shop ||
    (window.Shopify && (window.Shopify.shop || window.Shopify?.routes?.root));

  const ADD_TO_CART_API_KEY = "45FVf37q5mfOtP8XGODbDyqgcwo9XxfSib58SVHevl";
  const TEMPLATE_ID = "tpl401849";

  if (!appUrl) {
    console.warn(
      `${LOG_PREFIX} App URL missing. Please configure Product Page Operations embed.`,
    );
    return;
  }

  const isProductPage =
    window.location.pathname.includes("/products/") ||
    !!document.querySelector("form[action*='/cart/add']");

  if (!isProductPage) {
    console.debug(`${LOG_PREFIX} Not a product page. Skipping.`);
    return;
  }

  if (window.__EDITOR_PRODUCT_LISTENER_READY) {
    console.debug(`${LOG_PREFIX} Listener already initialized. Skipping.`);
    return;
  }

  window.__EDITOR_PRODUCT_LISTENER_READY = true;

  let editorSettings = null;

  function loadEditorSettings() {
    const url = `${appUrl.replace(/\/$/, "")}/api/editor-settings?shop=${encodeURIComponent(shopDomain || "")}`;

    console.debug(`${LOG_PREFIX} Loading editor settings from`, url);

    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        editorSettings = data?.settings || null;
        if (!editorSettings) {
          throw new Error("Missing editor settings");
        }
        console.info(`${LOG_PREFIX} Editor settings loaded`, editorSettings);
        return editorSettings;
      });
  }

  function callCreateProjectAPI(cartAddBaseUrl) {
    const apiUrl = `https://editor-staging.peleman.com/editor/api/createprojectAPI.php/?a=${encodeURIComponent(ADD_TO_CART_API_KEY)}&templateid=${encodeURIComponent(TEMPLATE_ID)}&returnurl=${encodeURIComponent(cartAddBaseUrl)}`;

    console.debug(`${LOG_PREFIX} Calling create project API`, apiUrl);

    return fetch(apiUrl)
      .then((response) => {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return response.json();
        }
        return response.text();
      })
      .then((data) => {
        if (typeof data === "string") {
          return data.trim();
        }
        if (typeof data === "object" && data !== null) {
          return (
            data.projectId ||
            data.projectid ||
            data.id ||
            data.project_id ||
            ""
          );
        }
        return String(data || "").trim();
      })
      .then((projectId) => {
        if (!projectId) {
          throw new Error("Unable to extract project ID from API response");
        }
        console.debug(`${LOG_PREFIX} Project created`, projectId);
        return projectId;
      });
  }

  function buildCartAddUrl(variantId, quantity, projectId) {
    const baseUrl = `https://${shopDomain}/cart/add`;
    const params = new URLSearchParams({
      id: variantId,
      quantity: quantity || "1",
      "properties[projectid]": projectId,
      return_to: "/cart",
    });
    return `${baseUrl}?${params.toString()}`;
  }

  function buildEditorUrl(projectId, cartAddUrl) {
    if (
      !editorSettings ||
      !editorSettings.editorApiKey ||
      !editorSettings.editorDomain
    ) {
      throw new Error("Editor settings are not configured");
    }

    const domain = editorSettings.editorDomain.replace(/\/$/, "");
    const apiKey = editorSettings.editorApiKey;
    const editorLang =
      (navigator.language && navigator.language.split("-")[0]) || "en";

    return `${domain}/?projectid=${encodeURIComponent(projectId)}&lang=${encodeURIComponent(editorLang)}&a=${encodeURIComponent(apiKey)}&skipped=true&returnurl=${encodeURIComponent(cartAddUrl)}`;
  }

  function redirectToEditor(editorUrl) {
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = editorUrl;
      } else {
        window.location.href = editorUrl;
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} Unable to use window.top`, error);
      window.location.href = editorUrl;
    }
  }

  function setupAddToCartListener() {
    console.debug(`${LOG_PREFIX} Setting up add to cart listeners`);

    let isSubmitting = false;

    function handleSubmit(event) {
      const form = event.target;

      if (
        !form ||
        form.tagName !== "FORM" ||
        !form.action ||
        !form.action.includes("/cart/add")
      ) {
        return;
      }

      if (isSubmitting) {
        console.debug(`${LOG_PREFIX} Already submitting, skipping`);
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const formData = new FormData(form);
      const variantId =
        formData.get("id") ||
        form.querySelector("[name='id']")?.value ||
        form.querySelector("input[name='id']")?.value;

      const quantity =
        formData.get("quantity") ||
        form.querySelector("[name='quantity']")?.value ||
        "1";

      if (!variantId) {
        alert("Error: Could not find product variant ID");
        isSubmitting = true;
        form.submit();
        return;
      }

      const cartAddBaseUrl = `https://${shopDomain}/cart/add`;

      callCreateProjectAPI(cartAddBaseUrl)
        .then((projectId) => {
          const cartAddUrl = buildCartAddUrl(variantId, quantity, projectId);
          const editorUrl = buildEditorUrl(projectId, cartAddUrl);

          alert(
            `Project Created!\n\nProject ID: ${projectId}\n\nRedirecting to editor...`,
          );
          redirectToEditor(editorUrl);
        })
        .catch((error) => {
          console.error(`${LOG_PREFIX} Error during add to cart`, error);
          alert(`API Call Failed:\n\n${error.message}`);
          isSubmitting = true;
          fetch(form.action, {
            method: form.method || "POST",
            body: new FormData(form),
          })
            .then(() => window.location.reload())
            .catch(() => form.submit());
        });
    }

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener(
      "click",
      (event) => {
        if (
          event.target &&
          ((event.target.tagName === "BUTTON" &&
            (event.target.name === "add" ||
              event.target.type === "submit")) ||
            event.target.closest("form[action*='/cart/add']"))
        ) {
          // no-op, submit handler will capture
        }
      },
      true,
    );
  }

  loadEditorSettings()
    .then(() => {
      setupAddToCartListener();
    })
    .catch((error) => {
      console.error(`${LOG_PREFIX} Failed to initialize`, error);
    });
})();

