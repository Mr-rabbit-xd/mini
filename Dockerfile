# ✅ Base Image
FROM node:18-bullseye

# ✅ Install FFmpeg (Fix spawn ffmpeg ENOENT) + System Packages
RUN apt-get update && \
    apt-get install -y ffmpeg python3 build-essential && \
    rm -rf /var/lib/apt/lists/*

# ✅ Set working directory
WORKDIR /app

# ✅ Copy package.json first for cache boost
COPY package*.json ./

# ✅ Prevent peer dependency errors (Baileys / jimp fix)
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# ✅ Install dependencies (including PM2 already in your package.json)
RUN npm install --legacy-peer-deps

# ✅ Copy bot source code
COPY . .

# ✅ Expose Port (Your Express API listens to 8000)
EXPOSE 8000

# ✅ Start like before (pm2 via npm start)
CMD ["npm", "start"]
