# Netlify 可部署版：少儿象棋小游戏授权保护

这个文件夹可以作为一个完整项目部署到 Netlify。不要只上传 `index.html`，否则会绕过授权保护。

重要：不要用 Netlify Drop 直接拖拽 zip 做静态部署。这个项目用到了 Netlify Functions 和 Netlify Blobs，应该用 GitHub 连接部署，或者用 Netlify CLI 部署。

## 你要上传哪个文件夹

部署整个文件夹：

```text
chess-license-netlify
```

也就是包含这些文件的这一层：

```text
netlify.toml
package.json
build.js
public/
protected-game/
netlify/functions/
```

## 推荐部署方式：GitHub

1. 把 `chess-license-netlify` 这个文件夹上传到一个 GitHub 仓库。
2. Netlify 后台选择 `Add new project`。
3. 选择 `Import an existing project`。
4. 连接你的 GitHub 仓库。
5. 构建设置：

- Build command：`npm run build`
- Publish directory：`dist`
- Functions directory：`netlify/functions`

Netlify 会根据 `netlify.toml` 自动识别这些设置。

## 备用部署方式：Netlify CLI

如果你本机已经安装 Node.js，也可以在这个文件夹里运行：

```bash
npm install
npx netlify deploy --prod
```

按提示选择或创建站点即可。

## 家长应该打开哪个链接

部署完成后，Netlify 会给你一个类似这样的链接：

```text
https://your-site-name.netlify.app/
```

你发给家长的是首页链接，不是游戏文件链接。

家长流程：

1. 打开首页。
2. 输入手机号登录。
3. 输入你给他的兑换码。
4. 点击进入游戏。

完整游戏入口是：

```text
https://your-site-name.netlify.app/play
```

没有登录和授权的人访问 `/play` 会被拦截。

## 测试兑换码

```text
TEST-2026
```

正式卖的时候建议删除或不用这个测试码，换成你自己生成的一批兑换码。

## 为什么不能只发小游戏 HTML

小游戏已经放在：

```text
protected-game/index.html
```

它不会作为静态网页直接公开。只有 `netlify/functions/play.js` 检查授权通过后，才会把游戏页面返回给用户。

## 数据保存在哪里

正式部署到 Netlify 后，账号、兑换码、设备绑定会保存在 Netlify Blobs 里。

本地测试时，会保存在：

```text
.local-data/db.json
```

## 下一步建议

上线前建议再加一个后台页面，用来批量生成兑换码、查看手机号、解绑设备、禁用授权。
