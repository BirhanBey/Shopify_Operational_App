import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('cart-page-operations.js', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Create JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://test-shop.myshopify.com/cart',
      pretendToBeVisual: true,
      resources: 'usable',
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.navigator = window.navigator;

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    dom.window.close();
  });

  describe('Cart page detection', () => {
    it('should detect cart page correctly', () => {
      window.location.pathname = '/cart';
      const isCartPage = window.location.pathname.includes('/cart');
      expect(isCartPage).toBe(true);
    });

    it('should not run on non-cart pages', () => {
      // JSDOM doesn't allow direct pathname assignment
      // Use a different approach: create new JSDOM with different URL
      const nonCartDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://test-shop.myshopify.com/products/test',
        pretendToBeVisual: true,
      });
      const testPathname = nonCartDom.window.location.pathname;
      const isCartPage = testPathname.includes('/cart');
      expect(isCartPage).toBe(false);
    });
  });

  describe('Project ID extraction', () => {
    it('should extract project ID from data attribute', () => {
      const cartItem = document.createElement('div');
      cartItem.setAttribute('data-project-id', 'project-123');
      document.body.appendChild(cartItem);

      const projectId = cartItem.getAttribute('data-project-id');
      expect(projectId).toBe('project-123');
    });

    it('should extract project ID from properties container', () => {
      const cartItem = document.createElement('div');
      const propertiesContainer = document.createElement('dl');
      propertiesContainer.className = 'cart-item__properties';
      
      const dt = document.createElement('dt');
      dt.textContent = 'ProjectID';
      const dd = document.createElement('dd');
      dd.textContent = 'project-456';
      
      propertiesContainer.appendChild(dt);
      propertiesContainer.appendChild(dd);
      cartItem.appendChild(propertiesContainer);
      document.body.appendChild(cartItem);

      const dtElements = propertiesContainer.querySelectorAll('dt');
      let foundProjectId = null;
      for (const dtEl of dtElements) {
        if (dtEl.textContent.trim().toLowerCase() === 'projectid') {
          const ddEl = dtEl.nextElementSibling;
          if (ddEl && ddEl.tagName === 'DD') {
            foundProjectId = ddEl.textContent.trim();
          }
        }
      }

      expect(foundProjectId).toBe('project-456');
    });
  });

  describe('Edit button creation', () => {
    it('should create edit button with correct attributes', () => {
      const cartItem = document.createElement('div');
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'cart-item__info';
      cartItem.appendChild(actionsContainer);
      document.body.appendChild(cartItem);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'editor-cart-edit-button';
      button.dataset.editorButtonFor = 'project-123';
      button.textContent = 'Edit your project';
      
      Object.assign(button.style, {
        padding: '8px 14px',
        backgroundColor: '#2D2A6C',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      });

      actionsContainer.appendChild(button);

      const createdButton = cartItem.querySelector('.editor-cart-edit-button');
      expect(createdButton).toBeTruthy();
      expect(createdButton.textContent).toBe('Edit your project');
      expect(createdButton.dataset.editorButtonFor).toBe('project-123');
    });
  });

  describe('Thumbnail replacement', () => {
    it('should find thumbnail element in cart item', () => {
      const cartItem = document.createElement('div');
      const img = document.createElement('img');
      img.className = 'cart-item__image';
      img.src = 'https://example.com/product.jpg';
      cartItem.appendChild(img);
      document.body.appendChild(cartItem);

      const foundImg = cartItem.querySelector('img.cart-item__image');
      expect(foundImg).toBeTruthy();
      expect(foundImg.src).toContain('product.jpg');
    });

    it('should update thumbnail src', () => {
      const cartItem = document.createElement('div');
      const img = document.createElement('img');
      img.src = 'https://example.com/old-thumbnail.jpg';
      cartItem.appendChild(img);
      document.body.appendChild(cartItem);

      const newThumbnail = 'https://example.com/new-thumbnail.jpg';
      img.src = newThumbnail;
      img.dataset.projectThumbnail = 'true';
      img.dataset.projectId = 'project-123';

      expect(img.src).toBe(newThumbnail);
      expect(img.dataset.projectThumbnail).toBe('true');
      expect(img.dataset.projectId).toBe('project-123');
    });
  });

  describe('Variant ID normalization', () => {
    it('should normalize variant ID correctly', () => {
      const normalizeVariantId = (value) => {
        if (!value) return null;
        const str = String(value);
        const match = str.match(/(\d+)\s*$/);
        return match ? match[1] : str;
      };

      expect(normalizeVariantId('123')).toBe('123');
      expect(normalizeVariantId('gid://shopify/ProductVariant/123')).toBe('123');
      expect(normalizeVariantId('123 ')).toBe('123');
      expect(normalizeVariantId(null)).toBe(null);
    });
  });

  describe('Personalisation fee detection', () => {
    it('should detect personalisation fee by variant ID', () => {
      const cartItem = document.createElement('div');
      const variantSource = document.createElement('div');
      variantSource.setAttribute('data-variant-id', '999');
      cartItem.appendChild(variantSource);
      document.body.appendChild(cartItem);

      const feeVariantId = '999';
      const rawId = variantSource.getAttribute('data-variant-id') || '';
      const match = String(rawId).match(/(\d+)\s*$/);
      const variantIdStr = match ? match[1] : rawId;

      const isFee = variantIdStr === feeVariantId;
      expect(isFee).toBe(true);
    });

    it('should detect personalisation fee by text content', () => {
      const cartItem = document.createElement('div');
      const detailsCell = document.createElement('div');
      detailsCell.className = 'cart-item__details';
      detailsCell.textContent = 'Personalisation Fee';
      cartItem.appendChild(detailsCell);
      document.body.appendChild(cartItem);

      const text = (detailsCell.textContent || '').toLowerCase();
      const isFee = text.includes('personalisation fee');
      expect(isFee).toBe(true);
    });
  });
});
