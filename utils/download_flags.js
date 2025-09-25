/*******************************************************************************

  CompanyFlag - Show company and country of current website
  Copyright (C) 2025 David Dernoncourt <daviddernoncourt.com>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  See the GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see {http://www.gnu.org/licenses/}.

*/


/********* Example:
node download_flags.js ../src/img/flags/
*********/

import https from 'https';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const FLAG_ZIP_URL = 'https://flagcdn.com/128x96-webp.zip';

// Basic ZIP file parser
class SimpleZipExtractor {
  constructor(buffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  extract(targetDir) {
    // Find end of central directory record
    let eocdOffset = -1;
    for (let i = this.buffer.byteLength - 22; i >= 0; i--) {
      if (this.view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('Invalid ZIP file: End of central directory not found');
    }

    // Read central directory info
    const totalEntries = this.view.getUint16(eocdOffset + 10, true);
    const centralDirOffset = this.view.getUint32(eocdOffset + 16, true);

    // Process each file entry
    let offset = centralDirOffset;
    for (let i = 0; i < totalEntries; i++) {
      const entry = this.readCentralDirectoryEntry(offset);
      if (!entry.isDirectory) {
        this.extractFile(entry, targetDir);
      }
      offset = entry.nextOffset;
    }
  }

  readCentralDirectoryEntry(offset) {
    const signature = this.view.getUint32(offset, true);
    if (signature !== 0x02014b50) {
      throw new Error('Invalid central directory entry signature');
    }

    const compressionMethod = this.view.getUint16(offset + 10, true);
    const compressedSize = this.view.getUint32(offset + 20, true);
    const uncompressedSize = this.view.getUint32(offset + 24, true);
    const filenameLength = this.view.getUint16(offset + 28, true);
    const extraFieldLength = this.view.getUint16(offset + 30, true);
    const commentLength = this.view.getUint16(offset + 32, true);
    const localHeaderOffset = this.view.getUint32(offset + 42, true);

    const filename = new TextDecoder().decode(
      new Uint8Array(this.buffer, offset + 46, filenameLength)
    );

    return {
      filename,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      isDirectory: filename.endsWith('/'),
      nextOffset: offset + 46 + filenameLength + extraFieldLength + commentLength
    };
  }

  extractFile(entry, targetDir) {
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = this.sanitizePath(entry.filename);
    if (!sanitizedFilename) {
      console.warn(`Skipping potentially dangerous path: ${entry.filename}`);
      return;
    }

    // Read local file header
    const localOffset = entry.localHeaderOffset;
    const localSignature = this.view.getUint32(localOffset, true);
    if (localSignature !== 0x04034b50) {
      throw new Error('Invalid local file header signature');
    }

    const localFilenameLength = this.view.getUint16(localOffset + 26, true);
    const localExtraFieldLength = this.view.getUint16(localOffset + 28, true);

    // Calculate data offset
    const dataOffset = localOffset + 30 + localFilenameLength + localExtraFieldLength;
    const compressedData = new Uint8Array(this.buffer, dataOffset, entry.compressedSize);

    let fileData;
    if (entry.compressionMethod === 0) {
      // No compression
      fileData = compressedData;
    } else if (entry.compressionMethod === 8) {
      // Deflate compression
      fileData = zlib.inflateRawSync(Buffer.from(compressedData));
    } else {
      throw new Error(`Unsupported compression method: ${entry.compressionMethod}`);
    }

    // Write file using sanitized path
    const outputPath = path.join(targetDir, sanitizedFilename);
    const resolvedOutputPath = path.resolve(outputPath);
    const resolvedTargetDir = path.resolve(targetDir);

    // Final safety check: ensure resolved path is within target directory
    if (!resolvedOutputPath.startsWith(resolvedTargetDir + path.sep) && 
        resolvedOutputPath !== resolvedTargetDir) {
      console.warn(`Blocked path traversal attempt: ${entry.filename}`);
      return;
    }

    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, fileData);
    console.log(`Extracted: ${sanitizedFilename}`);
  }

  sanitizePath(filename) {
    // Remove any leading slashes or backslashes
    let sanitized = filename.replace(/^[/\\]+/, '');
    
    // Split into path components
    const parts = sanitized.split(/[/\\]+/);
    const safeParts = [];

    for (const part of parts) {
      // Skip empty parts, current directory, and parent directory references
      if (part === '' || part === '.' || part === '..') {
        continue;
      }
      
      // Skip parts with null bytes or other dangerous characters
      if (part.includes('\0') || /[<>:"|?*]/.test(part)) {
        return null;
      }
      
      safeParts.push(part);
    }

    // Return null for empty or root paths
    if (safeParts.length === 0) {
      return null;
    }

    return safeParts.join(path.sep);
  }
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        return downloadFile(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const [,, targetFolder] = process.argv;
  try {
    if (!targetFolder) {
      throw new Error('Usage: node script.js <targetFolder>');
    }
    console.log(`Downloading ${FLAG_ZIP_URL}...`);
    const zipBuffer = await downloadFile(FLAG_ZIP_URL);
    console.log(`Downloaded ${zipBuffer.byteLength} bytes`);

    console.log(`Extracting to ${targetFolder}...`);
    const extractor = new SimpleZipExtractor(zipBuffer);
    extractor.extract(targetFolder);

    console.log('Extraction complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
