import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const categories = ["风光", "星空", "人像", "人文"];
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);

const projectRoot = process.cwd();
const originalRoot = path.join(projectRoot, "public", "photos-original");
const webRoot = path.join(projectRoot, "public", "photos");
const largeRoot = path.join(projectRoot, "public", "photos-large");

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function outputName(fileName) {
  return `${path.parse(fileName).name}.webp`;
}

async function needsOptimize(inputPath, webOutputPath, largeOutputPath) {
  if (!(await exists(webOutputPath)) || !(await exists(largeOutputPath))) {
    return true;
  }

  const [inputStat, webStat, largeStat] = await Promise.all([
    fs.stat(inputPath),
    fs.stat(webOutputPath),
    fs.stat(largeOutputPath)
  ]);

  return webStat.mtimeMs < inputStat.mtimeMs || largeStat.mtimeMs < inputStat.mtimeMs;
}

async function optimizeImage(inputPath, webOutputPath, largeOutputPath) {
  const image = sharp(inputPath, { failOn: "none" }).rotate();

  await image
    .clone()
    .resize({ width: 1500, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(webOutputPath);

  await image
    .clone()
    .resize({ width: 2600, withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toFile(largeOutputPath);
}

async function main() {
  if (!(await exists(originalRoot))) {
    await ensureDir(originalRoot);
  }

  let count = 0;
  let skipped = 0;

  for (const category of categories) {
    const sourceDir = path.join(originalRoot, category);
    const webDir = path.join(webRoot, category);
    const largeDir = path.join(largeRoot, category);

    await ensureDir(sourceDir);
    await ensureDir(webDir);
    await ensureDir(largeDir);

    const files = await fs.readdir(sourceDir);
    const images = files.filter((file) => imageExtensions.has(path.extname(file).toLowerCase()));

    for (const fileName of images) {
      const inputPath = path.join(sourceDir, fileName);
      const webOutputPath = path.join(webDir, outputName(fileName));
      const largeOutputPath = path.join(largeDir, outputName(fileName));

      if (!(await needsOptimize(inputPath, webOutputPath, largeOutputPath))) {
        skipped += 1;
        console.log(`Skipped ${category}/${fileName}`);
        continue;
      }

      await optimizeImage(inputPath, webOutputPath, largeOutputPath);
      count += 1;
      console.log(`Optimized ${category}/${fileName} -> ${outputName(fileName)}`);
    }
  }

  console.log(`Done. Optimized ${count} image${count === 1 ? "" : "s"}, skipped ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
