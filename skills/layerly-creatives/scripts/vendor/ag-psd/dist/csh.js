"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCsh = readCsh;
const additionalInfo_1 = require("./additionalInfo");
const psdReader_1 = require("./psdReader");
function readCsh(buffer) {
    const reader = (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const csh = { shapes: [] };
    (0, psdReader_1.checkSignature)(reader, 'cush');
    if ((0, psdReader_1.readUint32)(reader) !== 2)
        throw new Error('Invalid version');
    const count = (0, psdReader_1.readUint32)(reader);
    for (let i = 0; i < count; i++) {
        const name = (0, psdReader_1.readUnicodeString)(reader);
        while (reader.offset % 4)
            reader.offset++; // pad to 4byte bounds
        if ((0, psdReader_1.readUint32)(reader) !== 1)
            throw new Error('Invalid shape version');
        const size = (0, psdReader_1.readUint32)(reader);
        const end = reader.offset + size;
        const id = (0, psdReader_1.readPascalString)(reader, 1);
        // this might not be correct ???
        const y1 = (0, psdReader_1.readUint32)(reader);
        const x1 = (0, psdReader_1.readUint32)(reader);
        const y2 = (0, psdReader_1.readUint32)(reader);
        const x2 = (0, psdReader_1.readUint32)(reader);
        const width = x2 - x1;
        const height = y2 - y1;
        const mask = { paths: [] };
        (0, additionalInfo_1.readVectorMask)(reader, mask, width, height, end - reader.offset);
        csh.shapes.push(Object.assign({ name, id, width, height }, mask));
        reader.offset = end;
    }
    return csh;
}
//# sourceMappingURL=csh.js.map