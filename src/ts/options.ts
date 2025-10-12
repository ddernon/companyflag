/*!*****************************************************************************

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


import SettingsManager from './settingsManager';
import { ChromeMessage, getEl, getFormEl } from './shared';

let settingsManager: SettingsManager;

const faviconFlag = getFormEl('favicon-flag');
const menuIconFlag = getFormEl('menu-icon-flag');
const badgeFlag = getFormEl('badge-flag');
const badgeBgColorKnown = getFormEl('badge-bg-color-known');
const badgeBgColorUnknown = getFormEl('badge-bg-color-unknown');

const autoupdateEnabled = getFormEl('autoupdate-enabled');
const updateUrl = getFormEl('update-url');
const updateFrequency = getFormEl('update-frequency');

const statusDiv = getEl('status');

async function saveOptions() {
  settingsManager.settings = {
    badgeFlag: badgeFlag.checked,
    badgeBgColorKnown: badgeBgColorKnown.value,
    badgeBgColorUnknown: badgeBgColorUnknown.value,
    faviconFlag: faviconFlag.checked,
    menuIconFlag: menuIconFlag.checked,
    update: {
      enabled: autoupdateEnabled.checked,
      checkEveryDays: Number(updateFrequency.value) || 1,
      urls: [updateUrl.value || '']
    }
  };
  await settingsManager.save();
  showSuccessMessage('Options saved');
}

function showSuccessMessage(text: string) {
  statusDiv.className = 'success';
  showResultMessage(text);
}
function showFailureMessage(text: string) {
  statusDiv.className = 'failure';
  showResultMessage(text);
}
function showResultMessage(text: string) {
  statusDiv.textContent = text;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 2000);
}


async function restoreOptions() {
  settingsManager = await SettingsManager.load();
  const storedOptions = settingsManager.settings;
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


async function updateNow(): Promise<boolean> {
  if (!updateUrl.value) return false;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage<ChromeMessage>(
      { action: 'updateDataNow', forceUrl: updateUrl.value },
      (response: boolean) => {
        resolve(response);
      }
    );
  });
}

async function updateNowButtonClicked(): Promise<void> {
  const result = await updateNow();
  if (result) {
    showSuccessMessage('Data updated');
  } else {
    showFailureMessage('Failed to update data')
  }
}


// Initialize when page loads
document.addEventListener('DOMContentLoaded', restoreOptions);
getEl('save').addEventListener('click', saveOptions);
getEl('update-now').addEventListener('click', updateNowButtonClicked);
