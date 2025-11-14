#!/bin/sh

# Replace environment variables in nginx config
envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

# Replace environment variables in index.html for runtime config
if [ -f /usr/share/nginx/html/index.html ]; then
    # Create a runtime config that can be accessed by the React app
    cat > /usr/share/nginx/html/config.js << EOF
window.ENV = {
    REACT_APP_API_URL: "${REACT_APP_API_URL:-http://localhost:8000}",
    REACT_APP_ENVIRONMENT: "${REACT_APP_ENVIRONMENT:-production}"
};
EOF
fi

# Start nginx
exec nginx -g 'daemon off;'
