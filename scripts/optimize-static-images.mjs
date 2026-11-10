import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = [
  {
    source: "public/images/stockvault-sharing-sharing-on-social-media-modern-communications269936.jpg",
    output: "public/images/footer-social-sharing.webp",
  },
  {
    source: "public/images/TJGQqBIoB8TE7nFx0yNv5FKE0KywI8NCXQPo9sPxTRz7GL3wDoS9X3Yr_oCbox8P1v8wsw95DLhOhb2y-lW2WxJs1DA_L2cAAF-nZee_Hn-9J0828avLeqAN2f8qhb8KqFGS3GL2-OSa4d93-JHwulzMfWmcdsoVmNITjKM0vOxcmD1BfCRX_o5Z5CcNJ8TW.jpg",
    output: "public/images/events-hero.webp",
  },
];

let sharp;
try {
  const sharpModule = await import("sharp");
  sharp = sharpModule.default ?? sharpModule;
} catch (error) {
  throw new Error(
    "The static-image build step requires the Sharp package. Install the locked optional Next.js Sharp dependency before building.",
    { cause: error },
  );
}

for (const asset of assets) {
  const sourcePath = resolve(projectRoot, asset.source);
  const outputPath = resolve(projectRoot, asset.output);

  if (!existsSync(sourcePath)) {
    throw new Error(`Required source image is missing: ${asset.source}`);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  const sourceBytes = statSync(sourcePath).size;
  const sourceMetadata = await sharp(sourcePath).metadata();
  const output = await sharp(sourcePath)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 90, effort: 5 })
    .toFile(outputPath);

  const savedBytes = Math.max(0, sourceBytes - output.size);
  const savedPercent = sourceBytes
    ? ((savedBytes / sourceBytes) * 100).toFixed(1)
    : "0.0";

  console.info(
    `[image-optimization] ${asset.source} (${sourceMetadata.width}x${sourceMetadata.height}) -> ${asset.output} (${output.width}x${output.height}): ${sourceBytes} -> ${output.size} bytes (${savedPercent}% smaller)`,
  );
}
