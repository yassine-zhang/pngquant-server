FROM oven/bun:latest AS builder

WORKDIR /app
COPY . .

RUN bun install 
RUN bun run build

FROM node:lts

WORKDIR /app
COPY --from=builder /app/build .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

RUN apt-get update && apt-get -y install build-essential libimagequant-dev

EXPOSE 9093

RUN npm run postinstall-down
CMD ["npm", "run", "prod"]