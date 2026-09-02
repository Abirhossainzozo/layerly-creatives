"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportedColorModes = void 0;
exports.createReader = createReader;
exports.warnOrThrow = warnOrThrow;
exports.readUint8 = readUint8;
exports.peekUint8 = peekUint8;
exports.readInt16 = readInt16;
exports.readUint16 = readUint16;
exports.readUint16LE = readUint16LE;
exports.readInt32 = readInt32;
exports.readInt32LE = readInt32LE;
exports.readUint32 = readUint32;
exports.readFloat32 = readFloat32;
exports.readFloat64 = readFloat64;
exports.readFixedPoint32 = readFixedPoint32;
exports.readFixedPointPath32 = readFixedPointPath32;
exports.readBytes = readBytes;
exports.readSignature = readSignature;
exports.validSignatureAt = validSignatureAt;
exports.readPascalString = readPascalString;
exports.readUnicodeString = readUnicodeString;
exports.readUnicodeStringWithLength = readUnicodeStringWithLength;
exports.readUnicodeStringWithLengthLE = readUnicodeStringWithLengthLE;
exports.readAsciiString = readAsciiString;
exports.skipBytes = skipBytes;
exports.checkSignature = checkSignature;
exports.readPsd = readPsd;
exports.readLayerInfo = readLayerInfo;
exports.getCompositeImageData = getCompositeImageData;
exports.getCompositeCanvas = getCompositeCanvas;
exports.getLayerImageData = getLayerImageData;
exports.getLayerMaskImageData = getLayerMaskImageData;
exports.getLayerRealMaskImageData = getLayerRealMaskImageData;
exports.getLayerCanvas = getLayerCanvas;
exports.getLayerMaskCanvas = getLayerMaskCanvas;
exports.getLayerRealMaskCanvas = getLayerRealMaskCanvas;
exports.decodeLayerPixels = decodeLayerPixels;
exports.readGlobalLayerMaskInfo = readGlobalLayerMaskInfo;
exports.readAdditionalLayerInfo = readAdditionalLayerInfo;
exports.readDataZip = readDataZip;
exports.readDataRLE = readDataRLE;
exports.readSection = readSection;
exports.readColor = readColor;
exports.readPattern = readPattern;
const pako_1 = require("pako");
const helpers_1 = require("./helpers");
const additionalInfo_1 = require("./additionalInfo");
const imageResources_1 = require("./imageResources");
exports.supportedColorModes = [0 /* ColorMode.Bitmap */, 1 /* ColorMode.Grayscale */, 3 /* ColorMode.RGB */, 2 /* ColorMode.Indexed */];
const colorModes = ['bitmap', 'grayscale', 'indexed', 'RGB', 'CMYK', '', '', 'multichannel', 'duotone', 'lab'];
function setupGrayscale(data) {
    const size = data.width * data.height * 4;
    for (let i = 0; i < size; i += 4) {
        const c = data.data[i];
        data.data[i + 1] = c;
        data.data[i + 2] = c;
    }
}
function createReader(buffer, offset, length) {
    const view = new DataView(buffer, offset, length);
    return { view, offset: 0, strict: false, debug: false, large: false, globalAlpha: false, log: console.log };
}
function warnOrThrow(reader, message) {
    if (reader.strict)
        throw new Error(message);
    if (reader.debug)
        reader.log(message);
}
function readUint8(reader) {
    reader.offset += 1;
    return reader.view.getUint8(reader.offset - 1);
}
function peekUint8(reader) {
    return reader.view.getUint8(reader.offset);
}
function readInt16(reader) {
    reader.offset += 2;
    return reader.view.getInt16(reader.offset - 2, false);
}
function readUint16(reader) {
    reader.offset += 2;
    return reader.view.getUint16(reader.offset - 2, false);
}
function readUint16LE(reader) {
    reader.offset += 2;
    return reader.view.getUint16(reader.offset - 2, true);
}
function readInt32(reader) {
    reader.offset += 4;
    return reader.view.getInt32(reader.offset - 4, false);
}
function readInt32LE(reader) {
    reader.offset += 4;
    return reader.view.getInt32(reader.offset - 4, true);
}
function readUint32(reader) {
    reader.offset += 4;
    return reader.view.getUint32(reader.offset - 4, false);
}
function readFloat32(reader) {
    reader.offset += 4;
    return reader.view.getFloat32(reader.offset - 4, false);
}
function readFloat64(reader) {
    reader.offset += 8;
    return reader.view.getFloat64(reader.offset - 8, false);
}
// 32-bit fixed-point number 16.16
function readFixedPoint32(reader) {
    return readInt32(reader) / (1 << 16);
}
// 32-bit fixed-point number 8.24
function readFixedPointPath32(reader) {
    return readInt32(reader) / (1 << 24);
}
function readBytes(reader, length) {
    const start = reader.view.byteOffset + reader.offset;
    reader.offset += length;
    if ((start + length) > reader.view.buffer.byteLength) {
        // fix for broken PSD files that are missing part of file at the end
        warnOrThrow(reader, 'Reading bytes exceeding buffer length');
        if (length > (100 * 1024 * 1024))
            throw new Error('Reading past end of file'); // limit to 100MB
        const result = new Uint8Array(length);
        const len = Math.min(length, reader.view.byteLength - start);
        if (len > 0)
            result.set(new Uint8Array(reader.view.buffer, start, len));
        return result;
    }
    else {
        return new Uint8Array(reader.view.buffer, start, length);
    }
}
function readSignature(reader) {
    return readShortString(reader, 4);
}
function validSignatureAt(reader, offset) {
    const sig = String.fromCharCode(reader.view.getUint8(offset))
        + String.fromCharCode(reader.view.getUint8(offset + 1))
        + String.fromCharCode(reader.view.getUint8(offset + 2))
        + String.fromCharCode(reader.view.getUint8(offset + 3));
    return sig == '8BIM' || sig == '8B64';
}
function readPascalString(reader, padTo) {
    let length = readUint8(reader);
    const text = length ? readShortString(reader, length) : '';
    while (++length % padTo) { // starts with length + 1 so we count the size byte too
        reader.offset++;
    }
    return text;
}
function readUnicodeString(reader) {
    const length = readUint32(reader);
    return readUnicodeStringWithLength(reader, length);
}
function readUnicodeStringWithLength(reader, length) {
    let text = '';
    while (length--) {
        const value = readUint16(reader);
        if (value || length > 0) { // remove trailing \0
            text += String.fromCharCode(value);
        }
    }
    return text;
}
function readUnicodeStringWithLengthLE(reader, length) {
    let text = '';
    while (length--) {
        const value = readUint16LE(reader);
        if (value || length > 0) { // remove trailing \0
            text += String.fromCharCode(value);
        }
    }
    return text;
}
function readAsciiString(reader, length) {
    let text = '';
    while (length--) {
        text += String.fromCharCode(readUint8(reader));
    }
    return text;
}
function skipBytes(reader, count) {
    reader.offset += count;
}
function checkSignature(reader, a, b) {
    const offset = reader.offset;
    const signature = readSignature(reader);
    if (signature !== a && signature !== b) {
        throw new Error(`Invalid signature: '${signature}' at 0x${offset.toString(16)}`);
    }
}
function readShortString(reader, length) {
    const buffer = readBytes(reader, length);
    let result = '';
    for (let i = 0; i < buffer.length; i++) {
        result += String.fromCharCode(buffer[i]);
    }
    return result;
}
function isValidSignature(sig) {
    return sig === '8BIM' || sig === 'MeSa' || sig === 'AgHg' || sig === 'PHUT' || sig === 'DCSR';
}
function readPsd(reader, readOptions = {}) {
    var _a;
    // header
    checkSignature(reader, '8BPS');
    const version = readUint16(reader);
    if (version !== 1 && version !== 2)
        throw new Error(`Invalid PSD file version: ${version}`);
    skipBytes(reader, 6);
    const channels = readUint16(reader);
    const height = readUint32(reader);
    const width = readUint32(reader);
    const bitsPerChannel = readUint16(reader);
    const colorMode = readUint16(reader);
    const maxSize = version === 1 ? 30000 : 300000;
    if (width > maxSize || height > maxSize)
        throw new Error(`Invalid size: ${width}x${height}`);
    if (channels > 16)
        throw new Error(`Invalid channel count: ${channels}`);
    if (![1, 8, 16, 32].includes(bitsPerChannel))
        throw new Error(`Invalid bitsPerChannel: ${bitsPerChannel}`);
    if (exports.supportedColorModes.indexOf(colorMode) === -1)
        throw new Error(`Color mode not supported: ${(_a = colorModes[colorMode]) !== null && _a !== void 0 ? _a : colorMode}`);
    const psd = { width, height, channels, bitsPerChannel, colorMode };
    Object.assign(reader, readOptions);
    reader.large = version === 2;
    reader.globalAlpha = false;
    if (!('totalMemoryLimit' in reader)) { // setting totalMemoryLimit to undefined explicitly disables memory limit
        reader.totalMemoryLimit = 2 * 1024 * 1024 * 1024; // default 2GB memory limit
    }
    // color mode data
    readSection(reader, 1, left => {
        if (!left())
            return;
        if (colorMode === 2 /* ColorMode.Indexed */) {
            // should have 256 colors here saved as 8bit channels RGB
            if (left() != 768)
                throw new Error('Invalid color palette size');
            psd.palette = [];
            for (let i = 0; i < 256; i++)
                psd.palette.push({ r: readUint8(reader), g: 0, b: 0 });
            for (let i = 0; i < 256; i++)
                psd.palette[i].g = readUint8(reader);
            for (let i = 0; i < 256; i++)
                psd.palette[i].b = readUint8(reader);
        }
        else {
            // TODO: unknown format for duotone, also seems to have some data here for 32bit colors
            // if (options.throwForMissingFeatures) throw new Error('Color mode data not supported');
        }
        skipBytes(reader, left());
    });
    // image resources
    const imageResources = {};
    readSection(reader, 1, left => {
        while (left() > 0) {
            realignWithSignature(reader, isValidSignature);
            const id = readUint16(reader);
            readPascalString(reader, 2); // name
            readSection(reader, 2, left => {
                const handler = imageResources_1.resourceHandlersMap[id];
                const skip = id === 1036 && !!reader.skipThumbnail;
                if (handler && !skip) {
                    try {
                        handler.read(reader, imageResources, left);
                    }
                    catch (e) {
                        if (reader.throwForMissingFeatures)
                            throw e;
                        skipBytes(reader, left());
                    }
                }
                else {
                    // options.logMissingFeatures && console.log(`Unhandled image resource: ${id} (${left()})`);
                    skipBytes(reader, left());
                }
            });
        }
    });
    const { layersGroup, layerGroupsEnabledId } = imageResources, rest = __rest(imageResources, ["layersGroup", "layerGroupsEnabledId"]);
    if (Object.keys(rest).length) {
        psd.imageResources = rest;
    }
    // layer and mask info
    readSection(reader, 1, left => {
        readSection(reader, 2, left => {
            readLayerInfo(reader, psd, imageResources);
            skipBytes(reader, left());
        }, undefined, reader.large);
        // SAI does not include this section
        if (left() > 0) {
            const globalLayerMaskInfo = readGlobalLayerMaskInfo(reader);
            if (globalLayerMaskInfo)
                psd.globalLayerMaskInfo = globalLayerMaskInfo;
        }
        else {
            // revert back to end of section if exceeded section limits
            // opt.logMissingFeatures && console.log('reverting to end of section');
            skipBytes(reader, left());
        }
        while (left() > 0) {
            // sometimes there are empty bytes here
            while (left() && peekUint8(reader) === 0) {
                // opt.logMissingFeatures && console.log('skipping 0 byte');
                skipBytes(reader, 1);
            }
            if (left() >= 12) {
                readAdditionalLayerInfo(reader, psd, psd, imageResources);
            }
            else {
                // opt.logMissingFeatures && console.log('skipping leftover bytes', left());
                skipBytes(reader, left());
            }
        }
    }, undefined, reader.large);
    const hasChildren = psd.children && psd.children.length;
    const skipComposite = reader.skipCompositeImageData && (reader.skipLayerImageData || hasChildren);
    if (!skipComposite) {
        if (reader.useRawData) {
            psd.rawCompositeData = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset);
        }
        else {
            const imageData = readImageData(reader, psd);
            if (reader.useImageData) {
                psd.imageData = imageData;
            }
            else {
                psd.canvas = (0, helpers_1.imageDataToCanvas)(imageData);
            }
        }
    }
    // TODO: show converted color mode instead of original PSD file color mode
    //       but add option to preserve file color mode (need to return image data instead of canvas in that case)
    // psd.colorMode = ColorMode.RGB; // we convert all color modes to RGB
    return psd;
}
function readLayerInfo(reader, psd, imageResources) {
    var _a, _b;
    const { layersGroup = [], layerGroupsEnabledId = [] } = imageResources;
    let layerCount = readInt16(reader);
    if (layerCount < 0) {
        reader.globalAlpha = true;
        layerCount = -layerCount;
    }
    const layers = [];
    const layerChannels = [];
    for (let i = 0; i < layerCount; i++) {
        const { layer, channels } = readLayerRecord(reader, psd, imageResources);
        if (layersGroup[i] !== undefined)
            layer.linkGroup = layersGroup[i];
        if (layerGroupsEnabledId[i] !== undefined)
            layer.linkGroupEnabled = !!layerGroupsEnabledId[i];
        layers.push(layer);
        layerChannels.push(channels);
    }
    for (let i = 0; i < layerCount; i++) {
        readLayerChannelImageData(reader, psd, layers[i], layerChannels[i]);
    }
    if (!psd.children)
        psd.children = [];
    const stack = [psd];
    for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        const type = l.sectionDivider ? l.sectionDivider.type : 0 /* SectionDividerType.Other */;
        if (type === 1 /* SectionDividerType.OpenFolder */ || type === 2 /* SectionDividerType.ClosedFolder */) {
            l.opened = type === 1 /* SectionDividerType.OpenFolder */;
            l.children = [];
            if ((_a = l.sectionDivider) === null || _a === void 0 ? void 0 : _a.key) {
                l.blendMode = (_b = helpers_1.toBlendMode[l.sectionDivider.key]) !== null && _b !== void 0 ? _b : l.blendMode;
            }
            stack[stack.length - 1].children.unshift(l);
            stack.push(l);
        }
        else if (type === 3 /* SectionDividerType.BoundingSectionDivider */) {
            stack.pop();
            // this was workaround because I didn't know what `lsdk` section was, now it's probably not needed anymore
            // } else if (l.name === '</Layer group>' && !l.sectionDivider && !l.top && !l.left && !l.bottom && !l.right) {
            // 	// sometimes layer group terminator doesn't have sectionDivider, so we just guess here (PS bug ?)
            // 	stack.pop();
        }
        else {
            stack[stack.length - 1].children.unshift(l);
        }
    }
}
function readLayerRecord(reader, psd, imageResources) {
    const layer = {};
    layer.top = readInt32(reader);
    layer.left = readInt32(reader);
    layer.bottom = readInt32(reader);
    layer.right = readInt32(reader);
    if (!isValidBoxSize(layer, reader))
        throw new Error('Invalid layer size');
    const channelCount = readUint16(reader);
    const channels = [];
    for (let i = 0; i < channelCount; i++) {
        let id = readInt16(reader);
        let length = readUint32(reader);
        if (reader.large) {
            if (length !== 0)
                throw new Error('Sizes larger than 4GB are not supported');
            length = readUint32(reader);
        }
        channels.push({ id, length });
    }
    checkSignature(reader, '8BIM');
    const blendMode = readSignature(reader);
    if (!helpers_1.toBlendMode[blendMode])
        throw new Error(`Invalid blend mode: '${blendMode}'`);
    layer.blendMode = helpers_1.toBlendMode[blendMode];
    layer.opacity = readUint8(reader) / 0xff;
    layer.clipping = readUint8(reader) === 1;
    const flags = readUint8(reader);
    layer.transparencyProtected = (flags & 0x01) !== 0;
    layer.hidden = (flags & 0x02) !== 0;
    if (flags & 0x20)
        layer.effectsOpen = true;
    // 0x04 - obsolete
    // 0x08 - 1 for Photoshop 5.0 and later, tells if bit 4 has useful information
    // 0x10 - pixel data irrelevant to appearance of document
    // 0x20 - effects/filters panel is expanded
    skipBytes(reader, 1);
    readSection(reader, 1, left => {
        readLayerMaskData(reader, layer);
        const blendingRanges = readLayerBlendingRanges(reader);
        if (blendingRanges)
            layer.blendingRanges = blendingRanges;
        layer.name = readPascalString(reader, 1); // should be padded to 4, but is not sometimes
        // HACK: fix for sometimes layer.name string not being padded correctly, just skip until we get valid signature
        while (left() > 4 && !validSignatureAt(reader, reader.offset))
            reader.offset++;
        while (left() >= 12)
            readAdditionalLayerInfo(reader, layer, psd, imageResources);
        skipBytes(reader, left());
    });
    return { layer, channels };
}
function isValidBoxSize(box, reader) {
    const width = (box.right || 0) - (box.left || 0);
    const height = (box.bottom || 0) - (box.top || 0);
    const maxSize = reader.large ? 300000 : 30000;
    return width >= 0 && height >= 0 && width <= maxSize && height <= maxSize;
}
function readLayerMaskData(reader, layer) {
    return readSection(reader, 1, left => {
        if (!left())
            return undefined;
        const mask = {};
        layer.mask = mask;
        mask.top = readInt32(reader);
        mask.left = readInt32(reader);
        mask.bottom = readInt32(reader);
        mask.right = readInt32(reader);
        if (!isValidBoxSize(mask, reader))
            throw new Error('Invalid mask size');
        mask.defaultColor = readUint8(reader);
        const flags = readUint8(reader);
        mask.positionRelativeToLayer = (flags & 1 /* LayerMaskFlags.PositionRelativeToLayer */) !== 0;
        mask.disabled = (flags & 2 /* LayerMaskFlags.LayerMaskDisabled */) !== 0;
        mask.fromVectorData = (flags & 8 /* LayerMaskFlags.LayerMaskFromRenderingOtherData */) !== 0;
        if (left() >= 18) {
            const realMask = {};
            layer.realMask = realMask;
            const realFlags = readUint8(reader);
            realMask.positionRelativeToLayer = (realFlags & 1 /* LayerMaskFlags.PositionRelativeToLayer */) !== 0;
            realMask.disabled = (realFlags & 2 /* LayerMaskFlags.LayerMaskDisabled */) !== 0;
            realMask.fromVectorData = (realFlags & 8 /* LayerMaskFlags.LayerMaskFromRenderingOtherData */) !== 0;
            realMask.defaultColor = readUint8(reader); // Real user mask background. 0 or 255.
            realMask.top = readInt32(reader);
            realMask.left = readInt32(reader);
            realMask.bottom = readInt32(reader);
            realMask.right = readInt32(reader);
            if (!isValidBoxSize(realMask, reader))
                throw new Error('Invalid realMask size');
        }
        if (flags & 16 /* LayerMaskFlags.MaskHasParametersAppliedToIt */) {
            const params = readUint8(reader);
            if (params & 1 /* MaskParams.UserMaskDensity */)
                mask.userMaskDensity = readUint8(reader) / 0xff;
            if (params & 2 /* MaskParams.UserMaskFeather */)
                mask.userMaskFeather = readFloat64(reader);
            if (params & 4 /* MaskParams.VectorMaskDensity */)
                mask.vectorMaskDensity = readUint8(reader) / 0xff;
            if (params & 8 /* MaskParams.VectorMaskFeather */)
                mask.vectorMaskFeather = readFloat64(reader);
        }
        skipBytes(reader, left());
    });
}
function readBlendingRange(reader) {
    return [readUint8(reader), readUint8(reader), readUint8(reader), readUint8(reader)];
}
function readLayerBlendingRanges(reader) {
    return readSection(reader, 1, left => {
        const compositeGrayBlendSource = readBlendingRange(reader);
        const compositeGraphBlendDestinationRange = readBlendingRange(reader);
        const ranges = [];
        while (left() > 0) {
            const sourceRange = readBlendingRange(reader);
            const destRange = readBlendingRange(reader);
            ranges.push({ sourceRange, destRange });
        }
        return { compositeGrayBlendSource, compositeGraphBlendDestinationRange, ranges };
    });
}
function readLayerChannelImageData(reader, psd, layer, channels) {
    if (reader.skipLayerImageData)
        return;
    const { colorMode = 3 /* ColorMode.RGB */, bitsPerChannel = 8 } = psd;
    layer.rawData = { colorMode, bitsPerChannel, channels: [], large: reader.large };
    for (const channel of channels) {
        const start = reader.offset;
        let compression = 0 /* Compression.RawData */;
        let data = undefined;
        if (channel.length === 1)
            throw new Error('Invalid channel length');
        if (channel.length) {
            compression = readUint16(reader);
            // try to fix broken files where there's 1 byte shift of channel
            if (compression > 3) {
                reader.offset -= 1;
                compression = readUint16(reader);
            }
            // try to fix broken files where there's 1 byte shift of channel
            if (compression > 3) {
                reader.offset -= 3;
                compression = readUint16(reader);
            }
            if (compression > 3)
                throw new Error(`Invalid compression: ${compression}`);
            if (channel.length > 2) {
                data = readBytes(reader, channel.length - 2);
            }
        }
        reader.offset = start + channel.length;
        layer.rawData.channels.push({ id: channel.id, compression, data });
    }
    if (!reader.useRawData) {
        decodeLayerImageData(layer, reader);
    }
}
function resetAlpha({ data }, cmyk) {
    const alpha = (data instanceof Float32Array) ? 1.0 : ((data instanceof Uint16Array) ? 0xffff : 0xff);
    const offset = (cmyk ? 4 : 3) | 0;
    const length = data.length | 0;
    const step = (cmyk ? 5 : 4) | 0;
    for (let p = offset; p < length; p = (p + step) | 0) {
        data[p] = alpha;
    }
}
function getCompositeImageData(psd) {
    const data = psd.rawCompositeData;
    if (!data)
        return undefined;
    const reader = createReader(data.buffer, data.byteOffset, data.byteLength);
    const imageData = readImageData(reader, psd);
    return imageData;
}
function getCompositeCanvas(psd) {
    return imageDataToCanvasSafe(getCompositeImageData(psd));
}
function getLayerImageData(layer) {
    return getDataFromLayer(layer, LayerDataType.Layer, false, undefined);
}
function getLayerMaskImageData(layer) {
    return getDataFromLayer(layer, LayerDataType.Mask, false, undefined);
}
function getLayerRealMaskImageData(layer) {
    return getDataFromLayer(layer, LayerDataType.RealMask, false, undefined);
}
function getLayerCanvas(layer) {
    return imageDataToCanvasSafe(getLayerImageData(layer));
}
function getLayerMaskCanvas(layer) {
    return imageDataToCanvasSafe(getLayerMaskImageData(layer));
}
function getLayerRealMaskCanvas(layer) {
    return imageDataToCanvasSafe(getLayerRealMaskImageData(layer));
}
function imageDataToCanvasSafe(imageData) {
    return imageData && (0, helpers_1.imageDataToCanvas)(imageData);
}
function setImageDataOrCanvas(obj, imageData, useImageData) {
    if (!imageData)
        return;
    if (useImageData) {
        obj.imageData = imageData;
    }
    else {
        obj.canvas = (0, helpers_1.imageDataToCanvas)(imageData);
    }
}
function decodeLayerPixels(layer, useImageData) {
    decodeLayerImageData(layer, { useImageData });
}
function decodeLayerImageData(layer, options) {
    var _a, _b, _c;
    let { throwForMissingFeatures, useImageData } = options;
    const imageData = getDataFromLayer(layer, LayerDataType.Layer, throwForMissingFeatures, options.totalMemoryLimit);
    setImageDataOrCanvas(layer, imageData, useImageData);
    if (options.totalMemoryLimit !== undefined)
        options.totalMemoryLimit -= (_a = imageData === null || imageData === void 0 ? void 0 : imageData.data.byteLength) !== null && _a !== void 0 ? _a : 0;
    if (layer.mask) {
        const maskData = getDataFromLayer(layer, LayerDataType.Mask, throwForMissingFeatures, options.totalMemoryLimit);
        setImageDataOrCanvas(layer.mask, maskData, useImageData);
        if (options.totalMemoryLimit !== undefined)
            options.totalMemoryLimit -= (_b = maskData === null || maskData === void 0 ? void 0 : maskData.data.byteLength) !== null && _b !== void 0 ? _b : 0;
    }
    if (layer.realMask) {
        const maskData = getDataFromLayer(layer, LayerDataType.RealMask, throwForMissingFeatures, options.totalMemoryLimit);
        setImageDataOrCanvas(layer.realMask, maskData, useImageData);
        if (options.totalMemoryLimit !== undefined)
            options.totalMemoryLimit -= (_c = maskData === null || maskData === void 0 ? void 0 : maskData.data.byteLength) !== null && _c !== void 0 ? _c : 0;
    }
    delete layer.rawData;
}
var LayerDataType;
(function (LayerDataType) {
    LayerDataType[LayerDataType["Layer"] = 0] = "Layer";
    LayerDataType[LayerDataType["Mask"] = 1] = "Mask";
    LayerDataType[LayerDataType["RealMask"] = 2] = "RealMask";
})(LayerDataType || (LayerDataType = {}));
function getDataFromLayer(layer, read, throwForMissingFeatures, memoryLimit) {
    if (!layer.rawData)
        return undefined;
    const { colorMode, bitsPerChannel, channels, large } = layer.rawData;
    const layerWidth = Math.max(0, (layer.right || 0) - (layer.left || 0));
    const layerHeight = Math.max(0, (layer.bottom || 0) - (layer.top || 0));
    const cmyk = colorMode === 4 /* ColorMode.CMYK */;
    let imageData;
    let maskData;
    let initializedAlpha = false;
    if (layerWidth && layerHeight && read === LayerDataType.Layer) {
        if (cmyk) {
            if (bitsPerChannel !== 8)
                throw new Error('bitsPerChannel Not supproted');
            imageData = { width: layerWidth, height: layerHeight, data: new Uint8ClampedArray(layerWidth * layerHeight * 5) };
        }
        else {
            imageData = createImageDataBitDepth(layerWidth, layerHeight, bitsPerChannel, 4, memoryLimit);
        }
    }
    if (helpers_1.RAW_IMAGE_DATA) { // TODO: use layer.rawData instead
        layer.imageDataRaw = [];
        layer.imageDataRawCompression = [];
    }
    for (const { id, compression, data } of channels) {
        if (!data)
            continue;
        const dataReader = createReader(data.buffer, data.byteOffset, data.byteLength);
        if (id === -2 /* ChannelID.UserMask */ || id === -3 /* ChannelID.RealUserMask */) {
            if (id === -2 /* ChannelID.UserMask */ && read !== LayerDataType.Mask)
                continue;
            if (id === -3 /* ChannelID.RealUserMask */ && read !== LayerDataType.RealMask)
                continue;
            const mask = id === -2 /* ChannelID.UserMask */ ? layer.mask : layer.realMask;
            if (!mask)
                throw new Error(`Missing layer ${id === -2 /* ChannelID.UserMask */ ? 'mask' : 'real mask'} data`);
            const maskWidth = Math.max(0, (mask.right || 0) - (mask.left || 0));
            const maskHeight = Math.max(0, (mask.bottom || 0) - (mask.top || 0));
            if (maskWidth && maskHeight) {
                maskData = createImageDataBitDepth(maskWidth, maskHeight, bitsPerChannel, 4, memoryLimit);
                readData(dataReader, data.byteLength, maskData, compression, maskWidth, maskHeight, bitsPerChannel, 0, large, 4);
                if (helpers_1.RAW_IMAGE_DATA) { // TODO: use layer.rawData instead
                    if (id === -2 /* ChannelID.UserMask */) {
                        layer.maskDataRawCompression = compression;
                        layer.maskDataRaw = data;
                    }
                    else {
                        layer.realMaskDataRawCompression = compression;
                        layer.realMaskDataRaw = data;
                    }
                }
                setupGrayscale(maskData);
                resetAlpha(maskData, false);
            }
        }
        else {
            if (read !== LayerDataType.Layer)
                continue;
            const offset = (0, helpers_1.offsetForChannel)(id, cmyk);
            let targetData = imageData;
            if (offset < 0) {
                targetData = undefined;
                if (throwForMissingFeatures) {
                    throw new Error(`Channel not supported: ${id}`);
                }
            }
            readData(dataReader, data.byteLength, targetData, compression, layerWidth, layerHeight, bitsPerChannel, offset, large, cmyk ? 5 : 4);
            if (helpers_1.RAW_IMAGE_DATA) { // TODO: use layer.rawData instead
                layer.imageDataRawCompression[id] = compression;
                layer.imageDataRaw[id] = data;
            }
            if (targetData && colorMode === 1 /* ColorMode.Grayscale */) {
                setupGrayscale(targetData);
            }
        }
        if (id === -1 /* ChannelID.Transparency */) {
            initializedAlpha = true;
        }
    }
    if (imageData) {
        if (!initializedAlpha)
            resetAlpha(imageData, cmyk);
        if (cmyk) {
            const cmykData = imageData;
            imageData = (0, helpers_1.createImageData)(cmykData.width, cmykData.height);
            cmykToRgb(cmykData, imageData, false);
        }
    }
    return read === LayerDataType.Layer ? imageData : maskData;
}
function readData(reader, length, pixels, compression, width, height, bitDepth, offset, large, step) {
    if (!length)
        return;
    if (compression === 0 /* Compression.RawData */) {
        if (length !== (width * height * Math.floor(bitDepth / 8))) {
            reader.log(`Invalid length (${length}, ${width * height * Math.floor(bitDepth / 8)})`);
        }
        const data = readBytes(reader, length);
        readDataRaw(data, pixels, bitDepth, step, offset);
    }
    else if (compression === 1 /* Compression.RleCompressed */) {
        // const reader = createReader(data.buffer, data.byteOffset, data.byteLength);
        readDataRLE(reader, pixels, width, height, bitDepth, step, [offset], large);
    }
    else if (compression === 2 /* Compression.ZipWithoutPrediction */) {
        const data = readBytes(reader, length);
        readDataZip(data, pixels, width, height, bitDepth, step, offset, false);
    }
    else if (compression === 3 /* Compression.ZipWithPrediction */) {
        const data = readBytes(reader, length);
        readDataZip(data, pixels, width, height, bitDepth, step, offset, true);
    }
    else {
        throw new Error(`Invalid Compression type: ${compression}`);
    }
}
function readGlobalLayerMaskInfo(reader) {
    return readSection(reader, 1, left => {
        if (!left())
            return undefined;
        const overlayColorSpace = readUint16(reader);
        const colorSpace1 = readUint16(reader);
        const colorSpace2 = readUint16(reader);
        const colorSpace3 = readUint16(reader);
        const colorSpace4 = readUint16(reader);
        const opacity = readUint16(reader) / 0xff;
        const kind = readUint8(reader);
        skipBytes(reader, left()); // 3 bytes of padding ?
        return { overlayColorSpace, colorSpace1, colorSpace2, colorSpace3, colorSpace4, opacity, kind };
    });
}
const fixOffsets = [0, 1, -1, 2, -2, 3, -3, 4, -4];
function realignWithSignature(reader, isValid) {
    const sigOffset = reader.offset;
    let sig = '';
    // attempt to fix broken document by realigning with the signature
    for (const offset of fixOffsets) {
        try {
            reader.offset = sigOffset + offset;
            sig = readSignature(reader);
        }
        catch (_a) { }
        if (isValid(sig))
            break;
    }
    if (!isValid(sig)) {
        throw new Error(`Invalid signature: '${sig}' at 0x${(sigOffset).toString(16)}`);
    }
    return sig;
}
function isValidAdditionalInfoSignature(sig) {
    return sig === '8BIM' || sig === '8B64';
}
function readAdditionalLayerInfo(reader, target, psd, imageResources) {
    const sig = realignWithSignature(reader, isValidAdditionalInfoSignature);
    const key = readSignature(reader);
    // `largeAdditionalInfoKeys` fallback, because some keys don't have 8B64 signature even when they are 64bit
    const u64 = sig === '8B64' || (reader.large && helpers_1.largeAdditionalInfoKeys.indexOf(key) !== -1);
    readSection(reader, 2, left => {
        const handler = additionalInfo_1.infoHandlersMap[key];
        if (handler) {
            try {
                handler.read(reader, target, left, psd, imageResources);
            }
            catch (e) {
                if (reader.throwForMissingFeatures)
                    throw e;
            }
        }
        else {
            reader.logMissingFeatures && reader.log(`Unhandled additional info: ${key}`);
            skipBytes(reader, left());
        }
        if (left()) {
            reader.logMissingFeatures && reader.log(`Unread ${left()} bytes left for additional info: ${key}`);
            skipBytes(reader, left());
        }
    }, false, u64);
}
function createImageDataBitDepth(width, height, bitDepth, channels, memoryLimit) {
    const sizeInBytes = width * height * channels * Math.max(1, bitDepth / 8);
    if (memoryLimit !== undefined && sizeInBytes > memoryLimit)
        throw new Error('Exceeded memory limit');
    if (bitDepth === 1 || bitDepth === 8) {
        if (channels === 4) {
            return (0, helpers_1.createImageData)(width, height);
        }
        else {
            return { width, height, data: new Uint8ClampedArray(width * height * channels) };
        }
    }
    else if (bitDepth === 16) {
        return { width, height, data: new Uint16Array(width * height * channels) };
    }
    else if (bitDepth === 32) {
        return { width, height, data: new Float32Array(width * height * channels) };
    }
    else {
        throw new Error(`Invalid bitDepth (${bitDepth})`);
    }
}
function readImageData(reader, psd) {
    var _a;
    const compression = readUint16(reader);
    const bitsPerChannel = (_a = psd.bitsPerChannel) !== null && _a !== void 0 ? _a : 8;
    if (exports.supportedColorModes.indexOf(psd.colorMode) === -1)
        throw new Error(`Color mode not supported: ${psd.colorMode}`);
    if (compression !== 0 /* Compression.RawData */ && compression !== 1 /* Compression.RleCompressed */)
        throw new Error(`Compression type not supported: ${compression}`);
    const imageData = createImageDataBitDepth(psd.width, psd.height, bitsPerChannel, 4, reader.totalMemoryLimit);
    if (reader.totalMemoryLimit !== undefined)
        reader.totalMemoryLimit -= imageData.data.byteLength;
    (0, helpers_1.resetImageData)(imageData);
    switch (psd.colorMode) {
        case 0 /* ColorMode.Bitmap */: {
            if (bitsPerChannel !== 1)
                throw new Error('Invalid bitsPerChannel for bitmap color mode');
            let bytes;
            if (compression === 0 /* Compression.RawData */) {
                bytes = readBytes(reader, Math.ceil(psd.width / 8) * psd.height);
            }
            else if (compression === 1 /* Compression.RleCompressed */) {
                bytes = new Uint8Array(psd.width * psd.height);
                readDataRLE(reader, { data: bytes, width: psd.width, height: psd.height }, psd.width, psd.height, 8, 1, [0], reader.large);
            }
            else {
                throw new Error(`Compression not supported: ${compression}`);
            }
            (0, helpers_1.decodeBitmap)(bytes, imageData.data, psd.width, psd.height);
            break;
        }
        case 3 /* ColorMode.RGB */:
        case 1 /* ColorMode.Grayscale */: {
            const channels = psd.colorMode === 1 /* ColorMode.Grayscale */ ? [0] : [0, 1, 2];
            if (psd.channels && psd.channels > 3) {
                for (let i = 3; i < psd.channels; i++) {
                    // TODO: store these channels in additional image data
                    channels.push(i);
                }
            }
            else if (reader.globalAlpha) {
                channels.push(3);
            }
            if (compression === 0 /* Compression.RawData */) {
                for (let i = 0; i < channels.length; i++) {
                    const data = readBytes(reader, psd.width * psd.height * Math.floor(bitsPerChannel / 8));
                    readDataRaw(data, imageData, bitsPerChannel, 4, channels[i]);
                }
            }
            else if (compression === 1 /* Compression.RleCompressed */) {
                const start = reader.offset;
                readDataRLE(reader, imageData, psd.width, psd.height, bitsPerChannel, 4, channels, reader.large);
                if (helpers_1.RAW_IMAGE_DATA)
                    psd.imageDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
            }
            else {
                throw new Error(`Compression not supported: ${compression}`);
            }
            if (psd.colorMode === 1 /* ColorMode.Grayscale */) {
                setupGrayscale(imageData);
            }
            break;
        }
        case 2 /* ColorMode.Indexed */: {
            if (bitsPerChannel !== 8)
                throw new Error('bitsPerChannel Not supproted');
            if (psd.channels !== 1)
                throw new Error('Invalid channel count');
            if (!psd.palette)
                throw new Error('Missing color palette');
            if (compression === 0 /* Compression.RawData */) {
                throw new Error(`Compression not supported: ${compression}`);
            }
            else if (compression === 1 /* Compression.RleCompressed */) {
                const indexedImageData = {
                    width: imageData.width,
                    height: imageData.height,
                    data: new Uint8Array(imageData.width * imageData.height),
                };
                readDataRLE(reader, indexedImageData, psd.width, psd.height, bitsPerChannel, 1, [0], reader.large);
                indexedToRgb(indexedImageData, imageData, psd.palette);
            }
            else {
                throw new Error(`Compression not supported: ${compression}`);
            }
            break;
        }
        case 4 /* ColorMode.CMYK */: {
            if (bitsPerChannel !== 8)
                throw new Error('bitsPerChannel Not supproted');
            if (psd.channels !== 4)
                throw new Error(`Invalid channel count`);
            const channels = [0, 1, 2, 3];
            if (reader.globalAlpha)
                channels.push(4);
            if (compression === 0 /* Compression.RawData */) {
                throw new Error(`Compression not supported: ${compression}`);
                // TODO: ...
                // for (let i = 0; i < channels.length; i++) {
                // 	readDataRaw(reader, imageData, channels[i], psd.width, psd.height);
                // }
            }
            else if (compression === 1 /* Compression.RleCompressed */) {
                const cmykImageData = {
                    width: imageData.width,
                    height: imageData.height,
                    data: new Uint8Array(imageData.width * imageData.height * 5),
                };
                const start = reader.offset;
                readDataRLE(reader, cmykImageData, psd.width, psd.height, bitsPerChannel, 5, channels, reader.large);
                cmykToRgb(cmykImageData, imageData, true);
                if (helpers_1.RAW_IMAGE_DATA)
                    psd.imageDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
            }
            else {
                throw new Error(`Compression not supported: ${compression}`);
            }
            break;
        }
        default: throw new Error(`Color mode not supported: ${psd.colorMode}`);
    }
    // remove weird white matte
    if (reader.globalAlpha) {
        if (psd.bitsPerChannel !== 8)
            throw new Error('bitsPerChannel Not supproted');
        const p = imageData.data;
        const size = imageData.width * imageData.height * 4;
        for (let i = 0; i < size; i += 4) {
            const pa = p[i + 3];
            if (pa != 0 && pa != 255) {
                const a = pa / 255;
                const ra = 1 / a;
                const invA = 255 * (1 - ra);
                p[i + 0] = p[i + 0] * ra + invA;
                p[i + 1] = p[i + 1] * ra + invA;
                p[i + 2] = p[i + 2] * ra + invA;
            }
        }
    }
    return imageData;
}
function cmykToRgb(cmyk, rgb, reverseAlpha) {
    const size = rgb.width * rgb.height * 4;
    const srcData = cmyk.data;
    const dstData = rgb.data;
    for (let src = 0, dst = 0; dst < size; src += 5, dst += 4) {
        const c = srcData[src];
        const m = srcData[src + 1];
        const y = srcData[src + 2];
        const k = srcData[src + 3];
        dstData[dst] = ((((c * k) | 0) / 255) | 0);
        dstData[dst + 1] = ((((m * k) | 0) / 255) | 0);
        dstData[dst + 2] = ((((y * k) | 0) / 255) | 0);
        dstData[dst + 3] = reverseAlpha ? 255 - srcData[src + 4] : srcData[src + 4];
    }
    // for (let src = 0, dst = 0; dst < size; src += 5, dst += 4) {
    // 	const c = 1 - (srcData[src + 0] / 255);
    // 	const m = 1 - (srcData[src + 1] / 255);
    // 	const y = 1 - (srcData[src + 2] / 255);
    // 	// const k = srcData[src + 3] / 255;
    // 	dstData[dst + 0] = ((1 - c * 0.8) * 255) | 0;
    // 	dstData[dst + 1] = ((1 - m * 0.8) * 255) | 0;
    // 	dstData[dst + 2] = ((1 - y * 0.8) * 255) | 0;
    // 	dstData[dst + 3] = reverseAlpha ? 255 - srcData[src + 4] : srcData[src + 4];
    // }
}
function indexedToRgb(indexed, rgb, palette) {
    const size = indexed.width * indexed.height;
    const srcData = indexed.data;
    const dstData = rgb.data;
    for (let src = 0, dst = 0; src < size; src++, dst += 4) {
        const c = palette[srcData[src]];
        dstData[dst + 0] = c.r;
        dstData[dst + 1] = c.g;
        dstData[dst + 2] = c.b;
        dstData[dst + 3] = 255;
    }
}
function verifyCompatible(a, b) {
    if ((a.byteLength / a.length) !== (b.byteLength / b.length)) {
        throw new Error('Invalid array types');
    }
}
function bytesToArray(bytes, bitDepth) {
    if (bitDepth === 8) {
        return bytes;
    }
    else if (bitDepth === 16) {
        // PSD files store 16-bit channel data in big-endian byte order.
        // Swap each pair of bytes so that Uint16Array (native-endian) reads the correct values.
        for (let i = 0; i < bytes.byteLength; i += 2) {
            const tmp = bytes[i];
            bytes[i] = bytes[i + 1];
            bytes[i + 1] = tmp;
        }
        if (bytes.byteOffset % 2) {
            const result = new Uint16Array(bytes.byteLength / 2);
            new Uint8Array(result.buffer, result.byteOffset, result.byteLength).set(bytes);
            return result;
        }
        else {
            return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
        }
    }
    else if (bitDepth === 32) {
        if (bytes.byteOffset % 4) {
            const result = new Float32Array(bytes.byteLength / 4);
            new Uint8Array(result.buffer, result.byteOffset, result.byteLength).set(bytes);
            return result;
        }
        else {
            return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
        }
    }
    else {
        throw new Error(`Invalid bitDepth (${bitDepth})`);
    }
}
function copyChannelToPixelData(pixelData, channel, offset, step) {
    verifyCompatible(pixelData.data, channel);
    const size = pixelData.width * pixelData.height;
    const data = pixelData.data;
    for (let i = 0, p = offset | 0; i < size; i++, p = (p + step) | 0) {
        data[p] = channel[i];
    }
}
function readDataRaw(buffer, pixelData, bitDepth, step, offset) {
    if (bitDepth == 32) {
        for (let i = 0; i < buffer.byteLength; i += 4) {
            const a = buffer[i + 0];
            const b = buffer[i + 1];
            const c = buffer[i + 2];
            const d = buffer[i + 3];
            buffer[i + 0] = d;
            buffer[i + 1] = c;
            buffer[i + 2] = b;
            buffer[i + 3] = a;
        }
    }
    const array = bytesToArray(buffer, bitDepth);
    if (pixelData && offset < step) {
        copyChannelToPixelData(pixelData, array, offset, step);
    }
}
function decodePredicted(data, width, height, mod) {
    for (let y = 0; y < height; y++) {
        const offset = y * width;
        for (let x = 1, o = offset + 1; x < width; x++, o++) {
            data[o] = (data[o - 1] + data[o]) % mod;
        }
    }
}
function readDataZip(compressed, pixelData, width, height, bitDepth, step, offset, prediction) {
    const decompressed = (0, pako_1.inflate)(compressed);
    if (pixelData && offset < step) {
        const array = bytesToArray(decompressed, bitDepth);
        if (bitDepth === 8) {
            if (prediction)
                decodePredicted(decompressed, width, height, 0x100);
            copyChannelToPixelData(pixelData, decompressed, offset, step);
        }
        else if (bitDepth === 16) {
            if (prediction)
                decodePredicted(array, width, height, 0x10000);
            copyChannelToPixelData(pixelData, array, offset, step);
        }
        else if (bitDepth === 32) {
            if (prediction)
                decodePredicted(decompressed, width * 4, height, 0x100);
            let di = offset;
            const dst = new Uint32Array(pixelData.data.buffer, pixelData.data.byteOffset, pixelData.data.length);
            for (let y = 0; y < height; y++) {
                let a = width * 4 * y;
                for (let x = 0; x < width; x++, a++, di += step) {
                    const b = a + width;
                    const c = b + width;
                    const d = c + width;
                    dst[di] = ((decompressed[a] << 24) | (decompressed[b] << 16) | (decompressed[c] << 8) | decompressed[d]) >>> 0;
                }
            }
        }
        else {
            throw new Error('Invalid bitDepth');
        }
    }
}
function readDataRLE(reader, pixelData, width, height, _bitDepth, step, offsets, large) {
    const data = pixelData && pixelData.data;
    let lengths;
    if (large) {
        consumeMemory(reader, offsets.length * height * 4);
        lengths = new Uint32Array(offsets.length * height);
        for (let o = 0, li = 0; o < offsets.length; o++) {
            for (let y = 0; y < height; y++, li++) {
                lengths[li] = readUint32(reader);
            }
        }
    }
    else {
        consumeMemory(reader, offsets.length * height * 2);
        lengths = new Uint16Array(offsets.length * height);
        for (let o = 0, li = 0; o < offsets.length; o++) {
            for (let y = 0; y < height; y++, li++) {
                lengths[li] = readUint16(reader);
            }
        }
    }
    // if (bitDepth !== 1 && bitDepth !== 8) throw new Error(`Invalid bit depth (${bitDepth})`);
    const extraLimit = (step - 1) | 0; // 3 for rgb, 4 for cmyk
    for (let c = 0, li = 0; c < offsets.length; c++) {
        const offset = offsets[c] | 0;
        const extra = c > extraLimit || offset > extraLimit;
        if (!data || extra) {
            for (let y = 0; y < height; y++, li++) {
                skipBytes(reader, lengths[li]);
            }
        }
        else {
            for (let y = 0, p = offset | 0; y < height; y++, li++) {
                const length = lengths[li];
                const buffer = readBytes(reader, length);
                for (let i = 0, x = 0; i < length; i++) {
                    let header = buffer[i];
                    if (header > 128) {
                        const value = buffer[++i];
                        header = (256 - header) | 0;
                        for (let j = 0; j <= header && x < width; j = (j + 1) | 0, x = (x + 1) | 0) {
                            data[p] = value;
                            p = (p + step) | 0;
                        }
                    }
                    else if (header < 128) {
                        for (let j = 0; j <= header && x < width; j = (j + 1) | 0, x = (x + 1) | 0) {
                            data[p] = buffer[++i];
                            p = (p + step) | 0;
                        }
                    }
                    else {
                        // ignore 128
                    }
                    // This showed up on some images from non-photoshop programs, ignoring it seems to work just fine.
                    // if (i >= length) throw new Error(`Invalid RLE data: exceeded buffer size ${i}/${length}`);
                }
            }
        }
    }
    recoverMemory(reader, lengths.byteLength);
}
function readSection(reader, round, func, skipEmpty = true, eightBytes = false) {
    let length = readUint32(reader);
    if (eightBytes) {
        if (length !== 0)
            throw new Error('Sizes larger than 4GB are not supported');
        length = readUint32(reader);
    }
    if (length <= 0 && skipEmpty)
        return undefined;
    let end = reader.offset + length;
    if (end > reader.view.byteLength)
        throw new Error('Section exceeds file size');
    const result = func(() => end - reader.offset);
    if (reader.offset !== end) {
        if (reader.offset > end) {
            warnOrThrow(reader, 'Exceeded section limits');
        }
        else {
            warnOrThrow(reader, `Unread section data`); // : ${end - reader.offset} bytes at 0x${reader.offset.toString(16)}`);
        }
    }
    while (length % round) {
        length++;
        end++;
    }
    // while (end % round) end++;
    reader.offset = end;
    return result;
}
function readColor(reader) {
    const colorSpace = readUint16(reader);
    switch (colorSpace) {
        case 0 /* ColorSpace.RGB */: {
            const r = readUint16(reader) / 257;
            const g = readUint16(reader) / 257;
            const b = readUint16(reader) / 257;
            skipBytes(reader, 2);
            return { r, g, b };
        }
        case 1 /* ColorSpace.HSB */: {
            const h = readUint16(reader) / 0xffff;
            const s = readUint16(reader) / 0xffff;
            const b = readUint16(reader) / 0xffff;
            skipBytes(reader, 2);
            return { h, s, b };
        }
        case 2 /* ColorSpace.CMYK */: {
            const c = readUint16(reader) / 257;
            const m = readUint16(reader) / 257;
            const y = readUint16(reader) / 257;
            const k = readUint16(reader) / 257;
            return { c, m, y, k };
        }
        case 7 /* ColorSpace.Lab */: {
            const l = readInt16(reader) / 10000;
            const ta = readInt16(reader);
            const tb = readInt16(reader);
            const a = ta < 0 ? (ta / 12800) : (ta / 12700);
            const b = tb < 0 ? (tb / 12800) : (tb / 12700);
            skipBytes(reader, 2);
            return { l, a, b };
        }
        case 8 /* ColorSpace.Grayscale */: {
            const k = readUint16(reader) * 255 / 10000;
            skipBytes(reader, 6);
            return { k };
        }
        default:
            throw new Error('Invalid color space');
    }
}
function readPattern(reader) {
    let length = readUint32(reader);
    while (length % 4)
        length++;
    const end = reader.offset + length;
    const version = readUint32(reader);
    if (version !== 1)
        throw new Error(`Invalid pattern version: ${version}`);
    const colorMode = readUint32(reader);
    const x = readInt16(reader);
    const y = readInt16(reader);
    // we only support RGB and grayscale for now
    if (colorMode !== 3 /* ColorMode.RGB */ && colorMode !== 1 /* ColorMode.Grayscale */ && colorMode !== 2 /* ColorMode.Indexed */) {
        throw new Error(`Unsupported pattern color mode: ${colorMode}`);
    }
    let name = readUnicodeString(reader);
    const id = readPascalString(reader, 1);
    const palette = [];
    if (colorMode === 2 /* ColorMode.Indexed */) {
        for (let i = 0; i < 256; i++) {
            palette.push({
                r: readUint8(reader),
                g: readUint8(reader),
                b: readUint8(reader),
            });
        }
        skipBytes(reader, 4); // no idea what this is
    }
    // virtual memory array list
    const version2 = readUint32(reader);
    if (version2 !== 3)
        throw new Error(`Invalid pattern VMAL version: ${version2}`);
    readUint32(reader); // length
    const top = readUint32(reader);
    const left = readUint32(reader);
    const bottom = readUint32(reader);
    const right = readUint32(reader);
    const channelsCount = readUint32(reader);
    const width = right - left;
    const height = bottom - top;
    const size = width * height * 4;
    consumeMemory(reader, size);
    const data = new Uint8Array(size);
    for (let i = 3; i < data.byteLength; i += 4) {
        data[i] = 255;
    }
    for (let i = 0, ch = 0; i < (channelsCount + 2); i++) {
        const has = readUint32(reader);
        if (!has)
            continue;
        const length = readUint32(reader);
        const pixelDepth = readUint32(reader);
        const ctop = readUint32(reader);
        const cleft = readUint32(reader);
        const cbottom = readUint32(reader);
        const cright = readUint32(reader);
        const pixelDepth2 = readUint16(reader);
        const compressionMode = readUint8(reader); // 0 - raw, 1 - rle
        const dataLength = length - (4 + 16 + 2 + 1);
        const cdata = readBytes(reader, dataLength);
        if (pixelDepth !== 8 || pixelDepth2 !== 8) {
            throw new Error('16bit pixel depth not supported for patterns');
        }
        const w = cright - cleft;
        const h = cbottom - ctop;
        const ox = cleft - left;
        const oy = ctop - top;
        if (compressionMode === 0) {
            if (colorMode === 3 /* ColorMode.RGB */ && ch < 3) {
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const src = x + y * w;
                        const dst = (ox + x + (y + oy) * width) * 4;
                        data[dst + ch] = cdata[src];
                    }
                }
            }
            else if (colorMode === 1 /* ColorMode.Grayscale */ && ch < 1) {
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const src = x + y * w;
                        const dst = (ox + x + (y + oy) * width) * 4;
                        const value = cdata[src];
                        data[dst + 0] = value;
                        data[dst + 1] = value;
                        data[dst + 2] = value;
                    }
                }
            }
            else if (colorMode === 2 /* ColorMode.Indexed */) {
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const src = x + y * w;
                        const dst = (ox + x + (y + oy) * width) * 4;
                        const index = cdata[src];
                        const color = palette[index];
                        data[dst + 0] = color.r;
                        data[dst + 1] = color.g;
                        data[dst + 2] = color.b;
                    }
                }
            }
            else {
                if (reader.throwForMissingFeatures)
                    throw new Error('Invalid color pattern');
            }
        }
        else if (compressionMode === 1) {
            consumeMemory(reader, w * h);
            const pixelData = { data, width, height };
            const tempData = { data: new Uint8Array(w * h), width: w, height: h };
            const cdataReader = createReader(cdata.buffer, cdata.byteOffset, cdata.byteLength);
            if (colorMode === 3 /* ColorMode.RGB */ && ch < 3) {
                readDataRLE(cdataReader, tempData, w, h, 8, 1, [0], false);
                copyChannelToRGBA(tempData, pixelData, ox, oy, ch);
            }
            if (colorMode === 1 /* ColorMode.Grayscale */ && ch < 1) {
                readDataRLE(cdataReader, tempData, w, h, 8, 1, [0], false);
                copyChannelToRGBA(tempData, pixelData, ox, oy, 0);
                setupGrayscale(pixelData);
            }
            if (colorMode === 2 /* ColorMode.Indexed */) {
                // TODO:
                throw new Error('Indexed pattern color mode not implemented');
            }
            recoverMemory(reader, w * h);
        }
        else {
            throw new Error('Invalid pattern compression mode');
        }
        ch++;
    }
    reader.offset = end;
    return { id, name, x, y, bounds: { x: left, y: top, w: width, h: height }, data };
}
function copyChannelToRGBA(srcData, dstData, ox, oy, offset) {
    const w = srcData.width;
    const h = srcData.height;
    const width = dstData.width;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const src = x + y * w;
            const dst = (ox + x + (y + oy) * width) * 4;
            const value = srcData.data[src];
            dstData.data[dst + offset] = value;
        }
    }
}
function consumeMemory(reader, size) {
    if (reader.totalMemoryLimit !== undefined) {
        if (reader.totalMemoryLimit < size)
            throw new Error('Exceeded memory limit');
        reader.totalMemoryLimit -= size;
    }
}
function recoverMemory(reader, size) {
    if (reader.totalMemoryLimit !== undefined) {
        reader.totalMemoryLimit += size;
    }
}
//# sourceMappingURL=psdReader.js.map