import { http, HttpResponse } from 'msw';

// Mock handlers for external APIs
export const handlers = [
  // Mock editor API - create project
  http.get('*/editor/api/createprojectAPI.php', ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectid') || 'test-project-123';
    
    return HttpResponse.json({
      success: true,
      data: {
        projectid: projectId,
      },
    });
  }),

  // Mock editor API - project details
  http.get('*/editor/api/projectfileAPI.php', ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectid') || 'test-project-123';
    
    return HttpResponse.json({
      success: true,
      project: {
        id: projectId,
        name: 'Test Project',
        projectname: 'Test Project',
        result: {
          totalprice: 100.50,
          breakdown: [
            { desc: 'Base Price', pricetotal: 50.00 },
            { desc: 'Pages', pricetotal: 50.50 },
          ],
        },
      },
    });
  }),

  // Mock editor API - project thumbnail
  http.get('*/editor/api/getprojectthumbnailAPI.php', async () => {
    // Return a simple base64 encoded 1x1 pixel PNG
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
    return HttpResponse.arrayBuffer(
      buffer.buffer,
      {
        headers: {
          'Content-Type': 'image/png',
        },
      }
    );
  }),

  // Mock Shopify GraphQL API
  http.post('*/admin/api/*/graphql.json', () => {
    return HttpResponse.json({
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
    });
  }),
];
