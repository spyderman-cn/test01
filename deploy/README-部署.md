# 校集前端 · 虚拟机 Docker 部署包

包内已包含构建好的静态文件，**虚拟机上不需要 Node / npm**，只要有 Docker。

```
campus-web/
├── dist/               # 前端构建产物（index.html + assets）
├── nginx.conf          # nginx 站点配置（gzip、强缓存、SPA 回退、/healthz）
├── Dockerfile          # nginx:alpine + 上面的文件
└── docker-compose.yml  # 8080:80，自动重启
```

## 1. 上传

FinalShell 左侧「文件」面板进入 `/opt`，把 `campus-web.zip` 拖进去（或点击上传按钮）。

## 2. 解压

```bash
cd /opt
unzip -o campus-web.zip
cd campus-web
```

## 3. 启动

```bash
docker compose up -d --build
```

老版本 Docker 用 `docker-compose up -d --build`。

首次会拉取 `nginx:1.27-alpine`（约 50MB），几秒到几十秒。

## 4. 验证

```bash
docker ps                       # 应看到 campus-market-web，状态 Up (healthy)
curl -I http://127.0.0.1:8080   # 期望 HTTP/1.1 200 OK，Server: nginx
curl http://127.0.0.1:8080/healthz   # 期望 ok
docker logs --tail 20 campus-market-web
```

## 5. 放行端口

```bash
# firewalld（CentOS / RHEL / Rocky / Alma）
sudo firewall-cmd --add-port=8080/tcp --permanent && sudo firewall-cmd --reload

# ufw（Ubuntu / Debian）
sudo ufw allow 8080/tcp
```

云服务器还需要在**安全组**里放行 8080 入站。

浏览器访问：`http://<虚拟机IP>:8080`

> 想直接走 80 端口：把 `docker-compose.yml` 里的 `8080:80` 改成 `80:80`，然后 `docker compose up -d`。

## 6. 更新前端

本地改完代码：

```bash
cd web
npm run build
```

把新的 `dist/` 覆盖上传到虚拟机的 `/opt/campus-web/dist`，然后：

```bash
cd /opt/campus-web
docker compose up -d --build
```

`index.html` 配置了不缓存、`/assets/` 文件名带哈希且缓存一年，所以发版后用户刷新即可拿到新版本。

## 7. 备选：不构建镜像，直接挂载（改文件即可生效）

```bash
docker run -d --name campus-web \
  -p 8080:80 \
  -v /opt/campus-web/dist:/usr/share/nginx/html:ro \
  -v /opt/campus-web/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  --restart unless-stopped \
  nginx:1.27-alpine
```

更新时替换 `dist` 内容后 `docker restart campus-web`。

## 8. 常见问题

**拉不到镜像 / 超时**

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker
```

镜像源可用性会变，失败就换一个。

**端口被占用**

```bash
sudo ss -lntp | grep 8080
```

改 `docker-compose.yml` 的宿主机端口（如 `8081:80`）后重新 `docker compose up -d`。

**SELinux 拒绝挂载（CentOS 系）**

挂载方式部署时给卷加 `:z` 标签，例如 `-v /opt/campus-web/dist:/usr/share/nginx/html:ro,z`。

**想改成后端联调**

`nginx.conf` 里已留 `location /v1/ { proxy_pass ... }` 的注释模板，取消注释、改成后端地址，重新 `docker compose up -d --build`；同时把前端构建时的 `VITE_USE_MOCK` 设为 `false`。
