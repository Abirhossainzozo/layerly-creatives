"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAse = readAse;
const psdReader_1 = require("./psdReader");
function readAse(buffer) {
    const reader = (0, psdReader_1.createReader)(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const signature = (0, psdReader_1.readSignature)(reader); // ASEF
    if (signature !== 'ASEF')
        throw new Error('Invalid signature');
    const versionMajor = (0, psdReader_1.readUint16)(reader); // 1
    const versionMinor = (0, psdReader_1.readUint16)(reader); // 0
    if (versionMajor !== 1 || versionMinor !== 0)
        throw new Error('Invalid version');
    const blocksCount = (0, psdReader_1.readUint32)(reader);
    const colorTypes = ['global', 'spot', 'normal'];
    const ase = { colors: [] };
    let group = ase;
    for (let i = 0; i < blocksCount; i++) {
        const type = (0, psdReader_1.readUint16)(reader);
        const length = (0, psdReader_1.readUint32)(reader);
        const end = reader.offset + length;
        switch (type) {
            case 0x0001: { // color
                const nameLength = (0, psdReader_1.readUint16)(reader);
                const name = (0, psdReader_1.readUnicodeStringWithLength)(reader, nameLength);
                const colorMode = (0, psdReader_1.readSignature)(reader);
                let color;
                switch (colorMode) {
                    case 'RGB ':
                        color = {
                            r: (0, psdReader_1.readFloat32)(reader),
                            g: (0, psdReader_1.readFloat32)(reader),
                            b: (0, psdReader_1.readFloat32)(reader),
                            type: colorTypes[(0, psdReader_1.readUint16)(reader)],
                        };
                        break;
                    case 'CMYK':
                        color = {
                            c: (0, psdReader_1.readFloat32)(reader),
                            m: (0, psdReader_1.readFloat32)(reader),
                            y: (0, psdReader_1.readFloat32)(reader),
                            k: (0, psdReader_1.readFloat32)(reader),
                            type: colorTypes[(0, psdReader_1.readUint16)(reader)],
                        };
                        break;
                    case 'Gray':
                        color = {
                            k: (0, psdReader_1.readFloat32)(reader),
                            type: colorTypes[(0, psdReader_1.readUint16)(reader)],
                        };
                        break;
                    case 'LAB ':
                        color = {
                            l: (0, psdReader_1.readFloat32)(reader),
                            a: (0, psdReader_1.readFloat32)(reader),
                            b: (0, psdReader_1.readFloat32)(reader),
                            type: colorTypes[(0, psdReader_1.readUint16)(reader)],
                        };
                        break;
                    default:
                        throw new Error('Invalid color mode');
                }
                if (!color.type)
                    throw new Error('Invalid color type');
                group.colors.push({ name, color });
                break;
            }
            case 0xC001: { // group start
                const nameLength = (0, psdReader_1.readUint16)(reader);
                const name = (0, psdReader_1.readUnicodeStringWithLength)(reader, nameLength);
                ase.colors.push(group = { name, colors: [] });
                break;
            }
            case 0xC002: // group end
                group = ase;
                break;
            default:
                throw new Error('Invalid block type');
        }
        reader.offset = end;
    }
    return ase;
}
//# sourceMappingURL=ase.js.map