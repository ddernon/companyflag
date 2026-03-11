/*!*****************************************************************************

  CompanyFlag - Show company and country of current website
  Copyright (C) 2025-2026 David Dernoncourt <daviddernoncourt.com>

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
import { ChromeMessage, getElement, getFormElement } from './shared';

let settingsManager: SettingsManager;

const faviconFlag = getFormElement('favicon-flag');
const menuIconFlag = getFormElement('menu-icon-flag');
const badgeFlag = getFormElement('badge-flag');
const badgeBgColorKnown = getFormElement('badge-bg-color-known');
const badgeBgColorUnknown = getFormElement('badge-bg-color-unknown');
const getCountryOnCommitted = getFormElement('get-country-on-committed');

const autoupdateEnabled = getFormElement('autoupdate-enabled');
const updateUrl = getFormElement('update-url');
const updateFrequency = getFormElement('update-frequency');

const statusDiv = getElement('status');

let advancedSectionExpanded = false;

async function saveOptions() {
  settingsManager.settings = {
    advancedSectionExpanded: advancedSectionExpanded,
    badgeFlag: badgeFlag.checked,
    badgeBgColorKnown: badgeBgColorKnown.value,
    badgeBgColorUnknown: badgeBgColorUnknown.value,
    faviconFlag: faviconFlag.checked,
    getCountryOnCommitted: getCountryOnCommitted.checked,
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

async function saveAndReload() {
  await saveOptions();
  chrome.runtime.reload();
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
  toggleAdvanced(storedOptions.advancedSectionExpanded);
  badgeFlag.checked = storedOptions.badgeFlag;
  badgeBgColorKnown.value = storedOptions.badgeBgColorKnown;
  badgeBgColorUnknown.value = storedOptions.badgeBgColorUnknown;
  faviconFlag.checked = storedOptions.faviconFlag;
  getCountryOnCommitted.checked = storedOptions.getCountryOnCommitted;
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

function toggleAdvanced(force?: boolean) {
  const content = getElement('advanced-content');
  const arrow = getElement('advanced-toggle-arrow');
  
  advancedSectionExpanded = content.classList.toggle('expanded', force);
  arrow.classList.toggle('expanded', force);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', restoreOptions);
getElement('cancel').addEventListener('click', restoreOptions);
getElement('save').addEventListener('click', saveOptions);
getElement('save-n-reload').addEventListener('click', saveAndReload);
getElement('update-now').addEventListener('click', updateNowButtonClicked);

getElement('advanced-toggle').addEventListener('click', () => {
  toggleAdvanced();
});

getElement('reset-list').addEventListener('click', () => {
  // TODO: implement reset list functionality
});
