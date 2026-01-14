// Test fixtures for project data
export const mockProjectResponse = {
  success: true,
  data: {
    projectid: 'project-123',
  },
};

export const mockProjectDetails = {
  success: true,
  project: {
    id: 'project-123',
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
};

export const mockProjectThumbnail = {
  success: true,
  thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
};
