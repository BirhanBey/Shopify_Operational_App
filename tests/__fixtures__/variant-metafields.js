// Test fixtures for variant metafields
export const mockVariantMetafields = {
  'gid://shopify/ProductVariant/456': {
    useProjectReference: true,
    useImageUploads: true,
    templateId: 'tpl123',
    materialId: 'Wood',
    editorType: 'Peleman Image Editor',
  },
  '456': {
    useProjectReference: true,
    useImageUploads: true,
    templateId: 'tpl123',
    materialId: 'Wood',
    editorType: 'Peleman Image Editor',
  },
};

export const mockVariantMetafieldsEmpty = {};

export const mockGraphQLResponse = {
  data: {
    product: {
      id: 'gid://shopify/Product/123',
      variants: {
        edges: [
          {
            node: {
              id: 'gid://shopify/ProductVariant/456',
              useProjectReference: {
                id: '1',
                value: 'true',
              },
              useImageUploads: {
                id: '2',
                value: 'true',
              },
            },
          },
        ],
      },
    },
  },
};
