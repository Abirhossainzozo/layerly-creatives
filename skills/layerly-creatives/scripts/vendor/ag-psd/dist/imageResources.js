"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceHandlersMap = exports.resourceHandlers = void 0;
const base64_js_1 = require("base64-js");
const psdReader_1 = require("./psdReader");
const psdWriter_1 = require("./psdWriter");
const helpers_1 = require("./helpers");
const utf8_1 = require("./utf8");
const descriptor_1 = require("./descriptor");
exports.resourceHandlers = [];
exports.resourceHandlersMap = {};
function addHandler(key, has, read, write) {
    const handler = { key, has, read, write };
    exports.resourceHandlers.push(handler);
    exports.resourceHandlersMap[handler.key] = handler;
}
const LOG_MOCK_HANDLERS = false;
const RESOLUTION_UNITS = [undefined, 'PPI', 'PPCM'];
const MEASUREMENT_UNITS = [undefined, 'Inches', 'Centimeters', 'Points', 'Picas', 'Columns'];
const hex = '0123456789abcdef';
function charToNibble(code) {
    if (code <= 57)
        return code - 48; // '0'-'9'
    if (code >= 97)
        return code - 87; // 'a'-'f'
    return code - 55; // 'A'-'F'
}
function byteAt(value, index) {
    return (charToNibble(value.charCodeAt(index)) << 4) | charToNibble(value.charCodeAt(index + 1));
}
function readUtf8String(reader, length) {
    const buffer = (0, psdReader_1.readBytes)(reader, length);
    return (0, utf8_1.decodeString)(buffer);
}
function writeUtf8String(writer, value) {
    const buffer = (0, utf8_1.encodeString)(value);
    (0, psdWriter_1.writeBytes)(writer, buffer);
}
function readEncodedString(reader) {
    const length = (0, psdReader_1.readUint8)(reader);
    const buffer = (0, psdReader_1.readBytes)(reader, length);
    let notAscii = false;
    for (let i = 0; i < buffer.byteLength; i++) {
        if (buffer[i] & 0x80) {
            notAscii = true;
            break;
        }
    }
    if (notAscii) {
        try {
            const decoder = new TextDecoder('gbk');
            return decoder.decode(buffer);
        }
        catch (_a) { }
    }
    return (0, utf8_1.decodeString)(buffer);
}
function writeEncodedString(writer, value) {
    let ascii = '';
    for (let i = 0, code = value.codePointAt(i++); code !== undefined; code = value.codePointAt(i++)) {
        ascii += code > 0x7f ? '?' : String.fromCodePoint(code);
    }
    const buffer = (0, utf8_1.encodeString)(ascii);
    (0, psdWriter_1.writeUint8)(writer, buffer.byteLength);
    (0, psdWriter_1.writeBytes)(writer, buffer);
}
helpers_1.MOCK_HANDLERS && addHandler(1028, // IPTC-NAA record
// IPTC-NAA record
target => target._ir1028 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 1028', left());
    target._ir1028 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1028);
});
addHandler(1061, target => target.captionDigest !== undefined, (reader, target) => {
    let captionDigest = '';
    for (let i = 0; i < 16; i++) {
        const byte = (0, psdReader_1.readUint8)(reader);
        captionDigest += hex[byte >> 4];
        captionDigest += hex[byte & 0xf];
    }
    target.captionDigest = captionDigest;
}, (writer, target) => {
    for (let i = 0; i < 16; i++) {
        (0, psdWriter_1.writeUint8)(writer, byteAt(target.captionDigest, i * 2));
    }
});
addHandler(1060, target => target.xmpMetadata !== undefined, (reader, target, left) => {
    target.xmpMetadata = readUtf8String(reader, left());
}, (writer, target) => {
    writeUtf8String(writer, target.xmpMetadata);
});
const Inte = (0, helpers_1.createEnum)('Inte', 'perceptual', {
    'perceptual': 'Img ',
    'saturation': 'Grp ',
    'relative colorimetric': 'Clrm',
    'absolute colorimetric': 'AClr',
});
helpers_1.MOCK_HANDLERS && addHandler(1085, // Windows DEVMODE. Variable OS specific info for Windows.
// Windows DEVMODE. Variable OS specific info for Windows.
target => target._ir1085 !== undefined, (reader, target, left) => {
    target._ir1085 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1085);
});
addHandler(1082, target => target.printInformation !== undefined, (reader, target) => {
    var _a, _b;
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.printInformation = {
        printerName: desc.printerName || '',
        renderingIntent: Inte.decode((_a = desc.Inte) !== null && _a !== void 0 ? _a : 'Inte.Img '),
    };
    const info = target.printInformation;
    if (desc.PstS !== undefined)
        info.printerManagesColors = desc.PstS;
    if (desc['Nm  '] !== undefined)
        info.printerProfile = desc['Nm  '];
    if (desc.MpBl !== undefined)
        info.blackPointCompensation = desc.MpBl;
    if (desc.printSixteenBit !== undefined)
        info.printSixteenBit = desc.printSixteenBit;
    if (desc.hardProof !== undefined)
        info.hardProof = desc.hardProof;
    if (desc.printProofSetup) {
        if ('Bltn' in desc.printProofSetup) {
            info.proofSetup = { builtin: desc.printProofSetup.Bltn.split('.')[1] };
        }
        else {
            info.proofSetup = {
                profile: desc.printProofSetup.profile,
                renderingIntent: Inte.decode((_b = desc.printProofSetup.Inte) !== null && _b !== void 0 ? _b : 'Inte.Img '),
                blackPointCompensation: !!desc.printProofSetup.MpBl,
                paperWhite: !!desc.printProofSetup.paperWhite,
            };
        }
    }
}, (writer, target) => {
    var _a, _b;
    const info = target.printInformation;
    const desc = {};
    if (info.printerManagesColors) {
        desc.PstS = true;
    }
    else {
        if (info.hardProof !== undefined)
            desc.hardProof = !!info.hardProof;
        desc.ClrS = 'ClrS.RGBC'; // TODO: ???
        desc['Nm  '] = (_a = info.printerProfile) !== null && _a !== void 0 ? _a : 'CIE RGB';
    }
    desc.Inte = Inte.encode(info.renderingIntent);
    if (!info.printerManagesColors)
        desc.MpBl = !!info.blackPointCompensation;
    desc.printSixteenBit = !!info.printSixteenBit;
    desc.printerName = info.printerName || '';
    if (info.proofSetup && 'profile' in info.proofSetup) {
        desc.printProofSetup = {
            profile: info.proofSetup.profile || '',
            Inte: Inte.encode(info.proofSetup.renderingIntent),
            MpBl: !!info.proofSetup.blackPointCompensation,
            paperWhite: !!info.proofSetup.paperWhite,
        };
    }
    else {
        desc.printProofSetup = {
            Bltn: ((_b = info.proofSetup) === null || _b === void 0 ? void 0 : _b.builtin) ? `builtinProof.${info.proofSetup.builtin}` : 'builtinProof.proofCMYK',
        };
    }
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'printOutput', desc);
});
helpers_1.MOCK_HANDLERS && addHandler(1083, // Print style
// Print style
target => target._ir1083 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 1083', left());
    target._ir1083 = (0, psdReader_1.readBytes)(reader, left());
    // TODO:
    // const desc = readVersionAndDescriptor(reader);
    // console.log('1083', require('util').inspect(desc, false, 99, true));
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1083);
});
addHandler(1005, target => target.resolutionInfo !== undefined, (reader, target) => {
    const horizontalResolution = (0, psdReader_1.readFixedPoint32)(reader);
    const horizontalResolutionUnit = (0, psdReader_1.readUint16)(reader);
    const widthUnit = (0, psdReader_1.readUint16)(reader);
    const verticalResolution = (0, psdReader_1.readFixedPoint32)(reader);
    const verticalResolutionUnit = (0, psdReader_1.readUint16)(reader);
    const heightUnit = (0, psdReader_1.readUint16)(reader);
    target.resolutionInfo = {
        horizontalResolution,
        horizontalResolutionUnit: RESOLUTION_UNITS[horizontalResolutionUnit] || 'PPI',
        widthUnit: MEASUREMENT_UNITS[widthUnit] || 'Inches',
        verticalResolution,
        verticalResolutionUnit: RESOLUTION_UNITS[verticalResolutionUnit] || 'PPI',
        heightUnit: MEASUREMENT_UNITS[heightUnit] || 'Inches',
    };
}, (writer, target) => {
    const info = target.resolutionInfo;
    (0, psdWriter_1.writeFixedPoint32)(writer, info.horizontalResolution || 0);
    (0, psdWriter_1.writeUint16)(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.horizontalResolutionUnit)));
    (0, psdWriter_1.writeUint16)(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.widthUnit)));
    (0, psdWriter_1.writeFixedPoint32)(writer, info.verticalResolution || 0);
    (0, psdWriter_1.writeUint16)(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.verticalResolutionUnit)));
    (0, psdWriter_1.writeUint16)(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.heightUnit)));
});
const printScaleStyles = ['centered', 'size to fit', 'user defined'];
addHandler(1062, target => target.printScale !== undefined, (reader, target) => {
    target.printScale = {
        style: printScaleStyles[(0, psdReader_1.readInt16)(reader)],
        x: (0, psdReader_1.readFloat32)(reader),
        y: (0, psdReader_1.readFloat32)(reader),
        scale: (0, psdReader_1.readFloat32)(reader),
    };
}, (writer, target) => {
    const { style, x, y, scale } = target.printScale;
    (0, psdWriter_1.writeInt16)(writer, Math.max(0, printScaleStyles.indexOf(style)));
    (0, psdWriter_1.writeFloat32)(writer, x || 0);
    (0, psdWriter_1.writeFloat32)(writer, y || 0);
    (0, psdWriter_1.writeFloat32)(writer, scale || 0);
});
addHandler(1006, target => target.alphaChannelNames !== undefined, (reader, target, left) => {
    if (!target.alphaChannelNames) { // skip if the unicode versions are already read
        target.alphaChannelNames = [];
        while (left() > 0) {
            const value = readEncodedString(reader);
            // const value = readPascalString(reader, 1);
            target.alphaChannelNames.push(value);
        }
    }
    else {
        (0, psdReader_1.skipBytes)(reader, left());
    }
}, (writer, target) => {
    for (const name of target.alphaChannelNames) {
        writeEncodedString(writer, name);
        // writePascalString(writer, name, 1);
    }
});
addHandler(1045, target => target.alphaChannelNames !== undefined, (reader, target, left) => {
    target.alphaChannelNames = [];
    while (left() > 0) {
        target.alphaChannelNames.push((0, psdReader_1.readUnicodeString)(reader));
    }
}, (writer, target) => {
    for (const name of target.alphaChannelNames) {
        (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, name);
    }
});
helpers_1.MOCK_HANDLERS && addHandler(1077, target => target._ir1077 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 1077', left());
    target._ir1077 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1077);
});
addHandler(1053, target => target.alphaIdentifiers !== undefined, (reader, target, left) => {
    target.alphaIdentifiers = [];
    while (left() >= 4) {
        target.alphaIdentifiers.push((0, psdReader_1.readUint32)(reader));
    }
}, (writer, target) => {
    for (const id of target.alphaIdentifiers) {
        (0, psdWriter_1.writeUint32)(writer, id);
    }
});
addHandler(1010, target => target.backgroundColor !== undefined, (reader, target) => target.backgroundColor = (0, psdReader_1.readColor)(reader), (writer, target) => (0, psdWriter_1.writeColor)(writer, target.backgroundColor));
addHandler(1037, target => target.globalAngle !== undefined, (reader, target) => target.globalAngle = (0, psdReader_1.readInt32)(reader), (writer, target) => (0, psdWriter_1.writeInt32)(writer, target.globalAngle));
addHandler(1049, target => target.globalAltitude !== undefined, (reader, target) => target.globalAltitude = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.globalAltitude));
addHandler(1011, target => target.printFlags !== undefined, (reader, target) => {
    target.printFlags = {
        labels: !!(0, psdReader_1.readUint8)(reader),
        cropMarks: !!(0, psdReader_1.readUint8)(reader),
        colorBars: !!(0, psdReader_1.readUint8)(reader),
        registrationMarks: !!(0, psdReader_1.readUint8)(reader),
        negative: !!(0, psdReader_1.readUint8)(reader),
        flip: !!(0, psdReader_1.readUint8)(reader),
        interpolate: !!(0, psdReader_1.readUint8)(reader),
        caption: !!(0, psdReader_1.readUint8)(reader),
        printFlags: !!(0, psdReader_1.readUint8)(reader),
    };
}, (writer, target) => {
    const flags = target.printFlags;
    (0, psdWriter_1.writeUint8)(writer, flags.labels ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, flags.cropMarks ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, flags.colorBars ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, flags.registrationMarks ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, flags.negative ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, flags.flip ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, flags.interpolate ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, flags.caption ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, flags.printFlags ? 1 : 0);
});
addHandler(1034, // Copyright flag
// Copyright flag
target => target.copyrighted !== undefined, (reader, target) => {
    target.copyrighted = !!(0, psdReader_1.readUint8)(reader);
}, (writer, target) => {
    (0, psdWriter_1.writeUint8)(writer, target.copyrighted ? 1 : 0);
});
addHandler(1035, // URL
// URL
target => target.url !== undefined, (reader, target, left) => {
    target.url = (0, psdReader_1.readAsciiString)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeAsciiString)(writer, target.url);
});
helpers_1.MOCK_HANDLERS && addHandler(10000, // Print flags
// Print flags
target => target._ir10000 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 10000', left());
    target._ir10000 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir10000);
});
helpers_1.MOCK_HANDLERS && addHandler(1013, // Color halftoning
// Color halftoning
target => target._ir1013 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 1013', left());
    target._ir1013 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1013);
});
helpers_1.MOCK_HANDLERS && addHandler(1016, // Color transfer functions
// Color transfer functions
target => target._ir1016 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 1016', left());
    target._ir1016 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1016);
});
addHandler(1080, // Count Information
// Count Information
target => target.countInformation !== undefined, (reader, target) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.countInformation = desc.countGroupList.map(g => ({
        color: { r: g['Rd  '], g: g['Grn '], b: g['Bl  '] },
        name: g['Nm  '],
        size: g['Rds '],
        fontSize: g.fontSize,
        visible: g.Vsbl,
        points: g.countObjectList.map(p => ({ x: p['X   '], y: p['Y   '] })),
    }));
}, (writer, target) => {
    const desc = {
        Vrsn: 1,
        countGroupList: target.countInformation.map(g => ({
            'Rd  ': g.color.r,
            'Grn ': g.color.g,
            'Bl  ': g.color.b,
            'Nm  ': g.name,
            'Rds ': g.size,
            fontSize: g.fontSize,
            Vsbl: g.visible,
            countObjectList: g.points.map(p => ({ 'X   ': p.x, 'Y   ': p.y })),
        })),
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'Cnt ', desc);
});
addHandler(1024, target => target.layerState !== undefined, (reader, target) => target.layerState = (0, psdReader_1.readUint16)(reader), (writer, target) => (0, psdWriter_1.writeUint16)(writer, target.layerState));
addHandler(1026, target => target.layersGroup !== undefined, (reader, target, left) => {
    target.layersGroup = [];
    while (left() > 0) {
        target.layersGroup.push((0, psdReader_1.readUint16)(reader));
    }
}, (writer, target) => {
    for (const g of target.layersGroup) {
        (0, psdWriter_1.writeUint16)(writer, g);
    }
});
addHandler(1072, target => target.layerGroupsEnabledId !== undefined, (reader, target, left) => {
    target.layerGroupsEnabledId = [];
    while (left() > 0) {
        target.layerGroupsEnabledId.push((0, psdReader_1.readUint8)(reader));
    }
}, (writer, target) => {
    for (const id of target.layerGroupsEnabledId) {
        (0, psdWriter_1.writeUint8)(writer, id);
    }
});
addHandler(1069, target => target.layerSelectionIds !== undefined, (reader, target) => {
    let count = (0, psdReader_1.readUint16)(reader);
    target.layerSelectionIds = [];
    while (count--) {
        target.layerSelectionIds.push((0, psdReader_1.readUint32)(reader));
    }
}, (writer, target) => {
    (0, psdWriter_1.writeUint16)(writer, target.layerSelectionIds.length);
    for (const id of target.layerSelectionIds) {
        (0, psdWriter_1.writeUint32)(writer, id);
    }
});
addHandler(1032, target => target.gridAndGuidesInformation !== undefined, (reader, target) => {
    const version = (0, psdReader_1.readUint32)(reader);
    const horizontal = (0, psdReader_1.readUint32)(reader);
    const vertical = (0, psdReader_1.readUint32)(reader);
    const count = (0, psdReader_1.readUint32)(reader);
    if (version !== 1)
        throw new Error(`Invalid 1032 resource version: ${version}`);
    target.gridAndGuidesInformation = {
        grid: { horizontal, vertical },
        guides: [],
    };
    for (let i = 0; i < count; i++) {
        target.gridAndGuidesInformation.guides.push({
            location: (0, psdReader_1.readUint32)(reader) / 32,
            direction: (0, psdReader_1.readUint8)(reader) ? 'horizontal' : 'vertical'
        });
    }
}, (writer, target) => {
    const info = target.gridAndGuidesInformation;
    const grid = info.grid || { horizontal: 18 * 32, vertical: 18 * 32 };
    const guides = info.guides || [];
    (0, psdWriter_1.writeUint32)(writer, 1);
    (0, psdWriter_1.writeUint32)(writer, grid.horizontal);
    (0, psdWriter_1.writeUint32)(writer, grid.vertical);
    (0, psdWriter_1.writeUint32)(writer, guides.length);
    for (const g of guides) {
        (0, psdWriter_1.writeUint32)(writer, g.location * 32);
        (0, psdWriter_1.writeUint8)(writer, g.direction === 'horizontal' ? 1 : 0);
    }
});
addHandler(1065, // Layer Comps
// Layer Comps
target => target.layerComps !== undefined, (reader, target) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
    // console.log('CompList', require('util').inspect(desc, false, 99, true));
    target.layerComps = { list: [] };
    for (const item of desc.list) {
        target.layerComps.list.push({
            id: item.compID,
            name: item['Nm  '],
            capturedInfo: item.capturedInfo,
        });
        if ('comment' in item)
            target.layerComps.list[target.layerComps.list.length - 1].comment = item.comment;
    }
    if ('lastAppliedComp' in desc)
        target.layerComps.lastApplied = desc.lastAppliedComp;
}, (writer, target) => {
    const layerComps = target.layerComps;
    const desc = { list: [] };
    for (const item of layerComps.list) {
        const t = {};
        t._classID = 'Comp';
        t['Nm  '] = item.name;
        if ('comment' in item)
            t.comment = item.comment;
        t.compID = item.id;
        t.capturedInfo = item.capturedInfo;
        desc.list.push(t);
    }
    if ('lastApplied' in layerComps)
        desc.lastAppliedComp = layerComps.lastApplied;
    // console.log('CompList', require('util').inspect(desc, false, 99, true));
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'CompList', desc);
});
helpers_1.MOCK_HANDLERS && addHandler(1092, // ???
// ???
target => target._ir1092 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 1092', left());
    // 16 bytes, seems to be 4 integers
    target._ir1092 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1092);
});
// 0 - normal, 7 - multiply, 8 - screen, 23 - difference
const onionSkinsBlendModes = [
    'normal', undefined, undefined, undefined, undefined, undefined, undefined, 'multiply',
    'screen', undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'difference',
];
addHandler(1078, // Onion Skins
// Onion Skins
target => target.onionSkins !== undefined, (reader, target) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log('1078', require('util').inspect(desc, false, 99, true));
    target.onionSkins = {
        enabled: desc.enab,
        framesBefore: desc.numBefore,
        framesAfter: desc.numAfter,
        frameSpacing: desc.Spcn,
        minOpacity: desc.minOpacity / 100,
        maxOpacity: desc.maxOpacity / 100,
        blendMode: onionSkinsBlendModes[desc.BlnM] || 'normal',
    };
}, (writer, target) => {
    const onionSkins = target.onionSkins;
    const desc = {
        Vrsn: 1,
        enab: onionSkins.enabled,
        numBefore: onionSkins.framesBefore,
        numAfter: onionSkins.framesAfter,
        Spcn: onionSkins.frameSpacing,
        minOpacity: (onionSkins.minOpacity * 100) | 0,
        maxOpacity: (onionSkins.maxOpacity * 100) | 0,
        BlnM: Math.max(0, onionSkinsBlendModes.indexOf(onionSkins.blendMode)),
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
addHandler(1075, // Timeline Information
// Timeline Information
target => target.timelineInformation !== undefined, (reader, target) => {
    var _a, _b;
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.timelineInformation = {
        enabled: desc.enab,
        frameStep: (0, descriptor_1.frac)(desc.frameStep),
        frameRate: desc.frameRate,
        time: (0, descriptor_1.frac)(desc.time),
        duration: (0, descriptor_1.frac)(desc.duration),
        workInTime: (0, descriptor_1.frac)(desc.workInTime),
        workOutTime: (0, descriptor_1.frac)(desc.workOutTime),
        repeats: desc.LCnt,
        hasMotion: desc.hasMotion,
        globalTracks: (0, descriptor_1.parseTrackList)(desc.globalTrackList, !!reader.logMissingFeatures),
    };
    if ((_b = (_a = desc.audioClipGroupList) === null || _a === void 0 ? void 0 : _a.audioClipGroupList) === null || _b === void 0 ? void 0 : _b.length) {
        target.timelineInformation.audioClipGroups = desc.audioClipGroupList.audioClipGroupList.map(g => ({
            id: g.groupID,
            muted: g.muted,
            audioClips: g.audioClipList.map(({ clipID, timeScope, muted, audioLevel, frameReader }) => ({
                id: clipID,
                start: (0, descriptor_1.frac)(timeScope.Strt),
                duration: (0, descriptor_1.frac)(timeScope.duration),
                inTime: (0, descriptor_1.frac)(timeScope.inTime),
                outTime: (0, descriptor_1.frac)(timeScope.outTime),
                muted: muted,
                audioLevel: audioLevel,
                frameReader: {
                    type: frameReader.frameReaderType,
                    mediaDescriptor: frameReader.mediaDescriptor,
                    link: {
                        name: frameReader['Lnk ']['Nm  '],
                        fullPath: frameReader['Lnk '].fullPath,
                        relativePath: frameReader['Lnk '].relPath,
                    },
                },
            })),
        }));
    }
}, (writer, target) => {
    var _a;
    const timeline = target.timelineInformation;
    const desc = {
        Vrsn: 1,
        enab: timeline.enabled,
        frameStep: timeline.frameStep,
        frameRate: timeline.frameRate,
        time: timeline.time,
        duration: timeline.duration,
        workInTime: timeline.workInTime,
        workOutTime: timeline.workOutTime,
        LCnt: timeline.repeats,
        globalTrackList: (0, descriptor_1.serializeTrackList)(timeline.globalTracks),
        audioClipGroupList: {
            audioClipGroupList: (_a = timeline.audioClipGroups) === null || _a === void 0 ? void 0 : _a.map(a => ({
                groupID: a.id,
                muted: a.muted,
                audioClipList: a.audioClips.map(c => ({
                    clipID: c.id,
                    timeScope: {
                        Vrsn: 1,
                        Strt: c.start,
                        duration: c.duration,
                        inTime: c.inTime,
                        outTime: c.outTime,
                    },
                    frameReader: {
                        frameReaderType: c.frameReader.type,
                        descVersion: 1,
                        'Lnk ': {
                            descVersion: 1,
                            'Nm  ': c.frameReader.link.name,
                            fullPath: c.frameReader.link.fullPath,
                            relPath: c.frameReader.link.relativePath,
                        },
                        mediaDescriptor: c.frameReader.mediaDescriptor,
                    },
                    muted: c.muted,
                    audioLevel: c.audioLevel,
                })),
            })),
        },
        hasMotion: timeline.hasMotion,
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc, 'anim');
});
addHandler(1076, // Sheet Disclosure
// Sheet Disclosure
target => target.sheetDisclosure !== undefined, (reader, target) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.sheetDisclosure = {};
    if (desc.sheetTimelineOptions) {
        target.sheetDisclosure.sheetTimelineOptions = desc.sheetTimelineOptions.map(o => ({
            sheetID: o.sheetID,
            sheetDisclosed: o.sheetDisclosed,
            lightsDisclosed: o.lightsDisclosed,
            meshesDisclosed: o.meshesDisclosed,
            materialsDisclosed: o.materialsDisclosed,
        }));
    }
}, (writer, target) => {
    const disclosure = target.sheetDisclosure;
    const desc = { Vrsn: 1 };
    if (disclosure.sheetTimelineOptions) {
        desc.sheetTimelineOptions = disclosure.sheetTimelineOptions.map(d => ({
            Vrsn: 2,
            sheetID: d.sheetID,
            sheetDisclosed: d.sheetDisclosed,
            lightsDisclosed: d.lightsDisclosed,
            meshesDisclosed: d.meshesDisclosed,
            materialsDisclosed: d.materialsDisclosed,
        }));
    }
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
addHandler(1054, // URL List
// URL List
target => target.urlsList !== undefined, (reader, target) => {
    const count = (0, psdReader_1.readUint32)(reader);
    target.urlsList = [];
    for (let i = 0; i < count; i++) {
        const long = (0, psdReader_1.readSignature)(reader);
        if (long !== 'slic' && reader.throwForMissingFeatures)
            throw new Error('Unknown long');
        const id = (0, psdReader_1.readUint32)(reader);
        const url = (0, psdReader_1.readUnicodeString)(reader);
        target.urlsList.push({ id, url, ref: 'slice' });
    }
}, (writer, target) => {
    const list = target.urlsList;
    (0, psdWriter_1.writeUint32)(writer, list.length);
    for (let i = 0; i < list.length; i++) {
        (0, psdWriter_1.writeSignature)(writer, 'slic');
        (0, psdWriter_1.writeUint32)(writer, list[i].id);
        (0, psdWriter_1.writeUnicodeString)(writer, list[i].url);
    }
});
function boundsToBounds(bounds) {
    return { 'Top ': bounds.top, Left: bounds.left, Btom: bounds.bottom, Rght: bounds.right };
}
function boundsFromBounds(bounds) {
    return { top: bounds['Top '], left: bounds.Left, bottom: bounds.Btom, right: bounds.Rght };
}
function clamped(array, index) {
    return array[Math.max(0, Math.min(array.length - 1, index))];
}
const sliceOrigins = ['autoGenerated', 'layer', 'userGenerated'];
const sliceTypes = ['noImage', 'image'];
const sliceAlignments = ['default'];
addHandler(1050, // Slices
// Slices
target => target.slices ? target.slices.length : 0, (reader, target) => {
    const version = (0, psdReader_1.readUint32)(reader);
    if (version === 6) {
        if (!target.slices)
            target.slices = [];
        const top = (0, psdReader_1.readInt32)(reader);
        const left = (0, psdReader_1.readInt32)(reader);
        const bottom = (0, psdReader_1.readInt32)(reader);
        const right = (0, psdReader_1.readInt32)(reader);
        const groupName = (0, psdReader_1.readUnicodeString)(reader);
        const count = (0, psdReader_1.readUint32)(reader);
        target.slices.push({ bounds: { top, left, bottom, right }, groupName, slices: [] });
        const slices = target.slices[target.slices.length - 1].slices;
        for (let i = 0; i < count; i++) {
            const id = (0, psdReader_1.readUint32)(reader);
            const groupId = (0, psdReader_1.readUint32)(reader);
            const origin = clamped(sliceOrigins, (0, psdReader_1.readUint32)(reader));
            const associatedLayerId = origin == 'layer' ? (0, psdReader_1.readUint32)(reader) : 0;
            const name = (0, psdReader_1.readUnicodeString)(reader);
            const type = clamped(sliceTypes, (0, psdReader_1.readUint32)(reader));
            const left = (0, psdReader_1.readInt32)(reader);
            const top = (0, psdReader_1.readInt32)(reader);
            const right = (0, psdReader_1.readInt32)(reader);
            const bottom = (0, psdReader_1.readInt32)(reader);
            const url = (0, psdReader_1.readUnicodeString)(reader);
            const target = (0, psdReader_1.readUnicodeString)(reader);
            const message = (0, psdReader_1.readUnicodeString)(reader);
            const altTag = (0, psdReader_1.readUnicodeString)(reader);
            const cellTextIsHTML = !!(0, psdReader_1.readUint8)(reader);
            const cellText = (0, psdReader_1.readUnicodeString)(reader);
            const horizontalAlignment = clamped(sliceAlignments, (0, psdReader_1.readUint32)(reader));
            const verticalAlignment = clamped(sliceAlignments, (0, psdReader_1.readUint32)(reader));
            const a = (0, psdReader_1.readUint8)(reader);
            const r = (0, psdReader_1.readUint8)(reader);
            const g = (0, psdReader_1.readUint8)(reader);
            const b = (0, psdReader_1.readUint8)(reader);
            const backgroundColorType = ((a + r + g + b) === 0) ? 'none' : (a === 0 ? 'matte' : 'color');
            slices.push({
                id, groupId, origin, associatedLayerId, name, target, message, altTag, cellTextIsHTML, cellText,
                horizontalAlignment, verticalAlignment, type, url,
                bounds: { top, left, bottom, right },
                backgroundColorType, backgroundColor: { r, g, b, a },
            });
        }
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        desc.slices.forEach(d => {
            const slice = slices.find(s => d.sliceID == s.id);
            if (slice) {
                slice.topOutset = d.topOutset;
                slice.leftOutset = d.leftOutset;
                slice.bottomOutset = d.bottomOutset;
                slice.rightOutset = d.rightOutset;
            }
        });
    }
    else if (version === 7 || version === 8) {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        if (!target.slices)
            target.slices = [];
        target.slices.push({
            groupName: desc.baseName,
            bounds: boundsFromBounds(desc.bounds),
            slices: desc.slices.map(s => (Object.assign(Object.assign({}, (s['Nm  '] ? { name: s['Nm  '] } : {})), { id: s.sliceID, groupId: s.groupID, associatedLayerId: 0, origin: descriptor_1.ESliceOrigin.decode(s.origin), type: descriptor_1.ESliceType.decode(s.Type), bounds: boundsFromBounds(s.bounds), url: s.url, target: s.null, message: s.Msge, altTag: s.altTag, cellTextIsHTML: s.cellTextIsHTML, cellText: s.cellText, horizontalAlignment: descriptor_1.ESliceHorzAlign.decode(s.horzAlign), verticalAlignment: descriptor_1.ESliceVertAlign.decode(s.vertAlign), backgroundColorType: descriptor_1.ESliceBGColorType.decode(s.bgColorType), backgroundColor: s.bgColor ? { r: s.bgColor['Rd  '], g: s.bgColor['Grn '], b: s.bgColor['Bl  '], a: s.bgColor.alpha } : { r: 0, g: 0, b: 0, a: 0 }, topOutset: s.topOutset || 0, leftOutset: s.leftOutset || 0, bottomOutset: s.bottomOutset || 0, rightOutset: s.rightOutset || 0 }))),
        });
    }
    else {
        throw new Error(`Invalid slices version (${version})`);
    }
}, (writer, target, index) => {
    const { bounds, groupName, slices } = target.slices[index];
    (0, psdWriter_1.writeUint32)(writer, 6); // version
    (0, psdWriter_1.writeInt32)(writer, bounds.top);
    (0, psdWriter_1.writeInt32)(writer, bounds.left);
    (0, psdWriter_1.writeInt32)(writer, bounds.bottom);
    (0, psdWriter_1.writeInt32)(writer, bounds.right);
    (0, psdWriter_1.writeUnicodeString)(writer, groupName);
    (0, psdWriter_1.writeUint32)(writer, slices.length);
    for (let i = 0; i < slices.length; i++) {
        const slice = slices[i];
        let { a, r, g, b } = slice.backgroundColor;
        if (slice.backgroundColorType === 'none') {
            a = r = g = b = 0;
        }
        else if (slice.backgroundColorType === 'matte') {
            a = 0;
            r = g = b = 255;
        }
        (0, psdWriter_1.writeUint32)(writer, slice.id);
        (0, psdWriter_1.writeUint32)(writer, slice.groupId);
        (0, psdWriter_1.writeUint32)(writer, sliceOrigins.indexOf(slice.origin));
        if (slice.origin === 'layer')
            (0, psdWriter_1.writeUint32)(writer, slice.associatedLayerId);
        (0, psdWriter_1.writeUnicodeString)(writer, slice.name || '');
        (0, psdWriter_1.writeUint32)(writer, sliceTypes.indexOf(slice.type));
        (0, psdWriter_1.writeInt32)(writer, slice.bounds.left);
        (0, psdWriter_1.writeInt32)(writer, slice.bounds.top);
        (0, psdWriter_1.writeInt32)(writer, slice.bounds.right);
        (0, psdWriter_1.writeInt32)(writer, slice.bounds.bottom);
        (0, psdWriter_1.writeUnicodeString)(writer, slice.url);
        (0, psdWriter_1.writeUnicodeString)(writer, slice.target);
        (0, psdWriter_1.writeUnicodeString)(writer, slice.message);
        (0, psdWriter_1.writeUnicodeString)(writer, slice.altTag);
        (0, psdWriter_1.writeUint8)(writer, slice.cellTextIsHTML ? 1 : 0);
        (0, psdWriter_1.writeUnicodeString)(writer, slice.cellText);
        (0, psdWriter_1.writeUint32)(writer, sliceAlignments.indexOf(slice.horizontalAlignment));
        (0, psdWriter_1.writeUint32)(writer, sliceAlignments.indexOf(slice.verticalAlignment));
        (0, psdWriter_1.writeUint8)(writer, a);
        (0, psdWriter_1.writeUint8)(writer, r);
        (0, psdWriter_1.writeUint8)(writer, g);
        (0, psdWriter_1.writeUint8)(writer, b);
    }
    const desc = {
        bounds: boundsToBounds(bounds),
        slices: [],
    };
    slices.forEach(s => {
        const slice = Object.assign(Object.assign({ sliceID: s.id, groupID: s.groupId, origin: descriptor_1.ESliceOrigin.encode(s.origin), Type: descriptor_1.ESliceType.encode(s.type), bounds: boundsToBounds(s.bounds) }, (s.name ? { 'Nm  ': s.name } : {})), { url: s.url, null: s.target, Msge: s.message, altTag: s.altTag, cellTextIsHTML: s.cellTextIsHTML, cellText: s.cellText, horzAlign: descriptor_1.ESliceHorzAlign.encode(s.horizontalAlignment), vertAlign: descriptor_1.ESliceVertAlign.encode(s.verticalAlignment), bgColorType: descriptor_1.ESliceBGColorType.encode(s.backgroundColorType) });
        if (s.backgroundColorType === 'color') {
            const { r, g, b, a } = s.backgroundColor;
            slice.bgColor = { 'Rd  ': r, 'Grn ': g, 'Bl  ': b, alpha: a };
        }
        slice.topOutset = s.topOutset || 0;
        slice.leftOutset = s.leftOutset || 0;
        slice.bottomOutset = s.bottomOutset || 0;
        slice.rightOutset = s.rightOutset || 0;
        desc.slices.push(slice);
    });
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc, 'slices');
});
addHandler(1064, target => target.pixelAspectRatio !== undefined, (reader, target) => {
    if ((0, psdReader_1.readUint32)(reader) > 2)
        throw new Error('Invalid pixelAspectRatio version');
    target.pixelAspectRatio = { aspect: (0, psdReader_1.readFloat64)(reader) };
}, (writer, target) => {
    (0, psdWriter_1.writeUint32)(writer, 2); // version
    (0, psdWriter_1.writeFloat64)(writer, target.pixelAspectRatio.aspect);
});
addHandler(1041, target => target.iccUntaggedProfile !== undefined, (reader, target) => {
    target.iccUntaggedProfile = !!(0, psdReader_1.readUint8)(reader);
}, (writer, target) => {
    (0, psdWriter_1.writeUint8)(writer, target.iccUntaggedProfile ? 1 : 0);
});
helpers_1.MOCK_HANDLERS && addHandler(1039, // ICC Profile
// ICC Profile
target => target._ir1039 !== undefined, (reader, target, left) => {
    // TODO: this is raw bytes, just return as a byte array
    LOG_MOCK_HANDLERS && console.log('image resource 1039', left());
    target._ir1039 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1039);
});
addHandler(1044, target => target.idsSeedNumber !== undefined, (reader, target) => target.idsSeedNumber = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.idsSeedNumber));
addHandler(1036, target => target.thumbnail !== undefined || target.thumbnailRaw !== undefined, (reader, target, left) => {
    const format = (0, psdReader_1.readUint32)(reader); // 1 = kJpegRGB, 0 = kRawRGB
    const width = (0, psdReader_1.readUint32)(reader);
    const height = (0, psdReader_1.readUint32)(reader);
    (0, psdReader_1.readUint32)(reader); // widthBytes = (width * bits_per_pixel + 31) / 32 * 4.
    (0, psdReader_1.readUint32)(reader); // totalSize = widthBytes * height * planes
    (0, psdReader_1.readUint32)(reader); // sizeAfterCompression
    const bitsPerPixel = (0, psdReader_1.readUint16)(reader); // 24
    const planes = (0, psdReader_1.readUint16)(reader); // 1
    if (format !== 1 || bitsPerPixel !== 24 || planes !== 1) {
        reader.logMissingFeatures && reader.log(`Invalid thumbnail data (format: ${format}, bitsPerPixel: ${bitsPerPixel}, planes: ${planes})`);
        (0, psdReader_1.skipBytes)(reader, left());
        return;
    }
    const size = left();
    const data = (0, psdReader_1.readBytes)(reader, size);
    if (reader.useRawThumbnail) {
        target.thumbnailRaw = { width, height, data };
    }
    else if (data.byteLength) {
        target.thumbnail = (0, helpers_1.createCanvasFromData)(data);
    }
}, (writer, target) => {
    var _a;
    let width = 0;
    let height = 0;
    let data = new Uint8Array(0);
    if (target.thumbnailRaw) {
        width = target.thumbnailRaw.width;
        height = target.thumbnailRaw.height;
        data = target.thumbnailRaw.data;
    }
    else {
        try {
            const dataUrl = (_a = target.thumbnail.toDataURL('image/jpeg', 1)) === null || _a === void 0 ? void 0 : _a.substring('data:image/jpeg;base64,'.length);
            if (dataUrl) {
                data = (0, base64_js_1.toByteArray)(dataUrl); // this sometimes fails for some reason, maybe some browser bugs
                width = target.thumbnail.width;
                height = target.thumbnail.height;
            }
        }
        catch (_b) { }
    }
    const bitsPerPixel = 24;
    const widthBytes = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
    const planes = 1;
    const totalSize = widthBytes * height * planes;
    const sizeAfterCompression = data.length;
    (0, psdWriter_1.writeUint32)(writer, 1); // 1 = kJpegRGB
    (0, psdWriter_1.writeUint32)(writer, width);
    (0, psdWriter_1.writeUint32)(writer, height);
    (0, psdWriter_1.writeUint32)(writer, widthBytes);
    (0, psdWriter_1.writeUint32)(writer, totalSize);
    (0, psdWriter_1.writeUint32)(writer, sizeAfterCompression);
    (0, psdWriter_1.writeUint16)(writer, bitsPerPixel);
    (0, psdWriter_1.writeUint16)(writer, planes);
    (0, psdWriter_1.writeBytes)(writer, data);
});
addHandler(1057, target => target.versionInfo !== undefined, (reader, target, left) => {
    const version = (0, psdReader_1.readUint32)(reader);
    if (version !== 1)
        throw new Error('Invalid versionInfo version');
    target.versionInfo = {
        hasRealMergedData: !!(0, psdReader_1.readUint8)(reader),
        writerName: (0, psdReader_1.readUnicodeString)(reader),
        readerName: (0, psdReader_1.readUnicodeString)(reader),
        fileVersion: (0, psdReader_1.readUint32)(reader),
    };
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const versionInfo = target.versionInfo;
    (0, psdWriter_1.writeUint32)(writer, 1); // version
    (0, psdWriter_1.writeUint8)(writer, versionInfo.hasRealMergedData ? 1 : 0);
    (0, psdWriter_1.writeUnicodeString)(writer, versionInfo.writerName);
    (0, psdWriter_1.writeUnicodeString)(writer, versionInfo.readerName);
    (0, psdWriter_1.writeUint32)(writer, versionInfo.fileVersion);
});
helpers_1.MOCK_HANDLERS && addHandler(1058, // EXIF data 1.
// EXIF data 1.
target => target._ir1058 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 1058', left());
    target._ir1058 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1058);
});
addHandler(7000, target => target.imageReadyVariables !== undefined, (reader, target, left) => {
    target.imageReadyVariables = readUtf8String(reader, left());
}, (writer, target) => {
    writeUtf8String(writer, target.imageReadyVariables);
});
addHandler(7001, target => target.imageReadyDataSets !== undefined, (reader, target, left) => {
    target.imageReadyDataSets = readUtf8String(reader, left());
}, (writer, target) => {
    writeUtf8String(writer, target.imageReadyDataSets);
});
addHandler(1088, target => target.pathSelectionState !== undefined, (reader, target, _left) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.pathSelectionState = desc['null'];
}, (writer, target) => {
    const desc = { 'null': target.pathSelectionState };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
helpers_1.MOCK_HANDLERS && addHandler(1025, target => target._ir1025 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 1025', left());
    target._ir1025 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir1025);
});
const FrmD = (0, helpers_1.createEnum)('FrmD', 'auto', {
    auto: 'Auto',
    none: 'None',
    dispose: 'Disp',
});
addHandler(4000, // Plug-In resource(s)
// Plug-In resource(s)
target => target.animations !== undefined, (reader, target, left) => {
    const key = (0, psdReader_1.readSignature)(reader);
    if (key === 'mani') {
        (0, psdReader_1.checkSignature)(reader, 'IRFR');
        (0, psdReader_1.readSection)(reader, 1, left => {
            while (left() > 0) {
                (0, psdReader_1.checkSignature)(reader, '8BIM');
                const key = (0, psdReader_1.readSignature)(reader);
                (0, psdReader_1.readSection)(reader, 1, left => {
                    if (key === 'AnDs') {
                        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                        target.animations = {
                            // desc.AFSt ???
                            frames: desc.FrIn.map(x => ({
                                id: x.FrID,
                                delay: (x.FrDl || 0) / 100,
                                dispose: x.FrDs ? FrmD.decode(x.FrDs) : 'auto', // missing == auto
                                // x.FrGA ???
                            })),
                            animations: desc.FSts.map(x => ({
                                id: x.FsID,
                                frames: x.FsFr,
                                repeats: x.LCnt,
                                activeFrame: x.AFrm || 0,
                            })),
                        };
                        // console.log('#4000 AnDs', require('util').inspect(desc, false, 99, true));
                        // console.log('#4000 AnDs:result', require('util').inspect(target.animations, false, 99, true));
                    }
                    else if (key === 'Roll') {
                        const bytes = (0, psdReader_1.readBytes)(reader, left());
                        reader.logDevFeatures && reader.log('#4000 Roll', bytes);
                    }
                    else {
                        reader.logMissingFeatures && reader.log('Unhandled subsection in #4000', key);
                    }
                });
            }
        });
    }
    else if (key === 'mopt') {
        const bytes = (0, psdReader_1.readBytes)(reader, left());
        reader.logDevFeatures && reader.log('#4000 mopt', bytes);
    }
    else {
        reader.logMissingFeatures && reader.log('Unhandled key in #4000:', key);
    }
}, (writer, target) => {
    if (target.animations) {
        (0, psdWriter_1.writeSignature)(writer, 'mani');
        (0, psdWriter_1.writeSignature)(writer, 'IRFR');
        (0, psdWriter_1.writeSection)(writer, 1, () => {
            (0, psdWriter_1.writeSignature)(writer, '8BIM');
            (0, psdWriter_1.writeSignature)(writer, 'AnDs');
            (0, psdWriter_1.writeSection)(writer, 1, () => {
                const desc = {
                    // AFSt: 0, // ???
                    FrIn: [],
                    FSts: [],
                };
                for (let i = 0; i < target.animations.frames.length; i++) {
                    const f = target.animations.frames[i];
                    const frame = {
                        FrID: f.id,
                    };
                    if (f.delay)
                        frame.FrDl = (f.delay * 100) | 0;
                    frame.FrDs = FrmD.encode(f.dispose);
                    // if (i === 0) frame.FrGA = 30; // ???
                    desc.FrIn.push(frame);
                }
                for (let i = 0; i < target.animations.animations.length; i++) {
                    const a = target.animations.animations[i];
                    const anim = {
                        FsID: a.id,
                        AFrm: a.activeFrame | 0,
                        FsFr: a.frames,
                        LCnt: a.repeats | 0,
                    };
                    desc.FSts.push(anim);
                }
                (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
            });
            // writeSignature(writer, '8BIM');
            // writeSignature(writer, 'Roll');
            // writeSection(writer, 1, () => {
            // 	writeZeros(writer, 8);
            // });
        });
    }
});
// TODO: Unfinished
helpers_1.MOCK_HANDLERS && addHandler(4001, // Plug-In resource(s)
// Plug-In resource(s)
target => target._ir4001 !== undefined, (reader, target, left) => {
    if (helpers_1.MOCK_HANDLERS) {
        LOG_MOCK_HANDLERS && console.log('image resource 4001', left());
        target._ir4001 = (0, psdReader_1.readBytes)(reader, left());
        return;
    }
    const key = (0, psdReader_1.readSignature)(reader);
    if (key === 'mfri') {
        const version = (0, psdReader_1.readUint32)(reader);
        if (version !== 2)
            throw new Error('Invalid mfri version');
        const length = (0, psdReader_1.readUint32)(reader);
        const bytes = (0, psdReader_1.readBytes)(reader, length);
        reader.logDevFeatures && reader.log('mfri', bytes);
    }
    else if (key === 'mset') {
        const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
        reader.logDevFeatures && reader.log('mset', desc);
    }
    else {
        reader.logMissingFeatures && reader.log('Unhandled key in #4001', key);
    }
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir4001);
});
// TODO: Unfinished
helpers_1.MOCK_HANDLERS && addHandler(4002, // Plug-In resource(s)
// Plug-In resource(s)
target => target._ir4002 !== undefined, (reader, target, left) => {
    LOG_MOCK_HANDLERS && console.log('image resource 4002', left());
    target._ir4002 = (0, psdReader_1.readBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeBytes)(writer, target._ir4002);
});
//# sourceMappingURL=imageResources.js.map