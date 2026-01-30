FROM node:22-alpine

WORKDIR /home/app

COPY package.json yarn.lock tsconfig.json ./
RUN yarn install

# Copy prisma schema and generate client for the Docker environment
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the application
RUN yarn build

EXPOSE 8000

CMD ["yarn", "start"]
