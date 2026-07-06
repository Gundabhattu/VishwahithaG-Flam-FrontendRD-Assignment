FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SOCKET_URL=http://localhost:4000
ARG VITE_SOCKET_TOKEN=demo-token
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_SOCKET_TOKEN=$VITE_SOCKET_TOKEN
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
