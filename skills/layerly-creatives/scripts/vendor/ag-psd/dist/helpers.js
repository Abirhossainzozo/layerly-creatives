"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageData = exports.createCanvas = exports.MaskParams = exports.LayerMaskFlags = exports.ColorSpace = exports.largeAdditionalInfoKeys = exports.layerColors = exports.toBlendMode = exports.fromBlendMode = exports.RAW_IMAGE_DATA = exports.MOCK_HANDLERS = void 0;
exports.revMap = revMap;
exports.createEnum = createEnum;
exports.offsetForChannel = offsetForChannel;
exports.clamp = clamp;
exports.hasAlpha = hasAlpha;
exports.resetImageData = resetImageData;
exports.imageDataToCanvas = imageDataToCanvas;
exports.decodeBitmap = decodeBitmap;
exports.writeDataRaw = writeDataRaw;
exports.writeDataRLE = writeDataRLE;
exports.writeDataZipWithoutPrediction = writeDataZipWithoutPrediction;
exports.createCanvasFromData = createCanvasFromData;
exports.initializeCanvas = initializeCanvas;
const pako_1 = require("pako");
const jpeg_1 = require("./jpeg");
exports.MOCK_HANDLERS = false;
exports.RAW_IMAGE_DATA = false;
exports.fromBlendMode = {};
exports.toBlendMode = {
    'pass': 'pass through',
    'norm': 'normal',
    'diss': 'dissolve',
    'dark': 'darken',
    'mul ': 'multiply',
    'idiv': 'color burn',
    'lbrn': 'linear burn',
    'dkCl': 'darker color',
    'lite': 'lighten',
    'scrn': 'screen',
    'div ': 'color dodge',
    'lddg': 'linear dodge',
    'lgCl': 'lighter color',
    'over': 'overlay',
    'sLit': 'soft light',
    'hLit': 'hard light',
    'vLit': 'vivid light',
    'lLit': 'linear light',
    'pLit': 'pin light',
    'hMix': 'hard mix',
    'diff': 'difference',
    'smud': 'exclusion',
    'fsub': 'subtract',
    'fdiv': 'divide',
    'hue ': 'hue',
    'sat ': 'saturation',
    'colr': 'color',
    'lum ': 'luminosity',
};
Object.keys(exports.toBlendMode).forEach(key => exports.fromBlendMode[exports.toBlendMode[key]] = key);
exports.layerColors = [
    'none', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray'
];
exports.largeAdditionalInfoKeys = [
    // from documentation
    'LMsk', 'Lr16', 'Lr32', 'Layr', 'Mt16', 'Mt32', 'Mtrn', 'Alph', 'FMsk', 'lnk2', 'FEid', 'FXid', 'PxSD',
    // from guessing
    'cinf',
];
function revMap(map) {
    const result = {};
    Object.keys(map).forEach(key => result[map[key]] = key);
    return result;
}
function createEnum(prefix, def, map) {
    const rev = revMap(map);
    const decode = (val) => {
        const value = val.split('.')[1];
        if (value && !rev[value]) {
            // Photoshop 2026 writes the long-form enum value instead of the historical 4-char code
            // (the map VALUE, e.g. 'BlnM.Nrml'). Two long-form shapes occur:
            //  - single-word modes use the map KEY verbatim:        'BlnM.normal'
            //  - multi-word modes use a camelCase id whose map key is space-separated:
            //    'BlnM.colorBurn' -> 'color burn'; normalize camelCase before giving up.
            if (Object.prototype.hasOwnProperty.call(map, value))
                return value;
            const spaced = value.replace(/([A-Z])/g, ' $1').toLowerCase();
            if (Object.prototype.hasOwnProperty.call(map, spaced))
                return spaced;
            throw new Error(`Unrecognized value for enum: '${val}'`);
        }
        return rev[value] || def;
    };
    const encode = (val) => {
        if (val && !map[val])
            throw new Error(`Invalid value for enum: '${val}'`);
        return `${prefix}.${val ? map[val] : map[def]}`;
    };
    return { decode, encode };
}
var ColorSpace;
(function (ColorSpace) {
    ColorSpace[ColorSpace["RGB"] = 0] = "RGB";
    ColorSpace[ColorSpace["HSB"] = 1] = "HSB";
    ColorSpace[ColorSpace["CMYK"] = 2] = "CMYK";
    ColorSpace[ColorSpace["Lab"] = 7] = "Lab";
    ColorSpace[ColorSpace["Grayscale"] = 8] = "Grayscale";
})(ColorSpace || (exports.ColorSpace = ColorSpace = {}));
var LayerMaskFlags;
(function (LayerMaskFlags) {
    LayerMaskFlags[LayerMaskFlags["PositionRelativeToLayer"] = 1] = "PositionRelativeToLayer";
    LayerMaskFlags[LayerMaskFlags["LayerMaskDisabled"] = 2] = "LayerMaskDisabled";
    LayerMaskFlags[LayerMaskFlags["InvertLayerMaskWhenBlending"] = 4] = "InvertLayerMaskWhenBlending";
    LayerMaskFlags[LayerMaskFlags["LayerMaskFromRenderingOtherData"] = 8] = "LayerMaskFromRenderingOtherData";
    LayerMaskFlags[LayerMaskFlags["MaskHasParametersAppliedToIt"] = 16] = "MaskHasParametersAppliedToIt";
})(LayerMaskFlags || (exports.LayerMaskFlags = LayerMaskFlags = {}));
var MaskParams;
(function (MaskParams) {
    MaskParams[MaskParams["UserMaskDensity"] = 1] = "UserMaskDensity";
    MaskParams[MaskParams["UserMaskFeather"] = 2] = "UserMaskFeather";
    MaskParams[MaskParams["VectorMaskDensity"] = 4] = "VectorMaskDensity";
    MaskParams[MaskParams["VectorMaskFeather"] = 8] = "VectorMaskFeather";
})(MaskParams || (exports.MaskParams = MaskParams = {}));
function offsetForChannel(channelId, cmyk) {
    switch (channelId) {
        case 0 /* ChannelID.Color0 */: return 0;
        case 1 /* ChannelID.Color1 */: return 1;
        case 2 /* ChannelID.Color2 */: return 2;
        case 3 /* ChannelID.Color3 */: return cmyk ? 3 : channelId + 1;
        case -1 /* ChannelID.Transparency */: return cmyk ? 4 : 3;
        default: return channelId + 1;
    }
}
function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
}
function hasAlpha(data) {
    const size = data.width * data.height * 4;
    for (let i = 3; i < size; i += 4) {
        if (data.data[i] !== 255) {
            return true;
        }
    }
    return false;
}
function resetImageData({ data }) {
    const alpha = (data instanceof Float32Array) ? 1.0 : ((data instanceof Uint16Array) ? 0xffff : 0xff);
    for (let p = 0, size = data.length | 0; p < size; p = (p + 4) | 0) {
        data[p + 0] = 0;
        data[p + 1] = 0;
        data[p + 2] = 0;
        data[p + 3] = alpha;
    }
}
function imageDataToCanvas(pixelData) {
    const canvas = (0, exports.createCanvas)(pixelData.width, pixelData.height);
    let imageData;
    if (pixelData.data instanceof Uint8ClampedArray) {
        imageData = pixelData;
    }
    else {
        imageData = (0, exports.createImageData)(pixelData.width, pixelData.height);
        const src = pixelData.data;
        const dst = imageData.data;
        if (src instanceof Float32Array) {
            for (let i = 0, size = src.length; i < size; i += 4) {
                dst[i + 0] = Math.round(Math.pow(src[i + 0], 1.0 / 2.2) * 255);
                dst[i + 1] = Math.round(Math.pow(src[i + 1], 1.0 / 2.2) * 255);
                dst[i + 2] = Math.round(Math.pow(src[i + 2], 1.0 / 2.2) * 255);
                dst[i + 3] = Math.round(src[i + 3] * 255);
            }
        }
        else {
            const shift = (src instanceof Uint16Array) ? 8 : 0;
            for (let i = 0, size = src.length; i < size; i++) {
                dst[i] = src[i] >>> shift;
            }
        }
    }
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    return canvas;
}
function decodeBitmap(input, output, width, height) {
    if (!(input instanceof Uint8Array || input instanceof Uint8ClampedArray))
        throw new Error('Invalid bit depth');
    for (let y = 0, p = 0, o = 0; y < height; y++) {
        for (let x = 0; x < width;) {
            let b = input[o++];
            for (let i = 0; i < 8 && x < width; i++, x++, p += 4) {
                const v = b & 0x80 ? 0 : 255;
                b = b << 1;
                output[p + 0] = v;
                output[p + 1] = v;
                output[p + 2] = v;
                output[p + 3] = 255;
            }
        }
    }
}
function writeDataRaw(data, offset, width, height) {
    if (!width || !height)
        return undefined;
    const array = new Uint8Array(width * height);
    for (let i = 0; i < array.length; i++) {
        array[i] = data.data[i * 4 + offset];
    }
    return array;
}
function writeDataRLE(buffer, { data, width, height }, offsets, large) {
    if (!width || !height)
        return undefined;
    const stride = (4 * width) | 0;
    let ol = 0;
    let o = (offsets.length * (large ? 4 : 2) * height) | 0;
    for (const offset of offsets) {
        for (let y = 0, p = offset | 0; y < height; y++) {
            const strideStart = (y * stride) | 0;
            const strideEnd = (strideStart + stride) | 0;
            const lastIndex = (strideEnd + offset - 4) | 0;
            const lastIndex2 = (lastIndex - 4) | 0;
            const startOffset = o;
            for (p = (strideStart + offset) | 0; p < strideEnd; p = (p + 4) | 0) {
                if (p < lastIndex2) {
                    let value1 = data[p];
                    p = (p + 4) | 0;
                    let value2 = data[p];
                    p = (p + 4) | 0;
                    let value3 = data[p];
                    if (value1 === value2 && value1 === value3) {
                        let count = 3;
                        while (count < 128 && p < lastIndex && data[(p + 4) | 0] === value1) {
                            count = (count + 1) | 0;
                            p = (p + 4) | 0;
                        }
                        buffer[o++] = 1 - count;
                        buffer[o++] = value1;
                    }
                    else {
                        const countIndex = o;
                        let writeLast = true;
                        let count = 1;
                        buffer[o++] = 0;
                        buffer[o++] = value1;
                        while (p < lastIndex && count < 128) {
                            p = (p + 4) | 0;
                            value1 = value2;
                            value2 = value3;
                            value3 = data[p];
                            if (value1 === value2 && value1 === value3) {
                                p = (p - 12) | 0;
                                writeLast = false;
                                break;
                            }
                            else {
                                count++;
                                buffer[o++] = value1;
                            }
                        }
                        if (writeLast) {
                            if (count < 127) {
                                buffer[o++] = value2;
                                buffer[o++] = value3;
                                count += 2;
                            }
                            else if (count < 128) {
                                buffer[o++] = value2;
                                count++;
                                p = (p - 4) | 0;
                            }
                            else {
                                p = (p - 8) | 0;
                            }
                        }
                        buffer[countIndex] = count - 1;
                    }
                }
                else if (p === lastIndex) {
                    buffer[o++] = 0;
                    buffer[o++] = data[p];
                }
                else { // p === lastIndex2
                    buffer[o++] = 1;
                    buffer[o++] = data[p];
                    p = (p + 4) | 0;
                    buffer[o++] = data[p];
                }
            }
            const length = o - startOffset;
            if (large) {
                buffer[ol++] = (length >> 24) & 0xff;
                buffer[ol++] = (length >> 16) & 0xff;
            }
            buffer[ol++] = (length >> 8) & 0xff;
            buffer[ol++] = length & 0xff;
        }
    }
    return buffer.slice(0, o);
}
function writeDataZipWithoutPrediction({ data, width, height }, offsets) {
    const size = width * height;
    const channel = new Uint8Array(size);
    const buffers = [];
    let totalLength = 0;
    for (const offset of offsets) {
        for (let i = 0, o = offset; i < size; i++, o += 4) {
            channel[i] = data[o];
        }
        const buffer = (0, pako_1.deflate)(channel);
        buffers.push(buffer);
        totalLength += buffer.byteLength;
    }
    if (buffers.length > 0) {
        const buffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const b of buffers) {
            buffer.set(b, offset);
            offset += b.byteLength;
        }
        return buffer;
    }
    else {
        return buffers[0];
    }
}
function createCanvasFromData(data) {
    const canvas = (0, exports.createCanvas)(100, 100);
    try {
        const context = canvas.getContext('2d');
        const imageData = (0, jpeg_1.decodeJpeg)(data, (w, h) => context.createImageData(w, h));
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        context.putImageData(imageData, 0, 0);
    }
    catch (e) {
        console.error('JPEG decompression error', e.message);
    }
    return canvas;
}
let createCanvas = () => {
    throw new Error('Canvas not initialized, use initializeCanvas method to set up createCanvas method');
};
exports.createCanvas = createCanvas;
let tempCanvas = undefined;
let createImageData = (width, height) => {
    if (!tempCanvas)
        tempCanvas = (0, exports.createCanvas)(1, 1);
    return tempCanvas.getContext('2d').createImageData(width, height);
};
exports.createImageData = createImageData;
if (typeof document !== 'undefined') {
    exports.createCanvas = (width, height) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    };
}
function initializeCanvas(createCanvasMethod, createImageDataMethod) {
    exports.createCanvas = createCanvasMethod;
    exports.createImageData = createImageDataMethod || exports.createImageData;
}
//# sourceMappingURL=helpers.js.map