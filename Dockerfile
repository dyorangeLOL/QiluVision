FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    MEDIA_PYTHON_PATH=python3 \
    FFMPEG_PATH=ffmpeg \
    FFPROBE_PATH=ffprobe

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@10.17.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY media-service ./media-service
RUN python3 -m pip install --no-cache-dir --break-system-packages ./media-service

COPY prisma ./prisma
COPY next.config.ts postcss.config.mjs tsconfig.json next-env.d.ts eslint.config.mjs components.json ./
COPY src ./src

RUN pnpm prisma generate && pnpm build && pnpm prune --prod

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start -H 0.0.0.0 -p ${PORT:-3000}"]
