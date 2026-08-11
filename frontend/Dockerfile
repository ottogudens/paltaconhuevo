FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
ARG VITE_API_URL=https://paltaconhuevo-production.up.railway.app/api
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
ENV PORT=3000
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]


