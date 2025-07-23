---
title: Publish to Viverse
description: Learn how to deploy your game to Viverse using the CLI.
nav: 10
---

## Prerequisites

- Node.js version 22 or higher installed
- A Viverse account (create one at [viverse.htcvive.com](https://viverse.htcvive.com))

## Step 1: Install the Viverse CLI

Install the official Viverse command-line interface:

```bash
npm install -g @viverse/cli
```

## Step 2: Authenticate with Viverse

Before you can create apps or deploy, you need to authenticate with your Viverse account:

```bash
viverse-cli auth login
```

## Step 3: Create a Viverse App

Create a new app entry in the Viverse platform:

```bash
viverse-cli app create
```

After creation, **note the App ID** - you'll need this for deployment.

## Step 4: Configure Your App ID

Next, we need to provide the app id to our Viverse component.

> [!TIP]
> Do not include the App ID in your local development environment. Keep it production-only to avoid conflicts during development.

Create a production environment file (`.env.prod`) in your project root and use dotenvx when building your app (`dotenvx run -f .env.prod -- vite build`)

```bash
# .env.prod
VITE_VIVERSE_APP_ID=your-app-id-here
```

this allows to provide the appId to your Viverse component using the environment variable `VITE_VIVERSE_APP_ID`

```jsx
<Viverse clientId={import.meta.env.VITE_VIVERSE_APP_ID}>
  <YourGame />
</Viverse>
```

This only works when using vite. If you don't use vite you need to manually make sure the `appId` is provided to the Viverse `clientId` in the production build.

## Step 5: Build Your Application

Build your application for production. The exact command depends on your build tool.

## Step 6: Deploy to Viverse

Deploy your built application to the Viverse platform:

```bash
viverse-cli app publish your-build-output-directly-here --app-id your-app-id-here
```

The CLI now shows you the URL with which you can preview your game in viverse and how to submit it for review