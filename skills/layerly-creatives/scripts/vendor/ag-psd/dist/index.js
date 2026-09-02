"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompositeCanvas = exports.getCompositeImageData = exports.getLayerRealMaskCanvas = exports.getLayerMaskCanvas = exports.getLayerCanvas = exports.getLayerRealMaskImageData = exports.getLayerMaskImageData = exports.getLayerImageData = exports.decodeLayerPixels = exports.byteArrayToBase64 = exports.initializeCanvas = void 0;
exports.readPsd = readPsd;
exports.writePsd = writePsd;
exports.writePsdUint8Array = writePsdUint8Array;
exports.writePsdBuffer = writePsdBuffer;
const psdWriter_1 = require("./psdWriter");
const psdReader_1 = require("./psdReader");
Object.defineProperty(exports, "decodeLayerPixels", { enumerable: true, get: function () { return psdReader_1.decodeLayerPixels; } });
Object.defineProperty(exports, "getLayerImageData", { enumerable: true, get: function () { return psdReader_1.getLayerImageData; } });
Object.defineProperty(exports, "getLayerMaskImageData", { enumerable: true, get: function () { return psdReader_1.getLayerMaskImageData; } });
Object.defineProperty(exports, "getLayerRealMaskImageData", { enumerable: true, get: function () { return psdReader_1.getLayerRealMaskImageData; } });
Object.defineProperty(exports, "getLayerCanvas", { enumerable: true, get: function () { return psdReader_1.getLayerCanvas; } });
Object.defineProperty(exports, "getLayerMaskCanvas", { enumerable: true, get: function () { return psdReader_1.getLayerMaskCanvas; } });
Object.defineProperty(exports, "getLayerRealMaskCanvas", { enumerable: true, get: function () { return psdReader_1.getLayerRealMaskCanvas; } });
Object.defineProperty(exports, "getCompositeImageData", { enumerable: true, get: function () { return psdReader_1.getCompositeImageData; } });
Object.defineProperty(exports, "getCompositeCanvas", { enumerable: true, get: function () { return psdReader_1.getCompositeCanvas; } });
const base64_js_1 = require("base64-js");
__exportStar(require("./abr"), exports);
__exportStar(require("./csh"), exports);
var helpers_1 = require("./helpers");
Object.defineProperty(exports, "initializeCanvas", { enumerable: true, get: function () { return helpers_1.initializeCanvas; } });
__exportStar(require("./psd"), exports);
exports.byteArrayToBase64 = base64_js_1.fromByteArray;
function readPsd(buffer, options) {
    const reader = 'buffer' in buffer ?
        (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
        (0, psdReader_1.createReader)(buffer);
    return (0, psdReader_1.readPsd)(reader, options);
}
function writePsd(psd, options) {
    const writer = (0, psdWriter_1.createWriter)();
    (0, psdWriter_1.writePsd)(writer, psd, options);
    return (0, psdWriter_1.getWriterBuffer)(writer);
}
function writePsdUint8Array(psd, options) {
    const writer = (0, psdWriter_1.createWriter)();
    (0, psdWriter_1.writePsd)(writer, psd, options);
    return (0, psdWriter_1.getWriterBufferNoCopy)(writer);
}
function writePsdBuffer(psd, options) {
    if (typeof Buffer === 'undefined') {
        throw new Error('Buffer not supported on this platform');
    }
    return Buffer.from(writePsdUint8Array(psd, options));
}
//# sourceMappingURL=index.js.map