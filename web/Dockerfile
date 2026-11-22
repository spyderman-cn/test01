# 多阶段构建：Node 打包 → nginx 托管静态文件
#
# 构建：docker build -t campus-market-web .
# 运行：docker run -d -p 8080:80 --name campus-web campus-market-web
# 访问：http://localhost:8080

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
# 默认使用 mock 数据；对接真实后端时改为 false 并配置 /v1 代理
RUN VITE_USE_MOCK=true npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
