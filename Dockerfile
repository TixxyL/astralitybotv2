FROM node:22-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& npm ci --omit=dev \
	&& apt-get purge -y --auto-remove python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY . .
RUN mkdir -p data/transcripciones data/deleted-attachments

VOLUME ["/app/data"]
ENV NODE_ENV=production

CMD ["node", "index.js"]