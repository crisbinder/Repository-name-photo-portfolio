# 摄影作品集网站

这是一个 Next.js + GitHub + Vercel 免费部署方案的摄影作品集模板。

## 本地启动

```bash
npm install
npm run dev
```

打开 `http://localhost:3000` 查看网站。

## 上传照片与压缩

推荐不要直接把 10MB 原图放到网页展示目录。正确流程是：

```text
public/photos-original/风光      原图
public/photos-original/星空      原图
public/photos-original/人像      原图
public/photos-original/人文      原图
```

然后运行：

```bash
npm run optimize-images
```

脚本会自动生成：

```text
public/photos/分类名             网页列表展示图，约 1500px 宽
public/photos-large/分类名       点击放大预览图，约 2600px 宽
```

网页列表会加载 `public/photos` 里的小图，点击放大时会加载 `public/photos-large` 里的大预览图。

## 手动上传照片

把图片放进对应分类文件夹：

```text
public/photos/风光
public/photos/星空
public/photos/人像
public/photos/人文
```

支持 `.jpg`、`.jpeg`、`.png`、`.webp`、`.avif`。

图片标题会自动使用文件名，例如：

```text
public/photos/风光/mountain-sunrise.jpg
```

页面会显示为 `mountain sunrise`。如果文件夹中没有图片，网站会显示内置示例图。

如需自定义标题和介绍，编辑：

```text
public/photos/captions.json
```

格式如下：

```json
{
  "风光/mountain-sunrise.jpg": {
    "title": "山谷晨光",
    "description": "清晨的第一束光越过山脊，雾气停留在树林上方。"
  }
}
```

## 免费部署到 Vercel

1. 新建 GitHub 仓库。
2. 把这个项目推送到 GitHub。
3. 打开 `https://vercel.com/`，用 GitHub 登录。
4. 点击 `Add New Project`，导入这个仓库。
5. Framework Preset 选择 `Next.js`。
6. 点击 `Deploy`。
7. 部署完成后会得到一个 `.vercel.app` 免费网址。

以后新增照片时，把图片放进分类文件夹，提交并推送到 GitHub，Vercel 会自动重新部署。

## 网站推送更新：
```bash
git add .
git commit -m "update portfolio"
git push
```