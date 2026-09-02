FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
ARG VITE_API_URL=https://backend-production-d44c6.up.railway.app/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_WA_API_URL=https://whatsapp-agent-production-5d48.up.railway.app/api/wa
ENV VITE_WA_API_URL=$VITE_WA_API_URL
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
ENV PORT=3000
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]


