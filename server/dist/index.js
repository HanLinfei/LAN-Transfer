// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// node_modules/strtok3/lib/stream/Errors.js
var defaultMessages = "End-Of-Stream", EndOfStreamError, AbortError;
var init_Errors = __esm(() => {
  EndOfStreamError = class EndOfStreamError extends Error {
    constructor() {
      super(defaultMessages);
      this.name = "EndOfStreamError";
    }
  };
  AbortError = class AbortError extends Error {
    constructor(message = "The operation was aborted") {
      super(message);
      this.name = "AbortError";
    }
  };
});

// node_modules/strtok3/lib/stream/Deferred.js
class Deferred {
  constructor() {
    this.resolve = () => null;
    this.reject = () => null;
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

// node_modules/strtok3/lib/stream/AbstractStreamReader.js
class AbstractStreamReader {
  constructor() {
    this.endOfStream = false;
    this.interrupted = false;
    this.peekQueue = [];
  }
  async peek(uint8Array, mayBeLess = false) {
    const bytesRead = await this.read(uint8Array, mayBeLess);
    this.peekQueue.push(uint8Array.subarray(0, bytesRead));
    return bytesRead;
  }
  async read(buffer, mayBeLess = false) {
    if (buffer.length === 0) {
      return 0;
    }
    let bytesRead = this.readFromPeekBuffer(buffer);
    if (!this.endOfStream) {
      bytesRead += await this.readRemainderFromStream(buffer.subarray(bytesRead), mayBeLess);
    }
    if (bytesRead === 0 && !mayBeLess) {
      throw new EndOfStreamError;
    }
    return bytesRead;
  }
  readFromPeekBuffer(buffer) {
    let remaining = buffer.length;
    let bytesRead = 0;
    while (this.peekQueue.length > 0 && remaining > 0) {
      const peekData = this.peekQueue.pop();
      if (!peekData)
        throw new Error("peekData should be defined");
      const lenCopy = Math.min(peekData.length, remaining);
      buffer.set(peekData.subarray(0, lenCopy), bytesRead);
      bytesRead += lenCopy;
      remaining -= lenCopy;
      if (lenCopy < peekData.length) {
        this.peekQueue.push(peekData.subarray(lenCopy));
      }
    }
    return bytesRead;
  }
  async readRemainderFromStream(buffer, mayBeLess) {
    let bytesRead = 0;
    while (bytesRead < buffer.length && !this.endOfStream) {
      if (this.interrupted) {
        throw new AbortError;
      }
      const chunkLen = await this.readFromStream(buffer.subarray(bytesRead), mayBeLess);
      if (chunkLen === 0)
        break;
      bytesRead += chunkLen;
    }
    if (!mayBeLess && bytesRead < buffer.length) {
      throw new EndOfStreamError;
    }
    return bytesRead;
  }
}
var init_AbstractStreamReader = __esm(() => {
  init_Errors();
});

// node_modules/strtok3/lib/stream/StreamReader.js
var StreamReader;
var init_StreamReader = __esm(() => {
  init_Errors();
  init_AbstractStreamReader();
  StreamReader = class StreamReader extends AbstractStreamReader {
    constructor(s) {
      super();
      this.s = s;
      this.deferred = null;
      if (!s.read || !s.once) {
        throw new Error("Expected an instance of stream.Readable");
      }
      this.s.once("end", () => {
        this.endOfStream = true;
        if (this.deferred) {
          this.deferred.resolve(0);
        }
      });
      this.s.once("error", (err) => this.reject(err));
      this.s.once("close", () => this.abort());
    }
    async readFromStream(buffer, mayBeLess) {
      if (buffer.length === 0)
        return 0;
      const readBuffer = this.s.read(buffer.length);
      if (readBuffer) {
        buffer.set(readBuffer);
        return readBuffer.length;
      }
      const request = {
        buffer,
        mayBeLess,
        deferred: new Deferred
      };
      this.deferred = request.deferred;
      this.s.once("readable", () => {
        this.readDeferred(request);
      });
      return request.deferred.promise;
    }
    readDeferred(request) {
      const readBuffer = this.s.read(request.buffer.length);
      if (readBuffer) {
        request.buffer.set(readBuffer);
        request.deferred.resolve(readBuffer.length);
        this.deferred = null;
      } else {
        this.s.once("readable", () => {
          this.readDeferred(request);
        });
      }
    }
    reject(err) {
      this.interrupted = true;
      if (this.deferred) {
        this.deferred.reject(err);
        this.deferred = null;
      }
    }
    async abort() {
      this.reject(new AbortError);
    }
    async close() {
      return this.abort();
    }
  };
});

// node_modules/strtok3/lib/stream/WebStreamReader.js
var WebStreamReader;
var init_WebStreamReader = __esm(() => {
  init_AbstractStreamReader();
  WebStreamReader = class WebStreamReader extends AbstractStreamReader {
    constructor(reader) {
      super();
      this.reader = reader;
    }
    async abort() {
      return this.close();
    }
    async close() {
      this.reader.releaseLock();
    }
  };
});

// node_modules/strtok3/lib/stream/WebStreamByobReader.js
var WebStreamByobReader;
var init_WebStreamByobReader = __esm(() => {
  init_WebStreamReader();
  WebStreamByobReader = class WebStreamByobReader extends WebStreamReader {
    async readFromStream(buffer, mayBeLess) {
      if (buffer.length === 0)
        return 0;
      const result = await this.reader.read(new Uint8Array(buffer.length), { min: mayBeLess ? undefined : buffer.length });
      if (result.done) {
        this.endOfStream = result.done;
      }
      if (result.value) {
        buffer.set(result.value);
        return result.value.length;
      }
      return 0;
    }
  };
});

// node_modules/strtok3/lib/stream/WebStreamDefaultReader.js
var WebStreamDefaultReader;
var init_WebStreamDefaultReader = __esm(() => {
  init_Errors();
  init_AbstractStreamReader();
  WebStreamDefaultReader = class WebStreamDefaultReader extends AbstractStreamReader {
    constructor(reader) {
      super();
      this.reader = reader;
      this.buffer = null;
    }
    writeChunk(target, chunk) {
      const written = Math.min(chunk.length, target.length);
      target.set(chunk.subarray(0, written));
      if (written < chunk.length) {
        this.buffer = chunk.subarray(written);
      } else {
        this.buffer = null;
      }
      return written;
    }
    async readFromStream(buffer, mayBeLess) {
      if (buffer.length === 0)
        return 0;
      let totalBytesRead = 0;
      if (this.buffer) {
        totalBytesRead += this.writeChunk(buffer, this.buffer);
      }
      while (totalBytesRead < buffer.length && !this.endOfStream) {
        const result = await this.reader.read();
        if (result.done) {
          this.endOfStream = true;
          break;
        }
        if (result.value) {
          totalBytesRead += this.writeChunk(buffer.subarray(totalBytesRead), result.value);
        }
      }
      if (!mayBeLess && totalBytesRead === 0 && this.endOfStream) {
        throw new EndOfStreamError;
      }
      return totalBytesRead;
    }
    abort() {
      this.interrupted = true;
      return this.reader.cancel();
    }
    async close() {
      await this.abort();
      this.reader.releaseLock();
    }
  };
});

// node_modules/strtok3/lib/stream/WebStreamReaderFactory.js
function makeWebStreamReader(stream) {
  try {
    const reader = stream.getReader({ mode: "byob" });
    if (reader instanceof ReadableStreamDefaultReader) {
      return new WebStreamDefaultReader(reader);
    }
    return new WebStreamByobReader(reader);
  } catch (error) {
    if (error instanceof TypeError) {
      return new WebStreamDefaultReader(stream.getReader());
    }
    throw error;
  }
}
var init_WebStreamReaderFactory = __esm(() => {
  init_WebStreamByobReader();
  init_WebStreamDefaultReader();
});

// node_modules/strtok3/lib/stream/index.js
var init_stream = __esm(() => {
  init_Errors();
  init_StreamReader();
  init_WebStreamByobReader();
  init_WebStreamDefaultReader();
  init_WebStreamReaderFactory();
});

// node_modules/strtok3/lib/AbstractTokenizer.js
class AbstractTokenizer {
  constructor(options) {
    this.numBuffer = new Uint8Array(8);
    this.position = 0;
    this.onClose = options?.onClose;
    if (options?.abortSignal) {
      options.abortSignal.addEventListener("abort", () => {
        this.abort();
      });
    }
  }
  async readToken(token, position = this.position) {
    const uint8Array = new Uint8Array(token.len);
    const len = await this.readBuffer(uint8Array, { position });
    if (len < token.len)
      throw new EndOfStreamError;
    return token.get(uint8Array, 0);
  }
  async peekToken(token, position = this.position) {
    const uint8Array = new Uint8Array(token.len);
    const len = await this.peekBuffer(uint8Array, { position });
    if (len < token.len)
      throw new EndOfStreamError;
    return token.get(uint8Array, 0);
  }
  async readNumber(token) {
    const len = await this.readBuffer(this.numBuffer, { length: token.len });
    if (len < token.len)
      throw new EndOfStreamError;
    return token.get(this.numBuffer, 0);
  }
  async peekNumber(token) {
    const len = await this.peekBuffer(this.numBuffer, { length: token.len });
    if (len < token.len)
      throw new EndOfStreamError;
    return token.get(this.numBuffer, 0);
  }
  async ignore(length) {
    if (this.fileInfo.size !== undefined) {
      const bytesLeft = this.fileInfo.size - this.position;
      if (length > bytesLeft) {
        this.position += bytesLeft;
        return bytesLeft;
      }
    }
    this.position += length;
    return length;
  }
  async close() {
    await this.abort();
    await this.onClose?.();
  }
  normalizeOptions(uint8Array, options) {
    if (!this.supportsRandomAccess() && options && options.position !== undefined && options.position < this.position) {
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    }
    return {
      ...{
        mayBeLess: false,
        offset: 0,
        length: uint8Array.length,
        position: this.position
      },
      ...options
    };
  }
  abort() {
    return Promise.resolve();
  }
}
var init_AbstractTokenizer = __esm(() => {
  init_stream();
});

// node_modules/strtok3/lib/ReadStreamTokenizer.js
var maxBufferSize = 256000, ReadStreamTokenizer;
var init_ReadStreamTokenizer = __esm(() => {
  init_AbstractTokenizer();
  init_stream();
  ReadStreamTokenizer = class ReadStreamTokenizer extends AbstractTokenizer {
    constructor(streamReader, options) {
      super(options);
      this.streamReader = streamReader;
      this.fileInfo = options?.fileInfo ?? {};
    }
    async readBuffer(uint8Array, options) {
      const normOptions = this.normalizeOptions(uint8Array, options);
      const skipBytes = normOptions.position - this.position;
      if (skipBytes > 0) {
        await this.ignore(skipBytes);
        return this.readBuffer(uint8Array, options);
      }
      if (skipBytes < 0) {
        throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
      }
      if (normOptions.length === 0) {
        return 0;
      }
      const bytesRead = await this.streamReader.read(uint8Array.subarray(0, normOptions.length), normOptions.mayBeLess);
      this.position += bytesRead;
      if ((!options || !options.mayBeLess) && bytesRead < normOptions.length) {
        throw new EndOfStreamError;
      }
      return bytesRead;
    }
    async peekBuffer(uint8Array, options) {
      const normOptions = this.normalizeOptions(uint8Array, options);
      let bytesRead = 0;
      if (normOptions.position) {
        const skipBytes = normOptions.position - this.position;
        if (skipBytes > 0) {
          const skipBuffer = new Uint8Array(normOptions.length + skipBytes);
          bytesRead = await this.peekBuffer(skipBuffer, { mayBeLess: normOptions.mayBeLess });
          uint8Array.set(skipBuffer.subarray(skipBytes));
          return bytesRead - skipBytes;
        }
        if (skipBytes < 0) {
          throw new Error("Cannot peek from a negative offset in a stream");
        }
      }
      if (normOptions.length > 0) {
        try {
          bytesRead = await this.streamReader.peek(uint8Array.subarray(0, normOptions.length), normOptions.mayBeLess);
        } catch (err) {
          if (options?.mayBeLess && err instanceof EndOfStreamError) {
            return 0;
          }
          throw err;
        }
        if (!normOptions.mayBeLess && bytesRead < normOptions.length) {
          throw new EndOfStreamError;
        }
      }
      return bytesRead;
    }
    async ignore(length) {
      const bufSize = Math.min(maxBufferSize, length);
      const buf = new Uint8Array(bufSize);
      let totBytesRead = 0;
      while (totBytesRead < length) {
        const remaining = length - totBytesRead;
        const bytesRead = await this.readBuffer(buf, { length: Math.min(bufSize, remaining) });
        if (bytesRead < 0) {
          return bytesRead;
        }
        totBytesRead += bytesRead;
      }
      return totBytesRead;
    }
    abort() {
      return this.streamReader.abort();
    }
    async close() {
      return this.streamReader.close();
    }
    supportsRandomAccess() {
      return false;
    }
  };
});

// node_modules/strtok3/lib/BufferTokenizer.js
var BufferTokenizer;
var init_BufferTokenizer = __esm(() => {
  init_stream();
  init_AbstractTokenizer();
  BufferTokenizer = class BufferTokenizer extends AbstractTokenizer {
    constructor(uint8Array, options) {
      super(options);
      this.uint8Array = uint8Array;
      this.fileInfo = { ...options?.fileInfo ?? {}, ...{ size: uint8Array.length } };
    }
    async readBuffer(uint8Array, options) {
      if (options?.position) {
        this.position = options.position;
      }
      const bytesRead = await this.peekBuffer(uint8Array, options);
      this.position += bytesRead;
      return bytesRead;
    }
    async peekBuffer(uint8Array, options) {
      const normOptions = this.normalizeOptions(uint8Array, options);
      const bytes2read = Math.min(this.uint8Array.length - normOptions.position, normOptions.length);
      if (!normOptions.mayBeLess && bytes2read < normOptions.length) {
        throw new EndOfStreamError;
      }
      uint8Array.set(this.uint8Array.subarray(normOptions.position, normOptions.position + bytes2read));
      return bytes2read;
    }
    close() {
      return super.close();
    }
    supportsRandomAccess() {
      return true;
    }
    setPosition(position) {
      this.position = position;
    }
  };
});

// node_modules/strtok3/lib/BlobTokenizer.js
var BlobTokenizer;
var init_BlobTokenizer = __esm(() => {
  init_stream();
  init_AbstractTokenizer();
  BlobTokenizer = class BlobTokenizer extends AbstractTokenizer {
    constructor(blob, options) {
      super(options);
      this.blob = blob;
      this.fileInfo = { ...options?.fileInfo ?? {}, ...{ size: blob.size, mimeType: blob.type } };
    }
    async readBuffer(uint8Array, options) {
      if (options?.position) {
        this.position = options.position;
      }
      const bytesRead = await this.peekBuffer(uint8Array, options);
      this.position += bytesRead;
      return bytesRead;
    }
    async peekBuffer(buffer, options) {
      const normOptions = this.normalizeOptions(buffer, options);
      const bytes2read = Math.min(this.blob.size - normOptions.position, normOptions.length);
      if (!normOptions.mayBeLess && bytes2read < normOptions.length) {
        throw new EndOfStreamError;
      }
      const arrayBuffer = await this.blob.slice(normOptions.position, normOptions.position + bytes2read).arrayBuffer();
      buffer.set(new Uint8Array(arrayBuffer));
      return bytes2read;
    }
    close() {
      return super.close();
    }
    supportsRandomAccess() {
      return true;
    }
    setPosition(position) {
      this.position = position;
    }
  };
});

// node_modules/strtok3/lib/core.js
function fromStream(stream, options) {
  const streamReader = new StreamReader(stream);
  const _options = options ?? {};
  const chainedClose = _options.onClose;
  _options.onClose = async () => {
    await streamReader.close();
    if (chainedClose) {
      return chainedClose();
    }
  };
  return new ReadStreamTokenizer(streamReader, _options);
}
function fromWebStream(webStream, options) {
  const webStreamReader = makeWebStreamReader(webStream);
  const _options = options ?? {};
  const chainedClose = _options.onClose;
  _options.onClose = async () => {
    await webStreamReader.close();
    if (chainedClose) {
      return chainedClose();
    }
  };
  return new ReadStreamTokenizer(webStreamReader, _options);
}
function fromBuffer(uint8Array, options) {
  return new BufferTokenizer(uint8Array, options);
}
function fromBlob(blob, options) {
  return new BlobTokenizer(blob, options);
}
var init_core = __esm(() => {
  init_stream();
  init_ReadStreamTokenizer();
  init_BufferTokenizer();
  init_BlobTokenizer();
  init_stream();
  init_AbstractTokenizer();
});

// node_modules/strtok3/lib/FileTokenizer.js
import { open as fsOpen } from "fs/promises";
var FileTokenizer;
var init_FileTokenizer = __esm(() => {
  init_AbstractTokenizer();
  init_stream();
  FileTokenizer = class FileTokenizer extends AbstractTokenizer {
    static async fromFile(sourceFilePath) {
      const fileHandle = await fsOpen(sourceFilePath, "r");
      const stat = await fileHandle.stat();
      return new FileTokenizer(fileHandle, { fileInfo: { path: sourceFilePath, size: stat.size } });
    }
    constructor(fileHandle, options) {
      super(options);
      this.fileHandle = fileHandle;
      this.fileInfo = options.fileInfo;
    }
    async readBuffer(uint8Array, options) {
      const normOptions = this.normalizeOptions(uint8Array, options);
      this.position = normOptions.position;
      if (normOptions.length === 0)
        return 0;
      const res = await this.fileHandle.read(uint8Array, 0, normOptions.length, normOptions.position);
      this.position += res.bytesRead;
      if (res.bytesRead < normOptions.length && (!options || !options.mayBeLess)) {
        throw new EndOfStreamError;
      }
      return res.bytesRead;
    }
    async peekBuffer(uint8Array, options) {
      const normOptions = this.normalizeOptions(uint8Array, options);
      const res = await this.fileHandle.read(uint8Array, 0, normOptions.length, normOptions.position);
      if (!normOptions.mayBeLess && res.bytesRead < normOptions.length) {
        throw new EndOfStreamError;
      }
      return res.bytesRead;
    }
    async close() {
      await this.fileHandle.close();
      return super.close();
    }
    setPosition(position) {
      this.position = position;
    }
    supportsRandomAccess() {
      return true;
    }
  };
});

// node_modules/strtok3/lib/index.js
import { stat as fsStat } from "fs/promises";
async function fromStream2(stream, options) {
  const rst = fromStream(stream, options);
  if (stream.path) {
    const stat = await fsStat(stream.path);
    rst.fileInfo.path = stream.path;
    rst.fileInfo.size = stat.size;
  }
  return rst;
}
var fromFile;
var init_lib = __esm(() => {
  init_core();
  init_FileTokenizer();
  init_FileTokenizer();
  init_core();
  fromFile = FileTokenizer.fromFile;
});

// node_modules/ieee754/index.js
var init_ieee754 = __esm(() => {
  /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
});

// node_modules/@borewit/text-codec/lib/index.js
function utf8Decoder() {
  if (typeof globalThis.TextDecoder === "undefined")
    return;
  return _utf8Decoder !== null && _utf8Decoder !== undefined ? _utf8Decoder : _utf8Decoder = new globalThis.TextDecoder("utf-8");
}
function textDecode(bytes, encoding = "utf-8") {
  switch (encoding.toLowerCase()) {
    case "utf-8":
    case "utf8": {
      const dec = utf8Decoder();
      return dec ? dec.decode(bytes) : decodeUTF8(bytes);
    }
    case "utf-16le":
      return decodeUTF16LE(bytes);
    case "us-ascii":
    case "ascii":
      return decodeASCII(bytes);
    case "latin1":
    case "iso-8859-1":
      return decodeLatin1(bytes);
    case "windows-1252":
      return decodeWindows1252(bytes);
    default:
      throw new RangeError(`Encoding '${encoding}' not supported`);
  }
}
function decodeUTF8(bytes) {
  const parts = [];
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 128) {
      out += String.fromCharCode(b1);
    } else if (b1 < 224) {
      const b2 = bytes[i++] & 63;
      out += String.fromCharCode((b1 & 31) << 6 | b2);
    } else if (b1 < 240) {
      const b2 = bytes[i++] & 63;
      const b3 = bytes[i++] & 63;
      out += String.fromCharCode((b1 & 15) << 12 | b2 << 6 | b3);
    } else {
      const b2 = bytes[i++] & 63;
      const b3 = bytes[i++] & 63;
      const b4 = bytes[i++] & 63;
      let cp = (b1 & 7) << 18 | b2 << 12 | b3 << 6 | b4;
      cp -= 65536;
      out += String.fromCharCode(55296 + (cp >> 10 & 1023), 56320 + (cp & 1023));
    }
    if (out.length >= CHUNK) {
      parts.push(out);
      out = "";
    }
  }
  if (out)
    parts.push(out);
  return parts.join("");
}
function decodeUTF16LE(bytes) {
  const len = bytes.length & ~1;
  if (len === 0)
    return "";
  const parts = [];
  const maxUnits = CHUNK;
  for (let i = 0;i < len; ) {
    const unitsThis = Math.min(maxUnits, len - i >> 1);
    const units = new Array(unitsThis);
    for (let j = 0;j < unitsThis; j++, i += 2) {
      units[j] = bytes[i] | bytes[i + 1] << 8;
    }
    parts.push(String.fromCharCode.apply(null, units));
  }
  return parts.join("");
}
function decodeASCII(bytes) {
  const parts = [];
  for (let i = 0;i < bytes.length; i += CHUNK) {
    const end = Math.min(bytes.length, i + CHUNK);
    const codes = new Array(end - i);
    for (let j = i, k = 0;j < end; j++, k++) {
      codes[k] = bytes[j] & 127;
    }
    parts.push(String.fromCharCode.apply(null, codes));
  }
  return parts.join("");
}
function decodeLatin1(bytes) {
  const parts = [];
  for (let i = 0;i < bytes.length; i += CHUNK) {
    const end = Math.min(bytes.length, i + CHUNK);
    const codes = new Array(end - i);
    for (let j = i, k = 0;j < end; j++, k++) {
      codes[k] = bytes[j];
    }
    parts.push(String.fromCharCode.apply(null, codes));
  }
  return parts.join("");
}
function decodeWindows1252(bytes) {
  const parts = [];
  let out = "";
  for (let i = 0;i < bytes.length; i++) {
    const b = bytes[i];
    const extra = b >= 128 && b <= 159 ? WINDOWS_1252_EXTRA[b] : undefined;
    out += extra !== null && extra !== undefined ? extra : String.fromCharCode(b);
    if (out.length >= CHUNK) {
      parts.push(out);
      out = "";
    }
  }
  if (out)
    parts.push(out);
  return parts.join("");
}
var WINDOWS_1252_EXTRA, WINDOWS_1252_REVERSE, _utf8Decoder, CHUNK;
var init_lib2 = __esm(() => {
  WINDOWS_1252_EXTRA = {
    128: "\u20AC",
    130: "\u201A",
    131: "\u0192",
    132: "\u201E",
    133: "\u2026",
    134: "\u2020",
    135: "\u2021",
    136: "\u02C6",
    137: "\u2030",
    138: "\u0160",
    139: "\u2039",
    140: "\u0152",
    142: "\u017D",
    145: "\u2018",
    146: "\u2019",
    147: "\u201C",
    148: "\u201D",
    149: "\u2022",
    150: "\u2013",
    151: "\u2014",
    152: "\u02DC",
    153: "\u2122",
    154: "\u0161",
    155: "\u203A",
    156: "\u0153",
    158: "\u017E",
    159: "\u0178"
  };
  WINDOWS_1252_REVERSE = {};
  for (const [code, char] of Object.entries(WINDOWS_1252_EXTRA)) {
    WINDOWS_1252_REVERSE[char] = Number.parseInt(code, 10);
  }
  CHUNK = 32 * 1024;
});

// node_modules/token-types/lib/index.js
function dv(array) {
  return new DataView(array.buffer, array.byteOffset);
}

class StringType2 {
  constructor(len, encoding) {
    this.len = len;
    this.encoding = encoding;
  }
  get(data, offset = 0) {
    const bytes = data.subarray(offset, offset + this.len);
    return textDecode(bytes, this.encoding);
  }
}
var UINT8, UINT16_LE, UINT16_BE, UINT32_LE, UINT32_BE, INT32_BE, UINT64_LE;
var init_lib3 = __esm(() => {
  init_ieee754();
  init_lib2();
  UINT8 = {
    len: 1,
    get(array, offset) {
      return dv(array).getUint8(offset);
    },
    put(array, offset, value) {
      dv(array).setUint8(offset, value);
      return offset + 1;
    }
  };
  UINT16_LE = {
    len: 2,
    get(array, offset) {
      return dv(array).getUint16(offset, true);
    },
    put(array, offset, value) {
      dv(array).setUint16(offset, value, true);
      return offset + 2;
    }
  };
  UINT16_BE = {
    len: 2,
    get(array, offset) {
      return dv(array).getUint16(offset);
    },
    put(array, offset, value) {
      dv(array).setUint16(offset, value);
      return offset + 2;
    }
  };
  UINT32_LE = {
    len: 4,
    get(array, offset) {
      return dv(array).getUint32(offset, true);
    },
    put(array, offset, value) {
      dv(array).setUint32(offset, value, true);
      return offset + 4;
    }
  };
  UINT32_BE = {
    len: 4,
    get(array, offset) {
      return dv(array).getUint32(offset);
    },
    put(array, offset, value) {
      dv(array).setUint32(offset, value);
      return offset + 4;
    }
  };
  INT32_BE = {
    len: 4,
    get(array, offset) {
      return dv(array).getInt32(offset);
    },
    put(array, offset, value) {
      dv(array).setInt32(offset, value);
      return offset + 4;
    }
  };
  UINT64_LE = {
    len: 8,
    get(array, offset) {
      return dv(array).getBigUint64(offset, true);
    },
    put(array, offset, value) {
      dv(array).setBigUint64(offset, value, true);
      return offset + 8;
    }
  };
});

// node_modules/ms/index.js
var require_ms = __commonJS((exports, module) => {
  var s = 1000;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  module.exports = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse2(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse2(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return;
    }
  }
  function fmtShort(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return Math.round(ms / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms / s) + "s";
    }
    return ms + "ms";
  }
  function fmtLong(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return plural(ms, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms, msAbs, s, "second");
    }
    return ms + " ms";
  }
  function plural(ms, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS((exports, module) => {
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = require_ms();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash2 = 0;
      for (let i = 0;i < namespace.length; i++) {
        hash2 = (hash2 << 5) - hash2 + namespace.charCodeAt(i);
        hash2 |= 0;
      }
      return createDebug.colors[Math.abs(hash2) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self = debug;
        const curr = Number(new Date);
        const ms = curr - (prevTime || curr);
        self.diff = ms;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self, args);
        const logFn = self.log || createDebug.log;
        logFn.apply(self, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug);
      }
      return debug;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  module.exports = setup;
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS((exports, module) => {
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.storage = localstorage();
  exports.destroy = (() => {
    let warned = false;
    return () => {
      if (!warned) {
        warned = true;
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
    };
  })();
  exports.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33"
  ];
  function useColors() {
    if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
      return false;
    }
    let m;
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }
  function formatArgs(args) {
    args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
    if (!this.useColors) {
      return;
    }
    const c = "color: " + this.color;
    args.splice(1, 0, c, "color: inherit");
    let index = 0;
    let lastC = 0;
    args[0].replace(/%[a-zA-Z%]/g, (match) => {
      if (match === "%%") {
        return;
      }
      index++;
      if (match === "%c") {
        lastC = index;
      }
    });
    args.splice(lastC, 0, c);
  }
  exports.log = console.debug || console.log || (() => {});
  function save(namespaces) {
    try {
      if (namespaces) {
        exports.storage.setItem("debug", namespaces);
      } else {
        exports.storage.removeItem("debug");
      }
    } catch (error) {}
  }
  function load() {
    let r;
    try {
      r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
    } catch (error) {}
    if (!r && typeof process !== "undefined" && "env" in process) {
      r = process.env.DEBUG;
    }
    return r;
  }
  function localstorage() {
    try {
      return localStorage;
    } catch (error) {}
  }
  module.exports = require_common()(exports);
  var { formatters } = module.exports;
  formatters.j = function(v) {
    try {
      return JSON.stringify(v);
    } catch (error) {
      return "[UnexpectedJSONParseError]: " + error.message;
    }
  };
});

// node_modules/debug/src/node.js
var require_node = __commonJS((exports, module) => {
  var tty = __require("tty");
  var util = __require("util");
  exports.init = init;
  exports.log = log;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
  exports.colors = [6, 2, 3, 4, 5, 1];
  try {
    const supportsColor = (()=>{throw new Error("Cannot require module "+"supports-color");})();
    if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
      exports.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ];
    }
  } catch (error) {}
  exports.inspectOpts = Object.keys(process.env).filter((key) => {
    return /^debug_/i.test(key);
  }).reduce((obj, key) => {
    const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
      return k.toUpperCase();
    });
    let val = process.env[key];
    if (/^(yes|on|true|enabled)$/i.test(val)) {
      val = true;
    } else if (/^(no|off|false|disabled)$/i.test(val)) {
      val = false;
    } else if (val === "null") {
      val = null;
    } else {
      val = Number(val);
    }
    obj[prop] = val;
    return obj;
  }, {});
  function useColors() {
    return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
  }
  function formatArgs(args) {
    const { namespace: name, useColors: useColors2 } = this;
    if (useColors2) {
      const c = this.color;
      const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
      const prefix = `  ${colorCode};1m${name} \x1B[0m`;
      args[0] = prefix + args[0].split(`
`).join(`
` + prefix);
      args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
    } else {
      args[0] = getDate() + name + " " + args[0];
    }
  }
  function getDate() {
    if (exports.inspectOpts.hideDate) {
      return "";
    }
    return new Date().toISOString() + " ";
  }
  function log(...args) {
    return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + `
`);
  }
  function save(namespaces) {
    if (namespaces) {
      process.env.DEBUG = namespaces;
    } else {
      delete process.env.DEBUG;
    }
  }
  function load() {
    return process.env.DEBUG;
  }
  function init(debug) {
    debug.inspectOpts = {};
    const keys = Object.keys(exports.inspectOpts);
    for (let i = 0;i < keys.length; i++) {
      debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
    }
  }
  module.exports = require_common()(exports);
  var { formatters } = module.exports;
  formatters.o = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts).split(`
`).map((str) => str.trim()).join(" ");
  };
  formatters.O = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
});

// node_modules/debug/src/index.js
var require_src = __commonJS((exports, module) => {
  if (typeof process === "undefined" || process.type === "renderer" || false || process.__nwjs) {
    module.exports = require_browser();
  } else {
    module.exports = require_node();
  }
});

// node_modules/@tokenizer/inflate/lib/ZipToken.js
var Signature, DataDescriptor, LocalFileHeaderToken, EndOfCentralDirectoryRecordToken, FileHeader;
var init_ZipToken = __esm(() => {
  init_lib3();
  Signature = {
    LocalFileHeader: 67324752,
    DataDescriptor: 134695760,
    CentralFileHeader: 33639248,
    EndOfCentralDirectory: 101010256
  };
  DataDescriptor = {
    get(array) {
      return {
        signature: UINT32_LE.get(array, 0),
        compressedSize: UINT32_LE.get(array, 8),
        uncompressedSize: UINT32_LE.get(array, 12)
      };
    },
    len: 16
  };
  LocalFileHeaderToken = {
    get(array) {
      const flags = UINT16_LE.get(array, 6);
      return {
        signature: UINT32_LE.get(array, 0),
        minVersion: UINT16_LE.get(array, 4),
        dataDescriptor: !!(flags & 8),
        compressedMethod: UINT16_LE.get(array, 8),
        compressedSize: UINT32_LE.get(array, 18),
        uncompressedSize: UINT32_LE.get(array, 22),
        filenameLength: UINT16_LE.get(array, 26),
        extraFieldLength: UINT16_LE.get(array, 28),
        filename: null
      };
    },
    len: 30
  };
  EndOfCentralDirectoryRecordToken = {
    get(array) {
      return {
        signature: UINT32_LE.get(array, 0),
        nrOfThisDisk: UINT16_LE.get(array, 4),
        nrOfThisDiskWithTheStart: UINT16_LE.get(array, 6),
        nrOfEntriesOnThisDisk: UINT16_LE.get(array, 8),
        nrOfEntriesOfSize: UINT16_LE.get(array, 10),
        sizeOfCd: UINT32_LE.get(array, 12),
        offsetOfStartOfCd: UINT32_LE.get(array, 16),
        zipFileCommentLength: UINT16_LE.get(array, 20)
      };
    },
    len: 22
  };
  FileHeader = {
    get(array) {
      const flags = UINT16_LE.get(array, 8);
      return {
        signature: UINT32_LE.get(array, 0),
        minVersion: UINT16_LE.get(array, 6),
        dataDescriptor: !!(flags & 8),
        compressedMethod: UINT16_LE.get(array, 10),
        compressedSize: UINT32_LE.get(array, 20),
        uncompressedSize: UINT32_LE.get(array, 24),
        filenameLength: UINT16_LE.get(array, 28),
        extraFieldLength: UINT16_LE.get(array, 30),
        fileCommentLength: UINT16_LE.get(array, 32),
        relativeOffsetOfLocalHeader: UINT32_LE.get(array, 42),
        filename: null
      };
    },
    len: 46
  };
});

// node_modules/@tokenizer/inflate/lib/ZipHandler.js
function signatureToArray(signature) {
  const signatureBytes = new Uint8Array(UINT32_LE.len);
  UINT32_LE.put(signatureBytes, 0, signature);
  return signatureBytes;
}

class ZipHandler {
  constructor(tokenizer) {
    this.tokenizer = tokenizer;
    this.syncBuffer = new Uint8Array(syncBufferSize);
  }
  async isZip() {
    return await this.peekSignature() === Signature.LocalFileHeader;
  }
  peekSignature() {
    return this.tokenizer.peekToken(UINT32_LE);
  }
  async findEndOfCentralDirectoryLocator() {
    const randomReadTokenizer = this.tokenizer;
    const chunkLength = Math.min(16 * 1024, randomReadTokenizer.fileInfo.size);
    const buffer = this.syncBuffer.subarray(0, chunkLength);
    await this.tokenizer.readBuffer(buffer, { position: randomReadTokenizer.fileInfo.size - chunkLength });
    for (let i = buffer.length - 4;i >= 0; i--) {
      if (buffer[i] === eocdSignatureBytes[0] && buffer[i + 1] === eocdSignatureBytes[1] && buffer[i + 2] === eocdSignatureBytes[2] && buffer[i + 3] === eocdSignatureBytes[3]) {
        return randomReadTokenizer.fileInfo.size - chunkLength + i;
      }
    }
    return -1;
  }
  async readCentralDirectory() {
    if (!this.tokenizer.supportsRandomAccess()) {
      debug("Cannot reading central-directory without random-read support");
      return;
    }
    debug("Reading central-directory...");
    const pos = this.tokenizer.position;
    const offset = await this.findEndOfCentralDirectoryLocator();
    if (offset > 0) {
      debug("Central-directory 32-bit signature found");
      const eocdHeader = await this.tokenizer.readToken(EndOfCentralDirectoryRecordToken, offset);
      const files = [];
      this.tokenizer.setPosition(eocdHeader.offsetOfStartOfCd);
      for (let n = 0;n < eocdHeader.nrOfEntriesOfSize; ++n) {
        const entry = await this.tokenizer.readToken(FileHeader);
        if (entry.signature !== Signature.CentralFileHeader) {
          throw new Error("Expected Central-File-Header signature");
        }
        entry.filename = await this.tokenizer.readToken(new StringType2(entry.filenameLength, "utf-8"));
        await this.tokenizer.ignore(entry.extraFieldLength);
        await this.tokenizer.ignore(entry.fileCommentLength);
        files.push(entry);
        debug(`Add central-directory file-entry: n=${n + 1}/${files.length}: filename=${files[n].filename}`);
      }
      this.tokenizer.setPosition(pos);
      return files;
    }
    this.tokenizer.setPosition(pos);
  }
  async unzip(fileCb) {
    const entries = await this.readCentralDirectory();
    if (entries) {
      return this.iterateOverCentralDirectory(entries, fileCb);
    }
    let stop = false;
    do {
      const zipHeader = await this.readLocalFileHeader();
      if (!zipHeader)
        break;
      const next = fileCb(zipHeader);
      stop = !!next.stop;
      let fileData;
      await this.tokenizer.ignore(zipHeader.extraFieldLength);
      if (zipHeader.dataDescriptor && zipHeader.compressedSize === 0) {
        const chunks = [];
        let len = syncBufferSize;
        debug("Compressed-file-size unknown, scanning for next data-descriptor-signature....");
        let nextHeaderIndex = -1;
        while (nextHeaderIndex < 0 && len === syncBufferSize) {
          len = await this.tokenizer.peekBuffer(this.syncBuffer, { mayBeLess: true });
          nextHeaderIndex = indexOf(this.syncBuffer.subarray(0, len), ddSignatureArray);
          const size = nextHeaderIndex >= 0 ? nextHeaderIndex : len;
          if (next.handler) {
            const data = new Uint8Array(size);
            await this.tokenizer.readBuffer(data);
            chunks.push(data);
          } else {
            await this.tokenizer.ignore(size);
          }
        }
        debug(`Found data-descriptor-signature at pos=${this.tokenizer.position}`);
        if (next.handler) {
          await this.inflate(zipHeader, mergeArrays(chunks), next.handler);
        }
      } else {
        if (next.handler) {
          debug(`Reading compressed-file-data: ${zipHeader.compressedSize} bytes`);
          fileData = new Uint8Array(zipHeader.compressedSize);
          await this.tokenizer.readBuffer(fileData);
          await this.inflate(zipHeader, fileData, next.handler);
        } else {
          debug(`Ignoring compressed-file-data: ${zipHeader.compressedSize} bytes`);
          await this.tokenizer.ignore(zipHeader.compressedSize);
        }
      }
      debug(`Reading data-descriptor at pos=${this.tokenizer.position}`);
      if (zipHeader.dataDescriptor) {
        const dataDescriptor = await this.tokenizer.readToken(DataDescriptor);
        if (dataDescriptor.signature !== 134695760) {
          throw new Error(`Expected data-descriptor-signature at position ${this.tokenizer.position - DataDescriptor.len}`);
        }
      }
    } while (!stop);
  }
  async iterateOverCentralDirectory(entries, fileCb) {
    for (const fileHeader of entries) {
      const next = fileCb(fileHeader);
      if (next.handler) {
        this.tokenizer.setPosition(fileHeader.relativeOffsetOfLocalHeader);
        const zipHeader = await this.readLocalFileHeader();
        if (zipHeader) {
          await this.tokenizer.ignore(zipHeader.extraFieldLength);
          const fileData = new Uint8Array(fileHeader.compressedSize);
          await this.tokenizer.readBuffer(fileData);
          await this.inflate(zipHeader, fileData, next.handler);
        }
      }
      if (next.stop)
        break;
    }
  }
  async inflate(zipHeader, fileData, cb) {
    if (zipHeader.compressedMethod === 0) {
      return cb(fileData);
    }
    if (zipHeader.compressedMethod !== 8) {
      throw new Error(`Unsupported ZIP compression method: ${zipHeader.compressedMethod}`);
    }
    debug(`Decompress filename=${zipHeader.filename}, compressed-size=${fileData.length}`);
    const uncompressedData = await ZipHandler.decompressDeflateRaw(fileData);
    return cb(uncompressedData);
  }
  static async decompressDeflateRaw(data) {
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    });
    const ds = new DecompressionStream("deflate-raw");
    const output = input.pipeThrough(ds);
    try {
      const response = new Response(output);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (err) {
      const message = err instanceof Error ? `Failed to deflate ZIP entry: ${err.message}` : "Unknown decompression error in ZIP entry";
      throw new TypeError(message);
    }
  }
  async readLocalFileHeader() {
    const signature = await this.tokenizer.peekToken(UINT32_LE);
    if (signature === Signature.LocalFileHeader) {
      const header = await this.tokenizer.readToken(LocalFileHeaderToken);
      header.filename = await this.tokenizer.readToken(new StringType2(header.filenameLength, "utf-8"));
      return header;
    }
    if (signature === Signature.CentralFileHeader) {
      return false;
    }
    if (signature === 3759263696) {
      throw new Error("Encrypted ZIP");
    }
    throw new Error("Unexpected signature");
  }
}
function indexOf(buffer, portion) {
  const bufferLength = buffer.length;
  const portionLength = portion.length;
  if (portionLength > bufferLength)
    return -1;
  for (let i = 0;i <= bufferLength - portionLength; i++) {
    let found = true;
    for (let j = 0;j < portionLength; j++) {
      if (buffer[i + j] !== portion[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      return i;
    }
  }
  return -1;
}
function mergeArrays(chunks) {
  const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
  const mergedArray = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    mergedArray.set(chunk, offset);
    offset += chunk.length;
  }
  return mergedArray;
}
var import_debug, debug, syncBufferSize, ddSignatureArray, eocdSignatureBytes;
var init_ZipHandler = __esm(() => {
  init_lib3();
  import_debug = __toESM(require_src(), 1);
  init_ZipToken();
  debug = import_debug.default("tokenizer:inflate");
  syncBufferSize = 256 * 1024;
  ddSignatureArray = signatureToArray(Signature.DataDescriptor);
  eocdSignatureBytes = signatureToArray(Signature.EndOfCentralDirectory);
});

// node_modules/@tokenizer/inflate/lib/GzipHandler.js
class GzipHandler {
  constructor(tokenizer) {
    this.tokenizer = tokenizer;
  }
  inflate() {
    const tokenizer = this.tokenizer;
    return new ReadableStream({
      async pull(controller) {
        const buffer = new Uint8Array(1024);
        const size = await tokenizer.readBuffer(buffer, { mayBeLess: true });
        if (size === 0) {
          controller.close();
          return;
        }
        controller.enqueue(buffer.subarray(0, size));
      }
    }).pipeThrough(new DecompressionStream("gzip"));
  }
}

// node_modules/@tokenizer/inflate/lib/index.js
var init_lib4 = __esm(() => {
  init_ZipHandler();
});

// node_modules/uint8array-extras/index.js
function getUintBE(view) {
  const { byteLength } = view;
  if (byteLength === 6) {
    return view.getUint16(0) * 2 ** 32 + view.getUint32(2);
  }
  if (byteLength === 5) {
    return view.getUint8(0) * 2 ** 32 + view.getUint32(1);
  }
  if (byteLength === 4) {
    return view.getUint32(0);
  }
  if (byteLength === 3) {
    return view.getUint8(0) * 2 ** 16 + view.getUint16(1);
  }
  if (byteLength === 2) {
    return view.getUint16(0);
  }
  if (byteLength === 1) {
    return view.getUint8(0);
  }
}
var cachedDecoders, cachedEncoder, byteToHexLookupTable;
var init_uint8array_extras = __esm(() => {
  cachedDecoders = {
    utf8: new globalThis.TextDecoder("utf8")
  };
  cachedEncoder = new globalThis.TextEncoder;
  byteToHexLookupTable = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, "0"));
});

// node_modules/file-type/util.js
function stringToBytes(string, encoding) {
  if (encoding === "utf-16le") {
    const bytes = [];
    for (let index = 0;index < string.length; index++) {
      const code = string.charCodeAt(index);
      bytes.push(code & 255, code >> 8 & 255);
    }
    return bytes;
  }
  if (encoding === "utf-16be") {
    const bytes = [];
    for (let index = 0;index < string.length; index++) {
      const code = string.charCodeAt(index);
      bytes.push(code >> 8 & 255, code & 255);
    }
    return bytes;
  }
  return [...string].map((character) => character.charCodeAt(0));
}
function tarHeaderChecksumMatches(arrayBuffer, offset = 0) {
  const readSum = Number.parseInt(new StringType2(6).get(arrayBuffer, 148).replace(/\0.*$/, "").trim(), 8);
  if (Number.isNaN(readSum)) {
    return false;
  }
  let sum = 8 * 32;
  for (let index = offset;index < offset + 148; index++) {
    sum += arrayBuffer[index];
  }
  for (let index = offset + 156;index < offset + 512; index++) {
    sum += arrayBuffer[index];
  }
  return readSum === sum;
}
var uint32SyncSafeToken;
var init_util = __esm(() => {
  init_lib3();
  uint32SyncSafeToken = {
    get: (buffer, offset) => buffer[offset + 3] & 127 | buffer[offset + 2] << 7 | buffer[offset + 1] << 14 | buffer[offset] << 21,
    len: 4
  };
});

// node_modules/file-type/supported.js
var extensions, mimeTypes;
var init_supported = __esm(() => {
  extensions = [
    "jpg",
    "png",
    "apng",
    "gif",
    "webp",
    "flif",
    "xcf",
    "cr2",
    "cr3",
    "orf",
    "arw",
    "dng",
    "nef",
    "rw2",
    "raf",
    "tif",
    "bmp",
    "icns",
    "jxr",
    "psd",
    "indd",
    "zip",
    "tar",
    "rar",
    "gz",
    "bz2",
    "7z",
    "dmg",
    "mp4",
    "mid",
    "mkv",
    "webm",
    "mov",
    "avi",
    "mpg",
    "mp2",
    "mp3",
    "m4a",
    "oga",
    "ogg",
    "ogv",
    "opus",
    "flac",
    "wav",
    "spx",
    "amr",
    "pdf",
    "epub",
    "elf",
    "macho",
    "exe",
    "swf",
    "rtf",
    "wasm",
    "woff",
    "woff2",
    "eot",
    "ttf",
    "otf",
    "ttc",
    "ico",
    "flv",
    "ps",
    "xz",
    "sqlite",
    "nes",
    "crx",
    "xpi",
    "cab",
    "deb",
    "ar",
    "rpm",
    "Z",
    "lz",
    "cfb",
    "mxf",
    "mts",
    "blend",
    "bpg",
    "docx",
    "pptx",
    "xlsx",
    "3gp",
    "3g2",
    "j2c",
    "jp2",
    "jpm",
    "jpx",
    "mj2",
    "aif",
    "qcp",
    "odt",
    "ods",
    "odp",
    "xml",
    "mobi",
    "heic",
    "cur",
    "ktx",
    "ape",
    "wv",
    "dcm",
    "ics",
    "glb",
    "pcap",
    "dsf",
    "lnk",
    "alias",
    "voc",
    "ac3",
    "m4v",
    "m4p",
    "m4b",
    "f4v",
    "f4p",
    "f4b",
    "f4a",
    "mie",
    "asf",
    "ogm",
    "ogx",
    "mpc",
    "arrow",
    "shp",
    "aac",
    "mp1",
    "it",
    "s3m",
    "xm",
    "skp",
    "avif",
    "eps",
    "lzh",
    "pgp",
    "asar",
    "stl",
    "chm",
    "3mf",
    "zst",
    "jxl",
    "vcf",
    "jls",
    "pst",
    "dwg",
    "parquet",
    "class",
    "arj",
    "cpio",
    "ace",
    "avro",
    "icc",
    "fbx",
    "vsdx",
    "vtt",
    "apk",
    "drc",
    "lz4",
    "potx",
    "xltx",
    "dotx",
    "xltm",
    "ott",
    "ots",
    "otp",
    "odg",
    "otg",
    "xlsm",
    "docm",
    "dotm",
    "potm",
    "pptm",
    "jar",
    "jmp",
    "rm",
    "sav",
    "ppsm",
    "ppsx",
    "tar.gz",
    "reg",
    "dat"
  ];
  mimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/flif",
    "image/x-xcf",
    "image/x-canon-cr2",
    "image/x-canon-cr3",
    "image/tiff",
    "image/bmp",
    "image/vnd.ms-photo",
    "image/vnd.adobe.photoshop",
    "application/x-indesign",
    "application/epub+zip",
    "application/x-xpinstall",
    "application/vnd.ms-powerpoint.slideshow.macroenabled.12",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    "application/zip",
    "application/x-tar",
    "application/x-rar-compressed",
    "application/gzip",
    "application/x-bzip2",
    "application/x-7z-compressed",
    "application/x-apple-diskimage",
    "application/vnd.apache.arrow.file",
    "video/mp4",
    "audio/midi",
    "video/matroska",
    "video/webm",
    "video/quicktime",
    "video/vnd.avi",
    "audio/wav",
    "audio/qcelp",
    "audio/x-ms-asf",
    "video/x-ms-asf",
    "application/vnd.ms-asf",
    "video/mpeg",
    "video/3gpp",
    "audio/mpeg",
    "audio/mp4",
    "video/ogg",
    "audio/ogg",
    "audio/ogg; codecs=opus",
    "application/ogg",
    "audio/flac",
    "audio/ape",
    "audio/wavpack",
    "audio/amr",
    "application/pdf",
    "application/x-elf",
    "application/x-mach-binary",
    "application/x-msdownload",
    "application/x-shockwave-flash",
    "application/rtf",
    "application/wasm",
    "font/woff",
    "font/woff2",
    "application/vnd.ms-fontobject",
    "font/ttf",
    "font/otf",
    "font/collection",
    "image/x-icon",
    "video/x-flv",
    "application/postscript",
    "application/eps",
    "application/x-xz",
    "application/x-sqlite3",
    "application/x-nintendo-nes-rom",
    "application/x-google-chrome-extension",
    "application/vnd.ms-cab-compressed",
    "application/x-deb",
    "application/x-unix-archive",
    "application/x-rpm",
    "application/x-compress",
    "application/x-lzip",
    "application/x-cfb",
    "application/x-mie",
    "application/mxf",
    "video/mp2t",
    "application/x-blender",
    "image/bpg",
    "image/j2c",
    "image/jp2",
    "image/jpx",
    "image/jpm",
    "image/mj2",
    "audio/aiff",
    "application/xml",
    "application/x-mobipocket-ebook",
    "image/heif",
    "image/heif-sequence",
    "image/heic",
    "image/heic-sequence",
    "image/icns",
    "image/ktx",
    "application/dicom",
    "audio/x-musepack",
    "text/calendar",
    "text/vcard",
    "text/vtt",
    "model/gltf-binary",
    "application/vnd.tcpdump.pcap",
    "audio/x-dsf",
    "application/x.ms.shortcut",
    "application/x.apple.alias",
    "audio/x-voc",
    "audio/vnd.dolby.dd-raw",
    "audio/x-m4a",
    "image/apng",
    "image/x-olympus-orf",
    "image/x-sony-arw",
    "image/x-adobe-dng",
    "image/x-nikon-nef",
    "image/x-panasonic-rw2",
    "image/x-fujifilm-raf",
    "video/x-m4v",
    "video/3gpp2",
    "application/x-esri-shape",
    "audio/aac",
    "audio/x-it",
    "audio/x-s3m",
    "audio/x-xm",
    "video/MP1S",
    "video/MP2P",
    "application/vnd.sketchup.skp",
    "image/avif",
    "application/x-lzh-compressed",
    "application/pgp-encrypted",
    "application/x-asar",
    "model/stl",
    "application/vnd.ms-htmlhelp",
    "model/3mf",
    "image/jxl",
    "application/zstd",
    "image/jls",
    "application/vnd.ms-outlook",
    "image/vnd.dwg",
    "application/vnd.apache.parquet",
    "application/java-vm",
    "application/x-arj",
    "application/x-cpio",
    "application/x-ace-compressed",
    "application/avro",
    "application/vnd.iccprofile",
    "application/x.autodesk.fbx",
    "application/vnd.visio",
    "application/vnd.android.package-archive",
    "application/vnd.google.draco",
    "application/x-lz4",
    "application/vnd.openxmlformats-officedocument.presentationml.template",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    "application/vnd.ms-excel.template.macroenabled.12",
    "application/vnd.oasis.opendocument.text-template",
    "application/vnd.oasis.opendocument.spreadsheet-template",
    "application/vnd.oasis.opendocument.presentation-template",
    "application/vnd.oasis.opendocument.graphics",
    "application/vnd.oasis.opendocument.graphics-template",
    "application/vnd.ms-excel.sheet.macroenabled.12",
    "application/vnd.ms-word.document.macroenabled.12",
    "application/vnd.ms-word.template.macroenabled.12",
    "application/vnd.ms-powerpoint.template.macroenabled.12",
    "application/vnd.ms-powerpoint.presentation.macroenabled.12",
    "application/java-archive",
    "application/vnd.rn-realmedia",
    "application/x-spss-sav",
    "application/x-ms-regedit",
    "application/x-ft-windows-registry-hive",
    "application/x-jmp-data"
  ];
});

// node_modules/file-type/core.js
async function fileTypeFromBuffer(input, options) {
  return new FileTypeParser(options).fromBuffer(input);
}
async function fileTypeFromBlob(blob, options) {
  return new FileTypeParser(options).fromBlob(blob);
}
function getFileTypeFromMimeType(mimeType) {
  mimeType = mimeType.toLowerCase();
  switch (mimeType) {
    case "application/epub+zip":
      return {
        ext: "epub",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.text":
      return {
        ext: "odt",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.text-template":
      return {
        ext: "ott",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.spreadsheet":
      return {
        ext: "ods",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.spreadsheet-template":
      return {
        ext: "ots",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.presentation":
      return {
        ext: "odp",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.presentation-template":
      return {
        ext: "otp",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.graphics":
      return {
        ext: "odg",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.graphics-template":
      return {
        ext: "otg",
        mime: mimeType
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.slideshow":
      return {
        ext: "ppsx",
        mime: mimeType
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return {
        ext: "xlsx",
        mime: mimeType
      };
    case "application/vnd.ms-excel.sheet.macroenabled":
      return {
        ext: "xlsm",
        mime: "application/vnd.ms-excel.sheet.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.template":
      return {
        ext: "xltx",
        mime: mimeType
      };
    case "application/vnd.ms-excel.template.macroenabled":
      return {
        ext: "xltm",
        mime: "application/vnd.ms-excel.template.macroenabled.12"
      };
    case "application/vnd.ms-powerpoint.slideshow.macroenabled":
      return {
        ext: "ppsm",
        mime: "application/vnd.ms-powerpoint.slideshow.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return {
        ext: "docx",
        mime: mimeType
      };
    case "application/vnd.ms-word.document.macroenabled":
      return {
        ext: "docm",
        mime: "application/vnd.ms-word.document.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.template":
      return {
        ext: "dotx",
        mime: mimeType
      };
    case "application/vnd.ms-word.template.macroenabledtemplate":
      return {
        ext: "dotm",
        mime: "application/vnd.ms-word.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.template":
      return {
        ext: "potx",
        mime: mimeType
      };
    case "application/vnd.ms-powerpoint.template.macroenabled":
      return {
        ext: "potm",
        mime: "application/vnd.ms-powerpoint.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return {
        ext: "pptx",
        mime: mimeType
      };
    case "application/vnd.ms-powerpoint.presentation.macroenabled":
      return {
        ext: "pptm",
        mime: "application/vnd.ms-powerpoint.presentation.macroenabled.12"
      };
    case "application/vnd.ms-visio.drawing":
      return {
        ext: "vsdx",
        mime: "application/vnd.visio"
      };
    case "application/vnd.ms-package.3dmanufacturing-3dmodel+xml":
      return {
        ext: "3mf",
        mime: "model/3mf"
      };
    default:
  }
}
function _check(buffer, headers, options) {
  options = {
    offset: 0,
    ...options
  };
  for (const [index, header] of headers.entries()) {
    if (options.mask) {
      if (header !== (options.mask[index] & buffer[index + options.offset])) {
        return false;
      }
    } else if (header !== buffer[index + options.offset]) {
      return false;
    }
  }
  return true;
}
async function fileTypeFromTokenizer(tokenizer, options) {
  return new FileTypeParser(options).fromTokenizer(tokenizer);
}

class FileTypeParser {
  constructor(options) {
    this.options = {
      mpegOffsetTolerance: 0,
      ...options
    };
    this.detectors = [
      ...options?.customDetectors ?? [],
      { id: "core", detect: this.detectConfident },
      { id: "core.imprecise", detect: this.detectImprecise }
    ];
    this.tokenizerOptions = {
      abortSignal: options?.signal
    };
  }
  async fromTokenizer(tokenizer) {
    const initialPosition = tokenizer.position;
    for (const detector of this.detectors) {
      const fileType = await detector.detect(tokenizer);
      if (fileType) {
        return fileType;
      }
      if (initialPosition !== tokenizer.position) {
        return;
      }
    }
  }
  async fromBuffer(input) {
    if (!(input instanceof Uint8Array || input instanceof ArrayBuffer)) {
      throw new TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof input}\``);
    }
    const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (!(buffer?.length > 1)) {
      return;
    }
    return this.fromTokenizer(fromBuffer(buffer, this.tokenizerOptions));
  }
  async fromBlob(blob) {
    const tokenizer = fromBlob(blob, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(tokenizer);
    } finally {
      await tokenizer.close();
    }
  }
  async fromStream(stream) {
    const tokenizer = fromWebStream(stream, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(tokenizer);
    } finally {
      await tokenizer.close();
    }
  }
  async toDetectionStream(stream, options) {
    const { sampleSize = reasonableDetectionSizeInBytes } = options;
    let detectedFileType;
    let firstChunk;
    const reader = stream.getReader({ mode: "byob" });
    try {
      const { value: chunk, done } = await reader.read(new Uint8Array(sampleSize));
      firstChunk = chunk;
      if (!done && chunk) {
        try {
          detectedFileType = await this.fromBuffer(chunk.subarray(0, sampleSize));
        } catch (error) {
          if (!(error instanceof EndOfStreamError)) {
            throw error;
          }
          detectedFileType = undefined;
        }
      }
      firstChunk = chunk;
    } finally {
      reader.releaseLock();
    }
    const transformStream = new TransformStream({
      async start(controller) {
        controller.enqueue(firstChunk);
      },
      transform(chunk, controller) {
        controller.enqueue(chunk);
      }
    });
    const newStream = stream.pipeThrough(transformStream);
    newStream.fileType = detectedFileType;
    return newStream;
  }
  check(header, options) {
    return _check(this.buffer, header, options);
  }
  checkString(header, options) {
    return this.check(stringToBytes(header, options?.encoding), options);
  }
  detectConfident = async (tokenizer) => {
    this.buffer = new Uint8Array(reasonableDetectionSizeInBytes);
    if (tokenizer.fileInfo.size === undefined) {
      tokenizer.fileInfo.size = Number.MAX_SAFE_INTEGER;
    }
    this.tokenizer = tokenizer;
    await tokenizer.peekBuffer(this.buffer, { length: 32, mayBeLess: true });
    if (this.check([66, 77])) {
      return {
        ext: "bmp",
        mime: "image/bmp"
      };
    }
    if (this.check([11, 119])) {
      return {
        ext: "ac3",
        mime: "audio/vnd.dolby.dd-raw"
      };
    }
    if (this.check([120, 1])) {
      return {
        ext: "dmg",
        mime: "application/x-apple-diskimage"
      };
    }
    if (this.check([77, 90])) {
      return {
        ext: "exe",
        mime: "application/x-msdownload"
      };
    }
    if (this.check([37, 33])) {
      await tokenizer.peekBuffer(this.buffer, { length: 24, mayBeLess: true });
      if (this.checkString("PS-Adobe-", { offset: 2 }) && this.checkString(" EPSF-", { offset: 14 })) {
        return {
          ext: "eps",
          mime: "application/eps"
        };
      }
      return {
        ext: "ps",
        mime: "application/postscript"
      };
    }
    if (this.check([31, 160]) || this.check([31, 157])) {
      return {
        ext: "Z",
        mime: "application/x-compress"
      };
    }
    if (this.check([199, 113])) {
      return {
        ext: "cpio",
        mime: "application/x-cpio"
      };
    }
    if (this.check([96, 234])) {
      return {
        ext: "arj",
        mime: "application/x-arj"
      };
    }
    if (this.check([239, 187, 191])) {
      this.tokenizer.ignore(3);
      return this.detectConfident(tokenizer);
    }
    if (this.check([71, 73, 70])) {
      return {
        ext: "gif",
        mime: "image/gif"
      };
    }
    if (this.check([73, 73, 188])) {
      return {
        ext: "jxr",
        mime: "image/vnd.ms-photo"
      };
    }
    if (this.check([31, 139, 8])) {
      const gzipHandler = new GzipHandler(tokenizer);
      const stream = gzipHandler.inflate();
      let shouldCancelStream = true;
      try {
        let compressedFileType;
        try {
          compressedFileType = await this.fromStream(stream);
        } catch {
          shouldCancelStream = false;
        }
        if (compressedFileType && compressedFileType.ext === "tar") {
          return {
            ext: "tar.gz",
            mime: "application/gzip"
          };
        }
      } finally {
        if (shouldCancelStream) {
          await stream.cancel();
        }
      }
      return {
        ext: "gz",
        mime: "application/gzip"
      };
    }
    if (this.check([66, 90, 104])) {
      return {
        ext: "bz2",
        mime: "application/x-bzip2"
      };
    }
    if (this.checkString("ID3")) {
      await tokenizer.ignore(6);
      const id3HeaderLength = await tokenizer.readToken(uint32SyncSafeToken);
      if (tokenizer.position + id3HeaderLength > tokenizer.fileInfo.size) {
        return {
          ext: "mp3",
          mime: "audio/mpeg"
        };
      }
      await tokenizer.ignore(id3HeaderLength);
      return this.fromTokenizer(tokenizer);
    }
    if (this.checkString("MP+")) {
      return {
        ext: "mpc",
        mime: "audio/x-musepack"
      };
    }
    if ((this.buffer[0] === 67 || this.buffer[0] === 70) && this.check([87, 83], { offset: 1 })) {
      return {
        ext: "swf",
        mime: "application/x-shockwave-flash"
      };
    }
    if (this.check([255, 216, 255])) {
      if (this.check([247], { offset: 3 })) {
        return {
          ext: "jls",
          mime: "image/jls"
        };
      }
      return {
        ext: "jpg",
        mime: "image/jpeg"
      };
    }
    if (this.check([79, 98, 106, 1])) {
      return {
        ext: "avro",
        mime: "application/avro"
      };
    }
    if (this.checkString("FLIF")) {
      return {
        ext: "flif",
        mime: "image/flif"
      };
    }
    if (this.checkString("8BPS")) {
      return {
        ext: "psd",
        mime: "image/vnd.adobe.photoshop"
      };
    }
    if (this.checkString("MPCK")) {
      return {
        ext: "mpc",
        mime: "audio/x-musepack"
      };
    }
    if (this.checkString("FORM")) {
      return {
        ext: "aif",
        mime: "audio/aiff"
      };
    }
    if (this.checkString("icns", { offset: 0 })) {
      return {
        ext: "icns",
        mime: "image/icns"
      };
    }
    if (this.check([80, 75, 3, 4])) {
      let fileType;
      await new ZipHandler(tokenizer).unzip((zipHeader) => {
        switch (zipHeader.filename) {
          case "META-INF/mozilla.rsa":
            fileType = {
              ext: "xpi",
              mime: "application/x-xpinstall"
            };
            return {
              stop: true
            };
          case "META-INF/MANIFEST.MF":
            fileType = {
              ext: "jar",
              mime: "application/java-archive"
            };
            return {
              stop: true
            };
          case "mimetype":
            return {
              async handler(fileData) {
                const mimeType = new TextDecoder("utf-8").decode(fileData).trim();
                fileType = getFileTypeFromMimeType(mimeType);
              },
              stop: true
            };
          case "[Content_Types].xml":
            return {
              async handler(fileData) {
                let xmlContent = new TextDecoder("utf-8").decode(fileData);
                const endPos = xmlContent.indexOf('.main+xml"');
                if (endPos === -1) {
                  const mimeType = "application/vnd.ms-package.3dmanufacturing-3dmodel+xml";
                  if (xmlContent.includes(`ContentType="${mimeType}"`)) {
                    fileType = getFileTypeFromMimeType(mimeType);
                  }
                } else {
                  xmlContent = xmlContent.slice(0, Math.max(0, endPos));
                  const firstPos = xmlContent.lastIndexOf('"');
                  const mimeType = xmlContent.slice(Math.max(0, firstPos + 1));
                  fileType = getFileTypeFromMimeType(mimeType);
                }
              },
              stop: true
            };
          default:
            if (/classes\d*\.dex/.test(zipHeader.filename)) {
              fileType = {
                ext: "apk",
                mime: "application/vnd.android.package-archive"
              };
              return { stop: true };
            }
            return {};
        }
      }).catch((error) => {
        if (!(error instanceof EndOfStreamError)) {
          throw error;
        }
      });
      return fileType ?? {
        ext: "zip",
        mime: "application/zip"
      };
    }
    if (this.checkString("OggS")) {
      await tokenizer.ignore(28);
      const type = new Uint8Array(8);
      await tokenizer.readBuffer(type);
      if (_check(type, [79, 112, 117, 115, 72, 101, 97, 100])) {
        return {
          ext: "opus",
          mime: "audio/ogg; codecs=opus"
        };
      }
      if (_check(type, [128, 116, 104, 101, 111, 114, 97])) {
        return {
          ext: "ogv",
          mime: "video/ogg"
        };
      }
      if (_check(type, [1, 118, 105, 100, 101, 111, 0])) {
        return {
          ext: "ogm",
          mime: "video/ogg"
        };
      }
      if (_check(type, [127, 70, 76, 65, 67])) {
        return {
          ext: "oga",
          mime: "audio/ogg"
        };
      }
      if (_check(type, [83, 112, 101, 101, 120, 32, 32])) {
        return {
          ext: "spx",
          mime: "audio/ogg"
        };
      }
      if (_check(type, [1, 118, 111, 114, 98, 105, 115])) {
        return {
          ext: "ogg",
          mime: "audio/ogg"
        };
      }
      return {
        ext: "ogx",
        mime: "application/ogg"
      };
    }
    if (this.check([80, 75]) && (this.buffer[2] === 3 || this.buffer[2] === 5 || this.buffer[2] === 7) && (this.buffer[3] === 4 || this.buffer[3] === 6 || this.buffer[3] === 8)) {
      return {
        ext: "zip",
        mime: "application/zip"
      };
    }
    if (this.checkString("MThd")) {
      return {
        ext: "mid",
        mime: "audio/midi"
      };
    }
    if (this.checkString("wOFF") && (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString("OTTO", { offset: 4 }))) {
      return {
        ext: "woff",
        mime: "font/woff"
      };
    }
    if (this.checkString("wOF2") && (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString("OTTO", { offset: 4 }))) {
      return {
        ext: "woff2",
        mime: "font/woff2"
      };
    }
    if (this.check([212, 195, 178, 161]) || this.check([161, 178, 195, 212])) {
      return {
        ext: "pcap",
        mime: "application/vnd.tcpdump.pcap"
      };
    }
    if (this.checkString("DSD ")) {
      return {
        ext: "dsf",
        mime: "audio/x-dsf"
      };
    }
    if (this.checkString("LZIP")) {
      return {
        ext: "lz",
        mime: "application/x-lzip"
      };
    }
    if (this.checkString("fLaC")) {
      return {
        ext: "flac",
        mime: "audio/flac"
      };
    }
    if (this.check([66, 80, 71, 251])) {
      return {
        ext: "bpg",
        mime: "image/bpg"
      };
    }
    if (this.checkString("wvpk")) {
      return {
        ext: "wv",
        mime: "audio/wavpack"
      };
    }
    if (this.checkString("%PDF")) {
      return {
        ext: "pdf",
        mime: "application/pdf"
      };
    }
    if (this.check([0, 97, 115, 109])) {
      return {
        ext: "wasm",
        mime: "application/wasm"
      };
    }
    if (this.check([73, 73])) {
      const fileType = await this.readTiffHeader(false);
      if (fileType) {
        return fileType;
      }
    }
    if (this.check([77, 77])) {
      const fileType = await this.readTiffHeader(true);
      if (fileType) {
        return fileType;
      }
    }
    if (this.checkString("MAC ")) {
      return {
        ext: "ape",
        mime: "audio/ape"
      };
    }
    if (this.check([26, 69, 223, 163])) {
      async function readField() {
        const msb = await tokenizer.peekNumber(UINT8);
        let mask = 128;
        let ic = 0;
        while ((msb & mask) === 0 && mask !== 0) {
          ++ic;
          mask >>= 1;
        }
        const id = new Uint8Array(ic + 1);
        await tokenizer.readBuffer(id);
        return id;
      }
      async function readElement() {
        const idField = await readField();
        const lengthField = await readField();
        lengthField[0] ^= 128 >> lengthField.length - 1;
        const nrLength = Math.min(6, lengthField.length);
        const idView = new DataView(idField.buffer);
        const lengthView = new DataView(lengthField.buffer, lengthField.length - nrLength, nrLength);
        return {
          id: getUintBE(idView),
          len: getUintBE(lengthView)
        };
      }
      async function readChildren(children) {
        while (children > 0) {
          const element = await readElement();
          if (element.id === 17026) {
            const rawValue = await tokenizer.readToken(new StringType2(element.len));
            return rawValue.replaceAll(/\00.*$/g, "");
          }
          await tokenizer.ignore(element.len);
          --children;
        }
      }
      const re = await readElement();
      const documentType = await readChildren(re.len);
      switch (documentType) {
        case "webm":
          return {
            ext: "webm",
            mime: "video/webm"
          };
        case "matroska":
          return {
            ext: "mkv",
            mime: "video/matroska"
          };
        default:
          return;
      }
    }
    if (this.checkString("SQLi")) {
      return {
        ext: "sqlite",
        mime: "application/x-sqlite3"
      };
    }
    if (this.check([78, 69, 83, 26])) {
      return {
        ext: "nes",
        mime: "application/x-nintendo-nes-rom"
      };
    }
    if (this.checkString("Cr24")) {
      return {
        ext: "crx",
        mime: "application/x-google-chrome-extension"
      };
    }
    if (this.checkString("MSCF") || this.checkString("ISc(")) {
      return {
        ext: "cab",
        mime: "application/vnd.ms-cab-compressed"
      };
    }
    if (this.check([237, 171, 238, 219])) {
      return {
        ext: "rpm",
        mime: "application/x-rpm"
      };
    }
    if (this.check([197, 208, 211, 198])) {
      return {
        ext: "eps",
        mime: "application/eps"
      };
    }
    if (this.check([40, 181, 47, 253])) {
      return {
        ext: "zst",
        mime: "application/zstd"
      };
    }
    if (this.check([127, 69, 76, 70])) {
      return {
        ext: "elf",
        mime: "application/x-elf"
      };
    }
    if (this.check([33, 66, 68, 78])) {
      return {
        ext: "pst",
        mime: "application/vnd.ms-outlook"
      };
    }
    if (this.checkString("PAR1") || this.checkString("PARE")) {
      return {
        ext: "parquet",
        mime: "application/vnd.apache.parquet"
      };
    }
    if (this.checkString("ttcf")) {
      return {
        ext: "ttc",
        mime: "font/collection"
      };
    }
    if (this.check([254, 237, 250, 206]) || this.check([254, 237, 250, 207]) || this.check([206, 250, 237, 254]) || this.check([207, 250, 237, 254])) {
      return {
        ext: "macho",
        mime: "application/x-mach-binary"
      };
    }
    if (this.check([4, 34, 77, 24])) {
      return {
        ext: "lz4",
        mime: "application/x-lz4"
      };
    }
    if (this.checkString("regf")) {
      return {
        ext: "dat",
        mime: "application/x-ft-windows-registry-hive"
      };
    }
    if (this.checkString("$FL2") || this.checkString("$FL3")) {
      return {
        ext: "sav",
        mime: "application/x-spss-sav"
      };
    }
    if (this.check([79, 84, 84, 79, 0])) {
      return {
        ext: "otf",
        mime: "font/otf"
      };
    }
    if (this.checkString("#!AMR")) {
      return {
        ext: "amr",
        mime: "audio/amr"
      };
    }
    if (this.checkString("{\\rtf")) {
      return {
        ext: "rtf",
        mime: "application/rtf"
      };
    }
    if (this.check([70, 76, 86, 1])) {
      return {
        ext: "flv",
        mime: "video/x-flv"
      };
    }
    if (this.checkString("IMPM")) {
      return {
        ext: "it",
        mime: "audio/x-it"
      };
    }
    if (this.checkString("-lh0-", { offset: 2 }) || this.checkString("-lh1-", { offset: 2 }) || this.checkString("-lh2-", { offset: 2 }) || this.checkString("-lh3-", { offset: 2 }) || this.checkString("-lh4-", { offset: 2 }) || this.checkString("-lh5-", { offset: 2 }) || this.checkString("-lh6-", { offset: 2 }) || this.checkString("-lh7-", { offset: 2 }) || this.checkString("-lzs-", { offset: 2 }) || this.checkString("-lz4-", { offset: 2 }) || this.checkString("-lz5-", { offset: 2 }) || this.checkString("-lhd-", { offset: 2 })) {
      return {
        ext: "lzh",
        mime: "application/x-lzh-compressed"
      };
    }
    if (this.check([0, 0, 1, 186])) {
      if (this.check([33], { offset: 4, mask: [241] })) {
        return {
          ext: "mpg",
          mime: "video/MP1S"
        };
      }
      if (this.check([68], { offset: 4, mask: [196] })) {
        return {
          ext: "mpg",
          mime: "video/MP2P"
        };
      }
    }
    if (this.checkString("ITSF")) {
      return {
        ext: "chm",
        mime: "application/vnd.ms-htmlhelp"
      };
    }
    if (this.check([202, 254, 186, 190])) {
      const machOArchitectureCount = UINT32_BE.get(this.buffer, 4);
      const javaClassFileMajorVersion = UINT16_BE.get(this.buffer, 6);
      if (machOArchitectureCount > 0 && machOArchitectureCount <= 30) {
        return {
          ext: "macho",
          mime: "application/x-mach-binary"
        };
      }
      if (javaClassFileMajorVersion > 30) {
        return {
          ext: "class",
          mime: "application/java-vm"
        };
      }
    }
    if (this.checkString(".RMF")) {
      return {
        ext: "rm",
        mime: "application/vnd.rn-realmedia"
      };
    }
    if (this.checkString("DRACO")) {
      return {
        ext: "drc",
        mime: "application/vnd.google.draco"
      };
    }
    if (this.check([253, 55, 122, 88, 90, 0])) {
      return {
        ext: "xz",
        mime: "application/x-xz"
      };
    }
    if (this.checkString("<?xml ")) {
      return {
        ext: "xml",
        mime: "application/xml"
      };
    }
    if (this.check([55, 122, 188, 175, 39, 28])) {
      return {
        ext: "7z",
        mime: "application/x-7z-compressed"
      };
    }
    if (this.check([82, 97, 114, 33, 26, 7]) && (this.buffer[6] === 0 || this.buffer[6] === 1)) {
      return {
        ext: "rar",
        mime: "application/x-rar-compressed"
      };
    }
    if (this.checkString("solid ")) {
      return {
        ext: "stl",
        mime: "model/stl"
      };
    }
    if (this.checkString("AC")) {
      const version = new StringType2(4, "latin1").get(this.buffer, 2);
      if (version.match("^d*") && version >= 1000 && version <= 1050) {
        return {
          ext: "dwg",
          mime: "image/vnd.dwg"
        };
      }
    }
    if (this.checkString("070707")) {
      return {
        ext: "cpio",
        mime: "application/x-cpio"
      };
    }
    if (this.checkString("BLENDER")) {
      return {
        ext: "blend",
        mime: "application/x-blender"
      };
    }
    if (this.checkString("!<arch>")) {
      await tokenizer.ignore(8);
      const string = await tokenizer.readToken(new StringType2(13, "ascii"));
      if (string === "debian-binary") {
        return {
          ext: "deb",
          mime: "application/x-deb"
        };
      }
      return {
        ext: "ar",
        mime: "application/x-unix-archive"
      };
    }
    if (this.checkString("WEBVTT") && [`
`, "\r", "\t", " ", "\x00"].some((char7) => this.checkString(char7, { offset: 6 }))) {
      return {
        ext: "vtt",
        mime: "text/vtt"
      };
    }
    if (this.check([137, 80, 78, 71, 13, 10, 26, 10])) {
      await tokenizer.ignore(8);
      async function readChunkHeader() {
        return {
          length: await tokenizer.readToken(INT32_BE),
          type: await tokenizer.readToken(new StringType2(4, "latin1"))
        };
      }
      do {
        const chunk = await readChunkHeader();
        if (chunk.length < 0) {
          return;
        }
        switch (chunk.type) {
          case "IDAT":
            return {
              ext: "png",
              mime: "image/png"
            };
          case "acTL":
            return {
              ext: "apng",
              mime: "image/apng"
            };
          default:
            await tokenizer.ignore(chunk.length + 4);
        }
      } while (tokenizer.position + 8 < tokenizer.fileInfo.size);
      return {
        ext: "png",
        mime: "image/png"
      };
    }
    if (this.check([65, 82, 82, 79, 87, 49, 0, 0])) {
      return {
        ext: "arrow",
        mime: "application/vnd.apache.arrow.file"
      };
    }
    if (this.check([103, 108, 84, 70, 2, 0, 0, 0])) {
      return {
        ext: "glb",
        mime: "model/gltf-binary"
      };
    }
    if (this.check([102, 114, 101, 101], { offset: 4 }) || this.check([109, 100, 97, 116], { offset: 4 }) || this.check([109, 111, 111, 118], { offset: 4 }) || this.check([119, 105, 100, 101], { offset: 4 })) {
      return {
        ext: "mov",
        mime: "video/quicktime"
      };
    }
    if (this.check([73, 73, 82, 79, 8, 0, 0, 0, 24])) {
      return {
        ext: "orf",
        mime: "image/x-olympus-orf"
      };
    }
    if (this.checkString("gimp xcf ")) {
      return {
        ext: "xcf",
        mime: "image/x-xcf"
      };
    }
    if (this.checkString("ftyp", { offset: 4 }) && (this.buffer[8] & 96) !== 0) {
      const brandMajor = new StringType2(4, "latin1").get(this.buffer, 8).replace("\x00", " ").trim();
      switch (brandMajor) {
        case "avif":
        case "avis":
          return { ext: "avif", mime: "image/avif" };
        case "mif1":
          return { ext: "heic", mime: "image/heif" };
        case "msf1":
          return { ext: "heic", mime: "image/heif-sequence" };
        case "heic":
        case "heix":
          return { ext: "heic", mime: "image/heic" };
        case "hevc":
        case "hevx":
          return { ext: "heic", mime: "image/heic-sequence" };
        case "qt":
          return { ext: "mov", mime: "video/quicktime" };
        case "M4V":
        case "M4VH":
        case "M4VP":
          return { ext: "m4v", mime: "video/x-m4v" };
        case "M4P":
          return { ext: "m4p", mime: "video/mp4" };
        case "M4B":
          return { ext: "m4b", mime: "audio/mp4" };
        case "M4A":
          return { ext: "m4a", mime: "audio/x-m4a" };
        case "F4V":
          return { ext: "f4v", mime: "video/mp4" };
        case "F4P":
          return { ext: "f4p", mime: "video/mp4" };
        case "F4A":
          return { ext: "f4a", mime: "audio/mp4" };
        case "F4B":
          return { ext: "f4b", mime: "audio/mp4" };
        case "crx":
          return { ext: "cr3", mime: "image/x-canon-cr3" };
        default:
          if (brandMajor.startsWith("3g")) {
            if (brandMajor.startsWith("3g2")) {
              return { ext: "3g2", mime: "video/3gpp2" };
            }
            return { ext: "3gp", mime: "video/3gpp" };
          }
          return { ext: "mp4", mime: "video/mp4" };
      }
    }
    if (this.checkString(`REGEDIT4\r
`)) {
      return {
        ext: "reg",
        mime: "application/x-ms-regedit"
      };
    }
    if (this.check([82, 73, 70, 70])) {
      if (this.checkString("WEBP", { offset: 8 })) {
        return {
          ext: "webp",
          mime: "image/webp"
        };
      }
      if (this.check([65, 86, 73], { offset: 8 })) {
        return {
          ext: "avi",
          mime: "video/vnd.avi"
        };
      }
      if (this.check([87, 65, 86, 69], { offset: 8 })) {
        return {
          ext: "wav",
          mime: "audio/wav"
        };
      }
      if (this.check([81, 76, 67, 77], { offset: 8 })) {
        return {
          ext: "qcp",
          mime: "audio/qcelp"
        };
      }
    }
    if (this.check([73, 73, 85, 0, 24, 0, 0, 0, 136, 231, 116, 216])) {
      return {
        ext: "rw2",
        mime: "image/x-panasonic-rw2"
      };
    }
    if (this.check([48, 38, 178, 117, 142, 102, 207, 17, 166, 217])) {
      async function readHeader() {
        const guid = new Uint8Array(16);
        await tokenizer.readBuffer(guid);
        return {
          id: guid,
          size: Number(await tokenizer.readToken(UINT64_LE))
        };
      }
      await tokenizer.ignore(30);
      while (tokenizer.position + 24 < tokenizer.fileInfo.size) {
        const header = await readHeader();
        let payload = header.size - 24;
        if (_check(header.id, [145, 7, 220, 183, 183, 169, 207, 17, 142, 230, 0, 192, 12, 32, 83, 101])) {
          const typeId = new Uint8Array(16);
          payload -= await tokenizer.readBuffer(typeId);
          if (_check(typeId, [64, 158, 105, 248, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) {
            return {
              ext: "asf",
              mime: "audio/x-ms-asf"
            };
          }
          if (_check(typeId, [192, 239, 25, 188, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) {
            return {
              ext: "asf",
              mime: "video/x-ms-asf"
            };
          }
          break;
        }
        await tokenizer.ignore(payload);
      }
      return {
        ext: "asf",
        mime: "application/vnd.ms-asf"
      };
    }
    if (this.check([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10])) {
      return {
        ext: "ktx",
        mime: "image/ktx"
      };
    }
    if ((this.check([126, 16, 4]) || this.check([126, 24, 4])) && this.check([48, 77, 73, 69], { offset: 4 })) {
      return {
        ext: "mie",
        mime: "application/x-mie"
      };
    }
    if (this.check([39, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { offset: 2 })) {
      return {
        ext: "shp",
        mime: "application/x-esri-shape"
      };
    }
    if (this.check([255, 79, 255, 81])) {
      return {
        ext: "j2c",
        mime: "image/j2c"
      };
    }
    if (this.check([0, 0, 0, 12, 106, 80, 32, 32, 13, 10, 135, 10])) {
      await tokenizer.ignore(20);
      const type = await tokenizer.readToken(new StringType2(4, "ascii"));
      switch (type) {
        case "jp2 ":
          return {
            ext: "jp2",
            mime: "image/jp2"
          };
        case "jpx ":
          return {
            ext: "jpx",
            mime: "image/jpx"
          };
        case "jpm ":
          return {
            ext: "jpm",
            mime: "image/jpm"
          };
        case "mjp2":
          return {
            ext: "mj2",
            mime: "image/mj2"
          };
        default:
          return;
      }
    }
    if (this.check([255, 10]) || this.check([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10])) {
      return {
        ext: "jxl",
        mime: "image/jxl"
      };
    }
    if (this.check([254, 255])) {
      if (this.checkString("<?xml ", { offset: 2, encoding: "utf-16be" })) {
        return {
          ext: "xml",
          mime: "application/xml"
        };
      }
      return;
    }
    if (this.check([208, 207, 17, 224, 161, 177, 26, 225])) {
      return {
        ext: "cfb",
        mime: "application/x-cfb"
      };
    }
    await tokenizer.peekBuffer(this.buffer, { length: Math.min(256, tokenizer.fileInfo.size), mayBeLess: true });
    if (this.check([97, 99, 115, 112], { offset: 36 })) {
      return {
        ext: "icc",
        mime: "application/vnd.iccprofile"
      };
    }
    if (this.checkString("**ACE", { offset: 7 }) && this.checkString("**", { offset: 12 })) {
      return {
        ext: "ace",
        mime: "application/x-ace-compressed"
      };
    }
    if (this.checkString("BEGIN:")) {
      if (this.checkString("VCARD", { offset: 6 })) {
        return {
          ext: "vcf",
          mime: "text/vcard"
        };
      }
      if (this.checkString("VCALENDAR", { offset: 6 })) {
        return {
          ext: "ics",
          mime: "text/calendar"
        };
      }
    }
    if (this.checkString("FUJIFILMCCD-RAW")) {
      return {
        ext: "raf",
        mime: "image/x-fujifilm-raf"
      };
    }
    if (this.checkString("Extended Module:")) {
      return {
        ext: "xm",
        mime: "audio/x-xm"
      };
    }
    if (this.checkString("Creative Voice File")) {
      return {
        ext: "voc",
        mime: "audio/x-voc"
      };
    }
    if (this.check([4, 0, 0, 0]) && this.buffer.length >= 16) {
      const jsonSize = new DataView(this.buffer.buffer).getUint32(12, true);
      if (jsonSize > 12 && this.buffer.length >= jsonSize + 16) {
        try {
          const header = new TextDecoder().decode(this.buffer.subarray(16, jsonSize + 16));
          const json = JSON.parse(header);
          if (json.files) {
            return {
              ext: "asar",
              mime: "application/x-asar"
            };
          }
        } catch {}
      }
    }
    if (this.check([6, 14, 43, 52, 2, 5, 1, 1, 13, 1, 2, 1, 1, 2])) {
      return {
        ext: "mxf",
        mime: "application/mxf"
      };
    }
    if (this.checkString("SCRM", { offset: 44 })) {
      return {
        ext: "s3m",
        mime: "audio/x-s3m"
      };
    }
    if (this.check([71]) && this.check([71], { offset: 188 })) {
      return {
        ext: "mts",
        mime: "video/mp2t"
      };
    }
    if (this.check([71], { offset: 4 }) && this.check([71], { offset: 196 })) {
      return {
        ext: "mts",
        mime: "video/mp2t"
      };
    }
    if (this.check([66, 79, 79, 75, 77, 79, 66, 73], { offset: 60 })) {
      return {
        ext: "mobi",
        mime: "application/x-mobipocket-ebook"
      };
    }
    if (this.check([68, 73, 67, 77], { offset: 128 })) {
      return {
        ext: "dcm",
        mime: "application/dicom"
      };
    }
    if (this.check([76, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70])) {
      return {
        ext: "lnk",
        mime: "application/x.ms.shortcut"
      };
    }
    if (this.check([98, 111, 111, 107, 0, 0, 0, 0, 109, 97, 114, 107, 0, 0, 0, 0])) {
      return {
        ext: "alias",
        mime: "application/x.apple.alias"
      };
    }
    if (this.checkString("Kaydara FBX Binary  \x00")) {
      return {
        ext: "fbx",
        mime: "application/x.autodesk.fbx"
      };
    }
    if (this.check([76, 80], { offset: 34 }) && (this.check([0, 0, 1], { offset: 8 }) || this.check([1, 0, 2], { offset: 8 }) || this.check([2, 0, 2], { offset: 8 }))) {
      return {
        ext: "eot",
        mime: "application/vnd.ms-fontobject"
      };
    }
    if (this.check([6, 6, 237, 245, 216, 29, 70, 229, 189, 49, 239, 231, 254, 116, 183, 29])) {
      return {
        ext: "indd",
        mime: "application/x-indesign"
      };
    }
    if (this.check([255, 255, 0, 0, 7, 0, 0, 0, 4, 0, 0, 0, 1, 0, 1, 0]) || this.check([0, 0, 255, 255, 0, 0, 0, 7, 0, 0, 0, 4, 0, 1, 0, 1])) {
      return {
        ext: "jmp",
        mime: "application/x-jmp-data"
      };
    }
    await tokenizer.peekBuffer(this.buffer, { length: Math.min(512, tokenizer.fileInfo.size), mayBeLess: true });
    if (this.checkString("ustar", { offset: 257 }) && (this.checkString("\x00", { offset: 262 }) || this.checkString(" ", { offset: 262 })) || this.check([0, 0, 0, 0, 0, 0], { offset: 257 }) && tarHeaderChecksumMatches(this.buffer)) {
      return {
        ext: "tar",
        mime: "application/x-tar"
      };
    }
    if (this.check([255, 254])) {
      const encoding = "utf-16le";
      if (this.checkString("<?xml ", { offset: 2, encoding })) {
        return {
          ext: "xml",
          mime: "application/xml"
        };
      }
      if (this.check([255, 14], { offset: 2 }) && this.checkString("SketchUp Model", { offset: 4, encoding })) {
        return {
          ext: "skp",
          mime: "application/vnd.sketchup.skp"
        };
      }
      if (this.checkString(`Windows Registry Editor Version 5.00\r
`, { offset: 2, encoding })) {
        return {
          ext: "reg",
          mime: "application/x-ms-regedit"
        };
      }
      return;
    }
    if (this.checkString("-----BEGIN PGP MESSAGE-----")) {
      return {
        ext: "pgp",
        mime: "application/pgp-encrypted"
      };
    }
  };
  detectImprecise = async (tokenizer) => {
    this.buffer = new Uint8Array(reasonableDetectionSizeInBytes);
    await tokenizer.peekBuffer(this.buffer, { length: Math.min(8, tokenizer.fileInfo.size), mayBeLess: true });
    if (this.check([0, 0, 1, 186]) || this.check([0, 0, 1, 179])) {
      return {
        ext: "mpg",
        mime: "video/mpeg"
      };
    }
    if (this.check([0, 1, 0, 0, 0])) {
      return {
        ext: "ttf",
        mime: "font/ttf"
      };
    }
    if (this.check([0, 0, 1, 0])) {
      return {
        ext: "ico",
        mime: "image/x-icon"
      };
    }
    if (this.check([0, 0, 2, 0])) {
      return {
        ext: "cur",
        mime: "image/x-icon"
      };
    }
    await tokenizer.peekBuffer(this.buffer, { length: Math.min(2 + this.options.mpegOffsetTolerance, tokenizer.fileInfo.size), mayBeLess: true });
    if (this.buffer.length >= 2 + this.options.mpegOffsetTolerance) {
      for (let depth = 0;depth <= this.options.mpegOffsetTolerance; ++depth) {
        const type = this.scanMpeg(depth);
        if (type) {
          return type;
        }
      }
    }
  };
  async readTiffTag(bigEndian) {
    const tagId = await this.tokenizer.readToken(bigEndian ? UINT16_BE : UINT16_LE);
    this.tokenizer.ignore(10);
    switch (tagId) {
      case 50341:
        return {
          ext: "arw",
          mime: "image/x-sony-arw"
        };
      case 50706:
        return {
          ext: "dng",
          mime: "image/x-adobe-dng"
        };
      default:
    }
  }
  async readTiffIFD(bigEndian) {
    const numberOfTags = await this.tokenizer.readToken(bigEndian ? UINT16_BE : UINT16_LE);
    for (let n = 0;n < numberOfTags; ++n) {
      const fileType = await this.readTiffTag(bigEndian);
      if (fileType) {
        return fileType;
      }
    }
  }
  async readTiffHeader(bigEndian) {
    const version = (bigEndian ? UINT16_BE : UINT16_LE).get(this.buffer, 2);
    const ifdOffset = (bigEndian ? UINT32_BE : UINT32_LE).get(this.buffer, 4);
    if (version === 42) {
      if (ifdOffset >= 6) {
        if (this.checkString("CR", { offset: 8 })) {
          return {
            ext: "cr2",
            mime: "image/x-canon-cr2"
          };
        }
        if (ifdOffset >= 8) {
          const someId1 = (bigEndian ? UINT16_BE : UINT16_LE).get(this.buffer, 8);
          const someId2 = (bigEndian ? UINT16_BE : UINT16_LE).get(this.buffer, 10);
          if (someId1 === 28 && someId2 === 254 || someId1 === 31 && someId2 === 11) {
            return {
              ext: "nef",
              mime: "image/x-nikon-nef"
            };
          }
        }
      }
      await this.tokenizer.ignore(ifdOffset);
      const fileType = await this.readTiffIFD(bigEndian);
      return fileType ?? {
        ext: "tif",
        mime: "image/tiff"
      };
    }
    if (version === 43) {
      return {
        ext: "tif",
        mime: "image/tiff"
      };
    }
  }
  scanMpeg(offset) {
    if (this.check([255, 224], { offset, mask: [255, 224] })) {
      if (this.check([16], { offset: offset + 1, mask: [22] })) {
        if (this.check([8], { offset: offset + 1, mask: [8] })) {
          return {
            ext: "aac",
            mime: "audio/aac"
          };
        }
        return {
          ext: "aac",
          mime: "audio/aac"
        };
      }
      if (this.check([2], { offset: offset + 1, mask: [6] })) {
        return {
          ext: "mp3",
          mime: "audio/mpeg"
        };
      }
      if (this.check([4], { offset: offset + 1, mask: [6] })) {
        return {
          ext: "mp2",
          mime: "audio/mpeg"
        };
      }
      if (this.check([6], { offset: offset + 1, mask: [6] })) {
        return {
          ext: "mp1",
          mime: "audio/mpeg"
        };
      }
    }
  }
}
var reasonableDetectionSizeInBytes = 4100, supportedExtensions, supportedMimeTypes;
var init_core2 = __esm(() => {
  init_lib3();
  init_core();
  init_lib4();
  init_uint8array_extras();
  init_util();
  init_supported();
  supportedExtensions = new Set(extensions);
  supportedMimeTypes = new Set(mimeTypes);
});

// node_modules/file-type/index.js
var exports_file_type = {};
__export(exports_file_type, {
  supportedMimeTypes: () => supportedMimeTypes,
  supportedExtensions: () => supportedExtensions,
  fileTypeStream: () => fileTypeStream,
  fileTypeFromTokenizer: () => fileTypeFromTokenizer,
  fileTypeFromStream: () => fileTypeFromStream,
  fileTypeFromFile: () => fileTypeFromFile,
  fileTypeFromBuffer: () => fileTypeFromBuffer,
  fileTypeFromBlob: () => fileTypeFromBlob,
  FileTypeParser: () => FileTypeParser2
});
import { ReadableStream as WebReadableStream } from "stream/web";
import { pipeline, PassThrough, Readable } from "stream";
async function fileTypeFromFile(path, options) {
  return new FileTypeParser2(options).fromFile(path, options);
}
async function fileTypeFromStream(stream, options) {
  return new FileTypeParser2(options).fromStream(stream);
}
async function fileTypeStream(readableStream, options = {}) {
  return new FileTypeParser2(options).toDetectionStream(readableStream, options);
}
var FileTypeParser2;
var init_file_type = __esm(() => {
  init_lib();
  init_core2();
  init_core2();
  FileTypeParser2 = class FileTypeParser2 extends FileTypeParser {
    async fromStream(stream) {
      const tokenizer = await (stream instanceof WebReadableStream ? fromWebStream(stream, this.tokenizerOptions) : fromStream2(stream, this.tokenizerOptions));
      try {
        return await super.fromTokenizer(tokenizer);
      } finally {
        await tokenizer.close();
      }
    }
    async fromFile(path) {
      const tokenizer = await fromFile(path);
      try {
        return await super.fromTokenizer(tokenizer);
      } finally {
        await tokenizer.close();
      }
    }
    async toDetectionStream(readableStream, options = {}) {
      if (!(readableStream instanceof Readable)) {
        return super.toDetectionStream(readableStream, options);
      }
      const { sampleSize = reasonableDetectionSizeInBytes } = options;
      return new Promise((resolve, reject) => {
        readableStream.on("error", reject);
        readableStream.once("readable", () => {
          (async () => {
            try {
              const pass = new PassThrough;
              const outputStream = pipeline ? pipeline(readableStream, pass, () => {}) : readableStream.pipe(pass);
              const chunk = readableStream.read(sampleSize) ?? readableStream.read() ?? new Uint8Array(0);
              try {
                pass.fileType = await this.fromBuffer(chunk);
              } catch (error) {
                if (error instanceof EndOfStreamError) {
                  pass.fileType = undefined;
                } else {
                  reject(error);
                }
              }
              resolve(outputStream);
            } catch (error) {
              reject(error);
            }
          })();
        });
      });
    }
  };
});

// node_modules/fast-decode-uri-component/index.js
var require_fast_decode_uri_component2 = __commonJS((exports, module) => {
  var UTF8_ACCEPT = 12;
  var UTF8_REJECT = 0;
  var UTF8_DATA = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    3,
    4,
    4,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    6,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    7,
    8,
    7,
    7,
    10,
    9,
    9,
    9,
    11,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    4,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    12,
    0,
    0,
    0,
    0,
    24,
    36,
    48,
    60,
    72,
    84,
    96,
    0,
    12,
    12,
    12,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    24,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    48,
    48,
    48,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    48,
    48,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    48,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    127,
    63,
    63,
    63,
    0,
    31,
    15,
    15,
    15,
    7,
    7,
    7
  ];
  function decodeURIComponent2(uri2) {
    var percentPosition = uri2.indexOf("%");
    if (percentPosition === -1)
      return uri2;
    var length = uri2.length;
    var decoded = "";
    var last = 0;
    var codepoint = 0;
    var startOfOctets = percentPosition;
    var state = UTF8_ACCEPT;
    while (percentPosition > -1 && percentPosition < length) {
      var high = hexCodeToInt(uri2[percentPosition + 1], 4);
      var low = hexCodeToInt(uri2[percentPosition + 2], 0);
      var byte2 = high | low;
      var type = UTF8_DATA[byte2];
      state = UTF8_DATA[256 + state + type];
      codepoint = codepoint << 6 | byte2 & UTF8_DATA[364 + type];
      if (state === UTF8_ACCEPT) {
        decoded += uri2.slice(last, startOfOctets);
        decoded += codepoint <= 65535 ? String.fromCharCode(codepoint) : String.fromCharCode(55232 + (codepoint >> 10), 56320 + (codepoint & 1023));
        codepoint = 0;
        last = percentPosition + 3;
        percentPosition = startOfOctets = uri2.indexOf("%", last);
      } else if (state === UTF8_REJECT) {
        return null;
      } else {
        percentPosition += 3;
        if (percentPosition < length && uri2.charCodeAt(percentPosition) === 37)
          continue;
        return null;
      }
    }
    return decoded + uri2.slice(last);
  }
  var HEX = {
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    a: 10,
    A: 10,
    b: 11,
    B: 11,
    c: 12,
    C: 12,
    d: 13,
    D: 13,
    e: 14,
    E: 14,
    f: 15,
    F: 15
  };
  function hexCodeToInt(c, shift) {
    var i = HEX[c];
    return i === undefined ? 255 : i << shift;
  }
  module.exports = decodeURIComponent2;
});

// node_modules/@sinclair/typebox/build/esm/type/guard/value.mjs
var exports_value = {};
__export(exports_value, {
  IsUndefined: () => IsUndefined,
  IsUint8Array: () => IsUint8Array,
  IsSymbol: () => IsSymbol,
  IsString: () => IsString,
  IsRegExp: () => IsRegExp,
  IsObject: () => IsObject,
  IsNumber: () => IsNumber,
  IsNull: () => IsNull,
  IsIterator: () => IsIterator,
  IsFunction: () => IsFunction,
  IsDate: () => IsDate,
  IsBoolean: () => IsBoolean,
  IsBigInt: () => IsBigInt,
  IsAsyncIterator: () => IsAsyncIterator,
  IsArray: () => IsArray,
  HasPropertyKey: () => HasPropertyKey
});
function HasPropertyKey(value, key) {
  return key in value;
}
function IsAsyncIterator(value) {
  return IsObject(value) && !IsArray(value) && !IsUint8Array(value) && Symbol.asyncIterator in value;
}
function IsArray(value) {
  return Array.isArray(value);
}
function IsBigInt(value) {
  return typeof value === "bigint";
}
function IsBoolean(value) {
  return typeof value === "boolean";
}
function IsDate(value) {
  return value instanceof globalThis.Date;
}
function IsFunction(value) {
  return typeof value === "function";
}
function IsIterator(value) {
  return IsObject(value) && !IsArray(value) && !IsUint8Array(value) && Symbol.iterator in value;
}
function IsNull(value) {
  return value === null;
}
function IsNumber(value) {
  return typeof value === "number";
}
function IsObject(value) {
  return typeof value === "object" && value !== null;
}
function IsRegExp(value) {
  return value instanceof globalThis.RegExp;
}
function IsString(value) {
  return typeof value === "string";
}
function IsSymbol(value) {
  return typeof value === "symbol";
}
function IsUint8Array(value) {
  return value instanceof globalThis.Uint8Array;
}
function IsUndefined(value) {
  return value === undefined;
}

// node_modules/@sinclair/typebox/build/esm/type/clone/value.mjs
function ArrayType(value) {
  return value.map((value2) => Visit(value2));
}
function DateType(value) {
  return new Date(value.getTime());
}
function Uint8ArrayType(value) {
  return new Uint8Array(value);
}
function RegExpType(value) {
  return new RegExp(value.source, value.flags);
}
function ObjectType(value) {
  const result = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    result[key] = Visit(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    result[key] = Visit(value[key]);
  }
  return result;
}
function Visit(value) {
  return IsArray(value) ? ArrayType(value) : IsDate(value) ? DateType(value) : IsUint8Array(value) ? Uint8ArrayType(value) : IsRegExp(value) ? RegExpType(value) : IsObject(value) ? ObjectType(value) : value;
}
function Clone(value) {
  return Visit(value);
}

// node_modules/@sinclair/typebox/build/esm/type/clone/type.mjs
function CloneType(schema, options) {
  return options === undefined ? Clone(schema) : Clone({ ...options, ...schema });
}

// node_modules/@sinclair/typebox/build/esm/value/guard/guard.mjs
function IsAsyncIterator2(value) {
  return IsObject2(value) && globalThis.Symbol.asyncIterator in value;
}
function IsIterator2(value) {
  return IsObject2(value) && globalThis.Symbol.iterator in value;
}
function IsStandardObject(value) {
  return IsObject2(value) && (globalThis.Object.getPrototypeOf(value) === Object.prototype || globalThis.Object.getPrototypeOf(value) === null);
}
function IsPromise(value) {
  return value instanceof globalThis.Promise;
}
function IsDate2(value) {
  return value instanceof Date && globalThis.Number.isFinite(value.getTime());
}
function IsMap(value) {
  return value instanceof globalThis.Map;
}
function IsSet(value) {
  return value instanceof globalThis.Set;
}
function IsTypedArray(value) {
  return globalThis.ArrayBuffer.isView(value);
}
function IsUint8Array2(value) {
  return value instanceof globalThis.Uint8Array;
}
function HasPropertyKey2(value, key) {
  return key in value;
}
function IsObject2(value) {
  return value !== null && typeof value === "object";
}
function IsArray2(value) {
  return globalThis.Array.isArray(value) && !globalThis.ArrayBuffer.isView(value);
}
function IsUndefined2(value) {
  return value === undefined;
}
function IsNull2(value) {
  return value === null;
}
function IsBoolean2(value) {
  return typeof value === "boolean";
}
function IsNumber2(value) {
  return typeof value === "number";
}
function IsInteger(value) {
  return globalThis.Number.isInteger(value);
}
function IsBigInt2(value) {
  return typeof value === "bigint";
}
function IsString2(value) {
  return typeof value === "string";
}
function IsFunction2(value) {
  return typeof value === "function";
}
function IsSymbol2(value) {
  return typeof value === "symbol";
}
function IsValueType(value) {
  return IsBigInt2(value) || IsBoolean2(value) || IsNull2(value) || IsNumber2(value) || IsString2(value) || IsSymbol2(value) || IsUndefined2(value);
}

// node_modules/@sinclair/typebox/build/esm/system/policy.mjs
var TypeSystemPolicy;
(function(TypeSystemPolicy2) {
  TypeSystemPolicy2.InstanceMode = "default";
  TypeSystemPolicy2.ExactOptionalPropertyTypes = false;
  TypeSystemPolicy2.AllowArrayObject = false;
  TypeSystemPolicy2.AllowNaN = false;
  TypeSystemPolicy2.AllowNullVoid = false;
  function IsExactOptionalProperty(value, key) {
    return TypeSystemPolicy2.ExactOptionalPropertyTypes ? key in value : value[key] !== undefined;
  }
  TypeSystemPolicy2.IsExactOptionalProperty = IsExactOptionalProperty;
  function IsObjectLike(value) {
    const isObject = IsObject2(value);
    return TypeSystemPolicy2.AllowArrayObject ? isObject : isObject && !IsArray2(value);
  }
  TypeSystemPolicy2.IsObjectLike = IsObjectLike;
  function IsRecordLike(value) {
    return IsObjectLike(value) && !(value instanceof Date) && !(value instanceof Uint8Array);
  }
  TypeSystemPolicy2.IsRecordLike = IsRecordLike;
  function IsNumberLike(value) {
    return TypeSystemPolicy2.AllowNaN ? IsNumber2(value) : Number.isFinite(value);
  }
  TypeSystemPolicy2.IsNumberLike = IsNumberLike;
  function IsVoidLike(value) {
    const isUndefined = IsUndefined2(value);
    return TypeSystemPolicy2.AllowNullVoid ? isUndefined || value === null : isUndefined;
  }
  TypeSystemPolicy2.IsVoidLike = IsVoidLike;
})(TypeSystemPolicy || (TypeSystemPolicy = {}));

// node_modules/@sinclair/typebox/build/esm/type/create/immutable.mjs
function ImmutableArray(value) {
  return globalThis.Object.freeze(value).map((value2) => Immutable(value2));
}
function ImmutableDate(value) {
  return value;
}
function ImmutableUint8Array(value) {
  return value;
}
function ImmutableRegExp(value) {
  return value;
}
function ImmutableObject(value) {
  const result = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    result[key] = Immutable(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    result[key] = Immutable(value[key]);
  }
  return globalThis.Object.freeze(result);
}
function Immutable(value) {
  return IsArray(value) ? ImmutableArray(value) : IsDate(value) ? ImmutableDate(value) : IsUint8Array(value) ? ImmutableUint8Array(value) : IsRegExp(value) ? ImmutableRegExp(value) : IsObject(value) ? ImmutableObject(value) : value;
}

// node_modules/@sinclair/typebox/build/esm/type/create/type.mjs
function CreateType(schema, options) {
  const result = options !== undefined ? { ...options, ...schema } : schema;
  switch (TypeSystemPolicy.InstanceMode) {
    case "freeze":
      return Immutable(result);
    case "clone":
      return Clone(result);
    default:
      return result;
  }
}

// node_modules/@sinclair/typebox/build/esm/type/error/error.mjs
class TypeBoxError extends Error {
  constructor(message) {
    super(message);
  }
}

// node_modules/@sinclair/typebox/build/esm/type/symbols/symbols.mjs
var TransformKind = Symbol.for("TypeBox.Transform");
var ReadonlyKind = Symbol.for("TypeBox.Readonly");
var OptionalKind = Symbol.for("TypeBox.Optional");
var Hint = Symbol.for("TypeBox.Hint");
var Kind = Symbol.for("TypeBox.Kind");

// node_modules/@sinclair/typebox/build/esm/type/guard/kind.mjs
function IsReadonly(value) {
  return IsObject(value) && value[ReadonlyKind] === "Readonly";
}
function IsOptional(value) {
  return IsObject(value) && value[OptionalKind] === "Optional";
}
function IsAny(value) {
  return IsKindOf(value, "Any");
}
function IsArgument(value) {
  return IsKindOf(value, "Argument");
}
function IsArray3(value) {
  return IsKindOf(value, "Array");
}
function IsAsyncIterator3(value) {
  return IsKindOf(value, "AsyncIterator");
}
function IsBigInt3(value) {
  return IsKindOf(value, "BigInt");
}
function IsBoolean3(value) {
  return IsKindOf(value, "Boolean");
}
function IsComputed(value) {
  return IsKindOf(value, "Computed");
}
function IsConstructor(value) {
  return IsKindOf(value, "Constructor");
}
function IsDate3(value) {
  return IsKindOf(value, "Date");
}
function IsFunction3(value) {
  return IsKindOf(value, "Function");
}
function IsInteger2(value) {
  return IsKindOf(value, "Integer");
}
function IsIntersect(value) {
  return IsKindOf(value, "Intersect");
}
function IsIterator3(value) {
  return IsKindOf(value, "Iterator");
}
function IsKindOf(value, kind) {
  return IsObject(value) && Kind in value && value[Kind] === kind;
}
function IsLiteralValue(value) {
  return IsBoolean(value) || IsNumber(value) || IsString(value);
}
function IsLiteral(value) {
  return IsKindOf(value, "Literal");
}
function IsMappedKey(value) {
  return IsKindOf(value, "MappedKey");
}
function IsMappedResult(value) {
  return IsKindOf(value, "MappedResult");
}
function IsNever(value) {
  return IsKindOf(value, "Never");
}
function IsNot(value) {
  return IsKindOf(value, "Not");
}
function IsNull3(value) {
  return IsKindOf(value, "Null");
}
function IsNumber3(value) {
  return IsKindOf(value, "Number");
}
function IsObject3(value) {
  return IsKindOf(value, "Object");
}
function IsPromise2(value) {
  return IsKindOf(value, "Promise");
}
function IsRecord(value) {
  return IsKindOf(value, "Record");
}
function IsRef(value) {
  return IsKindOf(value, "Ref");
}
function IsRegExp2(value) {
  return IsKindOf(value, "RegExp");
}
function IsString3(value) {
  return IsKindOf(value, "String");
}
function IsSymbol3(value) {
  return IsKindOf(value, "Symbol");
}
function IsTemplateLiteral(value) {
  return IsKindOf(value, "TemplateLiteral");
}
function IsThis(value) {
  return IsKindOf(value, "This");
}
function IsTransform(value) {
  return IsObject(value) && TransformKind in value;
}
function IsTuple(value) {
  return IsKindOf(value, "Tuple");
}
function IsUndefined3(value) {
  return IsKindOf(value, "Undefined");
}
function IsUnion(value) {
  return IsKindOf(value, "Union");
}
function IsUint8Array3(value) {
  return IsKindOf(value, "Uint8Array");
}
function IsUnknown(value) {
  return IsKindOf(value, "Unknown");
}
function IsUnsafe(value) {
  return IsKindOf(value, "Unsafe");
}
function IsVoid(value) {
  return IsKindOf(value, "Void");
}
function IsKind(value) {
  return IsObject(value) && Kind in value && IsString(value[Kind]);
}
function IsSchema(value) {
  return IsAny(value) || IsArgument(value) || IsArray3(value) || IsBoolean3(value) || IsBigInt3(value) || IsAsyncIterator3(value) || IsComputed(value) || IsConstructor(value) || IsDate3(value) || IsFunction3(value) || IsInteger2(value) || IsIntersect(value) || IsIterator3(value) || IsLiteral(value) || IsMappedKey(value) || IsMappedResult(value) || IsNever(value) || IsNot(value) || IsNull3(value) || IsNumber3(value) || IsObject3(value) || IsPromise2(value) || IsRecord(value) || IsRef(value) || IsRegExp2(value) || IsString3(value) || IsSymbol3(value) || IsTemplateLiteral(value) || IsThis(value) || IsTuple(value) || IsUndefined3(value) || IsUnion(value) || IsUint8Array3(value) || IsUnknown(value) || IsUnsafe(value) || IsVoid(value) || IsKind(value);
}
// node_modules/@sinclair/typebox/build/esm/type/guard/type.mjs
var exports_type = {};
__export(exports_type, {
  TypeGuardUnknownTypeError: () => TypeGuardUnknownTypeError,
  IsVoid: () => IsVoid2,
  IsUnsafe: () => IsUnsafe2,
  IsUnknown: () => IsUnknown2,
  IsUnionLiteral: () => IsUnionLiteral,
  IsUnion: () => IsUnion2,
  IsUndefined: () => IsUndefined4,
  IsUint8Array: () => IsUint8Array4,
  IsTuple: () => IsTuple2,
  IsTransform: () => IsTransform2,
  IsThis: () => IsThis2,
  IsTemplateLiteral: () => IsTemplateLiteral2,
  IsSymbol: () => IsSymbol4,
  IsString: () => IsString4,
  IsSchema: () => IsSchema2,
  IsRegExp: () => IsRegExp3,
  IsRef: () => IsRef2,
  IsRecursive: () => IsRecursive,
  IsRecord: () => IsRecord2,
  IsReadonly: () => IsReadonly2,
  IsProperties: () => IsProperties,
  IsPromise: () => IsPromise3,
  IsOptional: () => IsOptional2,
  IsObject: () => IsObject4,
  IsNumber: () => IsNumber4,
  IsNull: () => IsNull4,
  IsNot: () => IsNot2,
  IsNever: () => IsNever2,
  IsMappedResult: () => IsMappedResult2,
  IsMappedKey: () => IsMappedKey2,
  IsLiteralValue: () => IsLiteralValue2,
  IsLiteralString: () => IsLiteralString,
  IsLiteralNumber: () => IsLiteralNumber,
  IsLiteralBoolean: () => IsLiteralBoolean,
  IsLiteral: () => IsLiteral2,
  IsKindOf: () => IsKindOf2,
  IsKind: () => IsKind2,
  IsIterator: () => IsIterator4,
  IsIntersect: () => IsIntersect2,
  IsInteger: () => IsInteger3,
  IsImport: () => IsImport,
  IsFunction: () => IsFunction4,
  IsDate: () => IsDate4,
  IsConstructor: () => IsConstructor2,
  IsComputed: () => IsComputed2,
  IsBoolean: () => IsBoolean4,
  IsBigInt: () => IsBigInt4,
  IsAsyncIterator: () => IsAsyncIterator4,
  IsArray: () => IsArray4,
  IsArgument: () => IsArgument2,
  IsAny: () => IsAny2
});
class TypeGuardUnknownTypeError extends TypeBoxError {
}
var KnownTypes = [
  "Argument",
  "Any",
  "Array",
  "AsyncIterator",
  "BigInt",
  "Boolean",
  "Computed",
  "Constructor",
  "Date",
  "Enum",
  "Function",
  "Integer",
  "Intersect",
  "Iterator",
  "Literal",
  "MappedKey",
  "MappedResult",
  "Not",
  "Null",
  "Number",
  "Object",
  "Promise",
  "Record",
  "Ref",
  "RegExp",
  "String",
  "Symbol",
  "TemplateLiteral",
  "This",
  "Tuple",
  "Undefined",
  "Union",
  "Uint8Array",
  "Unknown",
  "Void"
];
function IsPattern(value) {
  try {
    new RegExp(value);
    return true;
  } catch {
    return false;
  }
}
function IsControlCharacterFree(value) {
  if (!IsString(value))
    return false;
  for (let i = 0;i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 7 && code <= 13 || code === 27 || code === 127) {
      return false;
    }
  }
  return true;
}
function IsAdditionalProperties(value) {
  return IsOptionalBoolean(value) || IsSchema2(value);
}
function IsOptionalBigInt(value) {
  return IsUndefined(value) || IsBigInt(value);
}
function IsOptionalNumber(value) {
  return IsUndefined(value) || IsNumber(value);
}
function IsOptionalBoolean(value) {
  return IsUndefined(value) || IsBoolean(value);
}
function IsOptionalString(value) {
  return IsUndefined(value) || IsString(value);
}
function IsOptionalPattern(value) {
  return IsUndefined(value) || IsString(value) && IsControlCharacterFree(value) && IsPattern(value);
}
function IsOptionalFormat(value) {
  return IsUndefined(value) || IsString(value) && IsControlCharacterFree(value);
}
function IsOptionalSchema(value) {
  return IsUndefined(value) || IsSchema2(value);
}
function IsReadonly2(value) {
  return IsObject(value) && value[ReadonlyKind] === "Readonly";
}
function IsOptional2(value) {
  return IsObject(value) && value[OptionalKind] === "Optional";
}
function IsAny2(value) {
  return IsKindOf2(value, "Any") && IsOptionalString(value.$id);
}
function IsArgument2(value) {
  return IsKindOf2(value, "Argument") && IsNumber(value.index);
}
function IsArray4(value) {
  return IsKindOf2(value, "Array") && value.type === "array" && IsOptionalString(value.$id) && IsSchema2(value.items) && IsOptionalNumber(value.minItems) && IsOptionalNumber(value.maxItems) && IsOptionalBoolean(value.uniqueItems) && IsOptionalSchema(value.contains) && IsOptionalNumber(value.minContains) && IsOptionalNumber(value.maxContains);
}
function IsAsyncIterator4(value) {
  return IsKindOf2(value, "AsyncIterator") && value.type === "AsyncIterator" && IsOptionalString(value.$id) && IsSchema2(value.items);
}
function IsBigInt4(value) {
  return IsKindOf2(value, "BigInt") && value.type === "bigint" && IsOptionalString(value.$id) && IsOptionalBigInt(value.exclusiveMaximum) && IsOptionalBigInt(value.exclusiveMinimum) && IsOptionalBigInt(value.maximum) && IsOptionalBigInt(value.minimum) && IsOptionalBigInt(value.multipleOf);
}
function IsBoolean4(value) {
  return IsKindOf2(value, "Boolean") && value.type === "boolean" && IsOptionalString(value.$id);
}
function IsComputed2(value) {
  return IsKindOf2(value, "Computed") && IsString(value.target) && IsArray(value.parameters) && value.parameters.every((schema) => IsSchema2(schema));
}
function IsConstructor2(value) {
  return IsKindOf2(value, "Constructor") && value.type === "Constructor" && IsOptionalString(value.$id) && IsArray(value.parameters) && value.parameters.every((schema) => IsSchema2(schema)) && IsSchema2(value.returns);
}
function IsDate4(value) {
  return IsKindOf2(value, "Date") && value.type === "Date" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximumTimestamp) && IsOptionalNumber(value.exclusiveMinimumTimestamp) && IsOptionalNumber(value.maximumTimestamp) && IsOptionalNumber(value.minimumTimestamp) && IsOptionalNumber(value.multipleOfTimestamp);
}
function IsFunction4(value) {
  return IsKindOf2(value, "Function") && value.type === "Function" && IsOptionalString(value.$id) && IsArray(value.parameters) && value.parameters.every((schema) => IsSchema2(schema)) && IsSchema2(value.returns);
}
function IsImport(value) {
  return IsKindOf2(value, "Import") && HasPropertyKey(value, "$defs") && IsObject(value.$defs) && IsProperties(value.$defs) && HasPropertyKey(value, "$ref") && IsString(value.$ref) && value.$ref in value.$defs;
}
function IsInteger3(value) {
  return IsKindOf2(value, "Integer") && value.type === "integer" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximum) && IsOptionalNumber(value.exclusiveMinimum) && IsOptionalNumber(value.maximum) && IsOptionalNumber(value.minimum) && IsOptionalNumber(value.multipleOf);
}
function IsProperties(value) {
  return IsObject(value) && Object.entries(value).every(([key, schema]) => IsControlCharacterFree(key) && IsSchema2(schema));
}
function IsIntersect2(value) {
  return IsKindOf2(value, "Intersect") && (IsString(value.type) && value.type !== "object" ? false : true) && IsArray(value.allOf) && value.allOf.every((schema) => IsSchema2(schema) && !IsTransform2(schema)) && IsOptionalString(value.type) && (IsOptionalBoolean(value.unevaluatedProperties) || IsOptionalSchema(value.unevaluatedProperties)) && IsOptionalString(value.$id);
}
function IsIterator4(value) {
  return IsKindOf2(value, "Iterator") && value.type === "Iterator" && IsOptionalString(value.$id) && IsSchema2(value.items);
}
function IsKindOf2(value, kind) {
  return IsObject(value) && Kind in value && value[Kind] === kind;
}
function IsLiteralString(value) {
  return IsLiteral2(value) && IsString(value.const);
}
function IsLiteralNumber(value) {
  return IsLiteral2(value) && IsNumber(value.const);
}
function IsLiteralBoolean(value) {
  return IsLiteral2(value) && IsBoolean(value.const);
}
function IsLiteral2(value) {
  return IsKindOf2(value, "Literal") && IsOptionalString(value.$id) && IsLiteralValue2(value.const);
}
function IsLiteralValue2(value) {
  return IsBoolean(value) || IsNumber(value) || IsString(value);
}
function IsMappedKey2(value) {
  return IsKindOf2(value, "MappedKey") && IsArray(value.keys) && value.keys.every((key) => IsNumber(key) || IsString(key));
}
function IsMappedResult2(value) {
  return IsKindOf2(value, "MappedResult") && IsProperties(value.properties);
}
function IsNever2(value) {
  return IsKindOf2(value, "Never") && IsObject(value.not) && Object.getOwnPropertyNames(value.not).length === 0;
}
function IsNot2(value) {
  return IsKindOf2(value, "Not") && IsSchema2(value.not);
}
function IsNull4(value) {
  return IsKindOf2(value, "Null") && value.type === "null" && IsOptionalString(value.$id);
}
function IsNumber4(value) {
  return IsKindOf2(value, "Number") && value.type === "number" && IsOptionalString(value.$id) && IsOptionalNumber(value.exclusiveMaximum) && IsOptionalNumber(value.exclusiveMinimum) && IsOptionalNumber(value.maximum) && IsOptionalNumber(value.minimum) && IsOptionalNumber(value.multipleOf);
}
function IsObject4(value) {
  return IsKindOf2(value, "Object") && value.type === "object" && IsOptionalString(value.$id) && IsProperties(value.properties) && IsAdditionalProperties(value.additionalProperties) && IsOptionalNumber(value.minProperties) && IsOptionalNumber(value.maxProperties);
}
function IsPromise3(value) {
  return IsKindOf2(value, "Promise") && value.type === "Promise" && IsOptionalString(value.$id) && IsSchema2(value.item);
}
function IsRecord2(value) {
  return IsKindOf2(value, "Record") && value.type === "object" && IsOptionalString(value.$id) && IsAdditionalProperties(value.additionalProperties) && IsObject(value.patternProperties) && ((schema) => {
    const keys = Object.getOwnPropertyNames(schema.patternProperties);
    return keys.length === 1 && IsPattern(keys[0]) && IsObject(schema.patternProperties) && IsSchema2(schema.patternProperties[keys[0]]);
  })(value);
}
function IsRecursive(value) {
  return IsObject(value) && Hint in value && value[Hint] === "Recursive";
}
function IsRef2(value) {
  return IsKindOf2(value, "Ref") && IsOptionalString(value.$id) && IsString(value.$ref);
}
function IsRegExp3(value) {
  return IsKindOf2(value, "RegExp") && IsOptionalString(value.$id) && IsString(value.source) && IsString(value.flags) && IsOptionalNumber(value.maxLength) && IsOptionalNumber(value.minLength);
}
function IsString4(value) {
  return IsKindOf2(value, "String") && value.type === "string" && IsOptionalString(value.$id) && IsOptionalNumber(value.minLength) && IsOptionalNumber(value.maxLength) && IsOptionalPattern(value.pattern) && IsOptionalFormat(value.format);
}
function IsSymbol4(value) {
  return IsKindOf2(value, "Symbol") && value.type === "symbol" && IsOptionalString(value.$id);
}
function IsTemplateLiteral2(value) {
  return IsKindOf2(value, "TemplateLiteral") && value.type === "string" && IsString(value.pattern) && value.pattern[0] === "^" && value.pattern[value.pattern.length - 1] === "$";
}
function IsThis2(value) {
  return IsKindOf2(value, "This") && IsOptionalString(value.$id) && IsString(value.$ref);
}
function IsTransform2(value) {
  return IsObject(value) && TransformKind in value;
}
function IsTuple2(value) {
  return IsKindOf2(value, "Tuple") && value.type === "array" && IsOptionalString(value.$id) && IsNumber(value.minItems) && IsNumber(value.maxItems) && value.minItems === value.maxItems && (IsUndefined(value.items) && IsUndefined(value.additionalItems) && value.minItems === 0 || IsArray(value.items) && value.items.every((schema) => IsSchema2(schema)));
}
function IsUndefined4(value) {
  return IsKindOf2(value, "Undefined") && value.type === "undefined" && IsOptionalString(value.$id);
}
function IsUnionLiteral(value) {
  return IsUnion2(value) && value.anyOf.every((schema) => IsLiteralString(schema) || IsLiteralNumber(schema));
}
function IsUnion2(value) {
  return IsKindOf2(value, "Union") && IsOptionalString(value.$id) && IsObject(value) && IsArray(value.anyOf) && value.anyOf.every((schema) => IsSchema2(schema));
}
function IsUint8Array4(value) {
  return IsKindOf2(value, "Uint8Array") && value.type === "Uint8Array" && IsOptionalString(value.$id) && IsOptionalNumber(value.minByteLength) && IsOptionalNumber(value.maxByteLength);
}
function IsUnknown2(value) {
  return IsKindOf2(value, "Unknown") && IsOptionalString(value.$id);
}
function IsUnsafe2(value) {
  return IsKindOf2(value, "Unsafe");
}
function IsVoid2(value) {
  return IsKindOf2(value, "Void") && value.type === "void" && IsOptionalString(value.$id);
}
function IsKind2(value) {
  return IsObject(value) && Kind in value && IsString(value[Kind]) && !KnownTypes.includes(value[Kind]);
}
function IsSchema2(value) {
  return IsObject(value) && (IsAny2(value) || IsArgument2(value) || IsArray4(value) || IsBoolean4(value) || IsBigInt4(value) || IsAsyncIterator4(value) || IsComputed2(value) || IsConstructor2(value) || IsDate4(value) || IsFunction4(value) || IsInteger3(value) || IsIntersect2(value) || IsIterator4(value) || IsLiteral2(value) || IsMappedKey2(value) || IsMappedResult2(value) || IsNever2(value) || IsNot2(value) || IsNull4(value) || IsNumber4(value) || IsObject4(value) || IsPromise3(value) || IsRecord2(value) || IsRef2(value) || IsRegExp3(value) || IsString4(value) || IsSymbol4(value) || IsTemplateLiteral2(value) || IsThis2(value) || IsTuple2(value) || IsUndefined4(value) || IsUnion2(value) || IsUint8Array4(value) || IsUnknown2(value) || IsUnsafe2(value) || IsVoid2(value) || IsKind2(value));
}
// node_modules/@sinclair/typebox/build/esm/type/patterns/patterns.mjs
var PatternBoolean = "(true|false)";
var PatternNumber = "(0|[1-9][0-9]*)";
var PatternString = "(.*)";
var PatternNever = "(?!.*)";
var PatternBooleanExact = `^${PatternBoolean}$`;
var PatternNumberExact = `^${PatternNumber}$`;
var PatternStringExact = `^${PatternString}$`;
var PatternNeverExact = `^${PatternNever}$`;

// node_modules/@sinclair/typebox/build/esm/type/registry/format.mjs
var exports_format = {};
__export(exports_format, {
  Set: () => Set2,
  Has: () => Has,
  Get: () => Get,
  Entries: () => Entries,
  Delete: () => Delete,
  Clear: () => Clear
});
var map = new Map;
function Entries() {
  return new Map(map);
}
function Clear() {
  return map.clear();
}
function Delete(format) {
  return map.delete(format);
}
function Has(format) {
  return map.has(format);
}
function Set2(format, func) {
  map.set(format, func);
}
function Get(format) {
  return map.get(format);
}
// node_modules/@sinclair/typebox/build/esm/type/registry/type.mjs
var exports_type2 = {};
__export(exports_type2, {
  Set: () => Set3,
  Has: () => Has2,
  Get: () => Get2,
  Entries: () => Entries2,
  Delete: () => Delete2,
  Clear: () => Clear2
});
var map2 = new Map;
function Entries2() {
  return new Map(map2);
}
function Clear2() {
  return map2.clear();
}
function Delete2(kind) {
  return map2.delete(kind);
}
function Has2(kind) {
  return map2.has(kind);
}
function Set3(kind, func) {
  map2.set(kind, func);
}
function Get2(kind) {
  return map2.get(kind);
}
// node_modules/@sinclair/typebox/build/esm/type/sets/set.mjs
function SetIncludes(T, S) {
  return T.includes(S);
}
function SetDistinct(T) {
  return [...new Set(T)];
}
function SetIntersect(T, S) {
  return T.filter((L) => S.includes(L));
}
function SetIntersectManyResolve(T, Init) {
  return T.reduce((Acc, L) => {
    return SetIntersect(Acc, L);
  }, Init);
}
function SetIntersectMany(T) {
  return T.length === 1 ? T[0] : T.length > 1 ? SetIntersectManyResolve(T.slice(1), T[0]) : [];
}
function SetUnionMany(T) {
  const Acc = [];
  for (const L of T)
    Acc.push(...L);
  return Acc;
}

// node_modules/@sinclair/typebox/build/esm/type/any/any.mjs
function Any(options) {
  return CreateType({ [Kind]: "Any" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/array/array.mjs
function Array2(items, options) {
  return CreateType({ [Kind]: "Array", type: "array", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/argument/argument.mjs
function Argument(index) {
  return CreateType({ [Kind]: "Argument", index });
}

// node_modules/@sinclair/typebox/build/esm/type/async-iterator/async-iterator.mjs
function AsyncIterator(items, options) {
  return CreateType({ [Kind]: "AsyncIterator", type: "AsyncIterator", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/computed/computed.mjs
function Computed(target, parameters, options) {
  return CreateType({ [Kind]: "Computed", target, parameters }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/discard/discard.mjs
function DiscardKey(value, key) {
  const { [key]: _, ...rest } = value;
  return rest;
}
function Discard(value, keys) {
  return keys.reduce((acc, key) => DiscardKey(acc, key), value);
}

// node_modules/@sinclair/typebox/build/esm/type/never/never.mjs
function Never(options) {
  return CreateType({ [Kind]: "Never", not: {} }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/mapped/mapped-result.mjs
function MappedResult(properties) {
  return CreateType({
    [Kind]: "MappedResult",
    properties
  });
}

// node_modules/@sinclair/typebox/build/esm/type/constructor/constructor.mjs
function Constructor(parameters, returns, options) {
  return CreateType({ [Kind]: "Constructor", type: "Constructor", parameters, returns }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/function/function.mjs
function Function2(parameters, returns, options) {
  return CreateType({ [Kind]: "Function", type: "Function", parameters, returns }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union-create.mjs
function UnionCreate(T, options) {
  return CreateType({ [Kind]: "Union", anyOf: T }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union-evaluated.mjs
function IsUnionOptional(types) {
  return types.some((type) => IsOptional(type));
}
function RemoveOptionalFromRest(types) {
  return types.map((left) => IsOptional(left) ? RemoveOptionalFromType(left) : left);
}
function RemoveOptionalFromType(T) {
  return Discard(T, [OptionalKind]);
}
function ResolveUnion(types, options) {
  const isOptional = IsUnionOptional(types);
  return isOptional ? Optional(UnionCreate(RemoveOptionalFromRest(types), options)) : UnionCreate(RemoveOptionalFromRest(types), options);
}
function UnionEvaluated(T, options) {
  return T.length === 1 ? CreateType(T[0], options) : T.length === 0 ? Never(options) : ResolveUnion(T, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union.mjs
function Union(types, options) {
  return types.length === 0 ? Never(options) : types.length === 1 ? CreateType(types[0], options) : UnionCreate(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/parse.mjs
class TemplateLiteralParserError extends TypeBoxError {
}
function Unescape(pattern) {
  return pattern.replace(/\\\$/g, "$").replace(/\\\*/g, "*").replace(/\\\^/g, "^").replace(/\\\|/g, "|").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
}
function IsNonEscaped(pattern, index, char) {
  return pattern[index] === char && pattern.charCodeAt(index - 1) !== 92;
}
function IsOpenParen(pattern, index) {
  return IsNonEscaped(pattern, index, "(");
}
function IsCloseParen(pattern, index) {
  return IsNonEscaped(pattern, index, ")");
}
function IsSeparator(pattern, index) {
  return IsNonEscaped(pattern, index, "|");
}
function IsGroup(pattern) {
  if (!(IsOpenParen(pattern, 0) && IsCloseParen(pattern, pattern.length - 1)))
    return false;
  let count = 0;
  for (let index = 0;index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (count === 0 && index !== pattern.length - 1)
      return false;
  }
  return true;
}
function InGroup(pattern) {
  return pattern.slice(1, pattern.length - 1);
}
function IsPrecedenceOr(pattern) {
  let count = 0;
  for (let index = 0;index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (IsSeparator(pattern, index) && count === 0)
      return true;
  }
  return false;
}
function IsPrecedenceAnd(pattern) {
  for (let index = 0;index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      return true;
  }
  return false;
}
function Or(pattern) {
  let [count, start] = [0, 0];
  const expressions = [];
  for (let index = 0;index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (IsSeparator(pattern, index) && count === 0) {
      const range2 = pattern.slice(start, index);
      if (range2.length > 0)
        expressions.push(TemplateLiteralParse(range2));
      start = index + 1;
    }
  }
  const range = pattern.slice(start);
  if (range.length > 0)
    expressions.push(TemplateLiteralParse(range));
  if (expressions.length === 0)
    return { type: "const", const: "" };
  if (expressions.length === 1)
    return expressions[0];
  return { type: "or", expr: expressions };
}
function And(pattern) {
  function Group(value, index) {
    if (!IsOpenParen(value, index))
      throw new TemplateLiteralParserError(`TemplateLiteralParser: Index must point to open parens`);
    let count = 0;
    for (let scan = index;scan < value.length; scan++) {
      if (IsOpenParen(value, scan))
        count += 1;
      if (IsCloseParen(value, scan))
        count -= 1;
      if (count === 0)
        return [index, scan];
    }
    throw new TemplateLiteralParserError(`TemplateLiteralParser: Unclosed group parens in expression`);
  }
  function Range(pattern2, index) {
    for (let scan = index;scan < pattern2.length; scan++) {
      if (IsOpenParen(pattern2, scan))
        return [index, scan];
    }
    return [index, pattern2.length];
  }
  const expressions = [];
  for (let index = 0;index < pattern.length; index++) {
    if (IsOpenParen(pattern, index)) {
      const [start, end] = Group(pattern, index);
      const range = pattern.slice(start, end + 1);
      expressions.push(TemplateLiteralParse(range));
      index = end;
    } else {
      const [start, end] = Range(pattern, index);
      const range = pattern.slice(start, end);
      if (range.length > 0)
        expressions.push(TemplateLiteralParse(range));
      index = end - 1;
    }
  }
  return expressions.length === 0 ? { type: "const", const: "" } : expressions.length === 1 ? expressions[0] : { type: "and", expr: expressions };
}
function TemplateLiteralParse(pattern) {
  return IsGroup(pattern) ? TemplateLiteralParse(InGroup(pattern)) : IsPrecedenceOr(pattern) ? Or(pattern) : IsPrecedenceAnd(pattern) ? And(pattern) : { type: "const", const: Unescape(pattern) };
}
function TemplateLiteralParseExact(pattern) {
  return TemplateLiteralParse(pattern.slice(1, pattern.length - 1));
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/finite.mjs
class TemplateLiteralFiniteError extends TypeBoxError {
}
function IsNumberExpression(expression) {
  return expression.type === "or" && expression.expr.length === 2 && expression.expr[0].type === "const" && expression.expr[0].const === "0" && expression.expr[1].type === "const" && expression.expr[1].const === "[1-9][0-9]*";
}
function IsBooleanExpression(expression) {
  return expression.type === "or" && expression.expr.length === 2 && expression.expr[0].type === "const" && expression.expr[0].const === "true" && expression.expr[1].type === "const" && expression.expr[1].const === "false";
}
function IsStringExpression(expression) {
  return expression.type === "const" && expression.const === ".*";
}
function IsTemplateLiteralExpressionFinite(expression) {
  return IsNumberExpression(expression) || IsStringExpression(expression) ? false : IsBooleanExpression(expression) ? true : expression.type === "and" ? expression.expr.every((expr) => IsTemplateLiteralExpressionFinite(expr)) : expression.type === "or" ? expression.expr.every((expr) => IsTemplateLiteralExpressionFinite(expr)) : expression.type === "const" ? true : (() => {
    throw new TemplateLiteralFiniteError(`Unknown expression type`);
  })();
}
function IsTemplateLiteralFinite(schema) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  return IsTemplateLiteralExpressionFinite(expression);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/generate.mjs
class TemplateLiteralGenerateError extends TypeBoxError {
}
function* GenerateReduce(buffer) {
  if (buffer.length === 1)
    return yield* buffer[0];
  for (const left of buffer[0]) {
    for (const right of GenerateReduce(buffer.slice(1))) {
      yield `${left}${right}`;
    }
  }
}
function* GenerateAnd(expression) {
  return yield* GenerateReduce(expression.expr.map((expr) => [...TemplateLiteralExpressionGenerate(expr)]));
}
function* GenerateOr(expression) {
  for (const expr of expression.expr)
    yield* TemplateLiteralExpressionGenerate(expr);
}
function* GenerateConst(expression) {
  return yield expression.const;
}
function* TemplateLiteralExpressionGenerate(expression) {
  return expression.type === "and" ? yield* GenerateAnd(expression) : expression.type === "or" ? yield* GenerateOr(expression) : expression.type === "const" ? yield* GenerateConst(expression) : (() => {
    throw new TemplateLiteralGenerateError("Unknown expression");
  })();
}
function TemplateLiteralGenerate(schema) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  return IsTemplateLiteralExpressionFinite(expression) ? [...TemplateLiteralExpressionGenerate(expression)] : [];
}

// node_modules/@sinclair/typebox/build/esm/type/literal/literal.mjs
function Literal(value, options) {
  return CreateType({
    [Kind]: "Literal",
    const: value,
    type: typeof value
  }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/boolean/boolean.mjs
function Boolean2(options) {
  return CreateType({ [Kind]: "Boolean", type: "boolean" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/bigint/bigint.mjs
function BigInt2(options) {
  return CreateType({ [Kind]: "BigInt", type: "bigint" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/number/number.mjs
function Number2(options) {
  return CreateType({ [Kind]: "Number", type: "number" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/string/string.mjs
function String2(options) {
  return CreateType({ [Kind]: "String", type: "string" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/syntax.mjs
function* FromUnion(syntax) {
  const trim = syntax.trim().replace(/"|'/g, "");
  return trim === "boolean" ? yield Boolean2() : trim === "number" ? yield Number2() : trim === "bigint" ? yield BigInt2() : trim === "string" ? yield String2() : yield (() => {
    const literals = trim.split("|").map((literal) => Literal(literal.trim()));
    return literals.length === 0 ? Never() : literals.length === 1 ? literals[0] : UnionEvaluated(literals);
  })();
}
function* FromTerminal(syntax) {
  if (syntax[1] !== "{") {
    const L = Literal("$");
    const R = FromSyntax(syntax.slice(1));
    return yield* [L, ...R];
  }
  for (let i = 2;i < syntax.length; i++) {
    if (syntax[i] === "}") {
      const L = FromUnion(syntax.slice(2, i));
      const R = FromSyntax(syntax.slice(i + 1));
      return yield* [...L, ...R];
    }
  }
  yield Literal(syntax);
}
function* FromSyntax(syntax) {
  for (let i = 0;i < syntax.length; i++) {
    if (syntax[i] === "$") {
      const L = Literal(syntax.slice(0, i));
      const R = FromTerminal(syntax.slice(i));
      return yield* [L, ...R];
    }
  }
  yield Literal(syntax);
}
function TemplateLiteralSyntax(syntax) {
  return [...FromSyntax(syntax)];
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/pattern.mjs
class TemplateLiteralPatternError extends TypeBoxError {
}
function Escape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Visit2(schema, acc) {
  return IsTemplateLiteral(schema) ? schema.pattern.slice(1, schema.pattern.length - 1) : IsUnion(schema) ? `(${schema.anyOf.map((schema2) => Visit2(schema2, acc)).join("|")})` : IsNumber3(schema) ? `${acc}${PatternNumber}` : IsInteger2(schema) ? `${acc}${PatternNumber}` : IsBigInt3(schema) ? `${acc}${PatternNumber}` : IsString3(schema) ? `${acc}${PatternString}` : IsLiteral(schema) ? `${acc}${Escape(schema.const.toString())}` : IsBoolean3(schema) ? `${acc}${PatternBoolean}` : (() => {
    throw new TemplateLiteralPatternError(`Unexpected Kind '${schema[Kind]}'`);
  })();
}
function TemplateLiteralPattern(kinds) {
  return `^${kinds.map((schema) => Visit2(schema, "")).join("")}$`;
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/union.mjs
function TemplateLiteralToUnion(schema) {
  const R = TemplateLiteralGenerate(schema);
  const L = R.map((S) => Literal(S));
  return UnionEvaluated(L);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/template-literal.mjs
function TemplateLiteral(unresolved, options) {
  const pattern = IsString(unresolved) ? TemplateLiteralPattern(TemplateLiteralSyntax(unresolved)) : TemplateLiteralPattern(unresolved);
  return CreateType({ [Kind]: "TemplateLiteral", type: "string", pattern }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-property-keys.mjs
function FromTemplateLiteral(templateLiteral) {
  const keys = TemplateLiteralGenerate(templateLiteral);
  return keys.map((key) => key.toString());
}
function FromUnion2(types) {
  const result = [];
  for (const type of types)
    result.push(...IndexPropertyKeys(type));
  return result;
}
function FromLiteral(literalValue) {
  return [literalValue.toString()];
}
function IndexPropertyKeys(type) {
  return [...new Set(IsTemplateLiteral(type) ? FromTemplateLiteral(type) : IsUnion(type) ? FromUnion2(type.anyOf) : IsLiteral(type) ? FromLiteral(type.const) : IsNumber3(type) ? ["[number]"] : IsInteger2(type) ? ["[number]"] : [])];
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-from-mapped-result.mjs
function FromProperties(type, properties, options) {
  const result = {};
  for (const K2 of Object.getOwnPropertyNames(properties)) {
    result[K2] = Index(type, IndexPropertyKeys(properties[K2]), options);
  }
  return result;
}
function FromMappedResult(type, mappedResult, options) {
  return FromProperties(type, mappedResult.properties, options);
}
function IndexFromMappedResult(type, mappedResult, options) {
  const properties = FromMappedResult(type, mappedResult, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed.mjs
function FromRest(types, key) {
  return types.map((type) => IndexFromPropertyKey(type, key));
}
function FromIntersectRest(types) {
  return types.filter((type) => !IsNever(type));
}
function FromIntersect(types, key) {
  return IntersectEvaluated(FromIntersectRest(FromRest(types, key)));
}
function FromUnionRest(types) {
  return types.some((L) => IsNever(L)) ? [] : types;
}
function FromUnion3(types, key) {
  return UnionEvaluated(FromUnionRest(FromRest(types, key)));
}
function FromTuple(types, key) {
  return key in types ? types[key] : key === "[number]" ? UnionEvaluated(types) : Never();
}
function FromArray(type, key) {
  return key === "[number]" ? type : Never();
}
function FromProperty(properties, propertyKey) {
  return propertyKey in properties ? properties[propertyKey] : Never();
}
function IndexFromPropertyKey(type, propertyKey) {
  return IsIntersect(type) ? FromIntersect(type.allOf, propertyKey) : IsUnion(type) ? FromUnion3(type.anyOf, propertyKey) : IsTuple(type) ? FromTuple(type.items ?? [], propertyKey) : IsArray3(type) ? FromArray(type.items, propertyKey) : IsObject3(type) ? FromProperty(type.properties, propertyKey) : Never();
}
function IndexFromPropertyKeys(type, propertyKeys) {
  return propertyKeys.map((propertyKey) => IndexFromPropertyKey(type, propertyKey));
}
function FromSchema(type, propertyKeys) {
  return UnionEvaluated(IndexFromPropertyKeys(type, propertyKeys));
}
function Index(type, key, options) {
  if (IsRef(type) || IsRef(key)) {
    const error = `Index types using Ref parameters require both Type and Key to be of TSchema`;
    if (!IsSchema(type) || !IsSchema(key))
      throw new TypeBoxError(error);
    return Computed("Index", [type, key]);
  }
  if (IsMappedResult(key))
    return IndexFromMappedResult(type, key, options);
  if (IsMappedKey(key))
    return IndexFromMappedKey(type, key, options);
  return CreateType(IsSchema(key) ? FromSchema(type, IndexPropertyKeys(key)) : FromSchema(type, key), options);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-from-mapped-key.mjs
function MappedIndexPropertyKey(type, key, options) {
  return { [key]: Index(type, [key], Clone(options)) };
}
function MappedIndexPropertyKeys(type, propertyKeys, options) {
  return propertyKeys.reduce((result, left) => {
    return { ...result, ...MappedIndexPropertyKey(type, left, options) };
  }, {});
}
function MappedIndexProperties(type, mappedKey, options) {
  return MappedIndexPropertyKeys(type, mappedKey.keys, options);
}
function IndexFromMappedKey(type, mappedKey, options) {
  const properties = MappedIndexProperties(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/iterator/iterator.mjs
function Iterator(items, options) {
  return CreateType({ [Kind]: "Iterator", type: "Iterator", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/object/object.mjs
function RequiredArray(properties) {
  return globalThis.Object.keys(properties).filter((key) => !IsOptional(properties[key]));
}
function _Object(properties, options) {
  const required = RequiredArray(properties);
  const schema = required.length > 0 ? { [Kind]: "Object", type: "object", required, properties } : { [Kind]: "Object", type: "object", properties };
  return CreateType(schema, options);
}
var Object2 = _Object;

// node_modules/@sinclair/typebox/build/esm/type/promise/promise.mjs
function Promise2(item, options) {
  return CreateType({ [Kind]: "Promise", type: "Promise", item }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly/readonly.mjs
function RemoveReadonly(schema) {
  return CreateType(Discard(schema, [ReadonlyKind]));
}
function AddReadonly(schema) {
  return CreateType({ ...schema, [ReadonlyKind]: "Readonly" });
}
function ReadonlyWithFlag(schema, F) {
  return F === false ? RemoveReadonly(schema) : AddReadonly(schema);
}
function Readonly(schema, enable) {
  const F = enable ?? true;
  return IsMappedResult(schema) ? ReadonlyFromMappedResult(schema, F) : ReadonlyWithFlag(schema, F);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly/readonly-from-mapped-result.mjs
function FromProperties2(K, F) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(K))
    Acc[K2] = Readonly(K[K2], F);
  return Acc;
}
function FromMappedResult2(R, F) {
  return FromProperties2(R.properties, F);
}
function ReadonlyFromMappedResult(R, F) {
  const P = FromMappedResult2(R, F);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/tuple/tuple.mjs
function Tuple(types, options) {
  return CreateType(types.length > 0 ? { [Kind]: "Tuple", type: "array", items: types, additionalItems: false, minItems: types.length, maxItems: types.length } : { [Kind]: "Tuple", type: "array", minItems: types.length, maxItems: types.length }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/mapped/mapped.mjs
function FromMappedResult3(K, P) {
  return K in P ? FromSchemaType(K, P[K]) : MappedResult(P);
}
function MappedKeyToKnownMappedResultProperties(K) {
  return { [K]: Literal(K) };
}
function MappedKeyToUnknownMappedResultProperties(P) {
  const Acc = {};
  for (const L of P)
    Acc[L] = Literal(L);
  return Acc;
}
function MappedKeyToMappedResultProperties(K, P) {
  return SetIncludes(P, K) ? MappedKeyToKnownMappedResultProperties(K) : MappedKeyToUnknownMappedResultProperties(P);
}
function FromMappedKey(K, P) {
  const R = MappedKeyToMappedResultProperties(K, P);
  return FromMappedResult3(K, R);
}
function FromRest2(K, T) {
  return T.map((L) => FromSchemaType(K, L));
}
function FromProperties3(K, T) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(T))
    Acc[K2] = FromSchemaType(K, T[K2]);
  return Acc;
}
function FromSchemaType(K, T) {
  const options = { ...T };
  return IsOptional(T) ? Optional(FromSchemaType(K, Discard(T, [OptionalKind]))) : IsReadonly(T) ? Readonly(FromSchemaType(K, Discard(T, [ReadonlyKind]))) : IsMappedResult(T) ? FromMappedResult3(K, T.properties) : IsMappedKey(T) ? FromMappedKey(K, T.keys) : IsConstructor(T) ? Constructor(FromRest2(K, T.parameters), FromSchemaType(K, T.returns), options) : IsFunction3(T) ? Function2(FromRest2(K, T.parameters), FromSchemaType(K, T.returns), options) : IsAsyncIterator3(T) ? AsyncIterator(FromSchemaType(K, T.items), options) : IsIterator3(T) ? Iterator(FromSchemaType(K, T.items), options) : IsIntersect(T) ? Intersect(FromRest2(K, T.allOf), options) : IsUnion(T) ? Union(FromRest2(K, T.anyOf), options) : IsTuple(T) ? Tuple(FromRest2(K, T.items ?? []), options) : IsObject3(T) ? Object2(FromProperties3(K, T.properties), options) : IsArray3(T) ? Array2(FromSchemaType(K, T.items), options) : IsPromise2(T) ? Promise2(FromSchemaType(K, T.item), options) : T;
}
function MappedFunctionReturnType(K, T) {
  const Acc = {};
  for (const L of K)
    Acc[L] = FromSchemaType(L, T);
  return Acc;
}
function Mapped(key, map3, options) {
  const K = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const RT = map3({ [Kind]: "MappedKey", keys: K });
  const R = MappedFunctionReturnType(K, RT);
  return Object2(R, options);
}

// node_modules/@sinclair/typebox/build/esm/type/optional/optional.mjs
function RemoveOptional(schema) {
  return CreateType(Discard(schema, [OptionalKind]));
}
function AddOptional(schema) {
  return CreateType({ ...schema, [OptionalKind]: "Optional" });
}
function OptionalWithFlag(schema, F) {
  return F === false ? RemoveOptional(schema) : AddOptional(schema);
}
function Optional(schema, enable) {
  const F = enable ?? true;
  return IsMappedResult(schema) ? OptionalFromMappedResult(schema, F) : OptionalWithFlag(schema, F);
}

// node_modules/@sinclair/typebox/build/esm/type/optional/optional-from-mapped-result.mjs
function FromProperties4(P, F) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Optional(P[K2], F);
  return Acc;
}
function FromMappedResult4(R, F) {
  return FromProperties4(R.properties, F);
}
function OptionalFromMappedResult(R, F) {
  const P = FromMappedResult4(R, F);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect-create.mjs
function IntersectCreate(T, options = {}) {
  const allObjects = T.every((schema) => IsObject3(schema));
  const clonedUnevaluatedProperties = IsSchema(options.unevaluatedProperties) ? { unevaluatedProperties: options.unevaluatedProperties } : {};
  return CreateType(options.unevaluatedProperties === false || IsSchema(options.unevaluatedProperties) || allObjects ? { ...clonedUnevaluatedProperties, [Kind]: "Intersect", type: "object", allOf: T } : { ...clonedUnevaluatedProperties, [Kind]: "Intersect", allOf: T }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect-evaluated.mjs
function IsIntersectOptional(types) {
  return types.every((left) => IsOptional(left));
}
function RemoveOptionalFromType2(type) {
  return Discard(type, [OptionalKind]);
}
function RemoveOptionalFromRest2(types) {
  return types.map((left) => IsOptional(left) ? RemoveOptionalFromType2(left) : left);
}
function ResolveIntersect(types, options) {
  return IsIntersectOptional(types) ? Optional(IntersectCreate(RemoveOptionalFromRest2(types), options)) : IntersectCreate(RemoveOptionalFromRest2(types), options);
}
function IntersectEvaluated(types, options = {}) {
  if (types.length === 1)
    return CreateType(types[0], options);
  if (types.length === 0)
    return Never(options);
  if (types.some((schema) => IsTransform(schema)))
    throw new Error("Cannot intersect transform types");
  return ResolveIntersect(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect.mjs
function Intersect(types, options) {
  if (types.length === 1)
    return CreateType(types[0], options);
  if (types.length === 0)
    return Never(options);
  if (types.some((schema) => IsTransform(schema)))
    throw new Error("Cannot intersect transform types");
  return IntersectCreate(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/ref/ref.mjs
function Ref(...args) {
  const [$ref, options] = typeof args[0] === "string" ? [args[0], args[1]] : [args[0].$id, args[1]];
  if (typeof $ref !== "string")
    throw new TypeBoxError("Ref: $ref must be a string");
  return CreateType({ [Kind]: "Ref", $ref }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/awaited/awaited.mjs
function FromComputed(target, parameters) {
  return Computed("Awaited", [Computed(target, parameters)]);
}
function FromRef($ref) {
  return Computed("Awaited", [Ref($ref)]);
}
function FromIntersect2(types) {
  return Intersect(FromRest3(types));
}
function FromUnion4(types) {
  return Union(FromRest3(types));
}
function FromPromise(type) {
  return Awaited(type);
}
function FromRest3(types) {
  return types.map((type) => Awaited(type));
}
function Awaited(type, options) {
  return CreateType(IsComputed(type) ? FromComputed(type.target, type.parameters) : IsIntersect(type) ? FromIntersect2(type.allOf) : IsUnion(type) ? FromUnion4(type.anyOf) : IsPromise2(type) ? FromPromise(type.item) : IsRef(type) ? FromRef(type.$ref) : type, options);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-property-keys.mjs
function FromRest4(types) {
  const result = [];
  for (const L of types)
    result.push(KeyOfPropertyKeys(L));
  return result;
}
function FromIntersect3(types) {
  const propertyKeysArray = FromRest4(types);
  const propertyKeys = SetUnionMany(propertyKeysArray);
  return propertyKeys;
}
function FromUnion5(types) {
  const propertyKeysArray = FromRest4(types);
  const propertyKeys = SetIntersectMany(propertyKeysArray);
  return propertyKeys;
}
function FromTuple2(types) {
  return types.map((_, indexer) => indexer.toString());
}
function FromArray2(_) {
  return ["[number]"];
}
function FromProperties5(T) {
  return globalThis.Object.getOwnPropertyNames(T);
}
function FromPatternProperties(patternProperties) {
  if (!includePatternProperties)
    return [];
  const patternPropertyKeys = globalThis.Object.getOwnPropertyNames(patternProperties);
  return patternPropertyKeys.map((key) => {
    return key[0] === "^" && key[key.length - 1] === "$" ? key.slice(1, key.length - 1) : key;
  });
}
function KeyOfPropertyKeys(type) {
  return IsIntersect(type) ? FromIntersect3(type.allOf) : IsUnion(type) ? FromUnion5(type.anyOf) : IsTuple(type) ? FromTuple2(type.items ?? []) : IsArray3(type) ? FromArray2(type.items) : IsObject3(type) ? FromProperties5(type.properties) : IsRecord(type) ? FromPatternProperties(type.patternProperties) : [];
}
var includePatternProperties = false;
function KeyOfPattern(schema) {
  includePatternProperties = true;
  const keys = KeyOfPropertyKeys(schema);
  includePatternProperties = false;
  const pattern = keys.map((key) => `(${key})`);
  return `^(${pattern.join("|")})$`;
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof.mjs
function FromComputed2(target, parameters) {
  return Computed("KeyOf", [Computed(target, parameters)]);
}
function FromRef2($ref) {
  return Computed("KeyOf", [Ref($ref)]);
}
function KeyOfFromType(type, options) {
  const propertyKeys = KeyOfPropertyKeys(type);
  const propertyKeyTypes = KeyOfPropertyKeysToRest(propertyKeys);
  const result = UnionEvaluated(propertyKeyTypes);
  return CreateType(result, options);
}
function KeyOfPropertyKeysToRest(propertyKeys) {
  return propertyKeys.map((L) => L === "[number]" ? Number2() : Literal(L));
}
function KeyOf(type, options) {
  return IsComputed(type) ? FromComputed2(type.target, type.parameters) : IsRef(type) ? FromRef2(type.$ref) : IsMappedResult(type) ? KeyOfFromMappedResult(type, options) : KeyOfFromType(type, options);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-from-mapped-result.mjs
function FromProperties6(properties, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = KeyOf(properties[K2], Clone(options));
  return result;
}
function FromMappedResult5(mappedResult, options) {
  return FromProperties6(mappedResult.properties, options);
}
function KeyOfFromMappedResult(mappedResult, options) {
  const properties = FromMappedResult5(mappedResult, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-property-entries.mjs
function KeyOfPropertyEntries(schema) {
  const keys = KeyOfPropertyKeys(schema);
  const schemas = IndexFromPropertyKeys(schema, keys);
  return keys.map((_, index) => [keys[index], schemas[index]]);
}

// node_modules/@sinclair/typebox/build/esm/type/composite/composite.mjs
function CompositeKeys(T) {
  const Acc = [];
  for (const L of T)
    Acc.push(...KeyOfPropertyKeys(L));
  return SetDistinct(Acc);
}
function FilterNever(T) {
  return T.filter((L) => !IsNever(L));
}
function CompositeProperty(T, K) {
  const Acc = [];
  for (const L of T)
    Acc.push(...IndexFromPropertyKeys(L, [K]));
  return FilterNever(Acc);
}
function CompositeProperties(T, K) {
  const Acc = {};
  for (const L of K) {
    Acc[L] = IntersectEvaluated(CompositeProperty(T, L));
  }
  return Acc;
}
function Composite(T, options) {
  const K = CompositeKeys(T);
  const P = CompositeProperties(T, K);
  const R = Object2(P, options);
  return R;
}

// node_modules/@sinclair/typebox/build/esm/type/date/date.mjs
function Date2(options) {
  return CreateType({ [Kind]: "Date", type: "Date" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/null/null.mjs
function Null(options) {
  return CreateType({ [Kind]: "Null", type: "null" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/symbol/symbol.mjs
function Symbol2(options) {
  return CreateType({ [Kind]: "Symbol", type: "symbol" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/undefined/undefined.mjs
function Undefined(options) {
  return CreateType({ [Kind]: "Undefined", type: "undefined" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/uint8array/uint8array.mjs
function Uint8Array2(options) {
  return CreateType({ [Kind]: "Uint8Array", type: "Uint8Array" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/unknown/unknown.mjs
function Unknown(options) {
  return CreateType({ [Kind]: "Unknown" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/const/const.mjs
function FromArray3(T) {
  return T.map((L) => FromValue(L, false));
}
function FromProperties7(value) {
  const Acc = {};
  for (const K of globalThis.Object.getOwnPropertyNames(value))
    Acc[K] = Readonly(FromValue(value[K], false));
  return Acc;
}
function ConditionalReadonly(T, root) {
  return root === true ? T : Readonly(T);
}
function FromValue(value, root) {
  return IsAsyncIterator(value) ? ConditionalReadonly(Any(), root) : IsIterator(value) ? ConditionalReadonly(Any(), root) : IsArray(value) ? Readonly(Tuple(FromArray3(value))) : IsUint8Array(value) ? Uint8Array2() : IsDate(value) ? Date2() : IsObject(value) ? ConditionalReadonly(Object2(FromProperties7(value)), root) : IsFunction(value) ? ConditionalReadonly(Function2([], Unknown()), root) : IsUndefined(value) ? Undefined() : IsNull(value) ? Null() : IsSymbol(value) ? Symbol2() : IsBigInt(value) ? BigInt2() : IsNumber(value) ? Literal(value) : IsBoolean(value) ? Literal(value) : IsString(value) ? Literal(value) : Object2({});
}
function Const(T, options) {
  return CreateType(FromValue(T, true), options);
}

// node_modules/@sinclair/typebox/build/esm/type/constructor-parameters/constructor-parameters.mjs
function ConstructorParameters(schema, options) {
  return IsConstructor(schema) ? Tuple(schema.parameters, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/enum/enum.mjs
function Enum(item, options) {
  if (IsUndefined(item))
    throw new Error("Enum undefined or empty");
  const values1 = globalThis.Object.getOwnPropertyNames(item).filter((key) => isNaN(key)).map((key) => item[key]);
  const values2 = [...new Set(values1)];
  const anyOf = values2.map((value) => Literal(value));
  return Union(anyOf, { ...options, [Hint]: "Enum" });
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-check.mjs
class ExtendsResolverError extends TypeBoxError {
}
var ExtendsResult;
(function(ExtendsResult2) {
  ExtendsResult2[ExtendsResult2["Union"] = 0] = "Union";
  ExtendsResult2[ExtendsResult2["True"] = 1] = "True";
  ExtendsResult2[ExtendsResult2["False"] = 2] = "False";
})(ExtendsResult || (ExtendsResult = {}));
function IntoBooleanResult(result) {
  return result === ExtendsResult.False ? result : ExtendsResult.True;
}
function Throw(message) {
  throw new ExtendsResolverError(message);
}
function IsStructuralRight(right) {
  return exports_type.IsNever(right) || exports_type.IsIntersect(right) || exports_type.IsUnion(right) || exports_type.IsUnknown(right) || exports_type.IsAny(right);
}
function StructuralRight(left, right) {
  return exports_type.IsNever(right) ? FromNeverRight(left, right) : exports_type.IsIntersect(right) ? FromIntersectRight(left, right) : exports_type.IsUnion(right) ? FromUnionRight(left, right) : exports_type.IsUnknown(right) ? FromUnknownRight(left, right) : exports_type.IsAny(right) ? FromAnyRight(left, right) : Throw("StructuralRight");
}
function FromAnyRight(left, right) {
  return ExtendsResult.True;
}
function FromAny(left, right) {
  return exports_type.IsIntersect(right) ? FromIntersectRight(left, right) : exports_type.IsUnion(right) && right.anyOf.some((schema) => exports_type.IsAny(schema) || exports_type.IsUnknown(schema)) ? ExtendsResult.True : exports_type.IsUnion(right) ? ExtendsResult.Union : exports_type.IsUnknown(right) ? ExtendsResult.True : exports_type.IsAny(right) ? ExtendsResult.True : ExtendsResult.Union;
}
function FromArrayRight(left, right) {
  return exports_type.IsUnknown(left) ? ExtendsResult.False : exports_type.IsAny(left) ? ExtendsResult.Union : exports_type.IsNever(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromArray4(left, right) {
  return exports_type.IsObject(right) && IsObjectArrayLike(right) ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : !exports_type.IsArray(right) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.items, right.items));
}
function FromAsyncIterator(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : !exports_type.IsAsyncIterator(right) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.items, right.items));
}
function FromBigInt(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsBigInt(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromBooleanRight(left, right) {
  return exports_type.IsLiteralBoolean(left) ? ExtendsResult.True : exports_type.IsBoolean(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromBoolean(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsBoolean(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromConstructor(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : !exports_type.IsConstructor(right) ? ExtendsResult.False : left.parameters.length > right.parameters.length ? ExtendsResult.False : !left.parameters.every((schema, index) => IntoBooleanResult(Visit3(right.parameters[index], schema)) === ExtendsResult.True) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.returns, right.returns));
}
function FromDate(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsDate(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromFunction(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : !exports_type.IsFunction(right) ? ExtendsResult.False : left.parameters.length > right.parameters.length ? ExtendsResult.False : !left.parameters.every((schema, index) => IntoBooleanResult(Visit3(right.parameters[index], schema)) === ExtendsResult.True) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.returns, right.returns));
}
function FromIntegerRight(left, right) {
  return exports_type.IsLiteral(left) && exports_value.IsNumber(left.const) ? ExtendsResult.True : exports_type.IsNumber(left) || exports_type.IsInteger(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromInteger(left, right) {
  return exports_type.IsInteger(right) || exports_type.IsNumber(right) ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : ExtendsResult.False;
}
function FromIntersectRight(left, right) {
  return right.allOf.every((schema) => Visit3(left, schema) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromIntersect4(left, right) {
  return left.allOf.some((schema) => Visit3(schema, right) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromIterator(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : !exports_type.IsIterator(right) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.items, right.items));
}
function FromLiteral2(left, right) {
  return exports_type.IsLiteral(right) && right.const === left.const ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsString(right) ? FromStringRight(left, right) : exports_type.IsNumber(right) ? FromNumberRight(left, right) : exports_type.IsInteger(right) ? FromIntegerRight(left, right) : exports_type.IsBoolean(right) ? FromBooleanRight(left, right) : ExtendsResult.False;
}
function FromNeverRight(left, right) {
  return ExtendsResult.False;
}
function FromNever(left, right) {
  return ExtendsResult.True;
}
function UnwrapTNot(schema) {
  let [current, depth] = [schema, 0];
  while (true) {
    if (!exports_type.IsNot(current))
      break;
    current = current.not;
    depth += 1;
  }
  return depth % 2 === 0 ? current : Unknown();
}
function FromNot(left, right) {
  return exports_type.IsNot(left) ? Visit3(UnwrapTNot(left), right) : exports_type.IsNot(right) ? Visit3(left, UnwrapTNot(right)) : Throw("Invalid fallthrough for Not");
}
function FromNull(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsNull(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromNumberRight(left, right) {
  return exports_type.IsLiteralNumber(left) ? ExtendsResult.True : exports_type.IsNumber(left) || exports_type.IsInteger(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromNumber(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsInteger(right) || exports_type.IsNumber(right) ? ExtendsResult.True : ExtendsResult.False;
}
function IsObjectPropertyCount(schema, count) {
  return Object.getOwnPropertyNames(schema.properties).length === count;
}
function IsObjectStringLike(schema) {
  return IsObjectArrayLike(schema);
}
function IsObjectSymbolLike(schema) {
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "description" in schema.properties && exports_type.IsUnion(schema.properties.description) && schema.properties.description.anyOf.length === 2 && (exports_type.IsString(schema.properties.description.anyOf[0]) && exports_type.IsUndefined(schema.properties.description.anyOf[1]) || exports_type.IsString(schema.properties.description.anyOf[1]) && exports_type.IsUndefined(schema.properties.description.anyOf[0]));
}
function IsObjectNumberLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectBooleanLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectBigIntLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectDateLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectUint8ArrayLike(schema) {
  return IsObjectArrayLike(schema);
}
function IsObjectFunctionLike(schema) {
  const length = Number2();
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "length" in schema.properties && IntoBooleanResult(Visit3(schema.properties["length"], length)) === ExtendsResult.True;
}
function IsObjectConstructorLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectArrayLike(schema) {
  const length = Number2();
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "length" in schema.properties && IntoBooleanResult(Visit3(schema.properties["length"], length)) === ExtendsResult.True;
}
function IsObjectPromiseLike(schema) {
  const then = Function2([Any()], Any());
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "then" in schema.properties && IntoBooleanResult(Visit3(schema.properties["then"], then)) === ExtendsResult.True;
}
function Property(left, right) {
  return Visit3(left, right) === ExtendsResult.False ? ExtendsResult.False : exports_type.IsOptional(left) && !exports_type.IsOptional(right) ? ExtendsResult.False : ExtendsResult.True;
}
function FromObjectRight(left, right) {
  return exports_type.IsUnknown(left) ? ExtendsResult.False : exports_type.IsAny(left) ? ExtendsResult.Union : exports_type.IsNever(left) || exports_type.IsLiteralString(left) && IsObjectStringLike(right) || exports_type.IsLiteralNumber(left) && IsObjectNumberLike(right) || exports_type.IsLiteralBoolean(left) && IsObjectBooleanLike(right) || exports_type.IsSymbol(left) && IsObjectSymbolLike(right) || exports_type.IsBigInt(left) && IsObjectBigIntLike(right) || exports_type.IsString(left) && IsObjectStringLike(right) || exports_type.IsSymbol(left) && IsObjectSymbolLike(right) || exports_type.IsNumber(left) && IsObjectNumberLike(right) || exports_type.IsInteger(left) && IsObjectNumberLike(right) || exports_type.IsBoolean(left) && IsObjectBooleanLike(right) || exports_type.IsUint8Array(left) && IsObjectUint8ArrayLike(right) || exports_type.IsDate(left) && IsObjectDateLike(right) || exports_type.IsConstructor(left) && IsObjectConstructorLike(right) || exports_type.IsFunction(left) && IsObjectFunctionLike(right) ? ExtendsResult.True : exports_type.IsRecord(left) && exports_type.IsString(RecordKey(left)) ? (() => {
    return right[Hint] === "Record" ? ExtendsResult.True : ExtendsResult.False;
  })() : exports_type.IsRecord(left) && exports_type.IsNumber(RecordKey(left)) ? (() => {
    return IsObjectPropertyCount(right, 0) ? ExtendsResult.True : ExtendsResult.False;
  })() : ExtendsResult.False;
}
function FromObject(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : !exports_type.IsObject(right) ? ExtendsResult.False : (() => {
    for (const key of Object.getOwnPropertyNames(right.properties)) {
      if (!(key in left.properties) && !exports_type.IsOptional(right.properties[key])) {
        return ExtendsResult.False;
      }
      if (exports_type.IsOptional(right.properties[key])) {
        return ExtendsResult.True;
      }
      if (Property(left.properties[key], right.properties[key]) === ExtendsResult.False) {
        return ExtendsResult.False;
      }
    }
    return ExtendsResult.True;
  })();
}
function FromPromise2(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) && IsObjectPromiseLike(right) ? ExtendsResult.True : !exports_type.IsPromise(right) ? ExtendsResult.False : IntoBooleanResult(Visit3(left.item, right.item));
}
function RecordKey(schema) {
  return PatternNumberExact in schema.patternProperties ? Number2() : (PatternStringExact in schema.patternProperties) ? String2() : Throw("Unknown record key pattern");
}
function RecordValue(schema) {
  return PatternNumberExact in schema.patternProperties ? schema.patternProperties[PatternNumberExact] : (PatternStringExact in schema.patternProperties) ? schema.patternProperties[PatternStringExact] : Throw("Unable to get record value schema");
}
function FromRecordRight(left, right) {
  const [Key, Value] = [RecordKey(right), RecordValue(right)];
  return exports_type.IsLiteralString(left) && exports_type.IsNumber(Key) && IntoBooleanResult(Visit3(left, Value)) === ExtendsResult.True ? ExtendsResult.True : exports_type.IsUint8Array(left) && exports_type.IsNumber(Key) ? Visit3(left, Value) : exports_type.IsString(left) && exports_type.IsNumber(Key) ? Visit3(left, Value) : exports_type.IsArray(left) && exports_type.IsNumber(Key) ? Visit3(left, Value) : exports_type.IsObject(left) ? (() => {
    for (const key of Object.getOwnPropertyNames(left.properties)) {
      if (Property(Value, left.properties[key]) === ExtendsResult.False) {
        return ExtendsResult.False;
      }
    }
    return ExtendsResult.True;
  })() : ExtendsResult.False;
}
function FromRecord(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : !exports_type.IsRecord(right) ? ExtendsResult.False : Visit3(RecordValue(left), RecordValue(right));
}
function FromRegExp(left, right) {
  const L = exports_type.IsRegExp(left) ? String2() : left;
  const R = exports_type.IsRegExp(right) ? String2() : right;
  return Visit3(L, R);
}
function FromStringRight(left, right) {
  return exports_type.IsLiteral(left) && exports_value.IsString(left.const) ? ExtendsResult.True : exports_type.IsString(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromString(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsString(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromSymbol(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsSymbol(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromTemplateLiteral2(left, right) {
  return exports_type.IsTemplateLiteral(left) ? Visit3(TemplateLiteralToUnion(left), right) : exports_type.IsTemplateLiteral(right) ? Visit3(left, TemplateLiteralToUnion(right)) : Throw("Invalid fallthrough for TemplateLiteral");
}
function IsArrayOfTuple(left, right) {
  return exports_type.IsArray(right) && left.items !== undefined && left.items.every((schema) => Visit3(schema, right.items) === ExtendsResult.True);
}
function FromTupleRight(left, right) {
  return exports_type.IsNever(left) ? ExtendsResult.True : exports_type.IsUnknown(left) ? ExtendsResult.False : exports_type.IsAny(left) ? ExtendsResult.Union : ExtendsResult.False;
}
function FromTuple3(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) && IsObjectArrayLike(right) ? ExtendsResult.True : exports_type.IsArray(right) && IsArrayOfTuple(left, right) ? ExtendsResult.True : !exports_type.IsTuple(right) ? ExtendsResult.False : exports_value.IsUndefined(left.items) && !exports_value.IsUndefined(right.items) || !exports_value.IsUndefined(left.items) && exports_value.IsUndefined(right.items) ? ExtendsResult.False : exports_value.IsUndefined(left.items) && !exports_value.IsUndefined(right.items) ? ExtendsResult.True : left.items.every((schema, index) => Visit3(schema, right.items[index]) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUint8Array(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsUint8Array(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUndefined(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsRecord(right) ? FromRecordRight(left, right) : exports_type.IsVoid(right) ? FromVoidRight(left, right) : exports_type.IsUndefined(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnionRight(left, right) {
  return right.anyOf.some((schema) => Visit3(left, schema) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnion6(left, right) {
  return left.anyOf.every((schema) => Visit3(schema, right) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnknownRight(left, right) {
  return ExtendsResult.True;
}
function FromUnknown(left, right) {
  return exports_type.IsNever(right) ? FromNeverRight(left, right) : exports_type.IsIntersect(right) ? FromIntersectRight(left, right) : exports_type.IsUnion(right) ? FromUnionRight(left, right) : exports_type.IsAny(right) ? FromAnyRight(left, right) : exports_type.IsString(right) ? FromStringRight(left, right) : exports_type.IsNumber(right) ? FromNumberRight(left, right) : exports_type.IsInteger(right) ? FromIntegerRight(left, right) : exports_type.IsBoolean(right) ? FromBooleanRight(left, right) : exports_type.IsArray(right) ? FromArrayRight(left, right) : exports_type.IsTuple(right) ? FromTupleRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsUnknown(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromVoidRight(left, right) {
  return exports_type.IsUndefined(left) ? ExtendsResult.True : exports_type.IsUndefined(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromVoid(left, right) {
  return exports_type.IsIntersect(right) ? FromIntersectRight(left, right) : exports_type.IsUnion(right) ? FromUnionRight(left, right) : exports_type.IsUnknown(right) ? FromUnknownRight(left, right) : exports_type.IsAny(right) ? FromAnyRight(left, right) : exports_type.IsObject(right) ? FromObjectRight(left, right) : exports_type.IsVoid(right) ? ExtendsResult.True : ExtendsResult.False;
}
function Visit3(left, right) {
  return exports_type.IsTemplateLiteral(left) || exports_type.IsTemplateLiteral(right) ? FromTemplateLiteral2(left, right) : exports_type.IsRegExp(left) || exports_type.IsRegExp(right) ? FromRegExp(left, right) : exports_type.IsNot(left) || exports_type.IsNot(right) ? FromNot(left, right) : exports_type.IsAny(left) ? FromAny(left, right) : exports_type.IsArray(left) ? FromArray4(left, right) : exports_type.IsBigInt(left) ? FromBigInt(left, right) : exports_type.IsBoolean(left) ? FromBoolean(left, right) : exports_type.IsAsyncIterator(left) ? FromAsyncIterator(left, right) : exports_type.IsConstructor(left) ? FromConstructor(left, right) : exports_type.IsDate(left) ? FromDate(left, right) : exports_type.IsFunction(left) ? FromFunction(left, right) : exports_type.IsInteger(left) ? FromInteger(left, right) : exports_type.IsIntersect(left) ? FromIntersect4(left, right) : exports_type.IsIterator(left) ? FromIterator(left, right) : exports_type.IsLiteral(left) ? FromLiteral2(left, right) : exports_type.IsNever(left) ? FromNever(left, right) : exports_type.IsNull(left) ? FromNull(left, right) : exports_type.IsNumber(left) ? FromNumber(left, right) : exports_type.IsObject(left) ? FromObject(left, right) : exports_type.IsRecord(left) ? FromRecord(left, right) : exports_type.IsString(left) ? FromString(left, right) : exports_type.IsSymbol(left) ? FromSymbol(left, right) : exports_type.IsTuple(left) ? FromTuple3(left, right) : exports_type.IsPromise(left) ? FromPromise2(left, right) : exports_type.IsUint8Array(left) ? FromUint8Array(left, right) : exports_type.IsUndefined(left) ? FromUndefined(left, right) : exports_type.IsUnion(left) ? FromUnion6(left, right) : exports_type.IsUnknown(left) ? FromUnknown(left, right) : exports_type.IsVoid(left) ? FromVoid(left, right) : Throw(`Unknown left type operand '${left[Kind]}'`);
}
function ExtendsCheck(left, right) {
  return Visit3(left, right);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-from-mapped-result.mjs
function FromProperties8(P, Right, True, False, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Extends(P[K2], Right, True, False, Clone(options));
  return Acc;
}
function FromMappedResult6(Left, Right, True, False, options) {
  return FromProperties8(Left.properties, Right, True, False, options);
}
function ExtendsFromMappedResult(Left, Right, True, False, options) {
  const P = FromMappedResult6(Left, Right, True, False, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends.mjs
function ExtendsResolve(left, right, trueType, falseType) {
  const R = ExtendsCheck(left, right);
  return R === ExtendsResult.Union ? Union([trueType, falseType]) : R === ExtendsResult.True ? trueType : falseType;
}
function Extends(L, R, T, F, options) {
  return IsMappedResult(L) ? ExtendsFromMappedResult(L, R, T, F, options) : IsMappedKey(L) ? CreateType(ExtendsFromMappedKey(L, R, T, F, options)) : CreateType(ExtendsResolve(L, R, T, F), options);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-from-mapped-key.mjs
function FromPropertyKey(K, U, L, R, options) {
  return {
    [K]: Extends(Literal(K), U, L, R, Clone(options))
  };
}
function FromPropertyKeys(K, U, L, R, options) {
  return K.reduce((Acc, LK) => {
    return { ...Acc, ...FromPropertyKey(LK, U, L, R, options) };
  }, {});
}
function FromMappedKey2(K, U, L, R, options) {
  return FromPropertyKeys(K.keys, U, L, R, options);
}
function ExtendsFromMappedKey(T, U, L, R, options) {
  const P = FromMappedKey2(T, U, L, R, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-undefined.mjs
function Intersect2(schema) {
  return schema.allOf.every((schema2) => ExtendsUndefinedCheck(schema2));
}
function Union2(schema) {
  return schema.anyOf.some((schema2) => ExtendsUndefinedCheck(schema2));
}
function Not(schema) {
  return !ExtendsUndefinedCheck(schema.not);
}
function ExtendsUndefinedCheck(schema) {
  return schema[Kind] === "Intersect" ? Intersect2(schema) : schema[Kind] === "Union" ? Union2(schema) : schema[Kind] === "Not" ? Not(schema) : schema[Kind] === "Undefined" ? true : false;
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude-from-template-literal.mjs
function ExcludeFromTemplateLiteral(L, R) {
  return Exclude(TemplateLiteralToUnion(L), R);
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude.mjs
function ExcludeRest(L, R) {
  const excluded = L.filter((inner) => ExtendsCheck(inner, R) === ExtendsResult.False);
  return excluded.length === 1 ? excluded[0] : Union(excluded);
}
function Exclude(L, R, options = {}) {
  if (IsTemplateLiteral(L))
    return CreateType(ExcludeFromTemplateLiteral(L, R), options);
  if (IsMappedResult(L))
    return CreateType(ExcludeFromMappedResult(L, R), options);
  return CreateType(IsUnion(L) ? ExcludeRest(L.anyOf, R) : ExtendsCheck(L, R) !== ExtendsResult.False ? Never() : L, options);
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude-from-mapped-result.mjs
function FromProperties9(P, U) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Exclude(P[K2], U);
  return Acc;
}
function FromMappedResult7(R, T) {
  return FromProperties9(R.properties, T);
}
function ExcludeFromMappedResult(R, T) {
  const P = FromMappedResult7(R, T);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract-from-template-literal.mjs
function ExtractFromTemplateLiteral(L, R) {
  return Extract(TemplateLiteralToUnion(L), R);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract.mjs
function ExtractRest(L, R) {
  const extracted = L.filter((inner) => ExtendsCheck(inner, R) !== ExtendsResult.False);
  return extracted.length === 1 ? extracted[0] : Union(extracted);
}
function Extract(L, R, options) {
  if (IsTemplateLiteral(L))
    return CreateType(ExtractFromTemplateLiteral(L, R), options);
  if (IsMappedResult(L))
    return CreateType(ExtractFromMappedResult(L, R), options);
  return CreateType(IsUnion(L) ? ExtractRest(L.anyOf, R) : ExtendsCheck(L, R) !== ExtendsResult.False ? L : Never(), options);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract-from-mapped-result.mjs
function FromProperties10(P, T) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Extract(P[K2], T);
  return Acc;
}
function FromMappedResult8(R, T) {
  return FromProperties10(R.properties, T);
}
function ExtractFromMappedResult(R, T) {
  const P = FromMappedResult8(R, T);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/instance-type/instance-type.mjs
function InstanceType(schema, options) {
  return IsConstructor(schema) ? CreateType(schema.returns, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly-optional/readonly-optional.mjs
function ReadonlyOptional(schema) {
  return Readonly(Optional(schema));
}

// node_modules/@sinclair/typebox/build/esm/type/record/record.mjs
function RecordCreateFromPattern(pattern, T, options) {
  return CreateType({ [Kind]: "Record", type: "object", patternProperties: { [pattern]: T } }, options);
}
function RecordCreateFromKeys(K, T, options) {
  const result = {};
  for (const K2 of K)
    result[K2] = T;
  return Object2(result, { ...options, [Hint]: "Record" });
}
function FromTemplateLiteralKey(K, T, options) {
  return IsTemplateLiteralFinite(K) ? RecordCreateFromKeys(IndexPropertyKeys(K), T, options) : RecordCreateFromPattern(K.pattern, T, options);
}
function FromUnionKey(key, type, options) {
  return RecordCreateFromKeys(IndexPropertyKeys(Union(key)), type, options);
}
function FromLiteralKey(key, type, options) {
  return RecordCreateFromKeys([key.toString()], type, options);
}
function FromRegExpKey(key, type, options) {
  return RecordCreateFromPattern(key.source, type, options);
}
function FromStringKey(key, type, options) {
  const pattern = IsUndefined(key.pattern) ? PatternStringExact : key.pattern;
  return RecordCreateFromPattern(pattern, type, options);
}
function FromAnyKey(_, type, options) {
  return RecordCreateFromPattern(PatternStringExact, type, options);
}
function FromNeverKey(_key, type, options) {
  return RecordCreateFromPattern(PatternNeverExact, type, options);
}
function FromBooleanKey(_key, type, options) {
  return Object2({ true: type, false: type }, options);
}
function FromIntegerKey(_key, type, options) {
  return RecordCreateFromPattern(PatternNumberExact, type, options);
}
function FromNumberKey(_, type, options) {
  return RecordCreateFromPattern(PatternNumberExact, type, options);
}
function Record(key, type, options = {}) {
  return IsUnion(key) ? FromUnionKey(key.anyOf, type, options) : IsTemplateLiteral(key) ? FromTemplateLiteralKey(key, type, options) : IsLiteral(key) ? FromLiteralKey(key.const, type, options) : IsBoolean3(key) ? FromBooleanKey(key, type, options) : IsInteger2(key) ? FromIntegerKey(key, type, options) : IsNumber3(key) ? FromNumberKey(key, type, options) : IsRegExp2(key) ? FromRegExpKey(key, type, options) : IsString3(key) ? FromStringKey(key, type, options) : IsAny(key) ? FromAnyKey(key, type, options) : IsNever(key) ? FromNeverKey(key, type, options) : Never(options);
}
function RecordPattern(record) {
  return globalThis.Object.getOwnPropertyNames(record.patternProperties)[0];
}
function RecordKey2(type) {
  const pattern = RecordPattern(type);
  return pattern === PatternStringExact ? String2() : pattern === PatternNumberExact ? Number2() : String2({ pattern });
}
function RecordValue2(type) {
  return type.patternProperties[RecordPattern(type)];
}

// node_modules/@sinclair/typebox/build/esm/type/instantiate/instantiate.mjs
function FromConstructor2(args, type) {
  type.parameters = FromTypes(args, type.parameters);
  type.returns = FromType(args, type.returns);
  return type;
}
function FromFunction2(args, type) {
  type.parameters = FromTypes(args, type.parameters);
  type.returns = FromType(args, type.returns);
  return type;
}
function FromIntersect5(args, type) {
  type.allOf = FromTypes(args, type.allOf);
  return type;
}
function FromUnion7(args, type) {
  type.anyOf = FromTypes(args, type.anyOf);
  return type;
}
function FromTuple4(args, type) {
  if (IsUndefined(type.items))
    return type;
  type.items = FromTypes(args, type.items);
  return type;
}
function FromArray5(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromAsyncIterator2(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromIterator2(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromPromise3(args, type) {
  type.item = FromType(args, type.item);
  return type;
}
function FromObject2(args, type) {
  const mappedProperties = FromProperties11(args, type.properties);
  return { ...type, ...Object2(mappedProperties) };
}
function FromRecord2(args, type) {
  const mappedKey = FromType(args, RecordKey2(type));
  const mappedValue = FromType(args, RecordValue2(type));
  const result = Record(mappedKey, mappedValue);
  return { ...type, ...result };
}
function FromArgument(args, argument) {
  return argument.index in args ? args[argument.index] : Unknown();
}
function FromProperty2(args, type) {
  const isReadonly = IsReadonly(type);
  const isOptional = IsOptional(type);
  const mapped = FromType(args, type);
  return isReadonly && isOptional ? ReadonlyOptional(mapped) : isReadonly && !isOptional ? Readonly(mapped) : !isReadonly && isOptional ? Optional(mapped) : mapped;
}
function FromProperties11(args, properties) {
  return globalThis.Object.getOwnPropertyNames(properties).reduce((result, key) => {
    return { ...result, [key]: FromProperty2(args, properties[key]) };
  }, {});
}
function FromTypes(args, types) {
  return types.map((type) => FromType(args, type));
}
function FromType(args, type) {
  return IsConstructor(type) ? FromConstructor2(args, type) : IsFunction3(type) ? FromFunction2(args, type) : IsIntersect(type) ? FromIntersect5(args, type) : IsUnion(type) ? FromUnion7(args, type) : IsTuple(type) ? FromTuple4(args, type) : IsArray3(type) ? FromArray5(args, type) : IsAsyncIterator3(type) ? FromAsyncIterator2(args, type) : IsIterator3(type) ? FromIterator2(args, type) : IsPromise2(type) ? FromPromise3(args, type) : IsObject3(type) ? FromObject2(args, type) : IsRecord(type) ? FromRecord2(args, type) : IsArgument(type) ? FromArgument(args, type) : type;
}
function Instantiate(type, args) {
  return FromType(args, CloneType(type));
}

// node_modules/@sinclair/typebox/build/esm/type/integer/integer.mjs
function Integer(options) {
  return CreateType({ [Kind]: "Integer", type: "integer" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/intrinsic-from-mapped-key.mjs
function MappedIntrinsicPropertyKey(K, M, options) {
  return {
    [K]: Intrinsic(Literal(K), M, Clone(options))
  };
}
function MappedIntrinsicPropertyKeys(K, M, options) {
  const result = K.reduce((Acc, L) => {
    return { ...Acc, ...MappedIntrinsicPropertyKey(L, M, options) };
  }, {});
  return result;
}
function MappedIntrinsicProperties(T, M, options) {
  return MappedIntrinsicPropertyKeys(T["keys"], M, options);
}
function IntrinsicFromMappedKey(T, M, options) {
  const P = MappedIntrinsicProperties(T, M, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/intrinsic.mjs
function ApplyUncapitalize(value) {
  const [first, rest] = [value.slice(0, 1), value.slice(1)];
  return [first.toLowerCase(), rest].join("");
}
function ApplyCapitalize(value) {
  const [first, rest] = [value.slice(0, 1), value.slice(1)];
  return [first.toUpperCase(), rest].join("");
}
function ApplyUppercase(value) {
  return value.toUpperCase();
}
function ApplyLowercase(value) {
  return value.toLowerCase();
}
function FromTemplateLiteral3(schema, mode, options) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  const finite = IsTemplateLiteralExpressionFinite(expression);
  if (!finite)
    return { ...schema, pattern: FromLiteralValue(schema.pattern, mode) };
  const strings = [...TemplateLiteralExpressionGenerate(expression)];
  const literals = strings.map((value) => Literal(value));
  const mapped = FromRest5(literals, mode);
  const union = Union(mapped);
  return TemplateLiteral([union], options);
}
function FromLiteralValue(value, mode) {
  return typeof value === "string" ? mode === "Uncapitalize" ? ApplyUncapitalize(value) : mode === "Capitalize" ? ApplyCapitalize(value) : mode === "Uppercase" ? ApplyUppercase(value) : mode === "Lowercase" ? ApplyLowercase(value) : value : value.toString();
}
function FromRest5(T, M) {
  return T.map((L) => Intrinsic(L, M));
}
function Intrinsic(schema, mode, options = {}) {
  return IsMappedKey(schema) ? IntrinsicFromMappedKey(schema, mode, options) : IsTemplateLiteral(schema) ? FromTemplateLiteral3(schema, mode, options) : IsUnion(schema) ? Union(FromRest5(schema.anyOf, mode), options) : IsLiteral(schema) ? Literal(FromLiteralValue(schema.const, mode), options) : CreateType(schema, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/capitalize.mjs
function Capitalize(T, options = {}) {
  return Intrinsic(T, "Capitalize", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/lowercase.mjs
function Lowercase(T, options = {}) {
  return Intrinsic(T, "Lowercase", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/uncapitalize.mjs
function Uncapitalize(T, options = {}) {
  return Intrinsic(T, "Uncapitalize", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/uppercase.mjs
function Uppercase(T, options = {}) {
  return Intrinsic(T, "Uppercase", options);
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit-from-mapped-result.mjs
function FromProperties12(properties, propertyKeys, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = Omit(properties[K2], propertyKeys, Clone(options));
  return result;
}
function FromMappedResult9(mappedResult, propertyKeys, options) {
  return FromProperties12(mappedResult.properties, propertyKeys, options);
}
function OmitFromMappedResult(mappedResult, propertyKeys, options) {
  const properties = FromMappedResult9(mappedResult, propertyKeys, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit.mjs
function FromIntersect6(types, propertyKeys) {
  return types.map((type) => OmitResolve(type, propertyKeys));
}
function FromUnion8(types, propertyKeys) {
  return types.map((type) => OmitResolve(type, propertyKeys));
}
function FromProperty3(properties, key) {
  const { [key]: _, ...R } = properties;
  return R;
}
function FromProperties13(properties, propertyKeys) {
  return propertyKeys.reduce((T, K2) => FromProperty3(T, K2), properties);
}
function FromObject3(type, propertyKeys, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties13(properties, propertyKeys);
  return Object2(mappedProperties, options);
}
function UnionFromPropertyKeys(propertyKeys) {
  const result = propertyKeys.reduce((result2, key) => IsLiteralValue(key) ? [...result2, Literal(key)] : result2, []);
  return Union(result);
}
function OmitResolve(type, propertyKeys) {
  return IsIntersect(type) ? Intersect(FromIntersect6(type.allOf, propertyKeys)) : IsUnion(type) ? Union(FromUnion8(type.anyOf, propertyKeys)) : IsObject3(type) ? FromObject3(type, propertyKeys, type.properties) : Object2({});
}
function Omit(type, key, options) {
  const typeKey = IsArray(key) ? UnionFromPropertyKeys(key) : key;
  const propertyKeys = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const isTypeRef = IsRef(type);
  const isKeyRef = IsRef(key);
  return IsMappedResult(type) ? OmitFromMappedResult(type, propertyKeys, options) : IsMappedKey(key) ? OmitFromMappedKey(type, key, options) : isTypeRef && isKeyRef ? Computed("Omit", [type, typeKey], options) : !isTypeRef && isKeyRef ? Computed("Omit", [type, typeKey], options) : isTypeRef && !isKeyRef ? Computed("Omit", [type, typeKey], options) : CreateType({ ...OmitResolve(type, propertyKeys), ...options });
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit-from-mapped-key.mjs
function FromPropertyKey2(type, key, options) {
  return { [key]: Omit(type, [key], Clone(options)) };
}
function FromPropertyKeys2(type, propertyKeys, options) {
  return propertyKeys.reduce((Acc, LK) => {
    return { ...Acc, ...FromPropertyKey2(type, LK, options) };
  }, {});
}
function FromMappedKey3(type, mappedKey, options) {
  return FromPropertyKeys2(type, mappedKey.keys, options);
}
function OmitFromMappedKey(type, mappedKey, options) {
  const properties = FromMappedKey3(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick-from-mapped-result.mjs
function FromProperties14(properties, propertyKeys, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = Pick(properties[K2], propertyKeys, Clone(options));
  return result;
}
function FromMappedResult10(mappedResult, propertyKeys, options) {
  return FromProperties14(mappedResult.properties, propertyKeys, options);
}
function PickFromMappedResult(mappedResult, propertyKeys, options) {
  const properties = FromMappedResult10(mappedResult, propertyKeys, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick.mjs
function FromIntersect7(types, propertyKeys) {
  return types.map((type) => PickResolve(type, propertyKeys));
}
function FromUnion9(types, propertyKeys) {
  return types.map((type) => PickResolve(type, propertyKeys));
}
function FromProperties15(properties, propertyKeys) {
  const result = {};
  for (const K2 of propertyKeys)
    if (K2 in properties)
      result[K2] = properties[K2];
  return result;
}
function FromObject4(Type, keys, properties) {
  const options = Discard(Type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties15(properties, keys);
  return Object2(mappedProperties, options);
}
function UnionFromPropertyKeys2(propertyKeys) {
  const result = propertyKeys.reduce((result2, key) => IsLiteralValue(key) ? [...result2, Literal(key)] : result2, []);
  return Union(result);
}
function PickResolve(type, propertyKeys) {
  return IsIntersect(type) ? Intersect(FromIntersect7(type.allOf, propertyKeys)) : IsUnion(type) ? Union(FromUnion9(type.anyOf, propertyKeys)) : IsObject3(type) ? FromObject4(type, propertyKeys, type.properties) : Object2({});
}
function Pick(type, key, options) {
  const typeKey = IsArray(key) ? UnionFromPropertyKeys2(key) : key;
  const propertyKeys = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const isTypeRef = IsRef(type);
  const isKeyRef = IsRef(key);
  return IsMappedResult(type) ? PickFromMappedResult(type, propertyKeys, options) : IsMappedKey(key) ? PickFromMappedKey(type, key, options) : isTypeRef && isKeyRef ? Computed("Pick", [type, typeKey], options) : !isTypeRef && isKeyRef ? Computed("Pick", [type, typeKey], options) : isTypeRef && !isKeyRef ? Computed("Pick", [type, typeKey], options) : CreateType({ ...PickResolve(type, propertyKeys), ...options });
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick-from-mapped-key.mjs
function FromPropertyKey3(type, key, options) {
  return {
    [key]: Pick(type, [key], Clone(options))
  };
}
function FromPropertyKeys3(type, propertyKeys, options) {
  return propertyKeys.reduce((result, leftKey) => {
    return { ...result, ...FromPropertyKey3(type, leftKey, options) };
  }, {});
}
function FromMappedKey4(type, mappedKey, options) {
  return FromPropertyKeys3(type, mappedKey.keys, options);
}
function PickFromMappedKey(type, mappedKey, options) {
  const properties = FromMappedKey4(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/partial/partial.mjs
function FromComputed3(target, parameters) {
  return Computed("Partial", [Computed(target, parameters)]);
}
function FromRef3($ref) {
  return Computed("Partial", [Ref($ref)]);
}
function FromProperties16(properties) {
  const partialProperties = {};
  for (const K of globalThis.Object.getOwnPropertyNames(properties))
    partialProperties[K] = Optional(properties[K]);
  return partialProperties;
}
function FromObject5(type, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties16(properties);
  return Object2(mappedProperties, options);
}
function FromRest6(types) {
  return types.map((type) => PartialResolve(type));
}
function PartialResolve(type) {
  return IsComputed(type) ? FromComputed3(type.target, type.parameters) : IsRef(type) ? FromRef3(type.$ref) : IsIntersect(type) ? Intersect(FromRest6(type.allOf)) : IsUnion(type) ? Union(FromRest6(type.anyOf)) : IsObject3(type) ? FromObject5(type, type.properties) : IsBigInt3(type) ? type : IsBoolean3(type) ? type : IsInteger2(type) ? type : IsLiteral(type) ? type : IsNull3(type) ? type : IsNumber3(type) ? type : IsString3(type) ? type : IsSymbol3(type) ? type : IsUndefined3(type) ? type : Object2({});
}
function Partial(type, options) {
  if (IsMappedResult(type)) {
    return PartialFromMappedResult(type, options);
  } else {
    return CreateType({ ...PartialResolve(type), ...options });
  }
}

// node_modules/@sinclair/typebox/build/esm/type/partial/partial-from-mapped-result.mjs
function FromProperties17(K, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(K))
    Acc[K2] = Partial(K[K2], Clone(options));
  return Acc;
}
function FromMappedResult11(R, options) {
  return FromProperties17(R.properties, options);
}
function PartialFromMappedResult(R, options) {
  const P = FromMappedResult11(R, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/required/required.mjs
function FromComputed4(target, parameters) {
  return Computed("Required", [Computed(target, parameters)]);
}
function FromRef4($ref) {
  return Computed("Required", [Ref($ref)]);
}
function FromProperties18(properties) {
  const requiredProperties = {};
  for (const K of globalThis.Object.getOwnPropertyNames(properties))
    requiredProperties[K] = Discard(properties[K], [OptionalKind]);
  return requiredProperties;
}
function FromObject6(type, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties18(properties);
  return Object2(mappedProperties, options);
}
function FromRest7(types) {
  return types.map((type) => RequiredResolve(type));
}
function RequiredResolve(type) {
  return IsComputed(type) ? FromComputed4(type.target, type.parameters) : IsRef(type) ? FromRef4(type.$ref) : IsIntersect(type) ? Intersect(FromRest7(type.allOf)) : IsUnion(type) ? Union(FromRest7(type.anyOf)) : IsObject3(type) ? FromObject6(type, type.properties) : IsBigInt3(type) ? type : IsBoolean3(type) ? type : IsInteger2(type) ? type : IsLiteral(type) ? type : IsNull3(type) ? type : IsNumber3(type) ? type : IsString3(type) ? type : IsSymbol3(type) ? type : IsUndefined3(type) ? type : Object2({});
}
function Required(type, options) {
  if (IsMappedResult(type)) {
    return RequiredFromMappedResult(type, options);
  } else {
    return CreateType({ ...RequiredResolve(type), ...options });
  }
}

// node_modules/@sinclair/typebox/build/esm/type/required/required-from-mapped-result.mjs
function FromProperties19(P, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Required(P[K2], options);
  return Acc;
}
function FromMappedResult12(R, options) {
  return FromProperties19(R.properties, options);
}
function RequiredFromMappedResult(R, options) {
  const P = FromMappedResult12(R, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/module/compute.mjs
function DereferenceParameters(moduleProperties, types) {
  return types.map((type) => {
    return IsRef(type) ? Dereference(moduleProperties, type.$ref) : FromType2(moduleProperties, type);
  });
}
function Dereference(moduleProperties, ref) {
  return ref in moduleProperties ? IsRef(moduleProperties[ref]) ? Dereference(moduleProperties, moduleProperties[ref].$ref) : FromType2(moduleProperties, moduleProperties[ref]) : Never();
}
function FromAwaited(parameters) {
  return Awaited(parameters[0]);
}
function FromIndex(parameters) {
  return Index(parameters[0], parameters[1]);
}
function FromKeyOf(parameters) {
  return KeyOf(parameters[0]);
}
function FromPartial(parameters) {
  return Partial(parameters[0]);
}
function FromOmit(parameters) {
  return Omit(parameters[0], parameters[1]);
}
function FromPick(parameters) {
  return Pick(parameters[0], parameters[1]);
}
function FromRequired(parameters) {
  return Required(parameters[0]);
}
function FromComputed5(moduleProperties, target, parameters) {
  const dereferenced = DereferenceParameters(moduleProperties, parameters);
  return target === "Awaited" ? FromAwaited(dereferenced) : target === "Index" ? FromIndex(dereferenced) : target === "KeyOf" ? FromKeyOf(dereferenced) : target === "Partial" ? FromPartial(dereferenced) : target === "Omit" ? FromOmit(dereferenced) : target === "Pick" ? FromPick(dereferenced) : target === "Required" ? FromRequired(dereferenced) : Never();
}
function FromArray6(moduleProperties, type) {
  return Array2(FromType2(moduleProperties, type));
}
function FromAsyncIterator3(moduleProperties, type) {
  return AsyncIterator(FromType2(moduleProperties, type));
}
function FromConstructor3(moduleProperties, parameters, instanceType) {
  return Constructor(FromTypes2(moduleProperties, parameters), FromType2(moduleProperties, instanceType));
}
function FromFunction3(moduleProperties, parameters, returnType) {
  return Function2(FromTypes2(moduleProperties, parameters), FromType2(moduleProperties, returnType));
}
function FromIntersect8(moduleProperties, types) {
  return Intersect(FromTypes2(moduleProperties, types));
}
function FromIterator3(moduleProperties, type) {
  return Iterator(FromType2(moduleProperties, type));
}
function FromObject7(moduleProperties, properties) {
  return Object2(globalThis.Object.keys(properties).reduce((result, key) => {
    return { ...result, [key]: FromType2(moduleProperties, properties[key]) };
  }, {}));
}
function FromRecord3(moduleProperties, type) {
  const [value, pattern] = [FromType2(moduleProperties, RecordValue2(type)), RecordPattern(type)];
  const result = CloneType(type);
  result.patternProperties[pattern] = value;
  return result;
}
function FromTransform(moduleProperties, transform) {
  return IsRef(transform) ? { ...Dereference(moduleProperties, transform.$ref), [TransformKind]: transform[TransformKind] } : transform;
}
function FromTuple5(moduleProperties, types) {
  return Tuple(FromTypes2(moduleProperties, types));
}
function FromUnion10(moduleProperties, types) {
  return Union(FromTypes2(moduleProperties, types));
}
function FromTypes2(moduleProperties, types) {
  return types.map((type) => FromType2(moduleProperties, type));
}
function FromType2(moduleProperties, type) {
  return IsOptional(type) ? CreateType(FromType2(moduleProperties, Discard(type, [OptionalKind])), type) : IsReadonly(type) ? CreateType(FromType2(moduleProperties, Discard(type, [ReadonlyKind])), type) : IsTransform(type) ? CreateType(FromTransform(moduleProperties, type), type) : IsArray3(type) ? CreateType(FromArray6(moduleProperties, type.items), type) : IsAsyncIterator3(type) ? CreateType(FromAsyncIterator3(moduleProperties, type.items), type) : IsComputed(type) ? CreateType(FromComputed5(moduleProperties, type.target, type.parameters)) : IsConstructor(type) ? CreateType(FromConstructor3(moduleProperties, type.parameters, type.returns), type) : IsFunction3(type) ? CreateType(FromFunction3(moduleProperties, type.parameters, type.returns), type) : IsIntersect(type) ? CreateType(FromIntersect8(moduleProperties, type.allOf), type) : IsIterator3(type) ? CreateType(FromIterator3(moduleProperties, type.items), type) : IsObject3(type) ? CreateType(FromObject7(moduleProperties, type.properties), type) : IsRecord(type) ? CreateType(FromRecord3(moduleProperties, type)) : IsTuple(type) ? CreateType(FromTuple5(moduleProperties, type.items || []), type) : IsUnion(type) ? CreateType(FromUnion10(moduleProperties, type.anyOf), type) : type;
}
function ComputeType(moduleProperties, key) {
  return key in moduleProperties ? FromType2(moduleProperties, moduleProperties[key]) : Never();
}
function ComputeModuleProperties(moduleProperties) {
  return globalThis.Object.getOwnPropertyNames(moduleProperties).reduce((result, key) => {
    return { ...result, [key]: ComputeType(moduleProperties, key) };
  }, {});
}

// node_modules/@sinclair/typebox/build/esm/type/module/module.mjs
class TModule {
  constructor($defs) {
    const computed = ComputeModuleProperties($defs);
    const identified = this.WithIdentifiers(computed);
    this.$defs = identified;
  }
  Import(key, options) {
    const $defs = { ...this.$defs, [key]: CreateType(this.$defs[key], options) };
    return CreateType({ [Kind]: "Import", $defs, $ref: key });
  }
  WithIdentifiers($defs) {
    return globalThis.Object.getOwnPropertyNames($defs).reduce((result, key) => {
      return { ...result, [key]: { ...$defs[key], $id: key } };
    }, {});
  }
}
function Module(properties) {
  return new TModule(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/not/not.mjs
function Not2(type, options) {
  return CreateType({ [Kind]: "Not", not: type }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/parameters/parameters.mjs
function Parameters(schema, options) {
  return IsFunction3(schema) ? Tuple(schema.parameters, options) : Never();
}

// node_modules/@sinclair/typebox/build/esm/type/recursive/recursive.mjs
var Ordinal = 0;
function Recursive(callback, options = {}) {
  if (IsUndefined(options.$id))
    options.$id = `T${Ordinal++}`;
  const thisType = CloneType(callback({ [Kind]: "This", $ref: `${options.$id}` }));
  thisType.$id = options.$id;
  return CreateType({ [Hint]: "Recursive", ...thisType }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/regexp/regexp.mjs
function RegExp2(unresolved, options) {
  const expr = IsString(unresolved) ? new globalThis.RegExp(unresolved) : unresolved;
  return CreateType({ [Kind]: "RegExp", type: "RegExp", source: expr.source, flags: expr.flags }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/rest/rest.mjs
function RestResolve(T) {
  return IsIntersect(T) ? T.allOf : IsUnion(T) ? T.anyOf : IsTuple(T) ? T.items ?? [] : [];
}
function Rest(T) {
  return RestResolve(T);
}

// node_modules/@sinclair/typebox/build/esm/type/return-type/return-type.mjs
function ReturnType(schema, options) {
  return IsFunction3(schema) ? CreateType(schema.returns, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/transform/transform.mjs
class TransformDecodeBuilder {
  constructor(schema) {
    this.schema = schema;
  }
  Decode(decode) {
    return new TransformEncodeBuilder(this.schema, decode);
  }
}

class TransformEncodeBuilder {
  constructor(schema, decode) {
    this.schema = schema;
    this.decode = decode;
  }
  EncodeTransform(encode, schema) {
    const Encode = (value) => schema[TransformKind].Encode(encode(value));
    const Decode = (value) => this.decode(schema[TransformKind].Decode(value));
    const Codec = { Encode, Decode };
    return { ...schema, [TransformKind]: Codec };
  }
  EncodeSchema(encode, schema) {
    const Codec = { Decode: this.decode, Encode: encode };
    return { ...schema, [TransformKind]: Codec };
  }
  Encode(encode) {
    return IsTransform(this.schema) ? this.EncodeTransform(encode, this.schema) : this.EncodeSchema(encode, this.schema);
  }
}
function Transform(schema) {
  return new TransformDecodeBuilder(schema);
}

// node_modules/@sinclair/typebox/build/esm/type/unsafe/unsafe.mjs
function Unsafe(options = {}) {
  return CreateType({ [Kind]: options[Kind] ?? "Unsafe" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/void/void.mjs
function Void(options) {
  return CreateType({ [Kind]: "Void", type: "void" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/type/type.mjs
var exports_type3 = {};
__export(exports_type3, {
  Void: () => Void,
  Uppercase: () => Uppercase,
  Unsafe: () => Unsafe,
  Unknown: () => Unknown,
  Union: () => Union,
  Undefined: () => Undefined,
  Uncapitalize: () => Uncapitalize,
  Uint8Array: () => Uint8Array2,
  Tuple: () => Tuple,
  Transform: () => Transform,
  TemplateLiteral: () => TemplateLiteral,
  Symbol: () => Symbol2,
  String: () => String2,
  ReturnType: () => ReturnType,
  Rest: () => Rest,
  Required: () => Required,
  RegExp: () => RegExp2,
  Ref: () => Ref,
  Recursive: () => Recursive,
  Record: () => Record,
  ReadonlyOptional: () => ReadonlyOptional,
  Readonly: () => Readonly,
  Promise: () => Promise2,
  Pick: () => Pick,
  Partial: () => Partial,
  Parameters: () => Parameters,
  Optional: () => Optional,
  Omit: () => Omit,
  Object: () => Object2,
  Number: () => Number2,
  Null: () => Null,
  Not: () => Not2,
  Never: () => Never,
  Module: () => Module,
  Mapped: () => Mapped,
  Lowercase: () => Lowercase,
  Literal: () => Literal,
  KeyOf: () => KeyOf,
  Iterator: () => Iterator,
  Intersect: () => Intersect,
  Integer: () => Integer,
  Instantiate: () => Instantiate,
  InstanceType: () => InstanceType,
  Index: () => Index,
  Function: () => Function2,
  Extract: () => Extract,
  Extends: () => Extends,
  Exclude: () => Exclude,
  Enum: () => Enum,
  Date: () => Date2,
  ConstructorParameters: () => ConstructorParameters,
  Constructor: () => Constructor,
  Const: () => Const,
  Composite: () => Composite,
  Capitalize: () => Capitalize,
  Boolean: () => Boolean2,
  BigInt: () => BigInt2,
  Awaited: () => Awaited,
  AsyncIterator: () => AsyncIterator,
  Array: () => Array2,
  Argument: () => Argument,
  Any: () => Any
});

// node_modules/@sinclair/typebox/build/esm/type/type/index.mjs
var Type = exports_type3;

// node_modules/@sinclair/typebox/build/esm/errors/function.mjs
function DefaultErrorFunction(error) {
  switch (error.errorType) {
    case ValueErrorType.ArrayContains:
      return "Expected array to contain at least one matching value";
    case ValueErrorType.ArrayMaxContains:
      return `Expected array to contain no more than ${error.schema.maxContains} matching values`;
    case ValueErrorType.ArrayMinContains:
      return `Expected array to contain at least ${error.schema.minContains} matching values`;
    case ValueErrorType.ArrayMaxItems:
      return `Expected array length to be less or equal to ${error.schema.maxItems}`;
    case ValueErrorType.ArrayMinItems:
      return `Expected array length to be greater or equal to ${error.schema.minItems}`;
    case ValueErrorType.ArrayUniqueItems:
      return "Expected array elements to be unique";
    case ValueErrorType.Array:
      return "Expected array";
    case ValueErrorType.AsyncIterator:
      return "Expected AsyncIterator";
    case ValueErrorType.BigIntExclusiveMaximum:
      return `Expected bigint to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.BigIntExclusiveMinimum:
      return `Expected bigint to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.BigIntMaximum:
      return `Expected bigint to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.BigIntMinimum:
      return `Expected bigint to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.BigIntMultipleOf:
      return `Expected bigint to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.BigInt:
      return "Expected bigint";
    case ValueErrorType.Boolean:
      return "Expected boolean";
    case ValueErrorType.DateExclusiveMinimumTimestamp:
      return `Expected Date timestamp to be greater than ${error.schema.exclusiveMinimumTimestamp}`;
    case ValueErrorType.DateExclusiveMaximumTimestamp:
      return `Expected Date timestamp to be less than ${error.schema.exclusiveMaximumTimestamp}`;
    case ValueErrorType.DateMinimumTimestamp:
      return `Expected Date timestamp to be greater or equal to ${error.schema.minimumTimestamp}`;
    case ValueErrorType.DateMaximumTimestamp:
      return `Expected Date timestamp to be less or equal to ${error.schema.maximumTimestamp}`;
    case ValueErrorType.DateMultipleOfTimestamp:
      return `Expected Date timestamp to be a multiple of ${error.schema.multipleOfTimestamp}`;
    case ValueErrorType.Date:
      return "Expected Date";
    case ValueErrorType.Function:
      return "Expected function";
    case ValueErrorType.IntegerExclusiveMaximum:
      return `Expected integer to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.IntegerExclusiveMinimum:
      return `Expected integer to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.IntegerMaximum:
      return `Expected integer to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.IntegerMinimum:
      return `Expected integer to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.IntegerMultipleOf:
      return `Expected integer to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.Integer:
      return "Expected integer";
    case ValueErrorType.IntersectUnevaluatedProperties:
      return "Unexpected property";
    case ValueErrorType.Intersect:
      return "Expected all values to match";
    case ValueErrorType.Iterator:
      return "Expected Iterator";
    case ValueErrorType.Literal:
      return `Expected ${typeof error.schema.const === "string" ? `'${error.schema.const}'` : error.schema.const}`;
    case ValueErrorType.Never:
      return "Never";
    case ValueErrorType.Not:
      return "Value should not match";
    case ValueErrorType.Null:
      return "Expected null";
    case ValueErrorType.NumberExclusiveMaximum:
      return `Expected number to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.NumberExclusiveMinimum:
      return `Expected number to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.NumberMaximum:
      return `Expected number to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.NumberMinimum:
      return `Expected number to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.NumberMultipleOf:
      return `Expected number to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.Number:
      return "Expected number";
    case ValueErrorType.Object:
      return "Expected object";
    case ValueErrorType.ObjectAdditionalProperties:
      return "Unexpected property";
    case ValueErrorType.ObjectMaxProperties:
      return `Expected object to have no more than ${error.schema.maxProperties} properties`;
    case ValueErrorType.ObjectMinProperties:
      return `Expected object to have at least ${error.schema.minProperties} properties`;
    case ValueErrorType.ObjectRequiredProperty:
      return "Expected required property";
    case ValueErrorType.Promise:
      return "Expected Promise";
    case ValueErrorType.RegExp:
      return "Expected string to match regular expression";
    case ValueErrorType.StringFormatUnknown:
      return `Unknown format '${error.schema.format}'`;
    case ValueErrorType.StringFormat:
      return `Expected string to match '${error.schema.format}' format`;
    case ValueErrorType.StringMaxLength:
      return `Expected string length less or equal to ${error.schema.maxLength}`;
    case ValueErrorType.StringMinLength:
      return `Expected string length greater or equal to ${error.schema.minLength}`;
    case ValueErrorType.StringPattern:
      return `Expected string to match '${error.schema.pattern}'`;
    case ValueErrorType.String:
      return "Expected string";
    case ValueErrorType.Symbol:
      return "Expected symbol";
    case ValueErrorType.TupleLength:
      return `Expected tuple to have ${error.schema.maxItems || 0} elements`;
    case ValueErrorType.Tuple:
      return "Expected tuple";
    case ValueErrorType.Uint8ArrayMaxByteLength:
      return `Expected byte length less or equal to ${error.schema.maxByteLength}`;
    case ValueErrorType.Uint8ArrayMinByteLength:
      return `Expected byte length greater or equal to ${error.schema.minByteLength}`;
    case ValueErrorType.Uint8Array:
      return "Expected Uint8Array";
    case ValueErrorType.Undefined:
      return "Expected undefined";
    case ValueErrorType.Union:
      return "Expected union value";
    case ValueErrorType.Void:
      return "Expected void";
    case ValueErrorType.Kind:
      return `Expected kind '${error.schema[Kind]}'`;
    default:
      return "Unknown error type";
  }
}
var errorFunction = DefaultErrorFunction;
function GetErrorFunction() {
  return errorFunction;
}

// node_modules/@sinclair/typebox/build/esm/value/deref/deref.mjs
class TypeDereferenceError extends TypeBoxError {
  constructor(schema) {
    super(`Unable to dereference schema with $id '${schema.$ref}'`);
    this.schema = schema;
  }
}
function Resolve(schema, references) {
  const target = references.find((target2) => target2.$id === schema.$ref);
  if (target === undefined)
    throw new TypeDereferenceError(schema);
  return Deref(target, references);
}
function Pushref(schema, references) {
  if (!IsString2(schema.$id) || references.some((target) => target.$id === schema.$id))
    return references;
  references.push(schema);
  return references;
}
function Deref(schema, references) {
  return schema[Kind] === "This" || schema[Kind] === "Ref" ? Resolve(schema, references) : schema;
}

// node_modules/@sinclair/typebox/build/esm/value/hash/hash.mjs
class ValueHashError extends TypeBoxError {
  constructor(value) {
    super(`Unable to hash value`);
    this.value = value;
  }
}
var ByteMarker;
(function(ByteMarker2) {
  ByteMarker2[ByteMarker2["Undefined"] = 0] = "Undefined";
  ByteMarker2[ByteMarker2["Null"] = 1] = "Null";
  ByteMarker2[ByteMarker2["Boolean"] = 2] = "Boolean";
  ByteMarker2[ByteMarker2["Number"] = 3] = "Number";
  ByteMarker2[ByteMarker2["String"] = 4] = "String";
  ByteMarker2[ByteMarker2["Object"] = 5] = "Object";
  ByteMarker2[ByteMarker2["Array"] = 6] = "Array";
  ByteMarker2[ByteMarker2["Date"] = 7] = "Date";
  ByteMarker2[ByteMarker2["Uint8Array"] = 8] = "Uint8Array";
  ByteMarker2[ByteMarker2["Symbol"] = 9] = "Symbol";
  ByteMarker2[ByteMarker2["BigInt"] = 10] = "BigInt";
})(ByteMarker || (ByteMarker = {}));
var Accumulator = BigInt("14695981039346656037");
var [Prime, Size] = [BigInt("1099511628211"), BigInt("18446744073709551616")];
var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
var F64 = new Float64Array(1);
var F64In = new DataView(F64.buffer);
var F64Out = new Uint8Array(F64.buffer);
function* NumberToBytes(value) {
  const byteCount = value === 0 ? 1 : Math.ceil(Math.floor(Math.log2(value) + 1) / 8);
  for (let i = 0;i < byteCount; i++) {
    yield value >> 8 * (byteCount - 1 - i) & 255;
  }
}
function ArrayType2(value) {
  FNV1A64(ByteMarker.Array);
  for (const item of value) {
    Visit4(item);
  }
}
function BooleanType(value) {
  FNV1A64(ByteMarker.Boolean);
  FNV1A64(value ? 1 : 0);
}
function BigIntType(value) {
  FNV1A64(ByteMarker.BigInt);
  F64In.setBigInt64(0, value);
  for (const byte of F64Out) {
    FNV1A64(byte);
  }
}
function DateType2(value) {
  FNV1A64(ByteMarker.Date);
  Visit4(value.getTime());
}
function NullType(value) {
  FNV1A64(ByteMarker.Null);
}
function NumberType(value) {
  FNV1A64(ByteMarker.Number);
  F64In.setFloat64(0, value);
  for (const byte of F64Out) {
    FNV1A64(byte);
  }
}
function ObjectType2(value) {
  FNV1A64(ByteMarker.Object);
  for (const key of globalThis.Object.getOwnPropertyNames(value).sort()) {
    Visit4(key);
    Visit4(value[key]);
  }
}
function StringType(value) {
  FNV1A64(ByteMarker.String);
  for (let i = 0;i < value.length; i++) {
    for (const byte of NumberToBytes(value.charCodeAt(i))) {
      FNV1A64(byte);
    }
  }
}
function SymbolType(value) {
  FNV1A64(ByteMarker.Symbol);
  Visit4(value.description);
}
function Uint8ArrayType2(value) {
  FNV1A64(ByteMarker.Uint8Array);
  for (let i = 0;i < value.length; i++) {
    FNV1A64(value[i]);
  }
}
function UndefinedType(value) {
  return FNV1A64(ByteMarker.Undefined);
}
function Visit4(value) {
  if (IsArray2(value))
    return ArrayType2(value);
  if (IsBoolean2(value))
    return BooleanType(value);
  if (IsBigInt2(value))
    return BigIntType(value);
  if (IsDate2(value))
    return DateType2(value);
  if (IsNull2(value))
    return NullType(value);
  if (IsNumber2(value))
    return NumberType(value);
  if (IsObject2(value))
    return ObjectType2(value);
  if (IsString2(value))
    return StringType(value);
  if (IsSymbol2(value))
    return SymbolType(value);
  if (IsUint8Array2(value))
    return Uint8ArrayType2(value);
  if (IsUndefined2(value))
    return UndefinedType(value);
  throw new ValueHashError(value);
}
function FNV1A64(byte) {
  Accumulator = Accumulator ^ Bytes[byte];
  Accumulator = Accumulator * Prime % Size;
}
function Hash(value) {
  Accumulator = BigInt("14695981039346656037");
  Visit4(value);
  return Accumulator;
}

// node_modules/@sinclair/typebox/build/esm/value/check/check.mjs
class ValueCheckUnknownTypeError extends TypeBoxError {
  constructor(schema) {
    super(`Unknown type`);
    this.schema = schema;
  }
}
function IsAnyOrUnknown(schema) {
  return schema[Kind] === "Any" || schema[Kind] === "Unknown";
}
function IsDefined(value) {
  return value !== undefined;
}
function FromAny2(schema, references, value) {
  return true;
}
function FromArgument2(schema, references, value) {
  return true;
}
function FromArray7(schema, references, value) {
  if (!IsArray2(value))
    return false;
  if (IsDefined(schema.minItems) && !(value.length >= schema.minItems)) {
    return false;
  }
  if (IsDefined(schema.maxItems) && !(value.length <= schema.maxItems)) {
    return false;
  }
  if (!value.every((value2) => Visit5(schema.items, references, value2))) {
    return false;
  }
  if (schema.uniqueItems === true && !function() {
    const set = new Set;
    for (const element of value) {
      const hashed = Hash(element);
      if (set.has(hashed)) {
        return false;
      } else {
        set.add(hashed);
      }
    }
    return true;
  }()) {
    return false;
  }
  if (!(IsDefined(schema.contains) || IsNumber2(schema.minContains) || IsNumber2(schema.maxContains))) {
    return true;
  }
  const containsSchema = IsDefined(schema.contains) ? schema.contains : Never();
  const containsCount = value.reduce((acc, value2) => Visit5(containsSchema, references, value2) ? acc + 1 : acc, 0);
  if (containsCount === 0) {
    return false;
  }
  if (IsNumber2(schema.minContains) && containsCount < schema.minContains) {
    return false;
  }
  if (IsNumber2(schema.maxContains) && containsCount > schema.maxContains) {
    return false;
  }
  return true;
}
function FromAsyncIterator4(schema, references, value) {
  return IsAsyncIterator2(value);
}
function FromBigInt2(schema, references, value) {
  if (!IsBigInt2(value))
    return false;
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === BigInt(0))) {
    return false;
  }
  return true;
}
function FromBoolean2(schema, references, value) {
  return IsBoolean2(value);
}
function FromConstructor4(schema, references, value) {
  return Visit5(schema.returns, references, value.prototype);
}
function FromDate2(schema, references, value) {
  if (!IsDate2(value))
    return false;
  if (IsDefined(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.multipleOfTimestamp) && !(value.getTime() % schema.multipleOfTimestamp === 0)) {
    return false;
  }
  return true;
}
function FromFunction4(schema, references, value) {
  return IsFunction2(value);
}
function FromImport(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit5(target, [...references, ...definitions], value);
}
function FromInteger2(schema, references, value) {
  if (!IsInteger(value)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    return false;
  }
  return true;
}
function FromIntersect9(schema, references, value) {
  const check1 = schema.allOf.every((schema2) => Visit5(schema2, references, value));
  if (schema.unevaluatedProperties === false) {
    const keyPattern = new RegExp(KeyOfPattern(schema));
    const check2 = Object.getOwnPropertyNames(value).every((key) => keyPattern.test(key));
    return check1 && check2;
  } else if (IsSchema(schema.unevaluatedProperties)) {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    const check2 = Object.getOwnPropertyNames(value).every((key) => keyCheck.test(key) || Visit5(schema.unevaluatedProperties, references, value[key]));
    return check1 && check2;
  } else {
    return check1;
  }
}
function FromIterator4(schema, references, value) {
  return IsIterator2(value);
}
function FromLiteral3(schema, references, value) {
  return value === schema.const;
}
function FromNever2(schema, references, value) {
  return false;
}
function FromNot2(schema, references, value) {
  return !Visit5(schema.not, references, value);
}
function FromNull2(schema, references, value) {
  return IsNull2(value);
}
function FromNumber2(schema, references, value) {
  if (!TypeSystemPolicy.IsNumberLike(value))
    return false;
  if (IsDefined(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    return false;
  }
  return true;
}
function FromObject8(schema, references, value) {
  if (!TypeSystemPolicy.IsObjectLike(value))
    return false;
  if (IsDefined(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    return false;
  }
  if (IsDefined(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    return false;
  }
  const knownKeys = Object.getOwnPropertyNames(schema.properties);
  for (const knownKey of knownKeys) {
    const property = schema.properties[knownKey];
    if (schema.required && schema.required.includes(knownKey)) {
      if (!Visit5(property, references, value[knownKey])) {
        return false;
      }
      if ((ExtendsUndefinedCheck(property) || IsAnyOrUnknown(property)) && !(knownKey in value)) {
        return false;
      }
    } else {
      if (TypeSystemPolicy.IsExactOptionalProperty(value, knownKey) && !Visit5(property, references, value[knownKey])) {
        return false;
      }
    }
  }
  if (schema.additionalProperties === false) {
    const valueKeys = Object.getOwnPropertyNames(value);
    if (schema.required && schema.required.length === knownKeys.length && valueKeys.length === knownKeys.length) {
      return true;
    } else {
      return valueKeys.every((valueKey) => knownKeys.includes(valueKey));
    }
  } else if (typeof schema.additionalProperties === "object") {
    const valueKeys = Object.getOwnPropertyNames(value);
    return valueKeys.every((key) => knownKeys.includes(key) || Visit5(schema.additionalProperties, references, value[key]));
  } else {
    return true;
  }
}
function FromPromise4(schema, references, value) {
  return IsPromise(value);
}
function FromRecord4(schema, references, value) {
  if (!TypeSystemPolicy.IsRecordLike(value)) {
    return false;
  }
  if (IsDefined(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    return false;
  }
  if (IsDefined(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    return false;
  }
  const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
  const regex = new RegExp(patternKey);
  const check1 = Object.entries(value).every(([key, value2]) => {
    return regex.test(key) ? Visit5(patternSchema, references, value2) : true;
  });
  const check2 = typeof schema.additionalProperties === "object" ? Object.entries(value).every(([key, value2]) => {
    return !regex.test(key) ? Visit5(schema.additionalProperties, references, value2) : true;
  }) : true;
  const check3 = schema.additionalProperties === false ? Object.getOwnPropertyNames(value).every((key) => {
    return regex.test(key);
  }) : true;
  return check1 && check2 && check3;
}
function FromRef5(schema, references, value) {
  return Visit5(Deref(schema, references), references, value);
}
function FromRegExp2(schema, references, value) {
  const regex = new RegExp(schema.source, schema.flags);
  if (IsDefined(schema.minLength)) {
    if (!(value.length >= schema.minLength))
      return false;
  }
  if (IsDefined(schema.maxLength)) {
    if (!(value.length <= schema.maxLength))
      return false;
  }
  return regex.test(value);
}
function FromString2(schema, references, value) {
  if (!IsString2(value)) {
    return false;
  }
  if (IsDefined(schema.minLength)) {
    if (!(value.length >= schema.minLength))
      return false;
  }
  if (IsDefined(schema.maxLength)) {
    if (!(value.length <= schema.maxLength))
      return false;
  }
  if (IsDefined(schema.pattern)) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value))
      return false;
  }
  if (IsDefined(schema.format)) {
    if (!exports_format.Has(schema.format))
      return false;
    const func = exports_format.Get(schema.format);
    return func(value);
  }
  return true;
}
function FromSymbol2(schema, references, value) {
  return IsSymbol2(value);
}
function FromTemplateLiteral4(schema, references, value) {
  return IsString2(value) && new RegExp(schema.pattern).test(value);
}
function FromThis(schema, references, value) {
  return Visit5(Deref(schema, references), references, value);
}
function FromTuple6(schema, references, value) {
  if (!IsArray2(value)) {
    return false;
  }
  if (schema.items === undefined && !(value.length === 0)) {
    return false;
  }
  if (!(value.length === schema.maxItems)) {
    return false;
  }
  if (!schema.items) {
    return true;
  }
  for (let i = 0;i < schema.items.length; i++) {
    if (!Visit5(schema.items[i], references, value[i]))
      return false;
  }
  return true;
}
function FromUndefined2(schema, references, value) {
  return IsUndefined2(value);
}
function FromUnion11(schema, references, value) {
  return schema.anyOf.some((inner) => Visit5(inner, references, value));
}
function FromUint8Array2(schema, references, value) {
  if (!IsUint8Array2(value)) {
    return false;
  }
  if (IsDefined(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
    return false;
  }
  if (IsDefined(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
    return false;
  }
  return true;
}
function FromUnknown2(schema, references, value) {
  return true;
}
function FromVoid2(schema, references, value) {
  return TypeSystemPolicy.IsVoidLike(value);
}
function FromKind(schema, references, value) {
  if (!exports_type2.Has(schema[Kind]))
    return false;
  const func = exports_type2.Get(schema[Kind]);
  return func(schema, value);
}
function Visit5(schema, references, value) {
  const references_ = IsDefined(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return FromAny2(schema_, references_, value);
    case "Argument":
      return FromArgument2(schema_, references_, value);
    case "Array":
      return FromArray7(schema_, references_, value);
    case "AsyncIterator":
      return FromAsyncIterator4(schema_, references_, value);
    case "BigInt":
      return FromBigInt2(schema_, references_, value);
    case "Boolean":
      return FromBoolean2(schema_, references_, value);
    case "Constructor":
      return FromConstructor4(schema_, references_, value);
    case "Date":
      return FromDate2(schema_, references_, value);
    case "Function":
      return FromFunction4(schema_, references_, value);
    case "Import":
      return FromImport(schema_, references_, value);
    case "Integer":
      return FromInteger2(schema_, references_, value);
    case "Intersect":
      return FromIntersect9(schema_, references_, value);
    case "Iterator":
      return FromIterator4(schema_, references_, value);
    case "Literal":
      return FromLiteral3(schema_, references_, value);
    case "Never":
      return FromNever2(schema_, references_, value);
    case "Not":
      return FromNot2(schema_, references_, value);
    case "Null":
      return FromNull2(schema_, references_, value);
    case "Number":
      return FromNumber2(schema_, references_, value);
    case "Object":
      return FromObject8(schema_, references_, value);
    case "Promise":
      return FromPromise4(schema_, references_, value);
    case "Record":
      return FromRecord4(schema_, references_, value);
    case "Ref":
      return FromRef5(schema_, references_, value);
    case "RegExp":
      return FromRegExp2(schema_, references_, value);
    case "String":
      return FromString2(schema_, references_, value);
    case "Symbol":
      return FromSymbol2(schema_, references_, value);
    case "TemplateLiteral":
      return FromTemplateLiteral4(schema_, references_, value);
    case "This":
      return FromThis(schema_, references_, value);
    case "Tuple":
      return FromTuple6(schema_, references_, value);
    case "Undefined":
      return FromUndefined2(schema_, references_, value);
    case "Union":
      return FromUnion11(schema_, references_, value);
    case "Uint8Array":
      return FromUint8Array2(schema_, references_, value);
    case "Unknown":
      return FromUnknown2(schema_, references_, value);
    case "Void":
      return FromVoid2(schema_, references_, value);
    default:
      if (!exports_type2.Has(schema_[Kind]))
        throw new ValueCheckUnknownTypeError(schema_);
      return FromKind(schema_, references_, value);
  }
}
function Check(...args) {
  return args.length === 3 ? Visit5(args[0], args[1], args[2]) : Visit5(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/errors/errors.mjs
var ValueErrorType;
(function(ValueErrorType2) {
  ValueErrorType2[ValueErrorType2["ArrayContains"] = 0] = "ArrayContains";
  ValueErrorType2[ValueErrorType2["ArrayMaxContains"] = 1] = "ArrayMaxContains";
  ValueErrorType2[ValueErrorType2["ArrayMaxItems"] = 2] = "ArrayMaxItems";
  ValueErrorType2[ValueErrorType2["ArrayMinContains"] = 3] = "ArrayMinContains";
  ValueErrorType2[ValueErrorType2["ArrayMinItems"] = 4] = "ArrayMinItems";
  ValueErrorType2[ValueErrorType2["ArrayUniqueItems"] = 5] = "ArrayUniqueItems";
  ValueErrorType2[ValueErrorType2["Array"] = 6] = "Array";
  ValueErrorType2[ValueErrorType2["AsyncIterator"] = 7] = "AsyncIterator";
  ValueErrorType2[ValueErrorType2["BigIntExclusiveMaximum"] = 8] = "BigIntExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["BigIntExclusiveMinimum"] = 9] = "BigIntExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["BigIntMaximum"] = 10] = "BigIntMaximum";
  ValueErrorType2[ValueErrorType2["BigIntMinimum"] = 11] = "BigIntMinimum";
  ValueErrorType2[ValueErrorType2["BigIntMultipleOf"] = 12] = "BigIntMultipleOf";
  ValueErrorType2[ValueErrorType2["BigInt"] = 13] = "BigInt";
  ValueErrorType2[ValueErrorType2["Boolean"] = 14] = "Boolean";
  ValueErrorType2[ValueErrorType2["DateExclusiveMaximumTimestamp"] = 15] = "DateExclusiveMaximumTimestamp";
  ValueErrorType2[ValueErrorType2["DateExclusiveMinimumTimestamp"] = 16] = "DateExclusiveMinimumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMaximumTimestamp"] = 17] = "DateMaximumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMinimumTimestamp"] = 18] = "DateMinimumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMultipleOfTimestamp"] = 19] = "DateMultipleOfTimestamp";
  ValueErrorType2[ValueErrorType2["Date"] = 20] = "Date";
  ValueErrorType2[ValueErrorType2["Function"] = 21] = "Function";
  ValueErrorType2[ValueErrorType2["IntegerExclusiveMaximum"] = 22] = "IntegerExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["IntegerExclusiveMinimum"] = 23] = "IntegerExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["IntegerMaximum"] = 24] = "IntegerMaximum";
  ValueErrorType2[ValueErrorType2["IntegerMinimum"] = 25] = "IntegerMinimum";
  ValueErrorType2[ValueErrorType2["IntegerMultipleOf"] = 26] = "IntegerMultipleOf";
  ValueErrorType2[ValueErrorType2["Integer"] = 27] = "Integer";
  ValueErrorType2[ValueErrorType2["IntersectUnevaluatedProperties"] = 28] = "IntersectUnevaluatedProperties";
  ValueErrorType2[ValueErrorType2["Intersect"] = 29] = "Intersect";
  ValueErrorType2[ValueErrorType2["Iterator"] = 30] = "Iterator";
  ValueErrorType2[ValueErrorType2["Kind"] = 31] = "Kind";
  ValueErrorType2[ValueErrorType2["Literal"] = 32] = "Literal";
  ValueErrorType2[ValueErrorType2["Never"] = 33] = "Never";
  ValueErrorType2[ValueErrorType2["Not"] = 34] = "Not";
  ValueErrorType2[ValueErrorType2["Null"] = 35] = "Null";
  ValueErrorType2[ValueErrorType2["NumberExclusiveMaximum"] = 36] = "NumberExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["NumberExclusiveMinimum"] = 37] = "NumberExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["NumberMaximum"] = 38] = "NumberMaximum";
  ValueErrorType2[ValueErrorType2["NumberMinimum"] = 39] = "NumberMinimum";
  ValueErrorType2[ValueErrorType2["NumberMultipleOf"] = 40] = "NumberMultipleOf";
  ValueErrorType2[ValueErrorType2["Number"] = 41] = "Number";
  ValueErrorType2[ValueErrorType2["ObjectAdditionalProperties"] = 42] = "ObjectAdditionalProperties";
  ValueErrorType2[ValueErrorType2["ObjectMaxProperties"] = 43] = "ObjectMaxProperties";
  ValueErrorType2[ValueErrorType2["ObjectMinProperties"] = 44] = "ObjectMinProperties";
  ValueErrorType2[ValueErrorType2["ObjectRequiredProperty"] = 45] = "ObjectRequiredProperty";
  ValueErrorType2[ValueErrorType2["Object"] = 46] = "Object";
  ValueErrorType2[ValueErrorType2["Promise"] = 47] = "Promise";
  ValueErrorType2[ValueErrorType2["RegExp"] = 48] = "RegExp";
  ValueErrorType2[ValueErrorType2["StringFormatUnknown"] = 49] = "StringFormatUnknown";
  ValueErrorType2[ValueErrorType2["StringFormat"] = 50] = "StringFormat";
  ValueErrorType2[ValueErrorType2["StringMaxLength"] = 51] = "StringMaxLength";
  ValueErrorType2[ValueErrorType2["StringMinLength"] = 52] = "StringMinLength";
  ValueErrorType2[ValueErrorType2["StringPattern"] = 53] = "StringPattern";
  ValueErrorType2[ValueErrorType2["String"] = 54] = "String";
  ValueErrorType2[ValueErrorType2["Symbol"] = 55] = "Symbol";
  ValueErrorType2[ValueErrorType2["TupleLength"] = 56] = "TupleLength";
  ValueErrorType2[ValueErrorType2["Tuple"] = 57] = "Tuple";
  ValueErrorType2[ValueErrorType2["Uint8ArrayMaxByteLength"] = 58] = "Uint8ArrayMaxByteLength";
  ValueErrorType2[ValueErrorType2["Uint8ArrayMinByteLength"] = 59] = "Uint8ArrayMinByteLength";
  ValueErrorType2[ValueErrorType2["Uint8Array"] = 60] = "Uint8Array";
  ValueErrorType2[ValueErrorType2["Undefined"] = 61] = "Undefined";
  ValueErrorType2[ValueErrorType2["Union"] = 62] = "Union";
  ValueErrorType2[ValueErrorType2["Void"] = 63] = "Void";
})(ValueErrorType || (ValueErrorType = {}));

class ValueErrorsUnknownTypeError extends TypeBoxError {
  constructor(schema) {
    super("Unknown type");
    this.schema = schema;
  }
}
function EscapeKey(key) {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}
function IsDefined2(value) {
  return value !== undefined;
}

class ValueErrorIterator {
  constructor(iterator) {
    this.iterator = iterator;
  }
  [Symbol.iterator]() {
    return this.iterator;
  }
  First() {
    const next = this.iterator.next();
    return next.done ? undefined : next.value;
  }
}
function Create(errorType, schema, path, value, errors = []) {
  return {
    type: errorType,
    schema,
    path,
    value,
    message: GetErrorFunction()({ errorType, path, schema, value, errors }),
    errors
  };
}
function* FromAny3(schema, references, path, value) {}
function* FromArgument3(schema, references, path, value) {}
function* FromArray8(schema, references, path, value) {
  if (!IsArray2(value)) {
    return yield Create(ValueErrorType.Array, schema, path, value);
  }
  if (IsDefined2(schema.minItems) && !(value.length >= schema.minItems)) {
    yield Create(ValueErrorType.ArrayMinItems, schema, path, value);
  }
  if (IsDefined2(schema.maxItems) && !(value.length <= schema.maxItems)) {
    yield Create(ValueErrorType.ArrayMaxItems, schema, path, value);
  }
  for (let i = 0;i < value.length; i++) {
    yield* Visit6(schema.items, references, `${path}/${i}`, value[i]);
  }
  if (schema.uniqueItems === true && !function() {
    const set = new Set;
    for (const element of value) {
      const hashed = Hash(element);
      if (set.has(hashed)) {
        return false;
      } else {
        set.add(hashed);
      }
    }
    return true;
  }()) {
    yield Create(ValueErrorType.ArrayUniqueItems, schema, path, value);
  }
  if (!(IsDefined2(schema.contains) || IsDefined2(schema.minContains) || IsDefined2(schema.maxContains))) {
    return;
  }
  const containsSchema = IsDefined2(schema.contains) ? schema.contains : Never();
  const containsCount = value.reduce((acc, value2, index) => Visit6(containsSchema, references, `${path}${index}`, value2).next().done === true ? acc + 1 : acc, 0);
  if (containsCount === 0) {
    yield Create(ValueErrorType.ArrayContains, schema, path, value);
  }
  if (IsNumber2(schema.minContains) && containsCount < schema.minContains) {
    yield Create(ValueErrorType.ArrayMinContains, schema, path, value);
  }
  if (IsNumber2(schema.maxContains) && containsCount > schema.maxContains) {
    yield Create(ValueErrorType.ArrayMaxContains, schema, path, value);
  }
}
function* FromAsyncIterator5(schema, references, path, value) {
  if (!IsAsyncIterator2(value))
    yield Create(ValueErrorType.AsyncIterator, schema, path, value);
}
function* FromBigInt3(schema, references, path, value) {
  if (!IsBigInt2(value))
    return yield Create(ValueErrorType.BigInt, schema, path, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.BigIntExclusiveMaximum, schema, path, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.BigIntExclusiveMinimum, schema, path, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.BigIntMaximum, schema, path, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.BigIntMinimum, schema, path, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === BigInt(0))) {
    yield Create(ValueErrorType.BigIntMultipleOf, schema, path, value);
  }
}
function* FromBoolean3(schema, references, path, value) {
  if (!IsBoolean2(value))
    yield Create(ValueErrorType.Boolean, schema, path, value);
}
function* FromConstructor5(schema, references, path, value) {
  yield* Visit6(schema.returns, references, path, value.prototype);
}
function* FromDate3(schema, references, path, value) {
  if (!IsDate2(value))
    return yield Create(ValueErrorType.Date, schema, path, value);
  if (IsDefined2(schema.exclusiveMaximumTimestamp) && !(value.getTime() < schema.exclusiveMaximumTimestamp)) {
    yield Create(ValueErrorType.DateExclusiveMaximumTimestamp, schema, path, value);
  }
  if (IsDefined2(schema.exclusiveMinimumTimestamp) && !(value.getTime() > schema.exclusiveMinimumTimestamp)) {
    yield Create(ValueErrorType.DateExclusiveMinimumTimestamp, schema, path, value);
  }
  if (IsDefined2(schema.maximumTimestamp) && !(value.getTime() <= schema.maximumTimestamp)) {
    yield Create(ValueErrorType.DateMaximumTimestamp, schema, path, value);
  }
  if (IsDefined2(schema.minimumTimestamp) && !(value.getTime() >= schema.minimumTimestamp)) {
    yield Create(ValueErrorType.DateMinimumTimestamp, schema, path, value);
  }
  if (IsDefined2(schema.multipleOfTimestamp) && !(value.getTime() % schema.multipleOfTimestamp === 0)) {
    yield Create(ValueErrorType.DateMultipleOfTimestamp, schema, path, value);
  }
}
function* FromFunction5(schema, references, path, value) {
  if (!IsFunction2(value))
    yield Create(ValueErrorType.Function, schema, path, value);
}
function* FromImport2(schema, references, path, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  yield* Visit6(target, [...references, ...definitions], path, value);
}
function* FromInteger3(schema, references, path, value) {
  if (!IsInteger(value))
    return yield Create(ValueErrorType.Integer, schema, path, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.IntegerExclusiveMaximum, schema, path, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.IntegerExclusiveMinimum, schema, path, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.IntegerMaximum, schema, path, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.IntegerMinimum, schema, path, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    yield Create(ValueErrorType.IntegerMultipleOf, schema, path, value);
  }
}
function* FromIntersect10(schema, references, path, value) {
  let hasError = false;
  for (const inner of schema.allOf) {
    for (const error of Visit6(inner, references, path, value)) {
      hasError = true;
      yield error;
    }
  }
  if (hasError) {
    return yield Create(ValueErrorType.Intersect, schema, path, value);
  }
  if (schema.unevaluatedProperties === false) {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    for (const valueKey of Object.getOwnPropertyNames(value)) {
      if (!keyCheck.test(valueKey)) {
        yield Create(ValueErrorType.IntersectUnevaluatedProperties, schema, `${path}/${valueKey}`, value);
      }
    }
  }
  if (typeof schema.unevaluatedProperties === "object") {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    for (const valueKey of Object.getOwnPropertyNames(value)) {
      if (!keyCheck.test(valueKey)) {
        const next = Visit6(schema.unevaluatedProperties, references, `${path}/${valueKey}`, value[valueKey]).next();
        if (!next.done)
          yield next.value;
      }
    }
  }
}
function* FromIterator5(schema, references, path, value) {
  if (!IsIterator2(value))
    yield Create(ValueErrorType.Iterator, schema, path, value);
}
function* FromLiteral4(schema, references, path, value) {
  if (!(value === schema.const))
    yield Create(ValueErrorType.Literal, schema, path, value);
}
function* FromNever3(schema, references, path, value) {
  yield Create(ValueErrorType.Never, schema, path, value);
}
function* FromNot3(schema, references, path, value) {
  if (Visit6(schema.not, references, path, value).next().done === true)
    yield Create(ValueErrorType.Not, schema, path, value);
}
function* FromNull3(schema, references, path, value) {
  if (!IsNull2(value))
    yield Create(ValueErrorType.Null, schema, path, value);
}
function* FromNumber3(schema, references, path, value) {
  if (!TypeSystemPolicy.IsNumberLike(value))
    return yield Create(ValueErrorType.Number, schema, path, value);
  if (IsDefined2(schema.exclusiveMaximum) && !(value < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.NumberExclusiveMaximum, schema, path, value);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.NumberExclusiveMinimum, schema, path, value);
  }
  if (IsDefined2(schema.maximum) && !(value <= schema.maximum)) {
    yield Create(ValueErrorType.NumberMaximum, schema, path, value);
  }
  if (IsDefined2(schema.minimum) && !(value >= schema.minimum)) {
    yield Create(ValueErrorType.NumberMinimum, schema, path, value);
  }
  if (IsDefined2(schema.multipleOf) && !(value % schema.multipleOf === 0)) {
    yield Create(ValueErrorType.NumberMultipleOf, schema, path, value);
  }
}
function* FromObject9(schema, references, path, value) {
  if (!TypeSystemPolicy.IsObjectLike(value))
    return yield Create(ValueErrorType.Object, schema, path, value);
  if (IsDefined2(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    yield Create(ValueErrorType.ObjectMinProperties, schema, path, value);
  }
  if (IsDefined2(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    yield Create(ValueErrorType.ObjectMaxProperties, schema, path, value);
  }
  const requiredKeys = Array.isArray(schema.required) ? schema.required : [];
  const knownKeys = Object.getOwnPropertyNames(schema.properties);
  const unknownKeys = Object.getOwnPropertyNames(value);
  for (const requiredKey of requiredKeys) {
    if (unknownKeys.includes(requiredKey))
      continue;
    yield Create(ValueErrorType.ObjectRequiredProperty, schema.properties[requiredKey], `${path}/${EscapeKey(requiredKey)}`, undefined);
  }
  if (schema.additionalProperties === false) {
    for (const valueKey of unknownKeys) {
      if (!knownKeys.includes(valueKey)) {
        yield Create(ValueErrorType.ObjectAdditionalProperties, schema, `${path}/${EscapeKey(valueKey)}`, value[valueKey]);
      }
    }
  }
  if (typeof schema.additionalProperties === "object") {
    for (const valueKey of unknownKeys) {
      if (knownKeys.includes(valueKey))
        continue;
      yield* Visit6(schema.additionalProperties, references, `${path}/${EscapeKey(valueKey)}`, value[valueKey]);
    }
  }
  for (const knownKey of knownKeys) {
    const property = schema.properties[knownKey];
    if (schema.required && schema.required.includes(knownKey)) {
      yield* Visit6(property, references, `${path}/${EscapeKey(knownKey)}`, value[knownKey]);
      if (ExtendsUndefinedCheck(schema) && !(knownKey in value)) {
        yield Create(ValueErrorType.ObjectRequiredProperty, property, `${path}/${EscapeKey(knownKey)}`, undefined);
      }
    } else {
      if (TypeSystemPolicy.IsExactOptionalProperty(value, knownKey)) {
        yield* Visit6(property, references, `${path}/${EscapeKey(knownKey)}`, value[knownKey]);
      }
    }
  }
}
function* FromPromise5(schema, references, path, value) {
  if (!IsPromise(value))
    yield Create(ValueErrorType.Promise, schema, path, value);
}
function* FromRecord5(schema, references, path, value) {
  if (!TypeSystemPolicy.IsRecordLike(value))
    return yield Create(ValueErrorType.Object, schema, path, value);
  if (IsDefined2(schema.minProperties) && !(Object.getOwnPropertyNames(value).length >= schema.minProperties)) {
    yield Create(ValueErrorType.ObjectMinProperties, schema, path, value);
  }
  if (IsDefined2(schema.maxProperties) && !(Object.getOwnPropertyNames(value).length <= schema.maxProperties)) {
    yield Create(ValueErrorType.ObjectMaxProperties, schema, path, value);
  }
  const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
  const regex = new RegExp(patternKey);
  for (const [propertyKey, propertyValue] of Object.entries(value)) {
    if (regex.test(propertyKey))
      yield* Visit6(patternSchema, references, `${path}/${EscapeKey(propertyKey)}`, propertyValue);
  }
  if (typeof schema.additionalProperties === "object") {
    for (const [propertyKey, propertyValue] of Object.entries(value)) {
      if (!regex.test(propertyKey))
        yield* Visit6(schema.additionalProperties, references, `${path}/${EscapeKey(propertyKey)}`, propertyValue);
    }
  }
  if (schema.additionalProperties === false) {
    for (const [propertyKey, propertyValue] of Object.entries(value)) {
      if (regex.test(propertyKey))
        continue;
      return yield Create(ValueErrorType.ObjectAdditionalProperties, schema, `${path}/${EscapeKey(propertyKey)}`, propertyValue);
    }
  }
}
function* FromRef6(schema, references, path, value) {
  yield* Visit6(Deref(schema, references), references, path, value);
}
function* FromRegExp3(schema, references, path, value) {
  if (!IsString2(value))
    return yield Create(ValueErrorType.String, schema, path, value);
  if (IsDefined2(schema.minLength) && !(value.length >= schema.minLength)) {
    yield Create(ValueErrorType.StringMinLength, schema, path, value);
  }
  if (IsDefined2(schema.maxLength) && !(value.length <= schema.maxLength)) {
    yield Create(ValueErrorType.StringMaxLength, schema, path, value);
  }
  const regex = new RegExp(schema.source, schema.flags);
  if (!regex.test(value)) {
    return yield Create(ValueErrorType.RegExp, schema, path, value);
  }
}
function* FromString3(schema, references, path, value) {
  if (!IsString2(value))
    return yield Create(ValueErrorType.String, schema, path, value);
  if (IsDefined2(schema.minLength) && !(value.length >= schema.minLength)) {
    yield Create(ValueErrorType.StringMinLength, schema, path, value);
  }
  if (IsDefined2(schema.maxLength) && !(value.length <= schema.maxLength)) {
    yield Create(ValueErrorType.StringMaxLength, schema, path, value);
  }
  if (IsString2(schema.pattern)) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value)) {
      yield Create(ValueErrorType.StringPattern, schema, path, value);
    }
  }
  if (IsString2(schema.format)) {
    if (!exports_format.Has(schema.format)) {
      yield Create(ValueErrorType.StringFormatUnknown, schema, path, value);
    } else {
      const format = exports_format.Get(schema.format);
      if (!format(value)) {
        yield Create(ValueErrorType.StringFormat, schema, path, value);
      }
    }
  }
}
function* FromSymbol3(schema, references, path, value) {
  if (!IsSymbol2(value))
    yield Create(ValueErrorType.Symbol, schema, path, value);
}
function* FromTemplateLiteral5(schema, references, path, value) {
  if (!IsString2(value))
    return yield Create(ValueErrorType.String, schema, path, value);
  const regex = new RegExp(schema.pattern);
  if (!regex.test(value)) {
    yield Create(ValueErrorType.StringPattern, schema, path, value);
  }
}
function* FromThis2(schema, references, path, value) {
  yield* Visit6(Deref(schema, references), references, path, value);
}
function* FromTuple7(schema, references, path, value) {
  if (!IsArray2(value))
    return yield Create(ValueErrorType.Tuple, schema, path, value);
  if (schema.items === undefined && !(value.length === 0)) {
    return yield Create(ValueErrorType.TupleLength, schema, path, value);
  }
  if (!(value.length === schema.maxItems)) {
    return yield Create(ValueErrorType.TupleLength, schema, path, value);
  }
  if (!schema.items) {
    return;
  }
  for (let i = 0;i < schema.items.length; i++) {
    yield* Visit6(schema.items[i], references, `${path}/${i}`, value[i]);
  }
}
function* FromUndefined3(schema, references, path, value) {
  if (!IsUndefined2(value))
    yield Create(ValueErrorType.Undefined, schema, path, value);
}
function* FromUnion12(schema, references, path, value) {
  if (Check(schema, references, value))
    return;
  const errors = schema.anyOf.map((variant) => new ValueErrorIterator(Visit6(variant, references, path, value)));
  yield Create(ValueErrorType.Union, schema, path, value, errors);
}
function* FromUint8Array3(schema, references, path, value) {
  if (!IsUint8Array2(value))
    return yield Create(ValueErrorType.Uint8Array, schema, path, value);
  if (IsDefined2(schema.maxByteLength) && !(value.length <= schema.maxByteLength)) {
    yield Create(ValueErrorType.Uint8ArrayMaxByteLength, schema, path, value);
  }
  if (IsDefined2(schema.minByteLength) && !(value.length >= schema.minByteLength)) {
    yield Create(ValueErrorType.Uint8ArrayMinByteLength, schema, path, value);
  }
}
function* FromUnknown3(schema, references, path, value) {}
function* FromVoid3(schema, references, path, value) {
  if (!TypeSystemPolicy.IsVoidLike(value))
    yield Create(ValueErrorType.Void, schema, path, value);
}
function* FromKind2(schema, references, path, value) {
  const check = exports_type2.Get(schema[Kind]);
  if (!check(schema, value))
    yield Create(ValueErrorType.Kind, schema, path, value);
}
function* Visit6(schema, references, path, value) {
  const references_ = IsDefined2(schema.$id) ? [...references, schema] : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return yield* FromAny3(schema_, references_, path, value);
    case "Argument":
      return yield* FromArgument3(schema_, references_, path, value);
    case "Array":
      return yield* FromArray8(schema_, references_, path, value);
    case "AsyncIterator":
      return yield* FromAsyncIterator5(schema_, references_, path, value);
    case "BigInt":
      return yield* FromBigInt3(schema_, references_, path, value);
    case "Boolean":
      return yield* FromBoolean3(schema_, references_, path, value);
    case "Constructor":
      return yield* FromConstructor5(schema_, references_, path, value);
    case "Date":
      return yield* FromDate3(schema_, references_, path, value);
    case "Function":
      return yield* FromFunction5(schema_, references_, path, value);
    case "Import":
      return yield* FromImport2(schema_, references_, path, value);
    case "Integer":
      return yield* FromInteger3(schema_, references_, path, value);
    case "Intersect":
      return yield* FromIntersect10(schema_, references_, path, value);
    case "Iterator":
      return yield* FromIterator5(schema_, references_, path, value);
    case "Literal":
      return yield* FromLiteral4(schema_, references_, path, value);
    case "Never":
      return yield* FromNever3(schema_, references_, path, value);
    case "Not":
      return yield* FromNot3(schema_, references_, path, value);
    case "Null":
      return yield* FromNull3(schema_, references_, path, value);
    case "Number":
      return yield* FromNumber3(schema_, references_, path, value);
    case "Object":
      return yield* FromObject9(schema_, references_, path, value);
    case "Promise":
      return yield* FromPromise5(schema_, references_, path, value);
    case "Record":
      return yield* FromRecord5(schema_, references_, path, value);
    case "Ref":
      return yield* FromRef6(schema_, references_, path, value);
    case "RegExp":
      return yield* FromRegExp3(schema_, references_, path, value);
    case "String":
      return yield* FromString3(schema_, references_, path, value);
    case "Symbol":
      return yield* FromSymbol3(schema_, references_, path, value);
    case "TemplateLiteral":
      return yield* FromTemplateLiteral5(schema_, references_, path, value);
    case "This":
      return yield* FromThis2(schema_, references_, path, value);
    case "Tuple":
      return yield* FromTuple7(schema_, references_, path, value);
    case "Undefined":
      return yield* FromUndefined3(schema_, references_, path, value);
    case "Union":
      return yield* FromUnion12(schema_, references_, path, value);
    case "Uint8Array":
      return yield* FromUint8Array3(schema_, references_, path, value);
    case "Unknown":
      return yield* FromUnknown3(schema_, references_, path, value);
    case "Void":
      return yield* FromVoid3(schema_, references_, path, value);
    default:
      if (!exports_type2.Has(schema_[Kind]))
        throw new ValueErrorsUnknownTypeError(schema);
      return yield* FromKind2(schema_, references_, path, value);
  }
}
function Errors(...args) {
  const iterator = args.length === 3 ? Visit6(args[0], args[1], "", args[2]) : Visit6(args[0], [], "", args[1]);
  return new ValueErrorIterator(iterator);
}
// node_modules/@sinclair/typebox/build/esm/value/assert/assert.mjs
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AssertError_instances;
var _AssertError_iterator;
var _AssertError_Iterator;

class AssertError extends TypeBoxError {
  constructor(iterator) {
    const error = iterator.First();
    super(error === undefined ? "Invalid Value" : error.message);
    _AssertError_instances.add(this);
    _AssertError_iterator.set(this, undefined);
    __classPrivateFieldSet(this, _AssertError_iterator, iterator, "f");
    this.error = error;
  }
  Errors() {
    return new ValueErrorIterator(__classPrivateFieldGet(this, _AssertError_instances, "m", _AssertError_Iterator).call(this));
  }
}
_AssertError_iterator = new WeakMap, _AssertError_instances = new WeakSet, _AssertError_Iterator = function* _AssertError_Iterator2() {
  if (this.error)
    yield this.error;
  yield* __classPrivateFieldGet(this, _AssertError_iterator, "f");
};
function AssertValue(schema, references, value) {
  if (Check(schema, references, value))
    return;
  throw new AssertError(Errors(schema, references, value));
}
function Assert(...args) {
  return args.length === 3 ? AssertValue(args[0], args[1], args[2]) : AssertValue(args[0], [], args[1]);
}
// node_modules/@sinclair/typebox/build/esm/value/clone/clone.mjs
function FromObject10(value) {
  const Acc = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    Acc[key] = Clone2(value[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value)) {
    Acc[key] = Clone2(value[key]);
  }
  return Acc;
}
function FromArray9(value) {
  return value.map((element) => Clone2(element));
}
function FromTypedArray(value) {
  return value.slice();
}
function FromMap(value) {
  return new Map(Clone2([...value.entries()]));
}
function FromSet(value) {
  return new Set(Clone2([...value.entries()]));
}
function FromDate4(value) {
  return new Date(value.toISOString());
}
function FromValue2(value) {
  return value;
}
function Clone2(value) {
  if (IsArray2(value))
    return FromArray9(value);
  if (IsDate2(value))
    return FromDate4(value);
  if (IsTypedArray(value))
    return FromTypedArray(value);
  if (IsMap(value))
    return FromMap(value);
  if (IsSet(value))
    return FromSet(value);
  if (IsObject2(value))
    return FromObject10(value);
  if (IsValueType(value))
    return FromValue2(value);
  throw new Error("ValueClone: Unable to clone value");
}

// node_modules/@sinclair/typebox/build/esm/value/create/create.mjs
class ValueCreateError extends TypeBoxError {
  constructor(schema, message) {
    super(message);
    this.schema = schema;
  }
}
function FromDefault(value) {
  return IsFunction2(value) ? value() : Clone2(value);
}
function FromAny4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromArgument4(schema, references) {
  return {};
}
function FromArray10(schema, references) {
  if (schema.uniqueItems === true && !HasPropertyKey2(schema, "default")) {
    throw new ValueCreateError(schema, "Array with the uniqueItems constraint requires a default value");
  } else if ("contains" in schema && !HasPropertyKey2(schema, "default")) {
    throw new ValueCreateError(schema, "Array with the contains constraint requires a default value");
  } else if ("default" in schema) {
    return FromDefault(schema.default);
  } else if (schema.minItems !== undefined) {
    return Array.from({ length: schema.minItems }).map((item) => {
      return Visit7(schema.items, references);
    });
  } else {
    return [];
  }
}
function FromAsyncIterator6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return async function* () {}();
  }
}
function FromBigInt4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return BigInt(0);
  }
}
function FromBoolean4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return false;
  }
}
function FromConstructor6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const value = Visit7(schema.returns, references);
    if (typeof value === "object" && !Array.isArray(value)) {
      return class {
        constructor() {
          for (const [key, val] of Object.entries(value)) {
            const self = this;
            self[key] = val;
          }
        }
      };
    } else {
      return class {
      };
    }
  }
}
function FromDate5(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimumTimestamp !== undefined) {
    return new Date(schema.minimumTimestamp);
  } else {
    return new Date;
  }
}
function FromFunction6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return () => Visit7(schema.returns, references);
  }
}
function FromImport3(schema, references) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit7(target, [...references, ...definitions]);
}
function FromInteger4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimum !== undefined) {
    return schema.minimum;
  } else {
    return 0;
  }
}
function FromIntersect11(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const value = schema.allOf.reduce((acc, schema2) => {
      const next = Visit7(schema2, references);
      return typeof next === "object" ? { ...acc, ...next } : next;
    }, {});
    if (!Check(schema, references, value))
      throw new ValueCreateError(schema, "Intersect produced invalid value. Consider using a default value.");
    return value;
  }
}
function FromIterator6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return function* () {}();
  }
}
function FromLiteral5(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return schema.const;
  }
}
function FromNever4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "Never types cannot be created. Consider using a default value.");
  }
}
function FromNot4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "Not types must have a default value");
  }
}
function FromNull4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return null;
  }
}
function FromNumber4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimum !== undefined) {
    return schema.minimum;
  } else {
    return 0;
  }
}
function FromObject11(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const required = new Set(schema.required);
    const Acc = {};
    for (const [key, subschema] of Object.entries(schema.properties)) {
      if (!required.has(key))
        continue;
      Acc[key] = Visit7(subschema, references);
    }
    return Acc;
  }
}
function FromPromise6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Promise.resolve(Visit7(schema.item, references));
  }
}
function FromRecord6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromRef7(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Visit7(Deref(schema, references), references);
  }
}
function FromRegExp4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "RegExp types cannot be created. Consider using a default value.");
  }
}
function FromString4(schema, references) {
  if (schema.pattern !== undefined) {
    if (!HasPropertyKey2(schema, "default")) {
      throw new ValueCreateError(schema, "String types with patterns must specify a default value");
    } else {
      return FromDefault(schema.default);
    }
  } else if (schema.format !== undefined) {
    if (!HasPropertyKey2(schema, "default")) {
      throw new ValueCreateError(schema, "String types with formats must specify a default value");
    } else {
      return FromDefault(schema.default);
    }
  } else {
    if (HasPropertyKey2(schema, "default")) {
      return FromDefault(schema.default);
    } else if (schema.minLength !== undefined) {
      return Array.from({ length: schema.minLength }).map(() => " ").join("");
    } else {
      return "";
    }
  }
}
function FromSymbol4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if ("value" in schema) {
    return Symbol.for(schema.value);
  } else {
    return Symbol();
  }
}
function FromTemplateLiteral6(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  }
  if (!IsTemplateLiteralFinite(schema))
    throw new ValueCreateError(schema, "Can only create template literals that produce a finite variants. Consider using a default value.");
  const generated = TemplateLiteralGenerate(schema);
  return generated[0];
}
function FromThis3(schema, references) {
  if (recursiveDepth++ > recursiveMaxDepth)
    throw new ValueCreateError(schema, "Cannot create recursive type as it appears possibly infinite. Consider using a default.");
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Visit7(Deref(schema, references), references);
  }
}
function FromTuple8(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  }
  if (schema.items === undefined) {
    return [];
  } else {
    return Array.from({ length: schema.minItems }).map((_, index) => Visit7(schema.items[index], references));
  }
}
function FromUndefined4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return;
  }
}
function FromUnion13(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.anyOf.length === 0) {
    throw new Error("ValueCreate.Union: Cannot create Union with zero variants");
  } else {
    return Visit7(schema.anyOf[0], references);
  }
}
function FromUint8Array4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minByteLength !== undefined) {
    return new Uint8Array(schema.minByteLength);
  } else {
    return new Uint8Array(0);
  }
}
function FromUnknown4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromVoid4(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return;
  }
}
function FromKind3(schema, references) {
  if (HasPropertyKey2(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new Error("User defined types must specify a default value");
  }
}
function Visit7(schema, references) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return FromAny4(schema_, references_);
    case "Argument":
      return FromArgument4(schema_, references_);
    case "Array":
      return FromArray10(schema_, references_);
    case "AsyncIterator":
      return FromAsyncIterator6(schema_, references_);
    case "BigInt":
      return FromBigInt4(schema_, references_);
    case "Boolean":
      return FromBoolean4(schema_, references_);
    case "Constructor":
      return FromConstructor6(schema_, references_);
    case "Date":
      return FromDate5(schema_, references_);
    case "Function":
      return FromFunction6(schema_, references_);
    case "Import":
      return FromImport3(schema_, references_);
    case "Integer":
      return FromInteger4(schema_, references_);
    case "Intersect":
      return FromIntersect11(schema_, references_);
    case "Iterator":
      return FromIterator6(schema_, references_);
    case "Literal":
      return FromLiteral5(schema_, references_);
    case "Never":
      return FromNever4(schema_, references_);
    case "Not":
      return FromNot4(schema_, references_);
    case "Null":
      return FromNull4(schema_, references_);
    case "Number":
      return FromNumber4(schema_, references_);
    case "Object":
      return FromObject11(schema_, references_);
    case "Promise":
      return FromPromise6(schema_, references_);
    case "Record":
      return FromRecord6(schema_, references_);
    case "Ref":
      return FromRef7(schema_, references_);
    case "RegExp":
      return FromRegExp4(schema_, references_);
    case "String":
      return FromString4(schema_, references_);
    case "Symbol":
      return FromSymbol4(schema_, references_);
    case "TemplateLiteral":
      return FromTemplateLiteral6(schema_, references_);
    case "This":
      return FromThis3(schema_, references_);
    case "Tuple":
      return FromTuple8(schema_, references_);
    case "Undefined":
      return FromUndefined4(schema_, references_);
    case "Union":
      return FromUnion13(schema_, references_);
    case "Uint8Array":
      return FromUint8Array4(schema_, references_);
    case "Unknown":
      return FromUnknown4(schema_, references_);
    case "Void":
      return FromVoid4(schema_, references_);
    default:
      if (!exports_type2.Has(schema_[Kind]))
        throw new ValueCreateError(schema_, "Unknown type");
      return FromKind3(schema_, references_);
  }
}
var recursiveMaxDepth = 512;
var recursiveDepth = 0;
function Create2(...args) {
  recursiveDepth = 0;
  return args.length === 2 ? Visit7(args[0], args[1]) : Visit7(args[0], []);
}

// node_modules/@sinclair/typebox/build/esm/value/cast/cast.mjs
class ValueCastError extends TypeBoxError {
  constructor(schema, message) {
    super(message);
    this.schema = schema;
  }
}
function ScoreUnion(schema, references, value) {
  if (schema[Kind] === "Object" && typeof value === "object" && !IsNull2(value)) {
    const object = schema;
    const keys = Object.getOwnPropertyNames(value);
    const entries = Object.entries(object.properties);
    return entries.reduce((acc, [key, schema2]) => {
      const literal = schema2[Kind] === "Literal" && schema2.const === value[key] ? 100 : 0;
      const checks = Check(schema2, references, value[key]) ? 10 : 0;
      const exists = keys.includes(key) ? 1 : 0;
      return acc + (literal + checks + exists);
    }, 0);
  } else if (schema[Kind] === "Union") {
    const schemas = schema.anyOf.map((schema2) => Deref(schema2, references));
    const scores = schemas.map((schema2) => ScoreUnion(schema2, references, value));
    return Math.max(...scores);
  } else {
    return Check(schema, references, value) ? 1 : 0;
  }
}
function SelectUnion(union, references, value) {
  const schemas = union.anyOf.map((schema) => Deref(schema, references));
  let [select, best] = [schemas[0], 0];
  for (const schema of schemas) {
    const score = ScoreUnion(schema, references, value);
    if (score > best) {
      select = schema;
      best = score;
    }
  }
  return select;
}
function CastUnion(union, references, value) {
  if ("default" in union) {
    return typeof value === "function" ? union.default : Clone2(union.default);
  } else {
    const schema = SelectUnion(union, references, value);
    return Cast(schema, references, value);
  }
}
function DefaultClone(schema, references, value) {
  return Check(schema, references, value) ? Clone2(value) : Create2(schema, references);
}
function Default(schema, references, value) {
  return Check(schema, references, value) ? value : Create2(schema, references);
}
function FromArray11(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  const created = IsArray2(value) ? Clone2(value) : Create2(schema, references);
  const minimum = IsNumber2(schema.minItems) && created.length < schema.minItems ? [...created, ...Array.from({ length: schema.minItems - created.length }, () => null)] : created;
  const maximum = IsNumber2(schema.maxItems) && minimum.length > schema.maxItems ? minimum.slice(0, schema.maxItems) : minimum;
  const casted = maximum.map((value2) => Visit8(schema.items, references, value2));
  if (schema.uniqueItems !== true)
    return casted;
  const unique = [...new Set(casted)];
  if (!Check(schema, references, unique))
    throw new ValueCastError(schema, "Array cast produced invalid data due to uniqueItems constraint");
  return unique;
}
function FromConstructor7(schema, references, value) {
  if (Check(schema, references, value))
    return Create2(schema, references);
  const required = new Set(schema.returns.required || []);
  const result = function() {};
  for (const [key, property] of Object.entries(schema.returns.properties)) {
    if (!required.has(key) && value.prototype[key] === undefined)
      continue;
    result.prototype[key] = Visit8(property, references, value.prototype[key]);
  }
  return result;
}
function FromImport4(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit8(target, [...references, ...definitions], value);
}
function IntersectAssign(correct, value) {
  if (IsObject2(correct) && !IsObject2(value) || !IsObject2(correct) && IsObject2(value))
    return correct;
  if (!IsObject2(correct) || !IsObject2(value))
    return value;
  return globalThis.Object.getOwnPropertyNames(correct).reduce((result, key) => {
    const property = key in value ? IntersectAssign(correct[key], value[key]) : correct[key];
    return { ...result, [key]: property };
  }, {});
}
function FromIntersect12(schema, references, value) {
  if (Check(schema, references, value))
    return value;
  const correct = Create2(schema, references);
  const assigned = IntersectAssign(correct, value);
  return Check(schema, references, assigned) ? assigned : correct;
}
function FromNever5(schema, references, value) {
  throw new ValueCastError(schema, "Never types cannot be cast");
}
function FromObject12(schema, references, value) {
  if (Check(schema, references, value))
    return value;
  if (value === null || typeof value !== "object")
    return Create2(schema, references);
  const required = new Set(schema.required || []);
  const result = {};
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!required.has(key) && value[key] === undefined)
      continue;
    result[key] = Visit8(property, references, value[key]);
  }
  if (typeof schema.additionalProperties === "object") {
    const propertyNames = Object.getOwnPropertyNames(schema.properties);
    for (const propertyName of Object.getOwnPropertyNames(value)) {
      if (propertyNames.includes(propertyName))
        continue;
      result[propertyName] = Visit8(schema.additionalProperties, references, value[propertyName]);
    }
  }
  return result;
}
function FromRecord7(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  if (value === null || typeof value !== "object" || Array.isArray(value) || value instanceof Date)
    return Create2(schema, references);
  const subschemaPropertyName = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const subschema = schema.patternProperties[subschemaPropertyName];
  const result = {};
  for (const [propKey, propValue] of Object.entries(value)) {
    result[propKey] = Visit8(subschema, references, propValue);
  }
  return result;
}
function FromRef8(schema, references, value) {
  return Visit8(Deref(schema, references), references, value);
}
function FromThis4(schema, references, value) {
  return Visit8(Deref(schema, references), references, value);
}
function FromTuple9(schema, references, value) {
  if (Check(schema, references, value))
    return Clone2(value);
  if (!IsArray2(value))
    return Create2(schema, references);
  if (schema.items === undefined)
    return [];
  return schema.items.map((schema2, index) => Visit8(schema2, references, value[index]));
}
function FromUnion14(schema, references, value) {
  return Check(schema, references, value) ? Clone2(value) : CastUnion(schema, references, value);
}
function Visit8(schema, references, value) {
  const references_ = IsString2(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray11(schema_, references_, value);
    case "Constructor":
      return FromConstructor7(schema_, references_, value);
    case "Import":
      return FromImport4(schema_, references_, value);
    case "Intersect":
      return FromIntersect12(schema_, references_, value);
    case "Never":
      return FromNever5(schema_, references_, value);
    case "Object":
      return FromObject12(schema_, references_, value);
    case "Record":
      return FromRecord7(schema_, references_, value);
    case "Ref":
      return FromRef8(schema_, references_, value);
    case "This":
      return FromThis4(schema_, references_, value);
    case "Tuple":
      return FromTuple9(schema_, references_, value);
    case "Union":
      return FromUnion14(schema_, references_, value);
    case "Date":
    case "Symbol":
    case "Uint8Array":
      return DefaultClone(schema, references, value);
    default:
      return Default(schema_, references_, value);
  }
}
function Cast(...args) {
  return args.length === 3 ? Visit8(args[0], args[1], args[2]) : Visit8(args[0], [], args[1]);
}
// node_modules/@sinclair/typebox/build/esm/value/clean/clean.mjs
function IsCheckable(schema) {
  return IsKind(schema) && schema[Kind] !== "Unsafe";
}
function FromArray12(schema, references, value) {
  if (!IsArray2(value))
    return value;
  return value.map((value2) => Visit9(schema.items, references, value2));
}
function FromImport5(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit9(target, [...references, ...definitions], value);
}
function FromIntersect13(schema, references, value) {
  const unevaluatedProperties = schema.unevaluatedProperties;
  const intersections = schema.allOf.map((schema2) => Visit9(schema2, references, Clone2(value)));
  const composite = intersections.reduce((acc, value2) => IsObject2(value2) ? { ...acc, ...value2 } : value2, {});
  if (!IsObject2(value) || !IsObject2(composite) || !IsKind(unevaluatedProperties))
    return composite;
  const knownkeys = KeyOfPropertyKeys(schema);
  for (const key of Object.getOwnPropertyNames(value)) {
    if (knownkeys.includes(key))
      continue;
    if (Check(unevaluatedProperties, references, value[key])) {
      composite[key] = Visit9(unevaluatedProperties, references, value[key]);
    }
  }
  return composite;
}
function FromObject13(schema, references, value) {
  if (!IsObject2(value) || IsArray2(value))
    return value;
  const additionalProperties = schema.additionalProperties;
  for (const key of Object.getOwnPropertyNames(value)) {
    if (HasPropertyKey2(schema.properties, key)) {
      value[key] = Visit9(schema.properties[key], references, value[key]);
      continue;
    }
    if (IsKind(additionalProperties) && Check(additionalProperties, references, value[key])) {
      value[key] = Visit9(additionalProperties, references, value[key]);
      continue;
    }
    delete value[key];
  }
  return value;
}
function FromRecord8(schema, references, value) {
  if (!IsObject2(value))
    return value;
  const additionalProperties = schema.additionalProperties;
  const propertyKeys = Object.getOwnPropertyNames(value);
  const [propertyKey, propertySchema] = Object.entries(schema.patternProperties)[0];
  const propertyKeyTest = new RegExp(propertyKey);
  for (const key of propertyKeys) {
    if (propertyKeyTest.test(key)) {
      value[key] = Visit9(propertySchema, references, value[key]);
      continue;
    }
    if (IsKind(additionalProperties) && Check(additionalProperties, references, value[key])) {
      value[key] = Visit9(additionalProperties, references, value[key]);
      continue;
    }
    delete value[key];
  }
  return value;
}
function FromRef9(schema, references, value) {
  return Visit9(Deref(schema, references), references, value);
}
function FromThis5(schema, references, value) {
  return Visit9(Deref(schema, references), references, value);
}
function FromTuple10(schema, references, value) {
  if (!IsArray2(value))
    return value;
  if (IsUndefined2(schema.items))
    return [];
  const length = Math.min(value.length, schema.items.length);
  for (let i = 0;i < length; i++) {
    value[i] = Visit9(schema.items[i], references, value[i]);
  }
  return value.length > length ? value.slice(0, length) : value;
}
function FromUnion15(schema, references, value) {
  for (const inner of schema.anyOf) {
    if (IsCheckable(inner) && Check(inner, references, value)) {
      return Visit9(inner, references, value);
    }
  }
  return value;
}
function Visit9(schema, references, value) {
  const references_ = IsString2(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Array":
      return FromArray12(schema_, references_, value);
    case "Import":
      return FromImport5(schema_, references_, value);
    case "Intersect":
      return FromIntersect13(schema_, references_, value);
    case "Object":
      return FromObject13(schema_, references_, value);
    case "Record":
      return FromRecord8(schema_, references_, value);
    case "Ref":
      return FromRef9(schema_, references_, value);
    case "This":
      return FromThis5(schema_, references_, value);
    case "Tuple":
      return FromTuple10(schema_, references_, value);
    case "Union":
      return FromUnion15(schema_, references_, value);
    default:
      return value;
  }
}
function Clean(...args) {
  return args.length === 3 ? Visit9(args[0], args[1], args[2]) : Visit9(args[0], [], args[1]);
}
// node_modules/@sinclair/typebox/build/esm/value/convert/convert.mjs
function IsStringNumeric(value) {
  return IsString2(value) && !isNaN(value) && !isNaN(parseFloat(value));
}
function IsValueToString(value) {
  return IsBigInt2(value) || IsBoolean2(value) || IsNumber2(value);
}
function IsValueTrue(value) {
  return value === true || IsNumber2(value) && value === 1 || IsBigInt2(value) && value === BigInt("1") || IsString2(value) && (value.toLowerCase() === "true" || value === "1");
}
function IsValueFalse(value) {
  return value === false || IsNumber2(value) && (value === 0 || Object.is(value, -0)) || IsBigInt2(value) && value === BigInt("0") || IsString2(value) && (value.toLowerCase() === "false" || value === "0" || value === "-0");
}
function IsTimeStringWithTimeZone(value) {
  return IsString2(value) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value);
}
function IsTimeStringWithoutTimeZone(value) {
  return IsString2(value) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value);
}
function IsDateTimeStringWithTimeZone(value) {
  return IsString2(value) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value);
}
function IsDateTimeStringWithoutTimeZone(value) {
  return IsString2(value) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value);
}
function IsDateString(value) {
  return IsString2(value) && /^\d\d\d\d-[0-1]\d-[0-3]\d$/i.test(value);
}
function TryConvertLiteralString(value, target) {
  const conversion = TryConvertString(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteralNumber(value, target) {
  const conversion = TryConvertNumber(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteralBoolean(value, target) {
  const conversion = TryConvertBoolean(value);
  return conversion === target ? conversion : value;
}
function TryConvertLiteral(schema, value) {
  return IsString2(schema.const) ? TryConvertLiteralString(value, schema.const) : IsNumber2(schema.const) ? TryConvertLiteralNumber(value, schema.const) : IsBoolean2(schema.const) ? TryConvertLiteralBoolean(value, schema.const) : value;
}
function TryConvertBoolean(value) {
  return IsValueTrue(value) ? true : IsValueFalse(value) ? false : value;
}
function TryConvertBigInt(value) {
  const truncateInteger = (value2) => value2.split(".")[0];
  return IsStringNumeric(value) ? BigInt(truncateInteger(value)) : IsNumber2(value) ? BigInt(Math.trunc(value)) : IsValueFalse(value) ? BigInt(0) : IsValueTrue(value) ? BigInt(1) : value;
}
function TryConvertString(value) {
  return IsSymbol2(value) && value.description !== undefined ? value.description.toString() : IsValueToString(value) ? value.toString() : value;
}
function TryConvertNumber(value) {
  return IsStringNumeric(value) ? parseFloat(value) : IsValueTrue(value) ? 1 : IsValueFalse(value) ? 0 : value;
}
function TryConvertInteger(value) {
  return IsStringNumeric(value) ? parseInt(value) : IsNumber2(value) ? Math.trunc(value) : IsValueTrue(value) ? 1 : IsValueFalse(value) ? 0 : value;
}
function TryConvertNull(value) {
  return IsString2(value) && value.toLowerCase() === "null" ? null : value;
}
function TryConvertUndefined(value) {
  return IsString2(value) && value === "undefined" ? undefined : value;
}
function TryConvertDate(value) {
  return IsDate2(value) ? value : IsNumber2(value) ? new Date(value) : IsValueTrue(value) ? new Date(1) : IsValueFalse(value) ? new Date(0) : IsStringNumeric(value) ? new Date(parseInt(value)) : IsTimeStringWithoutTimeZone(value) ? new Date(`1970-01-01T${value}.000Z`) : IsTimeStringWithTimeZone(value) ? new Date(`1970-01-01T${value}`) : IsDateTimeStringWithoutTimeZone(value) ? new Date(`${value}.000Z`) : IsDateTimeStringWithTimeZone(value) ? new Date(value) : IsDateString(value) ? new Date(`${value}T00:00:00.000Z`) : value;
}
function Default2(value) {
  return value;
}
function FromArray13(schema, references, value) {
  const elements = IsArray2(value) ? value : [value];
  return elements.map((element) => Visit10(schema.items, references, element));
}
function FromBigInt5(schema, references, value) {
  return TryConvertBigInt(value);
}
function FromBoolean5(schema, references, value) {
  return TryConvertBoolean(value);
}
function FromDate6(schema, references, value) {
  return TryConvertDate(value);
}
function FromImport6(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit10(target, [...references, ...definitions], value);
}
function FromInteger5(schema, references, value) {
  return TryConvertInteger(value);
}
function FromIntersect14(schema, references, value) {
  return schema.allOf.reduce((value2, schema2) => Visit10(schema2, references, value2), value);
}
function FromLiteral6(schema, references, value) {
  return TryConvertLiteral(schema, value);
}
function FromNull5(schema, references, value) {
  return TryConvertNull(value);
}
function FromNumber5(schema, references, value) {
  return TryConvertNumber(value);
}
function FromObject14(schema, references, value) {
  if (!IsObject2(value) || IsArray2(value))
    return value;
  for (const propertyKey of Object.getOwnPropertyNames(schema.properties)) {
    if (!HasPropertyKey2(value, propertyKey))
      continue;
    value[propertyKey] = Visit10(schema.properties[propertyKey], references, value[propertyKey]);
  }
  return value;
}
function FromRecord9(schema, references, value) {
  const isConvertable = IsObject2(value) && !IsArray2(value);
  if (!isConvertable)
    return value;
  const propertyKey = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const property = schema.patternProperties[propertyKey];
  for (const [propKey, propValue] of Object.entries(value)) {
    value[propKey] = Visit10(property, references, propValue);
  }
  return value;
}
function FromRef10(schema, references, value) {
  return Visit10(Deref(schema, references), references, value);
}
function FromString5(schema, references, value) {
  return TryConvertString(value);
}
function FromSymbol5(schema, references, value) {
  return IsString2(value) || IsNumber2(value) ? Symbol(value) : value;
}
function FromThis6(schema, references, value) {
  return Visit10(Deref(schema, references), references, value);
}
function FromTuple11(schema, references, value) {
  const isConvertable = IsArray2(value) && !IsUndefined2(schema.items);
  if (!isConvertable)
    return value;
  return value.map((value2, index) => {
    return index < schema.items.length ? Visit10(schema.items[index], references, value2) : value2;
  });
}
function FromUndefined5(schema, references, value) {
  return TryConvertUndefined(value);
}
function FromUnion16(schema, references, value) {
  for (const subschema of schema.anyOf) {
    if (Check(subschema, references, value)) {
      return value;
    }
  }
  for (const subschema of schema.anyOf) {
    const converted = Visit10(subschema, references, Clone2(value));
    if (!Check(subschema, references, converted))
      continue;
    return converted;
  }
  return value;
}
function Visit10(schema, references, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray13(schema_, references_, value);
    case "BigInt":
      return FromBigInt5(schema_, references_, value);
    case "Boolean":
      return FromBoolean5(schema_, references_, value);
    case "Date":
      return FromDate6(schema_, references_, value);
    case "Import":
      return FromImport6(schema_, references_, value);
    case "Integer":
      return FromInteger5(schema_, references_, value);
    case "Intersect":
      return FromIntersect14(schema_, references_, value);
    case "Literal":
      return FromLiteral6(schema_, references_, value);
    case "Null":
      return FromNull5(schema_, references_, value);
    case "Number":
      return FromNumber5(schema_, references_, value);
    case "Object":
      return FromObject14(schema_, references_, value);
    case "Record":
      return FromRecord9(schema_, references_, value);
    case "Ref":
      return FromRef10(schema_, references_, value);
    case "String":
      return FromString5(schema_, references_, value);
    case "Symbol":
      return FromSymbol5(schema_, references_, value);
    case "This":
      return FromThis6(schema_, references_, value);
    case "Tuple":
      return FromTuple11(schema_, references_, value);
    case "Undefined":
      return FromUndefined5(schema_, references_, value);
    case "Union":
      return FromUnion16(schema_, references_, value);
    default:
      return Default2(value);
  }
}
function Convert(...args) {
  return args.length === 3 ? Visit10(args[0], args[1], args[2]) : Visit10(args[0], [], args[1]);
}
// node_modules/@sinclair/typebox/build/esm/value/transform/decode.mjs
class TransformDecodeCheckError extends TypeBoxError {
  constructor(schema, value, error) {
    super(`Unable to decode value as it does not match the expected schema`);
    this.schema = schema;
    this.value = value;
    this.error = error;
  }
}

class TransformDecodeError extends TypeBoxError {
  constructor(schema, path, value, error) {
    super(error instanceof Error ? error.message : "Unknown error");
    this.schema = schema;
    this.path = path;
    this.value = value;
    this.error = error;
  }
}
function Default3(schema, path, value) {
  try {
    return IsTransform(schema) ? schema[TransformKind].Decode(value) : value;
  } catch (error) {
    throw new TransformDecodeError(schema, path, value, error);
  }
}
function FromArray14(schema, references, path, value) {
  return IsArray2(value) ? Default3(schema, path, value.map((value2, index) => Visit11(schema.items, references, `${path}/${index}`, value2))) : Default3(schema, path, value);
}
function FromIntersect15(schema, references, path, value) {
  if (!IsObject2(value) || IsValueType(value))
    return Default3(schema, path, value);
  const knownEntries = KeyOfPropertyEntries(schema);
  const knownKeys = knownEntries.map((entry) => entry[0]);
  const knownProperties = { ...value };
  for (const [knownKey, knownSchema] of knownEntries)
    if (knownKey in knownProperties) {
      knownProperties[knownKey] = Visit11(knownSchema, references, `${path}/${knownKey}`, knownProperties[knownKey]);
    }
  if (!IsTransform(schema.unevaluatedProperties)) {
    return Default3(schema, path, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const unevaluatedProperties = schema.unevaluatedProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      unknownProperties[key] = Default3(unevaluatedProperties, `${path}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path, unknownProperties);
}
function FromImport7(schema, references, path, value) {
  const additional = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  const result = Visit11(target, [...references, ...additional], path, value);
  return Default3(schema, path, result);
}
function FromNot5(schema, references, path, value) {
  return Default3(schema, path, Visit11(schema.not, references, path, value));
}
function FromObject15(schema, references, path, value) {
  if (!IsObject2(value))
    return Default3(schema, path, value);
  const knownKeys = KeyOfPropertyKeys(schema);
  const knownProperties = { ...value };
  for (const key of knownKeys) {
    if (!HasPropertyKey2(knownProperties, key))
      continue;
    if (IsUndefined2(knownProperties[key]) && (!IsUndefined3(schema.properties[key]) || TypeSystemPolicy.IsExactOptionalProperty(knownProperties, key)))
      continue;
    knownProperties[key] = Visit11(schema.properties[key], references, `${path}/${key}`, knownProperties[key]);
  }
  if (!IsSchema(schema.additionalProperties)) {
    return Default3(schema, path, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      unknownProperties[key] = Default3(additionalProperties, `${path}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path, unknownProperties);
}
function FromRecord10(schema, references, path, value) {
  if (!IsObject2(value))
    return Default3(schema, path, value);
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const knownKeys = new RegExp(pattern);
  const knownProperties = { ...value };
  for (const key of Object.getOwnPropertyNames(value))
    if (knownKeys.test(key)) {
      knownProperties[key] = Visit11(schema.patternProperties[pattern], references, `${path}/${key}`, knownProperties[key]);
    }
  if (!IsSchema(schema.additionalProperties)) {
    return Default3(schema, path, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.test(key)) {
      unknownProperties[key] = Default3(additionalProperties, `${path}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path, unknownProperties);
}
function FromRef11(schema, references, path, value) {
  const target = Deref(schema, references);
  return Default3(schema, path, Visit11(target, references, path, value));
}
function FromThis7(schema, references, path, value) {
  const target = Deref(schema, references);
  return Default3(schema, path, Visit11(target, references, path, value));
}
function FromTuple12(schema, references, path, value) {
  return IsArray2(value) && IsArray2(schema.items) ? Default3(schema, path, schema.items.map((schema2, index) => Visit11(schema2, references, `${path}/${index}`, value[index]))) : Default3(schema, path, value);
}
function FromUnion17(schema, references, path, value) {
  for (const subschema of schema.anyOf) {
    if (!Check(subschema, references, value))
      continue;
    const decoded = Visit11(subschema, references, path, value);
    return Default3(schema, path, decoded);
  }
  return Default3(schema, path, value);
}
function Visit11(schema, references, path, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray14(schema_, references_, path, value);
    case "Import":
      return FromImport7(schema_, references_, path, value);
    case "Intersect":
      return FromIntersect15(schema_, references_, path, value);
    case "Not":
      return FromNot5(schema_, references_, path, value);
    case "Object":
      return FromObject15(schema_, references_, path, value);
    case "Record":
      return FromRecord10(schema_, references_, path, value);
    case "Ref":
      return FromRef11(schema_, references_, path, value);
    case "Symbol":
      return Default3(schema_, path, value);
    case "This":
      return FromThis7(schema_, references_, path, value);
    case "Tuple":
      return FromTuple12(schema_, references_, path, value);
    case "Union":
      return FromUnion17(schema_, references_, path, value);
    default:
      return Default3(schema_, path, value);
  }
}
function TransformDecode(schema, references, value) {
  return Visit11(schema, references, "", value);
}

// node_modules/@sinclair/typebox/build/esm/value/transform/encode.mjs
class TransformEncodeCheckError extends TypeBoxError {
  constructor(schema, value, error) {
    super(`The encoded value does not match the expected schema`);
    this.schema = schema;
    this.value = value;
    this.error = error;
  }
}

class TransformEncodeError extends TypeBoxError {
  constructor(schema, path, value, error) {
    super(`${error instanceof Error ? error.message : "Unknown error"}`);
    this.schema = schema;
    this.path = path;
    this.value = value;
    this.error = error;
  }
}
function Default4(schema, path, value) {
  try {
    return IsTransform(schema) ? schema[TransformKind].Encode(value) : value;
  } catch (error) {
    throw new TransformEncodeError(schema, path, value, error);
  }
}
function FromArray15(schema, references, path, value) {
  const defaulted = Default4(schema, path, value);
  return IsArray2(defaulted) ? defaulted.map((value2, index) => Visit12(schema.items, references, `${path}/${index}`, value2)) : defaulted;
}
function FromImport8(schema, references, path, value) {
  const additional = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  const result = Default4(schema, path, value);
  return Visit12(target, [...references, ...additional], path, result);
}
function FromIntersect16(schema, references, path, value) {
  const defaulted = Default4(schema, path, value);
  if (!IsObject2(value) || IsValueType(value))
    return defaulted;
  const knownEntries = KeyOfPropertyEntries(schema);
  const knownKeys = knownEntries.map((entry) => entry[0]);
  const knownProperties = { ...defaulted };
  for (const [knownKey, knownSchema] of knownEntries)
    if (knownKey in knownProperties) {
      knownProperties[knownKey] = Visit12(knownSchema, references, `${path}/${knownKey}`, knownProperties[knownKey]);
    }
  if (!IsTransform(schema.unevaluatedProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const unevaluatedProperties = schema.unevaluatedProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      properties[key] = Default4(unevaluatedProperties, `${path}/${key}`, properties[key]);
    }
  return properties;
}
function FromNot6(schema, references, path, value) {
  return Default4(schema.not, path, Default4(schema, path, value));
}
function FromObject16(schema, references, path, value) {
  const defaulted = Default4(schema, path, value);
  if (!IsObject2(defaulted))
    return defaulted;
  const knownKeys = KeyOfPropertyKeys(schema);
  const knownProperties = { ...defaulted };
  for (const key of knownKeys) {
    if (!HasPropertyKey2(knownProperties, key))
      continue;
    if (IsUndefined2(knownProperties[key]) && (!IsUndefined3(schema.properties[key]) || TypeSystemPolicy.IsExactOptionalProperty(knownProperties, key)))
      continue;
    knownProperties[key] = Visit12(schema.properties[key], references, `${path}/${key}`, knownProperties[key]);
  }
  if (!IsSchema(schema.additionalProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      properties[key] = Default4(additionalProperties, `${path}/${key}`, properties[key]);
    }
  return properties;
}
function FromRecord11(schema, references, path, value) {
  const defaulted = Default4(schema, path, value);
  if (!IsObject2(value))
    return defaulted;
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const knownKeys = new RegExp(pattern);
  const knownProperties = { ...defaulted };
  for (const key of Object.getOwnPropertyNames(value))
    if (knownKeys.test(key)) {
      knownProperties[key] = Visit12(schema.patternProperties[pattern], references, `${path}/${key}`, knownProperties[key]);
    }
  if (!IsSchema(schema.additionalProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.test(key)) {
      properties[key] = Default4(additionalProperties, `${path}/${key}`, properties[key]);
    }
  return properties;
}
function FromRef12(schema, references, path, value) {
  const target = Deref(schema, references);
  const resolved = Visit12(target, references, path, value);
  return Default4(schema, path, resolved);
}
function FromThis8(schema, references, path, value) {
  const target = Deref(schema, references);
  const resolved = Visit12(target, references, path, value);
  return Default4(schema, path, resolved);
}
function FromTuple13(schema, references, path, value) {
  const value1 = Default4(schema, path, value);
  return IsArray2(schema.items) ? schema.items.map((schema2, index) => Visit12(schema2, references, `${path}/${index}`, value1[index])) : [];
}
function FromUnion18(schema, references, path, value) {
  for (const subschema of schema.anyOf) {
    if (!Check(subschema, references, value))
      continue;
    const value1 = Visit12(subschema, references, path, value);
    return Default4(schema, path, value1);
  }
  for (const subschema of schema.anyOf) {
    const value1 = Visit12(subschema, references, path, value);
    if (!Check(schema, references, value1))
      continue;
    return Default4(schema, path, value1);
  }
  return Default4(schema, path, value);
}
function Visit12(schema, references, path, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray15(schema_, references_, path, value);
    case "Import":
      return FromImport8(schema_, references_, path, value);
    case "Intersect":
      return FromIntersect16(schema_, references_, path, value);
    case "Not":
      return FromNot6(schema_, references_, path, value);
    case "Object":
      return FromObject16(schema_, references_, path, value);
    case "Record":
      return FromRecord11(schema_, references_, path, value);
    case "Ref":
      return FromRef12(schema_, references_, path, value);
    case "This":
      return FromThis8(schema_, references_, path, value);
    case "Tuple":
      return FromTuple13(schema_, references_, path, value);
    case "Union":
      return FromUnion18(schema_, references_, path, value);
    default:
      return Default4(schema_, path, value);
  }
}
function TransformEncode(schema, references, value) {
  return Visit12(schema, references, "", value);
}

// node_modules/@sinclair/typebox/build/esm/value/transform/has.mjs
function FromArray16(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromAsyncIterator7(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromConstructor8(schema, references) {
  return IsTransform(schema) || Visit13(schema.returns, references) || schema.parameters.some((schema2) => Visit13(schema2, references));
}
function FromFunction7(schema, references) {
  return IsTransform(schema) || Visit13(schema.returns, references) || schema.parameters.some((schema2) => Visit13(schema2, references));
}
function FromIntersect17(schema, references) {
  return IsTransform(schema) || IsTransform(schema.unevaluatedProperties) || schema.allOf.some((schema2) => Visit13(schema2, references));
}
function FromImport9(schema, references) {
  const additional = globalThis.Object.getOwnPropertyNames(schema.$defs).reduce((result, key) => [...result, schema.$defs[key]], []);
  const target = schema.$defs[schema.$ref];
  return IsTransform(schema) || Visit13(target, [...additional, ...references]);
}
function FromIterator7(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromNot7(schema, references) {
  return IsTransform(schema) || Visit13(schema.not, references);
}
function FromObject17(schema, references) {
  return IsTransform(schema) || Object.values(schema.properties).some((schema2) => Visit13(schema2, references)) || IsSchema(schema.additionalProperties) && Visit13(schema.additionalProperties, references);
}
function FromPromise7(schema, references) {
  return IsTransform(schema) || Visit13(schema.item, references);
}
function FromRecord12(schema, references) {
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const property = schema.patternProperties[pattern];
  return IsTransform(schema) || Visit13(property, references) || IsSchema(schema.additionalProperties) && IsTransform(schema.additionalProperties);
}
function FromRef13(schema, references) {
  if (IsTransform(schema))
    return true;
  return Visit13(Deref(schema, references), references);
}
function FromThis9(schema, references) {
  if (IsTransform(schema))
    return true;
  return Visit13(Deref(schema, references), references);
}
function FromTuple14(schema, references) {
  return IsTransform(schema) || !IsUndefined2(schema.items) && schema.items.some((schema2) => Visit13(schema2, references));
}
function FromUnion19(schema, references) {
  return IsTransform(schema) || schema.anyOf.some((schema2) => Visit13(schema2, references));
}
function Visit13(schema, references) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  if (schema.$id && visited.has(schema.$id))
    return false;
  if (schema.$id)
    visited.add(schema.$id);
  switch (schema[Kind]) {
    case "Array":
      return FromArray16(schema_, references_);
    case "AsyncIterator":
      return FromAsyncIterator7(schema_, references_);
    case "Constructor":
      return FromConstructor8(schema_, references_);
    case "Function":
      return FromFunction7(schema_, references_);
    case "Import":
      return FromImport9(schema_, references_);
    case "Intersect":
      return FromIntersect17(schema_, references_);
    case "Iterator":
      return FromIterator7(schema_, references_);
    case "Not":
      return FromNot7(schema_, references_);
    case "Object":
      return FromObject17(schema_, references_);
    case "Promise":
      return FromPromise7(schema_, references_);
    case "Record":
      return FromRecord12(schema_, references_);
    case "Ref":
      return FromRef13(schema_, references_);
    case "This":
      return FromThis9(schema_, references_);
    case "Tuple":
      return FromTuple14(schema_, references_);
    case "Union":
      return FromUnion19(schema_, references_);
    default:
      return IsTransform(schema);
  }
}
var visited = new Set;
function HasTransform(schema, references) {
  visited.clear();
  return Visit13(schema, references);
}

// node_modules/@sinclair/typebox/build/esm/value/decode/decode.mjs
function Decode(...args) {
  const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
  if (!Check(schema, references, value))
    throw new TransformDecodeCheckError(schema, value, Errors(schema, references, value).First());
  return HasTransform(schema, references) ? TransformDecode(schema, references, value) : value;
}
// node_modules/@sinclair/typebox/build/esm/value/default/default.mjs
function ValueOrDefault(schema, value) {
  const defaultValue = HasPropertyKey2(schema, "default") ? schema.default : undefined;
  const clone = IsFunction2(defaultValue) ? defaultValue() : Clone2(defaultValue);
  return IsUndefined2(value) ? clone : IsObject2(value) && IsObject2(clone) ? Object.assign(clone, value) : value;
}
function HasDefaultProperty(schema) {
  return IsKind(schema) && "default" in schema;
}
function FromArray17(schema, references, value) {
  if (IsArray2(value)) {
    for (let i = 0;i < value.length; i++) {
      value[i] = Visit14(schema.items, references, value[i]);
    }
    return value;
  }
  const defaulted = ValueOrDefault(schema, value);
  if (!IsArray2(defaulted))
    return defaulted;
  for (let i = 0;i < defaulted.length; i++) {
    defaulted[i] = Visit14(schema.items, references, defaulted[i]);
  }
  return defaulted;
}
function FromDate7(schema, references, value) {
  return IsDate2(value) ? value : ValueOrDefault(schema, value);
}
function FromImport10(schema, references, value) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit14(target, [...references, ...definitions], value);
}
function FromIntersect18(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  return schema.allOf.reduce((acc, schema2) => {
    const next = Visit14(schema2, references, defaulted);
    return IsObject2(next) ? { ...acc, ...next } : next;
  }, {});
}
function FromObject18(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsObject2(defaulted))
    return defaulted;
  const knownPropertyKeys = Object.getOwnPropertyNames(schema.properties);
  for (const key of knownPropertyKeys) {
    const propertyValue = Visit14(schema.properties[key], references, defaulted[key]);
    if (IsUndefined2(propertyValue))
      continue;
    defaulted[key] = Visit14(schema.properties[key], references, defaulted[key]);
  }
  if (!HasDefaultProperty(schema.additionalProperties))
    return defaulted;
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (knownPropertyKeys.includes(key))
      continue;
    defaulted[key] = Visit14(schema.additionalProperties, references, defaulted[key]);
  }
  return defaulted;
}
function FromRecord13(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsObject2(defaulted))
    return defaulted;
  const additionalPropertiesSchema = schema.additionalProperties;
  const [propertyKeyPattern, propertySchema] = Object.entries(schema.patternProperties)[0];
  const knownPropertyKey = new RegExp(propertyKeyPattern);
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (!(knownPropertyKey.test(key) && HasDefaultProperty(propertySchema)))
      continue;
    defaulted[key] = Visit14(propertySchema, references, defaulted[key]);
  }
  if (!HasDefaultProperty(additionalPropertiesSchema))
    return defaulted;
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (knownPropertyKey.test(key))
      continue;
    defaulted[key] = Visit14(additionalPropertiesSchema, references, defaulted[key]);
  }
  return defaulted;
}
function FromRef14(schema, references, value) {
  return Visit14(Deref(schema, references), references, ValueOrDefault(schema, value));
}
function FromThis10(schema, references, value) {
  return Visit14(Deref(schema, references), references, value);
}
function FromTuple15(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  if (!IsArray2(defaulted) || IsUndefined2(schema.items))
    return defaulted;
  const [items, max] = [schema.items, Math.max(schema.items.length, defaulted.length)];
  for (let i = 0;i < max; i++) {
    if (i < items.length)
      defaulted[i] = Visit14(items[i], references, defaulted[i]);
  }
  return defaulted;
}
function FromUnion20(schema, references, value) {
  const defaulted = ValueOrDefault(schema, value);
  for (const inner of schema.anyOf) {
    const result = Visit14(inner, references, Clone2(defaulted));
    if (Check(inner, references, result)) {
      return result;
    }
  }
  return defaulted;
}
function Visit14(schema, references, value) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Array":
      return FromArray17(schema_, references_, value);
    case "Date":
      return FromDate7(schema_, references_, value);
    case "Import":
      return FromImport10(schema_, references_, value);
    case "Intersect":
      return FromIntersect18(schema_, references_, value);
    case "Object":
      return FromObject18(schema_, references_, value);
    case "Record":
      return FromRecord13(schema_, references_, value);
    case "Ref":
      return FromRef14(schema_, references_, value);
    case "This":
      return FromThis10(schema_, references_, value);
    case "Tuple":
      return FromTuple15(schema_, references_, value);
    case "Union":
      return FromUnion20(schema_, references_, value);
    default:
      return ValueOrDefault(schema_, value);
  }
}
function Default5(...args) {
  return args.length === 3 ? Visit14(args[0], args[1], args[2]) : Visit14(args[0], [], args[1]);
}
// node_modules/@sinclair/typebox/build/esm/value/pointer/pointer.mjs
var exports_pointer = {};
__export(exports_pointer, {
  ValuePointerRootSetError: () => ValuePointerRootSetError,
  ValuePointerRootDeleteError: () => ValuePointerRootDeleteError,
  Set: () => Set4,
  Has: () => Has3,
  Get: () => Get3,
  Format: () => Format,
  Delete: () => Delete3
});
class ValuePointerRootSetError extends TypeBoxError {
  constructor(value, path, update) {
    super("Cannot set root value");
    this.value = value;
    this.path = path;
    this.update = update;
  }
}

class ValuePointerRootDeleteError extends TypeBoxError {
  constructor(value, path) {
    super("Cannot delete root value");
    this.value = value;
    this.path = path;
  }
}
function Escape2(component) {
  return component.indexOf("~") === -1 ? component : component.replace(/~1/g, "/").replace(/~0/g, "~");
}
function* Format(pointer) {
  if (pointer === "")
    return;
  let [start, end] = [0, 0];
  for (let i = 0;i < pointer.length; i++) {
    const char = pointer.charAt(i);
    if (char === "/") {
      if (i === 0) {
        start = i + 1;
      } else {
        end = i;
        yield Escape2(pointer.slice(start, end));
        start = i + 1;
      }
    } else {
      end = i;
    }
  }
  yield Escape2(pointer.slice(start));
}
function Set4(value, pointer, update) {
  if (pointer === "")
    throw new ValuePointerRootSetError(value, pointer, update);
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === undefined)
      next[component] = {};
    owner = next;
    next = next[component];
    key = component;
  }
  owner[key] = update;
}
function Delete3(value, pointer) {
  if (pointer === "")
    throw new ValuePointerRootDeleteError(value, pointer);
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === undefined || next[component] === null)
      return;
    owner = next;
    next = next[component];
    key = component;
  }
  if (Array.isArray(owner)) {
    const index = parseInt(key);
    owner.splice(index, 1);
  } else {
    delete owner[key];
  }
}
function Has3(value, pointer) {
  if (pointer === "")
    return true;
  let [owner, next, key] = [null, value, ""];
  for (const component of Format(pointer)) {
    if (next[component] === undefined)
      return false;
    owner = next;
    next = next[component];
    key = component;
  }
  return Object.getOwnPropertyNames(owner).includes(key);
}
function Get3(value, pointer) {
  if (pointer === "")
    return value;
  let current = value;
  for (const component of Format(pointer)) {
    if (current[component] === undefined)
      return;
    current = current[component];
  }
  return current;
}
// node_modules/@sinclair/typebox/build/esm/value/equal/equal.mjs
function ObjectType3(left, right) {
  if (!IsObject2(right))
    return false;
  const leftKeys = [...Object.keys(left), ...Object.getOwnPropertySymbols(left)];
  const rightKeys = [...Object.keys(right), ...Object.getOwnPropertySymbols(right)];
  if (leftKeys.length !== rightKeys.length)
    return false;
  return leftKeys.every((key) => Equal(left[key], right[key]));
}
function DateType3(left, right) {
  return IsDate2(right) && left.getTime() === right.getTime();
}
function ArrayType3(left, right) {
  if (!IsArray2(right) || left.length !== right.length)
    return false;
  return left.every((value, index) => Equal(value, right[index]));
}
function TypedArrayType(left, right) {
  if (!IsTypedArray(right) || left.length !== right.length || Object.getPrototypeOf(left).constructor.name !== Object.getPrototypeOf(right).constructor.name)
    return false;
  return left.every((value, index) => Equal(value, right[index]));
}
function ValueType(left, right) {
  return left === right;
}
function Equal(left, right) {
  if (IsDate2(left))
    return DateType3(left, right);
  if (IsTypedArray(left))
    return TypedArrayType(left, right);
  if (IsArray2(left))
    return ArrayType3(left, right);
  if (IsObject2(left))
    return ObjectType3(left, right);
  if (IsValueType(left))
    return ValueType(left, right);
  throw new Error("ValueEquals: Unable to compare value");
}

// node_modules/@sinclair/typebox/build/esm/value/delta/delta.mjs
var Insert = Object2({
  type: Literal("insert"),
  path: String2(),
  value: Unknown()
});
var Update = Object2({
  type: Literal("update"),
  path: String2(),
  value: Unknown()
});
var Delete4 = Object2({
  type: Literal("delete"),
  path: String2()
});
var Edit = Union([Insert, Update, Delete4]);

class ValueDiffError extends TypeBoxError {
  constructor(value, message) {
    super(message);
    this.value = value;
  }
}
function CreateUpdate(path, value) {
  return { type: "update", path, value };
}
function CreateInsert(path, value) {
  return { type: "insert", path, value };
}
function CreateDelete(path) {
  return { type: "delete", path };
}
function AssertDiffable(value) {
  if (globalThis.Object.getOwnPropertySymbols(value).length > 0)
    throw new ValueDiffError(value, "Cannot diff objects with symbols");
}
function* ObjectType4(path, current, next) {
  AssertDiffable(current);
  AssertDiffable(next);
  if (!IsStandardObject(next))
    return yield CreateUpdate(path, next);
  const currentKeys = globalThis.Object.getOwnPropertyNames(current);
  const nextKeys = globalThis.Object.getOwnPropertyNames(next);
  for (const key of nextKeys) {
    if (HasPropertyKey2(current, key))
      continue;
    yield CreateInsert(`${path}/${key}`, next[key]);
  }
  for (const key of currentKeys) {
    if (!HasPropertyKey2(next, key))
      continue;
    if (Equal(current, next))
      continue;
    yield* Visit15(`${path}/${key}`, current[key], next[key]);
  }
  for (const key of currentKeys) {
    if (HasPropertyKey2(next, key))
      continue;
    yield CreateDelete(`${path}/${key}`);
  }
}
function* ArrayType4(path, current, next) {
  if (!IsArray2(next))
    return yield CreateUpdate(path, next);
  for (let i = 0;i < Math.min(current.length, next.length); i++) {
    yield* Visit15(`${path}/${i}`, current[i], next[i]);
  }
  for (let i = 0;i < next.length; i++) {
    if (i < current.length)
      continue;
    yield CreateInsert(`${path}/${i}`, next[i]);
  }
  for (let i = current.length - 1;i >= 0; i--) {
    if (i < next.length)
      continue;
    yield CreateDelete(`${path}/${i}`);
  }
}
function* TypedArrayType2(path, current, next) {
  if (!IsTypedArray(next) || current.length !== next.length || globalThis.Object.getPrototypeOf(current).constructor.name !== globalThis.Object.getPrototypeOf(next).constructor.name)
    return yield CreateUpdate(path, next);
  for (let i = 0;i < Math.min(current.length, next.length); i++) {
    yield* Visit15(`${path}/${i}`, current[i], next[i]);
  }
}
function* ValueType2(path, current, next) {
  if (current === next)
    return;
  yield CreateUpdate(path, next);
}
function* Visit15(path, current, next) {
  if (IsStandardObject(current))
    return yield* ObjectType4(path, current, next);
  if (IsArray2(current))
    return yield* ArrayType4(path, current, next);
  if (IsTypedArray(current))
    return yield* TypedArrayType2(path, current, next);
  if (IsValueType(current))
    return yield* ValueType2(path, current, next);
  throw new ValueDiffError(current, "Unable to diff value");
}
function Diff(current, next) {
  return [...Visit15("", current, next)];
}
function IsRootUpdate(edits) {
  return edits.length > 0 && edits[0].path === "" && edits[0].type === "update";
}
function IsIdentity(edits) {
  return edits.length === 0;
}
function Patch(current, edits) {
  if (IsRootUpdate(edits)) {
    return Clone2(edits[0].value);
  }
  if (IsIdentity(edits)) {
    return Clone2(current);
  }
  const clone = Clone2(current);
  for (const edit of edits) {
    switch (edit.type) {
      case "insert": {
        exports_pointer.Set(clone, edit.path, edit.value);
        break;
      }
      case "update": {
        exports_pointer.Set(clone, edit.path, edit.value);
        break;
      }
      case "delete": {
        exports_pointer.Delete(clone, edit.path);
        break;
      }
    }
  }
  return clone;
}
// node_modules/@sinclair/typebox/build/esm/value/encode/encode.mjs
function Encode(...args) {
  const [schema, references, value] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
  const encoded = HasTransform(schema, references) ? TransformEncode(schema, references, value) : value;
  if (!Check(schema, references, encoded))
    throw new TransformEncodeCheckError(schema, encoded, Errors(schema, references, encoded).First());
  return encoded;
}
// node_modules/@sinclair/typebox/build/esm/value/mutate/mutate.mjs
function IsStandardObject2(value) {
  return IsObject2(value) && !IsArray2(value);
}

class ValueMutateError extends TypeBoxError {
  constructor(message) {
    super(message);
  }
}
function ObjectType5(root, path, current, next) {
  if (!IsStandardObject2(current)) {
    exports_pointer.Set(root, path, Clone2(next));
  } else {
    const currentKeys = Object.getOwnPropertyNames(current);
    const nextKeys = Object.getOwnPropertyNames(next);
    for (const currentKey of currentKeys) {
      if (!nextKeys.includes(currentKey)) {
        delete current[currentKey];
      }
    }
    for (const nextKey of nextKeys) {
      if (!currentKeys.includes(nextKey)) {
        current[nextKey] = null;
      }
    }
    for (const nextKey of nextKeys) {
      Visit16(root, `${path}/${nextKey}`, current[nextKey], next[nextKey]);
    }
  }
}
function ArrayType5(root, path, current, next) {
  if (!IsArray2(current)) {
    exports_pointer.Set(root, path, Clone2(next));
  } else {
    for (let index = 0;index < next.length; index++) {
      Visit16(root, `${path}/${index}`, current[index], next[index]);
    }
    current.splice(next.length);
  }
}
function TypedArrayType3(root, path, current, next) {
  if (IsTypedArray(current) && current.length === next.length) {
    for (let i = 0;i < current.length; i++) {
      current[i] = next[i];
    }
  } else {
    exports_pointer.Set(root, path, Clone2(next));
  }
}
function ValueType3(root, path, current, next) {
  if (current === next)
    return;
  exports_pointer.Set(root, path, next);
}
function Visit16(root, path, current, next) {
  if (IsArray2(next))
    return ArrayType5(root, path, current, next);
  if (IsTypedArray(next))
    return TypedArrayType3(root, path, current, next);
  if (IsStandardObject2(next))
    return ObjectType5(root, path, current, next);
  if (IsValueType(next))
    return ValueType3(root, path, current, next);
}
function IsNonMutableValue(value) {
  return IsTypedArray(value) || IsValueType(value);
}
function IsMismatchedValue(current, next) {
  return IsStandardObject2(current) && IsArray2(next) || IsArray2(current) && IsStandardObject2(next);
}
function Mutate(current, next) {
  if (IsNonMutableValue(current) || IsNonMutableValue(next))
    throw new ValueMutateError("Only object and array types can be mutated at the root level");
  if (IsMismatchedValue(current, next))
    throw new ValueMutateError("Cannot assign due type mismatch of assignable values");
  Visit16(current, "", current, next);
}
// node_modules/@sinclair/typebox/build/esm/value/parse/parse.mjs
class ParseError extends TypeBoxError {
  constructor(message) {
    super(message);
  }
}
var ParseRegistry;
(function(ParseRegistry2) {
  const registry = new Map([
    ["Assert", (type, references, value) => {
      Assert(type, references, value);
      return value;
    }],
    ["Cast", (type, references, value) => Cast(type, references, value)],
    ["Clean", (type, references, value) => Clean(type, references, value)],
    ["Clone", (_type, _references, value) => Clone2(value)],
    ["Convert", (type, references, value) => Convert(type, references, value)],
    ["Decode", (type, references, value) => HasTransform(type, references) ? TransformDecode(type, references, value) : value],
    ["Default", (type, references, value) => Default5(type, references, value)],
    ["Encode", (type, references, value) => HasTransform(type, references) ? TransformEncode(type, references, value) : value]
  ]);
  function Delete5(key) {
    registry.delete(key);
  }
  ParseRegistry2.Delete = Delete5;
  function Set5(key, callback) {
    registry.set(key, callback);
  }
  ParseRegistry2.Set = Set5;
  function Get4(key) {
    return registry.get(key);
  }
  ParseRegistry2.Get = Get4;
})(ParseRegistry || (ParseRegistry = {}));
var ParseDefault = [
  "Clone",
  "Clean",
  "Default",
  "Convert",
  "Assert",
  "Decode"
];
function ParseValue(operations, type, references, value) {
  return operations.reduce((value2, operationKey) => {
    const operation = ParseRegistry.Get(operationKey);
    if (IsUndefined2(operation))
      throw new ParseError(`Unable to find Parse operation '${operationKey}'`);
    return operation(type, references, value2);
  }, value);
}
function Parse(...args) {
  const [operations, schema, references, value] = args.length === 4 ? [args[0], args[1], args[2], args[3]] : args.length === 3 ? IsArray2(args[0]) ? [args[0], args[1], [], args[2]] : [ParseDefault, args[0], args[1], args[2]] : args.length === 2 ? [ParseDefault, args[0], [], args[1]] : (() => {
    throw new ParseError("Invalid Arguments");
  })();
  return ParseValue(operations, schema, references, value);
}
// node_modules/@sinclair/typebox/build/esm/value/value/value.mjs
var exports_value2 = {};
__export(exports_value2, {
  ValueErrorIterator: () => ValueErrorIterator,
  Patch: () => Patch,
  Parse: () => Parse,
  Mutate: () => Mutate,
  Hash: () => Hash,
  Errors: () => Errors,
  Equal: () => Equal,
  Encode: () => Encode,
  Edit: () => Edit,
  Diff: () => Diff,
  Default: () => Default5,
  Decode: () => Decode,
  Create: () => Create2,
  Convert: () => Convert,
  Clone: () => Clone2,
  Clean: () => Clean,
  Check: () => Check,
  Cast: () => Cast,
  Assert: () => Assert
});
// node_modules/@sinclair/typebox/build/esm/compiler/compiler.mjs
class TypeCheck {
  constructor(schema, references, checkFunc, code) {
    this.schema = schema;
    this.references = references;
    this.checkFunc = checkFunc;
    this.code = code;
    this.hasTransform = HasTransform(schema, references);
  }
  Code() {
    return this.code;
  }
  Schema() {
    return this.schema;
  }
  References() {
    return this.references;
  }
  Errors(value) {
    return Errors(this.schema, this.references, value);
  }
  Check(value) {
    return this.checkFunc(value);
  }
  Decode(value) {
    if (!this.checkFunc(value))
      throw new TransformDecodeCheckError(this.schema, value, this.Errors(value).First());
    return this.hasTransform ? TransformDecode(this.schema, this.references, value) : value;
  }
  Encode(value) {
    const encoded = this.hasTransform ? TransformEncode(this.schema, this.references, value) : value;
    if (!this.checkFunc(encoded))
      throw new TransformEncodeCheckError(this.schema, value, this.Errors(value).First());
    return encoded;
  }
}
var Character;
(function(Character2) {
  function DollarSign(code) {
    return code === 36;
  }
  Character2.DollarSign = DollarSign;
  function IsUnderscore(code) {
    return code === 95;
  }
  Character2.IsUnderscore = IsUnderscore;
  function IsAlpha(code) {
    return code >= 65 && code <= 90 || code >= 97 && code <= 122;
  }
  Character2.IsAlpha = IsAlpha;
  function IsNumeric(code) {
    return code >= 48 && code <= 57;
  }
  Character2.IsNumeric = IsNumeric;
})(Character || (Character = {}));
var MemberExpression;
(function(MemberExpression2) {
  function IsFirstCharacterNumeric(value) {
    if (value.length === 0)
      return false;
    return Character.IsNumeric(value.charCodeAt(0));
  }
  function IsAccessor(value) {
    if (IsFirstCharacterNumeric(value))
      return false;
    for (let i = 0;i < value.length; i++) {
      const code = value.charCodeAt(i);
      const check2 = Character.IsAlpha(code) || Character.IsNumeric(code) || Character.DollarSign(code) || Character.IsUnderscore(code);
      if (!check2)
        return false;
    }
    return true;
  }
  function EscapeHyphen(key) {
    return key.replace(/'/g, "\\'");
  }
  function Encode2(object, key) {
    return IsAccessor(key) ? `${object}.${key}` : `${object}['${EscapeHyphen(key)}']`;
  }
  MemberExpression2.Encode = Encode2;
})(MemberExpression || (MemberExpression = {}));
var Identifier;
(function(Identifier2) {
  function Encode2($id) {
    const buffer = [];
    for (let i = 0;i < $id.length; i++) {
      const code = $id.charCodeAt(i);
      if (Character.IsNumeric(code) || Character.IsAlpha(code)) {
        buffer.push($id.charAt(i));
      } else {
        buffer.push(`_${code}_`);
      }
    }
    return buffer.join("").replace(/__/g, "_");
  }
  Identifier2.Encode = Encode2;
})(Identifier || (Identifier = {}));
var LiteralString;
(function(LiteralString2) {
  function Escape3(content) {
    return content.replace(/'/g, "\\'");
  }
  LiteralString2.Escape = Escape3;
})(LiteralString || (LiteralString = {}));

class TypeCompilerUnknownTypeError extends TypeBoxError {
  constructor(schema) {
    super("Unknown type");
    this.schema = schema;
  }
}

class TypeCompilerTypeGuardError extends TypeBoxError {
  constructor(schema) {
    super("Preflight validation check failed to guard for the given schema");
    this.schema = schema;
  }
}
var Policy;
(function(Policy2) {
  function IsExactOptionalProperty(value, key, expression) {
    return TypeSystemPolicy.ExactOptionalPropertyTypes ? `('${key}' in ${value} ? ${expression} : true)` : `(${MemberExpression.Encode(value, key)} !== undefined ? ${expression} : true)`;
  }
  Policy2.IsExactOptionalProperty = IsExactOptionalProperty;
  function IsObjectLike(value) {
    return !TypeSystemPolicy.AllowArrayObject ? `(typeof ${value} === 'object' && ${value} !== null && !Array.isArray(${value}))` : `(typeof ${value} === 'object' && ${value} !== null)`;
  }
  Policy2.IsObjectLike = IsObjectLike;
  function IsRecordLike(value) {
    return !TypeSystemPolicy.AllowArrayObject ? `(typeof ${value} === 'object' && ${value} !== null && !Array.isArray(${value}) && !(${value} instanceof Date) && !(${value} instanceof Uint8Array))` : `(typeof ${value} === 'object' && ${value} !== null && !(${value} instanceof Date) && !(${value} instanceof Uint8Array))`;
  }
  Policy2.IsRecordLike = IsRecordLike;
  function IsNumberLike(value) {
    return TypeSystemPolicy.AllowNaN ? `typeof ${value} === 'number'` : `Number.isFinite(${value})`;
  }
  Policy2.IsNumberLike = IsNumberLike;
  function IsVoidLike(value) {
    return TypeSystemPolicy.AllowNullVoid ? `(${value} === undefined || ${value} === null)` : `${value} === undefined`;
  }
  Policy2.IsVoidLike = IsVoidLike;
})(Policy || (Policy = {}));
var TypeCompiler;
(function(TypeCompiler2) {
  function IsAnyOrUnknown2(schema) {
    return schema[Kind] === "Any" || schema[Kind] === "Unknown";
  }
  function* FromAny5(schema, references, value) {
    yield "true";
  }
  function* FromArgument5(schema, references, value) {
    yield "true";
  }
  function* FromArray18(schema, references, value) {
    yield `Array.isArray(${value})`;
    const [parameter, accumulator] = [CreateParameter("value", "any"), CreateParameter("acc", "number")];
    if (IsNumber2(schema.maxItems))
      yield `${value}.length <= ${schema.maxItems}`;
    if (IsNumber2(schema.minItems))
      yield `${value}.length >= ${schema.minItems}`;
    const elementExpression = CreateExpression(schema.items, references, "value");
    yield `${value}.every((${parameter}) => ${elementExpression})`;
    if (IsSchema2(schema.contains) || IsNumber2(schema.minContains) || IsNumber2(schema.maxContains)) {
      const containsSchema = IsSchema2(schema.contains) ? schema.contains : Never();
      const checkExpression = CreateExpression(containsSchema, references, "value");
      const checkMinContains = IsNumber2(schema.minContains) ? [`(count >= ${schema.minContains})`] : [];
      const checkMaxContains = IsNumber2(schema.maxContains) ? [`(count <= ${schema.maxContains})`] : [];
      const checkCount = `const count = value.reduce((${accumulator}, ${parameter}) => ${checkExpression} ? acc + 1 : acc, 0)`;
      const check2 = [`(count > 0)`, ...checkMinContains, ...checkMaxContains].join(" && ");
      yield `((${parameter}) => { ${checkCount}; return ${check2}})(${value})`;
    }
    if (schema.uniqueItems === true) {
      const check2 = `const hashed = hash(element); if(set.has(hashed)) { return false } else { set.add(hashed) } } return true`;
      const block = `const set = new Set(); for(const element of value) { ${check2} }`;
      yield `((${parameter}) => { ${block} )(${value})`;
    }
  }
  function* FromAsyncIterator8(schema, references, value) {
    yield `(typeof value === 'object' && Symbol.asyncIterator in ${value})`;
  }
  function* FromBigInt6(schema, references, value) {
    yield `(typeof ${value} === 'bigint')`;
    if (IsBigInt2(schema.exclusiveMaximum))
      yield `${value} < BigInt(${schema.exclusiveMaximum})`;
    if (IsBigInt2(schema.exclusiveMinimum))
      yield `${value} > BigInt(${schema.exclusiveMinimum})`;
    if (IsBigInt2(schema.maximum))
      yield `${value} <= BigInt(${schema.maximum})`;
    if (IsBigInt2(schema.minimum))
      yield `${value} >= BigInt(${schema.minimum})`;
    if (IsBigInt2(schema.multipleOf))
      yield `(${value} % BigInt(${schema.multipleOf})) === 0`;
  }
  function* FromBoolean6(schema, references, value) {
    yield `(typeof ${value} === 'boolean')`;
  }
  function* FromConstructor9(schema, references, value) {
    yield* Visit17(schema.returns, references, `${value}.prototype`);
  }
  function* FromDate8(schema, references, value) {
    yield `(${value} instanceof Date) && Number.isFinite(${value}.getTime())`;
    if (IsNumber2(schema.exclusiveMaximumTimestamp))
      yield `${value}.getTime() < ${schema.exclusiveMaximumTimestamp}`;
    if (IsNumber2(schema.exclusiveMinimumTimestamp))
      yield `${value}.getTime() > ${schema.exclusiveMinimumTimestamp}`;
    if (IsNumber2(schema.maximumTimestamp))
      yield `${value}.getTime() <= ${schema.maximumTimestamp}`;
    if (IsNumber2(schema.minimumTimestamp))
      yield `${value}.getTime() >= ${schema.minimumTimestamp}`;
    if (IsNumber2(schema.multipleOfTimestamp))
      yield `(${value}.getTime() % ${schema.multipleOfTimestamp}) === 0`;
  }
  function* FromFunction8(schema, references, value) {
    yield `(typeof ${value} === 'function')`;
  }
  function* FromImport11(schema, references, value) {
    const members = globalThis.Object.getOwnPropertyNames(schema.$defs).reduce((result, key) => {
      return [...result, schema.$defs[key]];
    }, []);
    yield* Visit17(Ref(schema.$ref), [...references, ...members], value);
  }
  function* FromInteger6(schema, references, value) {
    yield `Number.isInteger(${value})`;
    if (IsNumber2(schema.exclusiveMaximum))
      yield `${value} < ${schema.exclusiveMaximum}`;
    if (IsNumber2(schema.exclusiveMinimum))
      yield `${value} > ${schema.exclusiveMinimum}`;
    if (IsNumber2(schema.maximum))
      yield `${value} <= ${schema.maximum}`;
    if (IsNumber2(schema.minimum))
      yield `${value} >= ${schema.minimum}`;
    if (IsNumber2(schema.multipleOf))
      yield `(${value} % ${schema.multipleOf}) === 0`;
  }
  function* FromIntersect19(schema, references, value) {
    const check1 = schema.allOf.map((schema2) => CreateExpression(schema2, references, value)).join(" && ");
    if (schema.unevaluatedProperties === false) {
      const keyCheck = CreateVariable(`${new RegExp(KeyOfPattern(schema))};`);
      const check2 = `Object.getOwnPropertyNames(${value}).every(key => ${keyCheck}.test(key))`;
      yield `(${check1} && ${check2})`;
    } else if (IsSchema2(schema.unevaluatedProperties)) {
      const keyCheck = CreateVariable(`${new RegExp(KeyOfPattern(schema))};`);
      const check2 = `Object.getOwnPropertyNames(${value}).every(key => ${keyCheck}.test(key) || ${CreateExpression(schema.unevaluatedProperties, references, `${value}[key]`)})`;
      yield `(${check1} && ${check2})`;
    } else {
      yield `(${check1})`;
    }
  }
  function* FromIterator8(schema, references, value) {
    yield `(typeof value === 'object' && Symbol.iterator in ${value})`;
  }
  function* FromLiteral7(schema, references, value) {
    if (typeof schema.const === "number" || typeof schema.const === "boolean") {
      yield `(${value} === ${schema.const})`;
    } else {
      yield `(${value} === '${LiteralString.Escape(schema.const)}')`;
    }
  }
  function* FromNever6(schema, references, value) {
    yield `false`;
  }
  function* FromNot8(schema, references, value) {
    const expression = CreateExpression(schema.not, references, value);
    yield `(!${expression})`;
  }
  function* FromNull6(schema, references, value) {
    yield `(${value} === null)`;
  }
  function* FromNumber6(schema, references, value) {
    yield Policy.IsNumberLike(value);
    if (IsNumber2(schema.exclusiveMaximum))
      yield `${value} < ${schema.exclusiveMaximum}`;
    if (IsNumber2(schema.exclusiveMinimum))
      yield `${value} > ${schema.exclusiveMinimum}`;
    if (IsNumber2(schema.maximum))
      yield `${value} <= ${schema.maximum}`;
    if (IsNumber2(schema.minimum))
      yield `${value} >= ${schema.minimum}`;
    if (IsNumber2(schema.multipleOf))
      yield `(${value} % ${schema.multipleOf}) === 0`;
  }
  function* FromObject19(schema, references, value) {
    yield Policy.IsObjectLike(value);
    if (IsNumber2(schema.minProperties))
      yield `Object.getOwnPropertyNames(${value}).length >= ${schema.minProperties}`;
    if (IsNumber2(schema.maxProperties))
      yield `Object.getOwnPropertyNames(${value}).length <= ${schema.maxProperties}`;
    const knownKeys = Object.getOwnPropertyNames(schema.properties);
    for (const knownKey of knownKeys) {
      const memberExpression = MemberExpression.Encode(value, knownKey);
      const property = schema.properties[knownKey];
      if (schema.required && schema.required.includes(knownKey)) {
        yield* Visit17(property, references, memberExpression);
        if (ExtendsUndefinedCheck(property) || IsAnyOrUnknown2(property))
          yield `('${knownKey}' in ${value})`;
      } else {
        const expression = CreateExpression(property, references, memberExpression);
        yield Policy.IsExactOptionalProperty(value, knownKey, expression);
      }
    }
    if (schema.additionalProperties === false) {
      if (schema.required && schema.required.length === knownKeys.length) {
        yield `Object.getOwnPropertyNames(${value}).length === ${knownKeys.length}`;
      } else {
        const keys = `[${knownKeys.map((key) => `'${key}'`).join(", ")}]`;
        yield `Object.getOwnPropertyNames(${value}).every(key => ${keys}.includes(key))`;
      }
    }
    if (typeof schema.additionalProperties === "object") {
      const expression = CreateExpression(schema.additionalProperties, references, `${value}[key]`);
      const keys = `[${knownKeys.map((key) => `'${key}'`).join(", ")}]`;
      yield `(Object.getOwnPropertyNames(${value}).every(key => ${keys}.includes(key) || ${expression}))`;
    }
  }
  function* FromPromise8(schema, references, value) {
    yield `${value} instanceof Promise`;
  }
  function* FromRecord14(schema, references, value) {
    yield Policy.IsRecordLike(value);
    if (IsNumber2(schema.minProperties))
      yield `Object.getOwnPropertyNames(${value}).length >= ${schema.minProperties}`;
    if (IsNumber2(schema.maxProperties))
      yield `Object.getOwnPropertyNames(${value}).length <= ${schema.maxProperties}`;
    const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
    const variable = CreateVariable(`${new RegExp(patternKey)}`);
    const check1 = CreateExpression(patternSchema, references, "value");
    const check2 = IsSchema2(schema.additionalProperties) ? CreateExpression(schema.additionalProperties, references, value) : schema.additionalProperties === false ? "false" : "true";
    const expression = `(${variable}.test(key) ? ${check1} : ${check2})`;
    yield `(Object.entries(${value}).every(([key, value]) => ${expression}))`;
  }
  function* FromRef15(schema, references, value) {
    const target = Deref(schema, references);
    if (state.functions.has(schema.$ref))
      return yield `${CreateFunctionName(schema.$ref)}(${value})`;
    yield* Visit17(target, references, value);
  }
  function* FromRegExp5(schema, references, value) {
    const variable = CreateVariable(`${new RegExp(schema.source, schema.flags)};`);
    yield `(typeof ${value} === 'string')`;
    if (IsNumber2(schema.maxLength))
      yield `${value}.length <= ${schema.maxLength}`;
    if (IsNumber2(schema.minLength))
      yield `${value}.length >= ${schema.minLength}`;
    yield `${variable}.test(${value})`;
  }
  function* FromString6(schema, references, value) {
    yield `(typeof ${value} === 'string')`;
    if (IsNumber2(schema.maxLength))
      yield `${value}.length <= ${schema.maxLength}`;
    if (IsNumber2(schema.minLength))
      yield `${value}.length >= ${schema.minLength}`;
    if (schema.pattern !== undefined) {
      const variable = CreateVariable(`${new RegExp(schema.pattern)};`);
      yield `${variable}.test(${value})`;
    }
    if (schema.format !== undefined) {
      yield `format('${schema.format}', ${value})`;
    }
  }
  function* FromSymbol6(schema, references, value) {
    yield `(typeof ${value} === 'symbol')`;
  }
  function* FromTemplateLiteral7(schema, references, value) {
    yield `(typeof ${value} === 'string')`;
    const variable = CreateVariable(`${new RegExp(schema.pattern)};`);
    yield `${variable}.test(${value})`;
  }
  function* FromThis11(schema, references, value) {
    yield `${CreateFunctionName(schema.$ref)}(${value})`;
  }
  function* FromTuple16(schema, references, value) {
    yield `Array.isArray(${value})`;
    if (schema.items === undefined)
      return yield `${value}.length === 0`;
    yield `(${value}.length === ${schema.maxItems})`;
    for (let i = 0;i < schema.items.length; i++) {
      const expression = CreateExpression(schema.items[i], references, `${value}[${i}]`);
      yield `${expression}`;
    }
  }
  function* FromUndefined6(schema, references, value) {
    yield `${value} === undefined`;
  }
  function* FromUnion21(schema, references, value) {
    const expressions = schema.anyOf.map((schema2) => CreateExpression(schema2, references, value));
    yield `(${expressions.join(" || ")})`;
  }
  function* FromUint8Array5(schema, references, value) {
    yield `${value} instanceof Uint8Array`;
    if (IsNumber2(schema.maxByteLength))
      yield `(${value}.length <= ${schema.maxByteLength})`;
    if (IsNumber2(schema.minByteLength))
      yield `(${value}.length >= ${schema.minByteLength})`;
  }
  function* FromUnknown5(schema, references, value) {
    yield "true";
  }
  function* FromVoid5(schema, references, value) {
    yield Policy.IsVoidLike(value);
  }
  function* FromKind4(schema, references, value) {
    const instance = state.instances.size;
    state.instances.set(instance, schema);
    yield `kind('${schema[Kind]}', ${instance}, ${value})`;
  }
  function* Visit17(schema, references, value, useHoisting = true) {
    const references_ = IsString2(schema.$id) ? [...references, schema] : references;
    const schema_ = schema;
    if (useHoisting && IsString2(schema.$id)) {
      const functionName = CreateFunctionName(schema.$id);
      if (state.functions.has(functionName)) {
        return yield `${functionName}(${value})`;
      } else {
        state.functions.set(functionName, "<deferred>");
        const functionCode = CreateFunction(functionName, schema, references, "value", false);
        state.functions.set(functionName, functionCode);
        return yield `${functionName}(${value})`;
      }
    }
    switch (schema_[Kind]) {
      case "Any":
        return yield* FromAny5(schema_, references_, value);
      case "Argument":
        return yield* FromArgument5(schema_, references_, value);
      case "Array":
        return yield* FromArray18(schema_, references_, value);
      case "AsyncIterator":
        return yield* FromAsyncIterator8(schema_, references_, value);
      case "BigInt":
        return yield* FromBigInt6(schema_, references_, value);
      case "Boolean":
        return yield* FromBoolean6(schema_, references_, value);
      case "Constructor":
        return yield* FromConstructor9(schema_, references_, value);
      case "Date":
        return yield* FromDate8(schema_, references_, value);
      case "Function":
        return yield* FromFunction8(schema_, references_, value);
      case "Import":
        return yield* FromImport11(schema_, references_, value);
      case "Integer":
        return yield* FromInteger6(schema_, references_, value);
      case "Intersect":
        return yield* FromIntersect19(schema_, references_, value);
      case "Iterator":
        return yield* FromIterator8(schema_, references_, value);
      case "Literal":
        return yield* FromLiteral7(schema_, references_, value);
      case "Never":
        return yield* FromNever6(schema_, references_, value);
      case "Not":
        return yield* FromNot8(schema_, references_, value);
      case "Null":
        return yield* FromNull6(schema_, references_, value);
      case "Number":
        return yield* FromNumber6(schema_, references_, value);
      case "Object":
        return yield* FromObject19(schema_, references_, value);
      case "Promise":
        return yield* FromPromise8(schema_, references_, value);
      case "Record":
        return yield* FromRecord14(schema_, references_, value);
      case "Ref":
        return yield* FromRef15(schema_, references_, value);
      case "RegExp":
        return yield* FromRegExp5(schema_, references_, value);
      case "String":
        return yield* FromString6(schema_, references_, value);
      case "Symbol":
        return yield* FromSymbol6(schema_, references_, value);
      case "TemplateLiteral":
        return yield* FromTemplateLiteral7(schema_, references_, value);
      case "This":
        return yield* FromThis11(schema_, references_, value);
      case "Tuple":
        return yield* FromTuple16(schema_, references_, value);
      case "Undefined":
        return yield* FromUndefined6(schema_, references_, value);
      case "Union":
        return yield* FromUnion21(schema_, references_, value);
      case "Uint8Array":
        return yield* FromUint8Array5(schema_, references_, value);
      case "Unknown":
        return yield* FromUnknown5(schema_, references_, value);
      case "Void":
        return yield* FromVoid5(schema_, references_, value);
      default:
        if (!exports_type2.Has(schema_[Kind]))
          throw new TypeCompilerUnknownTypeError(schema);
        return yield* FromKind4(schema_, references_, value);
    }
  }
  const state = {
    language: "javascript",
    functions: new Map,
    variables: new Map,
    instances: new Map
  };
  function CreateExpression(schema, references, value, useHoisting = true) {
    return `(${[...Visit17(schema, references, value, useHoisting)].join(" && ")})`;
  }
  function CreateFunctionName($id) {
    return `check_${Identifier.Encode($id)}`;
  }
  function CreateVariable(expression) {
    const variableName = `local_${state.variables.size}`;
    state.variables.set(variableName, `const ${variableName} = ${expression}`);
    return variableName;
  }
  function CreateFunction(name, schema, references, value, useHoisting = true) {
    const [newline, pad] = [`
`, (length) => "".padStart(length, " ")];
    const parameter = CreateParameter("value", "any");
    const returns = CreateReturns("boolean");
    const expression = [...Visit17(schema, references, value, useHoisting)].map((expression2) => `${pad(4)}${expression2}`).join(` &&${newline}`);
    return `function ${name}(${parameter})${returns} {${newline}${pad(2)}return (${newline}${expression}${newline}${pad(2)})
}`;
  }
  function CreateParameter(name, type) {
    const annotation = state.language === "typescript" ? `: ${type}` : "";
    return `${name}${annotation}`;
  }
  function CreateReturns(type) {
    return state.language === "typescript" ? `: ${type}` : "";
  }
  function Build(schema, references, options) {
    const functionCode = CreateFunction("check", schema, references, "value");
    const parameter = CreateParameter("value", "any");
    const returns = CreateReturns("boolean");
    const functions = [...state.functions.values()];
    const variables = [...state.variables.values()];
    const checkFunction = IsString2(schema.$id) ? `return function check(${parameter})${returns} {
  return ${CreateFunctionName(schema.$id)}(value)
}` : `return ${functionCode}`;
    return [...variables, ...functions, checkFunction].join(`
`);
  }
  function Code(...args) {
    const defaults = { language: "javascript" };
    const [schema, references, options] = args.length === 2 && IsArray2(args[1]) ? [args[0], args[1], defaults] : args.length === 2 && !IsArray2(args[1]) ? [args[0], [], args[1]] : args.length === 3 ? [args[0], args[1], args[2]] : args.length === 1 ? [args[0], [], defaults] : [null, [], defaults];
    state.language = options.language;
    state.variables.clear();
    state.functions.clear();
    state.instances.clear();
    if (!IsSchema2(schema))
      throw new TypeCompilerTypeGuardError(schema);
    for (const schema2 of references)
      if (!IsSchema2(schema2))
        throw new TypeCompilerTypeGuardError(schema2);
    return Build(schema, references, options);
  }
  TypeCompiler2.Code = Code;
  function Compile(schema, references = []) {
    const generatedCode = Code(schema, references, { language: "javascript" });
    const compiledFunction = globalThis.Function("kind", "format", "hash", generatedCode);
    const instances = new Map(state.instances);
    function typeRegistryFunction(kind, instance, value) {
      if (!exports_type2.Has(kind) || !instances.has(instance))
        return false;
      const checkFunc = exports_type2.Get(kind);
      const schema2 = instances.get(instance);
      return checkFunc(schema2, value);
    }
    function formatRegistryFunction(format, value) {
      if (!exports_format.Has(format))
        return false;
      const checkFunc = exports_format.Get(format);
      return checkFunc(value);
    }
    function hashFunction(value) {
      return Hash(value);
    }
    const checkFunction = compiledFunction(typeRegistryFunction, formatRegistryFunction, hashFunction);
    return new TypeCheck(schema, references, checkFunction, generatedCode);
  }
  TypeCompiler2.Compile = Compile;
})(TypeCompiler || (TypeCompiler = {}));

// node_modules/elysia/dist/bun/index.js
var __create2 = Object.create;
var { getPrototypeOf: __getProtoOf2, defineProperty: __defProp2, getOwnPropertyNames: __getOwnPropNames2 } = Object;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __toESM2 = (mod, isNodeMode, target) => {
  target = mod != null ? __create2(__getProtoOf2(mod)) : {};
  let to = isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames2(mod))
    if (!__hasOwnProp2.call(to, key))
      __defProp2(to, key, { get: () => mod[key], enumerable: true });
  return to;
};
var __commonJS2 = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var require_fast_decode_uri_component = __commonJS2((exports, module) => {
  var UTF8_ACCEPT = 12, UTF8_REJECT = 0, UTF8_DATA = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 7, 7, 10, 9, 9, 9, 11, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 24, 36, 48, 60, 72, 84, 96, 0, 12, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24, 24, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 48, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 127, 63, 63, 63, 0, 31, 15, 15, 15, 7, 7, 7];
  function decodeURIComponent2(uri) {
    var percentPosition = uri.indexOf("%");
    if (percentPosition === -1)
      return uri;
    var length = uri.length, decoded = "", last = 0, codepoint = 0, startOfOctets = percentPosition, state = UTF8_ACCEPT;
    while (percentPosition > -1 && percentPosition < length) {
      var high = hexCodeToInt(uri[percentPosition + 1], 4), low = hexCodeToInt(uri[percentPosition + 2], 0), byte = high | low, type = UTF8_DATA[byte];
      if (state = UTF8_DATA[256 + state + type], codepoint = codepoint << 6 | byte & UTF8_DATA[364 + type], state === UTF8_ACCEPT)
        decoded += uri.slice(last, startOfOctets), decoded += codepoint <= 65535 ? String.fromCharCode(codepoint) : String.fromCharCode(55232 + (codepoint >> 10), 56320 + (codepoint & 1023)), codepoint = 0, last = percentPosition + 3, percentPosition = startOfOctets = uri.indexOf("%", last);
      else if (state === UTF8_REJECT)
        return null;
      else {
        if (percentPosition += 3, percentPosition < length && uri.charCodeAt(percentPosition) === 37)
          continue;
        return null;
      }
    }
    return decoded + uri.slice(last);
  }
  var HEX = { "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, a: 10, A: 10, b: 11, B: 11, c: 12, C: 12, d: 13, D: 13, e: 14, E: 14, f: 15, F: 15 };
  function hexCodeToInt(c, shift) {
    var i = HEX[c];
    return i === undefined ? 255 : i << shift;
  }
  module.exports = decodeURIComponent2;
});
var require_dist = __commonJS2((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.parseCookie = parseCookie;
  exports.parse = parseCookie;
  exports.stringifyCookie = stringifyCookie;
  exports.stringifySetCookie = stringifySetCookie;
  exports.serialize = stringifySetCookie;
  exports.parseSetCookie = parseSetCookie;
  exports.stringifySetCookie = stringifySetCookie;
  exports.serialize = stringifySetCookie;
  var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/, cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/, domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i, pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/, maxAgeRegExp = /^-?\d+$/, __toString = Object.prototype.toString, NullObject = (() => {
    let C = function() {};
    return C.prototype = Object.create(null), C;
  })();
  function parseCookie(str, options) {
    let obj = new NullObject, len = str.length;
    if (len < 2)
      return obj;
    let dec = options?.decode || decode2, index = 0;
    do {
      let eqIdx = eqIndex(str, index, len);
      if (eqIdx === -1)
        break;
      let endIdx = endIndex(str, index, len);
      if (eqIdx > endIdx) {
        index = str.lastIndexOf(";", eqIdx - 1) + 1;
        continue;
      }
      let key = valueSlice(str, index, eqIdx);
      if (obj[key] === undefined)
        obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
      index = endIdx + 1;
    } while (index < len);
    return obj;
  }
  function stringifyCookie(cookie, options) {
    let enc = options?.encode || encodeURIComponent, cookieStrings = [];
    for (let name of Object.keys(cookie)) {
      let val = cookie[name];
      if (val === undefined)
        continue;
      if (!cookieNameRegExp.test(name))
        throw TypeError(`cookie name is invalid: ${name}`);
      let value = enc(val);
      if (!cookieValueRegExp.test(value))
        throw TypeError(`cookie val is invalid: ${val}`);
      cookieStrings.push(`${name}=${value}`);
    }
    return cookieStrings.join("; ");
  }
  function stringifySetCookie(_name, _val, _opts) {
    let cookie = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) }, enc = (typeof _val === "object" ? _val : _opts)?.encode || encodeURIComponent;
    if (!cookieNameRegExp.test(cookie.name))
      throw TypeError(`argument name is invalid: ${cookie.name}`);
    let value = cookie.value ? enc(cookie.value) : "";
    if (!cookieValueRegExp.test(value))
      throw TypeError(`argument val is invalid: ${cookie.value}`);
    let str = cookie.name + "=" + value;
    if (cookie.maxAge !== undefined) {
      if (!Number.isInteger(cookie.maxAge))
        throw TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
      str += "; Max-Age=" + cookie.maxAge;
    }
    if (cookie.domain) {
      if (!domainValueRegExp.test(cookie.domain))
        throw TypeError(`option domain is invalid: ${cookie.domain}`);
      str += "; Domain=" + cookie.domain;
    }
    if (cookie.path) {
      if (!pathValueRegExp.test(cookie.path))
        throw TypeError(`option path is invalid: ${cookie.path}`);
      str += "; Path=" + cookie.path;
    }
    if (cookie.expires) {
      if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf()))
        throw TypeError(`option expires is invalid: ${cookie.expires}`);
      str += "; Expires=" + cookie.expires.toUTCString();
    }
    if (cookie.httpOnly)
      str += "; HttpOnly";
    if (cookie.secure)
      str += "; Secure";
    if (cookie.partitioned)
      str += "; Partitioned";
    if (cookie.priority)
      switch (typeof cookie.priority === "string" ? cookie.priority.toLowerCase() : undefined) {
        case "low":
          str += "; Priority=Low";
          break;
        case "medium":
          str += "; Priority=Medium";
          break;
        case "high":
          str += "; Priority=High";
          break;
        default:
          throw TypeError(`option priority is invalid: ${cookie.priority}`);
      }
    if (cookie.sameSite)
      switch (typeof cookie.sameSite === "string" ? cookie.sameSite.toLowerCase() : cookie.sameSite) {
        case true:
        case "strict":
          str += "; SameSite=Strict";
          break;
        case "lax":
          str += "; SameSite=Lax";
          break;
        case "none":
          str += "; SameSite=None";
          break;
        default:
          throw TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
      }
    return str;
  }
  function parseSetCookie(str, options) {
    let dec = options?.decode || decode2, len = str.length, endIdx = endIndex(str, 0, len), eqIdx = eqIndex(str, 0, endIdx), setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : { name: valueSlice(str, 0, eqIdx), value: dec(valueSlice(str, eqIdx + 1, endIdx)) }, index = endIdx + 1;
    while (index < len) {
      let endIdx2 = endIndex(str, index, len), eqIdx2 = eqIndex(str, index, endIdx2), attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2), val = eqIdx2 === -1 ? undefined : valueSlice(str, eqIdx2 + 1, endIdx2);
      switch (attr.toLowerCase()) {
        case "httponly":
          setCookie.httpOnly = true;
          break;
        case "secure":
          setCookie.secure = true;
          break;
        case "partitioned":
          setCookie.partitioned = true;
          break;
        case "domain":
          setCookie.domain = val;
          break;
        case "path":
          setCookie.path = val;
          break;
        case "max-age":
          if (val && maxAgeRegExp.test(val))
            setCookie.maxAge = Number(val);
          break;
        case "expires":
          if (!val)
            break;
          let date2 = new Date(val);
          if (Number.isFinite(date2.valueOf()))
            setCookie.expires = date2;
          break;
        case "priority":
          if (!val)
            break;
          let priority = val.toLowerCase();
          if (priority === "low" || priority === "medium" || priority === "high")
            setCookie.priority = priority;
          break;
        case "samesite":
          if (!val)
            break;
          let sameSite = val.toLowerCase();
          if (sameSite === "lax" || sameSite === "strict" || sameSite === "none")
            setCookie.sameSite = sameSite;
          break;
      }
      index = endIdx2 + 1;
    }
    return setCookie;
  }
  function endIndex(str, min, len) {
    let index = str.indexOf(";", min);
    return index === -1 ? len : index;
  }
  function eqIndex(str, min, max) {
    let index = str.indexOf("=", min);
    return index < max ? index : -1;
  }
  function valueSlice(str, min, max) {
    let start = min, end = max;
    do {
      let code = str.charCodeAt(start);
      if (code !== 32 && code !== 9)
        break;
    } while (++start < end);
    while (end > start) {
      let code = str.charCodeAt(end - 1);
      if (code !== 32 && code !== 9)
        break;
      end--;
    }
    return str.slice(start, end);
  }
  function decode2(str) {
    if (str.indexOf("%") === -1)
      return str;
    try {
      return decodeURIComponent(str);
    } catch (e) {
      return str;
    }
  }
  function isDate(val) {
    return __toString.call(val) === "[object Date]";
  }
});
var Y = (v, b) => {
  let A = b?.length ? {} : null;
  if (A)
    for (let Q of b)
      A[Q.part.charCodeAt(0)] = Q;
  return { part: v, store: null, inert: A, params: null, wildcardStore: null };
};
var k = (v, b) => ({ ...v, part: b });
var T = (v) => ({ name: v, store: null, inert: null });

class _ {
  config;
  root = {};
  history = [];
  deferred = [];
  constructor(v = {}) {
    if (this.config = v, v.lazy)
      this.find = this.lazyFind;
    if (v.onParam && !Array.isArray(v.onParam))
      this.config.onParam = [this.config.onParam];
  }
  static regex = { static: /:.+?(?=\/|$)/, params: /:.+?(?=\/|$)/g, optionalParams: /(\/:\w+\?)/g };
  lazyFind = (v, b) => {
    if (!this.config.lazy)
      return this.find;
    return this.build(), this.find(v, b);
  };
  build() {
    if (!this.config.lazy)
      return;
    for (let [v, b, A] of this.deferred)
      this.add(v, b, A, { lazy: false, ignoreHistory: true });
    this.deferred = [], this.find = (v, b) => {
      let A = this.root[v];
      if (!A)
        return null;
      return $(b, b.length, A, 0, this.config.onParam);
    };
  }
  add(v, b, A, { ignoreError: Q = false, ignoreHistory: O = false, lazy: V = this.config.lazy } = {}) {
    if (V)
      return this.find = this.lazyFind, this.deferred.push([v, b, A]), A;
    if (typeof b !== "string")
      throw TypeError("Route path must be a string");
    if (b === "")
      b = "/";
    else if (b[0] !== "/")
      b = `/${b}`;
    let X = b[b.length - 1] === "*", J = b.match(_.regex.optionalParams);
    if (J) {
      let F = b.replaceAll("?", "");
      this.add(v, F, A, { ignoreError: Q, ignoreHistory: O, lazy: V });
      for (let B = 0;B < J.length; B++) {
        let D = b.replace(J[B], "");
        this.add(v, D, A, { ignoreError: true, ignoreHistory: O, lazy: V });
      }
      return A;
    }
    if (J)
      b = b.replaceAll("?", "");
    if (this.history.find(([F, B, D]) => F === v && B === b))
      return A;
    if (X || J && b.charCodeAt(b.length - 1) === 63)
      b = b.slice(0, -1);
    if (!O)
      this.history.push([v, b, A]);
    let K = b.split(_.regex.static), G = b.match(_.regex.params) || [];
    if (K[K.length - 1] === "")
      K.pop();
    let q;
    if (!this.root[v])
      q = this.root[v] = Y("/");
    else
      q = this.root[v];
    let U = 0;
    for (let F = 0;F < K.length; ++F) {
      let B = K[F];
      if (F > 0) {
        let D = G[U++].slice(1);
        if (q.params === null)
          q.params = T(D);
        else if (q.params.name !== D)
          if (Q)
            return A;
          else
            throw Error(`Cannot create route "${b}" with parameter "${D}" because a route already exists with a different parameter name ("${q.params.name}") in the same location`);
        let S = q.params;
        if (S.inert === null) {
          q = S.inert = Y(B);
          continue;
        }
        q = S.inert;
      }
      for (let D = 0;; ) {
        if (D === B.length) {
          if (D < q.part.length) {
            let S = k(q, q.part.slice(D));
            Object.assign(q, Y(B, [S]));
          }
          break;
        }
        if (D === q.part.length) {
          if (q.inert === null)
            q.inert = {};
          let S = q.inert[B.charCodeAt(D)];
          if (S) {
            q = S, B = B.slice(D), D = 0;
            continue;
          }
          let Z = Y(B.slice(D));
          q.inert[B.charCodeAt(D)] = Z, q = Z;
          break;
        }
        if (B[D] !== q.part[D]) {
          let S = k(q, q.part.slice(D)), Z = Y(B.slice(D));
          Object.assign(q, Y(q.part.slice(0, D), [S, Z])), q = Z;
          break;
        }
        ++D;
      }
    }
    if (U < G.length) {
      let B = G[U].slice(1);
      if (q.params === null)
        q.params = T(B);
      else if (q.params.name !== B)
        if (Q)
          return A;
        else
          throw Error(`Cannot create route "${b}" with parameter "${B}" because a route already exists with a different parameter name ("${q.params.name}") in the same location`);
      if (q.params.store === null)
        q.params.store = A;
      return q.params.store;
    }
    if (X) {
      if (q.wildcardStore === null)
        q.wildcardStore = A;
      return q.wildcardStore;
    }
    if (q.store === null)
      q.store = A;
    return q.store;
  }
  find(v, b) {
    let A = this.root[v];
    if (!A)
      return null;
    return $(b, b.length, A, 0, this.config.onParam);
  }
}
var $ = (v, b, A, Q, O) => {
  let V = A.part, X = V.length, J = Q + X;
  if (X > 1) {
    if (J > b)
      return null;
    if (X < 15) {
      for (let K = 1, G = Q + 1;K < X; ++K, ++G)
        if (V.charCodeAt(K) !== v.charCodeAt(G))
          return null;
    } else if (v.slice(Q, J) !== V)
      return null;
  }
  if (J === b) {
    if (A.store !== null)
      return { store: A.store, params: {} };
    if (A.wildcardStore !== null)
      return { store: A.wildcardStore, params: { "*": "" } };
    return null;
  }
  if (A.inert !== null) {
    let K = A.inert[v.charCodeAt(J)];
    if (K !== undefined) {
      let G = $(v, b, K, J, O);
      if (G !== null)
        return G;
    }
  }
  if (A.params !== null) {
    let { store: K, name: G, inert: q } = A.params, U = v.indexOf("/", J);
    if (U !== J) {
      if (U === -1 || U >= b) {
        if (K !== null) {
          let F = {};
          if (F[G] = v.substring(J, b), O)
            for (let B = 0;B < O.length; B++) {
              let D = O[B](F[G], G);
              if (D !== undefined)
                F[G] = D;
            }
          return { store: K, params: F };
        }
      } else if (q !== null) {
        let F = $(v, b, q, U, O);
        if (F !== null) {
          if (F.params[G] = v.substring(J, U), O)
            for (let B = 0;B < O.length; B++) {
              let D = O[B](F.params[G], G);
              if (D !== undefined)
                F.params[G] = D;
            }
          return F;
        }
      }
    }
  }
  if (A.wildcardStore !== null)
    return { store: A.wildcardStore, params: { "*": v.substring(J, b) } };
  return null;
};
var import_fast_decode_uri_component4 = __toESM2(require_fast_decode_uri_component(), 1);
var isBun = typeof Bun < "u";
var mime = { aac: "audio/aac", abw: "application/x-abiword", ai: "application/postscript", arc: "application/octet-stream", avi: "video/x-msvideo", azw: "application/vnd.amazon.ebook", bin: "application/octet-stream", bz: "application/x-bzip", bz2: "application/x-bzip2", csh: "application/x-csh", css: "text/css", csv: "text/csv", doc: "application/msword", dll: "application/octet-stream", eot: "application/vnd.ms-fontobject", epub: "application/epub+zip", gif: "image/gif", htm: "text/html", html: "text/html", ico: "image/x-icon", ics: "text/calendar", jar: "application/java-archive", jpeg: "image/jpeg", jpg: "image/jpeg", js: "application/javascript", json: "application/json", mid: "audio/midi", midi: "audio/midi", mp2: "audio/mpeg", mp3: "audio/mpeg", mp4: "video/mp4", mpa: "video/mpeg", mpe: "video/mpeg", mpeg: "video/mpeg", mpkg: "application/vnd.apple.installer+xml", odp: "application/vnd.oasis.opendocument.presentation", ods: "application/vnd.oasis.opendocument.spreadsheet", odt: "application/vnd.oasis.opendocument.text", oga: "audio/ogg", ogv: "video/ogg", ogx: "application/ogg", otf: "font/otf", png: "image/png", pdf: "application/pdf", ppt: "application/vnd.ms-powerpoint", rar: "application/x-rar-compressed", rtf: "application/rtf", sh: "application/x-sh", svg: "image/svg+xml", swf: "application/x-shockwave-flash", tar: "application/x-tar", tif: "image/tiff", tiff: "image/tiff", ts: "application/typescript", ttf: "font/ttf", txt: "text/plain", vsd: "application/vnd.visio", wav: "audio/x-wav", weba: "audio/webm", webm: "video/webm", webp: "image/webp", woff: "font/woff", woff2: "font/woff2", xhtml: "application/xhtml+xml", xls: "application/vnd.ms-excel", xlsx: "application/vnd.ms-excel", xlsx_OLD: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xml: "application/xml", xul: "application/vnd.mozilla.xul+xml", zip: "application/zip", "3gp": "video/3gpp", "3gp_DOES_NOT_CONTAIN_VIDEO": "audio/3gpp", "3gp2": "video/3gpp2", "3gp2_DOES_NOT_CONTAIN_VIDEO": "audio/3gpp2", "7z": "application/x-7z-compressed" };
var getFileExtension = (path) => {
  let index = path.lastIndexOf(".");
  if (index === -1)
    return "";
  return path.slice(index + 1);
};
var createReadStream;
var stat;

class ElysiaFile {
  path;
  value;
  stats;
  constructor(path) {
    this.path = path;
    if (isBun)
      this.value = Bun.file(path);
    else {
      if (!createReadStream || !stat) {
        if (typeof window < "u") {
          console.warn("Browser environment does not support file");
          return;
        }
        let warnMissing = (name) => console.warn(Error(`[elysia] \`file\` require \`fs${name ? "." + name : ""}\` ${name?.includes(".") ? "module " : ""}which is not available in this environment`));
        if (typeof process > "u" || typeof process.getBuiltinModule !== "function") {
          warnMissing();
          return;
        }
        let fs = process.getBuiltinModule("fs");
        if (!fs) {
          warnMissing();
          return;
        }
        if (typeof fs.createReadStream !== "function") {
          warnMissing();
          return;
        }
        if (typeof fs.promises?.stat !== "function") {
          warnMissing();
          return;
        }
        createReadStream = fs.createReadStream, stat = fs.promises.stat;
      }
      this.value = (() => createReadStream(path))(), this.stats = stat(path);
    }
  }
  get type() {
    return mime[getFileExtension(this.path)] || "application/octet-stream";
  }
  get length() {
    if (isBun)
      return this.value.size;
    return this.stats?.then((x) => x.size) ?? 0;
  }
}
var hasHeaderShorthand = "toJSON" in new Headers;
var replaceUrlPath = (url, pathname) => {
  let pathStartIndex = url.indexOf("/", 11), queryIndex = url.indexOf("?", pathStartIndex);
  if (queryIndex === -1)
    return `${url.slice(0, pathStartIndex)}${pathname.charCodeAt(0) === 47 ? "" : "/"}${pathname}`;
  return `${url.slice(0, pathStartIndex)}${pathname.charCodeAt(0) === 47 ? "" : "/"}${pathname}${url.slice(queryIndex)}`;
};
var isClass = (v) => typeof v === "function" && /^\s*class\s+/.test(v.toString()) || v.toString && v.toString().startsWith("[object ") && v.toString() !== "[object Object]" || isNotEmpty(Object.getPrototypeOf(v));
var isObject = (item) => item && typeof item === "object" && !Array.isArray(item);
var mergeDeep = (target, source, options) => {
  let skipKeys = options?.skipKeys, override = options?.override ?? true, mergeArray = options?.mergeArray ?? false, seen = options?.seen ?? new WeakSet;
  if (!isObject(target) || !isObject(source))
    return target;
  if (seen.has(source))
    return target;
  seen.add(source);
  for (let [key, value] of Object.entries(source)) {
    if (skipKeys?.includes(key) || ["__proto__", "constructor", "prototype"].includes(key))
      continue;
    if (mergeArray && Array.isArray(value)) {
      target[key] = Array.isArray(target[key]) ? [...target[key], ...value] : target[key] = value;
      continue;
    }
    if (!isObject(value) || !(key in target) || isClass(value)) {
      if ((override || !(key in target)) && !Object.isFrozen(target))
        try {
          target[key] = value;
        } catch {}
      continue;
    }
    if (!Object.isFrozen(target[key]))
      try {
        target[key] = mergeDeep(target[key], value, { skipKeys, override, mergeArray, seen });
      } catch {}
  }
  return seen.delete(source), target;
};
var mergeCookie = (a, b) => {
  let v = mergeDeep(Object.assign({}, a), b, { skipKeys: ["properties"], mergeArray: false });
  if (v.properties)
    delete v.properties;
  return v;
};
var mergeObjectArray = (a, b) => {
  if (!b)
    return a;
  let array = [], checksums = [];
  if (a) {
    if (!Array.isArray(a))
      a = [a];
    for (let item of a)
      if (array.push(item), item.checksum)
        checksums.push(item.checksum);
  }
  if (b) {
    if (!Array.isArray(b))
      b = [b];
    for (let item of b)
      if (!checksums.includes(item.checksum))
        array.push(item);
  }
  return array;
};
var primitiveHooks = ["start", "request", "parse", "transform", "resolve", "beforeHandle", "afterHandle", "mapResponse", "afterResponse", "trace", "error", "stop", "body", "headers", "params", "query", "response", "type", "detail"];
var primitiveHookMap = primitiveHooks.reduce((acc, x) => (acc[x] = true, acc), {});
var isRecordNumber = (x) => typeof x === "object" && Object.keys(x).every((x2) => !isNaN(+x2));
var mergeResponse = (a, b) => {
  if (isRecordNumber(a) && isRecordNumber(b))
    return Object.assign({}, a, b);
  else if (a && !isRecordNumber(a) && isRecordNumber(b))
    return Object.assign({ 200: a }, b);
  return b ?? a;
};
var mergeSchemaValidator = (a, b) => {
  if (!a && !b)
    return { body: undefined, headers: undefined, params: undefined, query: undefined, cookie: undefined, response: undefined };
  return { body: b?.body ?? a?.body, headers: b?.headers ?? a?.headers, params: b?.params ?? a?.params, query: b?.query ?? a?.query, cookie: b?.cookie ?? a?.cookie, response: mergeResponse(a?.response, b?.response) };
};
var mergeHook = (a, b) => {
  if (!b)
    return a ?? {};
  if (!a)
    return b ?? {};
  if (!Object.values(b).find((x) => x !== undefined && x !== null))
    return { ...a };
  let hook = { ...a, ...b, body: b.body ?? a.body, headers: b.headers ?? a.headers, params: b.params ?? a.params, query: b.query ?? a.query, cookie: b.cookie ?? a.cookie, response: mergeResponse(a.response, b.response), type: a.type || b.type, detail: mergeDeep(b.detail ?? {}, a.detail ?? {}), parse: mergeObjectArray(a.parse, b.parse), transform: mergeObjectArray(a.transform, b.transform), beforeHandle: mergeObjectArray(mergeObjectArray(fnToContainer(a.resolve, "resolve"), a.beforeHandle), mergeObjectArray(fnToContainer(b.resolve, "resolve"), b.beforeHandle)), afterHandle: mergeObjectArray(a.afterHandle, b.afterHandle), mapResponse: mergeObjectArray(a.mapResponse, b.mapResponse), afterResponse: mergeObjectArray(a.afterResponse, b.afterResponse), trace: mergeObjectArray(a.trace, b.trace), error: mergeObjectArray(a.error, b.error), standaloneSchema: a.standaloneSchema || b.standaloneSchema ? a.standaloneSchema && !b.standaloneSchema ? a.standaloneSchema : b.standaloneSchema && !a.standaloneSchema ? b.standaloneSchema : [...a.standaloneSchema ?? [], ...b.standaloneSchema ?? []] : undefined };
  if (hook.resolve)
    delete hook.resolve;
  return hook;
};
var lifeCycleToArray = (a) => {
  if (a.parse && !Array.isArray(a.parse))
    a.parse = [a.parse];
  if (a.transform && !Array.isArray(a.transform))
    a.transform = [a.transform];
  if (a.afterHandle && !Array.isArray(a.afterHandle))
    a.afterHandle = [a.afterHandle];
  if (a.mapResponse && !Array.isArray(a.mapResponse))
    a.mapResponse = [a.mapResponse];
  if (a.afterResponse && !Array.isArray(a.afterResponse))
    a.afterResponse = [a.afterResponse];
  if (a.trace && !Array.isArray(a.trace))
    a.trace = [a.trace];
  if (a.error && !Array.isArray(a.error))
    a.error = [a.error];
  let beforeHandle = [];
  if (a.resolve)
    beforeHandle = fnToContainer(Array.isArray(a.resolve) ? a.resolve : [a.resolve], "resolve"), delete a.resolve;
  if (a.beforeHandle)
    if (beforeHandle.length)
      beforeHandle = beforeHandle.concat(Array.isArray(a.beforeHandle) ? a.beforeHandle : [a.beforeHandle]);
    else
      beforeHandle = Array.isArray(a.beforeHandle) ? a.beforeHandle : [a.beforeHandle];
  if (beforeHandle.length)
    a.beforeHandle = beforeHandle;
  return a;
};
var isBun2 = typeof Bun < "u";
var hasBunHash = isBun2 && typeof Bun.hash === "function";
var hasSetImmediate = typeof setImmediate === "function";
var checksum = (s) => {
  let h = 9;
  for (let i = 0;i < s.length; )
    h = Math.imul(h ^ s.charCodeAt(i++), 387420489);
  return h = h ^ h >>> 9;
};
var injectChecksum = (checksum2, x) => {
  if (!x)
    return;
  if (!Array.isArray(x)) {
    let fn = x;
    if (checksum2 && !fn.checksum)
      fn.checksum = checksum2;
    if (fn.scope === "scoped")
      fn.scope = "local";
    return fn;
  }
  let fns = [...x];
  for (let fn of fns) {
    if (checksum2 && !fn.checksum)
      fn.checksum = checksum2;
    if (fn.scope === "scoped")
      fn.scope = "local";
  }
  return fns;
};
var mergeLifeCycle = (a, b, checksum2) => {
  return { start: mergeObjectArray(a.start, injectChecksum(checksum2, b?.start)), request: mergeObjectArray(a.request, injectChecksum(checksum2, b?.request)), parse: mergeObjectArray(a.parse, injectChecksum(checksum2, b?.parse)), transform: mergeObjectArray(a.transform, injectChecksum(checksum2, b?.transform)), beforeHandle: mergeObjectArray(mergeObjectArray(fnToContainer(a.resolve, "resolve"), a.beforeHandle), injectChecksum(checksum2, mergeObjectArray(fnToContainer(b?.resolve, "resolve"), b?.beforeHandle))), afterHandle: mergeObjectArray(a.afterHandle, injectChecksum(checksum2, b?.afterHandle)), mapResponse: mergeObjectArray(a.mapResponse, injectChecksum(checksum2, b?.mapResponse)), afterResponse: mergeObjectArray(a.afterResponse, injectChecksum(checksum2, b?.afterResponse)), trace: mergeObjectArray(a.trace, injectChecksum(checksum2, b?.trace)), error: mergeObjectArray(a.error, injectChecksum(checksum2, b?.error)), stop: mergeObjectArray(a.stop, injectChecksum(checksum2, b?.stop)) };
};
var asHookType = (fn, inject, { skipIfHasType = false }) => {
  if (!fn)
    return fn;
  if (!Array.isArray(fn)) {
    if (skipIfHasType)
      fn.scope ??= inject;
    else
      fn.scope = inject;
    return fn;
  }
  for (let x of fn)
    if (skipIfHasType)
      x.scope ??= inject;
    else
      x.scope = inject;
  return fn;
};
var filterGlobal = (fn) => {
  if (!fn)
    return fn;
  if (!Array.isArray(fn))
    switch (fn.scope) {
      case "global":
      case "scoped":
        return { ...fn };
      default:
        return { fn };
    }
  let array = [];
  for (let x of fn)
    switch (x.scope) {
      case "global":
      case "scoped":
        array.push({ ...x });
        break;
    }
  return array;
};
var filterGlobalHook = (hook) => {
  return { ...hook, type: hook?.type, detail: hook?.detail, parse: filterGlobal(hook?.parse), transform: filterGlobal(hook?.transform), beforeHandle: filterGlobal(hook?.beforeHandle), afterHandle: filterGlobal(hook?.afterHandle), mapResponse: filterGlobal(hook?.mapResponse), afterResponse: filterGlobal(hook?.afterResponse), error: filterGlobal(hook?.error), trace: filterGlobal(hook?.trace) };
};
var StatusMap = { Continue: 100, "Switching Protocols": 101, Processing: 102, "Early Hints": 103, OK: 200, Created: 201, Accepted: 202, "Non-Authoritative Information": 203, "No Content": 204, "Reset Content": 205, "Partial Content": 206, "Multi-Status": 207, "Already Reported": 208, "Multiple Choices": 300, "Moved Permanently": 301, Found: 302, "See Other": 303, "Not Modified": 304, "Temporary Redirect": 307, "Permanent Redirect": 308, "Bad Request": 400, Unauthorized: 401, "Payment Required": 402, Forbidden: 403, "Not Found": 404, "Method Not Allowed": 405, "Not Acceptable": 406, "Proxy Authentication Required": 407, "Request Timeout": 408, Conflict: 409, Gone: 410, "Length Required": 411, "Precondition Failed": 412, "Payload Too Large": 413, "URI Too Long": 414, "Unsupported Media Type": 415, "Range Not Satisfiable": 416, "Expectation Failed": 417, "I'm a teapot": 418, "Enhance Your Calm": 420, "Misdirected Request": 421, "Unprocessable Content": 422, Locked: 423, "Failed Dependency": 424, "Too Early": 425, "Upgrade Required": 426, "Precondition Required": 428, "Too Many Requests": 429, "Request Header Fields Too Large": 431, "Unavailable For Legal Reasons": 451, "Internal Server Error": 500, "Not Implemented": 501, "Bad Gateway": 502, "Service Unavailable": 503, "Gateway Timeout": 504, "HTTP Version Not Supported": 505, "Variant Also Negotiates": 506, "Insufficient Storage": 507, "Loop Detected": 508, "Not Extended": 510, "Network Authentication Required": 511 };
var InvertedStatusMap = Object.fromEntries(Object.entries(StatusMap).map(([k2, v]) => [v, k2]));
function removeTrailingEquals(digest) {
  let trimmedDigest = digest;
  while (trimmedDigest.endsWith("="))
    trimmedDigest = trimmedDigest.slice(0, -1);
  return trimmedDigest;
}
var encoder = new TextEncoder;
var signCookie = async (val, secret) => {
  if (typeof val === "object")
    val = JSON.stringify(val);
  else if (typeof val !== "string")
    val = val + "";
  if (secret === null)
    throw TypeError("Secret key must be provided.");
  let secretKey = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), hmacBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(val));
  return val + "." + removeTrailingEquals(Buffer.from(hmacBuffer).toString("base64"));
};
var constantTimeEqual = typeof crypto?.timingSafeEqual === "function" ? (a, b) => {
  let ab = Buffer.from(a, "utf8"), bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length)
    return false;
  return crypto.timingSafeEqual(ab, bb);
} : (a, b) => a === b;
var unsignCookie = async (input, secret) => {
  if (typeof input !== "string")
    throw TypeError("Signed cookie string must be provided.");
  if (secret === null)
    throw TypeError("Secret key must be provided.");
  let dot = input.lastIndexOf(".");
  if (dot <= 0)
    return false;
  let tentativeValue = input.slice(0, dot), expectedInput = await signCookie(tentativeValue, secret);
  return constantTimeEqual(expectedInput, input) ? tentativeValue : false;
};
var insertStandaloneValidator = (hook, name, value) => {
  if (!hook.standaloneValidator?.length || !Array.isArray(hook.standaloneValidator)) {
    hook.standaloneValidator = [{ [name]: value }];
    return;
  }
  let last = hook.standaloneValidator[hook.standaloneValidator.length - 1];
  if (name in last)
    hook.standaloneValidator.push({ [name]: value });
  else
    last[name] = value;
};
var parseNumericString = (message) => {
  if (typeof message === "number")
    return message;
  if (message.length < 16) {
    if (message.trim().length === 0)
      return null;
    let length = Number(message);
    if (Number.isNaN(length))
      return null;
    return length;
  }
  if (message.length === 16) {
    if (message.trim().length === 0)
      return null;
    let number = Number(message);
    if (Number.isNaN(number) || number.toString() !== message)
      return null;
    return number;
  }
  return null;
};
var isNumericString = (message) => parseNumericString(message) !== null;

class PromiseGroup {
  onError;
  onFinally;
  root = null;
  promises = [];
  constructor(onError = console.error, onFinally = () => {}) {
    this.onError = onError;
    this.onFinally = onFinally;
  }
  get size() {
    return this.promises.length;
  }
  add(promise) {
    if (this.promises.push(promise), this.root ||= this.drain(), this.promises.length === 1)
      this.then(this.onFinally);
    return promise;
  }
  async drain() {
    while (this.promises.length > 0) {
      try {
        await this.promises[0];
      } catch (error) {
        this.onError(error);
      }
      this.promises.shift();
    }
    this.root = null;
  }
  then(onfulfilled, onrejected) {
    return (this.root ?? Promise.resolve()).then(onfulfilled, onrejected);
  }
}
var fnToContainer = (fn, subType) => {
  if (!fn)
    return fn;
  if (!Array.isArray(fn)) {
    if (typeof fn === "function" || typeof fn === "string")
      return subType ? { fn, subType } : { fn };
    else if ("fn" in fn)
      return fn;
  }
  let fns = [];
  for (let x of fn)
    if (typeof x === "function" || typeof x === "string")
      fns.push(subType ? { fn: x, subType } : { fn: x });
    else if ("fn" in x)
      fns.push(x);
  return fns;
};
var localHookToLifeCycleStore = (a) => {
  if (a.start)
    a.start = fnToContainer(a.start);
  if (a.request)
    a.request = fnToContainer(a.request);
  if (a.parse)
    a.parse = fnToContainer(a.parse);
  if (a.transform)
    a.transform = fnToContainer(a.transform);
  if (a.beforeHandle)
    a.beforeHandle = fnToContainer(a.beforeHandle);
  if (a.afterHandle)
    a.afterHandle = fnToContainer(a.afterHandle);
  if (a.mapResponse)
    a.mapResponse = fnToContainer(a.mapResponse);
  if (a.afterResponse)
    a.afterResponse = fnToContainer(a.afterResponse);
  if (a.trace)
    a.trace = fnToContainer(a.trace);
  if (a.error)
    a.error = fnToContainer(a.error);
  if (a.stop)
    a.stop = fnToContainer(a.stop);
  return a;
};
var lifeCycleToFn = (a) => {
  let lifecycle = Object.create(null);
  if (a.start?.map)
    lifecycle.start = a.start.map((x) => x.fn);
  if (a.request?.map)
    lifecycle.request = a.request.map((x) => x.fn);
  if (a.parse?.map)
    lifecycle.parse = a.parse.map((x) => x.fn);
  if (a.transform?.map)
    lifecycle.transform = a.transform.map((x) => x.fn);
  if (a.beforeHandle?.map)
    lifecycle.beforeHandle = a.beforeHandle.map((x) => x.fn);
  if (a.afterHandle?.map)
    lifecycle.afterHandle = a.afterHandle.map((x) => x.fn);
  if (a.mapResponse?.map)
    lifecycle.mapResponse = a.mapResponse.map((x) => x.fn);
  if (a.afterResponse?.map)
    lifecycle.afterResponse = a.afterResponse.map((x) => x.fn);
  if (a.error?.map)
    lifecycle.error = a.error.map((x) => x.fn);
  if (a.stop?.map)
    lifecycle.stop = a.stop.map((x) => x.fn);
  if (a.trace?.map)
    lifecycle.trace = a.trace.map((x) => x.fn);
  else
    lifecycle.trace = [];
  return lifecycle;
};
var cloneInference = (inference) => ({ body: inference.body, cookie: inference.cookie, headers: inference.headers, query: inference.query, set: inference.set, server: inference.server, path: inference.path, route: inference.route, url: inference.url });
var redirect = (url, status = 302) => Response.redirect(url, status);
var ELYSIA_FORM_DATA = Symbol("ElysiaFormData");
var ELYSIA_REQUEST_ID = Symbol("ElysiaRequestId");
var form = (items) => {
  let formData = new FormData;
  if (formData[ELYSIA_FORM_DATA] = {}, items)
    for (let [key, value] of Object.entries(items)) {
      if (Array.isArray(value)) {
        formData[ELYSIA_FORM_DATA][key] = [];
        for (let v of value) {
          if (value instanceof File)
            formData.append(key, value, value.name);
          else if (value instanceof ElysiaFile)
            formData.append(key, value.value, value.value?.name);
          else
            formData.append(key, value);
          formData[ELYSIA_FORM_DATA][key].push(value);
        }
        continue;
      }
      if (value instanceof File)
        formData.append(key, value, value.name);
      else if (value instanceof ElysiaFile)
        formData.append(key, value.value, value.value?.name);
      else
        formData.append(key, value);
      formData[ELYSIA_FORM_DATA][key] = value;
    }
  return formData;
};
var randomId = typeof crypto > "u" ? () => {
  let result = "", characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", charactersLength = characters.length;
  for (let i = 0;i < 16; i++)
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  return result;
} : () => {
  let uuid = crypto.randomUUID();
  return uuid.slice(0, 8) + uuid.slice(24, 32);
};
var deduplicateChecksum = (array) => {
  if (!array.length)
    return [];
  let hashes = [];
  for (let i = 0;i < array.length; i++) {
    let item = array[i];
    if (item.checksum) {
      if (hashes.includes(item.checksum))
        array.splice(i, 1), i--;
      hashes.push(item.checksum);
    }
  }
  return array;
};
var promoteEvent = (events, as = "scoped") => {
  if (!events)
    return;
  if (as === "scoped") {
    for (let event of events)
      if ("scope" in event && event.scope === "local")
        event.scope = "scoped";
    return;
  }
  for (let event of events)
    if ("scope" in event)
      event.scope = "global";
};
var getLoosePath = (path) => {
  if (path.charCodeAt(path.length - 1) === 47)
    return path.slice(0, path.length - 1);
  return path + "/";
};
var isNotEmpty = (obj) => {
  if (!obj)
    return false;
  for (let _2 in obj)
    return true;
  return false;
};
var encodePath = (path, { dynamic = false } = {}) => {
  let encoded = encodeURIComponent(path).replace(/%2F/g, "/");
  if (dynamic)
    encoded = encoded.replace(/%3A/g, ":").replace(/%3F/g, "?");
  return encoded;
};
var supportPerMethodInlineHandler = (() => {
  if (typeof Bun > "u")
    return true;
  if (Bun.semver?.satisfies?.(Bun.version, ">=1.2.14"))
    return true;
  return false;
})();
async function getResponseLength(response) {
  if (response.bodyUsed || !response.body)
    return 0;
  let length = 0, reader = response.body.getReader();
  while (true) {
    let { done, value } = await reader.read();
    if (done)
      break;
    length += value.byteLength;
  }
  return length;
}
var emptySchema = { headers: true, cookie: true, query: true, params: true, body: true, response: true };
var env = typeof Bun < "u" ? Bun.env : typeof process < "u" ? process?.env : undefined;
var ERROR_CODE = Symbol("ElysiaErrorCode");
var isProduction = (env?.NODE_ENV ?? env?.ENV) === "production";
var emptyHttpStatus = { 101: undefined, 204: undefined, 205: undefined, 304: undefined, 307: undefined, 308: undefined };

class ElysiaCustomStatusResponse {
  code;
  response;
  constructor(code, response) {
    let res = response ?? (code in InvertedStatusMap ? InvertedStatusMap[code] : code);
    if (this.code = StatusMap[code] ?? code, code in emptyHttpStatus)
      this.response = undefined;
    else
      this.response = res;
  }
}
var status = (code, response) => new ElysiaCustomStatusResponse(code, response);
class NotFoundError extends Error {
  code = "NOT_FOUND";
  status = 404;
  constructor(message) {
    super(message ?? "NOT_FOUND");
  }
}

class ParseError2 extends Error {
  code = "PARSE";
  status = 400;
  constructor(cause) {
    super("Bad Request", { cause });
  }
}

class InvalidCookieSignature extends Error {
  key;
  code = "INVALID_COOKIE_SIGNATURE";
  status = 400;
  constructor(key, message) {
    super(message ?? `"${key}" has invalid cookie signature`);
    this.key = key;
  }
}
var mapValueError = (error) => {
  if (!error)
    return error;
  let { message, path, value, type } = error;
  if (Array.isArray(path))
    path = path[0];
  let property = typeof path === "string" ? path.slice(1).replaceAll("/", ".") : "unknown", isRoot = path === "";
  switch (type) {
    case 42:
      return { ...error, summary: isRoot ? "Value should not be provided" : `Property '${property}' should not be provided` };
    case 45:
      return { ...error, summary: isRoot ? "Value is missing" : `Property '${property}' is missing` };
    case 50:
      let quoteIndex = message.indexOf("'"), format = message.slice(quoteIndex + 1, message.indexOf("'", quoteIndex + 1));
      return { ...error, summary: isRoot ? "Value should be an email" : `Property '${property}' should be ${format}` };
    case 54:
      return { ...error, summary: `${message.slice(0, 9).trim()} property '${property}' to be ${message.slice(8).trim()} but found: ${value}` };
    case 62:
      let union = error.schema.anyOf.map((x) => `'${x?.format ?? x.type}'`).join(", ");
      return { ...error, summary: isRoot ? `Value should be one of ${union}` : `Property '${property}' should be one of: ${union}` };
    default:
      return { summary: message, ...error };
  }
};

class InvalidFileType extends Error {
  property;
  expected;
  message;
  code = "INVALID_FILE_TYPE";
  status = 422;
  constructor(property, expected, message = `"${property}" has invalid file type`) {
    super(message);
    this.property = property;
    this.expected = expected;
    this.message = message;
    Object.setPrototypeOf(this, InvalidFileType.prototype);
  }
  toResponse(headers) {
    if (isProduction)
      return new Response(JSON.stringify({ type: "validation", on: "body" }), { status: 422, headers: { ...headers, "content-type": "application/json" } });
    return new Response(JSON.stringify({ type: "validation", on: "body", summary: "Invalid file type", message: this.message, property: this.property, expected: this.expected }), { status: 422, headers: { ...headers, "content-type": "application/json" } });
  }
}

class ValidationError extends Error {
  type;
  validator;
  value;
  allowUnsafeValidationDetails;
  code = "VALIDATION";
  status = 422;
  valueError;
  get messageValue() {
    return this.valueError;
  }
  expected;
  customError;
  constructor(type, validator, value, allowUnsafeValidationDetails = false, errors) {
    let message = "", error, expected, customError;
    if (validator?.provider === "standard" || "~standard" in validator || validator.schema && "~standard" in validator.schema) {
      let standard = ("~standard" in validator ? validator : validator.schema)["~standard"];
      if (error = (errors ?? standard.validate(value).issues)?.[0], isProduction && !allowUnsafeValidationDetails)
        message = JSON.stringify({ type: "validation", on: type, found: value });
      else
        message = JSON.stringify({ type: "validation", on: type, property: error.path?.[0] || "root", message: error?.message, summary: error?.problem, expected, found: value, errors }, null, 2);
      customError = error?.message;
    } else {
      if (value && typeof value === "object" && value instanceof ElysiaCustomStatusResponse)
        value = value.response;
      error = errors?.First() ?? ("Errors" in validator ? validator.Errors(value).First() : exports_value2.Errors(validator, value).First());
      let accessor = error?.path || "root", schema = validator?.schema ?? validator;
      if (!isProduction && !allowUnsafeValidationDetails)
        try {
          expected = exports_value2.Create(schema);
        } catch (error2) {
          expected = { type: "Could not create expected value", message: error2?.message, error: error2 };
        }
      if (customError = error?.schema?.message || error?.schema?.error !== undefined ? typeof error.schema.error === "function" ? error.schema.error(isProduction && !allowUnsafeValidationDetails ? { type: "validation", on: type, found: value } : { type: "validation", on: type, value, property: accessor, message: error?.message, summary: mapValueError(error).summary, found: value, expected, errors: "Errors" in validator ? [...validator.Errors(value)].map(mapValueError) : [...exports_value2.Errors(validator, value)].map(mapValueError) }, validator) : error.schema.error : undefined, customError !== undefined)
        message = typeof customError === "object" ? JSON.stringify(customError) : customError + "";
      else if (isProduction && !allowUnsafeValidationDetails)
        message = JSON.stringify({ type: "validation", on: type, found: value });
      else
        message = JSON.stringify({ type: "validation", on: type, property: accessor, message: error?.message, summary: mapValueError(error).summary, expected, found: value, errors: "Errors" in validator ? [...validator.Errors(value)].map(mapValueError) : [...exports_value2.Errors(validator, value)].map(mapValueError) }, null, 2);
    }
    super(message);
    this.type = type;
    this.validator = validator;
    this.value = value;
    this.allowUnsafeValidationDetails = allowUnsafeValidationDetails;
    this.valueError = error, this.expected = expected, this.customError = customError, Object.setPrototypeOf(this, ValidationError.prototype);
  }
  get all() {
    if (this.validator?.provider === "standard" || "~standard" in this.validator || "schema" in this.validator && this.validator.schema && "~standard" in this.validator.schema)
      return ("~standard" in this.validator ? this.validator : this.validator.schema)["~standard"].validate(this.value).issues?.map((issue) => ({ summary: issue.message, path: issue.path?.join(".") || "root", message: issue.message, value: this.value })) || [];
    return "Errors" in this.validator ? [...this.validator.Errors(this.value)].map(mapValueError) : [...exports_value2.Errors(this.validator, this.value)].map(mapValueError);
  }
  static simplifyModel(validator) {
    let model = "schema" in validator ? validator.schema : validator;
    try {
      return exports_value2.Create(model);
    } catch {
      return model;
    }
  }
  get model() {
    if ("~standard" in this.validator)
      return this.validator;
    return ValidationError.simplifyModel(this.validator);
  }
  toResponse(headers) {
    return new Response(this.message, { status: 400, headers: { ...headers, "content-type": "application/json" } });
  }
  detail(message, allowUnsafeValidatorDetails = this.allowUnsafeValidationDetails) {
    if (!this.customError)
      return this.message;
    let value = this.value, expected = this.expected, errors = this.all;
    return isProduction && !allowUnsafeValidatorDetails ? { type: "validation", on: this.type, found: value, message } : { type: "validation", on: this.type, property: this.valueError?.path || "root", message, summary: this.valueError ? mapValueError(this.valueError).summary : undefined, found: value, expected, errors };
  }
}
var tryParse = (v, schema) => {
  try {
    return JSON.parse(v);
  } catch {
    throw new ValidationError("property", schema, v);
  }
};
function createType(kind, func) {
  if (!exports_type2.Has(kind))
    exports_type2.Set(kind, func);
  return (options = {}) => Unsafe({ ...options, [Kind]: kind });
}
var compile = (schema) => {
  try {
    let compiler = TypeCompiler.Compile(schema);
    return compiler.Create = () => exports_value2.Create(schema), compiler.Error = (v) => new ValidationError("property", schema, v, compiler.Errors(v)), compiler;
  } catch {
    return { Check: (v) => exports_value2.Check(schema, v), CheckThrow: (v) => {
      if (!exports_value2.Check(schema, v))
        throw new ValidationError("property", schema, v, exports_value2.Errors(schema, v));
    }, Decode: (v) => exports_value2.Decode(schema, v), Create: () => exports_value2.Create(schema), Error: (v) => new ValidationError("property", schema, v, exports_value2.Errors(schema, v)) };
  }
};
var parseFileUnit = (size) => {
  if (typeof size === "string")
    switch (size.slice(-1)) {
      case "k":
        return +size.slice(0, size.length - 1) * 1024;
      case "m":
        return +size.slice(0, size.length - 1) * 1048576;
      default:
        return +size;
    }
  return size;
};
var checkFileExtension = (type, extension) => {
  if (type.startsWith(extension))
    return true;
  return extension.charCodeAt(extension.length - 1) === 42 && extension.charCodeAt(extension.length - 2) === 47 && type.startsWith(extension.slice(0, -1));
};
var _fileTypeFromBlobWarn = false;
var warnIfFileTypeIsNotInstalled = () => {
  if (!_fileTypeFromBlobWarn)
    console.warn("[Elysia] Attempt to validate file type without 'file-type'. This may lead to security risks. We recommend installing 'file-type' to properly validate file extension."), _fileTypeFromBlobWarn = true;
};
var loadFileType = async () => Promise.resolve().then(() => (init_file_type(), exports_file_type)).then((x) => {
  return _fileTypeFromBlob = x.fileTypeFromBlob, _fileTypeFromBlob;
}).catch(warnIfFileTypeIsNotInstalled);
var _fileTypeFromBlob;
var fileTypeFromBlob2 = (file2) => {
  if (_fileTypeFromBlob)
    return _fileTypeFromBlob(file2);
  return loadFileType().then((mod) => {
    if (mod)
      return mod(file2);
  });
};
var fileType = async (file2, extension, name = file2?.name ?? "") => {
  if (Array.isArray(file2))
    return await Promise.all(file2.map((f) => fileType(f, extension, name))), true;
  if (!file2)
    return false;
  let result = await fileTypeFromBlob2(file2);
  if (!result)
    throw new InvalidFileType(name, extension);
  if (typeof extension === "string") {
    if (!checkFileExtension(result.mime, extension))
      throw new InvalidFileType(name, extension);
  }
  for (let i = 0;i < extension.length; i++)
    if (checkFileExtension(result.mime, extension[i]))
      return true;
  throw new InvalidFileType(name, extension);
};
var validateFile = (options, value) => {
  if (value instanceof ElysiaFile)
    return true;
  if (!(value instanceof Blob))
    return false;
  if (options.minSize && value.size < parseFileUnit(options.minSize))
    return false;
  if (options.maxSize && value.size > parseFileUnit(options.maxSize))
    return false;
  if (options.extension) {
    if (typeof options.extension === "string")
      return checkFileExtension(value.type, options.extension);
    for (let i = 0;i < options.extension.length; i++)
      if (checkFileExtension(value.type, options.extension[i]))
        return true;
    return false;
  }
  return true;
};
var fullFormats = { date, time: getTime(true), "date-time": getDateTime(true), "iso-time": getTime(false), "iso-date-time": getDateTime(false), duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/, uri, "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i, "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i, url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu, email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i, hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i, ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/, ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i, regex, uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i, "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/, "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i, "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/, byte, int32: { type: "number", validate: validateInt32 }, int64: { type: "number", validate: validateInt64 }, float: { type: "number", validate: validateNumber }, double: { type: "number", validate: validateNumber }, password: true, binary: true };
function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function date(str) {
  let matches = DATE.exec(str);
  if (!matches)
    return false;
  let year = +matches[1], month = +matches[2], day = +matches[3];
  return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
}
var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
function getTime(strictTimeZone) {
  return function(str) {
    let matches = TIME.exec(str);
    if (!matches)
      return false;
    let hr = +matches[1], min = +matches[2], sec = +matches[3], tz = matches[4], tzSign = matches[5] === "-" ? -1 : 1, tzH = +(matches[6] || 0), tzM = +(matches[7] || 0);
    if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
      return false;
    if (hr <= 23 && min <= 59 && sec < 60)
      return true;
    let utcMin = min - tzM * tzSign, utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
    return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
  };
}
var parseDateTimeEmptySpace = (str) => {
  if (str.charCodeAt(str.length - 6) === 32)
    return str.slice(0, -6) + "+" + str.slice(-5);
  return str;
};
var DATE_TIME_SEPARATOR = /t|\s/i;
function getDateTime(strictTimeZone) {
  let time = getTime(strictTimeZone);
  return function(str) {
    let dateTime = str.split(DATE_TIME_SEPARATOR);
    return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
  };
}
var NOT_URI_FRAGMENT = /\/|:/;
var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
function uri(str) {
  return NOT_URI_FRAGMENT.test(str) && URI.test(str);
}
var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
function byte(str) {
  return BYTE.lastIndex = 0, BYTE.test(str);
}
var MIN_INT32 = -2147483648;
var MAX_INT32 = 2147483647;
function validateInt32(value) {
  return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
}
function validateInt64(value) {
  return Number.isInteger(value);
}
function validateNumber() {
  return true;
}
var Z_ANCHOR = /[^\\]\\Z/;
function regex(str) {
  if (Z_ANCHOR.test(str))
    return false;
  try {
    return new RegExp(str), true;
  } catch (e) {
    return false;
  }
}
var isISO8601 = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;
var isFormalDate = /(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{2}\s\d{4}\s\d{2}:\d{2}:\d{2}\sGMT(?:\+|-)\d{4}\s\([^)]+\)/;
var isShortenDate = /^(?:(?:(?:(?:0?[1-9]|[12][0-9]|3[01])[/\s-](?:0?[1-9]|1[0-2])[/\s-](?:19|20)\d{2})|(?:(?:19|20)\d{2}[/\s-](?:0?[1-9]|1[0-2])[/\s-](?:0?[1-9]|[12][0-9]|3[01]))))(?:\s(?:1[012]|0?[1-9]):[0-5][0-9](?::[0-5][0-9])?(?:\s[AP]M)?)?$/;
var _validateDate = fullFormats.date;
var _validateDateTime = fullFormats["date-time"];
if (!exports_format.Has("date"))
  exports_format.Set("date", (value) => {
    let temp = parseDateTimeEmptySpace(value).replace(/"/g, "");
    if (isISO8601.test(temp) || isFormalDate.test(temp) || isShortenDate.test(temp) || _validateDate(temp)) {
      let date2 = new Date(temp);
      if (!Number.isNaN(date2.getTime()))
        return true;
    }
    return false;
  });
if (!exports_format.Has("date-time"))
  exports_format.Set("date-time", (value) => {
    let temp = value.replace(/"/g, "");
    if (isISO8601.test(temp) || isFormalDate.test(temp) || isShortenDate.test(temp) || _validateDateTime(temp)) {
      let date2 = new Date(temp);
      if (!Number.isNaN(date2.getTime()))
        return true;
    }
    return false;
  });
Object.entries(fullFormats).forEach((formatEntry) => {
  let [formatName, formatValue] = formatEntry;
  if (!exports_format.Has(formatName)) {
    if (formatValue instanceof RegExp)
      exports_format.Set(formatName, (value) => formatValue.test(value));
    else if (typeof formatValue === "function")
      exports_format.Set(formatName, formatValue);
  }
});
if (!exports_format.Has("numeric"))
  exports_format.Set("numeric", (value) => !!value && !isNaN(+value));
if (!exports_format.Has("integer"))
  exports_format.Set("integer", (value) => !!value && Number.isInteger(+value));
if (!exports_format.Has("boolean"))
  exports_format.Set("boolean", (value) => value === "true" || value === "false");
if (!exports_format.Has("ObjectString"))
  exports_format.Set("ObjectString", (value) => {
    let start = value.charCodeAt(0);
    if (start === 9 || start === 10 || start === 32)
      start = value.trimStart().charCodeAt(0);
    if (start !== 123 && start !== 91)
      return false;
    try {
      return JSON.parse(value), true;
    } catch {
      return false;
    }
  });
if (!exports_format.Has("ArrayString"))
  exports_format.Set("ArrayString", (value) => {
    let start = value.charCodeAt(0);
    if (start === 9 || start === 10 || start === 32)
      start = value.trimStart().charCodeAt(0);
    if (start !== 123 && start !== 91)
      return false;
    try {
      return JSON.parse(value), true;
    } catch {
      return false;
    }
  });
var t = Object.assign({}, Type);
createType("UnionEnum", (schema, value) => (typeof value === "number" || typeof value === "string" || value === null) && schema.enum.includes(value));
createType("ArrayBuffer", (schema, value) => value instanceof ArrayBuffer);
var internalFiles = createType("Files", (options, value) => {
  if (options.minItems && options.minItems > 1 && !Array.isArray(value))
    return false;
  if (!Array.isArray(value))
    return validateFile(options, value);
  if (options.minItems && value.length < options.minItems)
    return false;
  if (options.maxItems && value.length > options.maxItems)
    return false;
  for (let i = 0;i < value.length; i++)
    if (!validateFile(options, value[i]))
      return false;
  return true;
});
var internalFormData = createType("ElysiaForm", ({ compiler, ...schema }, value) => {
  if (!(value instanceof FormData))
    return false;
  if (compiler) {
    if (!(ELYSIA_FORM_DATA in value))
      throw new ValidationError("property", schema, value);
    if (!compiler.Check(value[ELYSIA_FORM_DATA]))
      throw compiler.Error(value[ELYSIA_FORM_DATA]);
  }
  return true;
});
var ElysiaType = { String: (property) => Type.String(property), Numeric: (property) => {
  let schema = Type.Number(property), compiler = compile(schema);
  return t.Transform(t.Union([t.String({ format: "numeric", default: 0 }), t.Number(property)], property)).Decode((value) => {
    let number = +value;
    if (isNaN(number))
      return value;
    if (property && !compiler.Check(number))
      throw compiler.Error(number);
    return number;
  }).Encode((value) => value);
}, NumericEnum(item, property) {
  let schema = Type.Enum(item, property), compiler = compile(schema);
  return t.Transform(t.Union([t.String({ format: "numeric" }), t.Number()], property)).Decode((value) => {
    let number = +value;
    if (isNaN(number))
      throw compiler.Error(number);
    if (!compiler.Check(number))
      throw compiler.Error(number);
    return number;
  }).Encode((value) => value);
}, Integer: (property) => {
  let schema = Type.Integer(property), compiler = compile(schema);
  return t.Transform(t.Union([t.String({ format: "integer", default: 0 }), Type.Integer(property)], property)).Decode((value) => {
    let number = +value;
    if (!compiler.Check(number))
      throw compiler.Error(number);
    return number;
  }).Encode((value) => value);
}, Date: (property) => {
  let schema = Type.Date(property), compiler = compile(schema), _default = property?.default ? new Date(property.default) : undefined;
  return t.Transform(t.Union([Type.Date(property), t.String({ format: "date-time", default: _default?.toISOString() }), t.String({ format: "date", default: _default?.toISOString() }), t.Number({ default: _default?.getTime() })], property)).Decode((value) => {
    if (typeof value === "number") {
      let date3 = new Date(value);
      if (!compiler.Check(date3))
        throw compiler.Error(date3);
      return date3;
    }
    if (value instanceof Date)
      return value;
    let date2 = new Date(parseDateTimeEmptySpace(value));
    if (!date2 || isNaN(date2.getTime()))
      throw new ValidationError("property", schema, date2);
    if (!compiler.Check(date2))
      throw compiler.Error(date2);
    return date2;
  }).Encode((value) => {
    if (value instanceof Date)
      return value.toISOString();
    if (typeof value === "string") {
      let parsed = new Date(parseDateTimeEmptySpace(value));
      if (isNaN(parsed.getTime()))
        throw new ValidationError("property", schema, value);
      return parsed.toISOString();
    }
    if (!compiler.Check(value))
      throw compiler.Error(value);
    return value;
  });
}, BooleanString: (property) => {
  let schema = Type.Boolean(property), compiler = compile(schema);
  return t.Transform(t.Union([t.Boolean(property), t.String({ format: "boolean", default: false })], property)).Decode((value) => {
    if (typeof value === "string")
      return value === "true";
    if (value !== undefined && !compiler.Check(value))
      throw compiler.Error(value);
    return value;
  }).Encode((value) => value);
}, ObjectString: (properties, options) => {
  let schema = t.Object(properties, options), compiler = compile(schema);
  return t.Transform(t.Union([t.String({ format: "ObjectString", default: options?.default }), schema], { elysiaMeta: "ObjectString" })).Decode((value) => {
    if (typeof value === "string") {
      if (value.charCodeAt(0) !== 123)
        throw new ValidationError("property", schema, value);
      if (!compiler.Check(value = tryParse(value, schema)))
        throw compiler.Error(value);
      return compiler.Decode(value);
    }
    return value;
  }).Encode((value) => {
    let original;
    if (typeof value === "string")
      value = tryParse(original = value, schema);
    if (!compiler.Check(value))
      throw compiler.Error(value);
    return original ?? JSON.stringify(value);
  });
}, ArrayString: (children = t.String(), options) => {
  let schema = t.Array(children, options), compiler = compile(schema), decode2 = (value, isProperty = false) => {
    if (value.charCodeAt(0) === 91) {
      if (!compiler.Check(value = tryParse(value, schema)))
        throw compiler.Error(value);
      return compiler.Decode(value);
    }
    if (isProperty)
      return value;
    throw new ValidationError("property", schema, value);
  };
  return t.Transform(t.Union([t.String({ format: "ArrayString", default: options?.default }), schema], { elysiaMeta: "ArrayString" })).Decode((value) => {
    if (Array.isArray(value)) {
      let values = [];
      for (let i = 0;i < value.length; i++) {
        let v = value[i];
        if (typeof v === "string") {
          let t2 = decode2(v, true);
          if (Array.isArray(t2))
            values = values.concat(t2);
          else
            values.push(t2);
          continue;
        }
        values.push(v);
      }
      return values;
    }
    if (typeof value === "string")
      return decode2(value);
    return value;
  }).Encode((value) => {
    let original;
    if (typeof value === "string")
      value = tryParse(original = value, schema);
    if (!compiler.Check(value))
      throw new ValidationError("property", schema, value);
    return original ?? JSON.stringify(value);
  });
}, ArrayQuery: (children = t.String(), options) => {
  let schema = t.Array(children, options), compiler = compile(schema), decode2 = (value) => {
    if (value.indexOf(",") !== -1)
      return compiler.Decode(value.split(","));
    return compiler.Decode([value]);
  };
  return t.Transform(t.Union([t.String({ default: options?.default }), schema], { elysiaMeta: "ArrayQuery" })).Decode((value) => {
    if (Array.isArray(value)) {
      let values = [];
      for (let i = 0;i < value.length; i++) {
        let v = value[i];
        if (typeof v === "string") {
          let t2 = decode2(v);
          if (Array.isArray(t2))
            values = values.concat(t2);
          else
            values.push(t2);
          continue;
        }
        values.push(v);
      }
      return values;
    }
    if (typeof value === "string")
      return decode2(value);
    return value;
  }).Encode((value) => {
    let original;
    if (typeof value === "string")
      value = tryParse(original = value, schema);
    if (!compiler.Check(value))
      throw new ValidationError("property", schema, value);
    return original ?? JSON.stringify(value);
  });
}, File: createType("File", validateFile), Files: (options = {}) => t.Transform(internalFiles(options)).Decode((value) => {
  if (Array.isArray(value))
    return value;
  return [value];
}).Encode((value) => value), Nullable: (schema, options) => t.Union([schema, t.Null()], { ...options, nullable: true }), MaybeEmpty: (schema, options) => t.Union([schema, t.Null(), t.Undefined()], options), Cookie: (properties, { domain, expires, httpOnly, maxAge, path, priority, sameSite, secure, secrets, sign, ...options } = {}) => {
  let v = t.Object(properties, options);
  return v.config = { domain, expires, httpOnly, maxAge, path, priority, sameSite, secure, secrets, sign }, v;
}, UnionEnum: (values, options = {}) => {
  let type = values.every((value) => typeof value === "string") ? { type: "string" } : values.every((value) => typeof value === "number") ? { type: "number" } : values.every((value) => value === null) ? { type: "null" } : {};
  if (values.some((x) => typeof x === "object" && x !== null))
    throw Error("This type does not support objects or arrays");
  return { default: values[0], ...options, [Kind]: "UnionEnum", ...type, enum: values };
}, NoValidate: (v, enabled = true) => {
  return v.noValidate = enabled, v;
}, Form: (v, options = {}) => {
  let schema = t.Object(v, { default: form({}), ...options }), compiler = compile(schema);
  return t.Union([schema, internalFormData({ compiler })]);
}, ArrayBuffer(options = {}) {
  return { default: [1, 2, 3], ...options, [Kind]: "ArrayBuffer" };
}, Uint8Array: (options) => {
  let schema = Type.Uint8Array(options), compiler = compile(schema);
  return t.Transform(t.Union([t.ArrayBuffer(), Type.Uint8Array(options)])).Decode((value) => {
    if (value instanceof ArrayBuffer) {
      if (!compiler.Check(value = new Uint8Array(value)))
        throw compiler.Error(value);
      return value;
    }
    return value;
  }).Encode((value) => value);
} };
t.BooleanString = ElysiaType.BooleanString;
t.ObjectString = ElysiaType.ObjectString;
t.ArrayString = ElysiaType.ArrayString;
t.ArrayQuery = ElysiaType.ArrayQuery;
t.Numeric = ElysiaType.Numeric;
t.NumericEnum = ElysiaType.NumericEnum;
t.Integer = ElysiaType.Integer;
t.File = (arg) => {
  if (arg?.type)
    loadFileType();
  return ElysiaType.File({ default: "File", ...arg, extension: arg?.type, type: "string", format: "binary" });
};
t.Files = (arg) => {
  if (arg?.type)
    loadFileType();
  return ElysiaType.Files({ ...arg, elysiaMeta: "Files", default: "Files", extension: arg?.type, type: "array", items: { ...arg, default: "Files", type: "string", format: "binary" } });
};
t.Nullable = ElysiaType.Nullable;
t.MaybeEmpty = ElysiaType.MaybeEmpty;
t.Cookie = ElysiaType.Cookie;
t.Date = ElysiaType.Date;
t.UnionEnum = ElysiaType.UnionEnum;
t.NoValidate = ElysiaType.NoValidate;
t.Form = ElysiaType.Form;
t.ArrayBuffer = ElysiaType.ArrayBuffer;
t.Uint8Array = ElysiaType.Uint8Array;
var import_cookie = __toESM2(require_dist(), 1);
var import_fast_decode_uri_component = __toESM2(require_fast_decode_uri_component(), 1);
var hashString = (str) => {
  let hash2 = 2166136261, len = str.length;
  for (let i = 0;i < len; i++)
    hash2 ^= str.charCodeAt(i), hash2 = Math.imul(hash2, 16777619);
  return hash2 >>> 0;
};

class Cookie {
  name;
  jar;
  initial;
  valueHash;
  constructor(name, jar, initial = {}) {
    this.name = name;
    this.jar = jar;
    this.initial = initial;
  }
  get cookie() {
    return this.jar[this.name] ?? this.initial;
  }
  set cookie(jar) {
    if (!(this.name in this.jar))
      this.jar[this.name] = this.initial;
    this.jar[this.name] = jar, this.valueHash = undefined;
  }
  get setCookie() {
    if (!(this.name in this.jar))
      this.jar[this.name] = this.initial;
    return this.jar[this.name];
  }
  set setCookie(jar) {
    this.cookie = jar;
  }
  get value() {
    return this.cookie.value;
  }
  set value(value) {
    let current = this.cookie.value;
    if (current === value)
      return;
    if (typeof current === "object" && current !== null && typeof value === "object" && value !== null)
      try {
        let valueStr = JSON.stringify(value), newHash = hashString(valueStr);
        if (this.valueHash !== undefined && this.valueHash !== newHash)
          this.valueHash = newHash;
        else {
          if (JSON.stringify(current) === valueStr) {
            this.valueHash = newHash;
            return;
          }
          this.valueHash = newHash;
        }
      } catch {}
    if (!(this.name in this.jar))
      this.jar[this.name] = { ...this.initial };
    this.jar[this.name].value = value;
  }
  get expires() {
    return this.cookie.expires;
  }
  set expires(expires) {
    this.setCookie.expires = expires;
  }
  get maxAge() {
    return this.cookie.maxAge;
  }
  set maxAge(maxAge) {
    this.setCookie.maxAge = maxAge;
  }
  get domain() {
    return this.cookie.domain;
  }
  set domain(domain) {
    this.setCookie.domain = domain;
  }
  get path() {
    return this.cookie.path;
  }
  set path(path) {
    this.setCookie.path = path;
  }
  get secure() {
    return this.cookie.secure;
  }
  set secure(secure) {
    this.setCookie.secure = secure;
  }
  get httpOnly() {
    return this.cookie.httpOnly;
  }
  set httpOnly(httpOnly) {
    this.setCookie.httpOnly = httpOnly;
  }
  get sameSite() {
    return this.cookie.sameSite;
  }
  set sameSite(sameSite) {
    this.setCookie.sameSite = sameSite;
  }
  get priority() {
    return this.cookie.priority;
  }
  set priority(priority) {
    this.setCookie.priority = priority;
  }
  get partitioned() {
    return this.cookie.partitioned;
  }
  set partitioned(partitioned) {
    this.setCookie.partitioned = partitioned;
  }
  get secrets() {
    return this.cookie.secrets;
  }
  set secrets(secrets) {
    this.setCookie.secrets = secrets;
  }
  update(config) {
    return this.setCookie = Object.assign(this.cookie, typeof config === "function" ? config(this.cookie) : config), this;
  }
  set(config) {
    return this.setCookie = Object.assign({ ...this.initial, value: this.value }, typeof config === "function" ? config(this.cookie) : config), this;
  }
  remove() {
    if (this.value === undefined)
      return;
    return this.set({ expires: new Date(0), maxAge: 0, value: "" }), this;
  }
  toString() {
    return typeof this.value === "object" ? JSON.stringify(this.value) : this.value?.toString() ?? "";
  }
}
var createCookieJar = (set, store, initial) => {
  if (!set.cookie)
    set.cookie = {};
  return new Proxy(store, { get(_2, key) {
    if (key in store)
      return new Cookie(key, set.cookie, Object.assign({}, initial ?? {}, store[key]));
    return new Cookie(key, set.cookie, Object.assign({}, initial));
  } });
};
var parseCookie = async (set, cookieString, { secrets, sign, ...initial } = {}) => {
  if (!cookieString)
    return createCookieJar(set, {}, initial);
  let isStringKey = typeof secrets === "string";
  if (sign && sign !== true && !Array.isArray(sign))
    sign = [sign];
  let jar = {}, cookies = import_cookie.parse(cookieString);
  for (let [name, v] of Object.entries(cookies)) {
    if (v === undefined)
      continue;
    let value = import_fast_decode_uri_component.default(v);
    if (value) {
      let starts = value.charCodeAt(0), ends = value.charCodeAt(value.length - 1);
      if (starts === 123 && ends === 125 || starts === 91 && ends === 93)
        try {
          value = JSON.parse(value);
        } catch {}
    }
    if (sign === true || sign?.includes(name)) {
      if (!secrets)
        throw Error("No secret is provided to cookie plugin");
      if (isStringKey) {
        if (typeof value !== "string")
          throw new InvalidCookieSignature(name);
        let temp = await unsignCookie(value, secrets);
        if (temp === false)
          throw new InvalidCookieSignature(name);
        value = temp;
      } else {
        let decoded = false;
        for (let i = 0;i < secrets.length; i++) {
          if (typeof value !== "string")
            throw new InvalidCookieSignature(name);
          let temp = await unsignCookie(value, secrets[i]);
          if (temp !== false) {
            decoded = true, value = temp;
            break;
          }
        }
        if (!decoded)
          throw new InvalidCookieSignature(name);
      }
    }
    jar[name] = { value };
  }
  return createCookieJar(set, jar, initial);
};
var serializeCookie = (cookies) => {
  if (!cookies || !isNotEmpty(cookies))
    return;
  let set = [];
  for (let [key, property] of Object.entries(cookies)) {
    if (!key || !property)
      continue;
    let value = property.value;
    if (value === undefined || value === null)
      continue;
    set.push(import_cookie.serialize(key, typeof value === "object" ? JSON.stringify(value) : value + "", property));
  }
  if (set.length === 0)
    return;
  if (set.length === 1)
    return set[0];
  return set;
};
var env2 = isBun ? Bun.env : typeof process < "u" && process?.env ? process.env : {};
var handleFile = (response, set) => {
  if (!isBun && response instanceof Promise)
    return response.then((res) => handleFile(res, set));
  let size = response.size, immutable = set && (set.status === 206 || set.status === 304 || set.status === 412 || set.status === 416), defaultHeader = immutable ? {} : { "accept-ranges": "bytes", "content-range": size ? `bytes 0-${size - 1}/${size}` : undefined };
  if (!set && !size)
    return new Response(response);
  if (!set)
    return new Response(response, { headers: defaultHeader });
  if (set.headers instanceof Headers) {
    for (let key of Object.keys(defaultHeader))
      if (key in set.headers)
        set.headers.append(key, defaultHeader[key]);
    if (immutable)
      set.headers.delete("content-length"), set.headers.delete("accept-ranges");
    return new Response(response, set);
  }
  if (isNotEmpty(set.headers))
    return new Response(response, { status: set.status, headers: Object.assign(defaultHeader, set.headers) });
  return new Response(response, { status: set.status, headers: defaultHeader });
};
var parseSetCookies = (headers, setCookie) => {
  if (!headers)
    return headers;
  headers.delete("set-cookie");
  for (let i = 0;i < setCookie.length; i++) {
    let index = setCookie[i].indexOf("=");
    headers.append("set-cookie", `${setCookie[i].slice(0, index)}=${setCookie[i].slice(index + 1) || ""}`);
  }
  return headers;
};
var responseToSetHeaders = (response, set) => {
  if (set?.headers) {
    if (response) {
      if (hasHeaderShorthand)
        Object.assign(set.headers, response.headers.toJSON());
      else
        for (let [key, value] of response.headers.entries())
          if (key in set.headers)
            set.headers[key] = value;
    }
    if (set.status === 200)
      set.status = response.status;
    if (set.headers["content-encoding"])
      delete set.headers["content-encoding"];
    return set;
  }
  if (!response)
    return { headers: {}, status: set?.status ?? 200 };
  if (hasHeaderShorthand) {
    if (set = { headers: response.headers.toJSON(), status: set?.status ?? 200 }, set.headers["content-encoding"])
      delete set.headers["content-encoding"];
    return set;
  }
  set = { headers: {}, status: set?.status ?? 200 };
  for (let [key, value] of response.headers.entries()) {
    if (key === "content-encoding")
      continue;
    if (key in set.headers)
      set.headers[key] = value;
  }
  return set;
};
var allowRapidStream = env2.ELYSIA_RAPID_STREAM === "true";
var createStreamHandler = ({ mapResponse, mapCompactResponse }) => async (generator, set, request, skipFormat) => {
  let init = generator.next?.();
  if (set)
    handleSet(set);
  if (init instanceof Promise)
    init = await init;
  if (init?.value instanceof ReadableStream)
    generator = init.value;
  else if (init && (typeof init?.done > "u" || init?.done)) {
    if (set)
      return mapResponse(init.value, set, request);
    return mapCompactResponse(init.value, request);
  }
  let isSSE = !skipFormat && (init?.value?.sse ?? generator?.sse ?? set?.headers["content-type"]?.startsWith("text/event-stream")), format = isSSE ? (data) => `data: ${data}

` : (data) => data, contentType = isSSE ? "text/event-stream" : init?.value && typeof init?.value === "object" ? "application/json" : "text/plain";
  if (set?.headers) {
    if (!set.headers["transfer-encoding"])
      set.headers["transfer-encoding"] = "chunked";
    if (!set.headers["content-type"])
      set.headers["content-type"] = contentType;
    if (!set.headers["cache-control"])
      set.headers["cache-control"] = "no-cache";
  } else
    set = { status: 200, headers: { "content-type": contentType, "transfer-encoding": "chunked", "cache-control": "no-cache", connection: "keep-alive" } };
  let isBrowser = request?.headers.has("Origin");
  return new Response(new ReadableStream({ async start(controller) {
    let end = false;
    if (request?.signal?.addEventListener("abort", () => {
      end = true;
      try {
        controller.close();
      } catch {}
    }), !init || init.value instanceof ReadableStream)
      ;
    else if (init.value !== undefined && init.value !== null)
      if (init.value.toSSE)
        controller.enqueue(init.value.toSSE());
      else if (typeof init.value === "object")
        try {
          controller.enqueue(format(JSON.stringify(init.value)));
        } catch {
          controller.enqueue(format(init.value.toString()));
        }
      else
        controller.enqueue(format(init.value.toString()));
    try {
      for await (let chunk of generator) {
        if (end)
          break;
        if (chunk === undefined || chunk === null)
          continue;
        if (chunk.toSSE)
          controller.enqueue(chunk.toSSE());
        else {
          if (typeof chunk === "object")
            try {
              controller.enqueue(format(JSON.stringify(chunk)));
            } catch {
              controller.enqueue(format(chunk.toString()));
            }
          else
            controller.enqueue(format(chunk.toString()));
          if (!allowRapidStream && isBrowser && !isSSE)
            await new Promise((resolve) => setTimeout(() => resolve(), 0));
        }
      }
    } catch (error) {
      console.warn(error);
    }
    try {
      controller.close();
    } catch {}
  } }), set);
};
async function* streamResponse(response) {
  let body = response.body;
  if (!body)
    return;
  let reader = body.getReader(), decoder = new TextDecoder;
  try {
    while (true) {
      let { done, value } = await reader.read();
      if (done)
        break;
      if (typeof value === "string")
        yield value;
      else
        yield decoder.decode(value);
    }
  } finally {
    reader.releaseLock();
  }
}
var handleSet = (set) => {
  if (typeof set.status === "string")
    set.status = StatusMap[set.status];
  if (set.cookie && isNotEmpty(set.cookie)) {
    let cookie = serializeCookie(set.cookie);
    if (cookie)
      set.headers["set-cookie"] = cookie;
  }
  if (set.headers["set-cookie"] && Array.isArray(set.headers["set-cookie"]))
    set.headers = parseSetCookies(new Headers(set.headers), set.headers["set-cookie"]);
};
var createResponseHandler = (handler) => {
  let handleStream = createStreamHandler(handler);
  return (response, set, request) => {
    let isCookieSet = false;
    if (set.headers instanceof Headers) {
      for (let key of set.headers.keys())
        if (key === "set-cookie") {
          if (isCookieSet)
            continue;
          isCookieSet = true;
          for (let cookie of set.headers.getSetCookie())
            response.headers.append("set-cookie", cookie);
        } else if (!response.headers.has(key))
          response.headers.set(key, set.headers?.get(key) ?? "");
    } else
      for (let key in set.headers)
        if (key === "set-cookie")
          response.headers.append(key, set.headers[key]);
        else if (!response.headers.has(key))
          response.headers.set(key, set.headers[key]);
    let status2 = set.status ?? 200;
    if (response.status !== status2 && status2 !== 200 && (response.status <= 300 || response.status > 400)) {
      let newResponse = new Response(response.body, { headers: response.headers, status: set.status });
      if (!newResponse.headers.has("content-length") && newResponse.headers.get("transfer-encoding") === "chunked")
        return handleStream(streamResponse(newResponse), responseToSetHeaders(newResponse, set), request, true);
      return newResponse;
    }
    if (!response.headers.has("content-length") && response.headers.get("transfer-encoding") === "chunked")
      return handleStream(streamResponse(response), responseToSetHeaders(response, set), request, true);
    return response;
  };
};
async function tee(source, branches = 2) {
  let buffer = [], done = false, waiting = [];
  (async () => {
    for await (let value of source)
      buffer.push(value), waiting.forEach((w) => w.resolve()), waiting = [];
    done = true, waiting.forEach((w) => w.resolve());
  })();
  async function* makeIterator() {
    let i = 0;
    while (true)
      if (i < buffer.length)
        yield buffer[i++];
      else if (done)
        return;
      else
        await new Promise((resolve) => waiting.push({ resolve }));
  }
  return Array.from({ length: branches }, makeIterator);
}
var handleElysiaFile = (file2, set = { headers: {} }) => {
  let path = file2.path, contentType = mime[path.slice(path.lastIndexOf(".") + 1)];
  if (contentType)
    set.headers["content-type"] = contentType;
  if (file2.stats && set.status !== 206 && set.status !== 304 && set.status !== 412 && set.status !== 416)
    return file2.stats.then((stat2) => {
      let size = stat2.size;
      if (size !== undefined)
        set.headers["content-range"] = `bytes 0-${size - 1}/${size}`, set.headers["content-length"] = size;
      return handleFile(file2.value, set);
    });
  return handleFile(file2.value, set);
};
var mapResponse = (response, set, request) => {
  if (isNotEmpty(set.headers) || set.status !== 200 || set.cookie)
    switch (handleSet(set), response?.constructor?.name) {
      case "String":
        return set.headers["content-type"] = "text/plain", new Response(response, set);
      case "Array":
      case "Object":
        return set.headers["content-type"] = "application/json", new Response(JSON.stringify(response), set);
      case "ElysiaFile":
        return handleElysiaFile(response, set);
      case "File":
        return handleFile(response, set);
      case "Blob":
        return handleFile(response, set);
      case "ElysiaCustomStatusResponse":
        return set.status = response.code, mapResponse(response.response, set, request);
      case undefined:
        if (!response)
          return new Response("", set);
        return new Response(JSON.stringify(response), set);
      case "Response":
        return handleResponse(response, set, request);
      case "Error":
        return errorToResponse(response, set);
      case "Promise":
        return response.then((x) => mapResponse(x, set, request));
      case "Function":
        return mapResponse(response(), set, request);
      case "Number":
      case "Boolean":
        return new Response(response.toString(), set);
      case "Cookie":
        if (response instanceof Cookie)
          return new Response(response.value, set);
        return new Response(response?.toString(), set);
      case "FormData":
        return new Response(response, set);
      default:
        if (response instanceof Response)
          return handleResponse(response, set, request);
        if (response instanceof Promise)
          return response.then((x) => mapResponse(x, set));
        if (response instanceof Error)
          return errorToResponse(response, set);
        if (response instanceof ElysiaCustomStatusResponse)
          return set.status = response.code, mapResponse(response.response, set, request);
        if (typeof response?.next === "function" || response instanceof ReadableStream)
          return handleStream(response, set, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapResponse(x, set));
        if (typeof response?.toResponse === "function")
          return mapResponse(response.toResponse(), set);
        if ("charCodeAt" in response) {
          let code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set.headers["Content-Type"])
              set.headers["Content-Type"] = "application/json";
            return new Response(JSON.stringify(response), set);
          }
        }
        return new Response(response, set);
    }
  if (typeof response?.next === "function" || response instanceof ReadableStream)
    return handleStream(response, set, request);
  return mapCompactResponse(response, request);
};
var mapEarlyResponse = (response, set, request) => {
  if (response === undefined || response === null)
    return;
  if (isNotEmpty(set.headers) || set.status !== 200 || set.cookie)
    switch (handleSet(set), response?.constructor?.name) {
      case "String":
        return set.headers["content-type"] = "text/plain", new Response(response, set);
      case "Array":
      case "Object":
        return set.headers["content-type"] = "application/json", new Response(JSON.stringify(response), set);
      case "ElysiaFile":
        return handleElysiaFile(response, set);
      case "File":
        return handleFile(response, set);
      case "Blob":
        return handleFile(response, set);
      case "ElysiaCustomStatusResponse":
        return set.status = response.code, mapEarlyResponse(response.response, set, request);
      case undefined:
        if (!response)
          return;
        return new Response(JSON.stringify(response), set);
      case "Response":
        return handleResponse(response, set, request);
      case "Promise":
        return response.then((x) => mapEarlyResponse(x, set));
      case "Error":
        return errorToResponse(response, set);
      case "Function":
        return mapEarlyResponse(response(), set);
      case "Number":
      case "Boolean":
        return new Response(response.toString(), set);
      case "FormData":
        return new Response(response);
      case "Cookie":
        if (response instanceof Cookie)
          return new Response(response.value, set);
        return new Response(response?.toString(), set);
      default:
        if (response instanceof Response)
          return handleResponse(response, set, request);
        if (response instanceof Promise)
          return response.then((x) => mapEarlyResponse(x, set));
        if (response instanceof Error)
          return errorToResponse(response, set);
        if (response instanceof ElysiaCustomStatusResponse)
          return set.status = response.code, mapEarlyResponse(response.response, set, request);
        if (typeof response?.next === "function" || response instanceof ReadableStream)
          return handleStream(response, set, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapEarlyResponse(x, set));
        if (typeof response?.toResponse === "function")
          return mapEarlyResponse(response.toResponse(), set);
        if ("charCodeAt" in response) {
          let code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set.headers["Content-Type"])
              set.headers["Content-Type"] = "application/json";
            return new Response(JSON.stringify(response), set);
          }
        }
        return new Response(response, set);
    }
  else
    switch (response?.constructor?.name) {
      case "String":
        return set.headers["content-type"] = "text/plain", new Response(response);
      case "Array":
      case "Object":
        return set.headers["content-type"] = "application/json", new Response(JSON.stringify(response), set);
      case "ElysiaFile":
        return handleElysiaFile(response, set);
      case "File":
        return handleFile(response, set);
      case "Blob":
        return handleFile(response, set);
      case "ElysiaCustomStatusResponse":
        return set.status = response.code, mapEarlyResponse(response.response, set, request);
      case undefined:
        if (!response)
          return new Response("");
        return new Response(JSON.stringify(response), { headers: { "content-type": "application/json" } });
      case "Response":
        return response;
      case "Promise":
        return response.then((x) => {
          let r = mapEarlyResponse(x, set);
          if (r !== undefined)
            return r;
        });
      case "Error":
        return errorToResponse(response, set);
      case "Function":
        return mapCompactResponse(response(), request);
      case "Number":
      case "Boolean":
        return new Response(response.toString());
      case "Cookie":
        if (response instanceof Cookie)
          return new Response(response.value, set);
        return new Response(response?.toString(), set);
      case "FormData":
        return new Response(response);
      default:
        if (response instanceof Response)
          return response;
        if (response instanceof Promise)
          return response.then((x) => mapEarlyResponse(x, set));
        if (response instanceof Error)
          return errorToResponse(response, set);
        if (response instanceof ElysiaCustomStatusResponse)
          return set.status = response.code, mapEarlyResponse(response.response, set, request);
        if (typeof response?.next === "function" || response instanceof ReadableStream)
          return handleStream(response, set, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapEarlyResponse(x, set));
        if (typeof response?.toResponse === "function")
          return mapEarlyResponse(response.toResponse(), set);
        if ("charCodeAt" in response) {
          let code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set.headers["Content-Type"])
              set.headers["Content-Type"] = "application/json";
            return new Response(JSON.stringify(response), set);
          }
        }
        return new Response(response);
    }
};
var mapCompactResponse = (response, request) => {
  switch (response?.constructor?.name) {
    case "String":
      return new Response(response, { headers: { "Content-Type": "text/plain" } });
    case "Object":
    case "Array":
      return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
    case "ElysiaFile":
      return handleElysiaFile(response);
    case "File":
      return handleFile(response);
    case "Blob":
      return handleFile(response);
    case "ElysiaCustomStatusResponse":
      return mapResponse(response.response, { status: response.code, headers: {} });
    case undefined:
      if (!response)
        return new Response("");
      return new Response(JSON.stringify(response), { headers: { "content-type": "application/json" } });
    case "Response":
      return response;
    case "Error":
      return errorToResponse(response);
    case "Promise":
      return response.then((x) => mapCompactResponse(x, request));
    case "Function":
      return mapCompactResponse(response(), request);
    case "Number":
    case "Boolean":
      return new Response(response.toString());
    case "FormData":
      return new Response(response);
    default:
      if (response instanceof Response)
        return response;
      if (response instanceof Promise)
        return response.then((x) => mapCompactResponse(x, request));
      if (response instanceof Error)
        return errorToResponse(response);
      if (response instanceof ElysiaCustomStatusResponse)
        return mapResponse(response.response, { status: response.code, headers: {} });
      if (typeof response?.next === "function" || response instanceof ReadableStream)
        return handleStream(response, undefined, request);
      if (typeof response?.then === "function")
        return response.then((x) => mapCompactResponse(x, request));
      if (typeof response?.toResponse === "function")
        return mapCompactResponse(response.toResponse());
      if ("charCodeAt" in response) {
        let code = response.charCodeAt(0);
        if (code === 123 || code === 91)
          return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
      }
      return new Response(response);
  }
};
var errorToResponse = (error, set) => {
  if (typeof error?.toResponse === "function") {
    let raw = error.toResponse(), targetSet = set ?? { headers: {}, status: 200, redirect: "" }, apply = (resolved) => {
      if (resolved instanceof Response)
        targetSet.status = resolved.status;
      return mapResponse(resolved, targetSet);
    };
    return typeof raw?.then === "function" ? raw.then(apply) : apply(raw);
  }
  return new Response(JSON.stringify({ name: error?.name, message: error?.message, cause: error?.cause }), { status: set?.status !== 200 ? set?.status ?? 500 : 500, headers: set?.headers });
};
var createStaticHandler = (handle, hooks, setHeaders = {}) => {
  if (typeof handle === "function")
    return;
  let response = mapResponse(handle, { headers: setHeaders });
  if (!hooks.parse?.length && !hooks.transform?.length && !hooks.beforeHandle?.length && !hooks.afterHandle?.length)
    return () => response.clone();
};
var handleResponse = createResponseHandler({ mapResponse, mapCompactResponse });
var handleStream = createStreamHandler({ mapResponse, mapCompactResponse });
var WebStandardAdapter = { name: "web-standard", isWebStandard: true, handler: { mapResponse, mapEarlyResponse, mapCompactResponse, createStaticHandler }, composeHandler: { mapResponseContext: "c.request", preferWebstandardHeaders: true, headers: `c.headers={}
for(const [k,v] of c.request.headers.entries())c.headers[k]=v
`, parser: { json(isOptional) {
  if (isOptional)
    return `try{c.body=await c.request.json()}catch{}
`;
  return `c.body=await c.request.json()
`;
}, text() {
  return `c.body=await c.request.text()
`;
}, urlencoded() {
  return `c.body=parseQuery(await c.request.text())
`;
}, arrayBuffer() {
  return `c.body=await c.request.arrayBuffer()
`;
}, formData(isOptional) {
  let fnLiteral = `
c.body={}
`;
  if (isOptional)
    fnLiteral += "let form;try{form=await c.request.formData()}catch{}";
  else
    fnLiteral += `const form=await c.request.formData()
`;
  return fnLiteral + `for(const key of form.keys()){if(c.body[key]) continue
const value=form.getAll(key)
if(value.length===1)c.body[key]=value[0]
else c.body[key]=value}`;
} } }, async stop(app, closeActiveConnections) {
  if (!app.server)
    throw Error("Elysia isn't running. Call `app.listen` to start the server.");
  if (app.server) {
    if (await app.server.stop(closeActiveConnections), app.server = null, app.event.stop?.length)
      for (let i = 0;i < app.event.stop.length; i++)
        app.event.stop[i].fn(app);
  }
}, composeGeneralHandler: { parameters: "r", createContext(app) {
  let decoratorsLiteral = "", fnLiteral = "", defaultHeaders = app.setHeaders;
  for (let key of Object.keys(app.decorator))
    decoratorsLiteral += `,'${key}':decorator['${key}']`;
  let standardHostname = app.config.handler?.standardHostname ?? true, hasTrace = !!app.event.trace?.length;
  if (fnLiteral += `const u=r.url,s=u.indexOf('/',${standardHostname ? 11 : 7}),qi=u.indexOf('?',s+1),p=u.substring(s,qi===-1?undefined:qi)
`, hasTrace)
    fnLiteral += `const id=randomId()
`;
  if (fnLiteral += "const c={request:r,store,qi,path:p,url:u,redirect,status,set:{headers:", fnLiteral += Object.keys(defaultHeaders ?? {}).length ? "Object.assign({},app.setHeaders)" : "Object.create(null)", fnLiteral += ",status:200}", app.inference.server)
    fnLiteral += ",get server(){return app.getServer()}";
  if (hasTrace)
    fnLiteral += ",[ELYSIA_REQUEST_ID]:id";
  return fnLiteral += decoratorsLiteral, fnLiteral += `}
`, fnLiteral;
}, error404(hasEventHook, hasErrorHook, afterHandle = "") {
  let findDynamicRoute = "if(route===null){" + afterHandle + (hasErrorHook ? "" : "c.set.status=404") + `
return `;
  if (hasErrorHook)
    findDynamicRoute += `app.handleError(c,notFound,false,${this.parameters})`;
  else
    findDynamicRoute += hasEventHook ? "c.response=c.responseValue=new Response(error404Message,{status:c.set.status===200?404:c.set.status,headers:c.set.headers})" : "c.response=c.responseValue=error404.clone()";
  return findDynamicRoute += "}", { declare: hasErrorHook ? "" : `const error404Message=notFound.message.toString()
const error404=new Response(error404Message,{status:404})
`, code: findDynamicRoute };
} }, composeError: { mapResponseContext: "", validationError: "set.headers['content-type']='application/json';return mapResponse(error.message,set)", unknownError: "set.status=error.status??set.status??500;return mapResponse(error.message,set)" }, listen() {
  return () => {
    throw Error("WebStandard does not support listen, you might want to export default Elysia.fetch instead");
  };
} };
var import_fast_decode_uri_component3 = __toESM2(require_fast_decode_uri_component(), 1);
var import_fast_decode_uri_component2 = __toESM2(require_fast_decode_uri_component(), 1);
var KEY_HAS_PLUS = 1;
var KEY_NEEDS_DECODE = 2;
var VALUE_HAS_PLUS = 4;
var VALUE_NEEDS_DECODE = 8;
function parseQueryFromURL(input, startIndex = 0, array, object) {
  let result = Object.create(null), flags = 0, inputLength = input.length, startingIndex = startIndex - 1, equalityIndex = startingIndex;
  for (let i = 0;i < inputLength; i++)
    switch (input.charCodeAt(i)) {
      case 38:
        processKeyValuePair(input, i), startingIndex = i, equalityIndex = i, flags = 0;
        break;
      case 61:
        if (equalityIndex <= startingIndex)
          equalityIndex = i;
        else
          flags |= VALUE_NEEDS_DECODE;
        break;
      case 43:
        if (equalityIndex > startingIndex)
          flags |= VALUE_HAS_PLUS;
        else
          flags |= KEY_HAS_PLUS;
        break;
      case 37:
        if (equalityIndex > startingIndex)
          flags |= VALUE_NEEDS_DECODE;
        else
          flags |= KEY_NEEDS_DECODE;
        break;
    }
  if (startingIndex < inputLength)
    processKeyValuePair(input, inputLength);
  return result;
  function processKeyValuePair(input2, endIndex) {
    let hasBothKeyValuePair = equalityIndex > startingIndex, effectiveEqualityIndex = hasBothKeyValuePair ? equalityIndex : endIndex, keySlice = input2.slice(startingIndex + 1, effectiveEqualityIndex);
    if (!hasBothKeyValuePair && keySlice.length === 0)
      return;
    let finalKey = keySlice;
    if (flags & KEY_HAS_PLUS)
      finalKey = finalKey.replace(/\+/g, " ");
    if (flags & KEY_NEEDS_DECODE)
      finalKey = import_fast_decode_uri_component2.default(finalKey) || finalKey;
    let finalValue = "";
    if (hasBothKeyValuePair) {
      let valueSlice = input2.slice(equalityIndex + 1, endIndex);
      if (flags & VALUE_HAS_PLUS)
        valueSlice = valueSlice.replace(/\+/g, " ");
      if (flags & VALUE_NEEDS_DECODE)
        valueSlice = import_fast_decode_uri_component2.default(valueSlice) || valueSlice;
      finalValue = valueSlice;
    }
    let currentValue = result[finalKey];
    if (array && array?.[finalKey])
      if (finalValue.charCodeAt(0) === 91) {
        if (object && object?.[finalKey])
          finalValue = JSON.parse(finalValue);
        else
          finalValue = finalValue.slice(1, -1).split(",");
        if (currentValue === undefined)
          result[finalKey] = finalValue;
        else if (Array.isArray(currentValue))
          currentValue.push(...finalValue);
        else
          result[finalKey] = finalValue, result[finalKey].unshift(currentValue);
      } else if (currentValue === undefined)
        result[finalKey] = finalValue;
      else if (Array.isArray(currentValue))
        currentValue.push(finalValue);
      else
        result[finalKey] = [currentValue, finalValue];
    else
      result[finalKey] = finalValue;
  }
}
function parseQueryStandardSchema(input, startIndex = 0) {
  let result = Object.create(null), flags = 0, inputLength = input.length, startingIndex = startIndex - 1, equalityIndex = startingIndex;
  for (let i = 0;i < inputLength; i++)
    switch (input.charCodeAt(i)) {
      case 38:
        processKeyValuePair(input, i), startingIndex = i, equalityIndex = i, flags = 0;
        break;
      case 61:
        if (equalityIndex <= startingIndex)
          equalityIndex = i;
        else
          flags |= VALUE_NEEDS_DECODE;
        break;
      case 43:
        if (equalityIndex > startingIndex)
          flags |= VALUE_HAS_PLUS;
        else
          flags |= KEY_HAS_PLUS;
        break;
      case 37:
        if (equalityIndex > startingIndex)
          flags |= VALUE_NEEDS_DECODE;
        else
          flags |= KEY_NEEDS_DECODE;
        break;
    }
  if (startingIndex < inputLength)
    processKeyValuePair(input, inputLength);
  return result;
  function processKeyValuePair(input2, endIndex) {
    let hasBothKeyValuePair = equalityIndex > startingIndex, effectiveEqualityIndex = hasBothKeyValuePair ? equalityIndex : endIndex, keySlice = input2.slice(startingIndex + 1, effectiveEqualityIndex);
    if (!hasBothKeyValuePair && keySlice.length === 0)
      return;
    let finalKey = keySlice;
    if (flags & KEY_HAS_PLUS)
      finalKey = finalKey.replace(/\+/g, " ");
    if (flags & KEY_NEEDS_DECODE)
      finalKey = import_fast_decode_uri_component2.default(finalKey) || finalKey;
    let finalValue = "";
    if (hasBothKeyValuePair) {
      let valueSlice = input2.slice(equalityIndex + 1, endIndex);
      if (flags & VALUE_HAS_PLUS)
        valueSlice = valueSlice.replace(/\+/g, " ");
      if (flags & VALUE_NEEDS_DECODE)
        valueSlice = import_fast_decode_uri_component2.default(valueSlice) || valueSlice;
      finalValue = valueSlice;
    }
    let currentValue = result[finalKey];
    if (finalValue.charCodeAt(0) === 91 && finalValue.charCodeAt(finalValue.length - 1) === 93) {
      try {
        finalValue = JSON.parse(finalValue);
      } catch {}
      if (currentValue === undefined)
        result[finalKey] = finalValue;
      else if (Array.isArray(currentValue))
        currentValue.push(finalValue);
      else
        result[finalKey] = [currentValue, finalValue];
    } else if (finalValue.charCodeAt(0) === 123 && finalValue.charCodeAt(finalValue.length - 1) === 125) {
      try {
        finalValue = JSON.parse(finalValue);
      } catch {}
      if (currentValue === undefined)
        result[finalKey] = finalValue;
      else if (Array.isArray(currentValue))
        currentValue.push(finalValue);
      else
        result[finalKey] = [currentValue, finalValue];
    } else {
      if (finalValue.includes(","))
        finalValue = finalValue.split(",");
      if (currentValue === undefined)
        result[finalKey] = finalValue;
      else if (Array.isArray(currentValue))
        currentValue.push(finalValue);
      else
        result[finalKey] = [currentValue, finalValue];
    }
  }
}
function parseQuery(input) {
  let result = Object.create(null), flags = 0, inputLength = input.length, startingIndex = -1, equalityIndex = -1;
  for (let i = 0;i < inputLength; i++)
    switch (input.charCodeAt(i)) {
      case 38:
        processKeyValuePair(input, i), startingIndex = i, equalityIndex = i, flags = 0;
        break;
      case 61:
        if (equalityIndex <= startingIndex)
          equalityIndex = i;
        else
          flags |= VALUE_NEEDS_DECODE;
        break;
      case 43:
        if (equalityIndex > startingIndex)
          flags |= VALUE_HAS_PLUS;
        else
          flags |= KEY_HAS_PLUS;
        break;
      case 37:
        if (equalityIndex > startingIndex)
          flags |= VALUE_NEEDS_DECODE;
        else
          flags |= KEY_NEEDS_DECODE;
        break;
    }
  if (startingIndex < inputLength)
    processKeyValuePair(input, inputLength);
  return result;
  function processKeyValuePair(input2, endIndex) {
    let hasBothKeyValuePair = equalityIndex > startingIndex, effectiveEqualityIndex = hasBothKeyValuePair ? equalityIndex : endIndex, keySlice = input2.slice(startingIndex + 1, effectiveEqualityIndex);
    if (!hasBothKeyValuePair && keySlice.length === 0)
      return;
    let finalKey = keySlice;
    if (flags & KEY_HAS_PLUS)
      finalKey = finalKey.replace(/\+/g, " ");
    if (flags & KEY_NEEDS_DECODE)
      finalKey = import_fast_decode_uri_component2.default(finalKey) || finalKey;
    let finalValue = "";
    if (hasBothKeyValuePair) {
      let valueSlice = input2.slice(equalityIndex + 1, endIndex);
      if (flags & VALUE_HAS_PLUS)
        valueSlice = valueSlice.replace(/\+/g, " ");
      if (flags & VALUE_NEEDS_DECODE)
        valueSlice = import_fast_decode_uri_component2.default(valueSlice) || valueSlice;
      finalValue = valueSlice;
    }
    let currentValue = result[finalKey];
    if (currentValue === undefined)
      result[finalKey] = finalValue;
    else if (Array.isArray(currentValue))
      currentValue.push(finalValue);
    else
      result[finalKey] = [currentValue, finalValue];
  }
}
var ELYSIA_TRACE = Symbol("ElysiaTrace");
var createProcess = () => {
  let { promise, resolve } = Promise.withResolvers(), { promise: end, resolve: resolveEnd } = Promise.withResolvers(), { promise: error, resolve: resolveError } = Promise.withResolvers(), callbacks = [], callbacksEnd = [];
  return [(callback) => {
    if (callback)
      callbacks.push(callback);
    return promise;
  }, (process2) => {
    let processes = [], resolvers = [], groupError = null;
    for (let i = 0;i < (process2.total ?? 0); i++) {
      let { promise: promise2, resolve: resolve2 } = Promise.withResolvers(), { promise: end2, resolve: resolveEnd2 } = Promise.withResolvers(), { promise: error2, resolve: resolveError2 } = Promise.withResolvers(), callbacks2 = [], callbacksEnd2 = [];
      processes.push((callback) => {
        if (callback)
          callbacks2.push(callback);
        return promise2;
      }), resolvers.push((process3) => {
        let result2 = { ...process3, end: end2, error: error2, index: i, onStop(callback) {
          if (callback)
            callbacksEnd2.push(callback);
          return end2;
        } };
        resolve2(result2);
        for (let i2 = 0;i2 < callbacks2.length; i2++)
          callbacks2[i2](result2);
        return (error3 = null) => {
          let end3 = performance.now();
          if (error3)
            groupError = error3;
          let detail = { end: end3, error: error3, get elapsed() {
            return end3 - process3.begin;
          } };
          for (let i2 = 0;i2 < callbacksEnd2.length; i2++)
            callbacksEnd2[i2](detail);
          resolveEnd2(end3), resolveError2(error3);
        };
      });
    }
    let result = { ...process2, end, error, onEvent(callback) {
      for (let i = 0;i < processes.length; i++)
        processes[i](callback);
    }, onStop(callback) {
      if (callback)
        callbacksEnd.push(callback);
      return end;
    } };
    resolve(result);
    for (let i = 0;i < callbacks.length; i++)
      callbacks[i](result);
    return { resolveChild: resolvers, resolve(error2 = null) {
      let end2 = performance.now();
      if (!error2 && groupError)
        error2 = groupError;
      let detail = { end: end2, error: error2, get elapsed() {
        return end2 - process2.begin;
      } };
      for (let i = 0;i < callbacksEnd.length; i++)
        callbacksEnd[i](detail);
      resolveEnd(end2), resolveError(error2);
    } };
  }];
};
var createTracer = (traceListener) => {
  return (context) => {
    let [onRequest, resolveRequest] = createProcess(), [onParse, resolveParse] = createProcess(), [onTransform, resolveTransform] = createProcess(), [onBeforeHandle, resolveBeforeHandle] = createProcess(), [onHandle, resolveHandle] = createProcess(), [onAfterHandle, resolveAfterHandle] = createProcess(), [onError, resolveError] = createProcess(), [onMapResponse, resolveMapResponse] = createProcess(), [onAfterResponse, resolveAfterResponse] = createProcess();
    return traceListener({ id: context[ELYSIA_REQUEST_ID], context, set: context.set, onRequest, onParse, onTransform, onBeforeHandle, onHandle, onAfterHandle, onMapResponse, onAfterResponse, onError, time: Date.now(), store: context.store }), { request: resolveRequest, parse: resolveParse, transform: resolveTransform, beforeHandle: resolveBeforeHandle, handle: resolveHandle, afterHandle: resolveAfterHandle, error: resolveError, mapResponse: resolveMapResponse, afterResponse: resolveAfterResponse };
  };
};
var Kind3 = Symbol.for("TypeBox.Kind");
var Hint2 = Symbol.for("TypeBox.Hint");
var isSpecialProperty = (name) => /(\ |-|\t|\n|\.|\[|\]|\{|\})/.test(name) || !isNaN(+name[0]);
var joinProperty = (v1, v2, isOptional = false) => {
  if (typeof v2 === "number")
    return `${v1}[${v2}]`;
  if (isSpecialProperty(v2))
    return `${v1}${isOptional ? "?." : ""}["${v2}"]`;
  return `${v1}${isOptional ? "?" : ""}.${v2}`;
};
var encodeProperty = (v) => isSpecialProperty(v) ? `"${v}"` : v;
var sanitize = (key, sanitize2 = 0, schema) => {
  if (schema.type !== "string" || schema.const || schema.trusted)
    return key;
  let hof = "";
  for (let i = sanitize2 - 1;i >= 0; i--)
    hof += `d.h${i}(`;
  return hof + key + ")".repeat(sanitize2);
};
var mergeObjectIntersection = (schema) => {
  if (!schema.allOf || Kind3 in schema && (schema[Kind3] !== "Intersect" || schema.type !== "object"))
    return schema;
  let { allOf, ...newSchema } = schema;
  if (newSchema.properties = {}, Kind3 in newSchema)
    newSchema[Kind3] = "Object";
  for (let type of allOf) {
    if (type.type !== "object")
      continue;
    let { properties, required, type: _2, [Kind3]: __, ...rest } = type;
    if (required)
      newSchema.required = newSchema.required ? newSchema.required.concat(required) : required;
    Object.assign(newSchema, rest);
    for (let property in type.properties)
      newSchema.properties[property] = mergeObjectIntersection(type.properties[property]);
  }
  return newSchema;
};
var handleRecord = (schema, property, instruction) => {
  let child = schema.patternProperties["^(.*)$"] ?? schema.patternProperties[Object.keys(schema.patternProperties)[0]];
  if (!child)
    return property;
  let i = instruction.array;
  instruction.array++;
  let v = `(()=>{const ar${i}s=Object.keys(${property}),ar${i}v={};for(let i=0;i<ar${i}s.length;i++){const ar${i}p=${property}[ar${i}s[i]];ar${i}v[ar${i}s[i]]=${mirror(child, `ar${i}p`, instruction)}`, optionals = instruction.optionalsInArray[i + 1];
  if (optionals) {
    for (let oi = 0;oi < optionals.length; oi++) {
      let target = `ar${i}v[ar${i}s[i]]${optionals[oi]}`;
      v += `;if(${target}===undefined)delete ${target}`;
    }
    instruction.optionalsInArray[i + 1] = [];
  }
  return v += `}return ar${i}v})()`, v;
};
var handleTuple = (schema, property, instruction) => {
  let i = instruction.array;
  instruction.array++;
  let isRoot = property === "v" && !instruction.unions.length, v = "";
  if (!isRoot)
    v = "(()=>{";
  v += `const ar${i}v=[`;
  for (let i2 = 0;i2 < schema.length; i2++) {
    if (i2 !== 0)
      v += ",";
    v += mirror(schema[i2], joinProperty(property, i2, instruction.parentIsOptional), instruction);
  }
  if (v += "];", !isRoot)
    v += `return ar${i}v})()`;
  return v;
};
function deepClone(source, weak = new WeakMap) {
  if (source === null || typeof source !== "object" || typeof source === "function")
    return source;
  if (weak.has(source))
    return weak.get(source);
  if (Array.isArray(source)) {
    let copy = Array(source.length);
    weak.set(source, copy);
    for (let i = 0;i < source.length; i++)
      copy[i] = deepClone(source[i], weak);
    return copy;
  }
  if (typeof source === "object") {
    let keys = Object.keys(source).concat(Object.getOwnPropertySymbols(source)), cloned = {};
    for (let key of keys)
      cloned[key] = deepClone(source[key], weak);
    return cloned;
  }
  return source;
}
var handleUnion = (schemas, property, instruction) => {
  if (instruction.TypeCompiler === undefined) {
    if (!instruction.typeCompilerWanred)
      console.warn(Error("[exact-mirror] TypeBox's TypeCompiler is required to use Union")), instruction.typeCompilerWanred = true;
    return property;
  }
  instruction.unionKeys[property] = 1;
  let ui = instruction.unions.length, typeChecks = instruction.unions[ui] = [], v = `(()=>{
`, unwrapRef = (type) => {
    if (!(Kind3 in type) || !type.$ref)
      return type;
    if (type[Kind3] === "This")
      return deepClone(instruction.definitions[type.$ref]);
    else if (type[Kind3] === "Ref")
      if (!instruction.modules)
        console.warn(Error("[exact-mirror] modules is required when using nested cyclic reference"));
      else
        return instruction.modules.Import(type.$ref);
    return type;
  }, cleanThenCheck = "";
  for (let i = 0;i < schemas.length; i++) {
    let type = unwrapRef(schemas[i]);
    if (Array.isArray(type.anyOf))
      for (let i2 = 0;i2 < type.anyOf.length; i2++)
        type.anyOf[i2] = unwrapRef(type.anyOf[i2]);
    else if (type.items)
      if (Array.isArray(type.items))
        for (let i2 = 0;i2 < type.items.length; i2++)
          type.items[i2] = unwrapRef(type.items[i2]);
      else
        type.items = unwrapRef(type.items);
    typeChecks.push(TypeCompiler.Compile(type)), v += `if(d.unions[${ui}][${i}].Check(${property})){return ${mirror(type, property, { ...instruction, recursion: instruction.recursion + 1, parentIsOptional: true })}}
`, cleanThenCheck += (i ? "" : "let ") + "tmp=" + mirror(type, property, { ...instruction, recursion: instruction.recursion + 1, parentIsOptional: true }) + `
if(d.unions[${ui}][${i}].Check(tmp))return tmp
`;
  }
  if (cleanThenCheck)
    v += cleanThenCheck;
  return v += `return ${instruction.removeUnknownUnionType ? "undefined" : property}`, v + "})()";
};
var mirror = (schema, property, instruction) => {
  if (!schema)
    return "";
  let isRoot = property === "v" && !instruction.unions.length;
  if (Kind3 in schema && schema[Kind3] === "Import" && schema.$ref in schema.$defs)
    return mirror(schema.$defs[schema.$ref], property, { ...instruction, definitions: Object.assign(instruction.definitions, schema.$defs) });
  if (isRoot && schema.type !== "object" && schema.type !== "array" && !schema.anyOf)
    return `return ${sanitize("v", instruction.sanitize?.length, schema)}`;
  if (instruction.recursion >= instruction.recursionLimit)
    return property;
  let v = "";
  if (schema.$id && Hint2 in schema)
    instruction.definitions[schema.$id] = schema;
  switch (schema.type) {
    case "object":
      if (schema[Kind3] === "Record") {
        v = handleRecord(schema, property, instruction);
        break;
      }
      if (schema = mergeObjectIntersection(schema), v += "{", schema.additionalProperties)
        v += `...${property},`;
      let keys = Object.keys(schema.properties);
      for (let i2 = 0;i2 < keys.length; i2++) {
        let key = keys[i2], isOptional = !schema.required || schema.required && !schema.required.includes(key) || Array.isArray(schema.properties[key].anyOf), name = joinProperty(property, key, instruction.parentIsOptional);
        if (isOptional) {
          let index = instruction.array;
          if (property.startsWith("ar")) {
            let dotIndex = name.indexOf("."), refName;
            if (dotIndex >= 0)
              refName = name.slice(dotIndex);
            else
              refName = name.slice(property.length);
            if (refName.startsWith("?."))
              if (refName.charAt(2) === "[")
                refName = refName.slice(2);
              else
                refName = refName.slice(1);
            let array = instruction.optionalsInArray;
            if (array[index])
              array[index].push(refName);
            else
              array[index] = [refName];
          } else
            instruction.optionals.push(name);
        }
        let child = schema.properties[key];
        if (i2 !== 0)
          v += ",";
        v += `${encodeProperty(key)}:${isOptional ? `${name}===undefined?undefined:` : ""}${mirror(child, name, { ...instruction, recursion: instruction.recursion + 1, parentIsOptional: isOptional })}`;
      }
      v += "}";
      break;
    case "array":
      if (schema.items.type !== "object" && schema.items.type !== "array") {
        if (Array.isArray(schema.items)) {
          v = handleTuple(schema.items, property, instruction);
          break;
        } else if (isRoot && !Array.isArray(schema.items.anyOf))
          return "return v";
        else if (Kind3 in schema.items && schema.items.$ref && (schema.items[Kind3] === "Ref" || schema.items[Kind3] === "This"))
          v = mirror(deepClone(instruction.definitions[schema.items.$ref]), property, { ...instruction, parentIsOptional: true, recursion: instruction.recursion + 1 });
        else if (!Array.isArray(schema.items.anyOf)) {
          v = property;
          break;
        }
      }
      let i = instruction.array;
      instruction.array++;
      let reference = property;
      if (isRoot)
        v = `const ar${i}v=new Array(${property}.length);`;
      else
        reference = `ar${i}s`, v = `((${reference})=>{const ar${i}v=new Array(${reference}.length);`;
      v += `for(let i=0;i<${reference}.length;i++){const ar${i}p=${reference}[i];ar${i}v[i]=${mirror(schema.items, `ar${i}p`, instruction)}`;
      let optionals = instruction.optionalsInArray[i + 1];
      if (optionals) {
        for (let oi = 0;oi < optionals.length; oi++) {
          let target = `ar${i}v[i]${optionals[oi]}`;
          v += `;if(${target}===undefined)delete ${target}`;
        }
        instruction.optionalsInArray[i + 1] = [];
      }
      if (v += "}", !isRoot)
        v += `return ar${i}v})(${property})`;
      break;
    default:
      if (schema.$ref && schema.$ref in instruction.definitions)
        return mirror(instruction.definitions[schema.$ref], property, instruction);
      if (Array.isArray(schema.anyOf)) {
        v = handleUnion(schema.anyOf, property, instruction);
        break;
      }
      v = sanitize(property, instruction.sanitize?.length, schema);
      break;
  }
  if (!isRoot)
    return v;
  if (schema.type === "array")
    v = `${v}const x=ar0v;`;
  else
    v = `const x=${v}
`;
  for (let i = 0;i < instruction.optionals.length; i++) {
    let key = instruction.optionals[i], prop = key.slice(1);
    if (v += `if(${key}===undefined`, instruction.unionKeys[key])
      v += `||x${prop}===undefined`;
    let shouldQuestion = prop.charCodeAt(0) !== 63 && schema.type !== "array";
    v += `)delete x${shouldQuestion ? prop.charCodeAt(0) === 91 ? "?." : "?" : ""}${prop}
`;
  }
  return `${v}return x`;
};
var createMirror = (schema, { TypeCompiler: TypeCompiler22, modules, definitions, sanitize: sanitize2, recursionLimit = 8, removeUnknownUnionType = false } = {}) => {
  let unions = [];
  if (typeof sanitize2 === "function")
    sanitize2 = [sanitize2];
  let f = mirror(schema, "v", { optionals: [], optionalsInArray: [], array: 0, parentIsOptional: false, unions, unionKeys: {}, TypeCompiler: TypeCompiler22, modules, definitions: definitions ?? modules?.$defs ?? {}, sanitize: sanitize2, recursion: 0, recursionLimit, removeUnknownUnionType });
  if (!unions.length && !sanitize2?.length)
    return Function("v", f);
  let hof;
  if (sanitize2?.length) {
    hof = {};
    for (let i = 0;i < sanitize2.length; i++)
      hof[`h${i}`] = sanitize2[i];
  }
  return Function("d", `return function mirror(v){${f}}`)({ unions, ...hof });
};
var replaceSchemaTypeFromManyOptions = (schema, options) => {
  if (Array.isArray(options)) {
    let result = schema;
    for (let option of options)
      result = replaceSchemaTypeFromOption(result, option);
    return result;
  }
  return replaceSchemaTypeFromOption(schema, options);
};
var replaceSchemaTypeFromOption = (schema, option) => {
  if (option.rootOnly && option.excludeRoot)
    throw Error("Can't set both rootOnly and excludeRoot");
  if (option.rootOnly && option.onlyFirst)
    throw Error("Can't set both rootOnly and onlyFirst");
  if (option.rootOnly && option.untilObjectFound)
    throw Error("Can't set both rootOnly and untilObjectFound");
  let walk = ({ s, isRoot, treeLvl }) => {
    if (!s)
      return s;
    let skipRoot = isRoot && option.excludeRoot, fromKind = option.from[Kind];
    if (s.elysiaMeta) {
      if (option.from.elysiaMeta === s.elysiaMeta && !skipRoot)
        return option.to(s);
      return s;
    }
    let shouldTransform = fromKind && s[Kind] === fromKind;
    if (!skipRoot && option.onlyFirst && s.type === option.onlyFirst) {
      if (shouldTransform)
        return option.to(s);
      return s;
    }
    if (isRoot && option.rootOnly) {
      if (shouldTransform)
        return option.to(s);
      return s;
    }
    if (!isRoot && option.untilObjectFound && s.type === "object")
      return s;
    let newWalkInput = { isRoot: false, treeLvl: treeLvl + 1 }, withTransformedChildren = { ...s };
    if (s.oneOf)
      withTransformedChildren.oneOf = s.oneOf.map((x) => walk({ ...newWalkInput, s: x }));
    if (s.anyOf)
      withTransformedChildren.anyOf = s.anyOf.map((x) => walk({ ...newWalkInput, s: x }));
    if (s.allOf)
      withTransformedChildren.allOf = s.allOf.map((x) => walk({ ...newWalkInput, s: x }));
    if (s.not)
      withTransformedChildren.not = walk({ ...newWalkInput, s: s.not });
    if (s.properties) {
      withTransformedChildren.properties = {};
      for (let [k2, v] of Object.entries(s.properties))
        withTransformedChildren.properties[k2] = walk({ ...newWalkInput, s: v });
    }
    if (s.items) {
      let items = s.items;
      withTransformedChildren.items = Array.isArray(items) ? items.map((x) => walk({ ...newWalkInput, s: x })) : walk({ ...newWalkInput, s: items });
    }
    if (!skipRoot && fromKind && withTransformedChildren[Kind] === fromKind)
      return option.to(withTransformedChildren);
    return withTransformedChildren;
  };
  return walk({ s: schema, isRoot: true, treeLvl: 0 });
};
var _stringToStructureCoercions;
var stringToStructureCoercions = () => {
  if (!_stringToStructureCoercions)
    _stringToStructureCoercions = [{ from: t.Object({}), to: (schema) => t.ObjectString(schema.properties || {}, schema), excludeRoot: true }, { from: t.Array(t.Any()), to: (schema) => t.ArrayString(schema.items || t.Any(), schema) }];
  return _stringToStructureCoercions;
};
var _queryCoercions;
var queryCoercions = () => {
  if (!_queryCoercions)
    _queryCoercions = [{ from: t.Object({}), to: (schema) => t.ObjectString(schema.properties ?? {}, schema), excludeRoot: true }, { from: t.Array(t.Any()), to: (schema) => t.ArrayQuery(schema.items ?? t.Any(), schema) }];
  return _queryCoercions;
};
var _coercePrimitiveRoot;
var coercePrimitiveRoot = () => {
  if (!_coercePrimitiveRoot)
    _coercePrimitiveRoot = [{ from: t.Number(), to: (schema) => t.Numeric(schema), rootOnly: true }, { from: t.Boolean(), to: (schema) => t.BooleanString(schema), rootOnly: true }];
  return _coercePrimitiveRoot;
};
var _coerceFormData;
var coerceFormData = () => {
  if (!_coerceFormData)
    _coerceFormData = [{ from: t.Object({}), to: (schema) => t.ObjectString(schema.properties ?? {}, schema), onlyFirst: "object", excludeRoot: true }, { from: t.Array(t.Any()), to: (schema) => t.ArrayString(schema.items ?? t.Any(), schema), onlyFirst: "array", excludeRoot: true }];
  return _coerceFormData;
};
var isOptional = (schema) => {
  if (!schema)
    return false;
  if (schema?.[Kind] === "Import" && schema.References)
    return schema.References().some(isOptional);
  if (schema.schema)
    schema = schema.schema;
  return !!schema && OptionalKind in schema;
};
var hasAdditionalProperties = (_schema) => {
  if (!_schema)
    return false;
  let schema = _schema?.schema ?? _schema;
  if (schema[Kind] === "Import" && _schema.References)
    return _schema.References().some(hasAdditionalProperties);
  if (schema.anyOf)
    return schema.anyOf.some(hasAdditionalProperties);
  if (schema.someOf)
    return schema.someOf.some(hasAdditionalProperties);
  if (schema.allOf)
    return schema.allOf.some(hasAdditionalProperties);
  if (schema.not)
    return schema.not.some(hasAdditionalProperties);
  if (schema.type === "object") {
    let properties = schema.properties;
    if ("additionalProperties" in schema)
      return schema.additionalProperties;
    if ("patternProperties" in schema)
      return false;
    for (let key of Object.keys(properties)) {
      let property = properties[key];
      if (property.type === "object") {
        if (hasAdditionalProperties(property))
          return true;
      } else if (property.anyOf) {
        for (let i = 0;i < property.anyOf.length; i++)
          if (hasAdditionalProperties(property.anyOf[i]))
            return true;
      }
      return property.additionalProperties;
    }
    return false;
  }
  if (schema.type === "array" && schema.items && !Array.isArray(schema.items))
    return hasAdditionalProperties(schema.items);
  return false;
};
var resolveSchema = (schema, models, modules) => {
  if (!schema)
    return;
  if (typeof schema !== "string")
    return schema;
  if (modules && schema in modules.$defs)
    return modules.Import(schema);
  return models?.[schema];
};
var hasType = (type, schema) => {
  if (!schema)
    return false;
  if (Kind in schema && schema[Kind] === type)
    return true;
  if (Kind in schema && schema[Kind] === "Import") {
    if (schema.$defs && schema.$ref) {
      let ref = schema.$ref.replace("#/$defs/", "");
      if (schema.$defs[ref])
        return hasType(type, schema.$defs[ref]);
    }
  }
  if (schema.anyOf)
    return schema.anyOf.some((s) => hasType(type, s));
  if (schema.oneOf)
    return schema.oneOf.some((s) => hasType(type, s));
  if (schema.allOf)
    return schema.allOf.some((s) => hasType(type, s));
  if (schema.type === "array" && schema.items) {
    if (type === "Files" && Kind in schema.items && schema.items[Kind] === "File")
      return true;
    return hasType(type, schema.items);
  }
  if (schema.type === "object") {
    let properties = schema.properties;
    if (!properties)
      return false;
    for (let key of Object.keys(properties))
      if (hasType(type, properties[key]))
        return true;
  }
  return false;
};
var hasElysiaMeta = (meta, _schema) => {
  if (!_schema)
    return false;
  let schema = _schema?.schema ?? _schema;
  if (schema.elysiaMeta === meta)
    return true;
  if (schema[Kind] === "Import" && _schema.References)
    return _schema.References().some((schema2) => hasElysiaMeta(meta, schema2));
  if (schema.anyOf)
    return schema.anyOf.some((schema2) => hasElysiaMeta(meta, schema2));
  if (schema.someOf)
    return schema.someOf.some((schema2) => hasElysiaMeta(meta, schema2));
  if (schema.allOf)
    return schema.allOf.some((schema2) => hasElysiaMeta(meta, schema2));
  if (schema.not)
    return schema.not.some((schema2) => hasElysiaMeta(meta, schema2));
  if (schema.type === "object") {
    let properties = schema.properties;
    if (!properties)
      return false;
    for (let key of Object.keys(properties)) {
      let property = properties[key];
      if (property.type === "object") {
        if (hasElysiaMeta(meta, property))
          return true;
      } else if (property.anyOf) {
        for (let i = 0;i < property.anyOf.length; i++)
          if (hasElysiaMeta(meta, property.anyOf[i]))
            return true;
      }
      return schema.elysiaMeta === meta;
    }
    return false;
  }
  if (schema.type === "array" && schema.items && !Array.isArray(schema.items))
    return hasElysiaMeta(meta, schema.items);
  return false;
};
var hasProperty = (expectedProperty, _schema) => {
  if (!_schema)
    return;
  let schema = _schema.schema ?? _schema;
  if (schema[Kind] === "Import" && _schema.References)
    return _schema.References().some((schema2) => hasProperty(expectedProperty, schema2));
  if (schema.type === "object") {
    let properties = schema.properties;
    if (!properties)
      return false;
    for (let key of Object.keys(properties)) {
      let property = properties[key];
      if (expectedProperty in property)
        return true;
      if (property.type === "object") {
        if (hasProperty(expectedProperty, property))
          return true;
      } else if (property.anyOf) {
        for (let i = 0;i < property.anyOf.length; i++)
          if (hasProperty(expectedProperty, property.anyOf[i]))
            return true;
      }
    }
    return false;
  }
  return expectedProperty in schema;
};
var hasRef = (schema) => {
  if (!schema)
    return false;
  if (schema.oneOf) {
    for (let i = 0;i < schema.oneOf.length; i++)
      if (hasRef(schema.oneOf[i]))
        return true;
  }
  if (schema.anyOf) {
    for (let i = 0;i < schema.anyOf.length; i++)
      if (hasRef(schema.anyOf[i]))
        return true;
  }
  if (schema.oneOf) {
    for (let i = 0;i < schema.oneOf.length; i++)
      if (hasRef(schema.oneOf[i]))
        return true;
  }
  if (schema.allOf) {
    for (let i = 0;i < schema.allOf.length; i++)
      if (hasRef(schema.allOf[i]))
        return true;
  }
  if (schema.not && hasRef(schema.not))
    return true;
  if (schema.type === "object" && schema.properties) {
    let properties = schema.properties;
    for (let key of Object.keys(properties)) {
      let property = properties[key];
      if (hasRef(property))
        return true;
      if (property.type === "array" && property.items && hasRef(property.items))
        return true;
    }
  }
  if (schema.type === "array" && schema.items && hasRef(schema.items))
    return true;
  return schema[Kind] === "Ref" && "$ref" in schema;
};
var hasTransform = (schema) => {
  if (!schema)
    return false;
  if (schema.$ref && schema.$defs && schema.$ref in schema.$defs && hasTransform(schema.$defs[schema.$ref]))
    return true;
  if (schema.oneOf) {
    for (let i = 0;i < schema.oneOf.length; i++)
      if (hasTransform(schema.oneOf[i]))
        return true;
  }
  if (schema.anyOf) {
    for (let i = 0;i < schema.anyOf.length; i++)
      if (hasTransform(schema.anyOf[i]))
        return true;
  }
  if (schema.allOf) {
    for (let i = 0;i < schema.allOf.length; i++)
      if (hasTransform(schema.allOf[i]))
        return true;
  }
  if (schema.not && hasTransform(schema.not))
    return true;
  if (schema.type === "object" && schema.properties) {
    let properties = schema.properties;
    for (let key of Object.keys(properties)) {
      let property = properties[key];
      if (hasTransform(property))
        return true;
      if (property.type === "array" && property.items && hasTransform(property.items))
        return true;
    }
  }
  if (schema.type === "array" && schema.items && hasTransform(schema.items))
    return true;
  return TransformKind in schema;
};
var createCleaner = (schema) => (value) => {
  if (typeof value === "object")
    try {
      return exports_value2.Clean(schema, value);
    } catch {}
  return value;
};
var getSchemaValidator = (s, { models = {}, dynamic = false, modules, normalize = false, additionalProperties = false, forceAdditionalProperties = false, coerce = false, additionalCoerce = [], validators, sanitize: sanitize2 } = {}) => {
  if (validators = validators?.filter((x) => x), !s) {
    if (!validators?.length)
      return;
    s = validators[0], validators = validators.slice(1);
  }
  let doesHaveRef = undefined, replaceSchema = (schema2) => {
    if (coerce)
      return replaceSchemaTypeFromManyOptions(schema2, [{ from: t.Number(), to: (options) => t.Numeric(options), untilObjectFound: true }, { from: t.Boolean(), to: (options) => t.BooleanString(options), untilObjectFound: true }, ...Array.isArray(additionalCoerce) ? additionalCoerce : [additionalCoerce]]);
    return replaceSchemaTypeFromManyOptions(schema2, additionalCoerce);
  }, mapSchema = (s2) => {
    if (s2 && typeof s2 !== "string" && "~standard" in s2)
      return s2;
    if (!s2)
      return;
    let schema2;
    if (typeof s2 !== "string")
      schema2 = s2;
    else if (schema2 = modules && s2 in modules.$defs ? modules.Import(s2) : models[s2], !schema2)
      return;
    let hasAdditionalCoerce = Array.isArray(additionalCoerce) ? additionalCoerce.length > 0 : !!additionalCoerce;
    if (Kind in schema2) {
      if (schema2[Kind] === "Import") {
        if (!hasRef(schema2.$defs[schema2.$ref])) {
          if (schema2 = schema2.$defs[schema2.$ref] ?? models[schema2.$ref], coerce || hasAdditionalCoerce) {
            if (schema2 = replaceSchema(schema2), "$id" in schema2 && !schema2.$defs)
              schema2.$id = `${schema2.$id}_coerced_${randomId()}`;
          }
        }
      } else if (hasRef(schema2)) {
        let id = randomId();
        schema2 = t.Module({ ...modules?.$defs, [id]: schema2 }).Import(id);
      } else if (coerce || hasAdditionalCoerce)
        schema2 = replaceSchema(schema2);
    }
    return schema2;
  }, schema = mapSchema(s), _validators = validators;
  if ("~standard" in schema || validators?.length && validators.some((x) => x && typeof x !== "string" && ("~standard" in x))) {
    let typeboxSubValidator = (schema2) => {
      let mirror2;
      if (normalize === true || normalize === "exactMirror")
        try {
          mirror2 = createMirror(schema2, { TypeCompiler, sanitize: sanitize2?.(), modules });
        } catch {
          console.warn("Failed to create exactMirror. Please report the following code to https://github.com/elysiajs/elysia/issues"), console.warn(schema2), mirror2 = createCleaner(schema2);
        }
      let vali = getSchemaValidator(schema2, { models, modules, dynamic, normalize, additionalProperties: true, forceAdditionalProperties: true, coerce, additionalCoerce });
      return vali.Decode = mirror2, (v) => {
        if (vali.Check(v))
          return { value: vali.Decode(v) };
        else
          return { issues: [...vali.Errors(v)] };
      };
    }, mainCheck = schema["~standard"] ? schema["~standard"].validate : typeboxSubValidator(schema), checkers = [];
    if (validators?.length)
      for (let validator2 of validators) {
        if (!validator2)
          continue;
        if (typeof validator2 === "string")
          continue;
        if (validator2?.["~standard"]) {
          checkers.push(validator2["~standard"]);
          continue;
        }
        if (Kind in validator2) {
          checkers.push(typeboxSubValidator(validator2));
          continue;
        }
      }
    async function Check2(value) {
      let v = mainCheck(value);
      if (v instanceof Promise)
        v = await v;
      if (v.issues)
        return v;
      let values = [];
      if (v && typeof v === "object")
        values.push(v.value);
      for (let i = 0;i < checkers.length; i++) {
        if (v = checkers[i].validate(value), v instanceof Promise)
          v = await v;
        if (v.issues)
          return v;
        if (v && typeof v === "object")
          values.push(v.value);
      }
      if (!values.length)
        return { value: v };
      if (values.length === 1)
        return { value: values[0] };
      if (values.length === 2)
        return { value: mergeDeep(values[0], values[1]) };
      let newValue = mergeDeep(values[0], values[1]);
      for (let i = 2;i < values.length; i++)
        newValue = mergeDeep(newValue, values[i]);
      return { value: newValue };
    }
    let validator = { provider: "standard", schema, references: "", checkFunc: () => {}, code: "", Check: Check2, Errors: (value) => Check2(value)?.then?.((x) => x?.issues), Code: () => "", Decode: Check2, Encode: (value) => value, hasAdditionalProperties: false, hasDefault: false, isOptional: false, hasTransform: false, hasRef: false };
    return validator.parse = (v) => {
      try {
        return validator.Decode(validator.Clean?.(v) ?? v);
      } catch (error) {
        throw [...validator.Errors(v)].map(mapValueError);
      }
    }, validator.safeParse = (v) => {
      try {
        return { success: true, data: validator.Decode(validator.Clean?.(v) ?? v), error: null };
      } catch (error) {
        let errors = [...compiled.Errors(v)].map(mapValueError);
        return { success: false, data: null, error: errors[0]?.summary, errors };
      }
    }, validator;
  } else if (validators?.length) {
    let hasAdditional = false, validators2 = _validators, { schema: mergedObjectSchema, notObjects } = mergeObjectSchemas([schema, ...validators2.map(mapSchema)]);
    if (notObjects) {
      if (schema = t.Intersect([...mergedObjectSchema ? [mergedObjectSchema] : [], ...notObjects.map((x) => {
        let schema2 = mapSchema(x);
        if (schema2.type === "object" && "additionalProperties" in schema2) {
          if (!hasAdditional && schema2.additionalProperties === false)
            hasAdditional = true;
          delete schema2.additionalProperties;
        }
        return schema2;
      })]), schema.type === "object" && hasAdditional)
        schema.additionalProperties = false;
    }
  } else if (schema.type === "object" && (("additionalProperties" in schema) === false || forceAdditionalProperties))
    schema.additionalProperties = additionalProperties;
  else
    schema = replaceSchemaTypeFromManyOptions(schema, { onlyFirst: "object", from: t.Object({}), to(schema2) {
      if (!schema2.properties)
        return schema2;
      if ("additionalProperties" in schema2)
        return schema2;
      return t.Object(schema2.properties, { ...schema2, additionalProperties: false });
    } });
  if (dynamic)
    if (Kind in schema) {
      let validator = { provider: "typebox", schema, references: "", checkFunc: () => {}, code: "", Check: (value) => exports_value2.Check(schema, value), Errors: (value) => exports_value2.Errors(schema, value), Code: () => "", Clean: createCleaner(schema), Decode: (value) => exports_value2.Decode(schema, value), Encode: (value) => exports_value2.Encode(schema, value), get hasAdditionalProperties() {
        if ("~hasAdditionalProperties" in this)
          return this["~hasAdditionalProperties"];
        return this["~hasAdditionalProperties"] = hasAdditionalProperties(schema);
      }, get hasDefault() {
        if ("~hasDefault" in this)
          return this["~hasDefault"];
        return this["~hasDefault"] = hasProperty("default", schema);
      }, get isOptional() {
        if ("~isOptional" in this)
          return this["~isOptional"];
        return this["~isOptional"] = isOptional(schema);
      }, get hasTransform() {
        if ("~hasTransform" in this)
          return this["~hasTransform"];
        return this["~hasTransform"] = hasTransform(schema);
      }, "~hasRef": doesHaveRef, get hasRef() {
        if ("~hasRef" in this)
          return this["~hasRef"];
        return this["~hasRef"] = hasTransform(schema);
      } };
      if (schema.config) {
        if (validator.config = schema.config, validator?.schema?.config)
          delete validator.schema.config;
      }
      if (normalize && schema.additionalProperties === false)
        if (normalize === true || normalize === "exactMirror")
          try {
            validator.Clean = createMirror(schema, { TypeCompiler, sanitize: sanitize2?.(), modules });
          } catch {
            console.warn("Failed to create exactMirror. Please report the following code to https://github.com/elysiajs/elysia/issues"), console.warn(schema), validator.Clean = createCleaner(schema);
          }
        else
          validator.Clean = createCleaner(schema);
      return validator.parse = (v) => {
        try {
          return validator.Decode(validator.Clean?.(v) ?? v);
        } catch (error) {
          throw [...validator.Errors(v)].map(mapValueError);
        }
      }, validator.safeParse = (v) => {
        try {
          return { success: true, data: validator.Decode(validator.Clean?.(v) ?? v), error: null };
        } catch (error) {
          let errors = [...compiled.Errors(v)].map(mapValueError);
          return { success: false, data: null, error: errors[0]?.summary, errors };
        }
      }, validator;
    } else {
      let validator = { provider: "standard", schema, references: "", checkFunc: () => {}, code: "", Check: (v) => schema["~standard"].validate(v), Errors(value) {
        let response = schema["~standard"].validate(value);
        if (response instanceof Promise)
          throw Error("Async validation is not supported in non-dynamic schema");
        return response.issues;
      }, Code: () => "", Decode(value) {
        let response = schema["~standard"].validate(value);
        if (response instanceof Promise)
          throw Error("Async validation is not supported in non-dynamic schema");
        return response;
      }, Encode: (value) => value, hasAdditionalProperties: false, hasDefault: false, isOptional: false, hasTransform: false, hasRef: false };
      return validator.parse = (v) => {
        try {
          return validator.Decode(validator.Clean?.(v) ?? v);
        } catch (error) {
          throw [...validator.Errors(v)].map(mapValueError);
        }
      }, validator.safeParse = (v) => {
        try {
          return { success: true, data: validator.Decode(validator.Clean?.(v) ?? v), error: null };
        } catch (error) {
          let errors = [...compiled.Errors(v)].map(mapValueError);
          return { success: false, data: null, error: errors[0]?.summary, errors };
        }
      }, validator;
    }
  let compiled;
  if (Kind in schema) {
    if (compiled = TypeCompiler.Compile(schema, Object.values(models).filter((x) => (Kind in x))), compiled.provider = "typebox", schema.config) {
      if (compiled.config = schema.config, compiled?.schema?.config)
        delete compiled.schema.config;
    }
    if (normalize === true || normalize === "exactMirror")
      try {
        compiled.Clean = createMirror(schema, { TypeCompiler, sanitize: sanitize2?.(), modules });
      } catch (error) {
        console.warn("Failed to create exactMirror. Please report the following code to https://github.com/elysiajs/elysia/issues"), console.dir(schema, { depth: null }), compiled.Clean = createCleaner(schema);
      }
    else if (normalize === "typebox")
      compiled.Clean = createCleaner(schema);
  } else
    compiled = { provider: "standard", schema, references: "", checkFunc(value) {
      let response = schema["~standard"].validate(value);
      if (response instanceof Promise)
        throw Error("Async validation is not supported in non-dynamic schema");
      return response;
    }, code: "", Check: (v) => schema["~standard"].validate(v), Errors(value) {
      let response = schema["~standard"].validate(value);
      if (response instanceof Promise)
        throw Error("Async validation is not supported in non-dynamic schema");
      return response.issues;
    }, Code: () => "", Decode(value) {
      let response = schema["~standard"].validate(value);
      if (response instanceof Promise)
        throw Error("Async validation is not supported in non-dynamic schema");
      return response;
    }, Encode: (value) => value, hasAdditionalProperties: false, hasDefault: false, isOptional: false, hasTransform: false, hasRef: false };
  if (compiled.parse = (v) => {
    try {
      return compiled.Decode(compiled.Clean?.(v) ?? v);
    } catch (error) {
      throw [...compiled.Errors(v)].map(mapValueError);
    }
  }, compiled.safeParse = (v) => {
    try {
      return { success: true, data: compiled.Decode(compiled.Clean?.(v) ?? v), error: null };
    } catch (error) {
      let errors = [...compiled.Errors(v)].map(mapValueError);
      return { success: false, data: null, error: errors[0]?.summary, errors };
    }
  }, Kind in schema)
    Object.assign(compiled, { get hasAdditionalProperties() {
      if ("~hasAdditionalProperties" in this)
        return this["~hasAdditionalProperties"];
      return this["~hasAdditionalProperties"] = hasAdditionalProperties(compiled);
    }, get hasDefault() {
      if ("~hasDefault" in this)
        return this["~hasDefault"];
      return this["~hasDefault"] = hasProperty("default", compiled);
    }, get isOptional() {
      if ("~isOptional" in this)
        return this["~isOptional"];
      return this["~isOptional"] = isOptional(compiled);
    }, get hasTransform() {
      if ("~hasTransform" in this)
        return this["~hasTransform"];
      return this["~hasTransform"] = hasTransform(schema);
    }, get hasRef() {
      if ("~hasRef" in this)
        return this["~hasRef"];
      return this["~hasRef"] = hasRef(schema);
    }, "~hasRef": doesHaveRef });
  return compiled;
};
var isUnion = (schema) => schema[Kind] === "Union" || !schema.schema && !!schema.anyOf;
var mergeObjectSchemas = (schemas) => {
  if (schemas.length === 0)
    return { schema: undefined, notObjects: [] };
  if (schemas.length === 1)
    return schemas[0].type === "object" ? { schema: schemas[0], notObjects: [] } : { schema: undefined, notObjects: schemas };
  let newSchema, notObjects = [], additionalPropertiesIsTrue = false, additionalPropertiesIsFalse = false;
  for (let schema of schemas) {
    if (schema.type !== "object") {
      notObjects.push(schema);
      continue;
    }
    if ("additionalProperties" in schema) {
      if (schema.additionalProperties === true)
        additionalPropertiesIsTrue = true;
      else if (schema.additionalProperties === false)
        additionalPropertiesIsFalse = true;
    }
    if (!newSchema) {
      newSchema = schema;
      continue;
    }
    newSchema = { ...newSchema, ...schema, properties: { ...newSchema.properties, ...schema.properties }, required: [...newSchema?.required ?? [], ...schema.required ?? []] };
  }
  if (newSchema) {
    if (newSchema.required)
      newSchema.required = [...new Set(newSchema.required)];
    if (additionalPropertiesIsFalse)
      newSchema.additionalProperties = false;
    else if (additionalPropertiesIsTrue)
      newSchema.additionalProperties = true;
  }
  return { schema: newSchema, notObjects };
};
var getResponseSchemaValidator = (s, { models = {}, modules, dynamic = false, normalize = false, additionalProperties = false, validators = [], sanitize: sanitize2 }) => {
  if (validators = validators.filter((x) => x), !s) {
    if (!validators?.length)
      return;
    s = validators[0], validators = validators.slice(1);
  }
  let maybeSchemaOrRecord;
  if (typeof s !== "string")
    maybeSchemaOrRecord = s;
  else if (maybeSchemaOrRecord = modules && s in modules.$defs ? modules.Import(s) : models[s], !maybeSchemaOrRecord)
    return;
  if (!maybeSchemaOrRecord)
    return;
  if (Kind in maybeSchemaOrRecord || "~standard" in maybeSchemaOrRecord)
    return { 200: getSchemaValidator(maybeSchemaOrRecord, { modules, models, additionalProperties, dynamic, normalize, coerce: false, additionalCoerce: [], validators: validators.map((x) => x[200]), sanitize: sanitize2 }) };
  let record = {};
  return Object.keys(maybeSchemaOrRecord).forEach((status2) => {
    if (isNaN(+status2))
      return;
    let maybeNameOrSchema = maybeSchemaOrRecord[+status2];
    if (typeof maybeNameOrSchema === "string") {
      if (maybeNameOrSchema in models) {
        let schema = models[maybeNameOrSchema];
        if (!schema)
          return;
        record[+status2] = Kind in schema || "~standard" in schema ? getSchemaValidator(schema, { modules, models, additionalProperties, dynamic, normalize, coerce: false, additionalCoerce: [], validators: validators.map((x) => x[+status2]), sanitize: sanitize2 }) : schema;
      }
      return;
    }
    record[+status2] = Kind in maybeNameOrSchema || "~standard" in maybeNameOrSchema ? getSchemaValidator(maybeNameOrSchema, { modules, models, additionalProperties, dynamic, normalize, coerce: false, additionalCoerce: [], validators: validators.map((x) => x[+status2]), sanitize: sanitize2 }) : maybeNameOrSchema;
  }), record;
};
var getCookieValidator = ({ validator, modules, defaultConfig = {}, config, dynamic, normalize = false, models, validators, sanitize: sanitize2 }) => {
  let cookieValidator = validator?.provider ? validator : getSchemaValidator(validator, { modules, dynamic, models, normalize, additionalProperties: true, coerce: true, additionalCoerce: stringToStructureCoercions(), validators, sanitize: sanitize2 });
  if (cookieValidator)
    cookieValidator.config = mergeCookie(cookieValidator.config, config);
  else
    cookieValidator = getSchemaValidator(t.Cookie(t.Any()), { modules, dynamic, models, additionalProperties: true, validators, sanitize: sanitize2 }), cookieValidator.config = defaultConfig;
  return cookieValidator;
};
var unwrapImportSchema = (schema) => schema && schema[Kind] === "Import" && schema.$defs[schema.$ref][Kind] === "Object" ? schema.$defs[schema.$ref] : schema;
var allocateIf = (value, condition) => condition ? value : "";
var defaultParsers = ["json", "text", "urlencoded", "arrayBuffer", "formdata", "application/json", "text/plain", "application/x-www-form-urlencoded", "application/octet-stream", "multipart/form-data"];
var createReport = ({ context = "c", trace = [], addFn }) => {
  if (!trace.length)
    return () => {
      return { resolveChild() {
        return () => {};
      }, resolve() {} };
    };
  for (let i = 0;i < trace.length; i++)
    addFn(`let report${i},reportChild${i},reportErr${i},reportErrChild${i};let trace${i}=${context}[ELYSIA_TRACE]?.[${i}]??trace[${i}](${context});
`);
  return (event, { name, total = 0, alias } = {}) => {
    if (!name)
      name = "anonymous";
    let reporter = event === "error" ? "reportErr" : "report";
    for (let i = 0;i < trace.length; i++)
      if (addFn(`${alias ? "const " : ""}${alias ?? reporter}${i}=trace${i}.${event}({id,event:'${event}',name:'${name}',begin:performance.now(),total:${total}})
`), alias)
        addFn(`${reporter}${i}=${alias}${i}
`);
    return { resolve() {
      for (let i = 0;i < trace.length; i++)
        addFn(`${alias ?? reporter}${i}.resolve()
`);
    }, resolveChild(name2) {
      for (let i = 0;i < trace.length; i++)
        addFn(`${reporter}Child${i}=${reporter}${i}.resolveChild?.shift()?.({id,event:'${event}',name:'${name2}',begin:performance.now()})
`);
      return (binding) => {
        for (let i = 0;i < trace.length; i++)
          if (binding)
            addFn(`if(${binding} instanceof Error){${reporter}Child${i}?.(${binding}) }else{${reporter}Child${i}?.()}`);
          else
            addFn(`${reporter}Child${i}?.()
`);
      };
    } };
  };
};
var composeCleaner = ({ schema, name, type, typeAlias = type, normalize, ignoreTryCatch = false }) => {
  if (!normalize || !schema.Clean)
    return "";
  if (normalize === true || normalize === "exactMirror") {
    if (ignoreTryCatch)
      return `${name}=validator.${typeAlias}.Clean(${name})
`;
    return `try{${name}=validator.${typeAlias}.Clean(${name})
}catch{}`;
  }
  if (normalize === "typebox")
    return `${name}=validator.${typeAlias}.Clean(${name})
`;
  return "";
};
var composeValidationFactory = ({ injectResponse = "", normalize = false, validator, encodeSchema = false, isStaticResponse = false, hasSanitize = false, allowUnsafeValidationDetails = false }) => ({ validate: (type, value = `c.${type}`, error) => `c.set.status=422;throw new ValidationError('${type}',validator.${type},${value},${allowUnsafeValidationDetails}${error ? "," + error : ""})`, response: (name = "r") => {
  if (isStaticResponse || !validator.response)
    return "";
  let code = injectResponse + `
`;
  code += `if(${name} instanceof ElysiaCustomStatusResponse){c.set.status=${name}.code
${name}=${name}.response}if(${name} instanceof Response === false && typeof ${name}?.next !== 'function' && !(${name} instanceof ReadableStream))switch(c.set.status){`;
  for (let [status2, value] of Object.entries(validator.response)) {
    if (code += `
case ${status2}:
`, value.provider === "standard") {
      code += `let vare${status2}=validator.response[${status2}].Check(${name})
if(vare${status2} instanceof Promise)vare${status2}=await vare${status2}
if(vare${status2}.issues)throw new ValidationError('response',validator.response[${status2}],${name},${allowUnsafeValidationDetails},vare${status2}.issues)
${name}=vare${status2}.value
c.set.status=${status2}
break
`;
      continue;
    }
    let noValidate = value.schema?.noValidate === true;
    if (!noValidate && value.schema?.$ref && value.schema?.$defs) {
      let refKey = value.schema.$ref, defKey = typeof refKey === "string" && refKey.includes("/") ? refKey.split("/").pop() : refKey;
      if (value.schema.$defs[defKey]?.noValidate === true)
        noValidate = true;
    }
    let appliedCleaner = noValidate || hasSanitize, clean2 = ({ ignoreTryCatch = false } = {}) => composeCleaner({ name, schema: value, type: "response", typeAlias: `response[${status2}]`, normalize, ignoreTryCatch });
    if (appliedCleaner)
      code += clean2();
    let applyErrorCleaner = !appliedCleaner && normalize && !noValidate;
    if (encodeSchema && value.hasTransform && !noValidate) {
      if (code += `try{${name}=validator.response[${status2}].Encode(${name})
`, !appliedCleaner)
        code += clean2({ ignoreTryCatch: true });
      code += `c.set.status=${status2}}catch{` + (applyErrorCleaner ? `try{
` + clean2({ ignoreTryCatch: true }) + `${name}=validator.response[${status2}].Encode(${name})
}catch{throw new ValidationError('response',validator.response[${status2}],${name},${allowUnsafeValidationDetails})}` : `throw new ValidationError('response',validator.response[${status2}],${name}),${allowUnsafeValidationDetails}`) + "}";
    } else {
      if (!appliedCleaner)
        code += clean2();
      if (!noValidate)
        code += `if(validator.response[${status2}].Check(${name})===false)throw new ValidationError('response',validator.response[${status2}],${name},${allowUnsafeValidationDetails})
c.set.status=${status2}
`;
    }
    code += `break
`;
  }
  return code + "}";
} });
var isAsyncName = (v) => {
  return (v?.fn ?? v).constructor.name === "AsyncFunction";
};
var matchResponseClone = /=>\s?response\.clone\(/;
var matchFnReturn = /(?:return|=>)\s?\S+\(|a(?:sync|wait)/;
var isAsync = (v) => {
  let isObject2 = typeof v === "object";
  if (isObject2 && v.isAsync !== undefined)
    return v.isAsync;
  let fn = isObject2 ? v.fn : v;
  if (fn.constructor.name === "AsyncFunction")
    return true;
  let literal = fn.toString();
  if (matchResponseClone.test(literal)) {
    if (isObject2)
      v.isAsync = false;
    return false;
  }
  let result = matchFnReturn.test(literal);
  if (isObject2)
    v.isAsync = result;
  return result;
};
var hasReturn = (v) => {
  let isObject2 = typeof v === "object";
  if (isObject2 && v.hasReturn !== undefined)
    return v.hasReturn;
  let fnLiteral = isObject2 ? v.fn.toString() : typeof v === "string" ? v.toString() : v.toString(), parenthesisEnd = fnLiteral.indexOf(")"), arrowIndex = fnLiteral.indexOf("=>", parenthesisEnd);
  if (arrowIndex !== -1) {
    let afterArrow = arrowIndex + 2, charCode;
    while (afterArrow < fnLiteral.length && ((charCode = fnLiteral.charCodeAt(afterArrow)) === 32 || charCode === 9 || charCode === 10 || charCode === 13))
      afterArrow++;
    if (afterArrow < fnLiteral.length && fnLiteral.charCodeAt(afterArrow) !== 123) {
      if (isObject2)
        v.hasReturn = true;
      return true;
    }
  }
  let result = fnLiteral.includes("return");
  if (isObject2)
    v.hasReturn = result;
  return result;
};
var isGenerator = (v) => {
  let fn = v?.fn ?? v;
  return fn.constructor.name === "AsyncGeneratorFunction" || fn.constructor.name === "GeneratorFunction";
};
var coerceTransformDecodeError = (fnLiteral, type, allowUnsafeValidationDetails = false, value = `c.${type}`) => `try{${fnLiteral}}catch(error){if(error.constructor.name === 'TransformDecodeError'){c.set.status=422
throw error.error ?? new ValidationError('${type}',validator.${type},${value},${allowUnsafeValidationDetails})}}`;
var setImmediateFn = hasSetImmediate ? "setImmediate" : "Promise.resolve().then";
var composeHandler = ({ app, path, method, hooks, validator, handler, allowMeta = false, inference }) => {
  let adapter = app["~adapter"].composeHandler, adapterHandler = app["~adapter"].handler, isHandleFn = typeof handler === "function";
  if (!isHandleFn) {
    handler = adapterHandler.mapResponse(handler, { headers: app.setHeaders ?? {} });
    let isResponse = handler instanceof Response || handler?.constructor?.name === "Response" && typeof handler?.clone === "function";
    if (hooks.parse?.length && hooks.transform?.length && hooks.beforeHandle?.length && hooks.afterHandle?.length) {
      if (isResponse)
        return Function("a", `"use strict";
return function(){return a.clone()}`)(handler);
      return Function("a", `"use strict";
return function(){return a}`)(handler);
    }
    if (isResponse) {
      let response = handler;
      handler = () => response.clone();
    }
  }
  let handle = isHandleFn ? "handler(c)" : "handler", hasTrace = !!hooks.trace?.length, fnLiteral = "";
  if (inference = sucrose(Object.assign({ handler }, hooks), inference, app.config.sucrose), adapter.declare) {
    let literal = adapter.declare(inference);
    if (literal)
      fnLiteral += literal;
  }
  if (inference.server)
    fnLiteral += `Object.defineProperty(c,'server',{get:function(){return getServer()}})
`;
  validator.createBody?.(), validator.createQuery?.(), validator.createHeaders?.(), validator.createParams?.(), validator.createCookie?.(), validator.createResponse?.();
  let hasValidation = !!validator.body || !!validator.headers || !!validator.params || !!validator.query || !!validator.cookie || !!validator.response, hasQuery = inference.query || !!validator.query, requestNoBody = hooks.parse?.length === 1 && hooks.parse[0].fn === "none", hasBody = method !== "" && method !== "GET" && method !== "HEAD" && (inference.body || !!validator.body || !!hooks.parse?.length) && !requestNoBody, defaultHeaders = app.setHeaders, hasDefaultHeaders = defaultHeaders && !!Object.keys(defaultHeaders).length, hasHeaders = inference.headers || !!validator.headers || adapter.preferWebstandardHeaders !== true && inference.body, hasCookie = inference.cookie || !!validator.cookie, cookieMeta = validator.cookie?.config ? mergeCookie(validator?.cookie?.config, app.config.cookie) : app.config.cookie, _encodeCookie = "", encodeCookie = () => {
    if (_encodeCookie)
      return _encodeCookie;
    if (cookieMeta?.sign) {
      if (!cookieMeta.secrets)
        throw Error(`t.Cookie required secret which is not set in (${method}) ${path}.`);
      let secret = !cookieMeta.secrets ? undefined : typeof cookieMeta.secrets === "string" ? cookieMeta.secrets : cookieMeta.secrets[0];
      if (_encodeCookie += `const _setCookie = c.set.cookie
if(_setCookie){`, cookieMeta.sign === true)
        _encodeCookie += `for(const [key, cookie] of Object.entries(_setCookie)){c.set.cookie[key].value=await signCookie(cookie.value,${!secret ? "undefined" : JSON.stringify(secret)})}`;
      else {
        if (typeof cookieMeta.sign === "string")
          cookieMeta.sign = [cookieMeta.sign];
        for (let name of cookieMeta.sign)
          _encodeCookie += `if(_setCookie[${JSON.stringify(name)}]?.value)c.set.cookie[${JSON.stringify(name)}].value=await signCookie(_setCookie[${JSON.stringify(name)}].value,${!secret ? "undefined" : JSON.stringify(secret)})
`;
      }
      _encodeCookie += `}
`;
    }
    return _encodeCookie;
  }, normalize = app.config.normalize, encodeSchema = app.config.encodeSchema, allowUnsafeValidationDetails = app.config.allowUnsafeValidationDetails, validation = composeValidationFactory({ normalize, validator, encodeSchema, isStaticResponse: handler instanceof Response, hasSanitize: !!app.config.sanitize, allowUnsafeValidationDetails });
  if (hasHeaders)
    fnLiteral += adapter.headers;
  if (hasTrace)
    fnLiteral += `const id=c[ELYSIA_REQUEST_ID]
`;
  let report = createReport({ trace: hooks.trace, addFn: (word) => {
    fnLiteral += word;
  } });
  if (fnLiteral += "try{", hasCookie) {
    let get = (name, defaultValue) => {
      let value = cookieMeta?.[name] ?? defaultValue;
      if (value === undefined)
        return "";
      if (!value)
        return typeof defaultValue === "string" ? `${name}:"${defaultValue}",` : `${name}:${defaultValue},`;
      if (typeof value === "string")
        return `${name}:${JSON.stringify(value)},`;
      if (value instanceof Date)
        return `${name}: new Date(${value.getTime()}),`;
      return `${name}:${value},`;
    }, options = cookieMeta ? `{secrets:${cookieMeta.secrets !== undefined ? typeof cookieMeta.secrets === "string" ? JSON.stringify(cookieMeta.secrets) : "[" + cookieMeta.secrets.map((x) => JSON.stringify(x)).join(",") + "]" : "undefined"},sign:${cookieMeta.sign === true ? true : cookieMeta.sign !== undefined ? typeof cookieMeta.sign === "string" ? JSON.stringify(cookieMeta.sign) : "[" + cookieMeta.sign.map((x) => JSON.stringify(x)).join(",") + "]" : "undefined"},` + get("domain") + get("expires") + get("httpOnly") + get("maxAge") + get("path", "/") + get("priority") + get("sameSite") + get("secure") + "}" : "undefined";
    if (hasHeaders)
      fnLiteral += `
c.cookie=await parseCookie(c.set,c.headers.cookie,${options})
`;
    else
      fnLiteral += `
c.cookie=await parseCookie(c.set,c.request.headers.get('cookie'),${options})
`;
  }
  if (hasQuery) {
    let arrayProperties = {}, objectProperties = {}, hasArrayProperty = false, hasObjectProperty = false;
    if (validator.query?.schema) {
      let schema = unwrapImportSchema(validator.query?.schema);
      if (Kind in schema && schema.properties)
        for (let [key, value] of Object.entries(schema.properties)) {
          if (hasElysiaMeta("ArrayQuery", value))
            arrayProperties[key] = true, hasArrayProperty = true;
          if (hasElysiaMeta("ObjectString", value))
            objectProperties[key] = true, hasObjectProperty = true;
        }
    }
    fnLiteral += `if(c.qi===-1){c.query=Object.create(null)}else{c.query=parseQueryFromURL(c.url,c.qi+1${hasArrayProperty ? "," + JSON.stringify(arrayProperties) : hasObjectProperty ? ",undefined" : ""}${hasObjectProperty ? "," + JSON.stringify(objectProperties) : ""})}`;
  }
  let isAsyncHandler = typeof handler === "function" && isAsync(handler), saveResponse = hasTrace || hooks.afterResponse?.length ? "c.response=c.responseValue= " : "", responseKeys = Object.keys(validator.response ?? {}), hasMultipleResponses = responseKeys.length > 1, hasSingle200 = responseKeys.length === 0 || responseKeys.length === 1 && responseKeys[0] === "200", maybeAsync = hasCookie || hasBody || isAsyncHandler || !!hooks.parse?.length || !!hooks.afterHandle?.some(isAsync) || !!hooks.beforeHandle?.some(isAsync) || !!hooks.transform?.some(isAsync) || !!hooks.mapResponse?.some(isAsync) || validator.body?.provider === "standard" || validator.headers?.provider === "standard" || validator.query?.provider === "standard" || validator.params?.provider === "standard" || validator.cookie?.provider === "standard" || Object.values(validator.response ?? {}).find((x) => x.provider === "standard"), maybeStream = (typeof handler === "function" ? isGenerator(handler) : false) || !!hooks.beforeHandle?.some(isGenerator) || !!hooks.afterHandle?.some(isGenerator) || !!hooks.transform?.some(isGenerator), hasSet = inference.cookie || inference.set || hasHeaders || hasTrace || hasMultipleResponses || !hasSingle200 || isHandleFn && hasDefaultHeaders || maybeStream, _afterResponse, afterResponse = (hasStream = true) => {
    if (_afterResponse !== undefined)
      return _afterResponse;
    if (!hooks.afterResponse?.length && !hasTrace)
      return "";
    let afterResponse2 = "";
    afterResponse2 += `
${setImmediateFn}(async()=>{if(c.responseValue){if(c.responseValue instanceof ElysiaCustomStatusResponse) c.set.status=c.responseValue.code
` + (hasStream ? `if(typeof afterHandlerStreamListener!=='undefined')for await(const v of afterHandlerStreamListener){}
` : "") + `}
`;
    let reporter = createReport({ trace: hooks.trace, addFn: (word) => {
      afterResponse2 += word;
    } })("afterResponse", { total: hooks.afterResponse?.length });
    if (hooks.afterResponse?.length && hooks.afterResponse)
      for (let i = 0;i < hooks.afterResponse.length; i++) {
        let endUnit = reporter.resolveChild(hooks.afterResponse[i].fn.name), prefix = isAsync(hooks.afterResponse[i]) ? "await " : "";
        afterResponse2 += `
${prefix}e.afterResponse[${i}](c)
`, endUnit();
      }
    return reporter.resolve(), afterResponse2 += `})
`, _afterResponse = afterResponse2;
  }, mapResponse2 = (r = "r") => {
    let after = afterResponse(), response = `${hasSet ? "mapResponse" : "mapCompactResponse"}(${saveResponse}${r}${hasSet ? ",c.set" : ""}${mapResponseContext})
`;
    if (!after)
      return `return ${response}`;
    return `const _res=${response}` + after + "return _res";
  }, mapResponseContext = maybeStream && adapter.mapResponseContext ? `,${adapter.mapResponseContext}` : "";
  if (hasTrace || inference.route)
    fnLiteral += `c.route=\`${path}\`
`;
  if (hasTrace || hooks.afterResponse?.length)
    fnLiteral += `let afterHandlerStreamListener
`;
  let parseReporter = report("parse", { total: hooks.parse?.length });
  if (hasBody) {
    let hasBodyInference = !!hooks.parse?.length || inference.body || validator.body;
    if (adapter.parser.declare)
      fnLiteral += adapter.parser.declare;
    fnLiteral += `
try{`;
    let parser = typeof hooks.parse === "string" ? hooks.parse : Array.isArray(hooks.parse) && hooks.parse.length === 1 ? typeof hooks.parse[0] === "string" ? hooks.parse[0] : typeof hooks.parse[0].fn === "string" ? hooks.parse[0].fn : undefined : undefined;
    if (!parser && validator.body && !hooks.parse?.length) {
      let schema = validator.body.schema;
      if (schema && schema.anyOf && schema[Kind] === "Union" && schema.anyOf?.length === 2 && schema.anyOf?.find((x) => x[Kind] === "ElysiaForm"))
        parser = "formdata";
    }
    if (parser && defaultParsers.includes(parser)) {
      let reporter = report("parse", { total: hooks.parse?.length }), isOptionalBody = !!validator.body?.isOptional;
      switch (parser) {
        case "json":
        case "application/json":
          fnLiteral += adapter.parser.json(isOptionalBody);
          break;
        case "text":
        case "text/plain":
          fnLiteral += adapter.parser.text(isOptionalBody);
          break;
        case "urlencoded":
        case "application/x-www-form-urlencoded":
          fnLiteral += adapter.parser.urlencoded(isOptionalBody);
          break;
        case "arrayBuffer":
        case "application/octet-stream":
          fnLiteral += adapter.parser.arrayBuffer(isOptionalBody);
          break;
        case "formdata":
        case "multipart/form-data":
          fnLiteral += adapter.parser.formData(isOptionalBody);
          break;
        default:
          if (parser[0] in app["~parser"])
            fnLiteral += hasHeaders ? "let contentType = c.headers['content-type']" : "let contentType = c.request.headers.get('content-type')", fnLiteral += `
if(contentType){const index=contentType.indexOf(';')
if(index!==-1)contentType=contentType.substring(0,index)}
else{contentType=''}c.contentType=contentType
let result=parser['${parser}'](c, contentType)
if(result instanceof Promise)result=await result
if(result instanceof ElysiaCustomStatusResponse)throw result
if(result!==undefined)c.body=result
delete c.contentType
`;
          break;
      }
      reporter.resolve();
    } else if (hasBodyInference) {
      fnLiteral += `
`, fnLiteral += `let contentType
if(c.request.body)`, fnLiteral += hasHeaders ? `contentType=c.headers['content-type']
` : `contentType=c.request.headers.get('content-type')
`;
      let hasDefaultParser = false;
      if (hooks.parse?.length)
        fnLiteral += `if(contentType){
const index=contentType.indexOf(';')

if(index!==-1)contentType=contentType.substring(0,index)}else{contentType=''}let used=false
c.contentType=contentType
`;
      else {
        hasDefaultParser = true;
        let isOptionalBody = !!validator.body?.isOptional;
        fnLiteral += `if(contentType)switch(contentType.charCodeAt(12)){
case 106:` + adapter.parser.json(isOptionalBody) + `break
case 120:` + adapter.parser.urlencoded(isOptionalBody) + `break
case 111:` + adapter.parser.arrayBuffer(isOptionalBody) + `break
case 114:` + adapter.parser.formData(isOptionalBody) + `break
default:if(contentType.charCodeAt(0)===116){` + adapter.parser.text(isOptionalBody) + `}break
}`;
      }
      let reporter = report("parse", { total: hooks.parse?.length });
      if (hooks.parse)
        for (let i = 0;i < hooks.parse.length; i++) {
          let name = `bo${i}`;
          if (i !== 0)
            fnLiteral += `
if(!used){`;
          if (typeof hooks.parse[i].fn === "string") {
            let endUnit = reporter.resolveChild(hooks.parse[i].fn), isOptionalBody = !!validator.body?.isOptional;
            switch (hooks.parse[i].fn) {
              case "json":
              case "application/json":
                hasDefaultParser = true, fnLiteral += adapter.parser.json(isOptionalBody);
                break;
              case "text":
              case "text/plain":
                hasDefaultParser = true, fnLiteral += adapter.parser.text(isOptionalBody);
                break;
              case "urlencoded":
              case "application/x-www-form-urlencoded":
                hasDefaultParser = true, fnLiteral += adapter.parser.urlencoded(isOptionalBody);
                break;
              case "arrayBuffer":
              case "application/octet-stream":
                hasDefaultParser = true, fnLiteral += adapter.parser.arrayBuffer(isOptionalBody);
                break;
              case "formdata":
              case "multipart/form-data":
                hasDefaultParser = true, fnLiteral += adapter.parser.formData(isOptionalBody);
                break;
              default:
                fnLiteral += `let ${name}=parser['${hooks.parse[i].fn}'](c,contentType)
if(${name} instanceof Promise)${name}=await ${name}
if(${name}!==undefined){c.body=${name};used=true;}
`;
            }
            endUnit();
          } else {
            let endUnit = reporter.resolveChild(hooks.parse[i].fn.name);
            fnLiteral += `let ${name}=e.parse[${i}]
${name}=${name}(c,contentType)
if(${name} instanceof Promise)${name}=await ${name}
if(${name}!==undefined){c.body=${name};used=true}`, endUnit();
          }
          if (i !== 0)
            fnLiteral += "}";
          if (hasDefaultParser)
            break;
        }
      if (reporter.resolve(), !hasDefaultParser) {
        let isOptionalBody = !!validator.body?.isOptional;
        if (hooks.parse?.length)
          fnLiteral += `
if(!used){
`;
        fnLiteral += `switch(contentType){case 'application/json':
` + adapter.parser.json(isOptionalBody) + `break
case 'text/plain':` + adapter.parser.text(isOptionalBody) + `break
case 'application/x-www-form-urlencoded':` + adapter.parser.urlencoded(isOptionalBody) + `break
case 'application/octet-stream':` + adapter.parser.arrayBuffer(isOptionalBody) + `break
case 'multipart/form-data':` + adapter.parser.formData(isOptionalBody) + `break
`;
        for (let key of Object.keys(app["~parser"]))
          fnLiteral += `case '${key}':let bo${key}=parser['${key}'](c,contentType)
if(bo${key} instanceof Promise)bo${key}=await bo${key}
if(bo${key} instanceof ElysiaCustomStatusResponse){` + mapResponse2(`bo${key}`) + `}if(bo${key}!==undefined)c.body=bo${key}
break
`;
        if (hooks.parse?.length)
          fnLiteral += "}";
        fnLiteral += "}";
      }
      if (hooks.parse?.length)
        fnLiteral += `
delete c.contentType`;
    }
    fnLiteral += "}catch(error){throw new ParseError(error)}";
  }
  if (parseReporter.resolve(), hooks?.transform || hasTrace) {
    let reporter = report("transform", { total: hooks.transform?.length });
    if (hooks.transform?.length) {
      fnLiteral += `let transformed
`;
      for (let i = 0;i < hooks.transform.length; i++) {
        let transform2 = hooks.transform[i], endUnit = reporter.resolveChild(transform2.fn.name);
        if (fnLiteral += isAsync(transform2) ? `transformed=await e.transform[${i}](c)
` : `transformed=e.transform[${i}](c)
`, transform2.subType === "mapDerive")
          fnLiteral += "if(transformed instanceof ElysiaCustomStatusResponse){" + mapResponse2("transformed") + `}else{transformed.request=c.request
transformed.store=c.store
transformed.qi=c.qi
transformed.path=c.path
transformed.url=c.url
transformed.redirect=c.redirect
transformed.set=c.set
transformed.error=c.error
c=transformed}`;
        else
          fnLiteral += "if(transformed instanceof ElysiaCustomStatusResponse){" + mapResponse2("transformed") + `}else Object.assign(c,transformed)
`;
        endUnit();
      }
    }
    reporter.resolve();
  }
  let fileUnions = [];
  if (validator) {
    if (validator.headers) {
      if (validator.headers.hasDefault)
        for (let [key, value] of Object.entries(exports_value2.Default(validator.headers.schema, {}))) {
          let parsed = typeof value === "object" ? JSON.stringify(value) : typeof value === "string" ? `'${value}'` : value;
          if (parsed !== undefined)
            fnLiteral += `c.headers['${key}']??=${parsed}
`;
        }
      if (fnLiteral += composeCleaner({ name: "c.headers", schema: validator.headers, type: "headers", normalize }), validator.headers.isOptional)
        fnLiteral += "if(isNotEmpty(c.headers)){";
      if (validator.headers?.provider === "standard")
        fnLiteral += `let vah=validator.headers.Check(c.headers)
if(vah instanceof Promise)vah=await vah
if(vah.issues){` + validation.validate("headers", undefined, "vah.issues") + `}else{c.headers=vah.value}
`;
      else if (validator.headers?.schema?.noValidate !== true)
        fnLiteral += "if(validator.headers.Check(c.headers) === false){" + validation.validate("headers") + "}";
      if (validator.headers.hasTransform)
        fnLiteral += coerceTransformDecodeError(`c.headers=validator.headers.Decode(c.headers)
`, "headers", allowUnsafeValidationDetails);
      if (validator.headers.isOptional)
        fnLiteral += "}";
    }
    if (validator.params) {
      if (validator.params.hasDefault)
        for (let [key, value] of Object.entries(exports_value2.Default(validator.params.schema, {}))) {
          let parsed = typeof value === "object" ? JSON.stringify(value) : typeof value === "string" ? `'${value}'` : value;
          if (parsed !== undefined)
            fnLiteral += `c.params['${key}']??=${parsed}
`;
        }
      if (validator.params.provider === "standard")
        fnLiteral += `let vap=validator.params.Check(c.params)
if(vap instanceof Promise)vap=await vap
if(vap.issues){` + validation.validate("params", undefined, "vap.issues") + `}else{c.params=vap.value}
`;
      else if (validator.params?.schema?.noValidate !== true)
        fnLiteral += "if(validator.params.Check(c.params)===false){" + validation.validate("params") + "}";
      if (validator.params.hasTransform)
        fnLiteral += coerceTransformDecodeError(`c.params=validator.params.Decode(c.params)
`, "params", allowUnsafeValidationDetails);
    }
    if (validator.query) {
      if (Kind in validator.query?.schema && validator.query.hasDefault)
        for (let [key, value] of Object.entries(exports_value2.Default(validator.query.schema, {}))) {
          let parsed = typeof value === "object" ? JSON.stringify(value) : typeof value === "string" ? `'${value}'` : value;
          if (parsed !== undefined)
            fnLiteral += `if(c.query['${key}']===undefined)c.query['${key}']=${parsed}
`;
        }
      if (fnLiteral += composeCleaner({ name: "c.query", schema: validator.query, type: "query", normalize }), validator.query.isOptional)
        fnLiteral += "if(isNotEmpty(c.query)){";
      if (validator.query.provider === "standard")
        fnLiteral += `let vaq=validator.query.Check(c.query)
if(vaq instanceof Promise)vaq=await vaq
if(vaq.issues){` + validation.validate("query", undefined, "vaq.issues") + `}else{c.query=vaq.value}
`;
      else if (validator.query?.schema?.noValidate !== true)
        fnLiteral += "if(validator.query.Check(c.query)===false){" + validation.validate("query") + "}";
      if (validator.query.hasTransform)
        fnLiteral += coerceTransformDecodeError(`c.query=validator.query.Decode(c.query)
`, "query", allowUnsafeValidationDetails), fnLiteral += coerceTransformDecodeError(`c.query=validator.query.Decode(c.query)
`, "query", allowUnsafeValidationDetails);
      if (validator.query.isOptional)
        fnLiteral += "}";
    }
    if (hasBody && validator.body) {
      if (validator.body.hasTransform || validator.body.isOptional)
        fnLiteral += `const isNotEmptyObject=c.body&&(typeof c.body==="object"&&(isNotEmpty(c.body)||c.body instanceof ArrayBuffer))
`;
      let hasUnion = isUnion(validator.body.schema), hasNonUnionFileWithDefault = false;
      if (validator.body.hasDefault) {
        let value = exports_value2.Default(validator.body.schema, validator.body.schema.type === "object" || unwrapImportSchema(validator.body.schema)[Kind] === "Object" ? {} : undefined), schema = unwrapImportSchema(validator.body.schema);
        if (!hasUnion && value && typeof value === "object" && (hasType("File", schema) || hasType("Files", schema))) {
          hasNonUnionFileWithDefault = true;
          for (let [k2, v] of Object.entries(value))
            if (v === "File" || v === "Files")
              delete value[k2];
          if (!isNotEmpty(value))
            value = undefined;
        }
        let parsed = typeof value === "object" ? JSON.stringify(value) : typeof value === "string" ? `'${value}'` : value;
        if (value !== undefined && value !== null)
          if (Array.isArray(value))
            fnLiteral += `if(!c.body)c.body=${parsed}
`;
          else if (typeof value === "object")
            fnLiteral += `c.body=Object.assign(${parsed},c.body)
`;
          else
            fnLiteral += `c.body=${parsed}
`;
        if (fnLiteral += composeCleaner({ name: "c.body", schema: validator.body, type: "body", normalize }), validator.body.provider === "standard")
          fnLiteral += `let vab=validator.body.Check(c.body)
if(vab instanceof Promise)vab=await vab
if(vab.issues){` + validation.validate("body", undefined, "vab.issues") + `}else{c.body=vab.value}
`;
        else if (validator.body?.schema?.noValidate !== true)
          if (validator.body.isOptional)
            fnLiteral += "if(isNotEmptyObject&&validator.body.Check(c.body)===false){" + validation.validate("body") + "}";
          else
            fnLiteral += "if(validator.body.Check(c.body)===false){" + validation.validate("body") + "}";
      } else if (fnLiteral += composeCleaner({ name: "c.body", schema: validator.body, type: "body", normalize }), validator.body.provider === "standard")
        fnLiteral += `let vab=validator.body.Check(c.body)
if(vab instanceof Promise)vab=await vab
if(vab.issues){` + validation.validate("body", undefined, "vab.issues") + `}else{c.body=vab.value}
`;
      else if (validator.body?.schema?.noValidate !== true)
        if (validator.body.isOptional)
          fnLiteral += "if(isNotEmptyObject&&validator.body.Check(c.body)===false){" + validation.validate("body") + "}";
        else
          fnLiteral += "if(validator.body.Check(c.body)===false){" + validation.validate("body") + "}";
      if (validator.body.hasTransform)
        fnLiteral += coerceTransformDecodeError(`if(isNotEmptyObject)c.body=validator.body.Decode(c.body)
`, "body", allowUnsafeValidationDetails);
      if (hasUnion && validator.body.schema.anyOf?.length) {
        let iterator = Object.values(validator.body.schema.anyOf);
        for (let i = 0;i < iterator.length; i++) {
          let type = iterator[i];
          if (hasType("File", type) || hasType("Files", type)) {
            let candidate = getSchemaValidator(type, { modules: app.definitions.typebox, dynamic: !app.config.aot, models: app.definitions.type, normalize: app.config.normalize, additionalCoerce: coercePrimitiveRoot(), sanitize: () => app.config.sanitize });
            if (candidate) {
              let isFirst = fileUnions.length === 0, properties = candidate.schema?.properties ?? type.properties;
              if (!properties && candidate.schema?.anyOf) {
                let objectSchema = candidate.schema.anyOf.find((s) => s.type === "object" || (Kind in s) && s[Kind] === "Object");
                if (objectSchema)
                  properties = objectSchema.properties;
              }
              if (!properties)
                continue;
              let iterator2 = Object.entries(properties), validator2 = isFirst ? `
` : " else ";
              validator2 += `if(fileUnions[${fileUnions.length}].Check(c.body)){`;
              let validateFile2 = "", validatorLength = 0;
              for (let i2 = 0;i2 < iterator2.length; i2++) {
                let [k2, v] = iterator2[i2];
                if (!v.extension || v[Kind] !== "File" && v[Kind] !== "Files")
                  continue;
                if (validatorLength)
                  validateFile2 += ",";
                validateFile2 += `fileType(c.body.${k2},${JSON.stringify(v.extension)},'body.${k2}')`, validatorLength++;
              }
              if (validateFile2) {
                if (validatorLength === 1)
                  validator2 += `await ${validateFile2}
`;
                else if (validatorLength > 1)
                  validator2 += `await Promise.all([${validateFile2}])
`;
                validator2 += "}", fnLiteral += validator2, fileUnions.push(candidate);
              }
            }
          }
        }
      } else if (hasNonUnionFileWithDefault || !hasUnion && (hasType("File", unwrapImportSchema(validator.body.schema)) || hasType("Files", unwrapImportSchema(validator.body.schema)))) {
        let validateFile2 = "", i = 0;
        for (let [k2, v] of Object.entries(unwrapImportSchema(validator.body.schema).properties)) {
          if (!v.extension || v[Kind] !== "File" && v[Kind] !== "Files")
            continue;
          if (i)
            validateFile2 += ",";
          validateFile2 += `fileType(c.body.${k2},${JSON.stringify(v.extension)},'body.${k2}')`, i++;
        }
        if (i)
          fnLiteral += `
`;
        if (i === 1)
          fnLiteral += `await ${validateFile2}
`;
        else if (i > 1)
          fnLiteral += `await Promise.all([${validateFile2}])
`;
      }
    }
    if (validator.cookie) {
      if (validator.cookie.config = mergeCookie(validator.cookie.config, validator.cookie?.config ?? {}), fnLiteral += `let cookieValue={}
for(const [key,value] of Object.entries(c.cookie))cookieValue[key]=value.value
`, validator.cookie.isOptional)
        fnLiteral += "if(isNotEmpty(c.cookie)){";
      if (validator.cookie.provider === "standard")
        fnLiteral += `let vac=validator.cookie.Check(cookieValue)
if(vac instanceof Promise)vac=await vac
if(vac.issues){` + validation.validate("cookie", undefined, "vac.issues") + `}else{cookieValue=vac.value}
`, fnLiteral += `for(const k of Object.keys(cookieValue))c.cookie[k].value=cookieValue[k]
`;
      else if (validator.body?.schema?.noValidate !== true) {
        if (fnLiteral += "if(validator.cookie.Check(cookieValue)===false){" + validation.validate("cookie", "cookieValue") + "}", validator.cookie.hasTransform)
          fnLiteral += coerceTransformDecodeError("for(const [key,value] of Object.entries(validator.cookie.Decode(cookieValue))){c.cookie[key].cookie.value = value}", "cookie", allowUnsafeValidationDetails);
      }
      if (validator.cookie.isOptional)
        fnLiteral += "}";
    }
  }
  if (hooks?.beforeHandle || hasTrace) {
    let reporter = report("beforeHandle", { total: hooks.beforeHandle?.length }), hasResolve = false;
    if (hooks.beforeHandle?.length)
      for (let i = 0;i < hooks.beforeHandle.length; i++) {
        let beforeHandle = hooks.beforeHandle[i], endUnit = reporter.resolveChild(beforeHandle.fn.name), returning = hasReturn(beforeHandle);
        if (beforeHandle.subType === "resolve" || beforeHandle.subType === "mapResolve") {
          if (!hasResolve)
            hasResolve = true, fnLiteral += `
let resolved
`;
          if (fnLiteral += isAsync(beforeHandle) ? `resolved=await e.beforeHandle[${i}](c);
` : `resolved=e.beforeHandle[${i}](c);
`, beforeHandle.subType === "mapResolve")
            fnLiteral += "if(resolved instanceof ElysiaCustomStatusResponse){" + mapResponse2("resolved") + `}else{resolved.request=c.request
resolved.store=c.store
resolved.qi=c.qi
resolved.path=c.path
resolved.url=c.url
resolved.redirect=c.redirect
resolved.set=c.set
resolved.error=c.error
c=resolved}`;
          else
            fnLiteral += "if(resolved instanceof ElysiaCustomStatusResponse){" + mapResponse2("resolved") + `}else Object.assign(c, resolved)
`;
          endUnit();
        } else if (!returning)
          fnLiteral += isAsync(beforeHandle) ? `await e.beforeHandle[${i}](c)
` : `e.beforeHandle[${i}](c)
`, endUnit();
        else {
          if (fnLiteral += isAsync(beforeHandle) ? `be=await e.beforeHandle[${i}](c)
` : `be=e.beforeHandle[${i}](c)
`, endUnit("be"), fnLiteral += "if(be!==undefined){", reporter.resolve(), hooks.afterHandle?.length || hasTrace) {
            report("handle", { name: isHandleFn ? handler.name : undefined }).resolve();
            let reporter2 = report("afterHandle", { total: hooks.afterHandle?.length });
            if (hooks.afterHandle?.length)
              for (let i2 = 0;i2 < hooks.afterHandle.length; i2++) {
                let hook = hooks.afterHandle[i2], returning2 = hasReturn(hook), endUnit2 = reporter2.resolveChild(hook.fn.name);
                if (fnLiteral += `c.response=c.responseValue=be
`, !returning2)
                  fnLiteral += isAsync(hook.fn) ? `await e.afterHandle[${i2}](c, be)
` : `e.afterHandle[${i2}](c, be)
`;
                else
                  fnLiteral += isAsync(hook.fn) ? `af=await e.afterHandle[${i2}](c)
` : `af=e.afterHandle[${i2}](c)
`, fnLiteral += `if(af!==undefined) c.response=c.responseValue=be=af
`;
                endUnit2("af");
              }
            reporter2.resolve();
          }
          if (validator.response)
            fnLiteral += validation.response("be");
          let mapResponseReporter = report("mapResponse", { total: hooks.mapResponse?.length });
          if (hooks.mapResponse?.length) {
            fnLiteral += `c.response=c.responseValue=be
`;
            for (let i2 = 0;i2 < hooks.mapResponse.length; i2++) {
              let mapResponse3 = hooks.mapResponse[i2], endUnit2 = mapResponseReporter.resolveChild(mapResponse3.fn.name);
              fnLiteral += `if(mr===undefined){mr=${isAsyncName(mapResponse3) ? "await " : ""}e.mapResponse[${i2}](c)
if(mr!==undefined)be=c.response=c.responseValue=mr}`, endUnit2();
            }
          }
          mapResponseReporter.resolve(), fnLiteral += afterResponse(), fnLiteral += encodeCookie(), fnLiteral += `return mapEarlyResponse(${saveResponse}be,c.set${mapResponseContext})}
`;
        }
      }
    reporter.resolve();
  }
  function reportHandler(name) {
    let handleReporter = report("handle", { name, alias: "reportHandler" });
    return () => {
      if (hasTrace)
        fnLiteral += 'if(r&&(r[Symbol.iterator]||r[Symbol.asyncIterator])&&typeof r.next==="function"){' + (maybeAsync ? "" : "(async()=>{") + `const stream=await tee(r,3)
r=stream[0]
const listener=stream[1]
` + (hasTrace || hooks.afterResponse?.length ? `afterHandlerStreamListener=stream[2]
` : "") + `${setImmediateFn}(async ()=>{if(listener)for await(const v of listener){}
`, handleReporter.resolve(), fnLiteral += "})" + (maybeAsync ? "" : "})()") + "}else{", handleReporter.resolve(), fnLiteral += `}
`;
    };
  }
  if (hooks.afterHandle?.length || hasTrace) {
    let resolveHandler = reportHandler(isHandleFn ? handler.name : undefined);
    if (hooks.afterHandle?.length)
      fnLiteral += isAsyncHandler ? `let r=c.response=c.responseValue=await ${handle}
` : `let r=c.response=c.responseValue=${handle}
`;
    else
      fnLiteral += isAsyncHandler ? `let r=await ${handle}
` : `let r=${handle}
`;
    resolveHandler();
    let reporter = report("afterHandle", { total: hooks.afterHandle?.length });
    if (hooks.afterHandle?.length)
      for (let i = 0;i < hooks.afterHandle.length; i++) {
        let hook = hooks.afterHandle[i], returning = hasReturn(hook), endUnit = reporter.resolveChild(hook.fn.name);
        if (!returning)
          fnLiteral += isAsync(hook.fn) ? `await e.afterHandle[${i}](c)
` : `e.afterHandle[${i}](c)
`, endUnit();
        else if (fnLiteral += isAsync(hook.fn) ? `af=await e.afterHandle[${i}](c)
` : `af=e.afterHandle[${i}](c)
`, endUnit("af"), validator.response)
          fnLiteral += "if(af!==undefined){", reporter.resolve(), fnLiteral += validation.response("af"), fnLiteral += "c.response=c.responseValue=af}";
        else
          fnLiteral += "if(af!==undefined){", reporter.resolve(), fnLiteral += "c.response=c.responseValue=af}";
      }
    if (reporter.resolve(), hooks.afterHandle?.length)
      fnLiteral += `r=c.response
`;
    if (validator.response)
      fnLiteral += validation.response();
    fnLiteral += encodeCookie();
    let mapResponseReporter = report("mapResponse", { total: hooks.mapResponse?.length });
    if (hooks.mapResponse?.length)
      for (let i = 0;i < hooks.mapResponse.length; i++) {
        let mapResponse3 = hooks.mapResponse[i], endUnit = mapResponseReporter.resolveChild(mapResponse3.fn.name);
        fnLiteral += `mr=${isAsyncName(mapResponse3) ? "await " : ""}e.mapResponse[${i}](c)
if(mr!==undefined)r=c.response=c.responseValue=mr
`, endUnit();
      }
    mapResponseReporter.resolve(), fnLiteral += mapResponse2();
  } else {
    let resolveHandler = reportHandler(isHandleFn ? handler.name : undefined);
    if (validator.response || hooks.mapResponse?.length || hasTrace) {
      if (fnLiteral += isAsyncHandler ? `let r=await ${handle}
` : `let r=${handle}
`, resolveHandler(), validator.response)
        fnLiteral += validation.response();
      let mapResponseReporter = report("mapResponse", { total: hooks.mapResponse?.length });
      if (hooks.mapResponse?.length) {
        fnLiteral += `
c.response=c.responseValue=r
`;
        for (let i = 0;i < hooks.mapResponse.length; i++) {
          let mapResponse3 = hooks.mapResponse[i], endUnit = mapResponseReporter.resolveChild(mapResponse3.fn.name);
          fnLiteral += `
if(mr===undefined){mr=${isAsyncName(mapResponse3) ? "await " : ""}e.mapResponse[${i}](c)
if(mr!==undefined)r=c.response=c.responseValue=mr}
`, endUnit();
        }
      }
      if (mapResponseReporter.resolve(), fnLiteral += encodeCookie(), handler instanceof Response)
        fnLiteral += afterResponse(), fnLiteral += inference.set ? `if(isNotEmpty(c.set.headers)||c.set.status!==200||c.set.redirect||c.set.cookie)return mapResponse(${saveResponse}${handle}.clone(),c.set${mapResponseContext})
else return ${handle}.clone()` : `return ${handle}.clone()`, fnLiteral += `
`;
      else
        fnLiteral += mapResponse2();
    } else if (hasCookie || hasTrace) {
      fnLiteral += isAsyncHandler ? `let r=await ${handle}
` : `let r=${handle}
`, resolveHandler();
      let mapResponseReporter = report("mapResponse", { total: hooks.mapResponse?.length });
      if (hooks.mapResponse?.length) {
        fnLiteral += `c.response=c.responseValue= r
`;
        for (let i = 0;i < hooks.mapResponse.length; i++) {
          let mapResponse3 = hooks.mapResponse[i], endUnit = mapResponseReporter.resolveChild(mapResponse3.fn.name);
          fnLiteral += `if(mr===undefined){mr=${isAsyncName(mapResponse3) ? "await " : ""}e.mapResponse[${i}](c)
if(mr!==undefined)r=c.response=c.responseValue=mr}`, endUnit();
        }
      }
      mapResponseReporter.resolve(), fnLiteral += encodeCookie() + mapResponse2();
    } else {
      resolveHandler();
      let handled = isAsyncHandler ? `await ${handle}` : handle;
      if (handler instanceof Response)
        fnLiteral += afterResponse(), fnLiteral += inference.set ? `if(isNotEmpty(c.set.headers)||c.set.status!==200||c.set.redirect||c.set.cookie)return mapResponse(${saveResponse}${handle}.clone(),c.set${mapResponseContext})
else return ${handle}.clone()
` : `return ${handle}.clone()
`;
      else
        fnLiteral += mapResponse2(handled);
    }
  }
  if (fnLiteral += `
}catch(error){`, !maybeAsync && hooks.error?.length)
    fnLiteral += "return(async()=>{";
  if (fnLiteral += `const set=c.set
if(!set.status||set.status<300)set.status=error?.status||500
`, hasCookie)
    fnLiteral += encodeCookie();
  if (hasTrace && hooks.trace)
    for (let i = 0;i < hooks.trace.length; i++)
      fnLiteral += `report${i}?.resolve(error);reportChild${i}?.(error)
`;
  let errorReporter = report("error", { total: hooks.error?.length });
  if (hooks.error?.length) {
    if (fnLiteral += `c.error=error
`, hasValidation)
      fnLiteral += `if(error instanceof TypeBoxError){c.code="VALIDATION"
c.set.status=422}else{c.code=error.code??error[ERROR_CODE]??"UNKNOWN"}`;
    else
      fnLiteral += `c.code=error.code??error[ERROR_CODE]??"UNKNOWN"
`;
    if (fnLiteral += `let er
`, hooks.mapResponse?.length)
      fnLiteral += `let mep
`;
    for (let i = 0;i < hooks.error.length; i++) {
      let endUnit = errorReporter.resolveChild(hooks.error[i].fn.name);
      if (isAsync(hooks.error[i]))
        fnLiteral += `er=await e.error[${i}](c)
`;
      else
        fnLiteral += `er=e.error[${i}](c)
if(er instanceof Promise)er=await er
`;
      if (endUnit(), hooks.mapResponse?.length) {
        let mapResponseReporter = report("mapResponse", { total: hooks.mapResponse?.length });
        for (let i2 = 0;i2 < hooks.mapResponse.length; i2++) {
          let mapResponse3 = hooks.mapResponse[i2], endUnit2 = mapResponseReporter.resolveChild(mapResponse3.fn.name);
          fnLiteral += `c.response=c.responseValue=er
mep=e.mapResponse[${i2}](c)
if(mep instanceof Promise)er=await er
if(mep!==undefined)er=mep
`, endUnit2();
        }
        mapResponseReporter.resolve();
      }
      if (fnLiteral += `er=mapEarlyResponse(er,set${mapResponseContext})
`, fnLiteral += "if(er){", hasTrace && hooks.trace) {
        for (let i2 = 0;i2 < hooks.trace.length; i2++)
          fnLiteral += `report${i2}.resolve()
`;
        errorReporter.resolve();
      }
      fnLiteral += afterResponse(false), fnLiteral += "return er}";
    }
  }
  if (errorReporter.resolve(), fnLiteral += "return handleError(c,error,true)", !maybeAsync && hooks.error?.length)
    fnLiteral += "})()";
  fnLiteral += "}";
  let adapterVariables = adapter.inject ? Object.keys(adapter.inject).join(",") + "," : "", init = "const {handler,handleError,hooks:e, " + allocateIf("validator,", hasValidation) + "mapResponse,mapCompactResponse,mapEarlyResponse,isNotEmpty,utils:{" + allocateIf("parseQuery,", hasBody) + allocateIf("parseQueryFromURL,", hasQuery) + "},error:{" + allocateIf("ValidationError,", hasValidation) + allocateIf("ParseError", hasBody) + "},fileType,schema,definitions,tee,ERROR_CODE," + allocateIf("parseCookie,", hasCookie) + allocateIf("signCookie,", hasCookie) + allocateIf("decodeURIComponent,", hasQuery) + "ElysiaCustomStatusResponse," + allocateIf("ELYSIA_TRACE,", hasTrace) + allocateIf("ELYSIA_REQUEST_ID,", hasTrace) + allocateIf("parser,", hooks.parse?.length) + allocateIf("getServer,", inference.server) + allocateIf("fileUnions,", fileUnions.length) + adapterVariables + allocateIf("TypeBoxError", hasValidation) + `}=hooks
const trace=e.trace
return ${maybeAsync ? "async " : ""}function handle(c){`;
  if (hooks.beforeHandle?.length)
    init += `let be
`;
  if (hooks.afterHandle?.length)
    init += `let af
`;
  if (hooks.mapResponse?.length)
    init += `let mr
`;
  if (allowMeta)
    init += `c.schema=schema
c.defs=definitions
`;
  fnLiteral = init + fnLiteral + "}", init = "";
  try {
    return Function("hooks", `"use strict";
` + fnLiteral)({ handler, hooks: lifeCycleToFn(hooks), validator: hasValidation ? validator : undefined, handleError: app.handleError, mapResponse: adapterHandler.mapResponse, mapCompactResponse: adapterHandler.mapCompactResponse, mapEarlyResponse: adapterHandler.mapEarlyResponse, isNotEmpty, utils: { parseQuery: hasBody ? parseQuery : undefined, parseQueryFromURL: hasQuery ? validator.query?.provider === "standard" ? parseQueryStandardSchema : parseQueryFromURL : undefined }, error: { ValidationError: hasValidation ? ValidationError : undefined, ParseError: hasBody ? ParseError2 : undefined }, fileType, schema: app.router.history, definitions: app.definitions.type, tee, ERROR_CODE, parseCookie: hasCookie ? parseCookie : undefined, signCookie: hasCookie ? signCookie : undefined, Cookie: hasCookie ? Cookie : undefined, decodeURIComponent: hasQuery ? import_fast_decode_uri_component3.default : undefined, ElysiaCustomStatusResponse, ELYSIA_TRACE: hasTrace ? ELYSIA_TRACE : undefined, ELYSIA_REQUEST_ID: hasTrace ? ELYSIA_REQUEST_ID : undefined, getServer: inference.server ? () => app.getServer() : undefined, fileUnions: fileUnions.length ? fileUnions : undefined, TypeBoxError: hasValidation ? TypeBoxError : undefined, parser: app["~parser"], ...adapter.inject });
  } catch (error) {
    let debugHooks = lifeCycleToFn(hooks);
    if (console.log("[Composer] failed to generate optimized handler"), console.log("---"), console.log({ handler: typeof handler === "function" ? handler.toString() : handler, instruction: fnLiteral, hooks: { ...debugHooks, transform: debugHooks?.transform?.map?.((x) => x.toString()), resolve: debugHooks?.resolve?.map?.((x) => x.toString()), beforeHandle: debugHooks?.beforeHandle?.map?.((x) => x.toString()), afterHandle: debugHooks?.afterHandle?.map?.((x) => x.toString()), mapResponse: debugHooks?.mapResponse?.map?.((x) => x.toString()), parse: debugHooks?.parse?.map?.((x) => x.toString()), error: debugHooks?.error?.map?.((x) => x.toString()), afterResponse: debugHooks?.afterResponse?.map?.((x) => x.toString()), stop: debugHooks?.stop?.map?.((x) => x.toString()) }, validator, definitions: app.definitions.type, error }), console.log("---"), typeof process?.exit === "function")
      process.exit(1);
    return () => new Response("Internal Server Error", { status: 500 });
  }
};
var createOnRequestHandler = (app, addFn) => {
  let fnLiteral = "", reporter = createReport({ trace: app.event.trace, addFn: addFn ?? ((word) => {
    fnLiteral += word;
  }) })("request", { total: app.event.request?.length });
  if (app.event.request?.length) {
    fnLiteral += "try{";
    for (let i = 0;i < app.event.request.length; i++) {
      let hook = app.event.request[i], withReturn = hasReturn(hook), maybeAsync = isAsync(hook), endUnit = reporter.resolveChild(app.event.request[i].fn.name);
      if (withReturn)
        fnLiteral += `re=mapEarlyResponse(${maybeAsync ? "await " : ""}onRequest[${i}](c),c.set)
`, endUnit("re"), fnLiteral += `if(re!==undefined)return re
`;
      else
        fnLiteral += `${maybeAsync ? "await " : ""}onRequest[${i}](c)
`, endUnit();
    }
    fnLiteral += "}catch(error){return app.handleError(c,error,false)}";
  }
  return reporter.resolve(), fnLiteral;
};
var createHoc = (app, fnName = "map") => {
  let hoc = app.extender.higherOrderFunctions;
  if (!hoc.length)
    return "return " + fnName;
  let adapter = app["~adapter"].composeGeneralHandler, handler = fnName;
  for (let i = 0;i < hoc.length; i++)
    handler = `hoc[${i}](${handler},${adapter.parameters})`;
  return `return function hocMap(${adapter.parameters}){return ${handler}(${adapter.parameters})}`;
};
var composeGeneralHandler = (app) => {
  let adapter = app["~adapter"].composeGeneralHandler;
  app.router.http.build();
  let isWebstandard = app["~adapter"].isWebStandard, hasTrace = app.event.trace?.length, fnLiteral = "", router = app.router, findDynamicRoute = router.http.root.WS ? "const route=router.find(r.method==='GET'&&r.headers.get('upgrade')==='websocket'?'WS':r.method,p)" : "const route=router.find(r.method,p)";
  if (findDynamicRoute += router.http.root.ALL ? `??router.find('ALL',p)
` : `
`, isWebstandard)
    findDynamicRoute += 'if(r.method==="HEAD"){const route=router.find("GET",p);if(route){c.params=route.params;const _res=route.store.handler?route.store.handler(c):route.store.compile()(c);if(_res)return Promise.resolve(_res).then((_res)=>{if(!_res.headers)_res.headers=new Headers();return getResponseLength(_res).then((length)=>{_res.headers.set("content-length", length);return new Response(null,{status:_res.status,statusText:_res.statusText,headers:_res.headers});})});}}';
  let afterResponse = `c.error=notFound
`;
  if (app.event.afterResponse?.length && !app.event.error) {
    afterResponse = `
c.error=notFound
`;
    let prefix = app.event.afterResponse.some(isAsync) ? "async" : "";
    afterResponse += `
${setImmediateFn}(${prefix}()=>{if(c.responseValue instanceof ElysiaCustomStatusResponse) c.set.status=c.responseValue.code
`;
    for (let i = 0;i < app.event.afterResponse.length; i++) {
      let fn2 = app.event.afterResponse[i].fn;
      afterResponse += `
${isAsyncName(fn2) ? "await " : ""}afterResponse[${i}](c)
`;
    }
    afterResponse += `})
`;
  }
  if (app.inference.query)
    afterResponse += `
if(c.qi===-1){c.query={}}else{c.query=parseQueryFromURL(c.url,c.qi+1)}`;
  let error404 = adapter.error404(!!app.event.request?.length, !!app.event.error?.length, afterResponse);
  findDynamicRoute += error404.code, findDynamicRoute += `
c.params=route.params
if(route.store.handler)return route.store.handler(c)
return route.store.compile()(c)
`;
  let switchMap = "";
  for (let [path, methods] of Object.entries(router.static)) {
    if (switchMap += `case'${path}':`, app.config.strictPath !== true)
      switchMap += `case'${getLoosePath(path)}':`;
    let encoded = encodePath(path);
    if (path !== encoded)
      switchMap += `case'${encoded}':`;
    if (switchMap += "switch(r.method){", "GET" in methods || "WS" in methods) {
      if (switchMap += "case 'GET':", "WS" in methods) {
        if (switchMap += `if(r.headers.get('upgrade')==='websocket')return ht[${methods.WS}].composed(c)
`, "GET" in methods === false)
          if ("ALL" in methods)
            switchMap += `return ht[${methods.ALL}].composed(c)
`;
          else
            switchMap += `break map
`;
      }
      if ("GET" in methods)
        switchMap += `return ht[${methods.GET}].composed(c)
`;
    }
    if (isWebstandard && (("GET" in methods) || ("ALL" in methods)) && "HEAD" in methods === false)
      switchMap += `case 'HEAD':return Promise.resolve(ht[${methods.GET ?? methods.ALL}].composed(c)).then(_ht=>getResponseLength(_ht).then((length)=>{_ht.headers.set('content-length', length)
return new Response(null,{status:_ht.status,statusText:_ht.statusText,headers:_ht.headers})
}))
`;
    for (let [method, index] of Object.entries(methods)) {
      if (method === "ALL" || method === "GET" || method === "WS")
        continue;
      switchMap += `case '${method}':return ht[${index}].composed(c)
`;
    }
    if ("ALL" in methods)
      switchMap += `default:return ht[${methods.ALL}].composed(c)
`;
    else
      switchMap += `default:break map
`;
    switchMap += "}";
  }
  let maybeAsync = !!app.event.request?.some(isAsync), adapterVariables = adapter.inject ? Object.keys(adapter.inject).join(",") + "," : "";
  if (fnLiteral += `
const {app,mapEarlyResponse,NotFoundError,randomId,handleError,status,redirect,getResponseLength,ElysiaCustomStatusResponse,` + allocateIf("parseQueryFromURL,", app.inference.query) + allocateIf("ELYSIA_TRACE,", hasTrace) + allocateIf("ELYSIA_REQUEST_ID,", hasTrace) + adapterVariables + `}=data
const store=app.singleton.store
const decorator=app.singleton.decorator
const staticRouter=app.router.static.http
const ht=app.router.history
const router=app.router.http
const trace=app.event.trace?.map(x=>typeof x==='function'?x:x.fn)??[]
const notFound=new NotFoundError()
const hoc=app.extender.higherOrderFunctions.map(x=>x.fn)
`, app.event.request?.length)
    fnLiteral += `const onRequest=app.event.request.map(x=>x.fn)
`;
  if (app.event.afterResponse?.length)
    fnLiteral += `const afterResponse=app.event.afterResponse.map(x=>x.fn)
`;
  if (fnLiteral += error404.declare, app.event.trace?.length)
    fnLiteral += "const " + app.event.trace.map((_2, i) => `tr${i}=app.event.trace[${i}].fn`).join(",") + `
`;
  if (fnLiteral += `${maybeAsync ? "async " : ""}function map(${adapter.parameters}){`, app.event.request?.length)
    fnLiteral += `let re
`;
  if (fnLiteral += adapter.createContext(app), app.event.trace?.length)
    fnLiteral += "c[ELYSIA_TRACE]=[" + app.event.trace.map((_2, i) => `tr${i}(c)`).join(",") + `]
`;
  if (fnLiteral += createOnRequestHandler(app), switchMap)
    fnLiteral += `
map: switch(p){
` + switchMap + "}";
  fnLiteral += findDynamicRoute + `}
` + createHoc(app);
  let handleError = composeErrorHandler(app);
  app.handleError = handleError;
  let fn = Function("data", `"use strict";
` + fnLiteral)({ app, mapEarlyResponse: app["~adapter"].handler.mapEarlyResponse, NotFoundError, randomId, handleError, status, redirect, getResponseLength, ElysiaCustomStatusResponse, parseQueryFromURL: app.inference.query ? parseQueryFromURL : undefined, ELYSIA_TRACE: hasTrace ? ELYSIA_TRACE : undefined, ELYSIA_REQUEST_ID: hasTrace ? ELYSIA_REQUEST_ID : undefined, ...adapter.inject });
  if (isBun)
    Bun.gc(false);
  return fn;
};
var composeErrorHandler = (app) => {
  let hooks = app.event, fnLiteral = "", adapter = app["~adapter"].composeError, adapterVariables = adapter.inject ? Object.keys(adapter.inject).join(",") + "," : "", hasTrace = !!app.event.trace?.length;
  if (fnLiteral += "const {mapResponse,ERROR_CODE,ElysiaCustomStatusResponse,ValidationError,TransformDecodeError," + allocateIf("onError,", app.event.error) + allocateIf("afterResponse,", app.event.afterResponse) + allocateIf("trace,", app.event.trace) + allocateIf("onMapResponse,", app.event.mapResponse) + allocateIf("ELYSIA_TRACE,", hasTrace) + allocateIf("ELYSIA_REQUEST_ID,", hasTrace) + adapterVariables + `}=inject
`, fnLiteral += "return async function(context,error,skipGlobal){", fnLiteral += "", hasTrace)
    fnLiteral += `const id=context[ELYSIA_REQUEST_ID]
`;
  let report = createReport({ context: "context", trace: hooks.trace, addFn: (word) => {
    fnLiteral += word;
  } }), afterResponse = () => {
    if (!hooks.afterResponse?.length && !hasTrace)
      return "";
    let afterResponse2 = "", prefix = hooks.afterResponse?.some(isAsync) ? "async" : "";
    afterResponse2 += `
${setImmediateFn}(${prefix}()=>{`;
    let reporter = createReport({ context: "context", trace: hooks.trace, addFn: (word) => {
      afterResponse2 += word;
    } })("afterResponse", { total: hooks.afterResponse?.length, name: "context" });
    if (hooks.afterResponse?.length && hooks.afterResponse)
      for (let i = 0;i < hooks.afterResponse.length; i++) {
        let fn = hooks.afterResponse[i].fn, endUnit = reporter.resolveChild(fn.name);
        afterResponse2 += `
${isAsyncName(fn) ? "await " : ""}afterResponse[${i}](context)
`, endUnit();
      }
    return reporter.resolve(), afterResponse2 += `})
`, afterResponse2;
  };
  if (fnLiteral += `const set=context.set
let _r
if(!context.code)context.code=error.code??error[ERROR_CODE]
if(!(context.error instanceof Error))context.error=error
if(error instanceof ElysiaCustomStatusResponse){set.status=error.status=error.code
error.message=error.response}`, adapter.declare)
    fnLiteral += adapter.declare;
  let saveResponse = hasTrace || !!hooks.afterResponse?.length ? "context.response = " : "";
  if (fnLiteral += `if(typeof error?.toResponse==='function'&&!(error instanceof ValidationError)&&!(error instanceof TransformDecodeError)){try{let raw=error.toResponse()
if(typeof raw?.then==='function')raw=await raw
if(raw instanceof Response)set.status=raw.status
context.response=context.responseValue=raw
}catch(toResponseError){
}
}
`, app.event.error)
    for (let i = 0;i < app.event.error.length; i++) {
      let handler = app.event.error[i], response = `${isAsync(handler) ? "await " : ""}onError[${i}](context)
`;
      if (fnLiteral += "if(skipGlobal!==true&&!context.response){", hasReturn(handler)) {
        fnLiteral += `_r=${response}
if(_r!==undefined){if(_r instanceof Response){` + afterResponse() + `return mapResponse(_r,set${adapter.mapResponseContext})}if(_r instanceof ElysiaCustomStatusResponse){error.status=error.code
error.message=error.response}if(set.status===200||!set.status)set.status=error.status
`;
        let mapResponseReporter2 = report("mapResponse", { total: hooks.mapResponse?.length, name: "context" });
        if (hooks.mapResponse?.length)
          for (let i2 = 0;i2 < hooks.mapResponse.length; i2++) {
            let mapResponse2 = hooks.mapResponse[i2], endUnit = mapResponseReporter2.resolveChild(mapResponse2.fn.name);
            fnLiteral += `context.response=context.responseValue=_r
_r=${isAsyncName(mapResponse2) ? "await " : ""}onMapResponse[${i2}](context)
`, endUnit();
          }
        mapResponseReporter2.resolve(), fnLiteral += afterResponse() + `return mapResponse(${saveResponse}_r,set${adapter.mapResponseContext})}`;
      } else
        fnLiteral += response;
      fnLiteral += "}";
    }
  fnLiteral += `if(error instanceof ValidationError||error instanceof TransformDecodeError){
if(error.error)error=error.error
set.status=error.status??422
` + afterResponse() + adapter.validationError + `
}
`, fnLiteral += "if(!context.response&&error instanceof Error){" + afterResponse() + adapter.unknownError + `
}`;
  let mapResponseReporter = report("mapResponse", { total: hooks.mapResponse?.length, name: "context" });
  if (fnLiteral += `
if(!context.response)context.response=context.responseValue=error.message??error
`, hooks.mapResponse?.length) {
    fnLiteral += `let mr
`;
    for (let i = 0;i < hooks.mapResponse.length; i++) {
      let mapResponse2 = hooks.mapResponse[i], endUnit = mapResponseReporter.resolveChild(mapResponse2.fn.name);
      fnLiteral += `if(mr===undefined){mr=${isAsyncName(mapResponse2) ? "await " : ""}onMapResponse[${i}](context)
if(mr!==undefined)error=context.response=context.responseValue=mr}`, endUnit();
    }
  }
  mapResponseReporter.resolve(), fnLiteral += afterResponse() + `
return mapResponse(${saveResponse}error,set${adapter.mapResponseContext})}`;
  let mapFn = (x) => typeof x === "function" ? x : x.fn;
  return Function("inject", `"use strict";
` + fnLiteral)({ mapResponse: app["~adapter"].handler.mapResponse, ERROR_CODE, ElysiaCustomStatusResponse, ValidationError, TransformDecodeError, onError: app.event.error?.map(mapFn), afterResponse: app.event.afterResponse?.map(mapFn), trace: app.event.trace?.map(mapFn), onMapResponse: app.event.mapResponse?.map(mapFn), ELYSIA_TRACE: hasTrace ? ELYSIA_TRACE : undefined, ELYSIA_REQUEST_ID: hasTrace ? ELYSIA_REQUEST_ID : undefined, ...adapter.inject });
};
function isCloudflareWorker() {
  try {
    if (typeof caches < "u" && typeof caches.default < "u")
      return true;
    if (typeof WebSocketPair < "u")
      return true;
  } catch {
    return false;
  }
  return false;
}
var CloudflareAdapter = { ...WebStandardAdapter, name: "cloudflare-worker", composeGeneralHandler: { ...WebStandardAdapter.composeGeneralHandler, error404(hasEventHook, hasErrorHook, afterHandle) {
  let { code } = WebStandardAdapter.composeGeneralHandler.error404(hasEventHook, hasErrorHook, afterHandle);
  return { code, declare: hasErrorHook ? "" : `const error404Message=notFound.message.toString()
const error404={clone:()=>new Response(error404Message,{status:404})}
` };
} }, beforeCompile(app) {
  app.handleError = composeErrorHandler(app);
  for (let route of app.routes)
    route.compile();
}, listen() {
  return () => {
    console.warn("Cloudflare Worker does not support listen method. Please export default Elysia instance instead.");
  };
} };
var separateFunction = (code) => {
  if (code.startsWith("async"))
    code = code.slice(5);
  code = code.trimStart();
  let index = -1;
  if (code.charCodeAt(0) === 40) {
    if (index = code.indexOf("=>", code.indexOf(")")), index !== -1) {
      let bracketEndIndex = index;
      while (bracketEndIndex > 0)
        if (code.charCodeAt(--bracketEndIndex) === 41)
          break;
      let body = code.slice(index + 2);
      if (body.charCodeAt(0) === 32)
        body = body.trimStart();
      return [code.slice(1, bracketEndIndex), body, { isArrowReturn: body.charCodeAt(0) !== 123 }];
    }
  }
  if (/^(\w+)=>/g.test(code)) {
    if (index = code.indexOf("=>"), index !== -1) {
      let body = code.slice(index + 2);
      if (body.charCodeAt(0) === 32)
        body = body.trimStart();
      return [code.slice(0, index), body, { isArrowReturn: body.charCodeAt(0) !== 123 }];
    }
  }
  if (code.startsWith("function")) {
    index = code.indexOf("(");
    let end = code.indexOf(")");
    return [code.slice(index + 1, end), code.slice(end + 2), { isArrowReturn: false }];
  }
  let start = code.indexOf("(");
  if (start !== -1) {
    let sep = code.indexOf(`
`, 2), parameter = code.slice(0, sep), end = parameter.lastIndexOf(")") + 1, body = code.slice(sep + 1);
    return [parameter.slice(start, end), "{" + body, { isArrowReturn: false }];
  }
  let x = code.split(`
`, 2);
  return [x[0], x[1], { isArrowReturn: false }];
};
var bracketPairRange = (parameter) => {
  let start = parameter.indexOf("{");
  if (start === -1)
    return [-1, 0];
  let end = start + 1, deep = 1;
  for (;end < parameter.length; end++) {
    let char = parameter.charCodeAt(end);
    if (char === 123)
      deep++;
    else if (char === 125)
      deep--;
    if (deep === 0)
      break;
  }
  if (deep !== 0)
    return [0, parameter.length];
  return [start, end + 1];
};
var bracketPairRangeReverse = (parameter) => {
  let end = parameter.lastIndexOf("}");
  if (end === -1)
    return [-1, 0];
  let start = end - 1, deep = 1;
  for (;start >= 0; start--) {
    let char = parameter.charCodeAt(start);
    if (char === 125)
      deep++;
    else if (char === 123)
      deep--;
    if (deep === 0)
      break;
  }
  if (deep !== 0)
    return [-1, 0];
  return [start, end + 1];
};
var removeColonAlias = (parameter) => {
  while (true) {
    let start = parameter.indexOf(":");
    if (start === -1)
      break;
    let end = parameter.indexOf(",", start);
    if (end === -1)
      end = parameter.indexOf("}", start) - 1;
    if (end === -2)
      end = parameter.length;
    parameter = parameter.slice(0, start) + parameter.slice(end);
  }
  return parameter;
};
var retrieveRootParamters = (parameter) => {
  let hasParenthesis = false;
  if (parameter.charCodeAt(0) === 40)
    parameter = parameter.slice(1, -1);
  if (parameter.charCodeAt(0) === 123)
    hasParenthesis = true, parameter = parameter.slice(1, -1);
  parameter = parameter.replace(/( |\t|\n)/g, "").trim();
  let parameters = [];
  while (true) {
    let [start, end] = bracketPairRange(parameter);
    if (start === -1)
      break;
    if (parameters.push(parameter.slice(0, start - 1)), parameter.charCodeAt(end) === 44)
      end++;
    parameter = parameter.slice(end);
  }
  if (parameter = removeColonAlias(parameter), parameter)
    parameters = parameters.concat(parameter.split(","));
  let parameterMap = Object.create(null);
  for (let p of parameters) {
    if (p.indexOf(",") === -1) {
      parameterMap[p] = true;
      continue;
    }
    for (let q of p.split(","))
      parameterMap[q.trim()] = true;
  }
  return { hasParenthesis, parameters: parameterMap };
};
var findParameterReference = (parameter, inference) => {
  let { parameters, hasParenthesis } = retrieveRootParamters(parameter);
  if (parameters.query)
    inference.query = true;
  if (parameters.headers)
    inference.headers = true;
  if (parameters.body)
    inference.body = true;
  if (parameters.cookie)
    inference.cookie = true;
  if (parameters.set)
    inference.set = true;
  if (parameters.server)
    inference.server = true;
  if (parameters.route)
    inference.route = true;
  if (parameters.url)
    inference.url = true;
  if (parameters.path)
    inference.path = true;
  if (hasParenthesis)
    return `{ ${Object.keys(parameters).join(", ")} }`;
  return Object.keys(parameters).join(", ");
};
var findEndIndex = (type, content, index) => {
  let regex2 = new RegExp(`${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\n\\t,; ]`);
  if (index !== undefined)
    regex2.lastIndex = index;
  let match = regex2.exec(content);
  return match ? match.index : -1;
};
var findAlias = (type, body, depth = 0) => {
  if (depth > 5)
    return [];
  let aliases = [], content = body;
  while (true) {
    let index = findEndIndex(" = " + type, content);
    if (index === -1)
      index = findEndIndex("=" + type, content);
    if (index === -1) {
      let lastIndex = content.indexOf(" = " + type);
      if (lastIndex === -1)
        lastIndex = content.indexOf("=" + type);
      if (lastIndex + 3 + type.length !== content.length)
        break;
      index = lastIndex;
    }
    let part = content.slice(0, index), lastPart = part.lastIndexOf(" "), variable = part.slice(lastPart !== -1 ? lastPart + 1 : -1);
    if (variable === "}") {
      let [start, end] = bracketPairRangeReverse(part);
      aliases.push(removeColonAlias(content.slice(start, end))), content = content.slice(index + 3 + type.length);
      continue;
    }
    while (variable.charCodeAt(0) === 44)
      variable = variable.slice(1);
    while (variable.charCodeAt(0) === 9)
      variable = variable.slice(1);
    if (!variable.includes("("))
      aliases.push(variable);
    content = content.slice(index + 3 + type.length);
  }
  for (let alias of aliases) {
    if (alias.charCodeAt(0) === 123)
      continue;
    let deepAlias = findAlias(alias, body);
    if (deepAlias.length > 0)
      aliases.push(...deepAlias);
  }
  return aliases;
};
var extractMainParameter = (parameter) => {
  if (!parameter)
    return;
  if (parameter.charCodeAt(0) !== 123)
    return parameter;
  if (parameter = parameter.slice(2, -2), !parameter.includes(",")) {
    if (parameter.indexOf("...") !== -1)
      return parameter.slice(parameter.indexOf("...") + 3);
    return;
  }
  let spreadIndex = parameter.indexOf("...");
  if (spreadIndex === -1)
    return;
  return parameter.slice(spreadIndex + 3).trimEnd();
};
var inferBodyReference = (code, aliases, inference) => {
  let access = (type, alias) => new RegExp(`${alias}\\.(${type})|${alias}\\["${type}"\\]|${alias}\\['${type}'\\]`).test(code);
  for (let alias of aliases) {
    if (!alias)
      continue;
    if (alias.charCodeAt(0) === 123) {
      let parameters = retrieveRootParamters(alias).parameters;
      if (parameters.query)
        inference.query = true;
      if (parameters.headers)
        inference.headers = true;
      if (parameters.body)
        inference.body = true;
      if (parameters.cookie)
        inference.cookie = true;
      if (parameters.set)
        inference.set = true;
      if (parameters.server)
        inference.server = true;
      if (parameters.url)
        inference.url = true;
      if (parameters.route)
        inference.route = true;
      if (parameters.path)
        inference.path = true;
      continue;
    }
    if (!inference.query && (access("query", alias) || code.includes("return " + alias) || code.includes("return " + alias + ".query")))
      inference.query = true;
    if (!inference.headers && access("headers", alias))
      inference.headers = true;
    if (!inference.body && access("body", alias))
      inference.body = true;
    if (!inference.cookie && access("cookie", alias))
      inference.cookie = true;
    if (!inference.set && access("set", alias))
      inference.set = true;
    if (!inference.server && access("server", alias))
      inference.server = true;
    if (!inference.route && access("route", alias))
      inference.route = true;
    if (!inference.url && access("url", alias))
      inference.url = true;
    if (!inference.path && access("path", alias))
      inference.path = true;
    if (inference.query && inference.headers && inference.body && inference.cookie && inference.set && inference.server && inference.route && inference.url && inference.path)
      break;
  }
  return aliases;
};
var isContextPassToFunction = (context, body, inference) => {
  try {
    let captureFunction = new RegExp(`\\w\\((?:.*?)?${context}(?:.*?)?\\)`, "gs"), exactParameter = new RegExp(`${context}(,|\\))`, "gs"), length = body.length, fn;
    fn = captureFunction.exec(body) + "";
    while (captureFunction.lastIndex !== 0 && captureFunction.lastIndex < length + (fn ? fn.length : 0)) {
      if (fn && exactParameter.test(fn))
        return inference.query = true, inference.headers = true, inference.body = true, inference.cookie = true, inference.set = true, inference.server = true, inference.url = true, inference.route = true, inference.path = true, true;
      fn = captureFunction.exec(body) + "";
    }
    let nextChar = body.charCodeAt(captureFunction.lastIndex);
    if (nextChar === 41 || nextChar === 44)
      return inference.query = true, inference.headers = true, inference.body = true, inference.cookie = true, inference.set = true, inference.server = true, inference.url = true, inference.route = true, inference.path = true, true;
    return false;
  } catch (error) {
    return console.log("[Sucrose] warning: unexpected isContextPassToFunction error, you may continue development as usual but please report the following to maintainers:"), console.log("--- body ---"), console.log(body), console.log("--- context ---"), console.log(context), true;
  }
};
var pendingGC;
var caches2 = {};
var clearSucroseCache = (delay) => {
  if (delay === null || isCloudflareWorker())
    return;
  if (delay === undefined)
    delay = 295000;
  if (pendingGC)
    clearTimeout(pendingGC);
  pendingGC = setTimeout(() => {
    if (caches2 = {}, pendingGC = undefined, isBun)
      Bun.gc(false);
  }, delay), pendingGC.unref?.();
};
var mergeInference = (a, b) => {
  return { body: a.body || b.body, cookie: a.cookie || b.cookie, headers: a.headers || b.headers, query: a.query || b.query, set: a.set || b.set, server: a.server || b.server, url: a.url || b.url, route: a.route || b.route, path: a.path || b.path };
};
var sucrose = (lifeCycle, inference = { query: false, headers: false, body: false, cookie: false, set: false, server: false, url: false, route: false, path: false }, settings = {}) => {
  let events = [];
  if (lifeCycle.request?.length)
    events.push(...lifeCycle.request);
  if (lifeCycle.beforeHandle?.length)
    events.push(...lifeCycle.beforeHandle);
  if (lifeCycle.parse?.length)
    events.push(...lifeCycle.parse);
  if (lifeCycle.error?.length)
    events.push(...lifeCycle.error);
  if (lifeCycle.transform?.length)
    events.push(...lifeCycle.transform);
  if (lifeCycle.afterHandle?.length)
    events.push(...lifeCycle.afterHandle);
  if (lifeCycle.mapResponse?.length)
    events.push(...lifeCycle.mapResponse);
  if (lifeCycle.afterResponse?.length)
    events.push(...lifeCycle.afterResponse);
  if (lifeCycle.handler && typeof lifeCycle.handler === "function")
    events.push(lifeCycle.handler);
  for (let i = 0;i < events.length; i++) {
    let e = events[i];
    if (!e)
      continue;
    let event = typeof e === "object" ? e.fn : e;
    if (typeof event !== "function")
      continue;
    let content = event.toString(), key = checksum(content), cachedInference = caches2[key];
    if (cachedInference) {
      inference = mergeInference(inference, cachedInference);
      continue;
    }
    clearSucroseCache(settings.gcTime);
    let fnInference = { query: false, headers: false, body: false, cookie: false, set: false, server: false, url: false, route: false, path: false }, [parameter, body] = separateFunction(content), rootParameters = findParameterReference(parameter, fnInference), mainParameter = extractMainParameter(rootParameters);
    if (mainParameter) {
      let aliases = findAlias(mainParameter, body.slice(1, -1));
      aliases.splice(0, -1, mainParameter);
      let code = body;
      if (code.charCodeAt(0) === 123 && code.charCodeAt(body.length - 1) === 125)
        code = code.slice(1, -1).trim();
      if (!isContextPassToFunction(mainParameter, code, fnInference))
        inferBodyReference(code, aliases, fnInference);
      if (!fnInference.query && code.includes("return " + mainParameter + ".query"))
        fnInference.query = true;
    }
    if (!caches2[key])
      caches2[key] = fnInference;
    if (inference = mergeInference(inference, fnInference), inference.query && inference.headers && inference.body && inference.cookie && inference.set && inference.server && inference.url && inference.route && inference.path)
      break;
  }
  return inference;
};
var mapResponse2 = (response, set, request) => {
  if (isNotEmpty(set.headers) || set.status !== 200 || set.cookie)
    switch (handleSet(set), response?.constructor?.name) {
      case "String":
        return new Response(response, set);
      case "Array":
      case "Object":
        return set.headers["content-type"] = "application/json", new Response(JSON.stringify(response), set);
      case "ElysiaFile":
        return handleFile(response.value, set);
      case "File":
        return handleFile(response, set);
      case "Blob":
        return handleFile(response, set);
      case "ElysiaCustomStatusResponse":
        return set.status = response.code, mapResponse2(response.response, set, request);
      case undefined:
        if (!response)
          return new Response("", set);
        return new Response(JSON.stringify(response), set);
      case "Response":
        return handleResponse2(response, set, request);
      case "Error":
        return errorToResponse2(response, set);
      case "Promise":
        return response.then((x) => mapResponse2(x, set, request));
      case "Function":
        return mapResponse2(response(), set, request);
      case "Number":
      case "Boolean":
        return new Response(response.toString(), set);
      case "Cookie":
        if (response instanceof Cookie)
          return new Response(response.value, set);
        return new Response(response?.toString(), set);
      case "FormData":
        return new Response(response, set);
      default:
        if (response instanceof Response)
          return handleResponse2(response, set, request);
        if (response instanceof Promise)
          return response.then((x) => mapResponse2(x, set));
        if (response instanceof Error)
          return errorToResponse2(response, set);
        if (response instanceof ElysiaCustomStatusResponse)
          return set.status = response.code, mapResponse2(response.response, set, request);
        if (typeof response?.next === "function" || response instanceof ReadableStream)
          return handleStream2(response, set, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapResponse2(x, set));
        if (typeof response?.toResponse === "function")
          return mapResponse2(response.toResponse(), set);
        if ("charCodeAt" in response) {
          let code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set.headers["Content-Type"])
              set.headers["Content-Type"] = "application/json";
            return new Response(JSON.stringify(response), set);
          }
        }
        return new Response(response, set);
    }
  if (typeof response?.next === "function" || response instanceof ReadableStream)
    return handleStream2(response, set, request);
  return mapCompactResponse2(response, request);
};
var mapEarlyResponse2 = (response, set, request) => {
  if (response === undefined || response === null)
    return;
  if (isNotEmpty(set.headers) || set.status !== 200 || set.cookie)
    switch (handleSet(set), response?.constructor?.name) {
      case "String":
        return new Response(response, set);
      case "Array":
      case "Object":
        return set.headers["content-type"] = "application/json", new Response(JSON.stringify(response), set);
      case "ElysiaFile":
        return handleFile(response.value, set);
      case "File":
        return handleFile(response, set);
      case "Blob":
        return handleFile(response, set);
      case "ElysiaCustomStatusResponse":
        return set.status = response.code, mapEarlyResponse2(response.response, set, request);
      case undefined:
        if (!response)
          return;
        return new Response(JSON.stringify(response), set);
      case "Response":
        return handleResponse2(response, set, request);
      case "Promise":
        return response.then((x) => mapEarlyResponse2(x, set));
      case "Error":
        return errorToResponse2(response, set);
      case "Function":
        return mapEarlyResponse2(response(), set);
      case "Number":
      case "Boolean":
        return new Response(response.toString(), set);
      case "FormData":
        return new Response(response);
      case "Cookie":
        if (response instanceof Cookie)
          return new Response(response.value, set);
        return new Response(response?.toString(), set);
      default:
        if (response instanceof Response)
          return handleResponse2(response, set, request);
        if (response instanceof Promise)
          return response.then((x) => mapEarlyResponse2(x, set));
        if (response instanceof Error)
          return errorToResponse2(response, set);
        if (response instanceof ElysiaCustomStatusResponse)
          return set.status = response.code, mapEarlyResponse2(response.response, set, request);
        if (typeof response?.next === "function" || response instanceof ReadableStream)
          return handleStream2(response, set, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapEarlyResponse2(x, set));
        if (typeof response?.toResponse === "function")
          return mapEarlyResponse2(response.toResponse(), set);
        if ("charCodeAt" in response) {
          let code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set.headers["Content-Type"])
              set.headers["Content-Type"] = "application/json";
            return new Response(JSON.stringify(response), set);
          }
        }
        return new Response(response, set);
    }
  else
    switch (response?.constructor?.name) {
      case "String":
        return new Response(response);
      case "Array":
      case "Object":
        return set.headers["content-type"] = "application/json", new Response(JSON.stringify(response), set);
      case "ElysiaFile":
        return handleFile(response.value, set);
      case "File":
        return handleFile(response, set);
      case "Blob":
        return handleFile(response, set);
      case "ElysiaCustomStatusResponse":
        return set.status = response.code, mapEarlyResponse2(response.response, set, request);
      case undefined:
        if (!response)
          return new Response("");
        return new Response(JSON.stringify(response), { headers: { "content-type": "application/json" } });
      case "Response":
        return response;
      case "Promise":
        return response.then((x) => {
          let r = mapEarlyResponse2(x, set);
          if (r !== undefined)
            return r;
        });
      case "Error":
        return errorToResponse2(response, set);
      case "Function":
        return mapCompactResponse2(response(), request);
      case "Number":
      case "Boolean":
        return new Response(response.toString());
      case "Cookie":
        if (response instanceof Cookie)
          return new Response(response.value, set);
        return new Response(response?.toString(), set);
      case "FormData":
        return new Response(response);
      default:
        if (response instanceof Response)
          return response;
        if (response instanceof Promise)
          return response.then((x) => mapEarlyResponse2(x, set));
        if (response instanceof Error)
          return errorToResponse2(response, set);
        if (response instanceof ElysiaCustomStatusResponse)
          return set.status = response.code, mapEarlyResponse2(response.response, set, request);
        if (typeof response?.next === "function" || response instanceof ReadableStream)
          return handleStream2(response, set, request);
        if (typeof response?.then === "function")
          return response.then((x) => mapEarlyResponse2(x, set));
        if (typeof response?.toResponse === "function")
          return mapEarlyResponse2(response.toResponse(), set);
        if ("charCodeAt" in response) {
          let code = response.charCodeAt(0);
          if (code === 123 || code === 91) {
            if (!set.headers["Content-Type"])
              set.headers["Content-Type"] = "application/json";
            return new Response(JSON.stringify(response), set);
          }
        }
        return new Response(response);
    }
};
var mapCompactResponse2 = (response, request) => {
  switch (response?.constructor?.name) {
    case "String":
      return new Response(response);
    case "Object":
    case "Array":
      return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
    case "ElysiaFile":
      return handleFile(response.value);
    case "File":
      return handleFile(response);
    case "Blob":
      return handleFile(response);
    case "ElysiaCustomStatusResponse":
      return mapResponse2(response.response, { status: response.code, headers: {} });
    case undefined:
      if (!response)
        return new Response("");
      return new Response(JSON.stringify(response), { headers: { "content-type": "application/json" } });
    case "Response":
      return response;
    case "Error":
      return errorToResponse2(response);
    case "Promise":
      return response.then((x) => mapCompactResponse2(x, request));
    case "Function":
      return mapCompactResponse2(response(), request);
    case "Number":
    case "Boolean":
      return new Response(response.toString());
    case "FormData":
      return new Response(response);
    default:
      if (response instanceof Response)
        return response;
      if (response instanceof Promise)
        return response.then((x) => mapCompactResponse2(x, request));
      if (response instanceof Error)
        return errorToResponse2(response);
      if (response instanceof ElysiaCustomStatusResponse)
        return mapResponse2(response.response, { status: response.code, headers: {} });
      if (typeof response?.next === "function" || response instanceof ReadableStream)
        return handleStream2(response, undefined, request);
      if (typeof response?.then === "function")
        return response.then((x) => mapCompactResponse2(x, request));
      if (typeof response?.toResponse === "function")
        return mapCompactResponse2(response.toResponse());
      if ("charCodeAt" in response) {
        let code = response.charCodeAt(0);
        if (code === 123 || code === 91)
          return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
      }
      return new Response(response);
  }
};
var errorToResponse2 = (error, set) => {
  if (typeof error?.toResponse === "function") {
    let raw = error.toResponse(), targetSet = set ?? { headers: {}, status: 200, redirect: "" }, apply = (resolved) => {
      if (resolved instanceof Response)
        targetSet.status = resolved.status;
      return mapResponse2(resolved, targetSet);
    };
    return typeof raw?.then === "function" ? raw.then(apply) : apply(raw);
  }
  return new Response(JSON.stringify({ name: error?.name, message: error?.message, cause: error?.cause }), { status: set?.status !== 200 ? set?.status ?? 500 : 500, headers: set?.headers });
};
var createStaticHandler2 = (handle, hooks, setHeaders = {}) => {
  if (typeof handle === "function")
    return;
  let response = mapResponse2(handle, { headers: setHeaders });
  if (!hooks.parse?.length && !hooks.transform?.length && !hooks.beforeHandle?.length && !hooks.afterHandle?.length)
    return () => response.clone();
};
var handleResponse2 = createResponseHandler({ mapResponse: mapResponse2, mapCompactResponse: mapCompactResponse2 });
var handleStream2 = createStreamHandler({ mapResponse: mapResponse2, mapCompactResponse: mapCompactResponse2 });
var allocateIf2 = (value, condition) => condition ? value : "";
var createContext = (app, route, inference, isInline = false) => {
  let fnLiteral = "", defaultHeaders = app.setHeaders, hasTrace = !!app.event.trace?.length;
  if (hasTrace)
    fnLiteral += `const id=randomId()
`;
  let isDynamic = /[:*]/.test(route.path), getQi = `const u=request.url,s=u.indexOf('/',${app.config.handler?.standardHostname ?? true ? 11 : 7}),qi=u.indexOf('?',s+1)
`, needsQuery = inference.query || !!route.hooks.query || !!route.hooks.standaloneValidator?.find((x) => x.query) || app.event.request?.length;
  if (needsQuery)
    fnLiteral += getQi;
  let getPath = !inference.path ? "" : !isDynamic ? `path:'${route.path}',` : "get path(){" + (needsQuery ? "" : getQi) + `if(qi===-1)return u.substring(s)
return u.substring(s,qi)
},`;
  if (fnLiteral += allocateIf2("const c=", !isInline) + "{request,store," + allocateIf2("qi,", needsQuery) + allocateIf2("params:request.params,", isDynamic) + getPath + allocateIf2("url:request.url,", hasTrace || inference.url || needsQuery) + "redirect,status,set:{headers:" + (isNotEmpty(defaultHeaders) ? "Object.assign({},app.setHeaders)" : "Object.create(null)") + ",status:200}", inference.server)
    fnLiteral += ",get server(){return app.getServer()}";
  if (hasTrace)
    fnLiteral += ",[ELYSIA_REQUEST_ID]:id";
  {
    let decoratorsLiteral = "";
    for (let key of Object.keys(app.singleton.decorator))
      decoratorsLiteral += `,'${key}':decorator['${key}']`;
    fnLiteral += decoratorsLiteral;
  }
  return fnLiteral += `}
`, fnLiteral;
};
var createBunRouteHandler = (app, route) => {
  let hasTrace = !!app.event.trace?.length, hasHoc = !!app.extender.higherOrderFunctions.length, inference = sucrose(route.hooks, app.inference);
  inference = sucrose({ handler: route.handler }, inference);
  let fnLiteral = "const handler=data.handler,app=data.app,store=data.store,decorator=data.decorator,redirect=data.redirect,route=data.route,mapEarlyResponse=data.mapEarlyResponse," + allocateIf2("randomId=data.randomId,", hasTrace) + allocateIf2("ELYSIA_REQUEST_ID=data.ELYSIA_REQUEST_ID,", hasTrace) + allocateIf2("ELYSIA_TRACE=data.ELYSIA_TRACE,", hasTrace) + allocateIf2("trace=data.trace,", hasTrace) + allocateIf2("hoc=data.hoc,", hasHoc) + `status=data.status
`;
  if (app.event.request?.length)
    fnLiteral += `const onRequest=app.event.request.map(x=>x.fn)
`;
  fnLiteral += `${app.event.request?.find(isAsync) ? "async" : ""} function map(request){`;
  let needsQuery = inference.query || !!route.hooks.query || !!route.hooks.standaloneValidator?.find((x) => x.query);
  if (hasTrace || needsQuery || app.event.request?.length)
    fnLiteral += createContext(app, route, inference), fnLiteral += createOnRequestHandler(app), fnLiteral += "return handler(c)}";
  else
    fnLiteral += `return handler(${createContext(app, route, inference, true)})}`;
  return fnLiteral += createHoc(app), Function("data", fnLiteral)({ app, handler: route.compile?.() ?? route.composed, redirect, status, hoc: app.extender.higherOrderFunctions.map((x) => x.fn), store: app.store, decorator: app.decorator, route: route.path, randomId: hasTrace ? randomId : undefined, ELYSIA_TRACE: hasTrace ? ELYSIA_TRACE : undefined, ELYSIA_REQUEST_ID: hasTrace ? ELYSIA_REQUEST_ID : undefined, trace: hasTrace ? app.event.trace?.map((x) => x?.fn ?? x) : undefined, mapEarlyResponse: mapEarlyResponse2 });
};
var createNativeStaticHandler = (handle, hooks, set) => {
  if (typeof handle === "function" || handle instanceof Blob)
    return;
  if (isHTMLBundle(handle))
    return () => handle;
  let response = mapResponse2(handle, set ?? { headers: {} });
  if (!hooks.parse?.length && !hooks.transform?.length && !hooks.beforeHandle?.length && !hooks.afterHandle?.length) {
    if (response instanceof Promise)
      return response.then((response2) => {
        if (!response2)
          return;
        if (!response2.headers.has("content-type"))
          response2.headers.append("content-type", "text/plain");
        return response2.clone();
      });
    if (!response.headers.has("content-type"))
      response.headers.append("content-type", "text/plain");
    return () => response.clone();
  }
};
var websocket = { open(ws) {
  ws.data.open?.(ws);
}, message(ws, message) {
  ws.data.message?.(ws, message);
}, drain(ws) {
  ws.data.drain?.(ws);
}, close(ws, code, reason) {
  ws.data.close?.(ws, code, reason);
}, ping(ws) {
  ws.data.ping?.(ws);
}, pong(ws) {
  ws.data.pong?.(ws);
} };

class ElysiaWS {
  raw;
  data;
  body;
  constructor(raw, data, body = undefined) {
    this.raw = raw;
    this.data = data;
    this.body = body;
    this.validator = raw.data?.validator, this.sendText = raw.sendText.bind(raw), this.sendBinary = raw.sendBinary.bind(raw), this.close = raw.close.bind(raw), this.terminate = raw.terminate.bind(raw), this.publishText = raw.publishText.bind(raw), this.publishBinary = raw.publishBinary.bind(raw), this.subscribe = raw.subscribe.bind(raw), this.unsubscribe = raw.unsubscribe.bind(raw), this.isSubscribed = raw.isSubscribed.bind(raw), this.cork = raw.cork.bind(raw), this.remoteAddress = raw.remoteAddress, this.binaryType = raw.binaryType, this.data = raw.data, this.subscriptions = raw.subscriptions, this.send = this.send.bind(this), this.ping = this.ping.bind(this), this.pong = this.pong.bind(this), this.publish = this.publish.bind(this);
  }
  send(data, compress) {
    if (Buffer.isBuffer(data))
      return this.raw.send(data, compress);
    if (this.validator?.Check(data) === false)
      return this.raw.send(new ValidationError("message", this.validator, data).message);
    if (typeof data === "object")
      data = JSON.stringify(data);
    return this.raw.send(data, compress);
  }
  ping(data) {
    if (Buffer.isBuffer(data))
      return this.raw.ping(data);
    if (this.validator?.Check(data) === false)
      return this.raw.send(new ValidationError("message", this.validator, data).message);
    if (typeof data === "object")
      data = JSON.stringify(data);
    return this.raw.ping(data);
  }
  pong(data) {
    if (Buffer.isBuffer(data))
      return this.raw.pong(data);
    if (this.validator?.Check(data) === false)
      return this.raw.send(new ValidationError("message", this.validator, data).message);
    if (typeof data === "object")
      data = JSON.stringify(data);
    return this.raw.pong(data);
  }
  publish(topic, data, compress) {
    if (Buffer.isBuffer(data))
      return this.raw.publish(topic, data, compress);
    if (this.validator?.Check(data) === false)
      return this.raw.send(new ValidationError("message", this.validator, data).message);
    if (typeof data === "object")
      data = JSON.stringify(data);
    return this.raw.publish(topic, data, compress);
  }
  sendText;
  sendBinary;
  close;
  terminate;
  publishText;
  publishBinary;
  subscribe;
  unsubscribe;
  isSubscribed;
  cork;
  remoteAddress;
  binaryType;
  subscriptions;
  get readyState() {
    return this.raw.readyState;
  }
  validator;
  ["~types"];
  get id() {
    return this.data.id;
  }
}
var createWSMessageParser = (parse2) => {
  let parsers = typeof parse2 === "function" ? [parse2] : parse2;
  return async function(ws, message) {
    if (typeof message === "string") {
      let start = message?.charCodeAt(0);
      if (start === 34 || start === 47 || start === 91 || start === 123)
        try {
          message = JSON.parse(message);
        } catch {}
      else if (isNumericString(message))
        message = +message;
      else if (message === "true")
        message = true;
      else if (message === "false")
        message = false;
      else if (message === "null")
        message = null;
    }
    if (parsers)
      for (let i = 0;i < parsers.length; i++) {
        let temp = parsers[i](ws, message);
        if (temp instanceof Promise)
          temp = await temp;
        if (temp !== undefined)
          return temp;
      }
    return message;
  };
};
var createHandleWSResponse = (responseValidator) => {
  let handleWSResponse = (ws, data) => {
    if (data instanceof Promise)
      return data.then((data2) => handleWSResponse(ws, data2));
    if (Buffer.isBuffer(data))
      return ws.send(data.toString());
    if (data === undefined)
      return;
    let validateResponse = responseValidator ? responseValidator.provider === "standard" ? (data2) => responseValidator.schema["~standard"].validate(data2).issues : (data2) => responseValidator.Check(data2) === false : undefined, send = (datum) => {
      if (validateResponse && validateResponse(datum) === false)
        return ws.send(new ValidationError("message", responseValidator, datum).message);
      if (typeof datum === "object")
        return ws.send(JSON.stringify(datum));
      ws.send(datum);
    };
    if (typeof data?.next !== "function")
      return void send(data);
    let init = data.next();
    if (init instanceof Promise)
      return (async () => {
        let first = await init;
        if (validateResponse && validateResponse(first))
          return ws.send(new ValidationError("message", responseValidator, first).message);
        if (send(first.value), !first.done)
          for await (let datum of data)
            send(datum);
      })();
    if (send(init.value), !init.done)
      for (let datum of data)
        send(datum);
  };
  return handleWSResponse;
};
var optionalParam = /:.+?\?(?=\/|$)/;
var getPossibleParams = (path) => {
  let match = optionalParam.exec(path);
  if (!match)
    return [path];
  let routes = [], head = path.slice(0, match.index), param = match[0].slice(0, -1), tail = path.slice(match.index + match[0].length);
  routes.push(head.slice(0, -1)), routes.push(head + param);
  for (let fragment of getPossibleParams(tail)) {
    if (!fragment)
      continue;
    if (!fragment.startsWith("/:"))
      routes.push(head.slice(0, -1) + fragment);
    routes.push(head + param + fragment);
  }
  return routes;
};
var isHTMLBundle = (handle) => {
  return typeof handle === "object" && handle !== null && (handle.toString() === "[object HTMLBundle]" || typeof handle.index === "string");
};
var supportedMethods = { GET: true, HEAD: true, OPTIONS: true, DELETE: true, PATCH: true, POST: true, PUT: true };
var mapRoutes = (app) => {
  if (!app.config.aot || app.config.systemRouter === false)
    return;
  let routes = {}, add = (route, handler) => {
    let path = encodeURI(route.path);
    if (routes[path]) {
      if (!routes[path][route.method])
        routes[path][route.method] = handler;
    } else
      routes[path] = { [route.method]: handler };
  }, tree = app.routeTree;
  for (let route of app.router.history) {
    if (typeof route.handler !== "function")
      continue;
    let method = route.method;
    if (method === "GET" && `WS_${route.path}` in tree || method === "WS" || route.path.charCodeAt(route.path.length - 1) === 42 || !(method in supportedMethods))
      continue;
    if (method === "ALL") {
      if (!(`WS_${route.path}` in tree))
        routes[route.path] = route.hooks?.config?.mount ? route.hooks.trace || app.event.trace || app.extender.higherOrderFunctions ? createBunRouteHandler(app, route) : route.hooks.mount || route.handler : route.handler;
      continue;
    }
    let compiled, handler = app.config.precompile ? createBunRouteHandler(app, route) : (request) => {
      if (compiled)
        return compiled(request);
      return (compiled = createBunRouteHandler(app, route))(request);
    };
    for (let path of getPossibleParams(route.path))
      add({ method, path }, handler);
  }
  return routes;
};
var mergeRoutes = (r1, r2) => {
  if (!r2)
    return r1;
  for (let key of Object.keys(r2)) {
    if (r1[key] === r2[key])
      continue;
    if (!r1[key]) {
      r1[key] = r2[key];
      continue;
    }
    if (r1[key] && r2[key]) {
      if (typeof r1[key] === "function" || r1[key] instanceof Response) {
        r1[key] = r2[key];
        continue;
      }
      r1[key] = { ...r1[key], ...r2[key] };
    }
  }
  return r1;
};
var BunAdapter = { ...WebStandardAdapter, name: "bun", handler: { mapResponse: mapResponse2, mapEarlyResponse: mapEarlyResponse2, mapCompactResponse: mapCompactResponse2, createStaticHandler: createStaticHandler2, createNativeStaticHandler }, composeHandler: { ...WebStandardAdapter.composeHandler, headers: hasHeaderShorthand ? `c.headers=c.request.headers.toJSON()
` : `c.headers={}
for(const [k,v] of c.request.headers.entries())c.headers[k]=v
` }, listen(app) {
  return (options, callback) => {
    if (typeof Bun > "u")
      throw Error(".listen() is designed to run on Bun only. If you are running Elysia in other environment please use a dedicated plugin or export the handler via Elysia.fetch");
    if (app.compile(), typeof options === "string") {
      if (!isNumericString(options))
        throw Error("Port must be a numeric value");
      options = parseInt(options);
    }
    let createStaticRoute = (iterator, { withAsync = false } = {}) => {
      let staticRoutes = {}, ops = [];
      for (let [path, route] of Object.entries(iterator))
        if (path = encodeURI(path), supportPerMethodInlineHandler) {
          if (!route)
            continue;
          for (let [method, value] of Object.entries(route)) {
            if (!value || !(method in supportedMethods))
              continue;
            if (value instanceof Promise) {
              if (withAsync) {
                if (!staticRoutes[path])
                  staticRoutes[path] = {};
                ops.push(value.then((awaited) => {
                  if (awaited instanceof Response)
                    staticRoutes[path][method] = awaited;
                  if (isHTMLBundle(awaited))
                    staticRoutes[path][method] = awaited;
                }));
              }
              continue;
            }
            if (!(value instanceof Response) && !isHTMLBundle(value))
              continue;
            if (!staticRoutes[path])
              staticRoutes[path] = {};
            staticRoutes[path][method] = value;
          }
        } else {
          if (!route)
            continue;
          if (route instanceof Promise) {
            if (withAsync) {
              if (!staticRoutes[path])
                staticRoutes[path] = {};
              ops.push(route.then((awaited) => {
                if (awaited instanceof Response)
                  staticRoutes[path] = awaited;
              }));
            }
            continue;
          }
          if (!(route instanceof Response))
            continue;
          staticRoutes[path] = route;
        }
      if (withAsync)
        return Promise.all(ops).then(() => staticRoutes);
      return staticRoutes;
    }, serve = typeof options === "object" ? { development: !isProduction, reusePort: true, idleTimeout: 30, ...app.config.serve || {}, ...options || {}, routes: mergeRoutes(mergeRoutes(createStaticRoute(app.router.response), mapRoutes(app)), app.config.serve?.routes), websocket: { ...app.config.websocket || {}, ...websocket || {}, ...options.websocket || {} }, fetch: app.fetch } : { development: !isProduction, reusePort: true, idleTimeout: 30, ...app.config.serve || {}, routes: mergeRoutes(mergeRoutes(createStaticRoute(app.router.response), mapRoutes(app)), app.config.serve?.routes), websocket: { ...app.config.websocket || {}, ...websocket || {} }, port: options, fetch: app.fetch };
    if (app.server = Bun.serve(serve), app.event.start)
      for (let i = 0;i < app.event.start.length; i++)
        app.event.start[i].fn(app);
    if (callback)
      callback(app.server);
    process.on("beforeExit", async () => {
      if (app.server) {
        if (await app.server.stop?.(), app.server = null, app.event.stop)
          for (let i = 0;i < app.event.stop.length; i++)
            app.event.stop[i].fn(app);
      }
    }), app.promisedModules.then(async () => {
      app.config.aot, app.compile(), app.server?.reload({ ...serve, fetch: app.fetch, routes: mergeRoutes(mergeRoutes(await createStaticRoute(app.router.response, { withAsync: true }), mapRoutes(app)), app.config.serve?.routes) }), Bun?.gc(false);
    });
  };
}, async stop(app, closeActiveConnections) {
  if (app.server) {
    if (await app.server.stop(closeActiveConnections), app.server = null, app.event.stop?.length)
      for (let i = 0;i < app.event.stop.length; i++)
        app.event.stop[i].fn(app);
  } else
    console.log("Elysia isn't running. Call `app.listen` to start the server.", Error().stack);
}, ws(app, path, options) {
  let { parse: parse2, body, response, ...rest } = options, messageValidator = getSchemaValidator(body, { modules: app.definitions.typebox, models: app.definitions.type, normalize: app.config.normalize }), validateMessage = messageValidator ? messageValidator.provider === "standard" ? (data) => messageValidator.schema["~standard"].validate(data).issues : (data) => messageValidator.Check(data) === false : undefined, responseValidator = getSchemaValidator(response, { modules: app.definitions.typebox, models: app.definitions.type, normalize: app.config.normalize });
  app.route("WS", path, async (context) => {
    let server = context.server ?? app.server, { set, path: path2, qi, headers, query, params } = context;
    if (context.validator = responseValidator, options.upgrade) {
      if (typeof options.upgrade === "function") {
        let temp = options.upgrade(context);
        if (temp instanceof Promise)
          await temp;
      } else if (options.upgrade)
        Object.assign(set.headers, options.upgrade);
    }
    if (set.cookie && isNotEmpty(set.cookie)) {
      let cookie = serializeCookie(set.cookie);
      if (cookie)
        set.headers["set-cookie"] = cookie;
    }
    if (set.headers["set-cookie"] && Array.isArray(set.headers["set-cookie"]))
      set.headers = parseSetCookies(new Headers(set.headers), set.headers["set-cookie"]);
    let handleResponse3 = createHandleWSResponse(responseValidator), parseMessage = createWSMessageParser(parse2), _id;
    if (typeof options.beforeHandle === "function") {
      let result = options.beforeHandle(context);
      if (result instanceof Promise)
        await result;
    }
    let errorHandlers = [...options.error ? Array.isArray(options.error) ? options.error : [options.error] : [], ...(app.event.error ?? []).map((x) => typeof x === "function" ? x : x.fn)].filter((x) => x), hasCustomErrorHandlers = errorHandlers.length > 0, handleErrors = !hasCustomErrorHandlers ? () => {} : async (ws, error) => {
      for (let handleError of errorHandlers) {
        let response2 = handleError(Object.assign(context, { error }));
        if (response2 instanceof Promise)
          response2 = await response2;
        if (await handleResponse3(ws, response2), response2)
          break;
      }
    };
    if (server?.upgrade(context.request, { headers: isNotEmpty(set.headers) ? set.headers : undefined, data: { ...context, get id() {
      if (_id)
        return _id;
      return _id = randomId();
    }, validator: responseValidator, ping(ws, data) {
      options.ping?.(ws, data);
    }, pong(ws, data) {
      options.pong?.(ws, data);
    }, open: async (ws) => {
      try {
        await handleResponse3(ws, options.open?.(new ElysiaWS(ws, context)));
      } catch (error) {
        handleErrors(ws, error);
      }
    }, message: async (ws, _message) => {
      let message = await parseMessage(ws, _message);
      if (validateMessage && validateMessage(message)) {
        let validationError = new ValidationError("message", messageValidator, message);
        if (!hasCustomErrorHandlers)
          return void ws.send(validationError.message);
        return handleErrors(ws, validationError);
      }
      try {
        await handleResponse3(ws, options.message?.(new ElysiaWS(ws, context, message), message));
      } catch (error) {
        handleErrors(ws, error);
      }
    }, drain: async (ws) => {
      try {
        await handleResponse3(ws, options.drain?.(new ElysiaWS(ws, context)));
      } catch (error) {
        handleErrors(ws, error);
      }
    }, close: async (ws, code, reason) => {
      try {
        await handleResponse3(ws, options.close?.(new ElysiaWS(ws, context), code, reason));
      } catch (error) {
        handleErrors(ws, error);
      }
    } } }))
      return;
    return status(400, "Expected a websocket connection");
  }, { ...rest, websocket: options });
} };
var injectDefaultValues = (typeChecker, obj) => {
  let schema = typeChecker.schema;
  if (!schema)
    return;
  if (schema.$defs?.[schema.$ref])
    schema = schema.$defs[schema.$ref];
  if (!schema?.properties)
    return;
  for (let [key, keySchema] of Object.entries(schema.properties))
    obj[key] ??= keySchema.default;
};
var createDynamicHandler = (app) => {
  let { mapResponse: mapResponse3, mapEarlyResponse: mapEarlyResponse3 } = app["~adapter"].handler, defaultHeader = app.setHeaders;
  return async (request) => {
    let url = request.url, s = url.indexOf("/", 11), qi = url.indexOf("?", s + 1), path = qi === -1 ? url.substring(s) : url.substring(s, qi), set = { cookie: {}, status: 200, headers: defaultHeader ? { ...defaultHeader } : {} }, context = Object.assign({}, app.singleton.decorator, { set, store: app.singleton.store, request, path, qi, error: status, status, redirect }), hooks;
    try {
      if (app.event.request)
        for (let i = 0;i < app.event.request.length; i++) {
          let onRequest = app.event.request[i].fn, response2 = onRequest(context);
          if (response2 instanceof Promise)
            response2 = await response2;
          if (response2 = mapEarlyResponse3(response2, set), response2)
            return context.response = response2;
        }
      let methodKey = request.method === "GET" && request.headers.get("upgrade")?.toLowerCase() === "websocket" ? "WS" : request.method, handler = app.router.dynamic.find(request.method, path) ?? app.router.dynamic.find(methodKey, path) ?? app.router.dynamic.find("ALL", path);
      if (!handler)
        throw context.query = qi === -1 ? {} : parseQuery(url.substring(qi + 1)), new NotFoundError;
      let { handle, validator, content, route } = handler.store;
      if (hooks = handler.store.hooks, hooks.config?.mount)
        return await hooks.config.mount(request);
      let body;
      if (request.method !== "GET" && request.method !== "HEAD")
        if (content)
          switch (content) {
            case "application/json":
              body = await request.json();
              break;
            case "text/plain":
              body = await request.text();
              break;
            case "application/x-www-form-urlencoded":
              body = parseQuery(await request.text());
              break;
            case "application/octet-stream":
              body = await request.arrayBuffer();
              break;
            case "multipart/form-data": {
              body = {};
              let form2 = await request.formData();
              for (let key of form2.keys()) {
                if (body[key])
                  continue;
                let value = form2.getAll(key);
                if (value.length === 1)
                  body[key] = value[0];
                else
                  body[key] = value;
              }
              break;
            }
          }
        else {
          let contentType;
          if (request.body)
            contentType = request.headers.get("content-type");
          if (contentType) {
            let index = contentType.indexOf(";");
            if (index !== -1)
              contentType = contentType.slice(0, index);
            if (context.contentType = contentType, hooks.parse)
              for (let i = 0;i < hooks.parse.length; i++) {
                let hook = hooks.parse[i].fn;
                if (typeof hook === "string")
                  switch (hook) {
                    case "json":
                    case "application/json":
                      body = await request.json();
                      break;
                    case "text":
                    case "text/plain":
                      body = await request.text();
                      break;
                    case "urlencoded":
                    case "application/x-www-form-urlencoded":
                      body = parseQuery(await request.text());
                      break;
                    case "arrayBuffer":
                    case "application/octet-stream":
                      body = await request.arrayBuffer();
                      break;
                    case "formdata":
                    case "multipart/form-data": {
                      body = {};
                      let form2 = await request.formData();
                      for (let key of form2.keys()) {
                        if (body[key])
                          continue;
                        let value = form2.getAll(key);
                        if (value.length === 1)
                          body[key] = value[0];
                        else
                          body[key] = value;
                      }
                      break;
                    }
                    default: {
                      let parser = app["~parser"][hook];
                      if (parser) {
                        let temp = parser(context, contentType);
                        if (temp instanceof Promise)
                          temp = await temp;
                        if (temp) {
                          body = temp;
                          break;
                        }
                      }
                      break;
                    }
                  }
                else {
                  let temp = hook(context, contentType);
                  if (temp instanceof Promise)
                    temp = await temp;
                  if (temp) {
                    body = temp;
                    break;
                  }
                }
              }
            if (delete context.contentType, body === undefined)
              switch (contentType) {
                case "application/json":
                  body = await request.json();
                  break;
                case "text/plain":
                  body = await request.text();
                  break;
                case "application/x-www-form-urlencoded":
                  body = parseQuery(await request.text());
                  break;
                case "application/octet-stream":
                  body = await request.arrayBuffer();
                  break;
                case "multipart/form-data": {
                  body = {};
                  let form2 = await request.formData();
                  for (let key of form2.keys()) {
                    if (body[key])
                      continue;
                    let value = form2.getAll(key);
                    if (value.length === 1)
                      body[key] = value[0];
                    else
                      body[key] = value;
                  }
                  break;
                }
              }
          }
        }
      context.route = route, context.body = body, context.params = handler?.params || undefined, context.query = qi === -1 ? {} : parseQuery(url.substring(qi + 1)), context.headers = {};
      for (let [key, value] of request.headers.entries())
        context.headers[key] = value;
      let cookieMeta = { domain: app.config.cookie?.domain ?? validator?.cookie?.config.domain, expires: app.config.cookie?.expires ?? validator?.cookie?.config.expires, httpOnly: app.config.cookie?.httpOnly ?? validator?.cookie?.config.httpOnly, maxAge: app.config.cookie?.maxAge ?? validator?.cookie?.config.maxAge, path: app.config.cookie?.path ?? validator?.cookie?.config.path, priority: app.config.cookie?.priority ?? validator?.cookie?.config.priority, partitioned: app.config.cookie?.partitioned ?? validator?.cookie?.config.partitioned, sameSite: app.config.cookie?.sameSite ?? validator?.cookie?.config.sameSite, secure: app.config.cookie?.secure ?? validator?.cookie?.config.secure, secrets: app.config.cookie?.secrets ?? validator?.cookie?.config.secrets, sign: app.config.cookie?.sign ?? validator?.cookie?.config.sign }, cookieHeaderValue = request.headers.get("cookie");
      context.cookie = await parseCookie(context.set, cookieHeaderValue, cookieMeta);
      let headerValidator = validator?.createHeaders?.();
      if (headerValidator)
        injectDefaultValues(headerValidator, context.headers);
      let paramsValidator = validator?.createParams?.();
      if (paramsValidator)
        injectDefaultValues(paramsValidator, context.params);
      let queryValidator = validator?.createQuery?.();
      if (queryValidator)
        injectDefaultValues(queryValidator, context.query);
      if (hooks.transform)
        for (let i = 0;i < hooks.transform.length; i++) {
          let hook = hooks.transform[i], response2 = hook.fn(context);
          if (response2 instanceof Promise)
            response2 = await response2;
          if (response2 instanceof ElysiaCustomStatusResponse) {
            let result = mapEarlyResponse3(response2, context.set);
            if (result)
              return context.response = result;
          }
          if (hook.subType === "derive")
            Object.assign(context, response2);
        }
      if (validator) {
        if (headerValidator) {
          let _header = structuredClone(context.headers);
          for (let [key, value] of request.headers)
            _header[key] = value;
          if (validator.headers.Check(_header) === false)
            throw new ValidationError("header", validator.headers, _header);
        } else if (validator.headers?.Decode)
          context.headers = validator.headers.Decode(context.headers);
        if (paramsValidator?.Check(context.params) === false)
          throw new ValidationError("params", validator.params, context.params);
        else if (validator.params?.Decode)
          context.params = validator.params.Decode(context.params);
        if (validator.query?.schema) {
          let schema = validator.query.schema;
          if (schema.$defs?.[schema.$ref])
            schema = schema.$defs[schema.$ref];
          let properties = schema.properties;
          for (let property of Object.keys(properties)) {
            let value = properties[property];
            if ((value.type === "array" || value.items?.type === "string") && typeof context.query[property] === "string" && context.query[property])
              context.query[property] = context.query[property].split(",");
          }
        }
        if (queryValidator?.Check(context.query) === false)
          throw new ValidationError("query", validator.query, context.query);
        else if (validator.query?.Decode)
          context.query = validator.query.Decode(context.query);
        if (validator.createCookie?.()) {
          let cookieValue = {};
          for (let [key, value] of Object.entries(context.cookie))
            cookieValue[key] = value.value;
          if (validator.cookie.Check(cookieValue) === false)
            throw new ValidationError("cookie", validator.cookie, cookieValue);
          else if (validator.cookie?.Decode)
            cookieValue = validator.cookie.Decode(cookieValue);
        }
        if (validator.createBody?.()?.Check(body) === false)
          throw new ValidationError("body", validator.body, body);
        else if (validator.body?.Decode)
          context.body = validator.body.Decode(body);
      }
      if (hooks.beforeHandle)
        for (let i = 0;i < hooks.beforeHandle.length; i++) {
          let hook = hooks.beforeHandle[i], response2 = hook.fn(context);
          if (response2 instanceof Promise)
            response2 = await response2;
          if (response2 instanceof ElysiaCustomStatusResponse) {
            let result = mapEarlyResponse3(response2, context.set);
            if (result)
              return context.response = result;
          }
          if (hook.subType === "resolve") {
            Object.assign(context, response2);
            continue;
          }
          if (response2 !== undefined) {
            if (context.response = response2, hooks.afterHandle)
              for (let i2 = 0;i2 < hooks.afterHandle.length; i2++) {
                let newResponse = hooks.afterHandle[i2].fn(context);
                if (newResponse instanceof Promise)
                  newResponse = await newResponse;
                if (newResponse)
                  response2 = newResponse;
              }
            let result = mapEarlyResponse3(response2, context.set);
            if (result)
              return context.response = result;
          }
        }
      let response = typeof handle === "function" ? handle(context) : handle;
      if (response instanceof Promise)
        response = await response;
      if (!hooks.afterHandle?.length) {
        let isCustomStatuResponse = response instanceof ElysiaCustomStatusResponse, status2 = isCustomStatuResponse ? response.code : set.status ? typeof set.status === "string" ? StatusMap[set.status] : set.status : 200;
        if (isCustomStatuResponse)
          set.status = status2, response = response.response;
        let responseValidator = validator?.createResponse?.()?.[status2];
        if (responseValidator?.Check(response) === false)
          if (responseValidator?.Clean) {
            let temp = responseValidator.Clean(response);
            if (responseValidator?.Check(temp) === false)
              throw new ValidationError("response", responseValidator, response);
            response = temp;
          } else
            throw new ValidationError("response", responseValidator, response);
        if (responseValidator?.Encode)
          response = responseValidator.Encode(response);
        if (responseValidator?.Clean)
          response = responseValidator.Clean(response);
      } else {
        context.response = response;
        for (let i = 0;i < hooks.afterHandle.length; i++) {
          let response2 = hooks.afterHandle[i].fn(context);
          if (response2 instanceof Promise)
            response2 = await response2;
          let isCustomStatuResponse = response2 instanceof ElysiaCustomStatusResponse, status2 = isCustomStatuResponse ? response2.code : set.status ? typeof set.status === "string" ? StatusMap[set.status] : set.status : 200;
          if (isCustomStatuResponse)
            set.status = status2, response2 = response2.response;
          let responseValidator = validator?.createResponse?.()?.[status2];
          if (responseValidator?.Check(response2) === false)
            if (responseValidator?.Clean) {
              let temp = responseValidator.Clean(response2);
              if (responseValidator?.Check(temp) === false)
                throw new ValidationError("response", responseValidator, response2);
              response2 = temp;
            } else
              throw new ValidationError("response", responseValidator, response2);
          if (responseValidator?.Encode)
            context.response = response2 = responseValidator.Encode(response2);
          if (responseValidator?.Clean)
            context.response = response2 = responseValidator.Clean(response2);
          let result = mapEarlyResponse3(response2, context.set);
          if (result !== undefined)
            return context.response = result;
        }
      }
      if (context.set.cookie && cookieMeta?.sign) {
        let secret = !cookieMeta.secrets ? undefined : typeof cookieMeta.secrets === "string" ? cookieMeta.secrets : cookieMeta.secrets[0];
        if (cookieMeta.sign === true) {
          if (secret)
            for (let [key, cookie] of Object.entries(context.set.cookie))
              context.set.cookie[key].value = await signCookie(cookie.value, secret);
        } else {
          let properties = validator?.cookie?.schema?.properties;
          if (secret)
            for (let name of cookieMeta.sign) {
              if (!(name in properties))
                continue;
              if (context.set.cookie[name]?.value)
                context.set.cookie[name].value = await signCookie(context.set.cookie[name].value, secret);
            }
        }
      }
      return mapResponse3(context.response = response, context.set);
    } catch (error) {
      let reportedError = error instanceof TransformDecodeError && error.error ? error.error : error;
      return app.handleError(context, reportedError);
    } finally {
      let afterResponses = hooks ? hooks.afterResponse : app.event.afterResponse;
      if (afterResponses)
        if (hasSetImmediate)
          setImmediate(async () => {
            for (let afterResponse of afterResponses)
              await afterResponse.fn(context);
          });
        else
          Promise.resolve().then(async () => {
            for (let afterResponse of afterResponses)
              await afterResponse.fn(context);
          });
    }
  };
};
var createDynamicErrorHandler = (app) => {
  let { mapResponse: mapResponse3 } = app["~adapter"].handler;
  return async (context, error) => {
    let errorContext = Object.assign(context, { error, code: error.code });
    if (errorContext.set = context.set, typeof error?.toResponse === "function" && !(error instanceof ValidationError) && !(error instanceof TransformDecodeError))
      try {
        let raw = error.toResponse();
        if (typeof raw?.then === "function")
          raw = await raw;
        if (raw instanceof Response)
          context.set.status = raw.status;
        context.response = raw;
      } catch (toResponseError) {}
    if (!context.response && app.event.error)
      for (let i = 0;i < app.event.error.length; i++) {
        let response = app.event.error[i].fn(errorContext);
        if (response instanceof Promise)
          response = await response;
        if (response !== undefined && response !== null)
          return context.response = mapResponse3(response, context.set);
      }
    if (context.response) {
      if (app.event.mapResponse)
        for (let i = 0;i < app.event.mapResponse.length; i++) {
          let response = app.event.mapResponse[i].fn(errorContext);
          if (response instanceof Promise)
            response = await response;
          if (response !== undefined && response !== null)
            context.response = response;
        }
      return mapResponse3(context.response, context.set);
    }
    return context.set.status = error.status ?? 500, mapResponse3(typeof error.cause === "string" ? error.cause : error.message, context.set);
  };
};

class Elysia {
  config;
  server = null;
  dependencies = {};
  "~Prefix" = "";
  "~Singleton" = null;
  "~Definitions" = null;
  "~Metadata" = null;
  "~Ephemeral" = null;
  "~Volatile" = null;
  "~Routes" = null;
  singleton = { decorator: {}, store: {}, derive: {}, resolve: {} };
  get store() {
    return this.singleton.store;
  }
  get decorator() {
    return this.singleton.decorator;
  }
  definitions = { typebox: t.Module({}), type: {}, error: {} };
  extender = { macro: {}, higherOrderFunctions: [] };
  validator = { global: null, scoped: null, local: null, getCandidate() {
    if (!this.global && !this.scoped && !this.local)
      return { body: undefined, headers: undefined, params: undefined, query: undefined, cookie: undefined, response: undefined };
    return mergeSchemaValidator(mergeSchemaValidator(this.global, this.scoped), this.local);
  } };
  standaloneValidator = { global: null, scoped: null, local: null };
  event = {};
  telemetry;
  router = { "~http": undefined, get http() {
    if (!this["~http"])
      this["~http"] = new _({ lazy: true, onParam: import_fast_decode_uri_component4.default });
    return this["~http"];
  }, "~dynamic": undefined, get dynamic() {
    if (!this["~dynamic"])
      this["~dynamic"] = new _({ onParam: import_fast_decode_uri_component4.default });
    return this["~dynamic"];
  }, static: {}, response: {}, history: [] };
  routeTree = {};
  get routes() {
    return this.router.history;
  }
  getGlobalRoutes() {
    return this.router.history;
  }
  getGlobalDefinitions() {
    return this.definitions;
  }
  inference = { body: false, cookie: false, headers: false, query: false, set: false, server: false, path: false, route: false, url: false };
  getServer() {
    return this.server;
  }
  getParent() {
    return null;
  }
  "~parser" = {};
  _promisedModules;
  get promisedModules() {
    if (!this._promisedModules)
      this._promisedModules = new PromiseGroup(console.error, () => {});
    return this._promisedModules;
  }
  constructor(config = {}) {
    if (config.tags)
      if (!config.detail)
        config.detail = { tags: config.tags };
      else
        config.detail.tags = config.tags;
    if (this.config = { aot: env2.ELYSIA_AOT !== "false", nativeStaticResponse: true, encodeSchema: true, normalize: true, ...config, prefix: config.prefix ? config.prefix.charCodeAt(0) === 47 ? config.prefix : `/${config.prefix}` : undefined, cookie: { path: "/", ...config?.cookie }, experimental: config?.experimental ?? {}, seed: config?.seed === undefined ? "" : config?.seed }, this["~adapter"] = config.adapter ?? (typeof Bun < "u" ? BunAdapter : WebStandardAdapter), config?.analytic && (config?.name || config?.seed !== undefined))
      this.telemetry = { stack: Error().stack };
  }
  "~adapter";
  env(model, _env = env2) {
    if (getSchemaValidator(model, { modules: this.definitions.typebox, dynamic: true, additionalProperties: true, coerce: true, sanitize: () => this.config.sanitize }).Check(_env) === false) {
      let error = new ValidationError("env", model, _env);
      throw Error(error.all.map((x) => x.summary).join(`
`));
    }
    return this;
  }
  wrap(fn) {
    return this.extender.higherOrderFunctions.push({ checksum: checksum(JSON.stringify({ name: this.config.name, seed: this.config.seed, content: fn.toString() })), fn }), this;
  }
  get models() {
    let models = {};
    for (let name of Object.keys(this.definitions.type))
      models[name] = getSchemaValidator(this.definitions.typebox.Import(name), { models: this.definitions.type });
    return models.modules = this.definitions.typebox, models;
  }
  add(method, path, handle, localHook, options) {
    let skipPrefix = options?.skipPrefix ?? false, allowMeta = options?.allowMeta ?? false;
    localHook ??= {}, this.applyMacro(localHook);
    let standaloneValidators = [];
    if (localHook.standaloneValidator)
      standaloneValidators = standaloneValidators.concat(localHook.standaloneValidator);
    if (this.standaloneValidator.local)
      standaloneValidators = standaloneValidators.concat(this.standaloneValidator.local);
    if (this.standaloneValidator.scoped)
      standaloneValidators = standaloneValidators.concat(this.standaloneValidator.scoped);
    if (this.standaloneValidator.global)
      standaloneValidators = standaloneValidators.concat(this.standaloneValidator.global);
    if (path !== "" && path.charCodeAt(0) !== 47)
      path = "/" + path;
    if (this.config.prefix && !skipPrefix)
      path = this.config.prefix + path;
    if (localHook?.type)
      switch (localHook.type) {
        case "text":
          localHook.type = "text/plain";
          break;
        case "json":
          localHook.type = "application/json";
          break;
        case "formdata":
          localHook.type = "multipart/form-data";
          break;
        case "urlencoded":
          localHook.type = "application/x-www-form-urlencoded";
          break;
        case "arrayBuffer":
          localHook.type = "application/octet-stream";
          break;
        default:
          break;
      }
    let instanceValidator = this.validator.getCandidate(), cloned = { body: localHook?.body ?? instanceValidator?.body, headers: localHook?.headers ?? instanceValidator?.headers, params: localHook?.params ?? instanceValidator?.params, query: localHook?.query ?? instanceValidator?.query, cookie: localHook?.cookie ?? instanceValidator?.cookie, response: localHook?.response ?? instanceValidator?.response }, shouldPrecompile = this.config.precompile === true || typeof this.config.precompile === "object" && this.config.precompile.compose === true, createValidator = () => {
      let models = this.definitions.type, dynamic = !this.config.aot, normalize = this.config.normalize, modules = this.definitions.typebox, sanitize2 = () => this.config.sanitize, cookieValidator = () => {
        if (cloned.cookie || standaloneValidators.find((x) => x.cookie))
          return getCookieValidator({ modules, validator: cloned.cookie, defaultConfig: this.config.cookie, normalize, config: cloned.cookie?.config ?? {}, dynamic, models, validators: standaloneValidators.map((x) => x.cookie), sanitize: sanitize2 });
      };
      return shouldPrecompile ? { body: getSchemaValidator(cloned.body, { modules, dynamic, models, normalize, additionalCoerce: (() => {
        let resolved = resolveSchema(cloned.body, models, modules);
        return resolved && Kind in resolved && (hasType("File", resolved) || hasType("Files", resolved)) ? coerceFormData() : coercePrimitiveRoot();
      })(), validators: standaloneValidators.map((x) => x.body), sanitize: sanitize2 }), headers: getSchemaValidator(cloned.headers, { modules, dynamic, models, additionalProperties: true, coerce: true, additionalCoerce: stringToStructureCoercions(), validators: standaloneValidators.map((x) => x.headers), sanitize: sanitize2 }), params: getSchemaValidator(cloned.params, { modules, dynamic, models, coerce: true, additionalCoerce: stringToStructureCoercions(), validators: standaloneValidators.map((x) => x.params), sanitize: sanitize2 }), query: getSchemaValidator(cloned.query, { modules, dynamic, models, normalize, coerce: true, additionalCoerce: queryCoercions(), validators: standaloneValidators.map((x) => x.query), sanitize: sanitize2 }), cookie: cookieValidator(), response: getResponseSchemaValidator(cloned.response, { modules, dynamic, models, normalize, validators: standaloneValidators.map((x) => x.response), sanitize: sanitize2 }) } : { createBody() {
        if (this.body)
          return this.body;
        return this.body = getSchemaValidator(cloned.body, { modules, dynamic, models, normalize, additionalCoerce: (() => {
          let resolved = resolveSchema(cloned.body, models, modules);
          return resolved && Kind in resolved && (hasType("File", resolved) || hasType("Files", resolved)) ? coerceFormData() : coercePrimitiveRoot();
        })(), validators: standaloneValidators.map((x) => x.body), sanitize: sanitize2 });
      }, createHeaders() {
        if (this.headers)
          return this.headers;
        return this.headers = getSchemaValidator(cloned.headers, { modules, dynamic, models, normalize, additionalProperties: !normalize, coerce: true, additionalCoerce: stringToStructureCoercions(), validators: standaloneValidators.map((x) => x.headers), sanitize: sanitize2 });
      }, createParams() {
        if (this.params)
          return this.params;
        return this.params = getSchemaValidator(cloned.params, { modules, dynamic, models, normalize, coerce: true, additionalCoerce: stringToStructureCoercions(), validators: standaloneValidators.map((x) => x.params), sanitize: sanitize2 });
      }, createQuery() {
        if (this.query)
          return this.query;
        return this.query = getSchemaValidator(cloned.query, { modules, dynamic, models, normalize, coerce: true, additionalCoerce: queryCoercions(), validators: standaloneValidators.map((x) => x.query), sanitize: sanitize2 });
      }, createCookie() {
        if (this.cookie)
          return this.cookie;
        return this.cookie = cookieValidator();
      }, createResponse() {
        if (this.response)
          return this.response;
        return this.response = getResponseSchemaValidator(cloned.response, { modules, dynamic, models, normalize, validators: standaloneValidators.map((x) => x.response), sanitize: sanitize2 });
      } };
    };
    if (instanceValidator.body || instanceValidator.cookie || instanceValidator.headers || instanceValidator.params || instanceValidator.query || instanceValidator.response)
      localHook = mergeHook(localHook, instanceValidator);
    if (localHook.tags)
      if (!localHook.detail)
        localHook.detail = { tags: localHook.tags };
      else
        localHook.detail.tags = localHook.tags;
    if (isNotEmpty(this.config.detail))
      localHook.detail = mergeDeep(Object.assign({}, this.config.detail), localHook.detail);
    let hooks = isNotEmpty(this.event) ? mergeHook(this.event, localHookToLifeCycleStore(localHook)) : { ...lifeCycleToArray(localHookToLifeCycleStore(localHook)) };
    if (standaloneValidators.length)
      Object.assign(hooks, { standaloneValidator: standaloneValidators });
    if (this.config.aot === false) {
      let validator = createValidator();
      this.router.dynamic.add(method, path, { validator, hooks, content: localHook?.type, handle, route: path });
      let encoded = encodePath(path, { dynamic: true });
      if (path !== encoded)
        this.router.dynamic.add(method, encoded, { validator, hooks, content: localHook?.type, handle, route: path });
      if (!this.config.strictPath) {
        let loosePath = getLoosePath(path);
        this.router.dynamic.add(method, loosePath, { validator, hooks, content: localHook?.type, handle, route: path });
        let encoded2 = encodePath(loosePath);
        if (loosePath !== encoded2)
          this.router.dynamic.add(method, loosePath, { validator, hooks, content: localHook?.type, handle, route: path });
      }
      this.router.history.push({ method, path, composed: null, handler: handle, compile: undefined, hooks });
      return;
    }
    let adapter = this["~adapter"].handler, nativeStaticHandler = typeof handle !== "function" ? () => {
      let context = { redirect, request: this["~adapter"].isWebStandard ? new Request(`http://ely.sia${path}`, { method }) : undefined, server: null, set: { headers: Object.assign({}, this.setHeaders) }, status, store: this.store };
      try {
        this.event.request?.map((x) => {
          if (typeof x.fn === "function")
            return x.fn(context);
          if (typeof x === "function")
            return x(context);
        });
      } catch (error) {
        let res;
        if (context.error = error, this.event.error?.some((x) => {
          if (typeof x.fn === "function")
            return res = x.fn(context);
          if (typeof x === "function")
            return res = x(context);
        }), res !== undefined)
          handle = res;
      }
      let fn = adapter.createNativeStaticHandler?.(handle, hooks, context.set);
      return fn instanceof Promise ? fn.then((fn2) => {
        if (fn2)
          return fn2;
      }) : fn?.();
    } : undefined, useNativeStaticResponse = this.config.nativeStaticResponse === true, addResponsePath = (path2) => {
      if (!useNativeStaticResponse || !nativeStaticHandler)
        return;
      if (supportPerMethodInlineHandler)
        if (this.router.response[path2])
          this.router.response[path2][method] = nativeStaticHandler();
        else
          this.router.response[path2] = { [method]: nativeStaticHandler() };
      else
        this.router.response[path2] = nativeStaticHandler();
    };
    addResponsePath(path);
    let _compiled, compile2 = () => {
      if (_compiled)
        return _compiled;
      let compiled = composeHandler({ app: this, path, method, hooks, validator: createValidator(), handler: typeof handle !== "function" && typeof adapter.createStaticHandler !== "function" ? () => handle : handle, allowMeta, inference: this.inference });
      if (this.router.history[index])
        _compiled = this.router.history[index].composed = compiled;
      return compiled;
    }, oldIndex;
    if (`${method}_${path}` in this.routeTree)
      for (let i = 0;i < this.router.history.length; i++) {
        let route2 = this.router.history[i];
        if (route2.path === path && route2.method === method) {
          oldIndex = i;
          break;
        }
      }
    else
      this.routeTree[`${method}_${path}`] = this.router.history.length;
    let index = oldIndex ?? this.router.history.length, route = this.router.history, mainHandler = shouldPrecompile ? compile2() : (ctx) => _compiled ? _compiled(ctx) : (route[index].composed = compile2())(ctx);
    if (oldIndex !== undefined)
      this.router.history[oldIndex] = Object.assign({ method, path, composed: mainHandler, compile: compile2, handler: handle, hooks }, standaloneValidators.length ? { standaloneValidators } : undefined, localHook.webSocket ? { websocket: localHook.websocket } : undefined);
    else
      this.router.history.push(Object.assign({ method, path, composed: mainHandler, compile: compile2, handler: handle, hooks }, localHook.webSocket ? { websocket: localHook.websocket } : undefined));
    let handler = { handler: shouldPrecompile ? route[index].composed : undefined, compile() {
      return this.handler = compile2();
    } }, staticRouter = this.router.static, isStaticPath = path.indexOf(":") === -1 && path.indexOf("*") === -1;
    if (method === "WS") {
      if (isStaticPath) {
        if (path in staticRouter)
          staticRouter[path][method] = index;
        else
          staticRouter[path] = { [method]: index };
        return;
      }
      if (this.router.http.add("WS", path, handler), !this.config.strictPath)
        this.router.http.add("WS", getLoosePath(path), handler);
      let encoded = encodePath(path, { dynamic: true });
      if (path !== encoded)
        this.router.http.add("WS", encoded, handler);
      return;
    }
    if (isStaticPath) {
      if (path in staticRouter)
        staticRouter[path][method] = index;
      else
        staticRouter[path] = { [method]: index };
      if (!this.config.strictPath)
        addResponsePath(getLoosePath(path));
    } else {
      if (this.router.http.add(method, path, handler), !this.config.strictPath) {
        let loosePath = getLoosePath(path);
        addResponsePath(loosePath), this.router.http.add(method, loosePath, handler);
      }
      let encoded = encodePath(path, { dynamic: true });
      if (path !== encoded)
        this.router.http.add(method, encoded, handler), addResponsePath(encoded);
    }
  }
  setHeaders;
  headers(header) {
    if (!header)
      return this;
    if (!this.setHeaders)
      this.setHeaders = {};
    return this.setHeaders = mergeDeep(this.setHeaders, header), this;
  }
  onStart(handler) {
    return this.on("start", handler), this;
  }
  onRequest(handler) {
    return this.on("request", handler), this;
  }
  onParse(options, handler) {
    if (!handler) {
      if (typeof options === "string")
        return this.on("parse", this["~parser"][options]);
      return this.on("parse", options);
    }
    return this.on(options, "parse", handler);
  }
  parser(name, parser) {
    return this["~parser"][name] = parser, this;
  }
  onTransform(options, handler) {
    if (!handler)
      return this.on("transform", options);
    return this.on(options, "transform", handler);
  }
  resolve(optionsOrResolve, resolve) {
    if (!resolve)
      resolve = optionsOrResolve, optionsOrResolve = { as: "local" };
    let hook = { subType: "resolve", fn: resolve };
    return this.onBeforeHandle(optionsOrResolve, hook);
  }
  mapResolve(optionsOrResolve, mapper) {
    if (!mapper)
      mapper = optionsOrResolve, optionsOrResolve = { as: "local" };
    let hook = { subType: "mapResolve", fn: mapper };
    return this.onBeforeHandle(optionsOrResolve, hook);
  }
  onBeforeHandle(options, handler) {
    if (!handler)
      return this.on("beforeHandle", options);
    return this.on(options, "beforeHandle", handler);
  }
  onAfterHandle(options, handler) {
    if (!handler)
      return this.on("afterHandle", options);
    return this.on(options, "afterHandle", handler);
  }
  mapResponse(options, handler) {
    if (!handler)
      return this.on("mapResponse", options);
    return this.on(options, "mapResponse", handler);
  }
  onAfterResponse(options, handler) {
    if (!handler)
      return this.on("afterResponse", options);
    return this.on(options, "afterResponse", handler);
  }
  trace(options, handler) {
    if (!handler)
      handler = options, options = { as: "local" };
    if (!Array.isArray(handler))
      handler = [handler];
    for (let fn of handler)
      this.on(options, "trace", createTracer(fn));
    return this;
  }
  error(name, error) {
    switch (typeof name) {
      case "string":
        return error.prototype[ERROR_CODE] = name, this.definitions.error[name] = error, this;
      case "function":
        return this.definitions.error = name(this.definitions.error), this;
    }
    for (let [code, error2] of Object.entries(name))
      error2.prototype[ERROR_CODE] = code, this.definitions.error[code] = error2;
    return this;
  }
  onError(options, handler) {
    if (!handler)
      return this.on("error", options);
    return this.on(options, "error", handler);
  }
  onStop(handler) {
    return this.on("stop", handler), this;
  }
  on(optionsOrType, typeOrHandlers, handlers) {
    let type;
    switch (typeof optionsOrType) {
      case "string":
        type = optionsOrType, handlers = typeOrHandlers;
        break;
      case "object":
        if (type = typeOrHandlers, !Array.isArray(typeOrHandlers) && typeof typeOrHandlers === "object")
          handlers = typeOrHandlers;
        break;
    }
    if (Array.isArray(handlers))
      handlers = fnToContainer(handlers);
    else if (typeof handlers === "function")
      handlers = [{ fn: handlers }];
    else
      handlers = [handlers];
    let handles = handlers;
    for (let handle of handles)
      if (handle.scope = typeof optionsOrType === "string" ? "local" : optionsOrType?.as ?? "local", type === "resolve" || type === "derive")
        handle.subType = type;
    if (type !== "trace")
      this.inference = sucrose({ [type]: handles.map((x) => x.fn) }, this.inference, this.config.sucrose);
    for (let handle of handles) {
      let fn = asHookType(handle, "global", { skipIfHasType: true });
      switch (type) {
        case "start":
          this.event.start ??= [], this.event.start.push(fn);
          break;
        case "request":
          this.event.request ??= [], this.event.request.push(fn);
          break;
        case "parse":
          this.event.parse ??= [], this.event.parse.push(fn);
          break;
        case "transform":
          this.event.transform ??= [], this.event.transform.push(fn);
          break;
        case "derive":
          this.event.transform ??= [], this.event.transform.push(fnToContainer(fn, "derive"));
          break;
        case "beforeHandle":
          this.event.beforeHandle ??= [], this.event.beforeHandle.push(fn);
          break;
        case "resolve":
          this.event.beforeHandle ??= [], this.event.beforeHandle.push(fnToContainer(fn, "resolve"));
          break;
        case "afterHandle":
          this.event.afterHandle ??= [], this.event.afterHandle.push(fn);
          break;
        case "mapResponse":
          this.event.mapResponse ??= [], this.event.mapResponse.push(fn);
          break;
        case "afterResponse":
          this.event.afterResponse ??= [], this.event.afterResponse.push(fn);
          break;
        case "trace":
          this.event.trace ??= [], this.event.trace.push(fn);
          break;
        case "error":
          this.event.error ??= [], this.event.error.push(fn);
          break;
        case "stop":
          this.event.stop ??= [], this.event.stop.push(fn);
          break;
      }
    }
    return this;
  }
  as(type) {
    if (promoteEvent(this.event.parse, type), promoteEvent(this.event.transform, type), promoteEvent(this.event.beforeHandle, type), promoteEvent(this.event.afterHandle, type), promoteEvent(this.event.mapResponse, type), promoteEvent(this.event.afterResponse, type), promoteEvent(this.event.trace, type), promoteEvent(this.event.error, type), type === "scoped") {
      if (this.validator.scoped = mergeSchemaValidator(this.validator.scoped, this.validator.local), this.validator.local = null, this.standaloneValidator.local !== null)
        this.standaloneValidator.scoped ||= [], this.standaloneValidator.scoped.push(...this.standaloneValidator.local), this.standaloneValidator.local = null;
    } else if (type === "global") {
      if (this.validator.global = mergeSchemaValidator(this.validator.global, mergeSchemaValidator(this.validator.scoped, this.validator.local)), this.validator.scoped = null, this.validator.local = null, this.standaloneValidator.local !== null)
        this.standaloneValidator.scoped ||= [], this.standaloneValidator.scoped.push(...this.standaloneValidator.local), this.standaloneValidator.local = null;
      if (this.standaloneValidator.scoped !== null)
        this.standaloneValidator.global ||= [], this.standaloneValidator.global.push(...this.standaloneValidator.scoped), this.standaloneValidator.scoped = null;
    }
    return this;
  }
  group(prefix, schemaOrRun, run) {
    let instance = new Elysia({ ...this.config, prefix: "" });
    instance.singleton = { ...this.singleton }, instance.definitions = { ...this.definitions }, instance.getServer = () => this.getServer(), instance.inference = cloneInference(this.inference), instance.extender = { ...this.extender }, instance["~parser"] = this["~parser"], instance.standaloneValidator = { local: [...this.standaloneValidator.local ?? []], scoped: [...this.standaloneValidator.scoped ?? []], global: [...this.standaloneValidator.global ?? []] };
    let isSchema = typeof schemaOrRun === "object", sandbox = (isSchema ? run : schemaOrRun)(instance);
    if (this.singleton = mergeDeep(this.singleton, instance.singleton), this.definitions = mergeDeep(this.definitions, instance.definitions), sandbox.event.request?.length)
      this.event.request = [...this.event.request || [], ...sandbox.event.request || []];
    if (sandbox.event.mapResponse?.length)
      this.event.mapResponse = [...this.event.mapResponse || [], ...sandbox.event.mapResponse || []];
    return this.model(sandbox.definitions.type), Object.values(instance.router.history).forEach(({ method, path, handler, hooks }) => {
      if (path = (isSchema ? "" : this.config.prefix ?? "") + prefix + path, isSchema) {
        let { body, headers, query, params, cookie, response, ...hook } = schemaOrRun, localHook = hooks;
        this.applyMacro(hook);
        let hasStandaloneSchema = body || headers || query || params || cookie || response;
        this.add(method, path, handler, mergeHook(hook, { ...localHook || {}, error: !localHook.error ? sandbox.event.error : Array.isArray(localHook.error) ? [...localHook.error ?? [], ...sandbox.event.error ?? []] : [localHook.error, ...sandbox.event.error ?? []], standaloneValidator: hook.standaloneValidator || localHook.standaloneValidator || hasStandaloneSchema ? [...hook.standaloneValidator ?? [], ...localHook.standaloneValidator ?? [], ...hasStandaloneSchema ? [{ body, headers, query, params, cookie, response }] : []] : undefined }), undefined);
      } else
        this.add(method, path, handler, mergeHook(hooks, { error: sandbox.event.error }), { skipPrefix: true });
    }), this;
  }
  guard(hook, run) {
    if (!run) {
      if (typeof hook === "object") {
        if (this.applyMacro(hook), hook.detail)
          if (this.config.detail)
            this.config.detail = mergeDeep(Object.assign({}, this.config.detail), hook.detail);
          else
            this.config.detail = hook.detail;
        if (hook.tags)
          if (!this.config.detail)
            this.config.detail = { tags: hook.tags };
          else
            this.config.detail.tags = hook.tags;
        let type = hook.as ?? "local";
        if (hook.schema === "standalone") {
          if (!this.standaloneValidator[type])
            this.standaloneValidator[type] = [];
          let response = !hook?.response ? undefined : typeof hook.response === "string" || (Kind in hook.response) || ("~standard" in hook.response) ? { 200: hook.response } : hook?.response;
          this.standaloneValidator[type].push({ body: hook.body, headers: hook.headers, params: hook.params, query: hook.query, response, cookie: hook.cookie });
        } else
          this.validator[type] = { body: hook.body ?? this.validator[type]?.body, headers: hook.headers ?? this.validator[type]?.headers, params: hook.params ?? this.validator[type]?.params, query: hook.query ?? this.validator[type]?.query, response: hook.response ?? this.validator[type]?.response, cookie: hook.cookie ?? this.validator[type]?.cookie };
        if (hook.parse)
          this.on({ as: type }, "parse", hook.parse);
        if (hook.transform)
          this.on({ as: type }, "transform", hook.transform);
        if (hook.derive)
          this.on({ as: type }, "derive", hook.derive);
        if (hook.beforeHandle)
          this.on({ as: type }, "beforeHandle", hook.beforeHandle);
        if (hook.resolve)
          this.on({ as: type }, "resolve", hook.resolve);
        if (hook.afterHandle)
          this.on({ as: type }, "afterHandle", hook.afterHandle);
        if (hook.mapResponse)
          this.on({ as: type }, "mapResponse", hook.mapResponse);
        if (hook.afterResponse)
          this.on({ as: type }, "afterResponse", hook.afterResponse);
        if (hook.error)
          this.on({ as: type }, "error", hook.error);
        return this;
      }
      return this.guard({}, hook);
    }
    let instance = new Elysia({ ...this.config, prefix: "" });
    instance.singleton = { ...this.singleton }, instance.definitions = { ...this.definitions }, instance.inference = cloneInference(this.inference), instance.extender = { ...this.extender }, instance.getServer = () => this.getServer();
    let sandbox = run(instance);
    if (this.singleton = mergeDeep(this.singleton, instance.singleton), this.definitions = mergeDeep(this.definitions, instance.definitions), sandbox.getServer = () => this.server, sandbox.event.request?.length)
      this.event.request = [...this.event.request || [], ...sandbox.event.request || []];
    if (sandbox.event.mapResponse?.length)
      this.event.mapResponse = [...this.event.mapResponse || [], ...sandbox.event.mapResponse || []];
    return this.model(sandbox.definitions.type), Object.values(instance.router.history).forEach(({ method, path, handler, hooks: localHook }) => {
      let { body, headers, query, params, cookie, response, ...guardHook } = hook, hasStandaloneSchema = body || headers || query || params || cookie || response;
      this.add(method, path, handler, mergeHook(guardHook, { ...localHook || {}, error: !localHook.error ? sandbox.event.error : Array.isArray(localHook.error) ? [...localHook.error ?? [], ...sandbox.event.error ?? []] : [localHook.error, ...sandbox.event.error ?? []], standaloneValidator: !hasStandaloneSchema ? localHook.standaloneValidator : [...localHook.standaloneValidator ?? [], { body, headers, query, params, cookie, response }] }));
    }), this;
  }
  use(plugin) {
    if (!plugin)
      return this;
    if (Array.isArray(plugin)) {
      let app = this;
      for (let p of plugin)
        app = app.use(p);
      return app;
    }
    if (plugin instanceof Promise)
      return this.promisedModules.add(plugin.then((plugin2) => {
        if (typeof plugin2 === "function")
          return plugin2(this);
        if (plugin2 instanceof Elysia)
          return this._use(plugin2).compile();
        if (plugin2.constructor?.name === "Elysia")
          return this._use(plugin2).compile();
        if (typeof plugin2.default === "function")
          return plugin2.default(this);
        if (plugin2.default instanceof Elysia)
          return this._use(plugin2.default);
        if (plugin2.constructor?.name === "Elysia")
          return this._use(plugin2.default);
        if (plugin2.constructor?.name === "_Elysia")
          return this._use(plugin2.default);
        try {
          return this._use(plugin2.default);
        } catch (error) {
          throw console.error('Invalid plugin type. Expected Elysia instance, function, or module with "default" as Elysia instance or function that returns Elysia instance.'), error;
        }
      }).then((v) => {
        if (v && typeof v.compile === "function")
          v.compile();
        return v;
      })), this;
    return this._use(plugin);
  }
  propagatePromiseModules(plugin) {
    if (plugin.promisedModules.size <= 0)
      return this;
    for (let promise of plugin.promisedModules.promises)
      this.promisedModules.add(promise.then((v) => {
        if (!v)
          return;
        let t2 = this._use(v);
        if (t2 instanceof Promise)
          return t2.then((v2) => {
            if (v2)
              v2.compile();
            else
              v.compile();
          });
        return v.compile();
      }));
    return this;
  }
  _use(plugin) {
    if (typeof plugin === "function") {
      let instance = plugin(this);
      if (instance instanceof Promise)
        return this.promisedModules.add(instance.then((plugin2) => {
          if (plugin2 instanceof Elysia) {
            plugin2.getServer = () => this.getServer(), plugin2.getGlobalRoutes = () => this.getGlobalRoutes(), plugin2.getGlobalDefinitions = () => this.getGlobalDefinitions(), plugin2.model(this.definitions.type), plugin2.error(this.definitions.error);
            for (let { method, path, handler, hooks } of Object.values(plugin2.router.history))
              this.add(method, path, handler, hooks, undefined);
            if (plugin2 === this)
              return;
            return this.propagatePromiseModules(plugin2), plugin2;
          }
          if (typeof plugin2 === "function")
            return plugin2(this);
          if (typeof plugin2.default === "function")
            return plugin2.default(this);
          return this._use(plugin2);
        }).then((v) => {
          if (v && typeof v.compile === "function")
            v.compile();
          return v;
        })), this;
      return instance;
    }
    this.propagatePromiseModules(plugin);
    let name = plugin.config.name, seed = plugin.config.seed;
    if (plugin.getParent = () => this, plugin.getServer = () => this.getServer(), plugin.getGlobalRoutes = () => this.getGlobalRoutes(), plugin.getGlobalDefinitions = () => this.getGlobalDefinitions(), plugin.standaloneValidator?.scoped)
      if (this.standaloneValidator.local)
        this.standaloneValidator.local = this.standaloneValidator.local.concat(plugin.standaloneValidator.scoped);
      else
        this.standaloneValidator.local = plugin.standaloneValidator.scoped;
    if (plugin.standaloneValidator?.global)
      if (this.standaloneValidator.global)
        this.standaloneValidator.global = this.standaloneValidator.global.concat(plugin.standaloneValidator.global);
      else
        this.standaloneValidator.global = plugin.standaloneValidator.global;
    if (isNotEmpty(plugin["~parser"]))
      this["~parser"] = { ...plugin["~parser"], ...this["~parser"] };
    if (plugin.setHeaders)
      this.headers(plugin.setHeaders);
    if (name) {
      if (!(name in this.dependencies))
        this.dependencies[name] = [];
      let current = seed !== undefined ? checksum(name + JSON.stringify(seed)) : 0;
      if (!this.dependencies[name].some(({ checksum: checksum2 }) => current === checksum2))
        this.extender.macro = { ...this.extender.macro, ...plugin.extender.macro }, this.extender.higherOrderFunctions = this.extender.higherOrderFunctions.concat(plugin.extender.higherOrderFunctions);
    } else {
      if (isNotEmpty(plugin.extender.macro))
        this.extender.macro = { ...this.extender.macro, ...plugin.extender.macro };
      if (plugin.extender.higherOrderFunctions.length)
        this.extender.higherOrderFunctions = this.extender.higherOrderFunctions.concat(plugin.extender.higherOrderFunctions);
    }
    if (plugin.extender.higherOrderFunctions.length) {
      deduplicateChecksum(this.extender.higherOrderFunctions);
      let hofHashes = [];
      for (let i = 0;i < this.extender.higherOrderFunctions.length; i++) {
        let hof = this.extender.higherOrderFunctions[i];
        if (hof.checksum) {
          if (hofHashes.includes(hof.checksum))
            this.extender.higherOrderFunctions.splice(i, 1), i--;
          hofHashes.push(hof.checksum);
        }
      }
      hofHashes.length = 0;
    }
    if (this.inference = mergeInference(this.inference, plugin.inference), isNotEmpty(plugin.singleton.decorator))
      this.decorate(plugin.singleton.decorator);
    if (isNotEmpty(plugin.singleton.store))
      this.state(plugin.singleton.store);
    if (isNotEmpty(plugin.definitions.type))
      this.model(plugin.definitions.type);
    if (isNotEmpty(plugin.definitions.error))
      this.error(plugin.definitions.error);
    if (isNotEmpty(plugin.extender.macro))
      this.extender.macro = { ...this.extender.macro, ...plugin.extender.macro };
    for (let { method, path, handler, hooks } of Object.values(plugin.router.history))
      this.add(method, path, handler, hooks);
    if (name) {
      if (!(name in this.dependencies))
        this.dependencies[name] = [];
      let current = seed !== undefined ? checksum(name + JSON.stringify(seed)) : 0;
      if (this.dependencies[name].some(({ checksum: checksum2 }) => current === checksum2))
        return this;
      if (this.dependencies[name].push(this.config?.analytic ? { name: plugin.config.name, seed: plugin.config.seed, checksum: current, dependencies: plugin.dependencies, stack: plugin.telemetry?.stack, routes: plugin.router.history, decorators: plugin.singleton, store: plugin.singleton.store, error: plugin.definitions.error, derive: plugin.event.transform?.filter((x) => x?.subType === "derive").map((x) => ({ fn: x.toString(), stack: Error().stack ?? "" })), resolve: plugin.event.transform?.filter((x) => x?.subType === "resolve").map((x) => ({ fn: x.toString(), stack: Error().stack ?? "" })) } : { name: plugin.config.name, seed: plugin.config.seed, checksum: current, dependencies: plugin.dependencies }), isNotEmpty(plugin.event))
        this.event = mergeLifeCycle(this.event, filterGlobalHook(plugin.event), current);
    } else if (isNotEmpty(plugin.event))
      this.event = mergeLifeCycle(this.event, filterGlobalHook(plugin.event));
    if (plugin.validator.global)
      this.validator.global = mergeHook(this.validator.global, { ...plugin.validator.global });
    if (plugin.validator.scoped)
      this.validator.local = mergeHook(this.validator.local, { ...plugin.validator.scoped });
    return this;
  }
  macro(macroOrName, macro) {
    if (typeof macroOrName === "string" && !macro)
      throw Error("Macro function is required");
    if (typeof macroOrName === "string")
      this.extender.macro[macroOrName] = macro;
    else
      this.extender.macro = { ...this.extender.macro, ...macroOrName };
    return this;
  }
  applyMacro(localHook, appliable = localHook, { iteration = 0, applied = {} } = {}) {
    if (iteration >= 16)
      return;
    let macro = this.extender.macro;
    for (let [key, value] of Object.entries(appliable)) {
      if (key in macro === false)
        continue;
      let macroHook = typeof macro[key] === "function" ? macro[key](value) : macro[key];
      if (!macroHook || typeof macro[key] === "object" && value === false)
        return;
      let seed = checksum(key + JSON.stringify(macroHook.seed ?? value));
      if (seed in applied)
        continue;
      applied[seed] = true;
      for (let [k2, value2] of Object.entries(macroHook)) {
        if (k2 === "seed")
          continue;
        if (k2 in emptySchema) {
          insertStandaloneValidator(localHook, k2, value2), delete localHook[key];
          continue;
        }
        if (k2 === "introspect") {
          value2?.(localHook), delete localHook[key];
          continue;
        }
        if (k2 === "detail") {
          if (!localHook.detail)
            localHook.detail = {};
          localHook.detail = mergeDeep(localHook.detail, value2, { mergeArray: true }), delete localHook[key];
          continue;
        }
        if (k2 in macro) {
          this.applyMacro(localHook, { [k2]: value2 }, { applied, iteration: iteration + 1 }), delete localHook[key];
          continue;
        }
        if ((k2 === "derive" || k2 === "resolve") && typeof value2 === "function")
          value2 = { fn: value2, subType: k2 };
        switch (typeof localHook[k2]) {
          case "function":
            localHook[k2] = [localHook[k2], value2];
            break;
          case "object":
            if (Array.isArray(localHook[k2]))
              localHook[k2].push(value2);
            else
              localHook[k2] = [localHook[k2], value2];
            break;
          case "undefined":
            localHook[k2] = value2;
            break;
        }
        delete localHook[key];
      }
    }
  }
  mount(path, handleOrConfig, config) {
    if (path instanceof Elysia || typeof path === "function" || path.length === 0 || path === "/") {
      let run = typeof path === "function" ? path : path instanceof Elysia ? path.compile().fetch : handleOrConfig instanceof Elysia ? handleOrConfig.compile().fetch : typeof handleOrConfig === "function" ? handleOrConfig : (() => {
        throw Error("Invalid handler");
      })(), handler2 = ({ request, path: path2 }) => run(new Request(replaceUrlPath(request.url, path2), { method: request.method, headers: request.headers, signal: request.signal, credentials: request.credentials, referrerPolicy: request.referrerPolicy, duplex: request.duplex, redirect: request.redirect, mode: request.mode, keepalive: request.keepalive, integrity: request.integrity, body: request.body }));
      return this.route("ALL", "/*", handler2, { parse: "none", ...config, detail: { ...config?.detail, hide: true }, config: { mount: run } }), this;
    }
    let handle = handleOrConfig instanceof Elysia ? handleOrConfig.compile().fetch : typeof handleOrConfig === "function" ? handleOrConfig : (() => {
      throw Error("Invalid handler");
    })(), length = (typeof path === "string" && this.config.prefix ? this.config.prefix + path : path).length - (path.endsWith("*") ? 1 : 0), handler = ({ request, path: path2 }) => handle(new Request(replaceUrlPath(request.url, path2.slice(length) || "/"), { method: request.method, headers: request.headers, signal: request.signal, credentials: request.credentials, referrerPolicy: request.referrerPolicy, duplex: request.duplex, redirect: request.redirect, mode: request.mode, keepalive: request.keepalive, integrity: request.integrity, body: request.body }));
    return this.route("ALL", path, handler, { parse: "none", ...config, detail: { ...config?.detail, hide: true }, config: { mount: handle } }), this.route("ALL", path + (path.endsWith("/") ? "*" : "/*"), handler, { parse: "none", ...config, detail: { ...config?.detail, hide: true }, config: { mount: handle } }), this;
  }
  get(path, handler, hook) {
    return this.add("GET", path, handler, hook), this;
  }
  post(path, handler, hook) {
    return this.add("POST", path, handler, hook), this;
  }
  put(path, handler, hook) {
    return this.add("PUT", path, handler, hook), this;
  }
  patch(path, handler, hook) {
    return this.add("PATCH", path, handler, hook), this;
  }
  delete(path, handler, hook) {
    return this.add("DELETE", path, handler, hook), this;
  }
  options(path, handler, hook) {
    return this.add("OPTIONS", path, handler, hook), this;
  }
  all(path, handler, hook) {
    return this.add("ALL", path, handler, hook), this;
  }
  head(path, handler, hook) {
    return this.add("HEAD", path, handler, hook), this;
  }
  connect(path, handler, hook) {
    return this.add("CONNECT", path, handler, hook), this;
  }
  route(method, path, handler, hook) {
    return this.add(method.toUpperCase(), path, handler, hook, hook?.config), this;
  }
  ws(path, options) {
    if (this["~adapter"].ws)
      this["~adapter"].ws(this, path, options);
    else
      console.warn("Current adapter doesn't support WebSocket");
    return this;
  }
  state(options, name, value) {
    if (name === undefined)
      value = options, options = { as: "append" }, name = "";
    else if (value === undefined) {
      if (typeof options === "string")
        value = name, name = options, options = { as: "append" };
      else if (typeof options === "object")
        value = name, name = "";
    }
    let { as } = options;
    if (typeof name !== "string")
      return this;
    switch (typeof value) {
      case "object":
        if (!value || !isNotEmpty(value))
          return this;
        if (name) {
          if (name in this.singleton.store)
            this.singleton.store[name] = mergeDeep(this.singleton.store[name], value, { override: as === "override" });
          else
            this.singleton.store[name] = value;
          return this;
        }
        if (value === null)
          return this;
        return this.singleton.store = mergeDeep(this.singleton.store, value, { override: as === "override" }), this;
      case "function":
        if (name) {
          if (as === "override" || !(name in this.singleton.store))
            this.singleton.store[name] = value;
        } else
          this.singleton.store = value(this.singleton.store);
        return this;
      default:
        if (as === "override" || !(name in this.singleton.store))
          this.singleton.store[name] = value;
        return this;
    }
  }
  decorate(options, name, value) {
    if (name === undefined)
      value = options, options = { as: "append" }, name = "";
    else if (value === undefined) {
      if (typeof options === "string")
        value = name, name = options, options = { as: "append" };
      else if (typeof options === "object")
        value = name, name = "";
    }
    let { as } = options;
    if (typeof name !== "string")
      return this;
    switch (typeof value) {
      case "object":
        if (name) {
          if (name in this.singleton.decorator)
            this.singleton.decorator[name] = mergeDeep(this.singleton.decorator[name], value, { override: as === "override" });
          else
            this.singleton.decorator[name] = value;
          return this;
        }
        if (value === null)
          return this;
        return this.singleton.decorator = mergeDeep(this.singleton.decorator, value, { override: as === "override" }), this;
      case "function":
        if (name) {
          if (as === "override" || !(name in this.singleton.decorator))
            this.singleton.decorator[name] = value;
        } else
          this.singleton.decorator = value(this.singleton.decorator);
        return this;
      default:
        if (as === "override" || !(name in this.singleton.decorator))
          this.singleton.decorator[name] = value;
        return this;
    }
  }
  derive(optionsOrTransform, transform2) {
    if (!transform2)
      transform2 = optionsOrTransform, optionsOrTransform = { as: "local" };
    let hook = { subType: "derive", fn: transform2 };
    return this.onTransform(optionsOrTransform, hook);
  }
  model(name, model) {
    let onlyTypebox = (a) => {
      let res = {};
      for (let key in a)
        if (!("~standard" in a[key]))
          res[key] = a[key];
      return res;
    };
    switch (typeof name) {
      case "object":
        let parsedTypebox = {}, kvs = Object.entries(name);
        if (!kvs.length)
          return this;
        for (let [key, value] of kvs) {
          if (key in this.definitions.type)
            continue;
          if ("~standard" in value)
            this.definitions.type[key] = value;
          else
            parsedTypebox[key] = this.definitions.type[key] = value, parsedTypebox[key].$id ??= `#/components/schemas/${key}`;
        }
        return this.definitions.typebox = t.Module({ ...this.definitions.typebox.$defs, ...parsedTypebox }), this;
      case "function":
        let result = name(this.definitions.type);
        return this.definitions.type = result, this.definitions.typebox = t.Module(onlyTypebox(result)), this;
      case "string":
        if (!model)
          break;
        if (this.definitions.type[name] = model, "~standard" in model)
          return this;
        let newModel = { ...model, id: model.$id ?? `#/components/schemas/${name}` };
        return this.definitions.typebox = t.Module({ ...this.definitions.typebox.$defs, ...newModel }), this;
    }
    if (!model)
      return this;
    if (this.definitions.type[name] = model, "~standard" in model)
      return this;
    return this.definitions.typebox = t.Module({ ...this.definitions.typebox.$defs, [name]: model }), this;
  }
  Ref(key) {
    return t.Ref(key);
  }
  mapDerive(optionsOrDerive, mapper) {
    if (!mapper)
      mapper = optionsOrDerive, optionsOrDerive = { as: "local" };
    let hook = { subType: "mapDerive", fn: mapper };
    return this.onTransform(optionsOrDerive, hook);
  }
  affix(base, type, word) {
    if (word === "")
      return this;
    let delimieter = ["_", "-", " "], capitalize = (word2) => word2[0].toUpperCase() + word2.slice(1), joinKey = base === "prefix" ? (prefix, word2) => delimieter.includes(prefix.at(-1) ?? "") ? prefix + word2 : prefix + capitalize(word2) : delimieter.includes(word.at(-1) ?? "") ? (suffix, word2) => word2 + suffix : (suffix, word2) => word2 + capitalize(suffix), remap = (type2) => {
      let store = {};
      switch (type2) {
        case "decorator":
          for (let key in this.singleton.decorator)
            store[joinKey(word, key)] = this.singleton.decorator[key];
          this.singleton.decorator = store;
          break;
        case "state":
          for (let key in this.singleton.store)
            store[joinKey(word, key)] = this.singleton.store[key];
          this.singleton.store = store;
          break;
        case "model":
          for (let key in this.definitions.type)
            store[joinKey(word, key)] = this.definitions.type[key];
          this.definitions.type = store;
          break;
        case "error":
          for (let key in this.definitions.error)
            store[joinKey(word, key)] = this.definitions.error[key];
          this.definitions.error = store;
          break;
      }
    }, types = Array.isArray(type) ? type : [type];
    for (let type2 of types.some((x) => x === "all") ? ["decorator", "state", "model", "error"] : types)
      remap(type2);
    return this;
  }
  prefix(type, word) {
    return this.affix("prefix", type, word);
  }
  suffix(type, word) {
    return this.affix("suffix", type, word);
  }
  compile() {
    if (this["~adapter"].beforeCompile?.(this), this["~adapter"].isWebStandard) {
      if (this._handle = this.config.aot ? composeGeneralHandler(this) : createDynamicHandler(this), Object.defineProperty(this, "fetch", { value: this._handle, configurable: true, writable: true }), typeof this.server?.reload === "function")
        this.server.reload({ ...this.server || {}, fetch: this.fetch });
      return this;
    }
    if (typeof this.server?.reload === "function")
      this.server.reload(this.server || {});
    return this._handle = composeGeneralHandler(this), this;
  }
  handle = async (request) => this.fetch(request);
  get fetch() {
    let fetch = this.config.aot ? composeGeneralHandler(this) : createDynamicHandler(this);
    return Object.defineProperty(this, "fetch", { value: fetch, configurable: true, writable: true }), fetch;
  }
  handleError = async (context, error) => {
    return (this.handleError = this.config.aot ? composeErrorHandler(this) : createDynamicErrorHandler(this))(context, error);
  };
  listen = (options, callback) => {
    return this["~adapter"].listen(this)(options, callback), this;
  };
  stop = async (closeActiveConnections) => {
    return await this["~adapter"].stop?.(this, closeActiveConnections), this;
  };
  [Symbol.dispose] = () => {
    if (this.server)
      this.stop();
  };
  get modules() {
    return this.promisedModules;
  }
}

// src/utils/ip.ts
import { networkInterfaces } from "os";
function getLocalIp() {
  const interfaces = networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      const isIPv4 = iface.family === "IPv4" || iface.family === 4;
      if (isIPv4 && !iface.internal) {
        const lowerName = name.toLowerCase();
        let weight = 0;
        if (lowerName.includes("docker") || lowerName.includes("veth") || lowerName.includes("tailscale") || lowerName.includes("cni") || lowerName.includes("flannel") || lowerName.includes("br-") || lowerName.includes("vmnet") || lowerName.includes("wsl") || lowerName.includes("tun") || lowerName.includes("tap")) {
          continue;
        }
        if (iface.address.startsWith("192.168."))
          weight += 10;
        else if (iface.address.startsWith("10."))
          weight += 5;
        else if (iface.address.startsWith("172.")) {
          const parts = iface.address.split(".");
          const second = parseInt(parts[1], 10);
          if (second >= 16 && second <= 31)
            weight += 5;
        }
        if (lowerName.startsWith("en") || lowerName.startsWith("eth") || lowerName.startsWith("wlan") || lowerName.startsWith("wi-fi")) {
          weight += 2;
        }
        candidates.push({ address: iface.address, name, weight });
      }
    }
  }
  candidates.sort((a, b) => b.weight - a.weight);
  if (candidates.length > 0) {
    return candidates[0].address;
  }
  return "0.0.0.0";
}

// src/config/index.ts
var HOST = getLocalIp();
var PORT = Bun.env.PORT ?? "3000";

// node_modules/@elysiajs/static/dist/index.mjs
var import_fast_decode_uri_component5 = __toESM(require_fast_decode_uri_component2(), 1);

// node_modules/@elysiajs/static/dist/utils.mjs
var fs;
var path;
var isBun3 = typeof Bun < "u" && !!Bun.file;
function getBuiltinModule() {
  if (fs || (fs = process.getBuiltinModule("fs/promises")), path || (path = process.getBuiltinModule("path")), !path) {
    console.warn("@elysiajs/static require path to be available.");
    return;
  }
  return [fs, path];
}
async function listHTMLFiles(dir) {
  if (fs || getBuiltinModule(), isBun3) {
    const glob = new Bun.Glob("**/*.html"), files = [];
    for await (const file of glob.scan(dir))
      files.push(path.join(dir, file));
    return files;
  }
  return [];
}
async function listFiles(dir) {
  if (fs || getBuiltinModule(), isBun3) {
    const glob = new Bun.Glob("**/*"), files2 = [];
    for await (const file of glob.scan(dir))
      files2.push(path.join(dir, file));
    return files2;
  }
  const files = await fs.readdir(dir).catch(() => []);
  return (await Promise.all(files.map(async (name) => {
    const file = dir + path.sep + name, stats = await fs.stat(file).catch(() => null);
    return stats ? stats.isDirectory() ? await listFiles(file) : [path.resolve(dir, file)] : [];
  }))).flat();
}
function fileExists(path2) {
  return fs || getBuiltinModule(), fs.stat(path2).then(() => true, () => false);
}

class LRUCache {
  constructor(max = 250, ttl = 10800) {
    this.max = max;
    this.ttl = ttl;
    this.map = /* @__PURE__ */ new Map;
  }
  get(key) {
    const entry = this.map.get(key);
    if (entry)
      return entry[1] <= Date.now() ? void this.delete(key) : (this.map.delete(key), this.map.set(key, entry), entry[0]);
  }
  set(key, value) {
    if (this.interval || (this.interval = setInterval(() => {
      const now = Date.now();
      for (const [key2, entry] of this.map)
        entry[1] <= now && this.map.delete(key2);
    }, this.ttl)), this.map.has(key))
      this.map.delete(key);
    else if (this.map.size >= this.max) {
      const oldestKey = this.map.keys().next().value;
      oldestKey !== undefined && this.delete(oldestKey);
    }
    this.map.set(key, [value, Date.now() + this.ttl * 1000]);
  }
  delete(key) {
    this.map.get(key) && this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
  size() {
    return this.map.size;
  }
  [Symbol.dispose]() {
    this.interval && clearInterval(this.interval);
  }
}
function isCached(headers, etag, filePath) {
  if (headers["cache-control"] && /no-cache|no-store/.test(headers["cache-control"]))
    return false;
  if ("if-none-match" in headers) {
    const ifNoneMatch = headers["if-none-match"];
    return ifNoneMatch === "*" ? true : ifNoneMatch === null || typeof etag != "string" ? false : ifNoneMatch === etag;
  }
  if (headers["if-modified-since"]) {
    const ifModifiedSince = headers["if-modified-since"];
    try {
      return fs.stat(filePath).then((stat2) => {
        if (stat2.mtime !== undefined && stat2.mtime.getTime() <= Date.parse(ifModifiedSince))
          return true;
      });
    } catch {}
  }
  return false;
}
var Crypto;
function getFile(path2) {
  return isBun3 ? Bun.file(path2) : (fs || getBuiltinModule(), fs.readFile(path2));
}
async function generateETag(file) {
  return isBun3 ? new Bun.CryptoHasher("md5").update(await file.arrayBuffer()).digest("base64") : (Crypto || (Crypto = process.getBuiltinModule("crypto")), Crypto ? Crypto.createHash("md5").update(file).digest("base64") : void console.warn("[@elysiajs/static] crypto is required to generate etag."));
}
var isNotEmpty2 = (obj) => {
  if (!obj)
    return false;
  for (const _2 in obj)
    return true;
  return false;
};

// node_modules/@elysiajs/static/dist/index.mjs
async function staticPlugin({
  assets = "public",
  prefix = "/public",
  staticLimit = 1024,
  alwaysStatic = false,
  ignorePatterns = [".DS_Store", ".git", ".env"],
  headers: initialHeaders,
  maxAge = 86400,
  directive = "public",
  etag: useETag = true,
  extension = true,
  indexHTML = true,
  decodeURI,
  silent
} = {}) {
  if (typeof process > "u" || typeof process.getBuiltinModule > "u")
    return silent || console.warn("[@elysiajs/static] require process.getBuiltinModule. Static plugin is disabled"), new Elysia;
  const builtinModule = getBuiltinModule();
  if (!builtinModule)
    return new Elysia;
  const [fs2, path2] = builtinModule, normalizePath = path2.sep !== "/" ? (p) => p.replace(/\\/g, "/") : (p) => p, fileCache = new LRUCache;
  prefix === path2.sep && (prefix = "");
  const assetsDir = path2.resolve(assets), shouldIgnore = ignorePatterns.length ? (file) => ignorePatterns.find((pattern) => typeof pattern == "string" ? pattern.includes(file) : pattern.test(file)) : () => false, app = new Elysia({
    name: "static",
    seed: prefix
  });
  if (alwaysStatic) {
    const files = await listFiles(path2.resolve(assets));
    if (files.length <= staticLimit)
      for (const absolutePath of files) {
        let handleCache2 = function({
          headers: requestHeaders
        }) {
          if (etag) {
            let cached = isCached(requestHeaders, etag, absolutePath);
            if (cached === true)
              return new Response(null, {
                status: 304,
                headers: isNotEmpty2(initialHeaders) ? initialHeaders : undefined
              });
            if (cached !== false) {
              const cache2 = fileCache.get(pathName);
              return cache2 ? cache2.clone() : cached.then((cached2) => {
                if (cached2)
                  return new Response(null, {
                    status: 304,
                    headers: initialHeaders || undefined
                  });
                const response2 = new Response(file, {
                  headers: Object.assign({
                    "Cache-Control": maxAge ? `${directive}, max-age=${maxAge}` : directive
                  }, initialHeaders, etag ? { Etag: etag } : {})
                });
                return fileCache.set(prefix, response2), response2.clone();
              });
            }
          }
          const cache = fileCache.get(pathName);
          if (cache)
            return cache.clone();
          const response = new Response(file, {
            headers: Object.assign({
              "Cache-Control": maxAge ? `${directive}, max-age=${maxAge}` : directive
            }, initialHeaders, etag ? { Etag: etag } : {})
          });
          return fileCache.set(pathName, response), response.clone();
        };
        var handleCache = handleCache2;
        if (!absolutePath || shouldIgnore(absolutePath))
          continue;
        let relativePath = absolutePath.replace(assetsDir, "");
        decodeURI && (relativePath = import_fast_decode_uri_component5.default(relativePath) ?? relativePath);
        let pathName = normalizePath(path2.join(prefix, relativePath));
        if (isBun3 && absolutePath.endsWith(".html")) {
          const htmlBundle = await import(absolutePath);
          app.get(pathName, htmlBundle.default), indexHTML && pathName.endsWith("/index.html") && app.get(pathName.replace("/index.html", ""), htmlBundle.default);
          continue;
        }
        extension || (pathName = normalizePath(pathName.slice(0, pathName.lastIndexOf("."))));
        const file = isBun3 ? getFile(absolutePath) : await getFile(absolutePath);
        if (!file)
          return silent || console.warn(`[@elysiajs/static] Failed to load file: ${absolutePath}`), new Elysia;
        const etag = await generateETag(file);
        app.get(pathName, useETag ? handleCache2 : new Response(file, isNotEmpty2(initialHeaders) ? {
          headers: initialHeaders
        } : undefined)), indexHTML && pathName.endsWith("/index.html") && app.get(pathName.replace("/index.html", ""), useETag ? handleCache2 : new Response(file, isNotEmpty2(initialHeaders) ? {
          headers: initialHeaders
        } : undefined));
      }
    return app;
  }
  if (!(`GET_${prefix}/*` in app.routeTree)) {
    if (isBun3) {
      const htmls = await listHTMLFiles(path2.resolve(assets));
      for (const absolutePath of htmls) {
        if (!absolutePath || shouldIgnore(absolutePath))
          continue;
        let relativePath = absolutePath.replace(assetsDir, "");
        const pathName = normalizePath(path2.join(prefix, relativePath)), htmlBundle = await import(absolutePath);
        app.get(pathName, htmlBundle.default), indexHTML && pathName.endsWith("/index.html") && app.get(pathName.replace("/index.html", ""), htmlBundle.default);
      }
    }
    app.onError(() => {}).get(`${prefix.endsWith("/") ? prefix.slice(0, -1) : prefix}/*`, async ({ params, headers: requestHeaders }) => {
      const pathName = normalizePath(path2.join(assets, decodeURI ? import_fast_decode_uri_component5.default(params["*"]) ?? params["*"] : params["*"]));
      if (shouldIgnore(pathName))
        throw new NotFoundError;
      const cache = fileCache.get(pathName);
      if (cache)
        return cache.clone();
      try {
        const fileStat = await fs2.stat(pathName).catch(() => null);
        if (!fileStat)
          throw new NotFoundError;
        if (!indexHTML && fileStat.isDirectory())
          throw new NotFoundError;
        let file;
        if (!isBun3 && indexHTML) {
          const htmlPath = path2.join(pathName, "index.html"), cache2 = fileCache.get(htmlPath);
          if (cache2)
            return cache2.clone();
          await fileExists(htmlPath) && (file = await getFile(htmlPath));
        }
        if (!file && !fileStat.isDirectory() && await fileExists(pathName))
          file = await getFile(pathName);
        else
          throw new NotFoundError;
        if (!useETag)
          return new Response(file, isNotEmpty2(initialHeaders) ? { headers: initialHeaders } : undefined);
        const etag = await generateETag(file);
        if (etag && await isCached(requestHeaders, etag, pathName))
          return new Response(null, {
            status: 304
          });
        const response = new Response(file, {
          headers: Object.assign({
            "Cache-Control": maxAge ? `${directive}, max-age=${maxAge}` : directive
          }, initialHeaders, etag ? { Etag: etag } : {})
        });
        return fileCache.set(pathName, response), response.clone();
      } catch (error) {
        throw error instanceof NotFoundError ? error : (silent || console.error("[@elysiajs/static]", error), new NotFoundError);
      }
    });
  }
  return app;
}

// node_modules/@elysiajs/cors/dist/index.mjs
var isBun5 = typeof new Headers()?.toJSON === "function";
var processHeaders = (headers) => {
  if (isBun5)
    return Object.keys(headers.toJSON()).join(", ");
  let keys = "";
  let i = 0;
  headers.forEach((_2, key) => {
    if (i)
      keys = keys + ", " + key;
    else
      keys = key;
    i++;
  });
  return keys;
};
var cors = (config) => {
  let {
    aot = true,
    origin = true,
    methods = true,
    allowedHeaders = true,
    exposeHeaders = true,
    credentials = true,
    maxAge = 5,
    preflight = true
  } = config ?? {};
  if (Array.isArray(allowedHeaders))
    allowedHeaders = allowedHeaders.join(", ");
  if (Array.isArray(exposeHeaders))
    exposeHeaders = exposeHeaders.join(", ");
  const origins = typeof origin === "boolean" ? undefined : Array.isArray(origin) ? origin : [origin];
  const app = new Elysia({
    name: "@elysiajs/cors",
    seed: config,
    aot
  });
  const anyOrigin = origins?.some((o) => o === "*");
  const originMap = {};
  if (origins) {
    for (const origin2 of origins)
      if (typeof origin2 === "string")
        originMap[origin2] = true;
  }
  const processOrigin = (origin2, request, from) => {
    if (Array.isArray(origin2))
      return origin2.some((o) => processOrigin(o, request, from));
    switch (typeof origin2) {
      case "string":
        if (from in originMap)
          return true;
        const fromProtocol = from.indexOf("://");
        if (fromProtocol !== -1)
          from = from.slice(fromProtocol + 3);
        return origin2 === from;
      case "function":
        return origin2(request) === true;
      case "object":
        if (origin2 instanceof RegExp)
          return origin2.test(from);
    }
    return false;
  };
  const handleOrigin = (set, request) => {
    if (origin === true) {
      set.headers.vary = "*";
      set.headers["access-control-allow-origin"] = request.headers.get("Origin") || "*";
      return;
    }
    if (anyOrigin) {
      set.headers.vary = "*";
      set.headers["access-control-allow-origin"] = "*";
      return;
    }
    if (!origins?.length)
      return;
    if (origins.length) {
      const from = request.headers.get("Origin") ?? "";
      for (let i = 0;i < origins.length; i++) {
        const value = processOrigin(origins[i], request, from);
        if (value === true) {
          set.headers.vary = origin ? "Origin" : "*";
          set.headers["access-control-allow-origin"] = from || "*";
          return;
        }
      }
    }
    set.headers.vary = "Origin";
  };
  const handleMethod = (set, method) => {
    if (!method)
      return;
    if (methods === true)
      return set.headers["access-control-allow-methods"] = method ?? "*";
    if (methods === false || !methods?.length)
      return;
    if (methods === "*")
      return set.headers["access-control-allow-methods"] = "*";
    if (!Array.isArray(methods))
      return set.headers["access-control-allow-methods"] = methods;
    set.headers["access-control-allow-methods"] = methods.join(", ");
  };
  const defaultHeaders = {};
  if (typeof exposeHeaders === "string")
    defaultHeaders["access-control-expose-headers"] = exposeHeaders;
  if (typeof allowedHeaders === "string")
    defaultHeaders["access-control-allow-headers"] = allowedHeaders;
  if (credentials === true)
    defaultHeaders["access-control-allow-credentials"] = "true";
  app.headers(defaultHeaders);
  function handleOption({ set, request, headers }) {
    handleOrigin(set, request);
    handleMethod(set, request.headers.get("access-control-request-method"));
    if (allowedHeaders === true || exposeHeaders === true) {
      if (allowedHeaders === true)
        set.headers["access-control-allow-headers"] = headers["access-control-request-headers"];
      if (exposeHeaders === true)
        set.headers["access-control-expose-headers"] = Object.keys(headers).join(",");
    }
    if (maxAge)
      set.headers["access-control-max-age"] = maxAge.toString();
    return new Response(null, {
      status: 204
    });
  }
  if (preflight)
    app.options("/", handleOption).options("/*", handleOption);
  return app.onRequest(function processCors({ set, request }) {
    handleOrigin(set, request);
    if (preflight && request.method === "OPTIONS") {
      return handleOption({
        set,
        request,
        headers: isBun5 ? request.headers.toJSON() : Object.fromEntries(request.headers.entries())
      });
    }
    handleMethod(set, request.method);
    if (allowedHeaders === true || exposeHeaders === true) {
      const headers = processHeaders(request.headers);
      if (allowedHeaders === true)
        set.headers["access-control-allow-headers"] = headers;
      if (exposeHeaders === true)
        set.headers["access-control-expose-headers"] = headers;
    }
  });
};

// src/models/UserStore.ts
class UserStore {
  users = new Map;
  addUser(user) {
    this.users.set(user.id, user);
  }
  removeUser(id) {
    this.users.delete(id);
  }
  getUser(id) {
    return this.users.get(id);
  }
  getAllUsers() {
    return Array.from(this.users.values());
  }
}
var userStore = new UserStore;

// src/utils/nameGenerator.ts
function generatePseudoEnglishName() {
  const syllables = [
    "la",
    "no",
    "ra",
    "mi",
    "ka",
    "ta",
    "le",
    "ve",
    "xo",
    "zi",
    "an",
    "el",
    "or",
    "un"
  ];
  const len = 2 + Math.floor(Math.random() * 2);
  let name = "";
  for (let i = 0;i < len; i++) {
    name += syllables[Math.floor(Math.random() * syllables.length)];
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}
var usedNames = new Set;
function generateUniqueName() {
  let name;
  do {
    name = generatePseudoEnglishName();
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

// src/services/UserService.ts
class UserService {
  createUser(id, deviceName, ip) {
    const name = generateUniqueName();
    const avatarIndex = Math.floor(Math.random() * 30);
    const avatar = `https://${HOST}:${PORT}/avatars/adventurer/adventurer-${avatarIndex}.webp`;
    const user = {
      id,
      name,
      avatar,
      deviceName,
      ip,
      joinedAt: Date.now()
    };
    userStore.addUser(user);
    return user;
  }
  removeUser(id) {
    userStore.removeUser(id);
  }
  getAllUsers() {
    return userStore.getAllUsers();
  }
}
var userService = new UserService;

// src/services/SignalingService.ts
class SignalingService {
  processSignal(senderId, message) {
    const { target, type } = message;
    const targetUser = userStore.getUser(target);
    if (!targetUser) {
      return null;
    }
    return `user:${target}`;
  }
}
var signalingService = new SignalingService;

// src/controllers/ws.ts
var wsController = new Elysia().ws("/ws", {
  query: t.Object({
    deviceName: t.Optional(t.String())
  }),
  open(ws) {
    const deviceName = ws.data.query.deviceName || "Unknown Device";
    const user = userService.createUser(ws.id, deviceName, ws.remoteAddress);
    ws.subscribe(`user:${user.id}`);
    ws.subscribe("global-updates");
    console.log(`User joined: ${user.name} (${user.id})`);
    ws.send({
      type: "user-info",
      data: user
    });
    const users = userService.getAllUsers();
    ws.publish("global-updates", {
      type: "user-list",
      data: users
    });
    ws.send({
      type: "user-list",
      data: users
    });
  },
  message(ws, message) {
    if (message.target && message.type) {
      const { target, payload } = message;
      const targetTopic = signalingService.processSignal(ws.id, {
        target,
        type: message.type,
        payload
      });
      if (targetTopic) {
        ws.publish(targetTopic, {
          type: message.type,
          sender: ws.id,
          payload
        });
      }
    }
  },
  close(ws) {
    console.log(`User left: ${ws.id}`);
    userService.removeUser(ws.id);
    const users = userService.getAllUsers();
    ws.publish("global-updates", {
      type: "user-list",
      data: users
    });
  }
});

// src/index.ts
import path2 from "path";
var __dirname = "/Users/hanlinfei/Code/\u524D\u7AEF/project/LAN-Transfer/server/src";
var serverReady;
var app = new Elysia().use(cors()).use(staticPlugin({
  assets: "public",
  prefix: "/"
})).use(wsController).head("/", () => new Response(null, { status: 200 })).listen({
  port: PORT,
  hostname: HOST,
  tls: {
    key: Bun.file(path2.resolve(__dirname, "../cert/server.key")),
    cert: Bun.file(path2.resolve(__dirname, "../cert/server.crt")),
    rejectUnauthorized: false,
    requestCert: true
  }
}, async () => {
  serverReady = Promise.resolve();
  const ip = HOST;
  console.log(`Server is running at:`);
  console.log(`  - Local:   https://localhost:${PORT}`);
  console.log(`  - Network: https://${ip}:${PORT}`);
});
export {
  serverReady
};
