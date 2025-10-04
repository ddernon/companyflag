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

const isFirefox = typeof browser !== 'undefined' && browser.runtime;
const browserAPI = isFirefox ? browser : chrome;

const faviconFlag = document.getElementById('favicon-flag');
const menuIconFlag = document.getElementById('menu-icon-flag');
const badgeFlag = document.getElementById('badge-flag');
const badgeBgColorKnown = document.getElementById('badge-bg-color-known');
const badgeBgColorUnknown = document.getElementById('badge-bg-color-unknown');

const autoupdateEnabled = document.getElementById('autoupdate-enabled');
const updateUrl = document.getElementById('update-url');
const updateFrequency = document.getElementById('update-frequency');

function saveOptions() {
  browserAPI.storage.sync.set({
    badgeFlag: badgeFlag.checked,
    badgeBgColorKnown: badgeBgColorKnown.value,
    badgeBgColorUnknown: badgeBgColorUnknown.value,
    faviconFlag: faviconFlag.checked,
    menuIconFlag: menuIconFlag.checked,
    update: {
      enabled: !!autoupdateEnabled.checked,
      checkEveryDays: Number(updateFrequency.value) || 1,
      urls: [updateUrl.value || '']
    }
  }, () => {
    // Show success message
    const status = document.getElementById('status');
    status.textContent = 'Options saved';
    status.className = 'success';
    status.style.display = 'block';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
}


async function restoreOptions() {
  const storedOptions = await browserAPI.storage.sync.get([
    'badgeFlag',
    'badgeBgColorKnown',
    'badgeBgColorUnknown',
    'faviconFlag',
    'menuIconFlag',
    'update'
  ]);
  badgeFlag.checked = storedOptions.badgeFlag;
  badgeBgColorKnown.value = storedOptions.badgeBgColorKnown;
  badgeBgColorUnknown.value = storedOptions.badgeBgColorUnknown;
  faviconFlag.checked = storedOptions.faviconFlag;
  menuIconFlag.checked = storedOptions.menuIconFlag;
  const update = storedOptions.update || {};
  autoupdateEnabled.checked = update.enabled;
  updateFrequency.value = update.checkEveryDays;
  updateUrl.value = (Array.isArray(update.urls) && update.urls.length > 0) ? update.urls[0] : '';
}


// Initialize when page loads
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
