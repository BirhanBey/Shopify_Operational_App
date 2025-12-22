# 🎨 Peleman Editor Connection App

<div align="center">

![Shopify](https://img.shields.io/badge/Shopify-7AB55C?style=for-the-badge&logo=shopify&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

**Seamlessly integrate Peleman Editor into your Shopify store for enhanced product customization**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Deployment](#-deployment) • [API Reference](#-api-reference)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Peleman Editor Connection App** is a powerful Shopify application that bridges the gap between your Shopify store and the Peleman Editor platform. It enables merchants to offer advanced product customization capabilities directly within their Shopify storefront, allowing customers to personalize products with images, text, and design elements before adding them to cart.

### What This App Does

- 🔗 **Seamless Integration**: Connects Shopify products with Peleman Editor
- 🛍️ **Enhanced Shopping Experience**: Customers can customize products before purchase
- 📸 **Project Thumbnails**: Displays project previews in the cart
- ⚙️ **Flexible Configuration**: Per-variant editor settings and personalization options
- 🎨 **Dynamic UI**: Smart product page enhancements based on variant settings

---

## ✨ Features

### 🛒 Product Page Operations
- **Editor Integration**: Automatic redirect to Peleman Editor when adding customizable products to cart
- **Personalization Modes**: Support for multiple personalization options:
  - `design_online`: Design immediately in the editor
  - `design_later`: Add to cart and design later
  - `design_for_me`: Request custom design service
- **Project Reference**: Optional project reference input for tracking customer projects
- **Variant-Specific Settings**: Enable/disable editor features per product variant via metafields

### 🛍️ Cart Page Operations
- **Project Thumbnails**: Display project preview images in the cart
- **Project Details**: Show detailed project information for customized items
- **Seamless Updates**: Real-time cart updates with project information

### ⚙️ Admin Settings
- **Editor Configuration**: Configure editor API keys and domain settings
- **Feature Toggles**: Enable/disable features like:
  - Image uploads
  - Project thumbnails in cart
  - Project reference input
- **Variant Management**: Set editor preferences per product variant

### 🔐 Security & Performance
- **OAuth Authentication**: Secure Shopify OAuth flow
- **Session Management**: Prisma-based session storage
- **CORS Support**: Proper CORS headers for theme extension access
- **Error Handling**: Comprehensive error handling and logging

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React Router v7 |
| **Backend** | Node.js (v20.19+ or v22.12+) |
| **Database** | PostgreSQL with Prisma ORM |
| **Shopify** | Shopify App Bridge, Polaris UI |
| **Theme Extensions** | Liquid templates, JavaScript |
| **Deployment** | Render.com (or any Node.js host) |

### Key Dependencies

- `@shopify/shopify-app-react-router` - Shopify app framework
- `@react-router/dev` - React Router development tools
- `@prisma/client` - Database ORM
- `@shopify/app-bridge-react` - Shopify App Bridge components
- `@shopify/ui-extensions-react` - Shopify UI extensions

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v20.19+ or v22.12+ ([Download](https://nodejs.org/))
- **npm** or **yarn** or **pnpm** package manager
- **Shopify CLI**: Latest version ([Install Guide](https://shopify.dev/docs/apps/tools/cli/getting-started))
- **Shopify Partner Account**: [Create one here](https://partners.shopify.com/signup)
- **Development Store**: [Create a dev store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store)
- **PostgreSQL Database**: For production (SQLite works for local dev)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/peleman-editor-connection-app.git
cd peleman-editor-connection-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=http://localhost:3000
SCOPES=read_products,write_products

# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/peleman_editor_db"

# Environment
NODE_ENV=development
```

> **Note**: For local development, you can use SQLite by changing the `DATABASE_URL` in `prisma/schema.prisma` to `"file:./dev.db"`.

### 4. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 5. Start Development Server

```bash
npm run dev
```

This will:
- Start the Shopify CLI development server
- Create a tunnel for local development
- Open the app in your browser
- Watch for file changes

---

## ⚙️ Configuration

### Shopify Partner Dashboard Setup

1. **Create App**: Go to [Shopify Partner Dashboard](https://partners.shopify.com/) → Apps → Create App
2. **Configure URLs**:
   - **App URL**: Your production URL (e.g., `https://your-app.onrender.com`)
   - **Allowed redirection URLs**: `https://your-app.onrender.com/auth/callback`
3. **Set API Scopes**: 
   - `read_products`
   - `write_products`
4. **Get Credentials**: Copy API Key and Secret to your `.env` file

### App Settings Configuration

After installing the app in your store:

1. Navigate to the app in Shopify Admin
2. Go to **Editor Activate** tab
3. Configure:
   - **Editor API Key**: Your Peleman Editor API key
   - **Editor Domain**: Your Peleman Editor domain (e.g., `https://editor-staging.peleman.com`)
   - **Editor Customer ID**: Your customer ID (optional)
4. Enable features:
   - ✅ Use Image Uploads
   - ✅ Use Project Thumbnail in Cart
   - ✅ Use Project Reference

### Product Variant Configuration

Configure editor settings per variant using Shopify metafields:

1. Go to **Products** → Select a product → **Variants**
2. Add metafields:
   - `custom.editor_type`: Editor type (e.g., "Peleman Image Editor")
   - `custom.use_project_reference`: Boolean (true/false)
   - `custom.use_image_uploads`: Boolean (true/false)
   - `custom.use_project_thumbnail`: Boolean (true/false)

---

## 📖 Usage

### Theme Extension Setup

1. **Install the App**: Install the app in your Shopify store
2. **Enable Theme Extensions**:
   - Go to **Online Store** → **Themes** → **Customize**
   - Navigate to **App embeds**
   - Enable **Product Editor Content** block
   - Configure the **App URL** setting

### Product Page Flow

1. Customer visits a product page with editor-enabled variants
2. Selects a variant (if multiple variants available)
3. Chooses personalization mode:
   - **Design Online**: Redirects to editor immediately
   - **Design Later**: Adds to cart, can design later
   - **Design For Me**: Adds to cart with design request
4. If "Design Online" or "Design Later" selected:
   - Project is created via Peleman Editor API
   - Customer is redirected to editor
   - After editing, returns to cart with project ID

### Cart Page Features

- **Project Thumbnails**: Customized products show preview images
- **Project Details**: Click to view/edit project information
- **Seamless Updates**: Cart updates automatically with project data

---

## 📁 Project Structure

```
peleman-editor-connection-app/
├── app/                          # Main application code
│   ├── routes/                   # React Router routes
│   │   ├── api.*.jsx            # API endpoints
│   │   ├── app.*.jsx            # Admin app pages
│   │   └── webhooks.*.jsx       # Webhook handlers
│   ├── shopify.server.js        # Shopify app configuration
│   └── db.server.js             # Prisma database client
├── extensions/                   # Shopify app extensions
│   ├── product-editor-content/  # Theme app extension
│   │   ├── assets/              # JavaScript files
│   │   │   ├── product-page-operations.js
│   │   │   └── cart-page-operations.js
│   │   └── blocks/              # Liquid templates
│   │       ├── product-page-operations-embed.liquid
│   │       └── cart-page-operations-embed.liquid
│   └── peleman-product-editor-settings/  # Admin UI extension
│       └── src/
│           └── Index.jsx        # Settings page component
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma           # Prisma schema
│   └── migrations/             # Database migrations
├── public/                      # Static assets
├── shopify.app.toml             # Shopify app configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

---

## 🔌 API Reference

### Editor Settings API

**GET** `/api/editor-settings?shop={shop_domain}`

Returns editor configuration for a shop.

**Response:**
```json
{
  "settings": {
    "editorApiKey": "your_api_key",
    "editorDomain": "https://editor.example.com",
    "editorCustomerId": "customer_id"
  }
}
```

### Project Details API

**GET** `/api/project-details?shop={shop_domain}&projectId={project_id}`

Returns project details for a given project ID.

**Response:**
```json
{
  "project": {
    "id": "project_id",
    "name": "Project Name",
    "thumbnail": "https://thumbnail.url",
    // ... other project fields
  }
}
```

### Project Thumbnail API

**GET** `/api/project-thumbnail?shop={shop_domain}&projectId={project_id}`

Returns project thumbnail image URL.

**Response:**
```json
{
  "thumbnail": "https://thumbnail.url"
}
```

### Variant Metafields API

**GET** `/api/variant-metafields?shop={shop_domain}&variantId={variant_id}`

Returns editor-related metafields for a variant.

**Response:**
```json
{
  "variantData": {
    "editorType": "Peleman Image Editor",
    "useProjectReference": true,
    "useImageUploads": true,
    "useProjectThumbnail": true
  }
}
```

### Create Project API

**POST** `/api/create-project`

Creates a new project in Peleman Editor.

**Request Body:**
```json
{
  "shop": "shop_domain",
  "variantId": "variant_id",
  "quantity": 1
}
```

---

## 🚢 Deployment

### Deploy to Render.com

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **New** → **Web Service**
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `peleman-editor-connection-app`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

3. **Set Environment Variables**:
   ```
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET=your_api_secret
   SHOPIFY_APP_URL=https://your-app.onrender.com
   SCOPES=read_products,write_products
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   NODE_ENV=production
   ```

4. **Create PostgreSQL Database**:
   - In Render Dashboard, create a new PostgreSQL database
   - Copy the connection string to `DATABASE_URL`

5. **Update Shopify Partner Dashboard**:
   - Update App URL to your Render URL
   - Update Redirect URLs to include your Render callback URL

### Deploy to Other Platforms

The app can be deployed to any Node.js hosting platform:
- **Heroku**: Follow [Shopify deployment guide](https://shopify.dev/docs/apps/deployment/web)
- **Fly.io**: Similar setup to Render
- **Railway**: Automatic deployment from GitHub
- **AWS/GCP/Azure**: Use containerized deployment

---

## 🔧 Troubleshooting

### Database Tables Don't Exist

**Error**: `The table main.Session does not exist`

**Solution**:
```bash
npm run setup
# or
npx prisma migrate deploy
```

### App Preview Errors

**Error**: `You cannot add module because this app already has the maximum number of 1 module allowed`

**Solution**: This is a Shopify CLI limitation. The extensions still build correctly. You can:
- Ignore the error (extensions work in theme editor)
- Temporarily disable other theme extensions for testing

### OAuth Errors

**Error**: `failed_grant_with_invalid_scopes`

**Solution**:
1. Ensure `SCOPES` in `.env` matches `shopify.app.toml`
2. Ensure scopes in Partner Dashboard match exactly
3. Create a new app version or run `shopify app deploy`

### Editor Settings Not Loading

**Error**: "Editor settings are not configured"

**Solution**:
1. Open the app in Shopify Admin
2. Navigate to **Editor Activate** tab
3. Enter and save Editor API Key and Editor Domain

### CORS Errors

**Error**: CORS policy blocking requests from theme

**Solution**: The app includes CORS headers. Ensure:
- App URL is correctly configured
- Theme extension is properly installed
- Shop domain matches in API calls

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code patterns and conventions
- Write clear, descriptive comments in English
- Use meaningful variable and function names
- Test your changes thoroughly
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

For issues, questions, or contributions:

- **GitHub Issues**: [Open an issue](https://github.com/your-org/peleman-editor-connection-app/issues)
- **Email**: birhanyorukoglu@gmail.com
- **Documentation**: [Full Documentation](https://docs.example.com)

---

## 🙏 Acknowledgments

- Built with [Shopify App Template](https://github.com/Shopify/shopify-app-template-react-router)
- Powered by [React Router](https://reactrouter.com/)
- Database management with [Prisma](https://www.prisma.io/)
- UI components from [Shopify Polaris](https://polaris.shopify.com/)

---

<div align="center">

**Made with ❤️ for Shopify Merchants**

⭐ Star this repo if you find it helpful!

</div>
