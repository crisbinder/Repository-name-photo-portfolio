import fs from "node:fs";
import path from "node:path";

export type Category = "风光" | "星空" | "人像" | "人文";

export type PhotoItem = {
  id: string;
  src: string;
  previewSrc: string;
  title: string;
  description: string;
  category: Category;
};

const categories: Category[] = ["风光", "星空", "人像", "人文"];
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
type CaptionMap = Record<string, { title?: string; description?: string }>;

const fallbackPhotos: PhotoItem[] = [
  {
    id: "demo-landscape",
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
    previewSrc: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2600&q=86",
    title: "山谷晨光",
    description: "雾气从山脊间升起，第一束光落在远处的树林。",
    category: "风光"
  },
  {
    id: "demo-stars",
    src: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=85",
    previewSrc: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=2600&q=86",
    title: "深空之下",
    description: "银河横跨夜空，冷色星光压低了地平线的轮廓。",
    category: "星空"
  },
  {
    id: "demo-portrait",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1600&q=85",
    previewSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=2600&q=86",
    title: "窗边人像",
    description: "柔和自然光进入室内，保留人物安静而直接的情绪。",
    category: "人像"
  },
  {
    id: "demo-humanity",
    src: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=85",
    previewSrc: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=2600&q=86",
    title: "街角日常",
    description: "城市的微小瞬间，人与空间在同一束光里相遇。",
    category: "人文"
  }
];

function prettifyName(fileName: string) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[-_]+/g, " ")
    .trim();
}

function getCaptions(photosRoot: string): CaptionMap {
  const captionsFile = path.join(photosRoot, "captions.json");

  if (!fs.existsSync(captionsFile)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(captionsFile, "utf8")) as CaptionMap;
  } catch {
    return {};
  }
}

function publicPath(...segments: string[]) {
  return `/${segments.map((segment) => segment.replaceAll("\\", "/")).join("/")}`;
}

export function getPhotos(): PhotoItem[] {
  const photosRoot = path.join(process.cwd(), "public", "photos");
  const previewRoot = path.join(process.cwd(), "public", "photos-large");
  const captions = getCaptions(photosRoot);
  const localPhotos = categories.flatMap((category) => {
    const categoryDir = path.join(photosRoot, category);

    if (!fs.existsSync(categoryDir)) {
      return [];
    }

    return fs
      .readdirSync(categoryDir)
      .filter((fileName) => imageExtensions.has(path.extname(fileName).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "zh-CN"))
      .map((fileName) => {
        const caption = captions[`${category}/${fileName}`] ?? {};
        const title = caption.title ?? prettifyName(fileName);

        return {
          id: `${category}-${fileName}`,
          src: publicPath("photos", category, fileName),
          previewSrc: fs.existsSync(path.join(previewRoot, category, fileName))
            ? publicPath("photos-large", category, fileName)
            : publicPath("photos", category, fileName),
          title,
          description: caption.description ?? `${category}摄影作品：${title}`,
          category
        };
      });
  });

  return localPhotos.length > 0 ? localPhotos : fallbackPhotos;
}
