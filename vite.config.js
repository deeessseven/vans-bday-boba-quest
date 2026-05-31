import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function removeModuleType() {
  return {
    name: 'remove-module-type',
    transformIndexHtml(html) {
      return html.replace(/<script type="module" crossorigin/g, '<script');
    }
  };
}

function customArtPlugin() {
  const artDir = path.resolve(__dirname, 'public/custom-art');
  const virtualId = 'virtual:custom-art';
  const resolvedId = '\0' + virtualId;

  return {
    name: 'custom-art',
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      if (!fs.existsSync(artDir)) return 'export default {};';
      const entries = {};
      for (const f of fs.readdirSync(artDir)) {
        if (!f.endsWith('.png')) continue;
        const data = fs.readFileSync(path.join(artDir, f));
        entries[f] = `data:image/png;base64,${data.toString('base64')}`;
      }
      return `export default ${JSON.stringify(entries)};`;
    }
  };
}

export default defineConfig({
  plugins: [customArtPlugin(), removeModuleType()],
  base: './',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'GenericQuest',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  },
  server: {
    port: 3000
  }
});
