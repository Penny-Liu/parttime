# Radioshift

A React application built for radioshifts planning.

## Project Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
```bash
npm install
```

### Development
Start the development server:
```bash
npm run dev
```

### Build
Build for production:
```bash
npm run build
```

## Deployment

This project is configured to deploy automatically to **GitHub Pages** using GitHub Actions.

### Setup GitHub Pages
1. Go to your repository **Settings**.
2. Navigate to **Pages** in the sidebar.
3. Under **Build and deployment**, select **GitHub Actions** as the source.

Once configured, any push to the `main` branch will trigger the deployment workflow.

## Project Structure
- `src/`: Source code
  - `components/`: React components
  - `services/`: API services
- `.github/workflows/`: GitHub Actions workflows
- `dist/`: Production build output (gitignored)

## Operational Logs
- **Init**: Project setup with `npm install`
- **Config**: Updated `.gitignore` to exclude sensitive files (`.env`, etc.)
- **CI/CD**: Added GitHub Actions workflow `deploy.yml` for automated deployment
