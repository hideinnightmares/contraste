/**
 * Corre después de `next build` (sitio estático en out/).
 *
 * 1. Genera las versiones WebP de cada foto propia en los anchos de
 *    src/config/images.ts. Las guarda en .cache/img/ y solo rehace las que
 *    cambiaron: en cada publicación se rearma todo el sitio y regenerar cientos de
 *    fotos sería tiempo de armado perdido.
 * 2. Escribe ads.txt solo si hay ID de editor de AdSense (nunca uno vacío o inventado).
 * 3. Controla el límite de archivos por versión del plan gratis de Cloudflare.
 *
 * Antes corrige un error de Next.js 16 al exportar en Windows (ver fixSegmentFilenames).
 */
import { copyFile, mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { IMAGE_QUALITY, IMAGE_WIDTHS, OWN_IMAGES_PREFIX, imageVariantPath } from '../src/config/images';
import { adsTxtLine } from '../src/config/ads';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'out');
const PUBLIC = path.join(ROOT, 'public');
const CACHE = path.join(ROOT, '.cache', 'img');
/** Plan gratis de Cloudflare Workers: archivos estáticos por versión. */
const MAX_FILES = 20_000;
const WARN_FILES = 16_000;
const SOURCE_EXT = /\.(jpe?g|png|webp)$/i;

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : Promise.resolve([path.join(dir, e.name)]))),
  );
  return nested.flat();
}

const mtime = (file: string) => stat(file).then((s) => s.mtimeMs, () => -1);

/**
 * Next.js guarda un archivo de datos por segmento de cada página, que el navegador
 * pide al navegar sin recargar: `nota/x/__next.nota.$d$slug.__PAGE__.txt`. Al
 * exportar en Windows arma ese nombre con `\` en lugar de `/`
 * (next/dist/export/index.js, convertSegmentPathToStaticExportFilename) y los
 * guarda en carpetas: `nota/x/__next.nota/$d$slug/__PAGE__.txt`. El navegador
 * recibe 404 y la navegación se demora. En Linux no pasa y esto no hace nada.
 */
async function fixSegmentFilenames() {
  let fixed = 0;
  async function visit(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (!entry.name.startsWith('__next.')) {
        await visit(full);
        continue;
      }
      for (const file of await walk(full)) {
        const flat = [entry.name, ...path.relative(full, file).split(path.sep)].join('.');
        await rename(file, path.join(dir, flat));
        fixed++;
      }
      await rm(full, { recursive: true });
    }
  }
  await visit(OUT);
  if (fixed > 0) console.log(`Next.js en Windows: ${fixed} archivos de navegación renombrados a su nombre correcto.`);
}

async function buildImageVariants() {
  const sources = (await walk(path.join(PUBLIC, OWN_IMAGES_PREFIX))).filter((f) => SOURCE_EXT.test(f));
  let generated = 0;
  let reused = 0;
  for (const source of sources) {
    const src = '/' + path.relative(PUBLIC, source).split(path.sep).join('/');
    const sourceTime = await mtime(source);
    for (const width of IMAGE_WIDTHS) {
      const rel = imageVariantPath(src, width).slice(1);
      const cached = path.join(CACHE, rel);
      if ((await mtime(cached)) < sourceTime) {
        await mkdir(path.dirname(cached), { recursive: true });
        await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: IMAGE_QUALITY }).toFile(cached);
        generated++;
      } else {
        reused++;
      }
      const target = path.join(OUT, rel);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(cached, target);
    }
  }
  console.log(`Fotos: ${sources.length} originales, ${generated} versiones generadas, ${reused} reutilizadas de la caché.`);
}

async function writeAdsTxt() {
  const line = adsTxtLine();
  if (!line) {
    console.log('ads.txt: no se publica (falta NEXT_PUBLIC_ADSENSE_CLIENT).');
    return;
  }
  await writeFile(path.join(OUT, 'ads.txt'), `${line}\n`, 'utf8');
  console.log('ads.txt: publicado.');
}

async function checkFileCount() {
  // _headers y _redirects son configuración de Cloudflare, no archivos servidos.
  const files = (await walk(OUT)).filter((f) => !/[\\/]_(headers|redirects)$/.test(f));
  const sizes = await Promise.all(files.map((f) => stat(f).then((s) => s.size)));
  const megabytes = sizes.reduce((a, b) => a + b, 0) / 1_048_576;
  console.log(`Sitio: ${files.length} archivos, ${megabytes.toFixed(1)} MB.`);
  if (files.length > MAX_FILES) {
    throw new Error(
      `El sitio tiene ${files.length} archivos y el plan gratis de Cloudflare acepta ${MAX_FILES} por versión. Ver docs/DESPLIEGUE.md, "Límites".`,
    );
  }
  if (files.length > WARN_FILES) {
    console.warn(`Atención: ${files.length} de ${MAX_FILES} archivos permitidos por el plan gratis de Cloudflare.`);
  }
}

async function main() {
  if ((await mtime(OUT)) < 0) throw new Error('No existe out/: corré `next build` antes.');
  await fixSegmentFilenames();
  await buildImageVariants();
  await writeAdsTxt();
  await checkFileCount();
}

main().catch((error: unknown) => {
  console.error('El armado posterior falló:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
