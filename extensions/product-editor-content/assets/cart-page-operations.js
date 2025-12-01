"use strict";

(function () {
  const LOG_PREFIX = "[Cart Page Operations]";
  const config = window.__EDITOR_CART_CONFIG__ || {};
  const appUrl = (config.appUrl || "").trim();
  const shopDomain =
    config.shop ||
    (window.Shopify && (window.Shopify.shop || window.Shopify?.routes?.root));

  const EDIT_BUTTON_CLASS = "editor-cart-edit-button";
  const EDIT_BUTTON_LABEL = "Edit your project";

  let settingsPromise = null;
  let cachedSettings = null;

  if (!appUrl) {
    console.warn(
      `${LOG_PREFIX} Missing appUrl. Please set App URL in App Embed settings.`,
    );
    return;
  }

  const isCartPage = window.location.pathname.includes("/cart");

  // Setup cart button redirect (works on all pages)
  function setupCartButtonRedirect() {
    const cartButton = document.querySelector(
      'button[data-testid="cart-drawer-trigger"]',
    );
    if (cartButton && !cartButton.dataset.redirectHandlerAttached) {
      cartButton.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          // Get cart URL from Shopify routes if available
          const cartUrl =
            (window.Shopify && window.Shopify.routes?.cart_url) || "/cart";
          window.location.href = cartUrl;
        },
        true, // Use capture phase to intercept before other handlers
      );
      cartButton.dataset.redirectHandlerAttached = "true";
    }
  }

  // Setup cart button redirect on all pages
  function initCartButtonRedirect() {
    setupCartButtonRedirect();

    // Also observe for dynamically added cart buttons
    const observer = new MutationObserver(() => {
      setupCartButtonRedirect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCartButtonRedirect);
  } else {
    initCartButtonRedirect();
  }

  // Only process cart items on cart page
  if (!isCartPage) {
    return;
  }

  function loadEditorSettings() {
    if (cachedSettings) {
      return Promise.resolve(cachedSettings);
    }
    if (!settingsPromise) {
      const settingsUrl = `${appUrl}/api/editor-settings?shop=${encodeURIComponent(shopDomain || "")}`;
      settingsPromise = fetch(settingsUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          cachedSettings = data?.settings || null;
          if (!cachedSettings) {
            throw new Error("Missing editor settings in response");
          }
          return cachedSettings;
        })
        .catch((error) => {
          console.error(`${LOG_PREFIX} Failed to load editor settings`, error);
          settingsPromise = null;
          throw error;
        });
    }
    return settingsPromise;
  }

  function buildEditorUrl(projectId, settings) {
    if (!settings || !settings.editorDomain || !settings.editorApiKey) {
      throw new Error("Editor domain or API key not configured");
    }
    const domain = settings.editorDomain.replace(/\/$/, "");
    const apiKey = settings.editorApiKey;
    const lang =
      (navigator.language && navigator.language.split("-")[0]) || "en";
    const returnUrl = `${window.location.origin}/cart`;
    return `${domain}/?projectid=${encodeURIComponent(projectId)}&lang=${encodeURIComponent(lang)}&a=${encodeURIComponent(apiKey)}&skipped=true&returnurl=${encodeURIComponent(returnUrl)}`;
  }

  function redirectToEditor(url) {
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} Unable to access window.top`, error);
      window.location.href = url;
    }
  }

  function getProjectIdFromCartItem(cartItem) {
    if (!cartItem) return null;

    const attrValue = cartItem.getAttribute("data-project-id");
    if (attrValue) return attrValue;

    const attrEl = cartItem.querySelector("[data-project-id]");
    if (attrEl) return attrEl.getAttribute("data-project-id");

    const propertiesContainer = cartItem.querySelector(
      ".cart-item__properties, .product-properties, [class*='properties']",
    );
    if (propertiesContainer) {
      const dtElements = propertiesContainer.querySelectorAll("dt");
      for (const dt of dtElements) {
        if (dt.textContent.trim().toLowerCase() === "projectid") {
          const dd = dt.nextElementSibling;
          if (dd && dd.tagName === "DD") {
            const value = dd.textContent.trim();
            if (value) return value;
          }
        }
      }

      const propertyElements = propertiesContainer.querySelectorAll(
        "[class*='property']",
      );
      for (const prop of propertyElements) {
        const text = prop.textContent || "";
        const match = text.match(/projectid[:\s]+([^\s\n<]+)/i);
        if (match && match[1]) return match[1].trim();
      }
    }

    const itemText = cartItem.textContent || "";
    const projectIdMatch = itemText.match(/projectid[:\s]+([^\s\n<]+)/i);
    if (projectIdMatch && projectIdMatch[1]) return projectIdMatch[1].trim();

    const links = cartItem.querySelectorAll(
      "a[href*='projectid'], button[onclick*='projectid']",
    );
    for (const link of links) {
      const source =
        link.getAttribute("href") || link.getAttribute("onclick") || "";
      const match = source.match(/projectid[=:]([^&\s"']+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }

    return null;
  }

  const thumbnailSelectors = [
    "img.cart-item__image",
    "img.cart__image",
    ".cart-item__image img",
    ".cart__image img",
    "a.cart-item__image img",
    "a.cart__image img",
    ".product-image img",
    "img[src*='products']",
    "img[data-cart-item-image]",
    // Additional common selectors
    ".cart-item img",
    ".cart__item img",
    "[data-cart-item] img",
    ".line-item img",
    ".cart-line-item img",
    ".cart-item__media img",
    ".cart-item__figure img",
    "picture img",
    "img[alt*='product']",
    "img[alt*='Product']",
  ];

  function findThumbnailElement(cartItem) {
    // Try specific selectors first
    for (const selector of thumbnailSelectors) {
      const img = cartItem.querySelector(selector);
      if (img) {
        return img;
      }
    }

    // Fallback: find any img element within the cart item
    // but exclude icons, logos, and very small images
    const allImages = cartItem.querySelectorAll("img");
    for (const img of allImages) {
      // Skip very small images (likely icons)
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      if (width < 20 || height < 20) continue;

      // Skip images that are likely icons/logos
      const src = img.src || "";
      const alt = (img.alt || "").toLowerCase();
      if (
        src.includes("icon") ||
        src.includes("logo") ||
        alt.includes("icon") ||
        alt.includes("logo")
      ) {
        continue;
      }

      return img;
    }

    // Last resort: log the cart item structure for debugging
    console.warn(
      `${LOG_PREFIX} No thumbnail found, cart item structure:`,
      {
        projectId: getProjectIdFromCartItem(cartItem),
        className: cartItem.className,
        innerHTML: cartItem.innerHTML.substring(0, 500),
      },
    );
    return null;
  }

  const loggedProjects = new Set();
  const projectDetailsCache = {};

  function applyProjectNameToCartItem(cartItem, projectId, projectName) {
    if (!cartItem || !projectName) {
      return;
    }

    const variantsContainer = cartItem.querySelector(".cart-items__variants");
    if (!variantsContainer) {
      return;
    }

    if (variantsContainer.dataset.projectNameAttached === "true") {
      return;
    }

    const wrapper = document.createElement("div");

    const dt = document.createElement("dt");
    dt.textContent = "Project name:";
    dt.style.fontWeight = "bold";

    const dd = document.createElement("dd");
    dd.textContent = projectName;
    dd.style.fontStyle = "Italic";
    dd.style.textDecoration = "underline";
    dd.style.textUnderlineColor = "#2D2A6C";
    dd.style.marginBottom = "5px";


    wrapper.appendChild(dt);
    wrapper.appendChild(dd);

    if (variantsContainer.firstChild) {
      variantsContainer.insertBefore(wrapper, variantsContainer.firstChild);
    } else {
      variantsContainer.appendChild(wrapper);
    }

    variantsContainer.dataset.projectNameAttached = "true";
  }

  function fetchAndApplyProjectDetails(cartItem, projectId) {
    if (!cartItem || !projectId) {
      return;
    }

    if (projectDetailsCache[projectId]) {
      const cached = projectDetailsCache[projectId];
      applyProjectNameToCartItem(cartItem, projectId, cached.projectName);
      // Price is kept in cache (cached.totalPrice) for future use but not applied to DOM here
      return;
    }

    const detailsUrl = `${appUrl}/api/project-details?projectid=${encodeURIComponent(
      projectId,
    )}&shop=${encodeURIComponent(shopDomain || "")}`;

    fetch(detailsUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data || !data.success || !data.project) {
          console.warn(
            `${LOG_PREFIX} [VALIDATION] Invalid project details response`,
            data,
          );
          return;
        }

        const project = data.project;
        const projectTotalPrice =
          project &&
          project.result &&
          Object.prototype.hasOwnProperty.call(project.result, "totalprice")
            ? project.result.totalprice
            : null;
        const projectName =
          project.name ||
          project.projectname ||
          project.title ||
          project.project_title ||
          null;

        // Validation log so we can inspect full project details (e.g. pricing)
        console.log(
          `${LOG_PREFIX} [VALIDATION] Full project details for cart item`,
          {
            projectId,
            projectName,
            projectTotalPrice,
            project,
          },
        );

        // Cache project, name and price for potential future use
        projectDetailsCache[projectId] = {
          project,
          projectName,
          totalPrice: projectTotalPrice,
        };
        applyProjectNameToCartItem(cartItem, projectId, projectName);
      })
      .catch((error) => {
        console.warn(
          `${LOG_PREFIX} Failed to load project details for validation`,
          {
            projectId,
            error,
          },
        );
      });
  }

  function fetchAndReplaceThumbnail(cartItem, projectId) {
    const img = findThumbnailElement(cartItem);
    if (!img) {
      console.warn(`${LOG_PREFIX} Thumbnail element not found`, { projectId });
      return;
    }

    if (img.dataset.projectThumbnail === "true") {
      return;
    }

    img.style.opacity = "0.6";

    const apiUrl = `${appUrl}/api/project-thumbnail?projectid=${encodeURIComponent(projectId)}&shop=${encodeURIComponent(shopDomain || "")}`;

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.success && data.thumbnail) {
          img.src = data.thumbnail;
          // Remove srcset to prevent browser from using default Shopify images
          img.removeAttribute("srcset");
          img.removeAttribute("sizes");
          img.dataset.projectThumbnail = "true";
          img.dataset.projectId = projectId;
          if (!loggedProjects.has(projectId)) {
            loggedProjects.add(projectId);
          }
        } else {
          console.warn(`${LOG_PREFIX} Invalid thumbnail data`, data);
        }
      })
      .catch((error) => {
        console.error(
          `${LOG_PREFIX} Failed to load thumbnail`,
          projectId,
          error,
        );
      })
      .finally(() => {
        img.style.opacity = "1";
      });
  }

  function ensureEditButton(cartItem, projectId) {
    if (cartItem.querySelector(`[data-editor-button-for="${projectId}"]`)) {
      return;
    }

    let actionsContainer =
      cartItem.querySelector(".editor-cart-actions") ||
      cartItem.querySelector(".cart-item__info") ||
      cartItem.querySelector(".cart-item__details") ||
      cartItem;

    const buttonWrapper = document.createElement("div");
    buttonWrapper.className = "editor-cart-actions";
    buttonWrapper.style.marginTop = "8px";

    const button = document.createElement("button");
    button.type = "button";
    button.className = EDIT_BUTTON_CLASS;
    button.dataset.editorButtonFor = projectId;
    button.textContent = EDIT_BUTTON_LABEL;
    Object.assign(button.style, {
      padding: "8px 14px",
      backgroundColor: "#2D2A6C",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "13px",
      textTransform: "none",
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Opening editor...";

      loadEditorSettings()
        .then((settings) => {
          const editorUrl = buildEditorUrl(projectId, settings);
          redirectToEditor(editorUrl);
        })
        .catch((error) => {
          console.error(
            `${LOG_PREFIX} Failed to open editor for project`,
            projectId,
            error,
          );
          alert(
            "Editor settings are not configured. Please configure them in the app admin.",
          );
        })
        .finally(() => {
          button.disabled = false;
          button.textContent = originalText;
        });
    });

    buttonWrapper.appendChild(button);
    actionsContainer.appendChild(buttonWrapper);
  }

  function processCartItems() {
    const selectors = [
      ".cart-item",
      ".cart__item",
      "[data-cart-item]",
      ".cart-item-row",
      "tr.cart-item",
      "li.cart-item",
      ".cart-items tr",
      ".line-item",
    ];

    let cartItems = [];
    for (const selector of selectors) {
      cartItems = Array.from(document.querySelectorAll(selector));
      if (cartItems.length) {
        break;
      }
    }

    if (!cartItems.length) {
      console.warn(`${LOG_PREFIX} No cart items detected`);
      return;
    }

    cartItems.forEach((cartItem) => {
      const projectId = getProjectIdFromCartItem(cartItem);
      if (projectId) {
        fetchAndReplaceThumbnail(cartItem, projectId);
        ensureEditButton(cartItem, projectId);
        fetchAndApplyProjectDetails(cartItem, projectId);
      }
    });
  }

  function observeCartChanges() {
    const targets = [
      document.querySelector(".cart"),
      document.querySelector("#cart"),
      document.body,
    ].filter(Boolean);

    targets.forEach((target) => {
      const observer = new MutationObserver((mutations) => {
        if (
          mutations.some((mutation) =>
            Array.from(mutation.addedNodes).some(
              (node) =>
                node.nodeType === 1 &&
                (node.classList?.contains("cart-item") ||
                  node.classList?.contains("cart__item") ||
                  node.querySelector?.(".cart-item, .cart__item")),
            ),
          )
        ) {
          processCartItems();
        }
      });

      observer.observe(target, { childList: true, subtree: true });
    });
  }

  function init() {
    loadEditorSettings().catch(() => {
      // handled per button
    });
    processCartItems();
    document.addEventListener("cart:updated", processCartItems);
    document.addEventListener("cart:refresh", processCartItems);
    observeCartChanges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

