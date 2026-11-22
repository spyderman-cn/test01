# 只托管构建产物，无需在虚拟机里装 Node
# 构建：docker compose up -d --build
# 访问：http://<虚拟机IP>:8080
FROM nginx:1.27-alpine

# 站点配置（gzip / 强缓存 / SPA 回退 / healthz）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 本地 npm run build 产出的静态文件
COPY dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
