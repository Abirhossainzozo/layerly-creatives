"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.booleanOperations = exports.infoHandlersMap = exports.infoHandlers = void 0;
exports.readBezierKnot = readBezierKnot;
exports.readVectorMask = readVectorMask;
exports.hasMultiEffects = hasMultiEffects;
const base64_js_1 = require("base64-js");
const effectsHelpers_1 = require("./effectsHelpers");
const helpers_1 = require("./helpers");
const psdReader_1 = require("./psdReader");
const psdWriter_1 = require("./psdWriter");
const descriptor_1 = require("./descriptor");
const engineData_1 = require("./engineData");
const text_1 = require("./text");
const engineData2_1 = require("./engineData2");
const fromAtoZ = 'abcdefghijklmnopqrstuvwxyz';
exports.infoHandlers = [];
exports.infoHandlersMap = {};
function addHandler(key, has, read, write) {
    const handler = { key, has, read, write };
    exports.infoHandlers.push(handler);
    exports.infoHandlersMap[handler.key] = handler;
}
function addHandlerAlias(key, target) {
    exports.infoHandlersMap[key] = exports.infoHandlersMap[target];
}
function hasKey(key) {
    return (target) => target[key] !== undefined;
}
function readLength64(reader) {
    if ((0, psdReader_1.readUint32)(reader))
        throw new Error(`Resource size above 4 GB limit at ${reader.offset.toString(16)}`);
    return (0, psdReader_1.readUint32)(reader);
}
function writeLength64(writer, length) {
    (0, psdWriter_1.writeUint32)(writer, 0);
    (0, psdWriter_1.writeUint32)(writer, length);
}
addHandler('TySh', hasKey('text'), (reader, target, leftBytes) => {
    if ((0, psdReader_1.readInt16)(reader) !== 1)
        throw new Error(`Invalid TySh version`);
    const transform = [];
    for (let i = 0; i < 6; i++)
        transform.push((0, psdReader_1.readFloat64)(reader));
    if ((0, psdReader_1.readInt16)(reader) !== 50)
        throw new Error(`Invalid TySh text version`);
    const text = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log(require('util').inspect(text, false, 99, false), 'utf8');
    if ((0, psdReader_1.readInt16)(reader) !== 1)
        throw new Error(`Invalid TySh warp version`);
    const warp = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log(require('util').inspect(warp, false, 99, false), 'utf8');
    target.text = {
        transform,
        left: (0, psdReader_1.readFloat32)(reader),
        top: (0, psdReader_1.readFloat32)(reader),
        right: (0, psdReader_1.readFloat32)(reader),
        bottom: (0, psdReader_1.readFloat32)(reader),
        text: text['Txt '].replace(/\r/g, '\n'),
        index: text.TextIndex || 0,
        gridding: descriptor_1.textGridding.decode(text.textGridding),
        antiAlias: descriptor_1.Annt.decode(text.AntA),
        orientation: descriptor_1.Ornt.decode(text.Ornt),
        warp: {
            style: descriptor_1.warpStyle.decode(warp.warpStyle),
            value: warp.warpValue || 0,
            perspective: warp.warpPerspective || 0,
            perspectiveOther: warp.warpPerspectiveOther || 0,
            rotate: descriptor_1.Ornt.decode(warp.warpRotate),
        },
    };
    if (text.bounds)
        target.text.bounds = (0, descriptor_1.descBoundsToBounds)(text.bounds);
    if (text.boundingBox)
        target.text.boundingBox = (0, descriptor_1.descBoundsToBounds)(text.boundingBox);
    if (text.EngineData) {
        const engineData = (0, engineData_1.parseEngineData)(text.EngineData);
        const textData = (0, text_1.decodeEngineData)(engineData);
        // console.log(require('util').inspect(engineData, false, 99, false), 'utf8');
        // require('fs').writeFileSync(`layer-${target.name}.txt`, require('util').inspect(engineData, false, 99, false), 'utf8');
        // const before = parseEngineData(text.EngineData);
        // const after = encodeEngineData(engineData);
        // require('fs').writeFileSync('before.txt', require('util').inspect(before, false, 99, false), 'utf8');
        // require('fs').writeFileSync('after.txt', require('util').inspect(after, false, 99, false), 'utf8');
        // console.log(require('util').inspect(parseEngineData(text.EngineData), false, 99, true));
        target.text = Object.assign(Object.assign({}, target.text), textData);
        // console.log(require('util').inspect(target.text, false, 99, true));
    }
    (0, psdReader_1.skipBytes)(reader, leftBytes());
}, (writer, target) => {
    const text = target.text;
    const warp = text.warp || {};
    const transform = text.transform || [1, 0, 0, 1, 0, 0];
    const textDescriptor = Object.assign(Object.assign(Object.assign({ 'Txt ': (text.text || '').replace(/\r?\n/g, '\r'), textGridding: descriptor_1.textGridding.encode(text.gridding), Ornt: descriptor_1.Ornt.encode(text.orientation), AntA: descriptor_1.Annt.encode(text.antiAlias) }, (text.bounds ? { bounds: (0, descriptor_1.boundsToDescBounds)(text.bounds) } : {})), (text.boundingBox ? { boundingBox: (0, descriptor_1.boundsToDescBounds)(text.boundingBox) } : {})), { TextIndex: text.index || 0, EngineData: (0, engineData_1.serializeEngineData)((0, text_1.encodeEngineData)(text)) });
    (0, psdWriter_1.writeInt16)(writer, 1); // version
    for (let i = 0; i < 6; i++) {
        (0, psdWriter_1.writeFloat64)(writer, transform[i]);
    }
    (0, psdWriter_1.writeInt16)(writer, 50); // text version
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'TxLr', textDescriptor, 'text');
    (0, psdWriter_1.writeInt16)(writer, 1); // warp version
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'warp', encodeWarp(warp));
    (0, psdWriter_1.writeFloat32)(writer, text.left);
    (0, psdWriter_1.writeFloat32)(writer, text.top);
    (0, psdWriter_1.writeFloat32)(writer, text.right);
    (0, psdWriter_1.writeFloat32)(writer, text.bottom);
    // writeZeros(writer, 2);
});
// vector fills
addHandler('SoCo', target => target.vectorFill !== undefined && target.vectorStroke === undefined &&
    target.vectorFill.type === 'color', (reader, target) => {
    const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
}, (writer, target) => {
    const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', descriptor);
});
addHandler('GdFl', target => target.vectorFill !== undefined && target.vectorStroke === undefined &&
    (target.vectorFill.type === 'solid' || target.vectorFill.type === 'noise'), (reader, target, left) => {
    const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', descriptor);
});
addHandler('PtFl', target => target.vectorFill !== undefined && target.vectorStroke === undefined &&
    target.vectorFill.type === 'pattern', (reader, target) => {
    const descriptor = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.vectorFill = (0, descriptor_1.parseVectorContent)(descriptor);
}, (writer, target) => {
    const { descriptor } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', descriptor);
});
addHandler('vscg', target => target.vectorFill !== undefined && target.vectorStroke !== undefined, (reader, target, left) => {
    (0, psdReader_1.readSignature)(reader); // key
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.vectorFill = (0, descriptor_1.parseVectorContent)(desc);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const { descriptor, key } = (0, descriptor_1.serializeVectorContent)(target.vectorFill);
    (0, psdWriter_1.writeSignature)(writer, key);
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', descriptor);
});
function readBezierKnot(reader, width, height) {
    const y0 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
    const x0 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
    const y1 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
    const x1 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
    const y2 = (0, psdReader_1.readFixedPointPath32)(reader) * height;
    const x2 = (0, psdReader_1.readFixedPointPath32)(reader) * width;
    return [x0, y0, x1, y1, x2, y2];
}
function writeBezierKnot(writer, points, width, height) {
    (0, psdWriter_1.writeFixedPointPath32)(writer, points[1] / height); // y0
    (0, psdWriter_1.writeFixedPointPath32)(writer, points[0] / width); // x0
    (0, psdWriter_1.writeFixedPointPath32)(writer, points[3] / height); // y1
    (0, psdWriter_1.writeFixedPointPath32)(writer, points[2] / width); // x1
    (0, psdWriter_1.writeFixedPointPath32)(writer, points[5] / height); // y2
    (0, psdWriter_1.writeFixedPointPath32)(writer, points[4] / width); // x2
}
exports.booleanOperations = ['exclude', 'combine', 'subtract', 'intersect'];
function readVectorMask(reader, vectorMask, width, height, size) {
    const end = reader.offset + size;
    const paths = vectorMask.paths;
    let path = undefined;
    while ((end - reader.offset) >= 26) {
        const selector = (0, psdReader_1.readUint16)(reader);
        switch (selector) {
            case 0: // Closed subpath length record
            case 3: { // Open subpath length record
                (0, psdReader_1.readUint16)(reader); // count
                const boolOp = (0, psdReader_1.readInt16)(reader);
                const flags = (0, psdReader_1.readUint16)(reader); // bit 1 always 1 ?
                (0, psdReader_1.skipBytes)(reader, 18);
                path = {
                    open: selector === 3,
                    knots: [],
                    fillRule: flags === 2 ? 'non-zero' : 'even-odd',
                };
                if (boolOp !== -1)
                    path.operation = exports.booleanOperations[boolOp];
                paths.push(path);
                break;
            }
            case 1: // Closed subpath Bezier knot, linked
            case 2: // Closed subpath Bezier knot, unlinked
            case 4: // Open subpath Bezier knot, linked
            case 5: // Open subpath Bezier knot, unlinked
                path.knots.push({ linked: (selector === 1 || selector === 4), points: readBezierKnot(reader, width, height) });
                break;
            case 6: // Path fill rule record
                (0, psdReader_1.skipBytes)(reader, 24);
                break;
            case 7: { // Clipboard record
                // TODO: check if these need to be multiplied by document size
                const top = (0, psdReader_1.readFixedPointPath32)(reader);
                const left = (0, psdReader_1.readFixedPointPath32)(reader);
                const bottom = (0, psdReader_1.readFixedPointPath32)(reader);
                const right = (0, psdReader_1.readFixedPointPath32)(reader);
                const resolution = (0, psdReader_1.readFixedPointPath32)(reader);
                (0, psdReader_1.skipBytes)(reader, 4);
                vectorMask.clipboard = { top, left, bottom, right, resolution };
                break;
            }
            case 8: // Initial fill rule record
                vectorMask.fillStartsWithAllPixels = !!(0, psdReader_1.readUint16)(reader);
                (0, psdReader_1.skipBytes)(reader, 22);
                break;
            default: throw new Error('Invalid vmsk section');
        }
    }
    return paths;
}
addHandler('vmsk', hasKey('vectorMask'), (reader, target, left, { width, height }) => {
    if ((0, psdReader_1.readUint32)(reader) !== 3)
        throw new Error('Invalid vmsk version');
    target.vectorMask = { paths: [] };
    const vectorMask = target.vectorMask;
    const flags = (0, psdReader_1.readUint32)(reader);
    vectorMask.invert = (flags & 1) !== 0;
    vectorMask.notLink = (flags & 2) !== 0;
    vectorMask.disable = (flags & 4) !== 0;
    readVectorMask(reader, vectorMask, width, height, left());
    // drawBezierPaths(vectorMask.paths, width, height, 'out.png');
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target, { width, height }) => {
    const vectorMask = target.vectorMask;
    const flags = (vectorMask.invert ? 1 : 0) |
        (vectorMask.notLink ? 2 : 0) |
        (vectorMask.disable ? 4 : 0);
    (0, psdWriter_1.writeUint32)(writer, 3); // version
    (0, psdWriter_1.writeUint32)(writer, flags);
    // initial entry
    (0, psdWriter_1.writeUint16)(writer, 6);
    (0, psdWriter_1.writeZeros)(writer, 24);
    const clipboard = vectorMask.clipboard;
    if (clipboard) {
        (0, psdWriter_1.writeUint16)(writer, 7);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.top);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.left);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.bottom);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.right);
        (0, psdWriter_1.writeFixedPointPath32)(writer, clipboard.resolution);
        (0, psdWriter_1.writeZeros)(writer, 4);
    }
    (0, psdWriter_1.writeUint16)(writer, 8);
    (0, psdWriter_1.writeUint16)(writer, vectorMask.fillStartsWithAllPixels ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 22);
    for (const path of vectorMask.paths) {
        (0, psdWriter_1.writeUint16)(writer, path.open ? 3 : 0);
        (0, psdWriter_1.writeUint16)(writer, path.knots.length);
        (0, psdWriter_1.writeUint16)(writer, path.operation ? exports.booleanOperations.indexOf(path.operation) : -1); // -1 for undefined
        (0, psdWriter_1.writeUint16)(writer, path.fillRule === 'non-zero' ? 2 : 1);
        (0, psdWriter_1.writeZeros)(writer, 18); // TODO: these are sometimes non-zero
        const linkedKnot = path.open ? 4 : 1;
        const unlinkedKnot = path.open ? 5 : 2;
        for (const { linked, points } of path.knots) {
            (0, psdWriter_1.writeUint16)(writer, linked ? linkedKnot : unlinkedKnot);
            writeBezierKnot(writer, points, width, height);
        }
    }
});
// TODO: need to write vmsk if has outline ?
addHandlerAlias('vsms', 'vmsk');
// addHandlerAlias('vmsk', 'vsms');
addHandler('vowv', // something with vectors?
hasKey('vowv'), (reader, target) => {
    target.vowv = (0, psdReader_1.readUint32)(reader); // always 2 ????
}, (writer, target) => {
    (0, psdWriter_1.writeUint32)(writer, target.vowv);
});
addHandler('vogk', hasKey('vectorOrigination'), (reader, target, left) => {
    if ((0, psdReader_1.readInt32)(reader) !== 1)
        throw new Error(`Invalid vogk version`);
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    target.vectorOrigination = { keyDescriptorList: [] };
    for (const i of desc.keyDescriptorList) {
        const item = {};
        if (i.keyShapeInvalidated != null)
            item.keyShapeInvalidated = i.keyShapeInvalidated;
        if (i.keyOriginType != null)
            item.keyOriginType = i.keyOriginType;
        if (i.keyOriginResolution != null)
            item.keyOriginResolution = i.keyOriginResolution;
        if (i.keyOriginShapeBBox) {
            item.keyOriginShapeBoundingBox = {
                top: (0, descriptor_1.parseUnitsOrNumber)(i.keyOriginShapeBBox['Top ']),
                left: (0, descriptor_1.parseUnitsOrNumber)(i.keyOriginShapeBBox.Left),
                bottom: (0, descriptor_1.parseUnitsOrNumber)(i.keyOriginShapeBBox.Btom),
                right: (0, descriptor_1.parseUnitsOrNumber)(i.keyOriginShapeBBox.Rght),
            };
        }
        const rectRadii = i.keyOriginRRectRadii;
        if (rectRadii) {
            item.keyOriginRRectRadii = {
                topRight: (0, descriptor_1.parseUnits)(rectRadii.topRight),
                topLeft: (0, descriptor_1.parseUnits)(rectRadii.topLeft),
                bottomLeft: (0, descriptor_1.parseUnits)(rectRadii.bottomLeft),
                bottomRight: (0, descriptor_1.parseUnits)(rectRadii.bottomRight),
            };
        }
        const corners = i.keyOriginBoxCorners;
        if (corners) {
            item.keyOriginBoxCorners = [
                { x: corners.rectangleCornerA.Hrzn, y: corners.rectangleCornerA.Vrtc },
                { x: corners.rectangleCornerB.Hrzn, y: corners.rectangleCornerB.Vrtc },
                { x: corners.rectangleCornerC.Hrzn, y: corners.rectangleCornerC.Vrtc },
                { x: corners.rectangleCornerD.Hrzn, y: corners.rectangleCornerD.Vrtc },
            ];
        }
        const trnf = i.Trnf;
        if (trnf) {
            item.transform = [trnf.xx, trnf.xy, trnf.yx, trnf.yy, trnf.tx, trnf.ty];
        }
        target.vectorOrigination.keyDescriptorList.push(item);
    }
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    target;
    const orig = target.vectorOrigination;
    const desc = { keyDescriptorList: [] };
    for (let i = 0; i < orig.keyDescriptorList.length; i++) {
        const item = orig.keyDescriptorList[i];
        desc.keyDescriptorList.push({}); // we're adding keyOriginIndex at the end
        const out = desc.keyDescriptorList[desc.keyDescriptorList.length - 1];
        if (item.keyOriginType != null)
            out.keyOriginType = item.keyOriginType;
        if (item.keyOriginResolution != null)
            out.keyOriginResolution = item.keyOriginResolution;
        const radii = item.keyOriginRRectRadii;
        if (radii) {
            out.keyOriginRRectRadii = {
                unitValueQuadVersion: 1,
                topRight: (0, descriptor_1.unitsValue)(radii.topRight, 'topRight'),
                topLeft: (0, descriptor_1.unitsValue)(radii.topLeft, 'topLeft'),
                bottomLeft: (0, descriptor_1.unitsValue)(radii.bottomLeft, 'bottomLeft'),
                bottomRight: (0, descriptor_1.unitsValue)(radii.bottomRight, 'bottomRight'),
            };
        }
        const box = item.keyOriginShapeBoundingBox;
        if (box) {
            out.keyOriginShapeBBox = {
                unitValueQuadVersion: 1,
                'Top ': (0, descriptor_1.unitsValue)(box.top, 'top'),
                Left: (0, descriptor_1.unitsValue)(box.left, 'left'),
                Btom: (0, descriptor_1.unitsValue)(box.bottom, 'bottom'),
                Rght: (0, descriptor_1.unitsValue)(box.right, 'right'),
            };
        }
        const corners = item.keyOriginBoxCorners;
        if (corners && corners.length === 4) {
            out.keyOriginBoxCorners = {
                rectangleCornerA: { Hrzn: corners[0].x, Vrtc: corners[0].y },
                rectangleCornerB: { Hrzn: corners[1].x, Vrtc: corners[1].y },
                rectangleCornerC: { Hrzn: corners[2].x, Vrtc: corners[2].y },
                rectangleCornerD: { Hrzn: corners[3].x, Vrtc: corners[3].y },
            };
        }
        const transform = item.transform;
        if (transform && transform.length === 6) {
            out.Trnf = {
                xx: transform[0],
                xy: transform[1],
                yx: transform[2],
                yy: transform[3],
                tx: transform[4],
                ty: transform[5],
            };
        }
        if (item.keyShapeInvalidated != null)
            out.keyShapeInvalidated = item.keyShapeInvalidated;
        out.keyOriginIndex = i;
    }
    (0, psdWriter_1.writeInt32)(writer, 1); // version
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
addHandler('lmfx', target => target.effects !== undefined && hasMultiEffects(target.effects), (reader, target, left) => {
    const version = (0, psdReader_1.readUint32)(reader);
    if (version !== 0)
        throw new Error('Invalid lmfx version');
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log('READ', require('util').inspect(desc, false, 99, true));
    // discard if read in 'lrFX' or 'lfx2' section
    target.effects = (0, descriptor_1.parseEffects)(desc, !!reader.logMissingFeatures);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target, _, options) => {
    const desc = (0, descriptor_1.serializeEffects)(target.effects, !!options.logMissingFeatures, true);
    // console.log('WRITE', require('util').inspect(desc, false, 99, true));
    (0, psdWriter_1.writeUint32)(writer, 0); // version
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
addHandler('lrFX', hasKey('effects'), (reader, target, left) => {
    if (!target.effects)
        target.effects = (0, effectsHelpers_1.readEffects)(reader);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    (0, effectsHelpers_1.writeEffects)(writer, target.effects);
});
addHandler('luni', hasKey('name'), (reader, target, left) => {
    if (left() > 4) {
        const length = (0, psdReader_1.readUint32)(reader);
        if (left() >= (length * 2)) {
            target.name = (0, psdReader_1.readUnicodeStringWithLength)(reader, length);
        }
        else {
            if (reader.logDevFeatures)
                reader.log('name in luni section is too long');
        }
    }
    else {
        if (reader.logDevFeatures)
            reader.log('empty luni section');
    }
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    (0, psdWriter_1.writeUnicodeString)(writer, target.name);
    // writeUint16(writer, 0); // padding (but not extending string length)
});
addHandler('lnsr', hasKey('nameSource'), (reader, target) => target.nameSource = (0, psdReader_1.readSignature)(reader), (writer, target) => (0, psdWriter_1.writeSignature)(writer, target.nameSource));
addHandler('lyid', hasKey('id'), (reader, target) => {
    target.id = (0, psdReader_1.readUint32)(reader);
}, (writer, target, _psd, options) => {
    let id = target.id;
    while (options.layerIds.has(id))
        id += 100; // make sure we don't have duplicate layer ids
    (0, psdWriter_1.writeUint32)(writer, id);
    options.layerIds.add(id);
    options.layerToId.set(target, id);
});
addHandler('lsct', hasKey('sectionDivider'), (reader, target, left) => {
    target.sectionDivider = { type: (0, psdReader_1.readUint32)(reader) };
    if (left()) {
        (0, psdReader_1.checkSignature)(reader, '8BIM');
        target.sectionDivider.key = (0, psdReader_1.readSignature)(reader);
    }
    if (left()) {
        target.sectionDivider.subType = (0, psdReader_1.readUint32)(reader);
    }
}, (writer, target) => {
    (0, psdWriter_1.writeUint32)(writer, target.sectionDivider.type);
    if (target.sectionDivider.key) {
        (0, psdWriter_1.writeSignature)(writer, '8BIM');
        (0, psdWriter_1.writeSignature)(writer, target.sectionDivider.key);
        if (target.sectionDivider.subType !== undefined) {
            (0, psdWriter_1.writeUint32)(writer, target.sectionDivider.subType);
        }
    }
});
// it seems lsdk is used when there's a layer is nested more than 6 levels, but I don't know why?
// maybe some limitation of old version of PS?
addHandlerAlias('lsdk', 'lsct');
addHandler('clbl', hasKey('blendClippendElements'), (reader, target) => {
    target.blendClippendElements = !!(0, psdReader_1.readUint8)(reader);
    (0, psdReader_1.skipBytes)(reader, 3);
}, (writer, target) => {
    (0, psdWriter_1.writeUint8)(writer, target.blendClippendElements ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 3);
});
addHandler('infx', hasKey('blendInteriorElements'), (reader, target) => {
    target.blendInteriorElements = !!(0, psdReader_1.readUint8)(reader);
    (0, psdReader_1.skipBytes)(reader, 3);
}, (writer, target) => {
    (0, psdWriter_1.writeUint8)(writer, target.blendInteriorElements ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 3);
});
addHandler('knko', hasKey('knockout'), (reader, target) => {
    target.knockout = !!(0, psdReader_1.readUint8)(reader);
    (0, psdReader_1.skipBytes)(reader, 3);
}, (writer, target) => {
    (0, psdWriter_1.writeUint8)(writer, target.knockout ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 3);
});
addHandler('lmgm', hasKey('layerMaskAsGlobalMask'), (reader, target) => {
    target.layerMaskAsGlobalMask = !!(0, psdReader_1.readUint8)(reader);
    (0, psdReader_1.skipBytes)(reader, 3);
}, (writer, target) => {
    (0, psdWriter_1.writeUint8)(writer, target.layerMaskAsGlobalMask ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 3);
});
addHandler('lspf', hasKey('protected'), (reader, target) => {
    const flags = (0, psdReader_1.readUint32)(reader);
    target.protected = {
        transparency: (flags & 0x01) !== 0,
        composite: (flags & 0x02) !== 0,
        position: (flags & 0x04) !== 0,
    };
    if (flags & 0x08)
        target.protected.artboards = true;
}, (writer, target) => {
    const flags = (target.protected.transparency ? 0x01 : 0) |
        (target.protected.composite ? 0x02 : 0) |
        (target.protected.position ? 0x04 : 0) |
        (target.protected.artboards ? 0x08 : 0);
    (0, psdWriter_1.writeUint32)(writer, flags);
});
addHandler('lclr', hasKey('layerColor'), (reader, target) => {
    const color = (0, psdReader_1.readUint16)(reader);
    (0, psdReader_1.skipBytes)(reader, 6);
    target.layerColor = helpers_1.layerColors[color];
}, (writer, target) => {
    const index = helpers_1.layerColors.indexOf(target.layerColor);
    (0, psdWriter_1.writeUint16)(writer, index === -1 ? 0 : index);
    (0, psdWriter_1.writeZeros)(writer, 6);
});
addHandler('shmd', // Metadata setting
// Metadata setting
target => target.timestamp !== undefined || target.animationFrames !== undefined || target.animationFrameFlags !== undefined || target.timeline !== undefined || target.comps !== undefined, (reader, target, left) => {
    const count = (0, psdReader_1.readUint32)(reader);
    for (let i = 0; i < count; i++) {
        (0, psdReader_1.checkSignature)(reader, '8BIM');
        const key = (0, psdReader_1.readSignature)(reader);
        (0, psdReader_1.readUint8)(reader); // copy
        (0, psdReader_1.skipBytes)(reader, 3);
        (0, psdReader_1.readSection)(reader, 1, left => {
            if (key === 'cust') {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                // console.log('cust', target.name, require('util').inspect(desc, false, 99, true));
                if (desc.layerTime !== undefined)
                    target.timestamp = desc.layerTime;
            }
            else if (key === 'mlst') {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                // console.log('mlst', target.name, require('util').inspect(desc, false, 99, true));
                target.animationFrames = [];
                for (let i = 0; i < desc.LaSt.length; i++) {
                    const f = desc.LaSt[i];
                    const frame = { frames: f.FrLs };
                    if (f.enab !== undefined)
                        frame.enable = f.enab;
                    if (f.Ofst)
                        frame.offset = (0, descriptor_1.horzVrtcToXY)(f.Ofst);
                    if (f.FXRf)
                        frame.referencePoint = (0, descriptor_1.horzVrtcToXY)(f.FXRf);
                    if (f.Lefx)
                        frame.effects = (0, descriptor_1.parseEffects)(f.Lefx, !!reader.logMissingFeatures);
                    if (f.blendOptions && f.blendOptions.Opct)
                        frame.opacity = (0, descriptor_1.parsePercent)(f.blendOptions.Opct);
                    target.animationFrames.push(frame);
                }
            }
            else if (key === 'mdyn') {
                // frame flags
                (0, psdReader_1.readUint16)(reader); // unknown
                const propagate = (0, psdReader_1.readUint8)(reader);
                const flags = (0, psdReader_1.readUint8)(reader);
                target.animationFrameFlags = {
                    propagateFrameOne: !propagate,
                    unifyLayerPosition: (flags & 1) !== 0,
                    unifyLayerStyle: (flags & 2) !== 0,
                    unifyLayerVisibility: (flags & 4) !== 0,
                };
            }
            else if (key === 'tmln') {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                const timeScope = desc.timeScope;
                // console.log('tmln', target.name, target.id, require('util').inspect(desc, false, 99, true));
                const timeline = {
                    start: (0, descriptor_1.frac)(timeScope.Strt),
                    duration: (0, descriptor_1.frac)(timeScope.duration),
                    inTime: (0, descriptor_1.frac)(timeScope.inTime),
                    outTime: (0, descriptor_1.frac)(timeScope.outTime),
                    autoScope: desc.autoScope,
                    audioLevel: desc.audioLevel,
                };
                if (desc.trackList) {
                    timeline.tracks = (0, descriptor_1.parseTrackList)(desc.trackList, !!reader.logMissingFeatures);
                }
                target.timeline = timeline;
                // console.log('tmln:result', target.name, target.id, require('util').inspect(timeline, false, 99, true));
            }
            else if (key === 'cmls') {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                // console.log('cmls', require('util').inspect(desc, false, 99, true));
                target.comps = {
                    settings: [],
                };
                if (desc.origFXRefPoint)
                    target.comps.originalEffectsReferencePoint = { x: desc.origFXRefPoint.Hrzn, y: desc.origFXRefPoint.Vrtc };
                for (const item of desc.layerSettings) {
                    target.comps.settings.push({ compList: item.compList });
                    const t = target.comps.settings[target.comps.settings.length - 1];
                    if ('enab' in item)
                        t.enabled = item.enab;
                    if (item.Ofst)
                        t.offset = { x: item.Ofst.Hrzn, y: item.Ofst.Vrtc };
                    if (item.FXRefPoint)
                        t.effectsReferencePoint = { x: item.FXRefPoint.Hrzn, y: item.FXRefPoint.Vrtc };
                }
            }
            else if (key === 'extn') {
                const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
                // console.log(require('util').inspect(desc, false, 99, true));
                desc; // TODO: save this
                reader.logMissingFeatures && reader.log('Unhandled "shmd" section key', key);
            }
            else {
                reader.logMissingFeatures && reader.log('Unhandled "shmd" section key', key);
            }
            (0, psdReader_1.skipBytes)(reader, left());
        });
    }
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target, _, options) => {
    const { animationFrames, animationFrameFlags, timestamp, timeline, comps } = target;
    let count = 0;
    if (animationFrames)
        count++;
    if (animationFrameFlags)
        count++;
    if (timeline)
        count++;
    if (timestamp !== undefined)
        count++;
    if (comps)
        count++;
    (0, psdWriter_1.writeUint32)(writer, count);
    if (animationFrames) {
        (0, psdWriter_1.writeSignature)(writer, '8BIM');
        (0, psdWriter_1.writeSignature)(writer, 'mlst');
        (0, psdWriter_1.writeUint8)(writer, 0); // copy (always false)
        (0, psdWriter_1.writeZeros)(writer, 3);
        (0, psdWriter_1.writeSection)(writer, 2, () => {
            var _a;
            const desc = {
                LaID: (_a = target.id) !== null && _a !== void 0 ? _a : 0,
                LaSt: [],
            };
            for (let i = 0; i < animationFrames.length; i++) {
                const f = animationFrames[i];
                const frame = {};
                if (f.enable !== undefined)
                    frame.enab = f.enable;
                frame.FrLs = f.frames;
                if (f.offset)
                    frame.Ofst = (0, descriptor_1.xyToHorzVrtc)(f.offset);
                if (f.referencePoint)
                    frame.FXRf = (0, descriptor_1.xyToHorzVrtc)(f.referencePoint);
                if (f.effects)
                    frame.Lefx = (0, descriptor_1.serializeEffects)(f.effects, false, false);
                if (f.opacity !== undefined)
                    frame.blendOptions = { Opct: (0, descriptor_1.unitsPercent)(f.opacity) };
                desc.LaSt.push(frame);
            }
            (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
        }, true);
    }
    if (animationFrameFlags) {
        (0, psdWriter_1.writeSignature)(writer, '8BIM');
        (0, psdWriter_1.writeSignature)(writer, 'mdyn');
        (0, psdWriter_1.writeUint8)(writer, 0); // copy (always false)
        (0, psdWriter_1.writeZeros)(writer, 3);
        (0, psdWriter_1.writeSection)(writer, 2, () => {
            (0, psdWriter_1.writeUint16)(writer, 0); // unknown
            (0, psdWriter_1.writeUint8)(writer, animationFrameFlags.propagateFrameOne ? 0x0 : 0xf);
            (0, psdWriter_1.writeUint8)(writer, (animationFrameFlags.unifyLayerPosition ? 1 : 0) |
                (animationFrameFlags.unifyLayerStyle ? 2 : 0) |
                (animationFrameFlags.unifyLayerVisibility ? 4 : 0));
        });
    }
    if (timeline) {
        (0, psdWriter_1.writeSignature)(writer, '8BIM');
        (0, psdWriter_1.writeSignature)(writer, 'tmln');
        (0, psdWriter_1.writeUint8)(writer, 0); // copy (always false)
        (0, psdWriter_1.writeZeros)(writer, 3);
        (0, psdWriter_1.writeSection)(writer, 2, () => {
            const desc = {
                Vrsn: 1,
                timeScope: {
                    Vrsn: 1,
                    Strt: timeline.start,
                    duration: timeline.duration,
                    inTime: timeline.inTime,
                    outTime: timeline.outTime,
                },
                autoScope: timeline.autoScope,
                audioLevel: timeline.audioLevel,
            };
            if (timeline.tracks) {
                desc.trackList = (0, descriptor_1.serializeTrackList)(timeline.tracks);
            }
            const id = options.layerToId.get(target) || target.id;
            if (!id)
                throw new Error('You need to provide layer.id value whan writing document with animations');
            desc.LyrI = id;
            // console.log('WRITE:tmln', target.name, target.id, require('util').inspect(desc, false, 99, true));
            (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc, 'anim');
        }, true);
    }
    if (timestamp !== undefined) {
        (0, psdWriter_1.writeSignature)(writer, '8BIM');
        (0, psdWriter_1.writeSignature)(writer, 'cust');
        (0, psdWriter_1.writeUint8)(writer, 0); // copy (always false)
        (0, psdWriter_1.writeZeros)(writer, 3);
        (0, psdWriter_1.writeSection)(writer, 2, () => {
            const desc = {
                layerTime: timestamp,
            };
            (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'metadata', desc);
        }, true);
    }
    if (comps) {
        (0, psdWriter_1.writeSignature)(writer, '8BIM');
        (0, psdWriter_1.writeSignature)(writer, 'cmls');
        (0, psdWriter_1.writeUint8)(writer, 0); // copy (always false)
        (0, psdWriter_1.writeZeros)(writer, 3);
        (0, psdWriter_1.writeSection)(writer, 2, () => {
            const id = options.layerToId.get(target) || target.id;
            if (!id)
                throw new Error('You need to provide layer.id value whan writing document with layer comps');
            const desc = {};
            if (comps.originalEffectsReferencePoint) {
                desc.origFXRefPoint = { Hrzn: comps.originalEffectsReferencePoint.x, Vrtc: comps.originalEffectsReferencePoint.y };
            }
            desc.LyrI = id;
            desc.layerSettings = [];
            for (const item of comps.settings) {
                const t = {};
                if (item.enabled !== undefined)
                    t.enab = item.enabled;
                if (item.offset)
                    t.Ofst = { Hrzn: item.offset.x, Vrtc: item.offset.y };
                if (item.effectsReferencePoint)
                    t.FXRefPoint = { Hrzn: item.effectsReferencePoint.x, Vrtc: item.effectsReferencePoint.y };
                t.compList = item.compList;
                desc.layerSettings.push(t);
            }
            // console.log('cmls', require('util').inspect(desc, false, 99, true));
            (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
        }, true);
    }
});
addHandler('PxSc', () => false, (reader, target) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
    // console.log('PxSc', require('util').inspect(desc, false, 99, true));
    if (desc.pixelSourceType === 1986285651) {
        target.pixelSource = {
            type: 'vdPS',
            origin: { x: desc.origin.Hrzn, y: desc.origin.Vrtc },
            interpretation: {
                interpretAlpha: desc.interpretation.interpretAlpha.split('.')[1],
                profile: desc.interpretation.profile,
            },
            frameReader: {
                type: 'QTFR',
                link: {
                    name: desc.frameReader['Lnk ']['Nm  '],
                    fullPath: desc.frameReader['Lnk '].fullPath,
                    originalPath: desc.frameReader['Lnk '].originalPath,
                    relativePath: desc.frameReader['Lnk '].relPath,
                    alias: desc.frameReader['Lnk '].alis,
                },
                mediaDescriptor: desc.frameReader.mediaDescriptor,
            },
            showAlteredVideo: desc.showAlteredVideo,
        };
    }
    else {
        reader.log(`Unknown pixelSourceType`);
    }
}, (writer, target) => {
    const source = target.pixelSource;
    const desc = {
        _name: '',
        _classID: 'PixelSource',
        pixelSourceType: 1986285651, // vdP
        descVersion: 1,
        origin: { Hrzn: source.origin.x, Vrtc: source.origin.y },
        interpretation: {
            _name: '',
            _classID: 'footageInterpretation',
            Vrsn: 1,
            interpretAlpha: `alphaInterpretation.${source.interpretation.interpretAlpha}`,
            profile: source.interpretation.profile,
        },
        frameReader: {
            _name: '',
            _classID: 'FrameReader',
            frameReaderType: 1364477522, // QTF
            descVersion: 1,
            'Lnk ': {
                _name: '',
                _classID: 'ExternalFileLink',
                descVersion: 2,
                'Nm  ': source.frameReader.link.name,
                fullPath: source.frameReader.link.fullPath,
                originalPath: source.frameReader.link.originalPath,
                alis: source.frameReader.link.alias,
                relPath: source.frameReader.link.relativePath,
            },
            mediaDescriptor: source.frameReader.mediaDescriptor,
        },
        showAlteredVideo: source.showAlteredVideo,
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'PixelSource', desc);
});
addHandler('vstk', hasKey('vectorStroke'), (reader, target, left) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    target.vectorStroke = {
        strokeEnabled: desc.strokeEnabled,
        fillEnabled: desc.fillEnabled,
        lineWidth: (0, descriptor_1.parseUnits)(desc.strokeStyleLineWidth),
        lineDashOffset: (0, descriptor_1.parseUnits)(desc.strokeStyleLineDashOffset),
        miterLimit: desc.strokeStyleMiterLimit,
        lineCapType: descriptor_1.strokeStyleLineCapType.decode(desc.strokeStyleLineCapType),
        lineJoinType: descriptor_1.strokeStyleLineJoinType.decode(desc.strokeStyleLineJoinType),
        lineAlignment: descriptor_1.strokeStyleLineAlignment.decode(desc.strokeStyleLineAlignment),
        scaleLock: desc.strokeStyleScaleLock,
        strokeAdjust: desc.strokeStyleStrokeAdjust,
        lineDashSet: desc.strokeStyleLineDashSet.map(descriptor_1.parseUnits),
        blendMode: descriptor_1.BlnM.decode(desc.strokeStyleBlendMode),
        opacity: (0, descriptor_1.parsePercent)(desc.strokeStyleOpacity),
        content: (0, descriptor_1.parseVectorContent)(desc.strokeStyleContent),
        resolution: desc.strokeStyleResolution,
    };
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    var _a, _b, _c;
    const stroke = target.vectorStroke;
    const desc = {
        strokeStyleVersion: 2,
        strokeEnabled: !!stroke.strokeEnabled,
        fillEnabled: !!stroke.fillEnabled,
        strokeStyleLineWidth: stroke.lineWidth || { value: 3, units: 'Points' },
        strokeStyleLineDashOffset: stroke.lineDashOffset || { value: 0, units: 'Points' },
        strokeStyleMiterLimit: (_a = stroke.miterLimit) !== null && _a !== void 0 ? _a : 100,
        strokeStyleLineCapType: descriptor_1.strokeStyleLineCapType.encode(stroke.lineCapType),
        strokeStyleLineJoinType: descriptor_1.strokeStyleLineJoinType.encode(stroke.lineJoinType),
        strokeStyleLineAlignment: descriptor_1.strokeStyleLineAlignment.encode(stroke.lineAlignment),
        strokeStyleScaleLock: !!stroke.scaleLock,
        strokeStyleStrokeAdjust: !!stroke.strokeAdjust,
        strokeStyleLineDashSet: stroke.lineDashSet || [],
        strokeStyleBlendMode: descriptor_1.BlnM.encode(stroke.blendMode),
        strokeStyleOpacity: (0, descriptor_1.unitsPercent)((_b = stroke.opacity) !== null && _b !== void 0 ? _b : 1),
        strokeStyleContent: (0, descriptor_1.serializeVectorContent)(stroke.content || { type: 'color', color: { r: 0, g: 0, b: 0 } }).descriptor,
        strokeStyleResolution: (_c = stroke.resolution) !== null && _c !== void 0 ? _c : 72,
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'strokeStyle', desc);
});
addHandler('artb', // per-layer arboard info
hasKey('artboard'), (reader, target, left) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    const rect = desc.artboardRect;
    target.artboard = {
        rect: { top: rect['Top '], left: rect.Left, bottom: rect.Btom, right: rect.Rght },
        guideIndices: desc.guideIndeces,
        presetName: desc.artboardPresetName,
        color: (0, descriptor_1.parseColor)(desc['Clr ']),
        backgroundType: desc.artboardBackgroundType,
    };
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    var _a;
    const artboard = target.artboard;
    const rect = artboard.rect;
    const desc = {
        artboardRect: { 'Top ': rect.top, Left: rect.left, Btom: rect.bottom, Rght: rect.right },
        guideIndeces: artboard.guideIndices || [],
        artboardPresetName: artboard.presetName || '',
        'Clr ': (0, descriptor_1.serializeColor)(artboard.color),
        artboardBackgroundType: (_a = artboard.backgroundType) !== null && _a !== void 0 ? _a : 1,
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'artboard', desc);
});
addHandler('sn2P', hasKey('usingAlignedRendering'), (reader, target) => target.usingAlignedRendering = !!(0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.usingAlignedRendering ? 1 : 0));
const placedLayerTypes = ['unknown', 'vector', 'raster', 'image stack'];
function parseWarp(warp) {
    var _a, _b, _c, _d, _e, _f;
    const result = Object.assign(Object.assign({ style: descriptor_1.warpStyle.decode(warp.warpStyle) }, (warp.warpValues ? { values: warp.warpValues } : { value: warp.warpValue || 0 })), { perspective: warp.warpPerspective || 0, perspectiveOther: warp.warpPerspectiveOther || 0, rotate: descriptor_1.Ornt.decode(warp.warpRotate), bounds: warp.bounds && {
            top: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds['Top ']),
            left: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Left),
            bottom: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Btom),
            right: (0, descriptor_1.parseUnitsOrNumber)(warp.bounds.Rght),
        }, uOrder: warp.uOrder, vOrder: warp.vOrder });
    if (warp.deformNumRows != null || warp.deformNumCols != null) {
        result.deformNumRows = warp.deformNumRows;
        result.deformNumCols = warp.deformNumCols;
    }
    const envelopeWarp = warp.customEnvelopeWarp;
    if (envelopeWarp) {
        result.customEnvelopeWarp = {
            meshPoints: [],
        };
        const xs = ((_a = envelopeWarp.meshPoints.find(i => i.type === 'Hrzn')) === null || _a === void 0 ? void 0 : _a.values) || [];
        const ys = ((_b = envelopeWarp.meshPoints.find(i => i.type === 'Vrtc')) === null || _b === void 0 ? void 0 : _b.values) || [];
        for (let i = 0; i < xs.length; i++) {
            result.customEnvelopeWarp.meshPoints.push({ x: xs[i], y: ys[i] });
        }
        if (envelopeWarp.quiltSliceX || envelopeWarp.quiltSliceY) {
            result.customEnvelopeWarp.quiltSliceX = ((_d = (_c = envelopeWarp.quiltSliceX) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.values) || [];
            result.customEnvelopeWarp.quiltSliceY = ((_f = (_e = envelopeWarp.quiltSliceY) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.values) || [];
        }
    }
    return result;
}
function isQuiltWarp(warp) {
    var _a, _b;
    return warp.deformNumCols != null || warp.deformNumRows != null ||
        ((_a = warp.customEnvelopeWarp) === null || _a === void 0 ? void 0 : _a.quiltSliceX) || ((_b = warp.customEnvelopeWarp) === null || _b === void 0 ? void 0 : _b.quiltSliceY);
}
function encodeWarp(warp) {
    const bounds = warp.bounds;
    const desc = Object.assign(Object.assign({ warpStyle: descriptor_1.warpStyle.encode(warp.style) }, (warp.values ? { warpValues: warp.values } : { warpValue: warp.value || 0 })), { warpPerspective: warp.perspective || 0, warpPerspectiveOther: warp.perspectiveOther || 0, warpRotate: descriptor_1.Ornt.encode(warp.rotate), bounds: /*1 ? { // testing
            _classID: 'classFloatRect',
            'Top ': bounds && bounds.top && bounds.top.value || 0,
            Left: bounds && bounds.left && bounds.left.value || 0,
            Btom: bounds && bounds.bottom && bounds.bottom.value || 0,
            Rght: bounds && bounds.right && bounds.right.value || 0,
        } :*/ {
            'Top ': (0, descriptor_1.unitsValue)(bounds && bounds.top || { units: 'Pixels', value: 0 }, 'bounds.top'),
            Left: (0, descriptor_1.unitsValue)(bounds && bounds.left || { units: 'Pixels', value: 0 }, 'bounds.left'),
            Btom: (0, descriptor_1.unitsValue)(bounds && bounds.bottom || { units: 'Pixels', value: 0 }, 'bounds.bottom'),
            Rght: (0, descriptor_1.unitsValue)(bounds && bounds.right || { units: 'Pixels', value: 0 }, 'bounds.right'),
        }, uOrder: warp.uOrder || 0, vOrder: warp.vOrder || 0 });
    const isQuilt = isQuiltWarp(warp);
    if (isQuilt) {
        const desc2 = desc;
        desc2.deformNumRows = warp.deformNumRows || 0;
        desc2.deformNumCols = warp.deformNumCols || 0;
    }
    const customEnvelopeWarp = warp.customEnvelopeWarp;
    if (customEnvelopeWarp) {
        const meshPoints = customEnvelopeWarp.meshPoints || [];
        if (isQuilt) {
            const desc2 = desc;
            desc2.customEnvelopeWarp = {
                _name: '',
                _classID: 'customEnvelopeWarp',
                quiltSliceX: [{
                        type: 'quiltSliceX',
                        values: customEnvelopeWarp.quiltSliceX || [],
                    }],
                quiltSliceY: [{
                        type: 'quiltSliceY',
                        values: customEnvelopeWarp.quiltSliceY || [],
                    }],
                meshPoints: [
                    { type: 'Hrzn', values: meshPoints.map(p => p.x) },
                    { type: 'Vrtc', values: meshPoints.map(p => p.y) },
                ],
            };
        }
        else {
            desc.customEnvelopeWarp = {
                _name: '',
                _classID: 'customEnvelopeWarp',
                meshPoints: [
                    { type: 'Hrzn', values: meshPoints.map(p => p.x) },
                    { type: 'Vrtc', values: meshPoints.map(p => p.y) },
                ],
            };
        }
    }
    return desc;
}
addHandler('PlLd', hasKey('placedLayer'), (reader, target, left) => {
    if ((0, psdReader_1.readSignature)(reader) !== 'plcL')
        throw new Error(`Invalid PlLd signature`);
    if ((0, psdReader_1.readInt32)(reader) !== 3)
        throw new Error(`Invalid PlLd version`);
    const id = (0, psdReader_1.readPascalString)(reader, 1);
    const pageNumber = (0, psdReader_1.readInt32)(reader);
    const totalPages = (0, psdReader_1.readInt32)(reader); // TODO: check how this works ?
    (0, psdReader_1.readInt32)(reader); // anitAliasPolicy 16
    const placedLayerType = (0, psdReader_1.readInt32)(reader); // 0 = unknown, 1 = vector, 2 = raster, 3 = image stack
    if (!placedLayerTypes[placedLayerType])
        throw new Error('Invalid PlLd type');
    const transform = [];
    for (let i = 0; i < 8; i++)
        transform.push((0, psdReader_1.readFloat64)(reader)); // x, y of 4 corners of the transform
    const warpVersion = (0, psdReader_1.readInt32)(reader);
    if (warpVersion !== 0)
        throw new Error(`Invalid Warp version ${warpVersion}`);
    const warp = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.placedLayer = target.placedLayer || {
        id,
        type: placedLayerTypes[placedLayerType],
        pageNumber,
        totalPages,
        transform,
        warp: parseWarp(warp),
    };
    // console.log('PlLd warp', require('util').inspect(warp, false, 99, true));
    // console.log('PlLd', require('util').inspect(target.placedLayer, false, 99, true));
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const placed = target.placedLayer;
    (0, psdWriter_1.writeSignature)(writer, 'plcL');
    (0, psdWriter_1.writeInt32)(writer, 3); // version
    if (!placed.id || typeof placed.id !== 'string' || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(placed.id)) {
        throw new Error('Placed layer ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)');
    }
    (0, psdWriter_1.writePascalString)(writer, placed.id, 1);
    (0, psdWriter_1.writeInt32)(writer, placed.pageNumber || 1);
    (0, psdWriter_1.writeInt32)(writer, placed.totalPages || 1);
    (0, psdWriter_1.writeInt32)(writer, 16); // anitAliasPolicy
    if (placedLayerTypes.indexOf(placed.type) === -1)
        throw new Error('Invalid placedLayer type');
    (0, psdWriter_1.writeInt32)(writer, placedLayerTypes.indexOf(placed.type));
    for (let i = 0; i < 8; i++)
        (0, psdWriter_1.writeFloat64)(writer, placed.transform[i]);
    (0, psdWriter_1.writeInt32)(writer, 0); // warp version
    const warp = getWarpFromPlacedLayer(placed);
    const isQuilt = isQuiltWarp(warp);
    const type = isQuilt ? 'quiltWarp' : 'warp';
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', type, encodeWarp(warp), type);
});
function uint8ToFloat32(array) {
    return new Float32Array(array.buffer.slice(array.byteOffset), 0, array.byteLength / 4);
}
function uint8ToUint32(array) {
    return new Uint32Array(array.buffer.slice(array.byteOffset), 0, array.byteLength / 4);
}
function toUint8(array) {
    return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
}
function arrayToPoints(array) {
    const points = [];
    for (let i = 0; i < array.length; i += 2) {
        points.push({ x: array[i], y: array[i + 1] });
    }
    return points;
}
function pointsToArray(points) {
    const array = [];
    for (let i = 0; i < points.length; i++) {
        array.push(points[i].x, points[i].y);
    }
    return array;
}
function uint8ToPoints(array) {
    return arrayToPoints(uint8ToFloat32(array));
}
function hrznVrtcToPoint(desc) {
    return {
        x: (0, descriptor_1.parseUnits)(desc.Hrzn),
        y: (0, descriptor_1.parseUnits)(desc.Vrtc),
    };
}
function pointToHrznVrtc(point) {
    return {
        _name: '',
        _classID: 'Pnt ',
        Hrzn: (0, descriptor_1.unitsValue)(point.x, 'x'),
        Vrtc: (0, descriptor_1.unitsValue)(point.y, 'y'),
    };
}
function parseFilterFXItem(f, options) {
    const base = {
        name: f['Nm  '],
        opacity: (0, descriptor_1.parsePercent)(f.blendOptions.Opct),
        blendMode: descriptor_1.BlnM.decode(f.blendOptions['Md  ']),
        enabled: f.enab,
        hasOptions: f.hasoptions,
        foregroundColor: (0, descriptor_1.parseColor)(f.FrgC),
        backgroundColor: (0, descriptor_1.parseColor)(f.BckC),
    };
    if ('Fltr' in f) {
        switch (f.Fltr._classID) {
            case 'boxblur': return Object.assign(Object.assign({}, base), { type: 'box blur', filter: {
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                } });
            case 'GsnB': return Object.assign(Object.assign({}, base), { type: 'gaussian blur', filter: {
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                } });
            case 'MtnB': return Object.assign(Object.assign({}, base), { type: 'motion blur', filter: {
                    angle: f.Fltr.Angl,
                    distance: (0, descriptor_1.parseUnits)(f.Fltr.Dstn),
                } });
            case 'RdlB': return Object.assign(Object.assign({}, base), { type: 'radial blur', filter: {
                    amount: f.Fltr.Amnt,
                    method: descriptor_1.BlrM.decode(f.Fltr.BlrM),
                    quality: descriptor_1.BlrQ.decode(f.Fltr.BlrQ),
                } });
            case 'shapeBlur': return Object.assign(Object.assign({}, base), { type: 'shape blur', filter: {
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                    customShape: { name: f.Fltr.customShape['Nm  '], id: f.Fltr.customShape.Idnt },
                } });
            case 'SmrB': return Object.assign(Object.assign({}, base), { type: 'smart blur', filter: {
                    radius: f.Fltr['Rds '],
                    threshold: f.Fltr.Thsh,
                    quality: descriptor_1.SmBQ.decode(f.Fltr.SmBQ),
                    mode: descriptor_1.SmBM.decode(f.Fltr.SmBM),
                } });
            case 'surfaceBlur': return Object.assign(Object.assign({}, base), { type: 'surface blur', filter: {
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                    threshold: f.Fltr.Thsh,
                } });
            case 'Dspl': return Object.assign(Object.assign({}, base), { type: 'displace', filter: {
                    horizontalScale: f.Fltr.HrzS,
                    verticalScale: f.Fltr.VrtS,
                    displacementMap: descriptor_1.DspM.decode(f.Fltr.DspM),
                    undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA),
                    displacementFile: {
                        signature: f.Fltr.DspF.sig,
                        path: f.Fltr.DspF.path, // TODO: this is decoded incorrectly ???
                    },
                } });
            case 'Pnch': return Object.assign(Object.assign({}, base), { type: 'pinch', filter: {
                    amount: f.Fltr.Amnt,
                } });
            case 'Plr ': return Object.assign(Object.assign({}, base), { type: 'polar coordinates', filter: {
                    conversion: descriptor_1.Cnvr.decode(f.Fltr.Cnvr),
                } });
            case 'Rple': return Object.assign(Object.assign({}, base), { type: 'ripple', filter: {
                    amount: f.Fltr.Amnt,
                    size: descriptor_1.RplS.decode(f.Fltr.RplS),
                } });
            case 'Shr ': return Object.assign(Object.assign({}, base), { type: 'shear', filter: {
                    shearPoints: f.Fltr.ShrP.map(p => ({ x: p.Hrzn, y: p.Vrtc })),
                    shearStart: f.Fltr.ShrS,
                    shearEnd: f.Fltr.ShrE,
                    undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA),
                } });
            case 'Sphr': return Object.assign(Object.assign({}, base), { type: 'spherize', filter: {
                    amount: f.Fltr.Amnt,
                    mode: descriptor_1.SphM.decode(f.Fltr.SphM),
                } });
            case 'Twrl': return Object.assign(Object.assign({}, base), { type: 'twirl', filter: {
                    angle: f.Fltr.Angl,
                } });
            case 'Wave': return Object.assign(Object.assign({}, base), { type: 'wave', filter: {
                    numberOfGenerators: f.Fltr.NmbG,
                    type: descriptor_1.Wvtp.decode(f.Fltr.Wvtp),
                    wavelength: { min: f.Fltr.WLMn, max: f.Fltr.WLMx },
                    amplitude: { min: f.Fltr.AmMn, max: f.Fltr.AmMx },
                    scale: { x: f.Fltr.SclH, y: f.Fltr.SclV },
                    randomSeed: f.Fltr.RndS,
                    undefinedAreas: descriptor_1.UndA.decode(f.Fltr.UndA),
                } });
            case 'ZgZg': return Object.assign(Object.assign({}, base), { type: 'zigzag', filter: {
                    amount: f.Fltr.Amnt,
                    ridges: f.Fltr.NmbR,
                    style: descriptor_1.ZZTy.decode(f.Fltr.ZZTy),
                } });
            case 'AdNs': return Object.assign(Object.assign({}, base), { type: 'add noise', filter: {
                    amount: (0, descriptor_1.parsePercent)(f.Fltr.Nose),
                    distribution: descriptor_1.Dstr.decode(f.Fltr.Dstr),
                    monochromatic: f.Fltr.Mnch,
                    randomSeed: f.Fltr.FlRs,
                } });
            case 'DstS': return Object.assign(Object.assign({}, base), { type: 'dust and scratches', filter: {
                    radius: f.Fltr['Rds '],
                    threshold: f.Fltr.Thsh,
                } });
            case 'Mdn ': return Object.assign(Object.assign({}, base), { type: 'median', filter: {
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                } });
            case 'denoise': return Object.assign(Object.assign({}, base), { type: 'reduce noise', filter: {
                    preset: f.Fltr.preset,
                    removeJpegArtifact: f.Fltr.removeJPEGArtifact,
                    reduceColorNoise: (0, descriptor_1.parsePercent)(f.Fltr.ClNs),
                    sharpenDetails: (0, descriptor_1.parsePercent)(f.Fltr.Shrp),
                    channelDenoise: f.Fltr.channelDenoise.map(c => (Object.assign({ channels: c.Chnl.map(descriptor_1.Chnl.decode), amount: c.Amnt }, (c.EdgF ? { preserveDetails: c.EdgF } : {})))),
                } });
            case 'ClrH': return Object.assign(Object.assign({}, base), { type: 'color halftone', filter: {
                    radius: f.Fltr['Rds '],
                    angle1: f.Fltr.Ang1,
                    angle2: f.Fltr.Ang2,
                    angle3: f.Fltr.Ang3,
                    angle4: f.Fltr.Ang4,
                } });
            case 'Crst': return Object.assign(Object.assign({}, base), { type: 'crystallize', filter: {
                    cellSize: f.Fltr.ClSz,
                    randomSeed: f.Fltr.FlRs,
                } });
            case 'Mztn': return Object.assign(Object.assign({}, base), { type: 'mezzotint', filter: {
                    type: descriptor_1.MztT.decode(f.Fltr.MztT),
                    randomSeed: f.Fltr.FlRs,
                } });
            case 'Msc ': return Object.assign(Object.assign({}, base), { type: 'mosaic', filter: {
                    cellSize: (0, descriptor_1.parseUnits)(f.Fltr.ClSz),
                } });
            case 'Pntl': return Object.assign(Object.assign({}, base), { type: 'pointillize', filter: {
                    cellSize: f.Fltr.ClSz,
                    randomSeed: f.Fltr.FlRs,
                } });
            case 'Clds': return Object.assign(Object.assign({}, base), { type: 'clouds', filter: {
                    randomSeed: f.Fltr.FlRs,
                } });
            case 'DfrC': return Object.assign(Object.assign({}, base), { type: 'difference clouds', filter: {
                    randomSeed: f.Fltr.FlRs,
                } });
            case 'Fbrs': return Object.assign(Object.assign({}, base), { type: 'fibers', filter: {
                    variance: f.Fltr.Vrnc,
                    strength: f.Fltr.Strg,
                    randomSeed: f.Fltr.RndS,
                } });
            case 'LnsF': return Object.assign(Object.assign({}, base), { type: 'lens flare', filter: {
                    brightness: f.Fltr.Brgh,
                    position: { x: f.Fltr.FlrC.Hrzn, y: f.Fltr.FlrC.Vrtc },
                    lensType: descriptor_1.Lns.decode(f.Fltr['Lns ']),
                } });
            case 'smartSharpen': return Object.assign(Object.assign({}, base), { type: 'smart sharpen', filter: {
                    amount: (0, descriptor_1.parsePercent)(f.Fltr.Amnt),
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                    threshold: f.Fltr.Thsh,
                    angle: f.Fltr.Angl,
                    moreAccurate: f.Fltr.moreAccurate,
                    blur: descriptor_1.blurType.decode(f.Fltr.blur),
                    preset: f.Fltr.preset,
                    shadow: {
                        fadeAmount: (0, descriptor_1.parsePercent)(f.Fltr.sdwM.Amnt),
                        tonalWidth: (0, descriptor_1.parsePercent)(f.Fltr.sdwM.Wdth),
                        radius: f.Fltr.sdwM['Rds '],
                    },
                    highlight: {
                        fadeAmount: (0, descriptor_1.parsePercent)(f.Fltr.hglM.Amnt),
                        tonalWidth: (0, descriptor_1.parsePercent)(f.Fltr.hglM.Wdth),
                        radius: f.Fltr.hglM['Rds '],
                    },
                } });
            case 'UnsM': return Object.assign(Object.assign({}, base), { type: 'unsharp mask', filter: {
                    amount: (0, descriptor_1.parsePercent)(f.Fltr.Amnt),
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                    threshold: f.Fltr.Thsh,
                } });
            case 'Dfs ': return Object.assign(Object.assign({}, base), { type: 'diffuse', filter: {
                    mode: descriptor_1.DfsM.decode(f.Fltr['Md  ']),
                    randomSeed: f.Fltr.FlRs,
                } });
            case 'Embs': return Object.assign(Object.assign({}, base), { type: 'emboss', filter: {
                    angle: f.Fltr.Angl,
                    height: f.Fltr.Hght,
                    amount: f.Fltr.Amnt,
                } });
            case 'Extr': return Object.assign(Object.assign({}, base), { type: 'extrude', filter: {
                    type: descriptor_1.ExtT.decode(f.Fltr.ExtT),
                    size: f.Fltr.ExtS,
                    depth: f.Fltr.ExtD,
                    depthMode: descriptor_1.ExtR.decode(f.Fltr.ExtR),
                    randomSeed: f.Fltr.FlRs,
                    solidFrontFaces: f.Fltr.ExtF,
                    maskIncompleteBlocks: f.Fltr.ExtM,
                } });
            case 'Tls ': return Object.assign(Object.assign({}, base), { type: 'tiles', filter: {
                    numberOfTiles: f.Fltr.TlNm,
                    maximumOffset: f.Fltr.TlOf,
                    fillEmptyAreaWith: descriptor_1.FlCl.decode(f.Fltr.FlCl),
                    randomSeed: f.Fltr.FlRs,
                } });
            case 'TrcC': return Object.assign(Object.assign({}, base), { type: 'trace contour', filter: {
                    level: f.Fltr['Lvl '],
                    edge: descriptor_1.CntE.decode(f.Fltr['Edg ']),
                } });
            case 'Wnd ': return Object.assign(Object.assign({}, base), { type: 'wind', filter: {
                    method: descriptor_1.WndM.decode(f.Fltr.WndM),
                    direction: descriptor_1.Drct.decode(f.Fltr.Drct),
                } });
            case 'Dntr': return Object.assign(Object.assign({}, base), { type: 'de-interlace', filter: {
                    eliminate: descriptor_1.IntE.decode(f.Fltr.IntE),
                    newFieldsBy: descriptor_1.IntC.decode(f.Fltr.IntC),
                } });
            case 'Cstm': return Object.assign(Object.assign({}, base), { type: 'custom', filter: {
                    scale: f.Fltr['Scl '],
                    offset: f.Fltr.Ofst,
                    matrix: f.Fltr.Mtrx,
                } });
            case 'HghP': return Object.assign(Object.assign({}, base), { type: 'high pass', filter: {
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                } });
            case 'Mxm ': return Object.assign(Object.assign({}, base), { type: 'maximum', filter: {
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                } });
            case 'Mnm ': return Object.assign(Object.assign({}, base), { type: 'minimum', filter: {
                    radius: (0, descriptor_1.parseUnits)(f.Fltr['Rds ']),
                } });
            case 'Ofst': return Object.assign(Object.assign({}, base), { type: 'offset', filter: {
                    horizontal: f.Fltr.Hrzn,
                    vertical: f.Fltr.Vrtc,
                    undefinedAreas: descriptor_1.FlMd.decode(f.Fltr['Fl  ']),
                } });
            case 'rigidTransform': return Object.assign(Object.assign({}, base), { type: 'puppet', filter: {
                    rigidType: f.Fltr.rigidType,
                    bounds: [
                        { x: f.Fltr.PuX0, y: f.Fltr.PuY0, },
                        { x: f.Fltr.PuX1, y: f.Fltr.PuY1, },
                        { x: f.Fltr.PuX2, y: f.Fltr.PuY2, },
                        { x: f.Fltr.PuX3, y: f.Fltr.PuY3, },
                    ],
                    puppetShapeList: f.Fltr.puppetShapeList.map(p => ({
                        rigidType: p.rigidType,
                        // TODO: VrsM
                        // TODO: VrsN
                        originalVertexArray: uint8ToPoints(p.originalVertexArray),
                        deformedVertexArray: uint8ToPoints(p.deformedVertexArray),
                        indexArray: Array.from(uint8ToUint32(p.indexArray)),
                        pinOffsets: arrayToPoints(p.pinOffsets),
                        posFinalPins: arrayToPoints(p.posFinalPins),
                        pinVertexIndices: p.pinVertexIndices,
                        selectedPin: p.selectedPin,
                        pinPosition: arrayToPoints(p.PinP),
                        pinRotation: p.PnRt,
                        pinOverlay: p.PnOv,
                        pinDepth: p.PnDp,
                        meshQuality: p.meshQuality,
                        meshExpansion: p.meshExpansion,
                        meshRigidity: p.meshRigidity,
                        imageResolution: p.imageResolution,
                        meshBoundaryPath: {
                            pathComponents: p.meshBoundaryPath.pathComponents.map(c => ({
                                shapeOperation: c.shapeOperation.split('.')[1],
                                paths: c.SbpL.map(t => ({
                                    closed: t.Clsp,
                                    points: t['Pts '].map(pt => ({
                                        anchor: hrznVrtcToPoint(pt.Anch),
                                        forward: hrznVrtcToPoint(pt['Fwd ']),
                                        backward: hrznVrtcToPoint(pt['Bwd ']),
                                        smooth: pt.Smoo,
                                    })),
                                })),
                            })),
                        },
                    })),
                } });
            case 'PbPl': {
                const parameters = [];
                const Flrt = f.Fltr;
                for (let i = 0; i < fromAtoZ.length; i++) {
                    if (!Flrt[`PN${fromAtoZ[i]}a`])
                        break;
                    for (let j = 0; j < fromAtoZ.length; j++) {
                        if (!Flrt[`PN${fromAtoZ[i]}${fromAtoZ[j]}`])
                            break;
                        parameters.push({
                            name: Flrt[`PN${fromAtoZ[i]}${fromAtoZ[j]}`],
                            value: Flrt[`PF${fromAtoZ[i]}${fromAtoZ[j]}`]
                        });
                    }
                }
                return Object.assign(Object.assign({}, base), { type: 'oil paint plugin', filter: {
                        name: f.Fltr.KnNm,
                        gpu: f.Fltr.GpuY,
                        lighting: f.Fltr.LIWy,
                        parameters,
                    } });
            }
            // case 2089: return {
            // 	...base,
            // 	type: 'adaptive wide angle',
            // 	params: {
            // 		correction: prjM.decode(f.Fltr.prjM),
            // 		focalLength: f.Fltr.focL,
            // 		cropFactor: f.Fltr.CrpF,
            // 		imageScale: f.Fltr.imgS,
            // 		imageX: f.Fltr.imgX,
            // 		imageY: f.Fltr.imgY,
            // 	},
            // };
            case 'HsbP': return Object.assign(Object.assign({}, base), { type: 'hsb/hsl', filter: {
                    inputMode: descriptor_1.ClrS.decode(f.Fltr.Inpt),
                    rowOrder: descriptor_1.ClrS.decode(f.Fltr.Otpt),
                } });
            case 'oilPaint': return Object.assign(Object.assign({}, base), { type: 'oil paint', filter: {
                    lightingOn: f.Fltr.lightingOn,
                    stylization: f.Fltr.stylization,
                    cleanliness: f.Fltr.cleanliness,
                    brushScale: f.Fltr.brushScale,
                    microBrush: f.Fltr.microBrush,
                    lightDirection: f.Fltr.LghD,
                    specularity: f.Fltr.specularity,
                } });
            case 'LqFy':
                {
                    return Object.assign(Object.assign({}, base), { type: 'liquify', filter: {
                            liquifyMesh: f.Fltr.LqMe,
                        } });
                }
                ;
            case 'perspectiveWarpTransform':
                {
                    return Object.assign(Object.assign({}, base), { type: 'perspective warp', filter: {
                            vertices: f.Fltr.vertices.map(hrznVrtcToPoint),
                            warpedVertices: f.Fltr.warpedVertices.map(hrznVrtcToPoint),
                            quads: f.Fltr.quads.map(q => q.indices),
                        } });
                }
                ;
            case 'Crvs':
                {
                    return Object.assign(Object.assign({}, base), { type: 'curves', filter: Object.assign({ presetKind: descriptor_1.presetKindType.decode(f.Fltr.presetKind) }, (f.Fltr.Adjs ? {
                            adjustments: f.Fltr.Adjs.map(a => {
                                const channels = a.Chnl.map(descriptor_1.Chnl.decode);
                                if (a['Crv ']) {
                                    return {
                                        channels,
                                        curve: a['Crv '].map(c => {
                                            const point = { x: c.Hrzn, y: c.Vrtc };
                                            if (c.Cnty)
                                                point.curved = true;
                                            return point;
                                        }),
                                    };
                                }
                                else if (a.Mpng) {
                                    return { channels, values: a.Mpng };
                                }
                                else {
                                    throw new Error(`Unknown curve adjustment`);
                                }
                            })
                        } : {})) });
                }
                ;
            case 'BrgC':
                {
                    return Object.assign(Object.assign({}, base), { type: 'brightness/contrast', filter: {
                            brightness: f.Fltr.Brgh,
                            contrast: f.Fltr.Cntr,
                            useLegacy: !!f.Fltr.useLegacy,
                        } });
                }
                ;
            default:
                if (options.throwForMissingFeatures) {
                    // console.log('FILTER', require('util').inspect(f, false, 99, true));
                    throw new Error(`Unknown filter classId: ${f.Fltr._classID}`);
                }
                return undefined;
        }
    }
    else {
        switch (f.filterID) {
            case 1098281575: return Object.assign(Object.assign({}, base), { type: 'average' });
            case 1114403360: return Object.assign(Object.assign({}, base), { type: 'blur' });
            case 1114403405: return Object.assign(Object.assign({}, base), { type: 'blur more' });
            case 1148416099: return Object.assign(Object.assign({}, base), { type: 'despeckle' });
            case 1180922912: return Object.assign(Object.assign({}, base), { type: 'facet' });
            case 1181902701: return Object.assign(Object.assign({}, base), { type: 'fragment' });
            case 1399353968: return Object.assign(Object.assign({}, base), { type: 'sharpen' });
            case 1399353925: return Object.assign(Object.assign({}, base), { type: 'sharpen edges' });
            case 1399353933: return Object.assign(Object.assign({}, base), { type: 'sharpen more' });
            case 1181639749: return Object.assign(Object.assign({}, base), { type: 'find edges' });
            case 1399616122: return Object.assign(Object.assign({}, base), { type: 'solarize' });
            case 1314149187: return Object.assign(Object.assign({}, base), { type: 'ntsc colors' });
            case 1231976050: return Object.assign(Object.assign({}, base), { type: 'invert' });
            default:
                if (options.throwForMissingFeatures) {
                    // console.log('FILTER', require('util').inspect(f, false, 99, true));
                    throw new Error(`Unknown filterID: ${f.filterID}`);
                }
        }
    }
}
function parseFilterFX(desc, options) {
    return {
        enabled: desc.enab,
        validAtPosition: desc.validAtPosition,
        maskEnabled: desc.filterMaskEnable,
        maskLinked: desc.filterMaskLinked,
        maskExtendWithWhite: desc.filterMaskExtendWithWhite,
        list: desc.filterFXList.map(x => parseFilterFXItem(x, options)).filter((x) => !!x),
    };
}
function uvRadius(t) {
    return (0, descriptor_1.unitsValue)(t.radius, 'radius');
}
function serializeFilterFXItem(f) {
    const base = {
        _name: '',
        _classID: 'filterFX',
        'Nm  ': f.name,
        blendOptions: {
            _name: '',
            _classID: 'blendOptions',
            Opct: (0, descriptor_1.unitsPercentF)(f.opacity),
            'Md  ': descriptor_1.BlnM.encode(f.blendMode),
        },
        enab: f.enabled,
        hasoptions: f.hasOptions,
        FrgC: (0, descriptor_1.serializeColor)(f.foregroundColor),
        BckC: (0, descriptor_1.serializeColor)(f.backgroundColor),
    };
    switch (f.type) {
        case 'average': return Object.assign(Object.assign({}, base), { filterID: 1098281575 });
        case 'blur': return Object.assign(Object.assign({}, base), { filterID: 1114403360 });
        case 'blur more': return Object.assign(Object.assign({}, base), { filterID: 1114403405 });
        case 'box blur': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Box Blur',
                _classID: 'boxblur',
                'Rds ': uvRadius(f.filter),
            }, filterID: 697 });
        case 'gaussian blur': return Object.assign(Object.assign({}, base), { Fltr: {
                // _name: '高斯模糊', // Testing
                _name: 'Gaussian Blur',
                _classID: 'GsnB',
                'Rds ': uvRadius(f.filter),
            }, filterID: 1198747202 });
        case 'motion blur': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Motion Blur',
                _classID: 'MtnB',
                Angl: f.filter.angle,
                Dstn: (0, descriptor_1.unitsValue)(f.filter.distance, 'distance'),
            }, filterID: 1299476034 });
        case 'radial blur': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Radial Blur',
                _classID: 'RdlB',
                Amnt: f.filter.amount,
                BlrM: descriptor_1.BlrM.encode(f.filter.method),
                BlrQ: descriptor_1.BlrQ.encode(f.filter.quality),
            }, filterID: 1382313026 });
        case 'shape blur': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Shape Blur',
                _classID: 'shapeBlur',
                'Rds ': uvRadius(f.filter),
                customShape: {
                    _name: '',
                    _classID: 'customShape',
                    'Nm  ': f.filter.customShape.name,
                    Idnt: f.filter.customShape.id,
                }
            }, filterID: 702 });
        case 'smart blur': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Smart Blur',
                _classID: 'SmrB',
                'Rds ': f.filter.radius,
                Thsh: f.filter.threshold,
                SmBQ: descriptor_1.SmBQ.encode(f.filter.quality),
                SmBM: descriptor_1.SmBM.encode(f.filter.mode),
            }, filterID: 1399681602 });
        case 'surface blur': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Surface Blur',
                _classID: 'surfaceBlur',
                'Rds ': uvRadius(f.filter),
                Thsh: f.filter.threshold,
            }, filterID: 701 });
        case 'displace': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Displace',
                _classID: 'Dspl',
                HrzS: f.filter.horizontalScale,
                VrtS: f.filter.verticalScale,
                DspM: descriptor_1.DspM.encode(f.filter.displacementMap),
                UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
                DspF: {
                    sig: f.filter.displacementFile.signature,
                    path: f.filter.displacementFile.path,
                },
            }, filterID: 1148416108 });
        case 'pinch': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Pinch',
                _classID: 'Pnch',
                Amnt: f.filter.amount,
            }, filterID: 1349411688 });
        case 'polar coordinates': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Polar Coordinates',
                _classID: 'Plr ',
                Cnvr: descriptor_1.Cnvr.encode(f.filter.conversion),
            }, filterID: 1349284384 });
        case 'ripple': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Ripple',
                _classID: 'Rple',
                Amnt: f.filter.amount,
                RplS: descriptor_1.RplS.encode(f.filter.size),
            }, filterID: 1383099493 });
        case 'shear': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Shear',
                _classID: 'Shr ',
                ShrP: f.filter.shearPoints.map(p => ({ _name: '', _classID: 'Pnt ', Hrzn: p.x, Vrtc: p.y })),
                UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
                ShrS: f.filter.shearStart,
                ShrE: f.filter.shearEnd,
            }, filterID: 1399353888 });
        case 'spherize': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Spherize',
                _classID: 'Sphr',
                Amnt: f.filter.amount,
                SphM: descriptor_1.SphM.encode(f.filter.mode),
            }, filterID: 1399875698 });
        case 'twirl': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Twirl',
                _classID: 'Twrl',
                Angl: f.filter.angle,
            }, filterID: 1417114220 });
        case 'wave': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Wave',
                _classID: 'Wave',
                Wvtp: descriptor_1.Wvtp.encode(f.filter.type),
                NmbG: f.filter.numberOfGenerators,
                WLMn: f.filter.wavelength.min,
                WLMx: f.filter.wavelength.max,
                AmMn: f.filter.amplitude.min,
                AmMx: f.filter.amplitude.max,
                SclH: f.filter.scale.x,
                SclV: f.filter.scale.y,
                UndA: descriptor_1.UndA.encode(f.filter.undefinedAreas),
                RndS: f.filter.randomSeed,
            }, filterID: 1466005093 });
        case 'zigzag': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'ZigZag',
                _classID: 'ZgZg',
                Amnt: f.filter.amount,
                NmbR: f.filter.ridges,
                ZZTy: descriptor_1.ZZTy.encode(f.filter.style),
            }, filterID: 1516722791 });
        case 'add noise': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Add Noise',
                _classID: 'AdNs',
                Dstr: descriptor_1.Dstr.encode(f.filter.distribution),
                Nose: (0, descriptor_1.unitsPercentF)(f.filter.amount),
                Mnch: f.filter.monochromatic,
                FlRs: f.filter.randomSeed,
            }, filterID: 1097092723 });
        case 'despeckle': return Object.assign(Object.assign({}, base), { filterID: 1148416099 });
        case 'dust and scratches': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Dust & Scratches',
                _classID: 'DstS',
                'Rds ': f.filter.radius,
                Thsh: f.filter.threshold,
            }, filterID: 1148417107 });
        case 'median': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Median',
                _classID: 'Mdn ',
                'Rds ': uvRadius(f.filter),
            }, filterID: 1298427424 });
        case 'reduce noise': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Reduce Noise',
                _classID: 'denoise',
                ClNs: (0, descriptor_1.unitsPercentF)(f.filter.reduceColorNoise),
                Shrp: (0, descriptor_1.unitsPercentF)(f.filter.sharpenDetails),
                removeJPEGArtifact: f.filter.removeJpegArtifact,
                channelDenoise: f.filter.channelDenoise.map(c => (Object.assign({ _name: '', _classID: 'channelDenoiseParams', Chnl: c.channels.map(i => descriptor_1.Chnl.encode(i)), Amnt: c.amount }, (c.preserveDetails ? { EdgF: c.preserveDetails } : {})))),
                preset: f.filter.preset,
            }, filterID: 633 });
        case 'color halftone': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Color Halftone',
                _classID: 'ClrH',
                'Rds ': f.filter.radius,
                Ang1: f.filter.angle1,
                Ang2: f.filter.angle2,
                Ang3: f.filter.angle3,
                Ang4: f.filter.angle4,
            }, filterID: 1131180616 });
        case 'crystallize': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Crystallize',
                _classID: 'Crst',
                ClSz: f.filter.cellSize,
                FlRs: f.filter.randomSeed,
            }, filterID: 1131574132 });
        case 'facet': return Object.assign(Object.assign({}, base), { filterID: 1180922912 });
        case 'fragment': return Object.assign(Object.assign({}, base), { filterID: 1181902701 });
        case 'mezzotint': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Mezzotint',
                _classID: 'Mztn',
                MztT: descriptor_1.MztT.encode(f.filter.type),
                FlRs: f.filter.randomSeed,
            }, filterID: 1299870830 });
        case 'mosaic': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Mosaic',
                _classID: 'Msc ',
                ClSz: (0, descriptor_1.unitsValue)(f.filter.cellSize, 'cellSize'),
            }, filterID: 1299407648 });
        case 'pointillize': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Pointillize',
                _classID: 'Pntl',
                ClSz: f.filter.cellSize,
                FlRs: f.filter.randomSeed,
            }, filterID: 1349416044 });
        case 'clouds': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Clouds',
                _classID: 'Clds',
                FlRs: f.filter.randomSeed,
            }, filterID: 1131177075 });
        case 'difference clouds': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Difference Clouds',
                _classID: 'DfrC',
                FlRs: f.filter.randomSeed,
            }, filterID: 1147564611 });
        case 'fibers': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Fibers',
                _classID: 'Fbrs',
                Vrnc: f.filter.variance,
                Strg: f.filter.strength,
                RndS: f.filter.randomSeed,
            }, filterID: 1180856947 });
        case 'lens flare': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Lens Flare',
                _classID: 'LnsF',
                Brgh: f.filter.brightness,
                FlrC: {
                    _name: '',
                    _classID: 'Pnt ',
                    Hrzn: f.filter.position.x,
                    Vrtc: f.filter.position.y,
                },
                'Lns ': descriptor_1.Lns.encode(f.filter.lensType),
            }, filterID: 1282306886 });
        case 'sharpen': return Object.assign(Object.assign({}, base), { filterID: 1399353968 });
        case 'sharpen edges': return Object.assign(Object.assign({}, base), { filterID: 1399353925 });
        case 'sharpen more': return Object.assign(Object.assign({}, base), { filterID: 1399353933 });
        case 'smart sharpen': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Smart Sharpen',
                _classID: 'smartSharpen',
                Amnt: (0, descriptor_1.unitsPercentF)(f.filter.amount),
                'Rds ': uvRadius(f.filter),
                Thsh: f.filter.threshold,
                Angl: f.filter.angle,
                moreAccurate: f.filter.moreAccurate,
                blur: descriptor_1.blurType.encode(f.filter.blur),
                preset: f.filter.preset,
                sdwM: {
                    _name: 'Parameters',
                    _classID: 'adaptCorrectTones',
                    Amnt: (0, descriptor_1.unitsPercentF)(f.filter.shadow.fadeAmount),
                    Wdth: (0, descriptor_1.unitsPercentF)(f.filter.shadow.tonalWidth),
                    'Rds ': f.filter.shadow.radius,
                },
                hglM: {
                    _name: 'Parameters',
                    _classID: 'adaptCorrectTones',
                    Amnt: (0, descriptor_1.unitsPercentF)(f.filter.highlight.fadeAmount),
                    Wdth: (0, descriptor_1.unitsPercentF)(f.filter.highlight.tonalWidth),
                    'Rds ': f.filter.highlight.radius,
                },
            }, filterID: 698 });
        case 'unsharp mask': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Unsharp Mask',
                _classID: 'UnsM',
                Amnt: (0, descriptor_1.unitsPercentF)(f.filter.amount),
                'Rds ': uvRadius(f.filter),
                Thsh: f.filter.threshold,
            }, filterID: 1433301837 });
        case 'diffuse': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Diffuse',
                _classID: 'Dfs ',
                'Md  ': descriptor_1.DfsM.encode(f.filter.mode),
                FlRs: f.filter.randomSeed,
            }, filterID: 1147564832 });
        case 'emboss': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Emboss',
                _classID: 'Embs',
                Angl: f.filter.angle,
                Hght: f.filter.height,
                Amnt: f.filter.amount,
            }, filterID: 1164796531 });
        case 'extrude': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Extrude',
                _classID: 'Extr',
                ExtS: f.filter.size,
                ExtD: f.filter.depth,
                ExtF: f.filter.solidFrontFaces,
                ExtM: f.filter.maskIncompleteBlocks,
                ExtT: descriptor_1.ExtT.encode(f.filter.type),
                ExtR: descriptor_1.ExtR.encode(f.filter.depthMode),
                FlRs: f.filter.randomSeed,
            }, filterID: 1165522034 });
        case 'find edges': return Object.assign(Object.assign({}, base), { filterID: 1181639749 });
        case 'solarize': return Object.assign(Object.assign({}, base), { filterID: 1399616122 });
        case 'tiles': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Tiles',
                _classID: 'Tls ',
                TlNm: f.filter.numberOfTiles,
                TlOf: f.filter.maximumOffset,
                FlCl: descriptor_1.FlCl.encode(f.filter.fillEmptyAreaWith),
                FlRs: f.filter.randomSeed,
            }, filterID: 1416393504 });
        case 'trace contour': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Trace Contour',
                _classID: 'TrcC',
                'Lvl ': f.filter.level,
                'Edg ': descriptor_1.CntE.encode(f.filter.edge),
            }, filterID: 1416782659 });
        case 'wind': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Wind',
                _classID: 'Wnd ',
                WndM: descriptor_1.WndM.encode(f.filter.method),
                Drct: descriptor_1.Drct.encode(f.filter.direction),
            }, filterID: 1466852384 });
        case 'de-interlace': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'De-Interlace',
                _classID: 'Dntr',
                IntE: descriptor_1.IntE.encode(f.filter.eliminate),
                IntC: descriptor_1.IntC.encode(f.filter.newFieldsBy),
            }, filterID: 1148089458 });
        case 'ntsc colors': return Object.assign(Object.assign({}, base), { filterID: 1314149187 });
        case 'invert': return Object.assign(Object.assign({}, base), { filterID: 1231976050 });
        case 'custom': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Custom',
                _classID: 'Cstm',
                'Scl ': f.filter.scale,
                Ofst: f.filter.offset,
                Mtrx: f.filter.matrix,
            }, filterID: 1131639917 });
        case 'high pass': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'High Pass',
                _classID: 'HghP',
                'Rds ': uvRadius(f.filter),
            }, filterID: 1214736464 });
        case 'maximum': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Maximum',
                _classID: 'Mxm ',
                'Rds ': uvRadius(f.filter),
            }, filterID: 1299737888 });
        case 'minimum': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Minimum',
                _classID: 'Mnm ',
                'Rds ': uvRadius(f.filter),
            }, filterID: 1299082528 });
        case 'offset': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Offset',
                _classID: 'Ofst',
                Hrzn: f.filter.horizontal,
                Vrtc: f.filter.vertical,
                'Fl  ': descriptor_1.FlMd.encode(f.filter.undefinedAreas),
            }, filterID: 1332114292 });
        case 'puppet': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Rigid Transform',
                _classID: 'rigidTransform',
                'null': ['Ordn.Trgt'], // TODO: ???
                rigidType: f.filter.rigidType,
                puppetShapeList: f.filter.puppetShapeList.map(p => ({
                    _name: '',
                    _classID: 'puppetShape',
                    rigidType: p.rigidType,
                    VrsM: 1, // TODO: ???
                    VrsN: 0, // TODO: ???
                    originalVertexArray: toUint8(new Float32Array(pointsToArray(p.originalVertexArray))),
                    deformedVertexArray: toUint8(new Float32Array(pointsToArray(p.deformedVertexArray))),
                    indexArray: toUint8(new Uint32Array(p.indexArray)),
                    pinOffsets: pointsToArray(p.pinOffsets),
                    posFinalPins: pointsToArray(p.posFinalPins),
                    pinVertexIndices: p.pinVertexIndices,
                    PinP: pointsToArray(p.pinPosition),
                    PnRt: p.pinRotation,
                    PnOv: p.pinOverlay,
                    PnDp: p.pinDepth,
                    meshQuality: p.meshQuality,
                    meshExpansion: p.meshExpansion,
                    meshRigidity: p.meshRigidity,
                    imageResolution: p.imageResolution,
                    meshBoundaryPath: {
                        _name: '',
                        _classID: 'pathClass',
                        pathComponents: p.meshBoundaryPath.pathComponents.map(c => ({
                            _name: '',
                            _classID: 'PaCm',
                            shapeOperation: `shapeOperation.${c.shapeOperation}`,
                            SbpL: c.paths.map(path => ({
                                _name: '',
                                _classID: 'Sbpl',
                                Clsp: path.closed,
                                'Pts ': path.points.map(pt => ({
                                    _name: '',
                                    _classID: 'Pthp',
                                    Anch: pointToHrznVrtc(pt.anchor),
                                    'Fwd ': pointToHrznVrtc(pt.forward),
                                    'Bwd ': pointToHrznVrtc(pt.backward),
                                    Smoo: pt.smooth,
                                })),
                            })),
                        })),
                    },
                    selectedPin: p.selectedPin,
                })),
                PuX0: f.filter.bounds[0].x,
                PuX1: f.filter.bounds[1].x,
                PuX2: f.filter.bounds[2].x,
                PuX3: f.filter.bounds[3].x,
                PuY0: f.filter.bounds[0].y,
                PuY1: f.filter.bounds[1].y,
                PuY2: f.filter.bounds[2].y,
                PuY3: f.filter.bounds[3].y,
            }, filterID: 991 });
        case 'oil paint plugin': {
            const params = {};
            for (let i = 0; i < f.filter.parameters.length; i++) {
                const { name, value } = f.filter.parameters[i];
                const suffix = `${fromAtoZ[Math.floor(i / fromAtoZ.length)]}${fromAtoZ[i % fromAtoZ.length]}`;
                params[`PN${suffix}`] = name;
                params[`PT${suffix}`] = 0;
                params[`PF${suffix}`] = value;
            }
            return Object.assign(Object.assign({}, base), { Fltr: Object.assign({ _name: 'Oil Paint Plugin', _classID: 'PbPl', KnNm: f.filter.name, GpuY: f.filter.gpu, LIWy: f.filter.lighting, FPth: '1' }, params), filterID: 1348620396 });
        }
        case 'oil paint': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Oil Paint',
                _classID: 'oilPaint',
                lightingOn: f.filter.lightingOn,
                stylization: f.filter.stylization,
                cleanliness: f.filter.cleanliness,
                brushScale: f.filter.brushScale,
                microBrush: f.filter.microBrush,
                LghD: f.filter.lightDirection,
                specularity: f.filter.specularity,
            }, filterID: 1122 });
        case 'liquify': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Liquify',
                _classID: 'LqFy',
                LqMe: f.filter.liquifyMesh,
            }, filterID: 1282492025 });
        case 'perspective warp': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Perspective Warp',
                _classID: 'perspectiveWarpTransform',
                vertices: f.filter.vertices.map(pointToHrznVrtc),
                warpedVertices: f.filter.warpedVertices.map(pointToHrznVrtc),
                quads: f.filter.quads.map(indices => ({ indices })),
            }, filterID: 442 });
        case 'curves': return Object.assign(Object.assign({}, base), { Fltr: Object.assign({ _name: 'Curves', _classID: 'Crvs', presetKind: descriptor_1.presetKindType.encode(f.filter.presetKind) }, (f.filter.adjustments ? {
                Adjs: f.filter.adjustments.map(a => 'curve' in a ? {
                    _name: '',
                    _classID: 'CrvA',
                    Chnl: a.channels.map(descriptor_1.Chnl.encode),
                    'Crv ': a.curve.map(c => (Object.assign({ _name: '', _classID: 'Pnt ', Hrzn: c.x, Vrtc: c.y }, (c.curved ? { Cnty: true } : {})))),
                } : {
                    _name: '',
                    _classID: 'CrvA',
                    Chnl: a.channels.map(descriptor_1.Chnl.encode),
                    Mpng: a.values,
                })
            } : {})), filterID: 1131574899 });
        case 'brightness/contrast': return Object.assign(Object.assign({}, base), { Fltr: {
                _name: 'Brightness/Contrast',
                _classID: 'BrgC',
                Brgh: f.filter.brightness,
                Cntr: f.filter.contrast,
                useLegacy: !!f.filter.useLegacy,
            }, filterID: 1114793795 });
        // case 'hsb/hsl': return {
        // TODO: ...
        // };
        default: throw new Error(`Unknow filter type: ${f.type}`);
    }
}
// let t: any;
function getWarpFromPlacedLayer(placed) {
    if (placed.warp)
        return placed.warp;
    if (!placed.width || !placed.height)
        throw new Error('You must provide width and height of the linked image in placedLayer');
    const w = placed.width;
    const h = placed.height;
    const x0 = 0, x1 = w / 3, x2 = w * 2 / 3, x3 = w;
    const y0 = 0, y1 = h / 3, y2 = h * 2 / 3, y3 = h;
    return {
        style: 'custom',
        value: 0,
        perspective: 0,
        perspectiveOther: 0,
        rotate: 'horizontal',
        bounds: {
            top: { value: 0, units: 'Pixels' },
            left: { value: 0, units: 'Pixels' },
            bottom: { value: h, units: 'Pixels' },
            right: { value: w, units: 'Pixels' },
        },
        uOrder: 4,
        vOrder: 4,
        customEnvelopeWarp: {
            meshPoints: [
                { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x2, y: y0 }, { x: x3, y: y0 },
                { x: x0, y: y1 }, { x: x1, y: y1 }, { x: x2, y: y1 }, { x: x3, y: y1 },
                { x: x0, y: y2 }, { x: x1, y: y2 }, { x: x2, y: y2 }, { x: x3, y: y2 },
                { x: x0, y: y3 }, { x: x1, y: y3 }, { x: x2, y: y3 }, { x: x3, y: y3 },
            ],
        },
    };
}
addHandler('SoLd', hasKey('placedLayer'), (reader, target, left) => {
    if ((0, psdReader_1.readSignature)(reader) !== 'soLD')
        throw new Error(`Invalid SoLd type`);
    const version = (0, psdReader_1.readInt32)(reader);
    if (version !== 4 && version !== 5)
        throw new Error(`Invalid SoLd version`);
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
    // console.log('SoLd', require('util').inspect(desc, false, 99, true));
    // console.log('SoLd.warp', require('util').inspect(desc.warp, false, 99, true));
    // console.log('SoLd.quiltWarp', require('util').inspect(desc.quiltWarp, false, 99, true));
    // desc.filterFX!.filterFXList[0].Fltr.puppetShapeList[0].meshBoundaryPath.pathComponents[0].SbpL[0]['Pts '] = [];
    // console.log('read', require('util').inspect(desc.filterFX, false, 99, true));
    // console.log('filterFXList[0]', require('util').inspect((desc as any).filterFX.filterFXList[0], false, 99, true));
    // t = desc;
    target.placedLayer = {
        id: desc.Idnt,
        placed: desc.placed,
        type: placedLayerTypes[desc.Type],
        pageNumber: desc.PgNm,
        totalPages: desc.totalPages,
        frameStep: (0, descriptor_1.frac)(desc.frameStep),
        duration: (0, descriptor_1.frac)(desc.duration),
        frameCount: desc.frameCount,
        transform: desc.Trnf,
        width: desc['Sz  '].Wdth,
        height: desc['Sz  '].Hght,
        resolution: (0, descriptor_1.parseUnits)(desc.Rslt),
        warp: parseWarp((desc.quiltWarp || desc.warp)),
    };
    if (desc.nonAffineTransform && desc.nonAffineTransform.some((x, i) => x !== desc.Trnf[i])) {
        target.placedLayer.nonAffineTransform = desc.nonAffineTransform;
    }
    if (desc.Crop)
        target.placedLayer.crop = desc.Crop;
    if (desc.comp)
        target.placedLayer.comp = desc.comp;
    if (desc.compInfo) {
        target.placedLayer.compInfo = {
            compID: desc.compInfo.compID,
            originalCompID: desc.compInfo.originalCompID,
        };
    }
    if (desc.filterFX)
        target.placedLayer.filter = parseFilterFX(desc.filterFX, reader);
    // console.log('filter', require('util').inspect(target.placedLayer.filter, false, 99, true));
    (0, psdReader_1.skipBytes)(reader, left()); // HACK
}, (writer, target) => {
    var _a, _b;
    (0, psdWriter_1.writeSignature)(writer, 'soLD');
    (0, psdWriter_1.writeInt32)(writer, 4); // version
    const placed = target.placedLayer;
    if (!placed.id || typeof placed.id !== 'string' || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(placed.id)) {
        throw new Error('Placed layer ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)');
    }
    const desc = Object.assign(Object.assign({ Idnt: placed.id, placed: (_a = placed.placed) !== null && _a !== void 0 ? _a : placed.id, PgNm: placed.pageNumber || 1, totalPages: placed.totalPages || 1 }, (placed.crop ? { Crop: placed.crop } : {})), { frameStep: placed.frameStep || { numerator: 0, denominator: 600 }, duration: placed.duration || { numerator: 0, denominator: 600 }, frameCount: placed.frameCount || 0, Annt: 16, Type: placedLayerTypes.indexOf(placed.type), Trnf: placed.transform, nonAffineTransform: (_b = placed.nonAffineTransform) !== null && _b !== void 0 ? _b : placed.transform, 
        // quiltWarp: {} as any,
        warp: encodeWarp(getWarpFromPlacedLayer(placed)), 'Sz  ': {
            _name: '',
            _classID: 'Pnt ',
            Wdth: placed.width || 0, // TODO: find size ?
            Hght: placed.height || 0, // TODO: find size ?
        }, Rslt: placed.resolution ? (0, descriptor_1.unitsValue)(placed.resolution, 'resolution') : { units: 'Density', value: 72 } });
    if (placed.filter) {
        desc.filterFX = {
            _name: '',
            _classID: 'filterFXStyle',
            enab: placed.filter.enabled,
            validAtPosition: placed.filter.validAtPosition,
            filterMaskEnable: placed.filter.maskEnabled,
            filterMaskLinked: placed.filter.maskLinked,
            filterMaskExtendWithWhite: placed.filter.maskExtendWithWhite,
            filterFXList: placed.filter.list.map(f => serializeFilterFXItem(f)),
        };
    }
    // TODO:
    // desc.comp = -1;
    // desc.compInfo = { _name: '', _classID: 'null', compID: -1, originalCompID: -1 } as any;
    // desc.ClMg = {
    // 	_name: '',
    // 	_classID: 'ClMg',
    // 	placedLayerOCIOConversion: 'placedLayerOCIOConversion.placedLayerOCIOConvertEmbedded'
    // } as any;
    // if (JSON.stringify(t) !== JSON.stringify(desc)) {
    // 	console.log('read', require('util').inspect(t, false, 99, true));
    // 	console.log('write', require('util').inspect(desc, false, 99, true));
    // 	console.error('DIFFERENT');
    // 	// throw new Error('DIFFERENT');
    // }
    if (placed.warp && isQuiltWarp(placed.warp)) {
        const quiltWarp = encodeWarp(placed.warp);
        desc.quiltWarp = quiltWarp;
        desc.warp = {
            warpStyle: 'warpStyle.warpNone',
            warpValue: quiltWarp.warpValue,
            warpPerspective: quiltWarp.warpPerspective,
            warpPerspectiveOther: quiltWarp.warpPerspectiveOther,
            warpRotate: quiltWarp.warpRotate,
            bounds: quiltWarp.bounds,
            uOrder: quiltWarp.uOrder,
            vOrder: quiltWarp.vOrder,
        };
    }
    else {
        delete desc.quiltWarp;
    }
    if (placed.comp)
        desc.comp = placed.comp;
    if (placed.compInfo)
        desc.compInfo = placed.compInfo;
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc, desc.quiltWarp ? 'quiltWarp' : 'warp');
});
addHandlerAlias('SoLE', 'SoLd');
addHandler('fxrp', hasKey('referencePoint'), (reader, target) => {
    target.referencePoint = {
        x: (0, psdReader_1.readFloat64)(reader),
        y: (0, psdReader_1.readFloat64)(reader),
    };
}, (writer, target) => {
    (0, psdWriter_1.writeFloat64)(writer, target.referencePoint.x);
    (0, psdWriter_1.writeFloat64)(writer, target.referencePoint.y);
});
addHandler('Lr16', () => false, (reader, _target, _left, psd, imageResources) => {
    (0, psdReader_1.readLayerInfo)(reader, psd, imageResources);
}, (_writer, _target) => {
});
addHandler('Lr32', () => false, (reader, _target, _left, psd, imageResources) => {
    (0, psdReader_1.readLayerInfo)(reader, psd, imageResources);
}, (_writer, _target) => {
});
addHandler('LMsk', hasKey('userMask'), (reader, target) => {
    target.userMask = {
        colorSpace: (0, psdReader_1.readColor)(reader),
        opacity: (0, psdReader_1.readUint16)(reader) / 0xff,
    };
    const flag = (0, psdReader_1.readUint8)(reader);
    if (flag !== 128)
        throw new Error('Invalid flag value');
    (0, psdReader_1.skipBytes)(reader, 1);
}, (writer, target) => {
    const userMask = target.userMask;
    (0, psdWriter_1.writeColor)(writer, userMask.colorSpace);
    (0, psdWriter_1.writeUint16)(writer, (0, helpers_1.clamp)(userMask.opacity, 0, 1) * 0xff);
    (0, psdWriter_1.writeUint8)(writer, 128);
    (0, psdWriter_1.writeZeros)(writer, 1);
});
if (helpers_1.MOCK_HANDLERS) {
    addHandler('Patt', target => target._Patt !== undefined, (reader, target, left) => {
        // console.log('additional info: Patt');
        target._Patt = (0, psdReader_1.readBytes)(reader, left());
    }, (writer, target) => false && (0, psdWriter_1.writeBytes)(writer, target._Patt));
}
else {
    addHandler('Patt', // TODO: handle also Pat2 & Pat3
    // TODO: handle also Pat2 & Pat3
    target => !!(target.patterns && target.patterns.length > 0), (reader, target, left) => {
        while (left() > 0) {
            const pattern = (0, psdReader_1.readPattern)(reader);
            if (target.patterns === undefined)
                target.patterns = [];
            target.patterns.push(pattern);
        }
    }, (writer, target, _, _options) => {
        const patterns = target.patterns || [];
        for (const pattern of patterns) {
            (0, psdWriter_1.writePattern)(writer, pattern);
        }
    });
}
addHandlerAlias('Pat2', 'Patt');
addHandlerAlias('Pat3', 'Patt');
/*
interface CAIDesc {
    _name: '';
    _classID: 'null';
    enab: boolean;
    generationalGuid: string;
}

addHandler(
    'CAI ', // content credentials ? something to do with generative tech
    () => false,
    (reader, _target, left) => {
        const version = readUint32(reader); // 3
        const desc = readVersionAndDescriptor(reader, true) as CAIDesc;
        console.log('CAI version', version);
        console.log('CAI', require('util').inspect(desc, false, 99, true));
        console.log('CAI left', readBytes(reader, left())); // 8 bytes left, all zeroes
    },
    (_writer, _target) => {
    },
);
// */
if (helpers_1.MOCK_HANDLERS) {
    addHandler('CAI ', target => target._CAI_ !== undefined, (reader, target, left) => {
        target._CAI_ = (0, psdReader_1.readBytes)(reader, left());
    }, (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._CAI_);
    });
}
// interface OCIODescriptor {
// 	_name: '';
// 	_classID: 'documentColorManagementInfo';
// 	'Knd ': 'icc';
// 	ocio_display_view: {
// 		_name: '';
// 		_classID: 'viewColorManagementInfo';
// 		display: string;
// 		view: string;
// 	};
// }
if (helpers_1.MOCK_HANDLERS) {
    addHandler('OCIO', // document color management info
    // document color management info
    target => target._OCIO !== undefined, (reader, target, left) => {
        // const desc = readVersionAndDescriptor(reader, true) as OCIODescriptor;
        // console.log('OCIO', require('util').inspect(desc, false, 99, true));
        target._OCIO = (0, psdReader_1.readBytes)(reader, left());
    }, (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._OCIO);
    });
}
// interface GenIDescriptor {
//  _name: '';
//  _classID: 'genTechInfo';
// 	isUsingGenTech: number;
//  externalModelList?: [];
// }
if (helpers_1.MOCK_HANDLERS) {
    addHandler('GenI', // generative tech
    // generative tech
    target => target._GenI !== undefined, (reader, target, left) => {
        // const desc = readVersionAndDescriptor(reader, true); // as GenIDescriptor;
        // console.log('GenI', require('util').inspect(desc, false, 99, true));
        target._GenI = (0, psdReader_1.readBytes)(reader, left());
    }, (writer, target) => {
        (0, psdWriter_1.writeBytes)(writer, target._GenI);
    });
}
function readRect(reader) {
    const top = (0, psdReader_1.readInt32)(reader);
    const left = (0, psdReader_1.readInt32)(reader);
    const bottom = (0, psdReader_1.readInt32)(reader);
    const right = (0, psdReader_1.readInt32)(reader);
    return { top, left, bottom, right };
}
function writeRect(writer, rect) {
    (0, psdWriter_1.writeInt32)(writer, rect.top);
    (0, psdWriter_1.writeInt32)(writer, rect.left);
    (0, psdWriter_1.writeInt32)(writer, rect.bottom);
    (0, psdWriter_1.writeInt32)(writer, rect.right);
}
addHandler('Anno', target => target.annotations !== undefined, (reader, target, left) => {
    const major = (0, psdReader_1.readUint16)(reader);
    const minor = (0, psdReader_1.readUint16)(reader);
    if (major !== 2 || minor !== 1)
        throw new Error('Invalid Anno version');
    const count = (0, psdReader_1.readUint32)(reader);
    const annotations = [];
    for (let i = 0; i < count; i++) {
        /*const length =*/ (0, psdReader_1.readUint32)(reader);
        const type = (0, psdReader_1.readSignature)(reader);
        const open = !!(0, psdReader_1.readUint8)(reader);
        /*const flags =*/ (0, psdReader_1.readUint8)(reader); // always 28
        /*const optionalBlocks =*/ (0, psdReader_1.readUint16)(reader);
        const iconLocation = readRect(reader);
        const popupLocation = readRect(reader);
        const color = (0, psdReader_1.readColor)(reader);
        const author = (0, psdReader_1.readPascalString)(reader, 2);
        const name = (0, psdReader_1.readPascalString)(reader, 2);
        const date = (0, psdReader_1.readPascalString)(reader, 2);
        /*const contentLength =*/ (0, psdReader_1.readUint32)(reader);
        /*const dataType =*/ (0, psdReader_1.readSignature)(reader);
        const dataLength = (0, psdReader_1.readUint32)(reader);
        let data;
        if (type === 'txtA') {
            if (dataLength >= 2 && (0, psdReader_1.readUint16)(reader) === 0xfeff) {
                data = (0, psdReader_1.readUnicodeStringWithLength)(reader, (dataLength - 2) / 2);
            }
            else {
                reader.offset -= 2;
                data = (0, psdReader_1.readAsciiString)(reader, dataLength);
            }
            data = data.replace(/\r/g, '\n');
        }
        else if (type === 'sndA') {
            data = (0, psdReader_1.readBytes)(reader, dataLength);
        }
        else {
            throw new Error('Unknown annotation type');
        }
        annotations.push({
            type: type === 'txtA' ? 'text' : 'sound', open, iconLocation, popupLocation, color, author, name, date, data,
        });
    }
    target.annotations = annotations;
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const annotations = target.annotations;
    (0, psdWriter_1.writeUint16)(writer, 2);
    (0, psdWriter_1.writeUint16)(writer, 1);
    (0, psdWriter_1.writeUint32)(writer, annotations.length);
    for (const annotation of annotations) {
        const sound = annotation.type === 'sound';
        if (sound && !(annotation.data instanceof Uint8Array))
            throw new Error('Sound annotation data should be Uint8Array');
        if (!sound && typeof annotation.data !== 'string')
            throw new Error('Text annotation data should be string');
        const lengthOffset = writer.offset;
        (0, psdWriter_1.writeUint32)(writer, 0); // length
        (0, psdWriter_1.writeSignature)(writer, sound ? 'sndA' : 'txtA');
        (0, psdWriter_1.writeUint8)(writer, annotation.open ? 1 : 0);
        (0, psdWriter_1.writeUint8)(writer, 28);
        (0, psdWriter_1.writeUint16)(writer, 1);
        writeRect(writer, annotation.iconLocation);
        writeRect(writer, annotation.popupLocation);
        (0, psdWriter_1.writeColor)(writer, annotation.color);
        (0, psdWriter_1.writePascalString)(writer, annotation.author || '', 2);
        (0, psdWriter_1.writePascalString)(writer, annotation.name || '', 2);
        (0, psdWriter_1.writePascalString)(writer, annotation.date || '', 2);
        const contentOffset = writer.offset;
        (0, psdWriter_1.writeUint32)(writer, 0); // content length
        (0, psdWriter_1.writeSignature)(writer, sound ? 'sndM' : 'txtC');
        (0, psdWriter_1.writeUint32)(writer, 0); // data length
        const dataOffset = writer.offset;
        if (sound) {
            (0, psdWriter_1.writeBytes)(writer, annotation.data);
        }
        else {
            (0, psdWriter_1.writeUint16)(writer, 0xfeff); // unicode string indicator
            const text = annotation.data.replace(/\n/g, '\r');
            for (let i = 0; i < text.length; i++)
                (0, psdWriter_1.writeUint16)(writer, text.charCodeAt(i));
        }
        writer.view.setUint32(lengthOffset, writer.offset - lengthOffset, false);
        writer.view.setUint32(contentOffset, writer.offset - contentOffset, false);
        writer.view.setUint32(dataOffset - 4, writer.offset - dataOffset, false);
    }
});
function createLnkHandler(tag) {
    addHandler(tag, (target) => {
        const psd = target;
        if (!psd.linkedFiles || !psd.linkedFiles.length)
            return false;
        if (tag === 'lnkE' && !psd.linkedFiles.some(f => f.linkedFile))
            return false;
        return true;
    }, (reader, target, left, _psd) => {
        const psd = target;
        psd.linkedFiles = psd.linkedFiles || [];
        while (left() > 8) {
            let size = readLength64(reader);
            const startOffset = reader.offset;
            const type = (0, psdReader_1.readSignature)(reader);
            // liFD - linked file data
            // liFE - linked file external
            // liFA - linked file alias
            const version = (0, psdReader_1.readInt32)(reader);
            const id = (0, psdReader_1.readPascalString)(reader, 1);
            const name = (0, psdReader_1.readUnicodeString)(reader);
            const fileType = (0, psdReader_1.readSignature)(reader).trim(); // '    ' if empty
            const fileCreator = (0, psdReader_1.readSignature)(reader).trim(); // '    ' or '\0\0\0\0' if empty
            const dataSize = readLength64(reader);
            const hasFileOpenDescriptor = (0, psdReader_1.readUint8)(reader);
            const fileOpenDescriptor = hasFileOpenDescriptor ? (0, descriptor_1.readVersionAndDescriptor)(reader) : undefined;
            const linkedFileDescriptor = type === 'liFE' ? (0, descriptor_1.readVersionAndDescriptor)(reader) : undefined;
            const file = { id, name };
            if (fileType)
                file.type = fileType;
            if (fileCreator)
                file.creator = fileCreator;
            if (fileOpenDescriptor) {
                file.descriptor = {
                    compInfo: {
                        compID: fileOpenDescriptor.compInfo.compID,
                        originalCompID: fileOpenDescriptor.compInfo.originalCompID,
                    }
                };
            }
            if (type === 'liFE' && version > 3) {
                const year = (0, psdReader_1.readInt32)(reader);
                const month = (0, psdReader_1.readUint8)(reader);
                const day = (0, psdReader_1.readUint8)(reader);
                const hour = (0, psdReader_1.readUint8)(reader);
                const minute = (0, psdReader_1.readUint8)(reader);
                const seconds = (0, psdReader_1.readFloat64)(reader);
                const wholeSeconds = Math.floor(seconds);
                const ms = (seconds - wholeSeconds) * 1000;
                file.time = (new Date(Date.UTC(year, month, day, hour, minute, wholeSeconds, ms))).toISOString();
            }
            const fileSize = type === 'liFE' ? readLength64(reader) : 0;
            if (type === 'liFA')
                (0, psdReader_1.skipBytes)(reader, 8);
            if (type === 'liFD')
                file.data = (0, psdReader_1.readBytes)(reader, dataSize); // seems to be a typo in docs
            if (version >= 5)
                file.childDocumentID = (0, psdReader_1.readUnicodeString)(reader);
            if (version >= 6)
                file.assetModTime = (0, psdReader_1.readFloat64)(reader);
            if (version >= 7)
                file.assetLockedState = (0, psdReader_1.readUint8)(reader);
            if (type === 'liFE' && version === 2)
                file.data = (0, psdReader_1.readBytes)(reader, fileSize);
            if (reader.skipLinkedFilesData)
                file.data = undefined;
            if (tag === 'lnkE') {
                file.linkedFile = {
                    fileSize,
                    name: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor['Nm  ']) || '',
                    fullPath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.fullPath) || '',
                    originalPath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.originalPath) || '',
                    relativePath: (linkedFileDescriptor === null || linkedFileDescriptor === void 0 ? void 0 : linkedFileDescriptor.relPath) || '',
                };
            }
            psd.linkedFiles.push(file);
            while (size % 4)
                size++;
            reader.offset = startOffset + size;
        }
        (0, psdReader_1.skipBytes)(reader, left()); // ?
    }, (writer, target) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const psd = target;
        for (const file of psd.linkedFiles) {
            if ((tag === 'lnkE') !== !!file.linkedFile)
                continue;
            let version = 2;
            if (file.assetLockedState != null)
                version = 7;
            else if (file.assetModTime != null)
                version = 6;
            else if (file.childDocumentID != null)
                version = 5;
            else if (tag === 'lnkE')
                version = 3;
            writeLength64(writer, 0);
            const sizeOffset = writer.offset;
            (0, psdWriter_1.writeSignature)(writer, (tag === 'lnkE') ? 'liFE' : (file.data ? 'liFD' : 'liFA'));
            (0, psdWriter_1.writeInt32)(writer, version);
            if (!file.id || typeof file.id !== 'string' || !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(file.id)) {
                throw new Error('Linked file ID must be in a GUID format (example: 20953ddb-9391-11ec-b4f1-c15674f50bc4)');
            }
            (0, psdWriter_1.writePascalString)(writer, file.id, 1);
            (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, file.name || '');
            (0, psdWriter_1.writeSignature)(writer, file.type ? `${file.type}    `.substring(0, 4) : '    ');
            (0, psdWriter_1.writeSignature)(writer, file.creator ? `${file.creator}    `.substring(0, 4) : '\0\0\0\0');
            writeLength64(writer, file.data ? file.data.byteLength : 0);
            if (file.descriptor && file.descriptor.compInfo) {
                const desc = {
                    compInfo: {
                        compID: file.descriptor.compInfo.compID,
                        originalCompID: file.descriptor.compInfo.originalCompID,
                    },
                };
                (0, psdWriter_1.writeUint8)(writer, 1);
                (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
            }
            else {
                (0, psdWriter_1.writeUint8)(writer, 0);
            }
            if (tag === 'lnkE') {
                const desc = {
                    descVersion: 2,
                    'Nm  ': (_b = (_a = file.linkedFile) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '',
                    fullPath: (_d = (_c = file.linkedFile) === null || _c === void 0 ? void 0 : _c.fullPath) !== null && _d !== void 0 ? _d : '',
                    originalPath: (_f = (_e = file.linkedFile) === null || _e === void 0 ? void 0 : _e.originalPath) !== null && _f !== void 0 ? _f : '',
                    relPath: (_h = (_g = file.linkedFile) === null || _g === void 0 ? void 0 : _g.relativePath) !== null && _h !== void 0 ? _h : '',
                };
                (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'ExternalFileLink', desc);
                const time = file.time ? new Date(file.time) : new Date();
                (0, psdWriter_1.writeInt32)(writer, time.getUTCFullYear());
                (0, psdWriter_1.writeUint8)(writer, time.getUTCMonth());
                (0, psdWriter_1.writeUint8)(writer, time.getUTCDate());
                (0, psdWriter_1.writeUint8)(writer, time.getUTCHours());
                (0, psdWriter_1.writeUint8)(writer, time.getUTCMinutes());
                (0, psdWriter_1.writeFloat64)(writer, time.getUTCSeconds() + time.getUTCMilliseconds() / 1000);
            }
            if (file.data) {
                (0, psdWriter_1.writeBytes)(writer, file.data);
            }
            else {
                writeLength64(writer, ((_j = file.linkedFile) === null || _j === void 0 ? void 0 : _j.fileSize) || 0);
            }
            if (version >= 5)
                (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, file.childDocumentID || '');
            if (version >= 6)
                (0, psdWriter_1.writeFloat64)(writer, file.assetModTime || 0);
            if (version >= 7)
                (0, psdWriter_1.writeUint8)(writer, file.assetLockedState || 0);
            let size = writer.offset - sizeOffset;
            writer.view.setUint32(sizeOffset - 4, size, false); // write size
            while (size % 4) {
                size++;
                (0, psdWriter_1.writeUint8)(writer, 0);
            }
        }
    });
}
createLnkHandler('lnk2');
createLnkHandler('lnkE');
addHandlerAlias('lnkD', 'lnk2');
addHandlerAlias('lnk3', 'lnk2');
addHandler('pths', hasKey('pathList'), (reader, target) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader, true);
    // console.log(require('util').inspect(desc, false, 99, true));
    // if (options.throwForMissingFeatures && desc?.pathList?.length) throw new Error('non-empty pathList in `pths`');
    desc;
    target.pathList = []; // TODO: read paths
}, (writer, _target) => {
    const desc = {
        pathList: [], // TODO: write paths
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'pathsDataClass', desc);
});
addHandler('lyvr', hasKey('version'), (reader, target) => target.version = (0, psdReader_1.readUint32)(reader), (writer, target) => (0, psdWriter_1.writeUint32)(writer, target.version));
addHandler('lfxs', () => false, // TODO: not sure when we actually need to write this section
// NOTE: this might be insufficient
// target => target.effects !== undefined && (
// 	!!target.effects.dropShadow?.some(e => e.choke) ||
// 	!!target.effects.innerShadow?.some(e => e.choke) ||
// 	!!target.effects.outerGlow?.choke ||
// 	!!target.effects.innerGlow?.choke
// ),
(reader, target, left) => {
    const version = (0, psdReader_1.readUint32)(reader);
    if (version !== 0)
        throw new Error(`Invalid lfxs version`);
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.effects = (0, descriptor_1.parseEffects)(desc, !!reader.logMissingFeatures);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target, _, options) => {
    const desc = (0, descriptor_1.serializeEffects)(target.effects, !!options.logMissingFeatures, true);
    (0, psdWriter_1.writeUint32)(writer, 0); // version
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
function adjustmentType(type) {
    return (target) => !!target.adjustment && target.adjustment.type === type;
}
addHandler('brit', adjustmentType('brightness/contrast'), (reader, target, left) => {
    if (!target.adjustment) { // ignore if got one from CgEd block
        target.adjustment = {
            type: 'brightness/contrast',
            brightness: (0, psdReader_1.readInt16)(reader),
            contrast: (0, psdReader_1.readInt16)(reader),
            meanValue: (0, psdReader_1.readInt16)(reader),
            labColorOnly: !!(0, psdReader_1.readUint8)(reader),
            useLegacy: true,
        };
    }
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    var _a;
    const info = target.adjustment;
    (0, psdWriter_1.writeInt16)(writer, info.brightness || 0);
    (0, psdWriter_1.writeInt16)(writer, info.contrast || 0);
    (0, psdWriter_1.writeInt16)(writer, (_a = info.meanValue) !== null && _a !== void 0 ? _a : 127);
    (0, psdWriter_1.writeUint8)(writer, info.labColorOnly ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 1);
});
function readLevelsChannel(reader) {
    const shadowInput = (0, psdReader_1.readInt16)(reader);
    const highlightInput = (0, psdReader_1.readInt16)(reader);
    const shadowOutput = (0, psdReader_1.readInt16)(reader);
    const highlightOutput = (0, psdReader_1.readInt16)(reader);
    const midtoneInput = (0, psdReader_1.readInt16)(reader) / 100;
    return { shadowInput, highlightInput, shadowOutput, highlightOutput, midtoneInput };
}
function writeLevelsChannel(writer, channel) {
    (0, psdWriter_1.writeInt16)(writer, channel.shadowInput);
    (0, psdWriter_1.writeInt16)(writer, channel.highlightInput);
    (0, psdWriter_1.writeInt16)(writer, channel.shadowOutput);
    (0, psdWriter_1.writeInt16)(writer, channel.highlightOutput);
    (0, psdWriter_1.writeInt16)(writer, Math.round(channel.midtoneInput * 100));
}
addHandler('levl', adjustmentType('levels'), (reader, target, left) => {
    if ((0, psdReader_1.readUint16)(reader) !== 2)
        throw new Error('Invalid levl version');
    target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: 'levels', rgb: readLevelsChannel(reader), red: readLevelsChannel(reader), green: readLevelsChannel(reader), blue: readLevelsChannel(reader) });
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    const defaultChannel = {
        shadowInput: 0,
        highlightInput: 255,
        shadowOutput: 0,
        highlightOutput: 255,
        midtoneInput: 1,
    };
    (0, psdWriter_1.writeUint16)(writer, 2); // version
    writeLevelsChannel(writer, info.rgb || defaultChannel);
    writeLevelsChannel(writer, info.red || defaultChannel);
    writeLevelsChannel(writer, info.green || defaultChannel);
    writeLevelsChannel(writer, info.blue || defaultChannel);
    for (let i = 0; i < 59; i++)
        writeLevelsChannel(writer, defaultChannel);
});
function readCurveChannel(reader) {
    const nodes = (0, psdReader_1.readUint16)(reader);
    const channel = [];
    for (let j = 0; j < nodes; j++) {
        const output = (0, psdReader_1.readInt16)(reader);
        const input = (0, psdReader_1.readInt16)(reader);
        channel.push({ input, output });
    }
    return channel;
}
function writeCurveChannel(writer, channel) {
    (0, psdWriter_1.writeUint16)(writer, channel.length);
    for (const n of channel) {
        (0, psdWriter_1.writeUint16)(writer, n.output);
        (0, psdWriter_1.writeUint16)(writer, n.input);
    }
}
addHandler('curv', adjustmentType('curves'), (reader, target, left) => {
    (0, psdReader_1.readUint8)(reader);
    if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error('Invalid curv version');
    (0, psdReader_1.readUint16)(reader);
    const channels = (0, psdReader_1.readUint16)(reader);
    const info = { type: 'curves' };
    if (channels & 1)
        info.rgb = readCurveChannel(reader);
    if (channels & 2)
        info.red = readCurveChannel(reader);
    if (channels & 4)
        info.green = readCurveChannel(reader);
    if (channels & 8)
        info.blue = readCurveChannel(reader);
    target.adjustment = Object.assign(Object.assign({}, target.adjustment), info);
    // ignoring, duplicate information
    // checkSignature(reader, 'Crv ');
    // const cVersion = readUint16(reader);
    // readUint16(reader);
    // const channelCount = readUint16(reader);
    // for (let i = 0; i < channelCount; i++) {
    // 	const index = readUint16(reader);
    // 	const nodes = readUint16(reader);
    // 	for (let j = 0; j < nodes; j++) {
    // 		const output = readInt16(reader);
    // 		const input = readInt16(reader);
    // 	}
    // }
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    const { rgb, red, green, blue } = info;
    let channels = 0;
    let channelCount = 0;
    if (rgb && rgb.length) {
        channels |= 1;
        channelCount++;
    }
    if (red && red.length) {
        channels |= 2;
        channelCount++;
    }
    if (green && green.length) {
        channels |= 4;
        channelCount++;
    }
    if (blue && blue.length) {
        channels |= 8;
        channelCount++;
    }
    (0, psdWriter_1.writeUint8)(writer, 0);
    (0, psdWriter_1.writeUint16)(writer, 1); // version
    (0, psdWriter_1.writeUint16)(writer, 0);
    (0, psdWriter_1.writeUint16)(writer, channels);
    if (rgb && rgb.length)
        writeCurveChannel(writer, rgb);
    if (red && red.length)
        writeCurveChannel(writer, red);
    if (green && green.length)
        writeCurveChannel(writer, green);
    if (blue && blue.length)
        writeCurveChannel(writer, blue);
    (0, psdWriter_1.writeSignature)(writer, 'Crv ');
    (0, psdWriter_1.writeUint16)(writer, 4); // version
    (0, psdWriter_1.writeUint16)(writer, 0);
    (0, psdWriter_1.writeUint16)(writer, channelCount);
    if (rgb && rgb.length) {
        (0, psdWriter_1.writeUint16)(writer, 0);
        writeCurveChannel(writer, rgb);
    }
    if (red && red.length) {
        (0, psdWriter_1.writeUint16)(writer, 1);
        writeCurveChannel(writer, red);
    }
    if (green && green.length) {
        (0, psdWriter_1.writeUint16)(writer, 2);
        writeCurveChannel(writer, green);
    }
    if (blue && blue.length) {
        (0, psdWriter_1.writeUint16)(writer, 3);
        writeCurveChannel(writer, blue);
    }
});
addHandler('expA', adjustmentType('exposure'), (reader, target, left) => {
    if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error('Invalid expA version');
    target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: 'exposure', exposure: (0, psdReader_1.readFloat32)(reader), offset: (0, psdReader_1.readFloat32)(reader), gamma: (0, psdReader_1.readFloat32)(reader) });
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    (0, psdWriter_1.writeUint16)(writer, 1); // version
    (0, psdWriter_1.writeFloat32)(writer, info.exposure);
    (0, psdWriter_1.writeFloat32)(writer, info.offset);
    (0, psdWriter_1.writeFloat32)(writer, info.gamma);
    (0, psdWriter_1.writeZeros)(writer, 2);
});
addHandler('vibA', adjustmentType('vibrance'), (reader, target, left) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.adjustment = { type: 'vibrance' };
    if (desc.vibrance !== undefined)
        target.adjustment.vibrance = desc.vibrance;
    if (desc.Strt !== undefined)
        target.adjustment.saturation = desc.Strt;
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    const desc = {};
    if (info.vibrance !== undefined)
        desc.vibrance = info.vibrance;
    if (info.saturation !== undefined)
        desc.Strt = info.saturation;
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
function readHueChannel(reader) {
    return {
        a: (0, psdReader_1.readInt16)(reader),
        b: (0, psdReader_1.readInt16)(reader),
        c: (0, psdReader_1.readInt16)(reader),
        d: (0, psdReader_1.readInt16)(reader),
        hue: (0, psdReader_1.readInt16)(reader),
        saturation: (0, psdReader_1.readInt16)(reader),
        lightness: (0, psdReader_1.readInt16)(reader),
    };
}
function writeHueChannel(writer, channel) {
    const c = channel || {};
    (0, psdWriter_1.writeInt16)(writer, c.a || 0);
    (0, psdWriter_1.writeInt16)(writer, c.b || 0);
    (0, psdWriter_1.writeInt16)(writer, c.c || 0);
    (0, psdWriter_1.writeInt16)(writer, c.d || 0);
    (0, psdWriter_1.writeInt16)(writer, c.hue || 0);
    (0, psdWriter_1.writeInt16)(writer, c.saturation || 0);
    (0, psdWriter_1.writeInt16)(writer, c.lightness || 0);
}
addHandler('hue2', adjustmentType('hue/saturation'), (reader, target, left) => {
    if ((0, psdReader_1.readUint16)(reader) !== 2)
        throw new Error('Invalid hue2 version');
    target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: 'hue/saturation', master: readHueChannel(reader), reds: readHueChannel(reader), yellows: readHueChannel(reader), greens: readHueChannel(reader), cyans: readHueChannel(reader), blues: readHueChannel(reader), magentas: readHueChannel(reader) });
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    (0, psdWriter_1.writeUint16)(writer, 2); // version
    writeHueChannel(writer, info.master);
    writeHueChannel(writer, info.reds);
    writeHueChannel(writer, info.yellows);
    writeHueChannel(writer, info.greens);
    writeHueChannel(writer, info.cyans);
    writeHueChannel(writer, info.blues);
    writeHueChannel(writer, info.magentas);
});
function readColorBalance(reader) {
    return {
        cyanRed: (0, psdReader_1.readInt16)(reader),
        magentaGreen: (0, psdReader_1.readInt16)(reader),
        yellowBlue: (0, psdReader_1.readInt16)(reader),
    };
}
function writeColorBalance(writer, value) {
    (0, psdWriter_1.writeInt16)(writer, value.cyanRed || 0);
    (0, psdWriter_1.writeInt16)(writer, value.magentaGreen || 0);
    (0, psdWriter_1.writeInt16)(writer, value.yellowBlue || 0);
}
addHandler('blnc', adjustmentType('color balance'), (reader, target, left) => {
    target.adjustment = {
        type: 'color balance',
        shadows: readColorBalance(reader),
        midtones: readColorBalance(reader),
        highlights: readColorBalance(reader),
        preserveLuminosity: !!(0, psdReader_1.readUint8)(reader),
    };
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    writeColorBalance(writer, info.shadows || {});
    writeColorBalance(writer, info.midtones || {});
    writeColorBalance(writer, info.highlights || {});
    (0, psdWriter_1.writeUint8)(writer, info.preserveLuminosity ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 1);
});
addHandler('blwh', adjustmentType('black & white'), (reader, target, left) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.adjustment = {
        type: 'black & white',
        reds: desc['Rd  '],
        yellows: desc.Yllw,
        greens: desc['Grn '],
        cyans: desc['Cyn '],
        blues: desc['Bl  '],
        magentas: desc.Mgnt,
        useTint: !!desc.useTint,
        presetKind: desc.bwPresetKind,
        presetFileName: desc.blackAndWhitePresetFileName,
    };
    if (desc.tintColor !== undefined)
        target.adjustment.tintColor = (0, descriptor_1.parseColor)(desc.tintColor);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    const desc = {
        'Rd  ': info.reds || 0,
        Yllw: info.yellows || 0,
        'Grn ': info.greens || 0,
        'Cyn ': info.cyans || 0,
        'Bl  ': info.blues || 0,
        Mgnt: info.magentas || 0,
        useTint: !!info.useTint,
        tintColor: (0, descriptor_1.serializeColor)(info.tintColor),
        bwPresetKind: info.presetKind || 0,
        blackAndWhitePresetFileName: info.presetFileName || '',
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
addHandler('phfl', adjustmentType('photo filter'), (reader, target, left) => {
    const version = (0, psdReader_1.readUint16)(reader);
    if (version !== 2 && version !== 3)
        throw new Error('Invalid phfl version');
    let color;
    if (version === 2) {
        color = (0, psdReader_1.readColor)(reader);
    }
    else { // version 3
        // TODO: test this, this is probably wrong
        color = {
            l: (0, psdReader_1.readInt32)(reader) / 100,
            a: (0, psdReader_1.readInt32)(reader) / 100,
            b: (0, psdReader_1.readInt32)(reader) / 100,
        };
    }
    target.adjustment = {
        type: 'photo filter',
        color,
        density: (0, psdReader_1.readUint32)(reader) / 100,
        preserveLuminosity: !!(0, psdReader_1.readUint8)(reader),
    };
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    (0, psdWriter_1.writeUint16)(writer, 2); // version
    (0, psdWriter_1.writeColor)(writer, info.color || { l: 0, a: 0, b: 0 });
    (0, psdWriter_1.writeUint32)(writer, (info.density || 0) * 100);
    (0, psdWriter_1.writeUint8)(writer, info.preserveLuminosity ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 3);
});
function readMixrChannel(reader) {
    const red = (0, psdReader_1.readInt16)(reader);
    const green = (0, psdReader_1.readInt16)(reader);
    const blue = (0, psdReader_1.readInt16)(reader);
    (0, psdReader_1.skipBytes)(reader, 2);
    const constant = (0, psdReader_1.readInt16)(reader);
    return { red, green, blue, constant };
}
function writeMixrChannel(writer, channel) {
    const c = channel || {};
    (0, psdWriter_1.writeInt16)(writer, c.red);
    (0, psdWriter_1.writeInt16)(writer, c.green);
    (0, psdWriter_1.writeInt16)(writer, c.blue);
    (0, psdWriter_1.writeZeros)(writer, 2);
    (0, psdWriter_1.writeInt16)(writer, c.constant);
}
addHandler('mixr', adjustmentType('channel mixer'), (reader, target, left) => {
    if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error('Invalid mixr version');
    const adjustment = target.adjustment = Object.assign(Object.assign({}, target.adjustment), { type: 'channel mixer', monochrome: !!(0, psdReader_1.readUint16)(reader) });
    if (!adjustment.monochrome) {
        adjustment.red = readMixrChannel(reader);
        adjustment.green = readMixrChannel(reader);
        adjustment.blue = readMixrChannel(reader);
    }
    adjustment.gray = readMixrChannel(reader);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    (0, psdWriter_1.writeUint16)(writer, 1); // version
    (0, psdWriter_1.writeUint16)(writer, info.monochrome ? 1 : 0);
    if (info.monochrome) {
        writeMixrChannel(writer, info.gray);
        (0, psdWriter_1.writeZeros)(writer, 3 * 5 * 2);
    }
    else {
        writeMixrChannel(writer, info.red);
        writeMixrChannel(writer, info.green);
        writeMixrChannel(writer, info.blue);
        writeMixrChannel(writer, info.gray);
    }
});
const colorLookupType = (0, helpers_1.createEnum)('colorLookupType', '3dlut', {
    '3dlut': '3DLUT',
    abstractProfile: 'abstractProfile',
    deviceLinkProfile: 'deviceLinkProfile',
});
const LUTFormatType = (0, helpers_1.createEnum)('LUTFormatType', 'look', {
    look: 'LUTFormatLOOK',
    cube: 'LUTFormatCUBE',
    '3dl': 'LUTFormat3DL',
});
const colorLookupOrder = (0, helpers_1.createEnum)('colorLookupOrder', 'rgb', {
    rgb: 'rgbOrder',
    bgr: 'bgrOrder',
});
addHandler('clrL', adjustmentType('color lookup'), (reader, target, left) => {
    if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error('Invalid clrL version');
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.adjustment = { type: 'color lookup' };
    const info = target.adjustment;
    if (desc.lookupType !== undefined)
        info.lookupType = colorLookupType.decode(desc.lookupType);
    if (desc['Nm  '] !== undefined)
        info.name = desc['Nm  '];
    if (desc.Dthr !== undefined)
        info.dither = desc.Dthr;
    if (desc.profile !== undefined)
        info.profile = desc.profile;
    if (desc.LUTFormat !== undefined)
        info.lutFormat = LUTFormatType.decode(desc.LUTFormat);
    if (desc.dataOrder !== undefined)
        info.dataOrder = colorLookupOrder.decode(desc.dataOrder);
    if (desc.tableOrder !== undefined)
        info.tableOrder = colorLookupOrder.decode(desc.tableOrder);
    if (desc.LUT3DFileData !== undefined)
        info.lut3DFileData = desc.LUT3DFileData;
    if (desc.LUT3DFileName !== undefined)
        info.lut3DFileName = desc.LUT3DFileName;
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const info = target.adjustment;
    const desc = {};
    if (info.lookupType !== undefined)
        desc.lookupType = colorLookupType.encode(info.lookupType);
    if (info.name !== undefined)
        desc['Nm  '] = info.name;
    if (info.dither !== undefined)
        desc.Dthr = info.dither;
    if (info.profile !== undefined)
        desc.profile = info.profile;
    if (info.lutFormat !== undefined)
        desc.LUTFormat = LUTFormatType.encode(info.lutFormat);
    if (info.dataOrder !== undefined)
        desc.dataOrder = colorLookupOrder.encode(info.dataOrder);
    if (info.tableOrder !== undefined)
        desc.tableOrder = colorLookupOrder.encode(info.tableOrder);
    if (info.lut3DFileData !== undefined)
        desc.LUT3DFileData = info.lut3DFileData;
    if (info.lut3DFileName !== undefined)
        desc.LUT3DFileName = info.lut3DFileName;
    (0, psdWriter_1.writeUint16)(writer, 1); // version
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
addHandler('nvrt', adjustmentType('invert'), (reader, target, left) => {
    target.adjustment = { type: 'invert' };
    (0, psdReader_1.skipBytes)(reader, left());
}, () => {
    // nothing to write here
});
addHandler('post', adjustmentType('posterize'), (reader, target, left) => {
    target.adjustment = {
        type: 'posterize',
        levels: (0, psdReader_1.readUint16)(reader),
    };
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    var _a;
    const info = target.adjustment;
    (0, psdWriter_1.writeUint16)(writer, (_a = info.levels) !== null && _a !== void 0 ? _a : 4);
    (0, psdWriter_1.writeZeros)(writer, 2);
});
addHandler('thrs', adjustmentType('threshold'), (reader, target, left) => {
    target.adjustment = {
        type: 'threshold',
        level: (0, psdReader_1.readUint16)(reader),
    };
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    var _a;
    const info = target.adjustment;
    (0, psdWriter_1.writeUint16)(writer, (_a = info.level) !== null && _a !== void 0 ? _a : 128);
    (0, psdWriter_1.writeZeros)(writer, 2);
});
const grdmColorModels = ['', '', '', 'rgb', 'hsb', '', 'lab'];
addHandler('grdm', adjustmentType('gradient map'), (reader, target, left) => {
    const version = (0, psdReader_1.readUint16)(reader);
    if (version !== 1 && version !== 3)
        throw new Error('Invalid grdm version');
    const info = {
        type: 'gradient map',
        gradientType: 'solid',
    };
    info.reverse = !!(0, psdReader_1.readUint8)(reader);
    info.dither = !!(0, psdReader_1.readUint8)(reader);
    const hasMethod = !!(0, psdReader_1.readUint8)(reader);
    reader.offset--;
    if (hasMethod) {
        const method = (0, psdReader_1.readSignature)(reader);
        info.method = descriptor_1.gradientInterpolationMethodType.decode(method);
    }
    info.name = (0, psdReader_1.readUnicodeString)(reader);
    info.colorStops = [];
    info.opacityStops = [];
    const stopsCount = (0, psdReader_1.readUint16)(reader);
    for (let i = 0; i < stopsCount; i++) {
        info.colorStops.push({
            location: (0, psdReader_1.readUint32)(reader),
            midpoint: (0, psdReader_1.readUint32)(reader) / 100,
            color: (0, psdReader_1.readColor)(reader),
        });
        (0, psdReader_1.skipBytes)(reader, 2);
    }
    const opacityStopsCount = (0, psdReader_1.readUint16)(reader);
    for (let i = 0; i < opacityStopsCount; i++) {
        info.opacityStops.push({
            location: (0, psdReader_1.readUint32)(reader),
            midpoint: (0, psdReader_1.readUint32)(reader) / 100,
            opacity: (0, psdReader_1.readUint16)(reader) / 0xff,
        });
    }
    const expansionCount = (0, psdReader_1.readUint16)(reader);
    if (expansionCount !== 2)
        throw new Error('Invalid grdm expansion count');
    const interpolation = (0, psdReader_1.readUint16)(reader);
    info.smoothness = interpolation / 4096;
    const length = (0, psdReader_1.readUint16)(reader);
    if (length !== 32)
        throw new Error('Invalid grdm length');
    info.gradientType = (0, psdReader_1.readUint16)(reader) ? 'noise' : 'solid';
    info.randomSeed = (0, psdReader_1.readUint32)(reader);
    info.addTransparency = !!(0, psdReader_1.readUint16)(reader);
    info.restrictColors = !!(0, psdReader_1.readUint16)(reader);
    info.roughness = (0, psdReader_1.readUint32)(reader) / 4096;
    info.colorModel = (grdmColorModels[(0, psdReader_1.readUint16)(reader)] || 'rgb');
    info.min = [
        (0, psdReader_1.readUint16)(reader) / 0x8000,
        (0, psdReader_1.readUint16)(reader) / 0x8000,
        (0, psdReader_1.readUint16)(reader) / 0x8000,
        (0, psdReader_1.readUint16)(reader) / 0x8000,
    ];
    info.max = [
        (0, psdReader_1.readUint16)(reader) / 0x8000,
        (0, psdReader_1.readUint16)(reader) / 0x8000,
        (0, psdReader_1.readUint16)(reader) / 0x8000,
        (0, psdReader_1.readUint16)(reader) / 0x8000,
    ];
    (0, psdReader_1.skipBytes)(reader, left());
    for (const s of info.colorStops)
        s.location /= interpolation;
    for (const s of info.opacityStops)
        s.location /= interpolation;
    target.adjustment = info;
}, (writer, target) => {
    var _a, _b, _c;
    const info = target.adjustment;
    (0, psdWriter_1.writeUint16)(writer, info.method !== undefined ? 3 : 1); // version
    (0, psdWriter_1.writeUint8)(writer, info.reverse ? 1 : 0);
    (0, psdWriter_1.writeUint8)(writer, info.dither ? 1 : 0);
    if (info.method !== undefined) {
        (0, psdWriter_1.writeSignature)(writer, descriptor_1.gradientInterpolationMethodType.encode(info.method));
    }
    (0, psdWriter_1.writeUnicodeStringWithPadding)(writer, info.name || '');
    (0, psdWriter_1.writeUint16)(writer, info.colorStops && info.colorStops.length || 0);
    const interpolation = Math.round(((_a = info.smoothness) !== null && _a !== void 0 ? _a : 1) * 4096);
    for (const s of info.colorStops || []) {
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.location * interpolation));
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.midpoint * 100));
        (0, psdWriter_1.writeColor)(writer, s.color);
        (0, psdWriter_1.writeZeros)(writer, 2);
    }
    (0, psdWriter_1.writeUint16)(writer, info.opacityStops && info.opacityStops.length || 0);
    for (const s of info.opacityStops || []) {
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.location * interpolation));
        (0, psdWriter_1.writeUint32)(writer, Math.round(s.midpoint * 100));
        (0, psdWriter_1.writeUint16)(writer, Math.round(s.opacity * 0xff));
    }
    (0, psdWriter_1.writeUint16)(writer, 2); // expansion count
    (0, psdWriter_1.writeUint16)(writer, interpolation);
    (0, psdWriter_1.writeUint16)(writer, 32); // length
    (0, psdWriter_1.writeUint16)(writer, info.gradientType === 'noise' ? 1 : 0);
    (0, psdWriter_1.writeUint32)(writer, info.randomSeed || 0);
    (0, psdWriter_1.writeUint16)(writer, info.addTransparency ? 1 : 0);
    (0, psdWriter_1.writeUint16)(writer, info.restrictColors ? 1 : 0);
    (0, psdWriter_1.writeUint32)(writer, Math.round(((_b = info.roughness) !== null && _b !== void 0 ? _b : 1) * 4096));
    const colorModel = grdmColorModels.indexOf((_c = info.colorModel) !== null && _c !== void 0 ? _c : 'rgb');
    (0, psdWriter_1.writeUint16)(writer, colorModel === -1 ? 3 : colorModel);
    for (let i = 0; i < 4; i++)
        (0, psdWriter_1.writeUint16)(writer, Math.round((info.min && info.min[i] || 0) * 0x8000));
    for (let i = 0; i < 4; i++)
        (0, psdWriter_1.writeUint16)(writer, Math.round((info.max && info.max[i] || 0) * 0x8000));
    (0, psdWriter_1.writeZeros)(writer, 4);
});
function readSelectiveColors(reader) {
    return {
        c: (0, psdReader_1.readInt16)(reader),
        m: (0, psdReader_1.readInt16)(reader),
        y: (0, psdReader_1.readInt16)(reader),
        k: (0, psdReader_1.readInt16)(reader),
    };
}
function writeSelectiveColors(writer, cmyk) {
    const c = cmyk || {};
    (0, psdWriter_1.writeInt16)(writer, c.c);
    (0, psdWriter_1.writeInt16)(writer, c.m);
    (0, psdWriter_1.writeInt16)(writer, c.y);
    (0, psdWriter_1.writeInt16)(writer, c.k);
}
addHandler('selc', adjustmentType('selective color'), (reader, target) => {
    if ((0, psdReader_1.readUint16)(reader) !== 1)
        throw new Error('Invalid selc version');
    const mode = (0, psdReader_1.readUint16)(reader) ? 'absolute' : 'relative';
    (0, psdReader_1.skipBytes)(reader, 8);
    target.adjustment = {
        type: 'selective color',
        mode,
        reds: readSelectiveColors(reader),
        yellows: readSelectiveColors(reader),
        greens: readSelectiveColors(reader),
        cyans: readSelectiveColors(reader),
        blues: readSelectiveColors(reader),
        magentas: readSelectiveColors(reader),
        whites: readSelectiveColors(reader),
        neutrals: readSelectiveColors(reader),
        blacks: readSelectiveColors(reader),
    };
}, (writer, target) => {
    const info = target.adjustment;
    (0, psdWriter_1.writeUint16)(writer, 1); // version
    (0, psdWriter_1.writeUint16)(writer, info.mode === 'absolute' ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 8);
    writeSelectiveColors(writer, info.reds);
    writeSelectiveColors(writer, info.yellows);
    writeSelectiveColors(writer, info.greens);
    writeSelectiveColors(writer, info.cyans);
    writeSelectiveColors(writer, info.blues);
    writeSelectiveColors(writer, info.magentas);
    writeSelectiveColors(writer, info.whites);
    writeSelectiveColors(writer, info.neutrals);
    writeSelectiveColors(writer, info.blacks);
});
addHandler('CgEd', target => {
    const a = target.adjustment;
    if (!a)
        return false;
    return (a.type === 'brightness/contrast' && !a.useLegacy) ||
        ((a.type === 'levels' || a.type === 'curves' || a.type === 'exposure' || a.type === 'channel mixer' ||
            a.type === 'hue/saturation') && a.presetFileName !== undefined);
}, (reader, target, left) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    if (desc.Vrsn !== 1)
        throw new Error('Invalid CgEd version');
    // this section can specify preset file name for other adjustment types
    if ('presetFileName' in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.presetKind, presetFileName: desc.presetFileName });
    }
    else if ('curvesPresetFileName' in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.curvesPresetKind, presetFileName: desc.curvesPresetFileName });
    }
    else if ('mixerPresetFileName' in desc) {
        target.adjustment = Object.assign(Object.assign({}, target.adjustment), { presetKind: desc.mixerPresetKind, presetFileName: desc.mixerPresetFileName });
    }
    else {
        target.adjustment = {
            type: 'brightness/contrast',
            brightness: desc.Brgh,
            contrast: desc.Cntr,
            meanValue: desc.means,
            useLegacy: !!desc.useLegacy,
            labColorOnly: !!desc['Lab '],
            auto: !!desc.Auto,
        };
    }
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    var _a, _b, _c, _d;
    const info = target.adjustment;
    if (info.type === 'levels' || info.type === 'exposure' || info.type === 'hue/saturation') {
        const desc = {
            Vrsn: 1,
            presetKind: (_a = info.presetKind) !== null && _a !== void 0 ? _a : 1,
            presetFileName: info.presetFileName || '',
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
    }
    else if (info.type === 'curves') {
        const desc = {
            Vrsn: 1,
            curvesPresetKind: (_b = info.presetKind) !== null && _b !== void 0 ? _b : 1,
            curvesPresetFileName: info.presetFileName || '',
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
    }
    else if (info.type === 'channel mixer') {
        const desc = {
            Vrsn: 1,
            mixerPresetKind: (_c = info.presetKind) !== null && _c !== void 0 ? _c : 1,
            mixerPresetFileName: info.presetFileName || '',
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
    }
    else if (info.type === 'brightness/contrast') {
        const desc = {
            Vrsn: 1,
            Brgh: info.brightness || 0,
            Cntr: info.contrast || 0,
            means: (_d = info.meanValue) !== null && _d !== void 0 ? _d : 127,
            'Lab ': !!info.labColorOnly,
            useLegacy: !!info.useLegacy,
            Auto: !!info.auto,
        };
        (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
    }
    else {
        throw new Error('Unhandled CgEd case');
    }
});
function getTextLayersSortedByIndex(psd) {
    const layers = [];
    function collect(layer) {
        var _a;
        if (layer.children) {
            for (const child of layer.children) {
                if (((_a = child.text) === null || _a === void 0 ? void 0 : _a.index) !== undefined) {
                    layers[child.text.index] = child;
                }
                collect(child);
            }
        }
    }
    collect(psd);
    return layers;
}
addHandler('Txt2', hasKey('engineData'), (reader, target, left, psd) => {
    const data = (0, psdReader_1.readBytes)(reader, left());
    target.engineData = (0, base64_js_1.fromByteArray)(data);
    const layersByIndex = getTextLayersSortedByIndex(psd);
    const engineData = (0, engineData_1.parseEngineData)(data);
    const engineData2 = (0, engineData2_1.decodeEngineData2)(engineData);
    const TextFrameSet = engineData2.ResourceDict.TextFrameSet;
    if (TextFrameSet) {
        for (let i = 0; i < TextFrameSet.length; i++) {
            const layer = layersByIndex[i];
            if (TextFrameSet[i].path && (layer === null || layer === void 0 ? void 0 : layer.text)) {
                layer.text.textPath = TextFrameSet[i].path;
            }
        }
    }
    // console.log(require('util').inspect(engineData, false, 99, true));
    // require('fs').writeFileSync('test_data.bin', data);
    // require('fs').writeFileSync('test_data.txt', require('util').inspect(engineData, false, 99, false), 'utf8');
    // require('fs').writeFileSync('test_data.json', JSON.stringify(engineData2, null, 2), 'utf8');
}, (writer, target) => {
    const buffer = (0, base64_js_1.toByteArray)(target.engineData);
    (0, psdWriter_1.writeBytes)(writer, buffer);
});
addHandler('FEid', hasKey('filterEffectsMasks'), (reader, target, leftBytes) => {
    const version = (0, psdReader_1.readInt32)(reader);
    if (version < 1 || version > 3)
        throw new Error(`Invalid filterEffects version ${version}`);
    target.filterEffectsMasks = [];
    while (leftBytes() > 8) {
        if ((0, psdReader_1.readUint32)(reader))
            throw new Error('filterEffects: 64 bit length is not supported');
        const length = (0, psdReader_1.readUint32)(reader);
        const end = reader.offset + length;
        const id = (0, psdReader_1.readPascalString)(reader, 1);
        const effectVersion = (0, psdReader_1.readInt32)(reader);
        if (effectVersion !== 1)
            throw new Error(`Invalid filterEffect version ${effectVersion}`);
        if ((0, psdReader_1.readUint32)(reader))
            throw new Error('filterEffect: 64 bit length is not supported');
        /*const effectLength =*/ (0, psdReader_1.readUint32)(reader);
        // const endOfEffect = reader.offset + effectLength;
        const top = (0, psdReader_1.readInt32)(reader);
        const left = (0, psdReader_1.readInt32)(reader);
        const bottom = (0, psdReader_1.readInt32)(reader);
        const right = (0, psdReader_1.readInt32)(reader);
        const depth = (0, psdReader_1.readInt32)(reader);
        const maxChannels = (0, psdReader_1.readInt32)(reader);
        const channels = [];
        // 0 -> R, 1 -> G, 2 -> B, 25 -> A
        for (let i = 0; i < (maxChannels + 2); i++) { // channels + user mask + sheet mask
            const exists = (0, psdReader_1.readInt32)(reader);
            if (exists) {
                if ((0, psdReader_1.readUint32)(reader))
                    throw new Error('filterEffect: 64 bit length is not supported');
                const channelLength = (0, psdReader_1.readUint32)(reader);
                if (!channelLength)
                    throw new Error('filterEffect: Empty channel');
                const compressionMode = (0, psdReader_1.readUint16)(reader);
                const data = (0, psdReader_1.readBytes)(reader, channelLength - 2);
                channels.push({ compressionMode, data });
            }
            else {
                channels.push(undefined);
            }
        }
        target.filterEffectsMasks.push({ id, top, left, bottom, right, depth, channels });
        if (reader.offset < end && (0, psdReader_1.readUint8)(reader)) {
            const top = (0, psdReader_1.readInt32)(reader);
            const left = (0, psdReader_1.readInt32)(reader);
            const bottom = (0, psdReader_1.readInt32)(reader);
            const right = (0, psdReader_1.readInt32)(reader);
            if ((0, psdReader_1.readUint32)(reader))
                throw new Error('filterEffect: 64 bit length is not supported');
            const extraLength = (0, psdReader_1.readUint32)(reader);
            const compressionMode = (0, psdReader_1.readUint16)(reader);
            const data = (0, psdReader_1.readBytes)(reader, extraLength - 2);
            target.filterEffectsMasks[target.filterEffectsMasks.length - 1].extra = { top, left, bottom, right, compressionMode, data };
        }
        reader.offset = end;
        let len = length;
        while (len % 4) {
            reader.offset++;
            len++;
        }
    }
}, (writer, target) => {
    var _a;
    (0, psdWriter_1.writeInt32)(writer, 3); // version
    for (const mask of target.filterEffectsMasks) {
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeUint32)(writer, 0);
        const lengthOffset = writer.offset;
        (0, psdWriter_1.writePascalString)(writer, mask.id, 1);
        (0, psdWriter_1.writeInt32)(writer, 1); // version
        (0, psdWriter_1.writeUint32)(writer, 0);
        (0, psdWriter_1.writeUint32)(writer, 0);
        const length2Offset = writer.offset;
        (0, psdWriter_1.writeInt32)(writer, mask.top);
        (0, psdWriter_1.writeInt32)(writer, mask.left);
        (0, psdWriter_1.writeInt32)(writer, mask.bottom);
        (0, psdWriter_1.writeInt32)(writer, mask.right);
        (0, psdWriter_1.writeInt32)(writer, mask.depth);
        const maxChannels = Math.max(0, mask.channels.length - 2);
        (0, psdWriter_1.writeInt32)(writer, maxChannels);
        for (let i = 0; i < (maxChannels + 2); i++) {
            const channel = mask.channels[i];
            (0, psdWriter_1.writeInt32)(writer, channel ? 1 : 0);
            if (channel) {
                (0, psdWriter_1.writeUint32)(writer, 0);
                (0, psdWriter_1.writeUint32)(writer, channel.data.length + 2);
                (0, psdWriter_1.writeUint16)(writer, channel.compressionMode);
                (0, psdWriter_1.writeBytes)(writer, channel.data);
            }
        }
        writer.view.setUint32(length2Offset - 4, writer.offset - length2Offset, false);
        const extra = (_a = target.filterEffectsMasks[target.filterEffectsMasks.length - 1]) === null || _a === void 0 ? void 0 : _a.extra;
        if (extra) {
            (0, psdWriter_1.writeUint8)(writer, 1);
            (0, psdWriter_1.writeInt32)(writer, extra.top);
            (0, psdWriter_1.writeInt32)(writer, extra.left);
            (0, psdWriter_1.writeInt32)(writer, extra.bottom);
            (0, psdWriter_1.writeInt32)(writer, extra.right);
            (0, psdWriter_1.writeUint32)(writer, 0);
            (0, psdWriter_1.writeUint32)(writer, extra.data.byteLength + 2);
            (0, psdWriter_1.writeUint16)(writer, extra.compressionMode);
            (0, psdWriter_1.writeBytes)(writer, extra.data);
        }
        let length = writer.offset - lengthOffset;
        writer.view.setUint32(lengthOffset - 4, length, false);
        while (length % 4) {
            (0, psdWriter_1.writeZeros)(writer, 1);
            length++;
        }
    }
});
addHandlerAlias('FXid', 'FEid');
addHandler('FMsk', hasKey('filterMask'), (reader, target) => {
    target.filterMask = {
        colorSpace: (0, psdReader_1.readColor)(reader),
        opacity: (0, psdReader_1.readUint16)(reader) / 0xff,
    };
}, (writer, target) => {
    var _a;
    (0, psdWriter_1.writeColor)(writer, target.filterMask.colorSpace);
    (0, psdWriter_1.writeUint16)(writer, (0, helpers_1.clamp)((_a = target.filterMask.opacity) !== null && _a !== void 0 ? _a : 1, 0, 1) * 0xff);
});
addHandler('artd', // document-wide artboard info
// document-wide artboard info
target => target.artboards !== undefined, (reader, target, left) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    target.artboards = {
        count: desc['Cnt '],
        autoExpandOffset: { horizontal: desc.autoExpandOffset.Hrzn, vertical: desc.autoExpandOffset.Vrtc },
        origin: { horizontal: desc.origin.Hrzn, vertical: desc.origin.Vrtc },
        autoExpandEnabled: desc.autoExpandEnabled,
        autoNestEnabled: desc.autoNestEnabled,
        autoPositionEnabled: desc.autoPositionEnabled,
        shrinkwrapOnSaveEnabled: !!desc.shrinkwrapOnSaveEnabled,
        docDefaultNewArtboardBackgroundColor: (0, descriptor_1.parseColor)(desc.docDefaultNewArtboardBackgroundColor),
        docDefaultNewArtboardBackgroundType: desc.docDefaultNewArtboardBackgroundType,
    };
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    var _a, _b, _c, _d, _e;
    const artb = target.artboards;
    const desc = {
        'Cnt ': artb.count,
        autoExpandOffset: artb.autoExpandOffset ? { Hrzn: artb.autoExpandOffset.horizontal, Vrtc: artb.autoExpandOffset.vertical } : { Hrzn: 0, Vrtc: 0 },
        origin: artb.origin ? { Hrzn: artb.origin.horizontal, Vrtc: artb.origin.vertical } : { Hrzn: 0, Vrtc: 0 },
        autoExpandEnabled: (_a = artb.autoExpandEnabled) !== null && _a !== void 0 ? _a : true,
        autoNestEnabled: (_b = artb.autoNestEnabled) !== null && _b !== void 0 ? _b : true,
        autoPositionEnabled: (_c = artb.autoPositionEnabled) !== null && _c !== void 0 ? _c : true,
        shrinkwrapOnSaveEnabled: (_d = artb.shrinkwrapOnSaveEnabled) !== null && _d !== void 0 ? _d : true,
        docDefaultNewArtboardBackgroundColor: (0, descriptor_1.serializeColor)(artb.docDefaultNewArtboardBackgroundColor),
        docDefaultNewArtboardBackgroundType: (_e = artb.docDefaultNewArtboardBackgroundType) !== null && _e !== void 0 ? _e : 1,
    };
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc, 'artd');
});
function hasMultiEffects(effects) {
    return Object.keys(effects).map(key => effects[key]).some(v => Array.isArray(v) && v.length > 1);
}
addHandler('lfx2', target => target.effects !== undefined && !hasMultiEffects(target.effects), (reader, target, left) => {
    const version = (0, psdReader_1.readUint32)(reader);
    if (version !== 0)
        throw new Error(`Invalid lfx2 version`);
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log('READ', require('util').inspect(desc, false, 99, true));
    // TODO: don't discard if we got it from lmfx
    // discard if read in 'lrFX' section
    target.effects = (0, descriptor_1.parseEffects)(desc, !!reader.logMissingFeatures);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target, _, options) => {
    const desc = (0, descriptor_1.serializeEffects)(target.effects, !!options.logMissingFeatures, true);
    // console.log('WRITE', require('util').inspect(desc, false, 99, true));
    (0, psdWriter_1.writeUint32)(writer, 0); // version
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
addHandler('cinf', hasKey('compositorUsed'), (reader, target, left) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    function enumValue(desc) {
        return desc.split('.')[1];
    }
    target.compositorUsed = {
        description: desc.description,
        reason: desc.reason,
        engine: enumValue(desc.Engn),
    };
    if (desc.Vrsn)
        target.compositorUsed.version = desc.Vrsn;
    if (desc.psVersion)
        target.compositorUsed.photoshopVersion = desc.psVersion;
    if (desc.enableCompCore)
        target.compositorUsed.enableCompCore = enumValue(desc.enableCompCore);
    if (desc.enableCompCoreGPU)
        target.compositorUsed.enableCompCoreGPU = enumValue(desc.enableCompCoreGPU);
    if (desc.enableCompCoreThreads)
        target.compositorUsed.enableCompCoreThreads = enumValue(desc.enableCompCoreThreads);
    if (desc.compCoreSupport)
        target.compositorUsed.compCoreSupport = enumValue(desc.compCoreSupport);
    if (desc.compCoreGPUSupport)
        target.compositorUsed.compCoreGPUSupport = enumValue(desc.compCoreGPUSupport);
    (0, psdReader_1.skipBytes)(reader, left());
}, (writer, target) => {
    const cinf = target.compositorUsed;
    const desc = {
        Vrsn: cinf.version || { major: 1, minor: 0, fix: 0 },
    };
    if (cinf.photoshopVersion)
        desc.psVersion = cinf.photoshopVersion;
    desc.description = cinf.description;
    desc.reason = cinf.reason;
    desc.Engn = `Engn.${cinf.engine}`;
    if (cinf.enableCompCore)
        desc.enableCompCore = `enable.${cinf.enableCompCore}`;
    if (cinf.enableCompCoreGPU)
        desc.enableCompCoreGPU = `enable.${cinf.enableCompCoreGPU}`;
    if (cinf.enableCompCoreThreads)
        desc.enableCompCoreThreads = `enable.${cinf.enableCompCoreThreads}`;
    if (cinf.compCoreSupport)
        desc.compCoreSupport = `reason.${cinf.compCoreSupport}`;
    if (cinf.compCoreGPUSupport)
        desc.compCoreGPUSupport = `reason.${cinf.compCoreGPUSupport}`;
    (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', desc);
});
// extension settings ?, ignore it
addHandler('extn', target => target._extn !== undefined, (reader, target) => {
    const desc = (0, descriptor_1.readVersionAndDescriptor)(reader);
    // console.log(require('util').inspect(desc, false, 99, true));
    if (helpers_1.MOCK_HANDLERS)
        target._extn = desc;
}, (writer, target) => {
    // TODO: need to add correct types for desc fields (resources/src.psd)
    if (helpers_1.MOCK_HANDLERS)
        (0, descriptor_1.writeVersionAndDescriptor)(writer, '', 'null', target._extn);
});
addHandler('iOpa', hasKey('fillOpacity'), (reader, target) => {
    target.fillOpacity = (0, psdReader_1.readUint8)(reader) / 0xff;
    (0, psdReader_1.skipBytes)(reader, 3);
}, (writer, target) => {
    (0, psdWriter_1.writeUint8)(writer, target.fillOpacity * 0xff);
    (0, psdWriter_1.writeZeros)(writer, 3);
});
addHandler('brst', hasKey('channelBlendingRestrictions'), (reader, target, left) => {
    target.channelBlendingRestrictions = [];
    while (left() > 4) {
        target.channelBlendingRestrictions.push((0, psdReader_1.readInt32)(reader));
    }
}, (writer, target) => {
    for (const channel of target.channelBlendingRestrictions) {
        (0, psdWriter_1.writeInt32)(writer, channel);
    }
});
addHandler('tsly', hasKey('transparencyShapesLayer'), (reader, target) => {
    target.transparencyShapesLayer = !!(0, psdReader_1.readUint8)(reader);
    (0, psdReader_1.skipBytes)(reader, 3);
}, (writer, target) => {
    (0, psdWriter_1.writeUint8)(writer, target.transparencyShapesLayer ? 1 : 0);
    (0, psdWriter_1.writeZeros)(writer, 3);
});
//# sourceMappingURL=additionalInfo.js.map