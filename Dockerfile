FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --production
RUN yarn build

COPY . .

EXPOSE 8000

CMD ["node", "build/index.js"]
