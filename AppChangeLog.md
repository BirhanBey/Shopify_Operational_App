# App Change Log

## 2026-01-14

- Fixed project reference input value preservation bug where input would clear when user unfocused the field.
- Added event propagation prevention for project reference input blur, input, and change events to prevent form-wide updates.
- Created global-mini-cart-button.js file to handle cart button redirects on all pages using MutationObserver.
- Moved cart button redirect logic from cart-page-operations.js to global-mini-cart-button.js for better separation of concerns.
- Added comprehensive unit tests for global-mini-cart-button.js covering button detection, event handling, and MutationObserver functionality.
- Added regression tests for project reference input value preservation in product-page-operations.test.js.
- Added OPTIONS request handling tests for CORS preflight in api.create-project.test.jsx.
- Fixed CORS preflight handling by adding explicit OPTIONS method support in both action and loader functions of api.create-project.jsx.
- Added detailed logging to api.create-project.jsx for debugging 400 Bad Request errors.
- Updated editor-ops-embed.liquid to include global-mini-cart-button.js script on all pages.
- Removed cart-page-operations.js script from cart page condition in editor-ops-embed.liquid as functionality moved to global file.
- Added 85 passing unit tests covering app routes, extensions, and database operations.

## 2026-01-06

- Changed backend block design.
- Merged separated editor operations settings into one unified embed file.

## 2025-12-22

- Added ability to disable fly-to-cart animation from theme settings.
- Implemented shorter restricting for fly to cart animation.
- Removed fly to cart animation from product page.

## 2025-12-16

- Created new README file with project documentation.

## 2025-12-10

- Updated scope line configuration.
- Added scope debug logging.
- Updated toml file scopes.

## 2025-12-09

- Switched Prisma database from SQLite to PostgreSQL and initialized migrations.
- Changed application_url configuration for render.com deployment.
- Moved 3 checkbox settings from editor settings tab to editor activate tab.
- Moved editor selector to variations-level and specified project reference for designOnline and designLater modes.

## 2025-12-08

- Fixed reference field hiding corrections and created Editor activate tab.
- Added logic to hide Project Reference Input on ProductPage if there are no Editor ID.
- Implemented differentiation between Design Now, Design Later, and Design for you modes.
- Added designlater value sending to editor to save it in projectJSON.

## 2025-12-05

- Optimized function organization and reduced repeated thumbnail API calls.
- Implemented useimageupload checkbox functionality with skipped=true handling.
- Removed Cart Bubble if a personalization fee exists on the Cart Page.
- Added cart updates after editor interaction and deletion of cart item and personalisation fee.
- Added placeholder image for pre-designlater line at cart page.

## 2025-12-04

- Fixed minor URL correction for designlater mode.
- Adapted designlater selection functionality.

## 2025-12-03

- Resolved minor console.log issues.
- Removed quantity input for products that come back with price breakdown from the editor.

## 2025-12-02

- Added empty value personalisation as default option.
- Removed checkout button from product frontpage.
- Created personalisation dropdown and set up redirections.

## 2025-12-01

- Created personalisation fee product and added it to related cart items.
- Added favicon to the application.
- Displayed projectName on cart page.
- Opened editor settings at product settings page.

## 2025-11-28

- Completed variants input value deletion and correct payload sending to the editor.
- Added editor-settings-display extension to gitignore.

## 2025-11-26

- Improved data sharing with editor.
- Implemented SKU retrieval from admin page.

## 2025-11-25

- Added dummy data sending to the Editor for testing purposes.

## 2025-11-24

- Removed WP_Peleman_Editor_Communicator from Git tracking.
- Added variant project reference feature with admin extension and product page input.
- Fixed cart button to redirect to cart page instead of cart drawer.

## 2025-11-21

- Made cart thumbnails compatible with all themes.

## 2025-11-19

- Implemented navigation flow from product page to editor, and from editor to cart page.
- Initial commit of the Shopify Operational App project.
