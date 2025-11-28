"use strict";

/**
 * @typedef {Object} ShopifyWindow
 * @property {Object} [Shopify]
 * @property {string} [Shopify.shop]
 * @property {Object} [Shopify.routes]
 * @property {string} [Shopify.routes.root]
 * @property {Object} [Shopify.analytics]
 * @property {Object} [Shopify.analytics.product]
 * @property {Function} [Shopify.onVariantChange]
 */

(function () {
  const LOG_PREFIX = "[Product Page Operations]";
  const config = window.__EDITOR_PRODUCT_CONFIG__ || {};
  const appUrl = (config.appUrl || "").trim();
  /** @type {ShopifyWindow} */
  const shopifyWindow = /** @type {any} */ (window);
  const shopDomain =
    config.shop ||
    (shopifyWindow.Shopify && (shopifyWindow.Shopify.shop || shopifyWindow.Shopify?.routes?.root));

  // Removed: ADD_TO_CART_API_KEY and TEMPLATE_ID - now using API endpoint

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
    return;
  }

  if (window.__EDITOR_PRODUCT_LISTENER_READY) {
    return;
  }

  window.__EDITOR_PRODUCT_LISTENER_READY = true;

  let editorSettings = null;
  let variantInfoMap = {};

  function loadEditorSettings() {
    const url = `${appUrl.replace(/\/$/, "")}/api/editor-settings?shop=${encodeURIComponent(shopDomain || "")}`;

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
        return editorSettings;
      });
  }

  function callCreateProjectAPI(cartAddBaseUrl, { variantSku = null, templateId = null, materialId = null, projectName = null } = {}) {
    const normalizedCartUrl = cartAddBaseUrl.split("?")[0];
    const returnUrl = normalizedCartUrl;
    const apiUrl = `${appUrl.replace(/\/$/, "")}/api/create-project?shop=${encodeURIComponent(
      shopDomain || "",
    )}`;

    const payload = {
      overrides: {
        returnUrl,
      },
    };

    if (variantSku) {
      payload.overrides.sku = variantSku;
    }

    if (templateId) {
      payload.overrides.templateId = templateId;
    }

    if (materialId) {
      payload.overrides.materialId = materialId;
    }

    if (projectName) {
      payload.overrides.projectName = projectName;
    }

    return fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data.success) {
          throw new Error(data.error || data.details || "Failed to create project");
        }

        const projectId = data.projectId;
        if (!projectId) {
          throw new Error("No project ID in API response");
        }

        return { projectId };
      });
  }

  // Build cart add URL with project properties
  function buildCartAddUrl(variantId, quantity, projectId, projectReference = null) {
    const baseUrl = `https://${shopDomain}/cart/add`;
    const params = new URLSearchParams({
      id: variantId,
      quantity: quantity || "1",
      "properties[projectid]": projectId,
      return_to: "/cart",
    });
    
    // Add project reference if provided
    if (projectReference) {
      params.append("properties[project_reference]", projectReference);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  function buildEditorUrl(projectId, cartAddUrl, sku = null) {
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

    const params = new URLSearchParams({
      projectid: projectId,
      skipped: "",
      editorid: "PIE",
      lang: editorLang,
      a: apiKey,
    });

    if (sku) {
      params.append("variantSku", sku);
      params.append("sku", sku);
    }

    params.append("returnurl", cartAddUrl);

    return `${domain}/?${params.toString()}`;
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

  // Store variant metafields data
  let variantMetafieldsMap = {};

  // Load variant metafields for the current product
  function loadVariantMetafields() {
    // First, try to get from liquid template config
    const configMetafields = config.variantMetafields;
    if (configMetafields && Object.keys(configMetafields).length > 0) {
      variantMetafieldsMap = configMetafields;

      // Also populate variant info map from ShopifyAnalytics if available
      /** @type {any} */
      const shopifyAnalytics = window.ShopifyAnalytics;
      const productData = shopifyAnalytics?.meta?.product;
      if (productData && productData.variants) {
        try {
          variantInfoMap = {};
          productData.variants.forEach((variant) => {
            const variantId = String(variant.id);
            const info = {
              sku: variant.sku || null,
              title: variant.name || variant.title || null,
            };
            variantInfoMap[variantId] = info;
            variantInfoMap[`gid://shopify/ProductVariant/${variantId}`] = info;
          });
        } catch (error) {
          console.warn(`${LOG_PREFIX} [DEBUG] Failed to populate variant info map from ShopifyAnalytics:`, error);
        }
      }
      return Promise.resolve();
    }
    
    // Get product handle from URL
    const productHandle = window.location.pathname.match(/\/products\/([^/]+)/)?.[1];
    
    if (!productHandle) {
      console.warn(`${LOG_PREFIX} [DEBUG] Could not extract product handle from URL`);
      return Promise.resolve();
    }

    // Try to get product data from ShopifyAnalytics first
    /** @type {any} */
    const shopifyAnalytics = window.ShopifyAnalytics;
    const productData = shopifyAnalytics?.meta?.product;
    
    if (productData && productData.variants) {
      try {
        variantInfoMap = {};
        productData.variants.forEach((variant) => {
          const variantId = String(variant.id);
          const info = {
            sku: variant.sku || null,
            title: variant.name || variant.title || null,
          };
          variantInfoMap[variantId] = info;
          variantInfoMap[`gid://shopify/ProductVariant/${variantId}`] = info;
        });
      } catch (error) {
        console.warn(`${LOG_PREFIX} [DEBUG] Failed to populate variant info map from analytics`, error);
      }
      
      // Build variant metafields map from analytics data
      const variants = Array.isArray(productData.variants) 
        ? productData.variants 
        : Object.values(productData.variants || {});

      variants.forEach((variant) => {
        if (variant.id) {
          const metafieldValue = variant.metafields?.custom?.use_project_reference?.value;
          const useProjectReference = metafieldValue === "true" || metafieldValue === true;
          const templateId = variant.metafields?.custom?.template_id?.value || null;
          const materialId = variant.metafields?.custom?.material_id?.value || null;
          
          variantMetafieldsMap[variant.id] = {
            useProjectReference: useProjectReference,
            templateId: templateId,
            materialId: materialId,
          };
          
        }
      });
      return Promise.resolve();
    }

    // If analytics data doesn't have metafields, try API (fallback)
    const apiUrl = `${appUrl.replace(/\/$/, "")}/api/variant-metafields?shop=${encodeURIComponent(shopDomain || "")}&handle=${encodeURIComponent(productHandle)}`;

    return fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.variantMetafields) {
          variantMetafieldsMap = data.variantMetafields;
        } else {
          console.warn(`${LOG_PREFIX} [DEBUG] No variant metafields in API response, data:`, data);
        }
      })
      .catch((error) => {
        console.error(`${LOG_PREFIX} [DEBUG] Failed to load variant metafields from API:`, error);
        // Continue without metafields - input won't show but won't break
      });
  }

  // Create project reference input field
  function createProjectReferenceInput() {
    // Always create a new input container (don't reuse)
    const inputContainer = document.createElement("div");
    inputContainer.id = "project-reference-input-container";
    inputContainer.style.cssText = `
      margin-top: 1rem;
      margin-bottom: 1rem;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100%;
    `;

    const label = document.createElement("label");
    label.setAttribute("for", "project-reference-input");
    label.textContent = "Project Reference";
    label.style.cssText = `
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      visibility: visible;
    `;

    const input = document.createElement("input");
    input.type = "text";
    input.id = "project-reference-input";
    input.name = "properties[project_reference]";
    input.placeholder = "Enter project reference";
    input.style.cssText = `
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      display: block;
      visibility: visible;
      opacity: 1;
      box-sizing: border-box;
    `;

    inputContainer.appendChild(label);
    inputContainer.appendChild(input);

    return inputContainer;
  }

  // Show/hide project reference input based on selected variant
  function updateProjectReferenceInput(selectedVariantId) {
    // Try to find the correct form - look for the one with add to cart button
    let form = document.querySelector("form[action*='/cart/add'][id*='BuyButtons'], form[action*='/cart/add'].shopify-product-form");
    if (!form) {
      form = document.querySelector("form[action*='/cart/add']");
    }
    
    if (!form) {
      console.warn(`${LOG_PREFIX} [DEBUG] Cart form not found`);
      return;
    }

    // Remove existing input if present
    const existingInput = document.getElementById("project-reference-input-container");
    if (existingInput) {
      existingInput.remove();
    }

    // Check if selected variant has use_project_reference enabled
    // Try both numeric ID and GID format
    const gidFormat = selectedVariantId.includes('/') 
      ? selectedVariantId 
      : `gid://shopify/ProductVariant/${selectedVariantId}`;
    
    let variantData = variantMetafieldsMap[selectedVariantId] || variantMetafieldsMap[gidFormat];
    
    const shouldShow = variantData?.useProjectReference === true;

    if (!shouldShow) {
      return;
    }

    // Find the position to insert input (between variant form and add to cart button)
    // Try multiple selectors for add to cart button
    let addToCartButton = form.querySelector('button[name="add"]');
    if (!addToCartButton) {
      addToCartButton = form.querySelector('button[type="submit"]');
    }
    if (!addToCartButton) {
      addToCartButton = form.querySelector('.add-to-cart-button');
    }
    if (!addToCartButton) {
      addToCartButton = form.querySelector('button[id*="ProductSubmitButton"]');
    }
    if (!addToCartButton) {
      // Try to find in product-form-component
      const productFormComponent = form.closest('product-form-component');
      if (productFormComponent) {
        addToCartButton = productFormComponent.querySelector('button[name="add"], button[type="submit"]');
      }
    }

    if (addToCartButton) {
      // found add to cart button
    }

    // Try to find buy-buttons-block span (we want to insert input before it)
    let buyButtonsBlock = form.closest('.buy-buttons-block');
    if (!buyButtonsBlock) {
      // Try to find by searching from form
      const productFormComponent = form.closest('product-form-component');
      if (productFormComponent) {
        buyButtonsBlock = productFormComponent.closest('.buy-buttons-block');
      }
    }

    // Try to find quantity-selector-component (fallback option)
    let quantitySelector = form.querySelector('quantity-selector-component');
    if (!quantitySelector) {
      const productFormComponent = form.closest('product-form-component');
      if (productFormComponent) {
        quantitySelector = productFormComponent.querySelector('quantity-selector-component');
      }
    }
    if (!quantitySelector) {
      if (buyButtonsBlock) {
        quantitySelector = buyButtonsBlock.querySelector('quantity-selector-component');
      }
    }

    // Try to find product-form-buttons div (fallback option)
    let productFormButtons = form.querySelector('.product-form-buttons');
    if (!productFormButtons) {
      const productFormComponent = form.closest('product-form-component');
      if (productFormComponent) {
        productFormButtons = productFormComponent.querySelector('.product-form-buttons');
      }
    }
    if (!productFormButtons) {
      if (buyButtonsBlock) {
        productFormButtons = buyButtonsBlock.querySelector('.product-form-buttons');
      }
    }

    if (buyButtonsBlock && buyButtonsBlock.parentNode) {
      // Best option: insert before buy-buttons-block span
      const inputContainer = createProjectReferenceInput();
      buyButtonsBlock.parentNode.insertBefore(inputContainer, buyButtonsBlock);
    } else if (quantitySelector && quantitySelector.parentNode) {
      // Fallback: insert before quantity-selector-component
      const inputContainer = createProjectReferenceInput();
      quantitySelector.parentNode.insertBefore(inputContainer, quantitySelector);
    } else if (productFormButtons) {
      // Fallback: insert at the beginning of product-form-buttons div (before quantity selector and add to cart)
      const inputContainer = createProjectReferenceInput();
      productFormButtons.insertBefore(inputContainer, productFormButtons.firstChild);
    } else if (addToCartButton && addToCartButton.parentNode) {
      const inputContainer = createProjectReferenceInput();
      
      // Insert before add to cart button's parent (the span containing the button)
      const buttonParent = addToCartButton.closest('span') || addToCartButton.parentNode;
      buttonParent.parentNode.insertBefore(inputContainer, buttonParent);
      
    } else {
      console.warn(`${LOG_PREFIX} [DEBUG] Add to cart button and container not found, using form fallback`);
      // Last fallback: find product-form-component and append there, or append to form
      const productFormComponent = form.closest('product-form-component');
      if (productFormComponent) {
        const inputContainer = createProjectReferenceInput();
        // Try to insert before the form
        productFormComponent.insertBefore(inputContainer, form);
      } else {
        const inputContainer = createProjectReferenceInput();
        form.appendChild(inputContainer);
      }
    }
  }

  // Setup variant change listener
  function setupVariantChangeListener() {
    // Try to find the correct form - look for the one with add to cart button
    let form = document.querySelector("form[action*='/cart/add'][id*='BuyButtons'], form[action*='/cart/add'].shopify-product-form");
    if (!form) {
      form = document.querySelector("form[action*='/cart/add']");
    }
    
    if (!form) {
      console.warn(`${LOG_PREFIX} [DEBUG] Cart form not found for variant listener`);
      return;
    }

    // Listen for variant ID changes in the form
    const variantIdInput = form.querySelector('input[name="id"], input[name="variant_id"]');
    
    if (variantIdInput) {
      
      // Watch for changes to variant ID input
      const observer = new MutationObserver(() => {
        const currentVariantId = variantIdInput.value;
        if (currentVariantId) {
          updateProjectReferenceInput(currentVariantId);
        } else {
          // Remove input if no variant selected
            const existingInput = document.getElementById("project-reference-input-container");
            if (existingInput) {
              existingInput.remove();
            }
        }
      });

      observer.observe(variantIdInput, {
        attributes: true,
        attributeFilter: ["value"],
      });

      // Also listen for input events
      variantIdInput.addEventListener("change", () => {
        const currentVariantId = variantIdInput.value;
        if (currentVariantId) {
          updateProjectReferenceInput(currentVariantId);
        }
      });

      // Check initial value
      if (variantIdInput.value) {
        updateProjectReferenceInput(variantIdInput.value);
      }
    } else {
      console.warn(`${LOG_PREFIX} [DEBUG] Variant ID input not found in form`);
    }

    // Also listen for Shopify variant change events (if available)
    if (window.Shopify && window.Shopify.onVariantChange) {
      window.Shopify.onVariantChange = (function(original) {
        return function(variant) {
          if (original) original(variant);
          if (variant && variant.id) {
            updateProjectReferenceInput(variant.id);
          }
        };
      })(window.Shopify.onVariantChange);
    }

    // Listen for custom variant change events
    form.addEventListener("change", (event) => {
      const target = event.target;
      if (
        target.type === "radio" ||
        target.tagName === "SELECT" ||
        (target.type === "checkbox" && target.name.includes("option"))
      ) {
        // Variant option changed, wait a bit for variant ID to update
        setTimeout(() => {
          const variantIdInput = form.querySelector('input[name="id"], input[name="variant_id"]');
          if (variantIdInput && variantIdInput.value) {
            updateProjectReferenceInput(variantIdInput.value);
          } else {
            console.warn(`${LOG_PREFIX} [DEBUG] No variant ID found after option change`);
          }
        }, 100);
      }
    });
  }

  function setupAddToCartListener() {
    let isSubmitting = false;

    function processAddToCartForm(event, form) {
      if (
        !form ||
        form.tagName !== "FORM" ||
        !form.action ||
        !form.action.includes("/cart/add")
      ) {
        return false;
      }

      if (isSubmitting) {
        return true;
      }

      if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }

      const formData = new FormData(form);
      const variantId =
        formData.get("id") ||
        form.querySelector("[name='id']")?.value ||
        form.querySelector("input[name='id']")?.value;

      const quantity =
        formData.get("quantity") ||
        form.querySelector("[name='quantity']")?.value ||
        "1";

      // Get project reference if input exists (will be used later for cart properties)
      const projectReferenceInput = document.getElementById("project-reference-input");
      const projectReference = projectReferenceInput?.value?.trim() || null;

      if (!variantId) {
        alert("Error: Could not find product variant ID");
        isSubmitting = true;
        form.submit();
        return true;
      }

      const cartAddBaseUrl = `https://${shopDomain}/cart/add`;

      // Get SKU from analytics map or DOM if available
      const mappedSku =
        (variantInfoMap?.[variantId] && variantInfoMap[variantId].sku) ||
        (variantInfoMap?.[`gid://shopify/ProductVariant/${variantId}`] &&
          variantInfoMap[`gid://shopify/ProductVariant/${variantId}`].sku) ||
        null;

      const variantElement =
        form.querySelector(`[data-variant-id="${variantId}"]`) ||
        form.querySelector(`[value="${variantId}"]`);
      const domSku =
        variantElement?.dataset?.sku ||
        variantElement?.getAttribute("data-sku") ||
        null;

      const sku = mappedSku || domSku || null;

      // Get templateId and materialId from variant metafields
      const variantMetafields = variantMetafieldsMap[variantId] || variantMetafieldsMap[`gid://shopify/ProductVariant/${variantId}`] || {};
      const templateId = variantMetafields.templateId || null;
      const materialId = variantMetafields.materialId || null;

      callCreateProjectAPI(cartAddBaseUrl, { 
        variantSku: sku, 
        templateId: templateId,
        materialId: materialId,
        projectName: projectReference 
      })
        .then(({ projectId }) => {
          const cartAddUrl = buildCartAddUrl(variantId, quantity, projectId, projectReference);

          const editorUrl = buildEditorUrl(projectId, cartAddUrl, sku);

          // Show an alert with projectId, templateId, and SKU for debug purposes before redirecting
          alert(
            `Project Created!\n\nProject ID: ${projectId}\n\nSKU: ${sku || "N/A"}\n\nRedirecting to editor...`,
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

      return true;
    }

    function captureClick(event) {
      const target = event.target;
      if (!target) return;

      const button = target.closest(
        "button[name='add'], button[type='submit'], add-to-cart-component button, .product-form__submit",
      );
      if (!button) {
        return;
      }

      const form = button.closest("form[action*='/cart/add']");
      if (!form) {
        return;
      }

      const handled = processAddToCartForm(event, form);
      if (handled) {
        // Click intercepted for add to cart
      }
    }

    function captureSubmit(event) {
      const form = event.target;
      if (processAddToCartForm(event, form)) {
        // Submit intercepted for add to cart
      }
    }

    document.addEventListener("click", captureClick, true);
    document.addEventListener("submit", captureSubmit, true);
  }

  
  loadEditorSettings()
    .then(() => {
      return loadVariantMetafields();
    })
    .then(() => {
      setupVariantChangeListener();
      setupAddToCartListener();
    })
    .catch((error) => {
      console.error(`${LOG_PREFIX} [DEBUG] Failed to initialize:`, error);
    });
})();

