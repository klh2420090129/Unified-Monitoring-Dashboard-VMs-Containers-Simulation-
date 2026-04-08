FROM node:20-alpine AS build
WORKDIR /app

COPY client/package*.json ./client/
RUN cd client && npm install

COPY client ./client
WORKDIR /app/client
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]