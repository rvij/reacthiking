# --- Stage 1: Build the React Application ---
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your dashboard source code
COPY . .

# Build the project (generates the 'dist' folder)
RUN npm run build

# --- Stage 2: Serve the application using Nginx ---
FROM nginx:stable-alpine

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8080 (Google Cloud Run's default port)
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]