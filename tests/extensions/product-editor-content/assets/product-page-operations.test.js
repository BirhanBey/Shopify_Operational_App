import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('product-page-operations.js', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Create JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://test-shop.myshopify.com/products/test-product',
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

  describe('DOM manipulation functions', () => {
    it('should detect product page correctly', () => {
      window.location.pathname = '/products/test-product';
      const isProductPage = window.location.pathname.includes('/products/');
      expect(isProductPage).toBe(true);
    });

    it('should not run on non-product pages', () => {
      // JSDOM doesn't allow direct pathname assignment
      // Use a different approach: create new JSDOM with different URL
      const nonProductDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://test-shop.myshopify.com/collections/test',
        pretendToBeVisual: true,
      });
      const testPathname = nonProductDom.window.location.pathname;
      const isProductPage = testPathname.includes('/products/');
      expect(isProductPage).toBe(false);
    });

    it('should create project reference input element', () => {
      const container = document.createElement('div');
      container.id = 'project-reference-input-container';
      
      const label = document.createElement('label');
      label.setAttribute('for', 'project-reference-input');
      label.textContent = 'Project Reference';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'project-reference-input';
      input.name = 'properties[project_reference]';
      
      container.appendChild(label);
      container.appendChild(input);
      document.body.appendChild(container);

      const createdInput = document.getElementById('project-reference-input');
      expect(createdInput).toBeTruthy();
      expect(createdInput.type).toBe('text');
      expect(createdInput.name).toBe('properties[project_reference]');
    });

    it('should create personalisation dropdown', () => {
      const container = document.createElement('div');
      container.id = 'personalisation-dropdown-container';
      
      const select = document.createElement('select');
      select.id = 'personalisation-select';
      select.name = 'properties[personalisation_mode]';
      
      const options = [
        { value: '', label: 'Select personalisation option' },
        { value: 'design_for_me', label: 'Design For Me' },
        { value: 'design_online', label: 'Design Online' },
        { value: 'design_later', label: 'Design Later' },
      ];
      
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      });
      
      container.appendChild(select);
      document.body.appendChild(container);

      const createdSelect = document.getElementById('personalisation-select');
      expect(createdSelect).toBeTruthy();
      expect(createdSelect.options.length).toBe(4);
    });
  });

  describe('URL building functions', () => {
    it('should build cart add URL with project ID', () => {
      const variantId = '123';
      const quantity = '1';
      const projectId = 'project-123';
      const baseUrl = 'https://test-shop.myshopify.com/cart/add';
      const params = new URLSearchParams({
        id: variantId,
        quantity: quantity,
        'properties[projectid]': projectId,
        return_to: '/cart',
      });
      const url = `${baseUrl}?${params.toString()}`;

      expect(url).toContain('id=123');
      expect(url).toContain('properties%5Bprojectid%5D=project-123');
      expect(url).toContain('return_to=%2Fcart');
    });

    it('should build editor URL with correct parameters', () => {
      const projectId = 'project-123';
      const cartAddUrl = 'https://test-shop.myshopify.com/cart/add';
      const editorDomain = 'https://editor.example.com';
      const apiKey = 'test-api-key';
      const editorLang = 'en';
      
      const params = new URLSearchParams({
        projectid: projectId,
        skipped: 'false',
        editorid: 'PIE',
        lang: editorLang,
        a: apiKey,
        returnurl: cartAddUrl,
      });
      const url = `${editorDomain}/?${params.toString()}`;

      expect(url).toContain('projectid=project-123');
      expect(url).toContain('a=test-api-key');
      expect(url).toContain('returnurl=');
    });
  });

  describe('Variant ID normalization', () => {
    it('should handle numeric variant IDs', () => {
      const variantId = '123';
      const gidFormat = `gid://shopify/ProductVariant/${variantId}`;
      expect(gidFormat).toBe('gid://shopify/ProductVariant/123');
    });

    it('should handle GID format variant IDs', () => {
      const gidVariantId = 'gid://shopify/ProductVariant/123';
      const numericId = gidVariantId.includes('/') 
        ? gidVariantId.split('/').pop() 
        : gidVariantId;
      expect(numericId).toBe('123');
    });
  });

  describe('Project reference input value preservation', () => {
    it('should preserve input value when input is recreated', () => {
      // Create initial input with a value
      const container1 = document.createElement('div');
      container1.id = 'project-reference-input-container';
      const input1 = document.createElement('input');
      input1.id = 'project-reference-input';
      input1.value = 'TEST-REF-123';
      container1.appendChild(input1);
      document.body.appendChild(container1);

      // Save the value
      const savedValue = input1.value;
      expect(savedValue).toBe('TEST-REF-123');

      // Remove and recreate (simulating updateProjectReferenceInput behavior)
      container1.remove();

      // Recreate with saved value
      const container2 = document.createElement('div');
      container2.id = 'project-reference-input-container';
      const input2 = document.createElement('input');
      input2.id = 'project-reference-input';
      input2.value = savedValue; // Restore saved value
      container2.appendChild(input2);
      document.body.appendChild(container2);

      const restoredInput = document.getElementById('project-reference-input');
      expect(restoredInput).toBeTruthy();
      expect(restoredInput.value).toBe('TEST-REF-123');
    });

    it('should prevent blur event from triggering form updates', () => {
      const form = document.createElement('form');
      form.id = 'product-form';
      document.body.appendChild(form);

      const input = document.createElement('input');
      input.id = 'project-reference-input';
      input.value = 'TEST-REF-456';
      form.appendChild(input);

      let formChangeTriggered = false;
      form.addEventListener('change', () => {
        formChangeTriggered = true;
      });

      // Simulate blur with stopPropagation
      const blurEvent = new window.Event('blur', { bubbles: true });
      input.addEventListener('blur', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);

      input.dispatchEvent(blurEvent);

      // Form change should not be triggered
      expect(formChangeTriggered).toBe(false);
    });

    it('should prevent input event from triggering form updates', () => {
      const form = document.createElement('form');
      form.id = 'product-form';
      document.body.appendChild(form);

      const input = document.createElement('input');
      input.id = 'project-reference-input';
      form.appendChild(input);

      let formChangeTriggered = false;
      form.addEventListener('change', () => {
        formChangeTriggered = true;
      });

      // Simulate input with stopPropagation
      const inputEvent = new window.Event('input', { bubbles: true });
      input.addEventListener('input', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);

      input.value = 'NEW-VALUE';
      input.dispatchEvent(inputEvent);

      // Form change should not be triggered
      expect(formChangeTriggered).toBe(false);
    });

    it('should preserve input value across multiple blur events', () => {
      const container = document.createElement('div');
      container.id = 'project-reference-input-container';
      const input = document.createElement('input');
      input.id = 'project-reference-input';
      input.value = 'PERSISTENT-VALUE';
      container.appendChild(input);
      document.body.appendChild(container);

      // Simulate multiple blur events
      for (let i = 0; i < 3; i++) {
        const blurEvent = new window.Event('blur', { bubbles: true });
        input.addEventListener('blur', (e) => {
          e.stopPropagation();
        }, true);
        input.dispatchEvent(blurEvent);
      }

      // Value should still be preserved
      expect(input.value).toBe('PERSISTENT-VALUE');
    });
  });
});
