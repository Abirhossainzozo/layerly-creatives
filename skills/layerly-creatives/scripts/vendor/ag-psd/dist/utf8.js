"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringLengthInBytes = stringLengthInBytes;
exports.encodeStringTo = encodeStringTo;
exports.encodeString = encodeString;
exports.decodeString = decodeString;
function charLengthInBytes(code) {
    if ((code & 0xffffff80) === 0) {
        return 1;
    }
    else if ((code & 0xfffff800) === 0) {
        return 2;
    }
    else if ((code & 0xffff0000) === 0) {
        return 3;
    }
    else {
        return 4;
    }
}
// Reads a scalar value at index `i`, replacing unpaired surrogates with U+FFFD,
// matching how TextEncoder converts a string to a sequence of Unicode scalar values.
function codePointAt(value, i) {
    const code = value.charCodeAt(i);
    // high surrogate
    if (code >= 0xd800 && code <= 0xdbff && (i + 1) < value.length) {
        const extra = value.charCodeAt(i + 1);
        // low surrogate
        if (extra >= 0xdc00 && extra <= 0xdfff) {
            return { code: ((code & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000, size: 2 };
        }
    }
    // unpaired surrogate (lone high or lone low)
    if (code >= 0xd800 && code <= 0xdfff) {
        return { code: 0xfffd, size: 1 };
    }
    return { code, size: 1 };
}
function stringLengthInBytes(value) {
    let result = 0;
    for (let i = 0; i < value.length;) {
        const { code, size } = codePointAt(value, i);
        result += charLengthInBytes(code);
        i += size;
    }
    return result;
}
function writeCharacter(buffer, offset, code) {
    const length = charLengthInBytes(code);
    switch (length) {
        case 1:
            buffer[offset] = code;
            break;
        case 2:
            buffer[offset] = ((code >> 6) & 0x1f) | 0xc0;
            buffer[offset + 1] = (code & 0x3f) | 0x80;
            break;
        case 3:
            buffer[offset] = ((code >> 12) & 0x0f) | 0xe0;
            buffer[offset + 1] = ((code >> 6) & 0x3f) | 0x80;
            buffer[offset + 2] = (code & 0x3f) | 0x80;
            break;
        default:
            buffer[offset] = ((code >> 18) & 0x07) | 0xf0;
            buffer[offset + 1] = ((code >> 12) & 0x3f) | 0x80;
            buffer[offset + 2] = ((code >> 6) & 0x3f) | 0x80;
            buffer[offset + 3] = (code & 0x3f) | 0x80;
            break;
    }
    return length;
}
function encodeStringTo(buffer, offset, value) {
    for (let i = 0; i < value.length;) {
        const { code, size } = codePointAt(value, i);
        offset += writeCharacter(buffer, offset, code);
        i += size;
    }
    return offset;
}
function encodeString(value) {
    if (value.length > 1000 && typeof TextEncoder !== 'undefined') {
        return (new TextEncoder()).encode(value);
    }
    const buffer = new Uint8Array(stringLengthInBytes(value));
    encodeStringTo(buffer, 0, value);
    return buffer;
}
// UTF-8 decoder implementing the WHATWG Encoding Standard's non-fatal error handling,
// so malformed byte sequences are replaced with U+FFFD instead of throwing, matching TextDecoder.
function decodeString(value) {
    if (value.byteLength > 1000 && typeof TextDecoder !== 'undefined') {
        return (new TextDecoder()).decode(value);
    }
    const result = [];
    function pushCodePoint(code) {
        if (code > 0xffff) {
            code -= 0x10000;
            result.push(String.fromCharCode((code >>> 10 & 0x3ff) | 0xd800));
            code = 0xdc00 | (code & 0x3ff);
        }
        result.push(String.fromCharCode(code));
    }
    let codePoint = 0;
    let bytesSeen = 0;
    let bytesNeeded = 0;
    let lowerBoundary = 0x80;
    let upperBoundary = 0xbf;
    for (let i = 0; i < value.length; i++) {
        const byte = value[i];
        if (bytesNeeded === 0) {
            if (byte <= 0x7f) {
                pushCodePoint(byte);
            }
            else if (byte >= 0xc2 && byte <= 0xdf) {
                bytesNeeded = 1;
                codePoint = byte & 0x1f;
            }
            else if (byte >= 0xe0 && byte <= 0xef) {
                if (byte === 0xe0)
                    lowerBoundary = 0xa0;
                if (byte === 0xed)
                    upperBoundary = 0x9f;
                bytesNeeded = 2;
                codePoint = byte & 0x0f;
            }
            else if (byte >= 0xf0 && byte <= 0xf4) {
                if (byte === 0xf0)
                    lowerBoundary = 0x90;
                if (byte === 0xf4)
                    upperBoundary = 0x8f;
                bytesNeeded = 3;
                codePoint = byte & 0x07;
            }
            else {
                // invalid leading byte
                pushCodePoint(0xfffd);
            }
            continue;
        }
        if (byte < lowerBoundary || byte > upperBoundary) {
            // invalid continuation byte: emit replacement and reprocess this byte as a new sequence start
            codePoint = 0;
            bytesNeeded = 0;
            bytesSeen = 0;
            lowerBoundary = 0x80;
            upperBoundary = 0xbf;
            pushCodePoint(0xfffd);
            i--;
            continue;
        }
        lowerBoundary = 0x80;
        upperBoundary = 0xbf;
        codePoint = (codePoint << 6) | (byte & 0x3f);
        bytesSeen++;
        if (bytesSeen !== bytesNeeded)
            continue;
        pushCodePoint(codePoint);
        codePoint = 0;
        bytesNeeded = 0;
        bytesSeen = 0;
    }
    // truncated sequence at end of input
    if (bytesNeeded !== 0) {
        pushCodePoint(0xfffd);
    }
    return result.join('');
}
//# sourceMappingURL=utf8.js.map