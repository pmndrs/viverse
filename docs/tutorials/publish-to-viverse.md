---
title: Publish to VIVERSE
description: Learn how to deploy your game to VIVERSE using the CLI.
nav: 10
---

## Prerequisites

- Node.js version 22 or higher installed
- A VIVERSE account (create one at [viverse.htcvive.com](https://viverse.htcvive.com))

## Step 1: Install the VIVERSE CLI

Install the official VIVERSE command-line interface:

```bash
npm install -g @viverse/cli
```

## Step 2: Authenticate with VIVERSE

Before you can create apps or deploy, you need to authenticate with your VIVERSE account:

```bash
viverse-cli auth login -e your-email -p your-password
```

## Step 3: Create a VIVERSE App

Create a new app entry in the VIVERSE platform:

```bash
viverse-cli app create
```

After creation, **note the App ID** - you'll need this for deployment.

## Step 4: Configure Your App ID

Next, we need to provide the App ID to our VIVERSE component.

> [!TIP]
> Do not include the app ID in your local development environment. Keep it production-only to avoid conflicts during development.

Create a production environment file (`.env.production`) in your project root.

```bash
# .env.production
VITE_VIVERSE_APP_ID=your-app-id-here
```

This allows you to provide the app ID to your VIVERSE component using the environment variable `VITE_VIVERSE_APP_ID`

```tsx
<Viverse clientId={import.meta.env.VITE_VIVERSE_APP_ID}>
  <YourGame />
</Viverse>
```

This only works when using vite. If you don't use vite you need to manually make sure the `appId` is provided to the VIVERSE `clientId` in the production build.

## Step 5: Build Your Application

Build your application for production. The exact command depends on your build tool. For vite you need to run `vite build`.

## Step 6: Deploy to VIVERSE

Deploy your built application to the VIVERSE platform:

```bash
viverse-cli app publish your-build-output-directly-here --app-id your-app-id-here
```

The CLI now shows you the URL with which you can preview your game in VIVERSE and how to submit it for review.
