"use strict";

/**
 * Global Cart Button Redirect Handler
 * Works on all pages to redirect cart drawer button to cart page
 */
(function () {
  const LOG_PREFIX = "[Global Cart Button]";

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
          
          console.log(`${LOG_PREFIX} Redirecting to cart:`, cartUrl);
          window.location.href = cartUrl;
        },
        true, // Use capture phase to intercept before other handlers
      );
      cartButton.dataset.redirectHandlerAttached = "true";
      console.log(`${LOG_PREFIX} Cart button redirect handler attached`);
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

  // Initialize on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCartButtonRedirect);
  } else {
    initCartButtonRedirect();
  }
})();
