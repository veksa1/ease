# Multi-stage build for React Vite app
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (generate package-lock.json if it doesn't exist)
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Add environment variable substitution script
COPY env-substitution.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/env-substitution.sh

# Expose port 3000 (nginx will listen on this port)
EXPOSE 3000

# Start nginx with environment variable substitution
CMD ["/usr/local/bin/env-substitution.sh"]
