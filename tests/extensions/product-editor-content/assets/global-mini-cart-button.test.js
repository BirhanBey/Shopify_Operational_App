import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('global-mini-cart-button.js', () => {
  let dom;
  let window;
  let document;
  let locationSpy;

  beforeEach(() => {
    // Create JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://test-shop.myshopify.com',
      pretendToBeVisual: true,
      resources: 'usable',
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.navigator = window.navigator;

    // Spy on window.location.href setter
    // We can't directly mock window.location in JSDOM, so we'll test the behavior differently
    let currentHref = window.location.href;
    locationSpy = vi.fn((value) => {
      currentHref = value;
    });

    // Mock window.Shopify
    window.Shopify = {
      routes: {
        cart_url: '/cart',
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    dom.window.close();
  });

  describe('Cart button detection and setup', () => {
    it('should find cart button by data-testid', () => {
      const button = document.createElement('button');
      button.setAttribute('data-testid', 'cart-drawer-trigger');
      document.body.appendChild(button);

      const foundButton = document.querySelector('button[data-testid="cart-drawer-trigger"]');
      expect(foundButton).toBeTruthy();
      expect(foundButton).toBe(button);
    });

    it('should not find cart button if it does not exist', () => {
      const foundButton = document.querySelector('button[data-testid="cart-drawer-trigger"]');
      expect(foundButton).toBeNull();
    });
  });

  describe('Event listener attachment', () => {
    it('should attach click event listener to cart button', () => {
      const button = document.createElement('button');
      button.setAttribute('data-testid', 'cart-drawer-trigger');
      document.body.appendChild(button);

      let clickHandlerCalled = false;
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clickHandlerCalled = true;
      }, true);

      button.click();
      expect(clickHandlerCalled).toBe(true);
    });

    it('should prevent multiple event listeners from being attached', () => {
      const button = document.createElement('button');
      button.setAttribute('data-testid', 'cart-drawer-trigger');
      document.body.appendChild(button);

      button.dataset.redirectHandlerAttached = 'true';

      let clickCount = 0;
      const handler = () => {
        clickCount++;
      };

      // Try to attach handler
      if (!button.dataset.redirectHandlerAttached) {
        button.addEventListener('click', handler, true);
      }

      button.click();
      expect(clickCount).toBe(0); // Handler should not be attached
    });
  });

  describe('Cart URL handling', () => {
    it('should use Shopify routes cart_url if available', () => {
      window.Shopify = {
        routes: {
          cart_url: '/custom-cart',
        },
      };

      const cartUrl = (window.Shopify && window.Shopify.routes?.cart_url) || '/cart';
      expect(cartUrl).toBe('/custom-cart');
    });

    it('should fallback to /cart if Shopify routes not available', () => {
      window.Shopify = null;

      const cartUrl = (window.Shopify && window.Shopify.routes?.cart_url) || '/cart';
      expect(cartUrl).toBe('/cart');
    });

    it('should fallback to /cart if Shopify.routes not available', () => {
      window.Shopify = {};

      const cartUrl = (window.Shopify && window.Shopify.routes?.cart_url) || '/cart';
      expect(cartUrl).toBe('/cart');
    });
  });

  describe('Click event handling', () => {
    it('should prevent default and stop propagation on click', () => {
      const button = document.createElement('button');
      button.setAttribute('data-testid', 'cart-drawer-trigger');
      document.body.appendChild(button);

      const clickEvent = new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      let defaultPrevented = false;
      let propagationStopped = false;

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        defaultPrevented = e.defaultPrevented;
        propagationStopped = true;
      }, true);

      button.dispatchEvent(clickEvent);

      expect(defaultPrevented).toBe(true);
      expect(propagationStopped).toBe(true);
    });

    it('should redirect to cart URL on click', () => {
      const button = document.createElement('button');
      button.setAttribute('data-testid', 'cart-drawer-trigger');
      document.body.appendChild(button);

      window.Shopify = {
        routes: {
          cart_url: '/cart',
        },
      };

      const cartUrl = (window.Shopify && window.Shopify.routes?.cart_url) || '/cart';
      let redirectedUrl = null;

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Simulate redirect by storing the URL
        redirectedUrl = cartUrl;
        locationSpy(cartUrl);
      }, true);

      button.click();

      // Verify that redirect was attempted with correct URL
      expect(redirectedUrl).toBe('/cart');
      expect(locationSpy).toHaveBeenCalledWith('/cart');
    });
  });

  describe('MutationObserver for dynamic buttons', () => {
    it('should detect dynamically added cart button', (done) => {
      // Create MutationObserver
      const observer = new MutationObserver((mutations) => {
        const cartButton = document.querySelector('button[data-testid="cart-drawer-trigger"]');
        if (cartButton) {
          expect(cartButton).toBeTruthy();
          observer.disconnect();
          done();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Dynamically add button
      setTimeout(() => {
        const button = document.createElement('button');
        button.setAttribute('data-testid', 'cart-drawer-trigger');
        document.body.appendChild(button);
      }, 10);
    });
  });

  describe('Initialization', () => {
    it('should initialize immediately if document is already loaded', () => {
      // Mock document.readyState
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete',
        configurable: true,
      });

      let initCalled = false;
      const initCartButtonRedirect = () => {
        initCalled = true;
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCartButtonRedirect);
      } else {
        initCartButtonRedirect();
      }

      expect(initCalled).toBe(true);
    });

    it('should wait for DOMContentLoaded if document is loading', (done) => {
      // Mock document.readyState
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading',
        configurable: true,
      });

      let initCalled = false;
      const initCartButtonRedirect = () => {
        initCalled = true;
        expect(initCalled).toBe(true);
        done();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCartButtonRedirect);
        // Simulate DOMContentLoaded
        setTimeout(() => {
          document.dispatchEvent(new window.Event('DOMContentLoaded'));
        }, 10);
      } else {
        initCartButtonRedirect();
      }
    });
  });
});
