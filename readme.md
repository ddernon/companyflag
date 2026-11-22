# CompanyFlag

[![Firefox Add-ons](https://img.shields.io/amo/v/companyflag.svg)](https://addons.mozilla.org/firefox/addon/companyflag)
[![Microsoft Edge Add-on](https://img.shields.io/badge/dynamic/json?label=microsoft%20edge%20add-on&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fdlingnkckhfckhnjlnpfnbckmalepbdk)](https://microsoftedge.microsoft.com/addons/detail/dlingnkckhfckhnjlnpfnbckmalepbdk)

A browser extension that displays the country of origin of the current website’s company.

## Building from source

The build process has been conceived to be platform-agnostic.
The commands listed below are for Linux, but should be trivial to
adapt for Windows. Not sure about MacOS, but I believe they should
be the same there too.

### For Firefox

- Install NodeJS (latest LTS)
- `npm i -g rollup`
- `npm i`
- `rollup -c --minify` (--minify is optional, obviously)
- `rm -rf src/ts` (optional as well, but no point in bundling the TS files)
- `cp license-AGPL-3.0-or-later.txt src/`
- `cp license-ODbL-1.0.txt src/`
- `node utils/download_flags.js src/img/flags/`
- And now the `src` folder is ready to be zipped

### For Chrome/Chromium/Edge/Opera/Brave, etc.

Follow the Firefox steps, but before zipping, run this command
in order to convert the provided `manifest.json` to its Chrome version:
`node utils/convert_manifest.js src/manifest.json src/manifest.json`

## Privacy & Security

- No data is sent to external servers except for the
(optional) database auto-update
- Data is cached locally using browser storage

## Contributing

- Don’t forget to test with at least one Firefox-based and one Chrome-based browser
- Submit your pull request ideally on Framagit, otherwise on Gitlab or Github
