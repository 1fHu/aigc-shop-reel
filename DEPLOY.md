# VidCraft 部署指南

## 目标服务器

- IP: 150.109.235.111
- 系统: Ubuntu 22.04 + Docker 26
- 域名: vidcraft.icu / api.vidcraft.icu
- 端口: 80 (需开放防火墙)

## 1. 防火墙配置

在腾讯云控制台开放 **80 端口**（TCP，来源 0.0.0.0/0）。目前已有 5000 端口。

## 2. 上传项目到服务器

在本地执行（将项目打包上传）：

```bash
# 打包项目（排除 node_modules 和 .git）
cd E:\vidcraft
tar -czf vidcraft-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=frontend/node_modules \
  --exclude=backend/node_modules \
  --exclude=backend/dist \
  --exclude=.git \
  .

# 上传到服务器
scp vidcraft-deploy.tar.gz ubuntu@150.109.235.111:~/
```

## 3. 服务器端操作

SSH 登录服务器：

```bash
ssh ubuntu@150.109.235.111
```

解压并配置：

```bash
mkdir -p ~/vidcraft
tar -xzf ~/vidcraft-deploy.tar.gz -C ~/vidcraft
cd ~/vidcraft

# 配置生产环境变量（重要！修改所有 CHANGE_ME 的值）
cp .env.production .env.production.local
nano .env.production.local
# 修改: JWT_SECRET, JWT_REFRESH_SECRET, DB_PASSWORD, MINIO_SECRET_KEY,
#       VOLCANO_ACCESS_KEY, VOLCANO_SECRET_KEY, SEEDANCE_CALLBACK_SECRET
```

## 4. 启动服务

```bash
cd ~/vidcraft
docker compose -f docker/docker-compose.prod.yml --env-file .env.production.local up -d --build
```

## 5. 验证

```bash
# 检查容器状态
docker compose -f docker/docker-compose.prod.yml ps

# 测试前端
curl http://localhost:80

# 测试 API
curl http://localhost:80/api-json
```

浏览器访问 **http://vidcraft.icu** 查看前端。

## 6. 更新部署

```bash
cd ~/vidcraft
git pull  # 或者重新上传
docker compose -f docker/docker-compose.prod.yml --env-file .env.production.local up -d --build
```

## 常用命令

```bash
# 查看日志
docker compose -f docker/docker-compose.prod.yml logs -f

# 重启服务
docker compose -f docker/docker-compose.prod.yml restart

# 停止服务
docker compose -f docker/docker-compose.prod.yml down
```
