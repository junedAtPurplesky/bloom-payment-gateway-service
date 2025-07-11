# ---- Build Stage ----
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# ---- Production Stage ----
FROM node:18-alpine

WORKDIR /usr/src/app

# Only copy production dependencies
COPY package*.json ./
RUN npm install --production

# Copy built app from builder stage
COPY --from=builder /usr/src/app ./

EXPOSE 3000

CMD ["npm", "start"]
