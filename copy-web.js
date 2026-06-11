// copy-web.js — Genera la carpeta www/ que Capacitor empaqueta en la app nativa.
// La FUENTE DE VERDAD es la raíz del repo (lo que GitHub Pages sirve en apagonesmid.mx).
// Este script copia solo los archivos web a www/, dejando fuera lo que es del proyecto
// (node_modules, ios, configs, etc.). www/ es generado y está en .gitignore.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'www');

// No copiar estos (no son parte de la web servida)
const BLOCK = new Set([
  'node_modules', 'ios', 'www', '.git', '.github',
  'package.json', 'package-lock.json', 'capacitor.config.json',
  'copy-web.js', '.gitignore', 'README.md', '.DS_Store',
]);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let count = 0;
function copyInto(srcDir, dstDir) {
  for (const name of fs.readdirSync(srcDir)) {
    if (srcDir === ROOT && BLOCK.has(name)) continue;
    if (name === '.DS_Store') continue;
    const src = path.join(srcDir, name);
    const dst = path.join(dstDir, name);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      copyInto(src, dst);
    } else {
      fs.copyFileSync(src, dst);
      count++;
    }
  }
}

copyInto(ROOT, OUT);
console.log(`✓ www/ generado con ${count} archivos web`);
