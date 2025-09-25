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
node convert_manifest.js ..\src\manifest.json ..\test_data\manifest_chrome.json
*********/
// NB: we allow overwriting with no warning, it's a feature, not a bug!

import fs from 'fs';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: node convert_manifest.js <input_file> <output_file>');
    process.exit(1);
  }

  const [inputFile, outputFile] = args;

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file '${inputFile}' does not exist`);
    process.exit(1);
  }

  try {
    const manifestContent = fs.readFileSync(inputFile, 'utf8');
    const manifest = JSON.parse(manifestContent);

    if (!manifest.background || !manifest.background.scripts) {
      console.error('Error: No background.scripts found in manifest');
      process.exit(1);
    }

    const scripts = manifest.background.scripts;
    if (!Array.isArray(scripts)) {
      console.error('Error: background.scripts is not an array');
      process.exit(1);
    }

    if (scripts.length === 0) {
      console.error('Error: background.scripts array is empty');
      process.exit(1);
    }

    if (scripts.length > 1) {
      console.error('Error: background.scripts has more than one element');
      process.exit(1);
    }

    const serviceWorkerPath = scripts[0];
    manifest.background = {
      "service_worker": serviceWorkerPath
    };

    const updatedManifest = JSON.stringify(manifest);
    fs.writeFileSync(outputFile, updatedManifest, 'utf8');

    console.log(`Successfully updated manifest: ${inputFile} -> ${outputFile}`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in '${inputFile}'`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
