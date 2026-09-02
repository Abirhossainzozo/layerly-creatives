#!/usr/bin/env node
/*
 build_psd.js - write a layered .psd from the layers.json produced by render_layers.py

 Usage:
   node build_psd.js <out_dir>/layers.json <output.psd>

 - image / shape / gradient layers  -> pixel layers (transparent areas trimmed)
 - text layers                      -> real editable Photoshop type layers (font, size, color,
                                       alignment, leading, tracking) + a pre-rendered bitmap so
                                       Photopea / GIMP show them immediately
 - "shadow"                         -> a real Drop Shadow layer effect (not baked pixels)
 - "group"                          -> layer folders (consecutive layers sharing a group name)

 Dependencies: ag-psd, pngjs - vendored in ./vendor (no install needed). If that folder is missing: `npm install` here.
*/
const fs = require('fs');
const path = require('path');

// Dependencies are vendored in ./vendor (no npm needed). NODE_PATH lets ag-psd find pako/base64-js there too.
const Module = require('module');
const vendorDir = path.join(__dirname, 'vendor');
process.env.NODE_PATH = vendorDir + (process.env.NODE_PATH ? path.delimiter + process.env.NODE_PATH : '');
Module._initPaths();

let agPsd, PNG;
try {
  agPsd = require('ag-psd');
  PNG = require('pngjs').PNG;
} catch (e) {
  console.error('Missing dependencies (./vendor not found). Run:  cd ' + __dirname + ' && npm install');
  process.exit(1);
}

// ag-psd normally wants node-canvas for cropping; a plain ImageData-like object is enough for us.
agPsd.initializeCanvas(
  () => { throw new Error('canvas operations are not needed by build_psd.js'); },
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })
);

const [,, manifestPath, outPath] = process.argv;
if (!manifestPath || !outPath) {
  console.error('Usage: node build_psd.js <out_dir>/layers.json <output.psd>');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const baseDir = path.dirname(path.resolve(manifestPath));
const W = manifest.width, H = manifest.height;

function readPng(rel) {
  const buf = fs.readFileSync(path.join(baseDir, rel));
  const png = PNG.sync.read(buf);
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length) };
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function dropShadowEffect(s) {
  return {
    dropShadow: [{
      present: true,
      showInDialog: true,
      enabled: true,
      blendMode: 'multiply',
      color: hexToRgb(s.color || '#000000'),
      opacity: s.opacity == null ? 0.5 : s.opacity,
      useGlobalLight: false,
      angle: s.angle == null ? 120 : s.angle,
      distance: { units: 'Pixels', value: s.distance == null ? 10 : s.distance },
      choke: { units: 'Pixels', value: 0 },
      size: { units: 'Pixels', value: s.size == null ? 20 : s.size },
      antialiased: false,
      layerConceals: true,
    }],
  };
}

function grayMask(rel) {
  const png = readPng(rel);
  return { width: png.width, height: png.height, data: png.data };
}

function makeLayer(entry) {
  const img = readPng(entry.file);
  const layer = {
    name: entry.name,
    top: 0, left: 0, bottom: img.height, right: img.width,
    imageData: img,
    opacity: entry.opacity == null ? 1 : entry.opacity,
    blendMode: entry.blend || 'normal',
    hidden: !!entry.hidden,
  };
  if (entry.mask) {
    const m = grayMask(entry.mask.file);
    layer.mask = { top: 0, left: 0, bottom: m.height, right: m.width, imageData: m, defaultColor: 255 };
  }
  if (entry.shadow) layer.effects = dropShadowEffect(entry.shadow);
  if (entry.type === 'text' && entry.text) {
    const t = entry.text;
    layer.text = {
      text: t.text,
      orientation: 'horizontal',
      transform: (function () {
        const deg = t.rotate || 0;
        if (!deg) return [1, 0, 0, 1, t.originX, t.baselineY];
        const a = -deg * Math.PI / 180;               // y-down: negative = same visual direction as the raster
        const c = Math.cos(a), sn = Math.sin(a);
        return [c, sn, -sn, c, t.originX, t.baselineY];
      })(),
      style: {
        font: { name: t.font || 'ArialMT' },
        fontSize: t.size,
        fillColor: hexToRgb(t.color || '#000000'),
        autoLeading: false,
        leading: t.leading,
        tracking: t.tracking || 0,
      },
      paragraphStyle: { justification: t.align === 'center' ? 'center' : t.align === 'right' ? 'right' : 'left' },
    };
  }
  return layer;
}

// Build children bottom -> top, folding consecutive same-group layers into folders.
const children = [];
let currentGroup = null;
for (const entry of manifest.layers) {
  const layer = makeLayer(entry);
  if (entry.group) {
    if (!currentGroup || currentGroup.name !== entry.group) {
      currentGroup = { name: entry.group, opened: true, children: [] };
      children.push(currentGroup);
    }
    currentGroup.children.push(layer);
  } else {
    currentGroup = null;
    children.push(layer);
  }
}

const psd = {
  width: W,
  height: H,
  channels: 3,
  bitsPerChannel: 8,
  colorMode: 3, // RGB
  imageResources: {
    resolutionInfo: {
      horizontalResolution: 72, horizontalResolutionUnit: 'PPI', widthUnit: 'Inches',
      verticalResolution: 72, verticalResolutionUnit: 'PPI', heightUnit: 'Inches',
    },
  },
  children,
};

if (manifest.composite) {
  try { psd.imageData = readPng(manifest.composite); } catch (e) { /* composite is optional */ }
}

const buffer = agPsd.writePsdBuffer(psd, { trimImageData: true, generateThumbnail: false, noBackground: true });
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, buffer);
const textCount = manifest.layers.filter(l => l.type === 'text').length;
console.log(`wrote ${outPath} (${(buffer.length / 1048576).toFixed(1)} MB, ${manifest.layers.length} layers, ${textCount} editable text layers)`);
