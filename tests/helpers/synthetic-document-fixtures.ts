import { deflateRawSync } from "node:zlib";

// Produces a deterministic minimal ZIP/DOCX document containing one synthetic paragraph.
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function createDocxFixture(text: string): Buffer {
  const xml = Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t xml:space="preserve">${text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</w:t></w:r></w:p></w:body></w:document>`);
  const name = Buffer.from("word/document.xml");
  const compressed = deflateRawSync(xml);
  const crc = crc32(xml);
  const local = Buffer.alloc(30 + name.length);
  local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt16LE(8,6);
  local.writeUInt32LE(crc,14); local.writeUInt32LE(compressed.length,18); local.writeUInt32LE(xml.length,22);
  local.writeUInt16LE(name.length,26); name.copy(local,30);
  const localRecord = Buffer.concat([local,compressed]);
  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50,0); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(8,8);
  central.writeUInt32LE(crc,16); central.writeUInt32LE(compressed.length,20); central.writeUInt32LE(xml.length,24);
  central.writeUInt16LE(name.length,28); name.copy(central,46); central.writeUInt32LE(0,42);
  const centralRecord = Buffer.concat([central]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(1,8); end.writeUInt16LE(1,10);
  end.writeUInt32LE(centralRecord.length,12); end.writeUInt32LE(localRecord.length,16);
  return Buffer.concat([localRecord,centralRecord,end]);
}
