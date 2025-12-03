"use strict";

(function () {
  const LOG_PREFIX = "[Cart Page Operations]";
  const config = window.__EDITOR_CART_CONFIG__ || {};
  const appUrl = (config.appUrl || "").trim();
  const shopDomain =
    config.shop ||
    (window.Shopify && (window.Shopify.shop || window.Shopify?.routes?.root));
  const feeVariantIdRaw = (config.feeVariantId || "").trim();

  function normalizeVariantId(value) {
    if (!value) return null;
    const str = String(value);
    const match = str.match(/(\d+)\s*$/);
    return match ? match[1] : str;
  }

  const feeVariantId = normalizeVariantId(feeVariantIdRaw);

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

  function getCartItemKey(cartItem) {
    if (!cartItem) return null;
    return (
      cartItem.getAttribute("data-key") ||
      cartItem.getAttribute("data-cart-item-key") ||
      cartItem.dataset.key ||
      cartItem.dataset.cartItemKey ||
      null
    );
  }

  function isPersonalisationFeeCartItem(cartItem) {
    if (!cartItem) return false;

    // If we've already tagged this row, trust the tag
    if (cartItem.dataset.personalisationFee === "true") {
      return true;
    }

    // Prefer detecting by variant ID when available
    if (feeVariantId) {
      const variantSource =
        cartItem.querySelector("[data-variant-id]") ||
        cartItem.querySelector(
          "cart-quantity-selector-component[data-variant-id]",
        );

      if (variantSource) {
        const rawId =
          variantSource.getAttribute("data-variant-id") ||
          variantSource.dataset.variantId ||
          "";
        const match = String(rawId).match(/(\d+)\s*$/);
        const variantIdStr = match ? match[1] : rawId;

        if (variantIdStr === feeVariantId) {
          cartItem.dataset.personalisationFee = "true";
          return true;
        }
      }
    }

    // Fallback: text-based detection (kept as a safety net)
    const headerCell =
      cartItem.querySelector(
        ".cart-item__details, .cart-items__details, .cart__info, td[headers='productInformation']",
      ) || cartItem;
    const text = (headerCell.textContent || "").toLowerCase();
    const isFee = text.includes("personalisation fee");
    if (isFee) {
      cartItem.dataset.personalisationFee = "true";
    }
    return isFee;
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

  function updatePersonalisationFeeProperties(projectId, breakdown) {
    if (!projectId) return;
    if (!Array.isArray(breakdown) || breakdown.length === 0) {
      return;
    }

    const allCartItems = document.querySelectorAll(
      ".cart-item, .cart__item, [data-cart-item], .line-item, tr.cart-items__table-row",
    );

    allCartItems.forEach((item) => {
      // Only touch Personalisation fee rows
      if (!isPersonalisationFeeCartItem(item)) {
        return;
      }

      const itemProjectId = getProjectIdFromCartItem(item);
      if (itemProjectId !== projectId) {
        return;
      }

      const quantityCell = item.querySelector("td.cart-items__quantity");
      if (!quantityCell) {
        return;
      }

      // Clear quantity cell content (quantity selector already removed earlier)
      quantityCell.innerHTML = "";

      const container = document.createElement("div");
      container.className = "editor-price-breakdowns";

      const titleEl = document.createElement("div");
      titleEl.textContent = "Price Breakdowns";
      titleEl.style.fontWeight = "bold";
      titleEl.style.marginBottom = "4px";
      container.appendChild(titleEl);

      breakdown.forEach((entry) => {
        if (!entry) return;

        const desc =
          entry.desc ||
          entry.description ||
          entry.label ||
          "";

        const priceTotalRaw =
          entry.pricetotal ?? entry.priceTotal ?? entry.total ?? null;

        const lineDiv = document.createElement("div");
        lineDiv.className = "editor-price-breakdowns__line";

        let formattedValue = "";
        if (priceTotalRaw !== null && priceTotalRaw !== undefined) {
          const numeric = Number(priceTotalRaw);
          if (!Number.isNaN(numeric)) {
            formattedValue = numeric.toFixed(2); // max 2 decimals
          } else {
            formattedValue = String(priceTotalRaw);
          }
        }

        lineDiv.textContent = formattedValue
          ? `${desc}: ${formattedValue}`
          : desc;

        container.appendChild(lineDiv);
      });

      quantityCell.appendChild(container);
    });
  }

  function applyProjectNameToAllCartItems(projectId, projectName) {
    if (!projectId || !projectName) {
      return;
    }

    const allCartItems = document.querySelectorAll(
      ".cart-item, .cart__item, [data-cart-item], .line-item, tr.cart-items__table-row",
    );

    allCartItems.forEach((item) => {
      const itemProjectId = getProjectIdFromCartItem(item);
      if (itemProjectId !== projectId) {
        return;
      }
      applyProjectNameToCartItem(item, projectId, projectName);
    });
  }
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
  const projectDetailsRequestCache = {};

  let cartStatePromise = null;

  function resetCartState() {
    cartStatePromise = null;
  }

  function fetchCartState() {
    if (cartStatePromise) {
      return cartStatePromise;
    }

    cartStatePromise = fetch("/cart.js")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.warn(
          `${LOG_PREFIX} [FEE] Failed to load cart.js state`,
          error,
        );
        cartStatePromise = null;
        return null;
      });

    return cartStatePromise;
  }

  function logFeeDeltaForProject(projectId, projectTotalPrice) {
    if (!projectId || projectTotalPrice == null) {
      return;
    }

    return fetchCartState()
      .then((cartState) => {
        if (!cartState || !Array.isArray(cartState.items)) {
          return;
        }

        const mainItem = cartState.items.find((item) => {
          const props = item.properties || {};
          return (
            props.projectid === projectId &&
            props.is_personalisation_fee !== "true"
          );
        });

        if (!mainItem) {
          console.warn(
            `${LOG_PREFIX} [FEE] No main line item found in cart.js for project`,
            { projectId },
          );
          return;
        }

        const linePriceCents =
          typeof mainItem.final_line_price === "number"
            ? mainItem.final_line_price
            : mainItem.line_price;

        let editorPriceCents = null;
        const numeric = parseFloat(
          String(projectTotalPrice).replace(/\s/g, "").replace(",", "."),
        );
        if (!Number.isNaN(numeric)) {
          editorPriceCents = Math.round(numeric * 100);
        }

        if (editorPriceCents == null || typeof linePriceCents !== "number") {
          console.warn(
            `${LOG_PREFIX} [FEE] Could not compute fee delta for project`,
            {
              projectId,
              projectTotalPrice,
              linePriceCents,
            },
          );
          return;
        }

        const deltaInCents = editorPriceCents - linePriceCents;

        const existing = projectDetailsCache[projectId] || {};

        const isSameAsLast =
          existing.editorTotalPriceCents === editorPriceCents &&
          existing.shopifyLinePriceCents === linePriceCents &&
          existing.deltaInCents === deltaInCents;

        if (!isSameAsLast) {
          console.log(`${LOG_PREFIX} [FEE] Fee delta for project`, {
            projectId,
            editorTotalPriceCents: editorPriceCents,
            shopifyLinePriceCents: linePriceCents,
            deltaInCents,
          });
        }

        projectDetailsCache[projectId] = {
          ...existing,
          editorTotalPriceCents: editorPriceCents,
          shopifyLinePriceCents: linePriceCents,
          deltaInCents,
        };

        syncPersonalisationFeeLine(projectId, cartState);
      })
      .catch((error) => {
        console.warn(
          `${LOG_PREFIX} [FEE] Failed to log fee delta for project`,
          {
            projectId,
            error,
          },
        );
      });
  }

  function syncPersonalisationFeeLine(projectId, cartState) {
    if (!feeVariantId) {
      return;
    }
    if (!cartState || !Array.isArray(cartState.items)) {
      return;
    }

    const cache = projectDetailsCache[projectId];
    if (!cache || typeof cache.deltaInCents !== "number") {
      return;
    }

    const { deltaInCents, editorTotalPriceCents, shopifyLinePriceCents } =
      cache;

    const feeItem = cartState.items.find((item) => {
      const props = item.properties || {};
      return (
        String(item.variant_id) === feeVariantId &&
        props.is_personalisation_fee === "true" &&
        props.projectid === projectId
      );
    });

    // If delta <= 0, remove any existing fee line
    if (deltaInCents <= 0) {
      if (!feeItem) {
        return;
      }

      console.log(`${LOG_PREFIX} [FEE] Removing fee line for project`, {
        projectId,
        lineKey: feeItem.key,
        deltaInCents,
      });

      fetch("/cart/change.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: feeItem.key,
          quantity: 0,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
        .then(() => {
          // Theme usually re-renders cart; no extra action
        })
        .catch((error) => {
          console.warn(
            `${LOG_PREFIX} [FEE] Failed to remove fee line for project`,
            {
              projectId,
              error,
            },
          );
        });

      return;
    }

    const desiredQuantity = deltaInCents;

    if (feeItem && feeItem.quantity === desiredQuantity) {
      // Already in sync
      return;
    }

    const payload = {
      id: feeVariantId,
      quantity: desiredQuantity,
      properties: {
        is_personalisation_fee: "true",
        projectid: projectId,
        editor_total_price_cents: String(editorTotalPriceCents),
        shopify_line_price_cents: String(shopifyLinePriceCents),
      },
    };

    if (!feeItem) {
      console.log(`${LOG_PREFIX} [FEE] Adding fee line for project`, {
        projectId,
        payload,
      });

      fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [payload],
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
        .then(() => {
          // Reload once so Shopify renders the new fee line in the cart table
          window.location.reload();
        })
        .catch((error) => {
          console.warn(
            `${LOG_PREFIX} [FEE] Failed to add fee line for project`,
            {
              projectId,
              error,
            },
          );
        });
    } else {
      console.log(`${LOG_PREFIX} [FEE] Updating fee line for project`, {
        projectId,
        lineKey: feeItem.key,
        previousQuantity: feeItem.quantity,
        desiredQuantity,
      });

      fetch("/cart/change.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: feeItem.key,
          quantity: desiredQuantity,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
        .then(() => {
          // Reload once so Shopify renders the updated fee line quantity
          window.location.reload();
        })
        .catch((error) => {
          console.warn(
            `${LOG_PREFIX} [FEE] Failed to update fee line for project`,
            {
              projectId,
              error,
            },
          );
        });
    }
  }

  function attachMainLineRemoveHandler(cartItem, projectId) {
    const removeButton = cartItem.querySelector(".cart-items__remove");
    if (!removeButton) {
      return;
    }

    if (removeButton.dataset.editorRemoveAttached === "true") {
      return;
    }
    removeButton.dataset.editorRemoveAttached = "true";

    removeButton.addEventListener("click", (event) => {
      // Only intercept for main lines (not personalisation fee)
      if (!projectId || isPersonalisationFeeCartItem(cartItem)) {
        return;
      }

      const mainLineKey = getCartItemKey(cartItem);
      if (!mainLineKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      fetchCartState()
        .then((cartState) => {
          if (!cartState || !Array.isArray(cartState.items)) {
            throw new Error("No cart state available");
          }

          // Look for related fee line for this project
          const feeItem = cartState.items.find((item) => {
            const props = item.properties || {};
            if (
              props.projectid !== projectId ||
              props.is_personalisation_fee !== "true"
            ) {
              return false;
            }
            if (!feeVariantId) {
              return true;
            }
            const variantIdStr = String(item.variant_id || "");
            return variantIdStr === feeVariantId;
          });

          const removeMainLine = () =>
            fetch("/cart/change.js", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: mainLineKey,
                quantity: 0,
              }),
            }).then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              return response.json();
            });

          if (!feeItem || !feeItem.key) {
            // Just remove main line
            return removeMainLine();
          }

          // First remove fee line, then main line
          return fetch("/cart/change.js", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: feeItem.key,
              quantity: 0,
            }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              return response.json();
            })
            .then(() => removeMainLine());
        })
        .then(() => {
          // Refresh cart once both deletions are applied
          window.location.reload();
        })
        .catch((error) => {
          console.warn(
            `${LOG_PREFIX} [FEE] Custom remove (main + fee) failed`,
            {
              projectId,
              error,
            },
          );
          // Fallback: let Shopify handle the click normally
          removeButton.dataset.editorRemoveAttached = "false";
          removeButton.click();
        });
    });
  }

  function cleanupOrphanPersonalisationFeeLines(cartState) {
    if (!feeVariantId) {
      return;
    }
    if (!cartState || !Array.isArray(cartState.items)) {
      return;
    }

    const mainProjectIds = new Set();
    /** @type {{key: string, projectId: string}[]} */
    const feeLines = [];

    cartState.items.forEach((item) => {
      const props = item.properties || {};
      const projectId = props.projectid;
      if (!projectId) {
        return;
      }

      if (props.is_personalisation_fee === "true") {
        if (item.key) {
          feeLines.push({ key: item.key, projectId });
        }
      } else {
        mainProjectIds.add(projectId);
      }
    });

    feeLines.forEach(({ key, projectId }) => {
      if (mainProjectIds.has(projectId)) {
        return;
      }

      console.log(
        `${LOG_PREFIX} [FEE] Removing orphan personalisation fee line`,
        {
          projectId,
          lineKey: key,
        },
      );

      fetch("/cart/change.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: key,
          quantity: 0,
        }),
      }).catch((error) => {
        console.warn(
          `${LOG_PREFIX} [FEE] Failed to remove orphan personalisation fee line`,
          {
            projectId,
            lineKey: key,
            error,
          },
        );
      });
    });
  }

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

      applyProjectNameToAllCartItems(projectId, cached.projectName);

      // Re-apply UI customisations for cached data on all fee rows
      if (
        cached.breakdown &&
        Array.isArray(cached.breakdown) &&
        cached.breakdown.length > 0
      ) {
        updatePersonalisationFeeProperties(projectId, cached.breakdown);
        hideProjectQuantityInputForProject(projectId);
      }

      // Recompute and sync fee line in case quantities/prices changed
      if (cached.totalPrice != null) {
        logFeeDeltaForProject(projectId, cached.totalPrice);
      }

      return;
    }

    if (projectDetailsRequestCache[projectId]) {
      // Request already in-flight for this project; results will be cached and
      // applied on subsequent passes via projectDetailsCache.
      return;
    }

    console.log(
      `${LOG_PREFIX} [DEBUG] Fetching project details for cart item`,
      { projectId },
    );

    const detailsUrl = `${appUrl}/api/project-details?projectid=${encodeURIComponent(
      projectId,
    )}&shop=${encodeURIComponent(shopDomain || "")}`;

    projectDetailsRequestCache[projectId] = fetch(detailsUrl)
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
        const projectResult = project && project.result ? project.result : null;
        const projectTotalPrice =
          projectResult &&
          Object.prototype.hasOwnProperty.call(projectResult, "totalprice")
            ? projectResult.totalprice
            : null;
        const breakdown =
          (projectResult &&
            (projectResult.breakdown || projectResult.Breakdown)) ||
          [];
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
          breakdown,
        };
        applyProjectNameToAllCartItems(projectId, projectName);

        // Always adjust properties for Personalisation fee lines (function
        // itself filters only fee rows for this project)
        if (breakdown.length > 0) {
          updatePersonalisationFeeProperties(projectId, breakdown);
          hideProjectQuantityInputForProject(projectId);
        }

        // Compute and sync fee line for this project
        logFeeDeltaForProject(projectId, projectTotalPrice);
      })
      .catch((error) => {
        console.warn(
          `${LOG_PREFIX} Failed to load project details for validation`,
          {
            projectId,
            error,
          },
        );
      })
      .finally(() => {
        delete projectDetailsRequestCache[projectId];
      });
  }

  function fetchAndReplaceThumbnail(cartItem, projectId) {
    const img = findThumbnailElement(cartItem);
    if (img && img.dataset.projectThumbnail === "true") {
      return;
    }

    if (img) {
      img.style.opacity = "0.6";
    }

    const apiUrl = `${appUrl}/api/project-thumbnail?projectid=${encodeURIComponent(
      projectId,
    )}&shop=${encodeURIComponent(shopDomain || "")}`;

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.success && data.thumbnail) {
          const thumbnailSrc = data.thumbnail;

          // Aynı projectId'ye sahip TÜM satırların ürün görsellerini güncelle
          const allCartItems = document.querySelectorAll(
            ".cart-item, .cart__item, [data-cart-item], .line-item, tr.cart-items__table-row",
          );

          allCartItems.forEach((item) => {
            const itemProjectId = getProjectIdFromCartItem(item);
            if (itemProjectId !== projectId) {
              return;
            }

            // Ürün görseli hücresini bul
            const mediaCell =
              item.querySelector(
                'td.cart-items__media[headers="productImage"]',
              ) ||
              item.querySelector(
                ".cart-item__media, .cart-item__image, .cart__image, .cart-item__figure",
              ) ||
              item;

            let targetImg =
              mediaCell.querySelector("img") || mediaCell.querySelector("a img");

            if (!targetImg) {
              targetImg = document.createElement("img");
              targetImg.alt = "Project thumbnail";
              mediaCell.appendChild(targetImg);
            }

            targetImg.src = thumbnailSrc;
            targetImg.removeAttribute("srcset");
            targetImg.removeAttribute("sizes");
            targetImg.dataset.projectThumbnail = "true";
            targetImg.dataset.projectId = projectId;
          });

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
        if (img) {
          img.style.opacity = "1";
        }
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

  function adjustPersonalisationFeeCartItem(cartItem) {
    if (!isPersonalisationFeeCartItem(cartItem)) {
      return;
    }

    // Remove quantity selector and remove button
    const quantityCell = cartItem.querySelector("td.cart-items__quantity");
    if (quantityCell) {
      const quantitySelector = quantityCell.querySelector(
        "cart-quantity-selector-component, .quantity-selector",
      );
      if (quantitySelector) {
        // Do not remove from DOM (theme JS relies on it); just hide it visually
        quantitySelector.style.display = "none";
        quantitySelector.setAttribute("data-editor-hidden", "true");
      }

      const removeButton = quantityCell.querySelector(".cart-items__remove");
      if (removeButton) {
        // Do not remove from DOM; disable and hide it
        removeButton.style.display = "none";
        removeButton.disabled = true;
        removeButton.setAttribute("data-editor-hidden", "true");
      }
    }

    // Remove inline "$0.01" price block from details cell
    const detailsCell =
      cartItem.querySelector(
        'td.cart-items__details[headers="productInformation"]',
      ) ||
      cartItem.querySelector(
        ".cart-item__details, .cart-items__details, .cart__info",
      );
    if (detailsCell) {
      const priceLabelSpan = detailsCell.querySelector("span.visually-hidden");
      const priceWrapperDiv =
        priceLabelSpan && priceLabelSpan.closest("div");

      if (
        priceLabelSpan &&
        priceLabelSpan.textContent.trim().toLowerCase() === "price"
      ) {
        if (priceWrapperDiv) {
          priceWrapperDiv.remove();
        }
      }

      // Keep only project ID property under variants
      const variantsDl = detailsCell.querySelector("dl.cart-items__variants");
      if (variantsDl) {
        const propertyDivs =
          variantsDl.querySelectorAll(".cart-items__properties");
        propertyDivs.forEach((div) => {
          const dt = div.querySelector("dt");
          const label = (dt?.textContent || "")
            .trim()
            .toLowerCase()
            .replace(/:$/, "");
          if (label === "projectid") {
            // Optionally normalize label
            dt.textContent = "Project ID:";
          } else {
            div.remove();
          }
        });
      }
    }

    // Remove "Edit your project" button/actions
    const editorActions = cartItem.querySelector(".editor-cart-actions");
    if (editorActions) {
      editorActions.remove();
    }
  }

  function hideProjectQuantityInputForProject(projectId) {
    if (!projectId) {
      return;
    }

    const allCartItems = document.querySelectorAll(
      ".cart-item, .cart__item, [data-cart-item], .line-item, tr.cart-items__table-row",
    );

    allCartItems.forEach((cartItem) => {
      const itemProjectId = getProjectIdFromCartItem(cartItem);
      if (!itemProjectId || itemProjectId !== projectId) {
        return;
      }

      // Do not touch personalisation fee rows here; they have their own adjustments
      if (isPersonalisationFeeCartItem(cartItem)) {
        return;
      }

      const quantityCell =
        cartItem.querySelector("td.cart-items__quantity") ||
        cartItem.querySelector(".cart-items__quantity") ||
        cartItem.querySelector(".cart-item__quantity") ||
        cartItem.querySelector(".cart__quantity");

      if (!quantityCell) {
        return;
      }

      const quantitySelector =
        quantityCell.querySelector(
          "cart-quantity-selector-component, quantity-selector-component, .quantity-selector",
        ) || quantityCell.querySelector("input[name='updates[]'], input[name='quantity']");

      if (!quantitySelector) {
        return;
      }

      // Hide visually but do not remove from DOM to avoid conflicts with theme JS
      /** @type {HTMLElement} */ (quantitySelector).style.display = "none";
      quantitySelector.setAttribute("data-editor-hidden", "true");

      const quantityInput = quantitySelector.querySelector("input");
      if (quantityInput) {
        quantityInput.disabled = true;
      }

      // Restyle remove button to visually match the "Edit your project" button
      const removeButton =
        quantityCell.querySelector(".cart-items__remove") ||
        quantityCell.querySelector("button[name='remove'], button[data-cart-remove]");

      if (removeButton) {
        /** @type {HTMLElement} */ (removeButton).style.display = "inline-flex";
        Object.assign(/** @type {HTMLElement} */ (removeButton).style, {
          alignItems: "center",
          gap: "6px",
          padding: "0 60px",
          backgroundColor: "#2D2A6C",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "13px",
          textTransform: "none",
        });

        // Hide existing SVG icon and show a text label instead
        const iconSvg = removeButton.querySelector("svg");
        if (iconSvg) {
          /** @type {HTMLElement} */ (iconSvg).style.display = "none";
        }

        // Ensure a visible text label "Delete" exists
        let visibleLabel = removeButton.querySelector(
          ".editor-remove-label",
        );
        if (!visibleLabel) {
          visibleLabel = document.createElement("span");
          visibleLabel.className = "editor-remove-label";
          visibleLabel.textContent = "Delete";
          removeButton.appendChild(visibleLabel);
        } else {
          visibleLabel.textContent = "Delete";
        }
      }

      // console.log(
      //   `${LOG_PREFIX} [DEBUG] Quantity input hidden for project with breakdown`,
      //   { projectId },
      // );
    });
  }

  function groupPersonalisationFeeRows() {
    const tableBody =
      document.querySelector(".cart-items__table tbody") ||
      document.querySelector("table.cart-items__table tbody") ||
      document.querySelector("tbody");
    if (!tableBody) {
      return;
    }

    const rows = Array.from(
      tableBody.querySelectorAll(
        "tr.cart-items__table-row, tr.cart-item, tr[data-cart-item-key]",
      ),
    );
    if (!rows.length) {
      return;
    }

    /** @type {Map<string, HTMLElement[]>} */
    const mainRowsByProject = new Map();
    /** @type {{row: HTMLElement, projectId: string}[]} */
    const feeRows = [];

    rows.forEach((row) => {
      const projectId = getProjectIdFromCartItem(row);
      if (!projectId) {
        return;
      }

      if (isPersonalisationFeeCartItem(row)) {
        feeRows.push({ row, projectId });
      } else {
        if (!mainRowsByProject.has(projectId)) {
          mainRowsByProject.set(projectId, []);
        }
        mainRowsByProject.get(projectId).push(row);
      }
    });

    feeRows.forEach(({ row, projectId }) => {
      const mainRows = mainRowsByProject.get(projectId);
      if (!mainRows || mainRows.length === 0) {
        return;
      }

      const anchorRow = mainRows[mainRows.length - 1];

      // Eğer zaten anchorRow'un hemen altındaysa, dokunma
      if (anchorRow.nextElementSibling === row) {
        return;
      }

      tableBody.insertBefore(row, anchorRow.nextSibling);
    });
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

    /** @type {Map<string, HTMLElement>} */
    const primaryCartItemByProjectId = new Map();

    cartItems.forEach((cartItem) => {
      const projectId = getProjectIdFromCartItem(cartItem);
      if (!projectId) {
        return;
      }

      // Cache projectId on the row so we don't lose it when properties change
      cartItem.setAttribute("data-project-id", projectId);

      const isFee = isPersonalisationFeeCartItem(cartItem);

      // Track a primary cart item per projectId (prefer non-fee rows)
      const existingPrimary = primaryCartItemByProjectId.get(projectId);
      if (!existingPrimary) {
        primaryCartItemByProjectId.set(projectId, cartItem);
      } else if (
        isFee &&
        !isPersonalisationFeeCartItem(existingPrimary)
      ) {
        // keep existing primary (non-fee) if current is fee
      } else if (
        !isFee &&
        isPersonalisationFeeCartItem(existingPrimary)
      ) {
        // replace primary if previous was fee but this is non-fee
        primaryCartItemByProjectId.set(projectId, cartItem);
      }

      fetchAndReplaceThumbnail(cartItem, projectId);

      if (isFee) {
        adjustPersonalisationFeeCartItem(cartItem);
      } else {
        ensureEditButton(cartItem, projectId);
        attachMainLineRemoveHandler(cartItem, projectId);
      }
    });

    // Fetch and apply project details once per projectId (avoids duplicate logs and requests)
    primaryCartItemByProjectId.forEach((primaryItem, projectId) => {
      fetchAndApplyProjectDetails(primaryItem, projectId);
    });

    // Ensure personalisation fee rows appear directly under their main project rows
    groupPersonalisationFeeRows();

    // Remove any orphan personalisation fee lines whose main project has been deleted
    fetchCartState()
      .then((cartState) => {
        cleanupOrphanPersonalisationFeeLines(cartState);
      })
      .catch(() => {});
  }

  let cartMutationTimeout = null;

  function observeCartChanges() {
    const targets = [
      document.querySelector(".cart"),
      document.querySelector("#cart"),
      document.body,
    ].filter(Boolean);

    targets.forEach((target) => {
      const observer = new MutationObserver((mutations) => {
        if (!mutations.some((mutation) => mutation.type === "childList")) {
          return;
        }

        if (cartMutationTimeout) {
          clearTimeout(cartMutationTimeout);
        }

        cartMutationTimeout = setTimeout(() => {
          resetCartState();
          processCartItems();
        }, 50);
      });

      observer.observe(target, { childList: true, subtree: true });
    });
  }

  function init() {
    loadEditorSettings().catch(() => {
      // handled per button
    });
    processCartItems();
    document.addEventListener("cart:updated", () => {
      resetCartState();
      processCartItems();
    });
    document.addEventListener("cart:refresh", () => {
      resetCartState();
      processCartItems();
    });
    observeCartChanges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

