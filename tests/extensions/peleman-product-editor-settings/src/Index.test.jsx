import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock Shopify UI Extensions
// We'll use a factory function that can be updated in beforeEach
let mockQueryFunction = vi.fn().mockResolvedValue({
  data: {
    product: {
      id: 'gid://shopify/Product/123',
      variants: {
        edges: [],
      },
    },
  },
});

vi.mock('@shopify/ui-extensions-react/admin', () => ({
  reactExtension: (target, component) => component,
  useApi: () => {
    return {
      query: mockQueryFunction,
      data: {
        selected: [
          {
            id: 'gid://shopify/Product/123',
          },
        ],
      },
    };
  },
  BlockStack: ({ children, ...props }) => <div data-testid="block-stack" {...props}>{children}</div>,
  InlineStack: ({ children, ...props }) => <div data-testid="inline-stack" {...props}>{children}</div>,
  Text: ({ children, ...props }) => <span {...props}>{children}</span>,
  Select: ({ label, value, options, onChange, ...props }) => (
    <select
      data-testid={`select-${label?.toLowerCase().replace(/\s+/g, '-')}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    >
      {options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
  TextField: ({ label, value, onChange, ...props }) => (
    <input
      data-testid={`textfield-${label?.toLowerCase().replace(/\s+/g, '-')}`}
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={label}
      {...props}
    />
  ),
  Divider: (props) => <hr data-testid="divider" {...props} />,
  Button: ({ children, onPress, ...props }) => (
    <button data-testid="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Checkbox: ({ children, checked, onChange, ...props }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        {...props}
      />
      {children}
    </label>
  ),
}));

describe('PelemanProductEditorSettings', () => {
  let mockQuery;
  let PelemanProductEditorSettings;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock GraphQL query response - component expects { data, errors } format
    const mockResponse = {
      data: {
        product: {
          id: 'gid://shopify/Product/123',
          variants: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/ProductVariant/456',
                  title: 'Test Variant',
                  displayName: 'Test Variant',
                  templateIdMetafield: { id: '1', value: 'tpl123' },
                  designIdMetafield: { id: '2', value: 'design123' },
                  materialIdMetafield: { id: '3', value: 'Wood' },
                  personalisationsMetafield: { id: '4', value: 'f2d' },
                  f2dArticleCodeMetafield: { id: '5', value: '25290A415AL' },
                  editorTypeMetafield: { id: '6', value: '["Peleman Image Editor"]' },
                  useImageUploadsMetafield: { id: '7', value: 'true' },
                  useProjectThumbnailInCartMetafield: { id: '8', value: 'true' },
                  useProjectReferenceMetafield: { id: '9', value: 'true' },
                  sheetsMaxMetafield: { id: '10', value: '15' },
                  includedPagesMetafield: { id: '11', value: '0' },
                  productUnitCodeMetafield: { id: '12', value: 'BOX' },
                },
              },
            ],
          },
        },
      },
      errors: null,
    };

    // Update mockQueryFunction to return this response
    mockQueryFunction.mockResolvedValue(mockResponse);
    mockQuery = mockQueryFunction;
    
    // Import component after mocks are set up
    const module = await import('../../../../extensions/peleman-product-editor-settings/src/Index.jsx');
    PelemanProductEditorSettings = module.default;
  });

  it('should render loading state initially', async () => {
    render(<PelemanProductEditorSettings />);
    
    await waitFor(() => {
      expect(screen.getByText(/Loading variants/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render variant selector after loading', async () => {
    render(<PelemanProductEditorSettings />);
    
    await waitFor(() => {
      expect(screen.getByTestId('select-select-variant')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display editor settings fields', async () => {
    render(<PelemanProductEditorSettings />);
    
    // Wait for variant selector to appear first (component loads variants)
    await waitFor(() => {
      expect(screen.getByTestId('select-select-variant')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Wait a bit more for component to fully render
    await waitFor(() => {
      // Check if buttons are rendered
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
    
    // Click "Editor Settings" button to open the accordion
    const editorSettingsButton = screen.getByText('Editor Settings');
    fireEvent.click(editorSettingsButton);
    
    // Now wait for the fields to appear
    await waitFor(() => {
      expect(screen.getByTestId('textfield-template-id')).toBeInTheDocument();
      expect(screen.getByTestId('textfield-design-id')).toBeInTheDocument();
      expect(screen.getByTestId('textfield-material-id')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should allow changing variant selection', async () => {
    render(<PelemanProductEditorSettings />);
    
    // Wait for component to load and variant selector to appear
    // Component needs to finish loading variants first
    await waitFor(() => {
      const variantSelect = screen.getByTestId('select-select-variant');
      expect(variantSelect).toBeInTheDocument();
      // Make sure it's not in loading state
      expect(screen.queryByText(/Loading variants/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const variantSelect = screen.getByTestId('select-select-variant');
    fireEvent.change(variantSelect, { target: { value: 'gid://shopify/ProductVariant/456' } });

    expect(variantSelect.value).toBe('gid://shopify/ProductVariant/456');
  });

  it('should display save button', async () => {
    render(<PelemanProductEditorSettings />);
    
    await waitFor(() => {
      const saveButton = screen.getByText(/Save All Settings/i);
      expect(saveButton).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show error when no product is selected', async () => {
    // Mock useApi to return no product by temporarily changing the mock
    // We need to mock the useApi hook to return empty selected array
    const adminModule = await import('@shopify/ui-extensions-react/admin');
    const originalUseApi = adminModule.useApi;
    
    // Temporarily override useApi to return no product
    adminModule.useApi = vi.fn(() => ({
      query: mockQueryFunction,
      data: {
        selected: [], // No product selected
      },
    }));

    // Re-import to get fresh component with new mock
    const module = await import('../../../../extensions/peleman-product-editor-settings/src/Index.jsx');
    const Component = module.default;
    
    render(<Component />);
    
    // Component shows "No product selected" when productId is null
    await waitFor(() => {
      expect(screen.getByText(/No product selected/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Restore original useApi
    adminModule.useApi = originalUseApi;
  });
});
