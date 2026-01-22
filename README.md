# LAN-Transfer

一个基于 **Vue 3 + shadcn/ui + Bun + Elysia** 的局域网传输项目。  
项目运行在局域网环境中，用于发现在线用户，并协助在线用户之间建立 **WebRTC 连接**。

目前已实现：

- 在线 / 离线状态广播
- WebRTC 连接建立的信令协助

---

## 技术栈

### 前端（client）

- Vue 3
- shadcn/ui
- TypeScript
- WebRTC
- Socket

### 后端（server）

- Bun
- Elysia
- TypeScript

---

## 环境准备

#### 安装前端依赖

```bash
cd client
bun install
```

#### 安转后端依赖

```bash
cd ../server
bun install
```

## 打包项目

```bash
bun run build
```

## 启动项目

```bash
cd server
bun run start
```
