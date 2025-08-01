# Publishing to GitHub Packages

## Prerequisites

1. Make sure you have a GitHub Personal Access Token with `write:packages` permission
2. Configure npm to authenticate with GitHub Packages

## Setup Authentication

### Option 1: Using .npmrc (Recommended)
Create or update your `~/.npmrc` file:

```
@oroszgy:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### Option 2: Using npm login
```bash
npm login --scope=@oroszgy --registry=https://npm.pkg.github.com
```

## Publishing Steps

### 1. Commit and Push Your Changes
```bash
git add .
git commit -m "feat: package chat component for npm distribution"
git push origin main
```

### 2. Create a Git Tag (Optional but Recommended)
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 3. Publish the Package
```bash
cd ui
npm publish
```

### 4. Verify Publication
Visit: https://github.com/oroszgy/agui-deepchat-integration/packages

## Automatic Publishing with GitHub Actions

The repository is already configured with a GitHub Actions workflow (`.github/workflows/publish.yml`) that will automatically publish the package when you:

1. Create a new release on GitHub, OR
2. Push a git tag starting with 'v'

To trigger automatic publishing:
```bash
git tag v1.0.1
git push origin v1.0.1
```

## Using the Published Package

Once published, other projects can install and use your component:

```bash
npm install @oroszgy/ag-ui-deepchat-vue
```

## Package Contents

The published package includes:
- CommonJS build (`dist/index.js`)
- ES Module build (`dist/index.esm.js`) 
- TypeScript declarations (`dist/index.d.ts`)
- Complete source code and documentation

## Version Management

To publish a new version:
1. Update the version in `package.json`
2. Run `npm run build` to rebuild
3. Run `npm publish` or create a new git tag for automatic publishing
