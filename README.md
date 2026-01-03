# Local Docker Setup

### Testing Locally with Docker
Using Docker ensures that the environment on your Mac matches exactly what will run on Google Cloud Run.

1. Prerequisites
Ensure Docker Desktop is installed and running on your Mac. You should see the whale icon in
your top menu bar.
2. Build the Image
Open your terminal inside your project folder (hiking-dashboard) and run:

```
docker build -t hiking-dashboard .
```
This will download Node, install your packages, and build the React site into a small, production-ready image.
3. Run the Container Launch the dashboard locally:
```
docker run -p 8080:8080 hiking-dashboard
```
4. View the Site
Open your browser and go to: http://localhost:8080

### Why use Docker for local testing?
1. No Node/NPM Conflicts: It doesn't matter if your local handles its own permissions internally.
npm has permission errors; Docker
2. Identical to Cloud: If it works here, it is 99% guaranteed to work when you push it to
Google Cloud Run.
3. Clean Environment: You don't have to install firebase , recharts , or lucide-react on
your Mac; Docker does it inside the container.

# Deploy to Cloud Run
Step 1:

Build the Image in the Cloud Run this command from your project folder to build your container:
```
gclouduilds submit --tag gcr.io/rvijgdrive-152618/hiking-dashboard
```

Step 2:
Deploy to Cloud Run

Deploy the service. We use --allow-unauthenticated so the browser can load the login page.

```
gcloud run deploy hiking-dashboard \
--image gcr.io/rvijgdrive-152618/hiking-dashboard \
--platform managed \
--region us-central1 \
--allow-unauthenticated
```

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
