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
import { ChromeMessage, Log } from './shared';

let finishedLoading: boolean = false;
let updateIsRunning: boolean = false;
let settingsManager: SettingsManager;
const loadSettings = (async () => {
  settingsManager = await SettingsManager.load();
})();

// Default country data
let COMPANY_DATA: {[key: string]: DomainData};
const loadCompanyData = (async () => {
  const [jsonData, storage] = await Promise.all([
    loadLocalJSON('data/company_data.json'),
    chrome.storage.local.get('companyData')
  ]);
  if (storage.companyData) {
    COMPANY_DATA = storage.companyData;
  } else {
    COMPANY_DATA = jsonData;
  }
})();

let lastDataUpdateTimestampMs: number = 0;
const loadLastDataUpdate = (async () => {
  lastDataUpdateTimestampMs = (await chrome.storage.local.get('lastUpdate')).lastUpdate;;
})();

let COUNTRY_NAMES: {[key: string]: string};
const loadCountryNames = (async () => {
  COUNTRY_NAMES = await loadLocalJSON('data/country_names.json');
})();

async function loadLocalJSON(path: string) {
  const url = chrome.runtime.getURL(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load "${path}": ` + res.status);
  return await res.json();
}

async function makeSureAllLoaded() {
  if (finishedLoading) return;
  await Promise.all([
    loadSettings,
    loadCompanyData,
    loadLastDataUpdate,
    loadCountryNames,
  ])
  finishedLoading = true;
}

interface DomainData {
  company?: string;
  country?: string;
  countryName?: string;
  domain?: string;
  parent?: string;
}

// TODO
const EU_COUNTRIES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
  "IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"];

async function getCountryName(countryCode: string) {
  await makeSureAllLoaded();
  return COUNTRY_NAMES[countryCode] || countryCode;
}

function getFlagEmoji(countryCodeIso2: string | undefined) {
  if (!countryCodeIso2 || countryCodeIso2.length !== 2) return '';
  const codePoints = countryCodeIso2
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}


async function updateCountryData(forceUrl: string | undefined) {
  Log.debug('Running updateCountryData()');
  if (updateIsRunning) return;
  updateIsRunning = true;
  await makeSureAllLoaded();

  try {
    const settings = settingsManager.settings;
    if (!settings.update.enabled && !forceUrl) {
      Log.debug('updateCountryData(): skipping since updates are disabled');
      return;
    }
    const updateUrl = forceUrl || settings.update.urls[0];
    const response = await fetch(updateUrl, { cache: 'no-store' });
    if (response.ok) {
      const remoteData = await response.json();
      lastDataUpdateTimestampMs = Date.now();
      COMPANY_DATA = await loadLocalJSON('data/company_data.json');
      COMPANY_DATA = { ...COMPANY_DATA, ...remoteData };
      chrome.storage.local.set({
        companyData: COMPANY_DATA,
        lastUpdate: lastDataUpdateTimestampMs
      });
      Log.debug('updateCountryData(): merged remote and local data');
    }
  } catch (error) {
    Log.warn('updateCountryData(): Failed to fetch remote data, using local data. Reason:', error);
  } finally {
    updateIsRunning = false;
  }
}

// Load cached data on startup +/- update data if needed
// chrome.runtime.onStartup.addListener(async () => {
//   Log.debug('chrome.runtime.onStartup.addListener');
//   await makeSureAllLoaded();

//   const stored = await chrome.storage.local.get('companyData');
//   if (stored.companyData) {
//     COMPANY_DATA = stored.companyData;
//   }

//   await updateCountryDataIfNeeded();
// });

// chrome.runtime.onConnect.addListener(() => {
//   Log.debug('chrome.runtime.onConnect.addListener');
//   updateCountryDataIfNeeded();
// });

async function updateCountryDataIfNeeded() {
  Log.debug('updateCountryDataIfNeeded');
  await makeSureAllLoaded();

  // const lastUpdate = (await chrome.storage.local.get('lastUpdate')).lastUpdate;
  // Log.debug('lastUpdate', lastUpdate)
  
  const settings = settingsManager.settings;
  if (!settings.update.enabled) return;

  const dayInMs = 24 * 3600 * 1000;
  let updateInterval = dayInMs * settings.update.checkEveryDays;
  if (!lastDataUpdateTimestampMs || Date.now() - lastDataUpdateTimestampMs > updateInterval) {
    await updateCountryData(undefined);
  }
}


function extractDomain(url: string) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function getAllDataForUrl(url: string) {
  const protocol = new URL(url).protocol;
  Log.debug(`getAllDataForUrl called on "${url}" => protocol = "${protocol}"`);
  if (!['http:', 'https:'].includes(protocol)) {
    return false;
  }
  const domain = extractDomain(url);
  return getAllDataForDomain(domain);
}

async function getAllDataForDomain(domain: string | null) {
  Log.debug(`getAllDataForDomain() with domain: `, domain);
  await makeSureAllLoaded();
  if (!domain) return [];

  const seen = new Set();
  seen.add(domain);

  let domainData: DomainData | null = await getCountryInfo(domain);
  if (domainData?.country) {
    domainData.countryName = await getCountryName(domainData.country);
  }
  let output = [structuredClone(domainData)];
  while (domainData?.parent) {
    if (seen.has(domainData.parent)) {
      Log.warn('Cycle detected at', domainData.parent);
      break;
    }
    seen.add(domainData.parent);
    let parentData = await getCountryInfo(domainData.parent);
    if (!parentData) {
      break;
    }
    domainData = structuredClone(parentData);
    if (domainData?.country) {
      domainData.countryName = await getCountryName(domainData.country);
    }
    output.push(structuredClone(domainData));
  }

  return output.reverse();
}


async function getCountryInfo(domain: string): Promise<DomainData | null> {
  // console.log(`[DEBUG] getCountryInfo called for domain ${domain}`);
  // Direct match
  if (COMPANY_DATA[domain]) {
    return {domain: domain, ...COMPANY_DATA[domain]};
  }
  
  // Try parent domains
  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parentDomain = parts.slice(i).join('.');
    if (COMPANY_DATA[parentDomain]) {
      return {domain: parentDomain, ...COMPANY_DATA[parentDomain]};
    }
  }
  
  return null;
}


async function updateBadge(
  tabId: number,
  countryCode: string | undefined,
  countryName: string | undefined,
) {
  Log.debug(`updateBadge called for tab ${tabId} with country: ${countryCode} (${countryName})`);
  await makeSureAllLoaded();
  const settings = settingsManager.settings;
  if (countryCode) {
    const badgeFlag = settings.badgeFlag;
    chrome.action.setBadgeText({
      text: badgeFlag ? getFlagEmoji(countryCode) : countryCode,
      tabId: tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: badgeFlag ? '#fff0' : settings.badgeBgColorKnown,
      tabId: tabId
    });
    chrome.action.setTitle({
      title: `${countryName} ${getFlagEmoji(countryCode)}`,
      tabId: tabId
    });
    if (settings.menuIconFlag) {
      chrome.action.setIcon({
        path: chrome.runtime.getURL(`img/flags/${countryCode.toLowerCase()}.webp`),
        tabId: tabId
      })
    }
  } else {
    chrome.action.setBadgeText({
      text: '??',
      tabId: tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: settings.badgeBgColorUnknown,
      tabId: tabId
    });
    chrome.action.setTitle({
      title: 'Website country unkwnon',
      tabId: tabId
    });
  }
}


// TODO: put this back as an option
// Listen for when navigation is committed (URL is finalized)
// chrome.webNavigation.onCommitted.addListener(async details => {
//   console.log(`[DEBUG] onCommitted: ${details.url} (tab ${details.tabId})`);
//   // Only handle main frame navigations (not iframes)
//   if (details.frameId !== 0) {
//     return;
//   }
//   const infoRaw = await getAllDataForUrl(details.url);
//   if (infoRaw === false) {
//     return;
//   }
//   const info = infoRaw[0];
//   await updateBadge(details.tabId, info?.country, info?.countryName);
// });


chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  Log.debug('Message received:', message);
  
  // Handle popup requests for country info
  if (message.action === 'getCountryInfo') {
    (async () => {
      await updateCountryDataIfNeeded();
      const infoRaw = await getAllDataForUrl(message.url);
      // console.log('[DEBUG] Country info found:', info);
      if (infoRaw === false) {
        sendResponse(false);
        return true;
      }
      
      const response = infoRaw.map(e => {
        const flag = e?.country ? getFlagEmoji(e.country) : null;
        
        return {
          domain: e?.domain,
          company: e?.company,
          country: e?.country,
          countryName: e?.countryName,
          flag: flag
        };
      })

      const tabId = message.tabId || sender.tab?.id;
      if (tabId) {
        updateBadge(tabId, response[0].country, response[0].countryName);
      }
      
      Log.log('Sending response:', response);
      sendResponse(response);
    })();
  } else if (message.action == 'updateDataNow') {
    (async () => {
      await updateCountryData(message.forceUrl);
      sendResponse(true);
    })();
  } else {
    return false;
  }

  return true;
});

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Force data update (if update enabled)
    lastDataUpdateTimestampMs = 0;
    updateCountryDataIfNeeded();
  }
});
