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


// Pick between Firefox or Chrome compatibility (Manifest V2 vs V3)
// TODO: remove this when dropping Manifest V2 support
const isFirefox = typeof browser !== 'undefined' && browser.runtime;
const browserAPI = isFirefox ? browser : chrome;
const actionAPI = browserAPI.action || browserAPI.browserAction;


// Default country data
let COMPANY_DATA = null;
const loadCompanyData = (async () => {
  COMPANY_DATA = await loadLocalJSON('data/company_data.json');
})();

let COUNTRY_NAMES = null;
const loadCountryNames = (async () => {
  COUNTRY_NAMES = await loadLocalJSON('data/country_names.json');
})();

async function loadLocalJSON(path) {
  const url = browserAPI.runtime.getURL(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load "${path}": ` + res.status);
  return await res.json();
}

// TODO
const EU_COUNTRIES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
  "IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"];

async function getCountryName(countryCode) {
  if (!COUNTRY_NAMES) await loadCountryNames;
  return COUNTRY_NAMES[countryCode] || countryCode;
}

function getFlagEmoji(countryCodeIso2) {
  if (!countryCodeIso2 || countryCodeIso2.length !== 2) return '';
  const codePoints = countryCodeIso2
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}


// Fetch updated country data from remote source
async function updateCountryData() {
  console.log('[DEBUG] Running updateCountryData()');
  if (!COMPANY_DATA) await loadCompanyData;

  try {
    const settings = await browserAPI.storage.sync.get([
      'update'
    ]);
    if (!settings.update?.enabled) {
      console.log('[DEBUG] updateCountryData(): skipping since updates are disabled');
      return;
    }
    const response = await fetch(settings.update?.urls[0], { cache: 'no-store' });
    if (response.ok) {
      const remoteData = await response.json();
      COMPANY_DATA = { ...COMPANY_DATA, ...remoteData };
      browserAPI.storage.local.set({ 
        companyData: COMPANY_DATA,
        lastUpdate: Date.now()
      });
      console.log('[DEBUG] updateCountryData(): merged remote and local data');
    }
  } catch (error) {
    console.warn('Failed to fetch remote data, using local data. Reason:', error);
  }
}

// Load cached data on startup +/- update data if needed
browserAPI.runtime.onStartup.addListener(async () => {
  if (!COMPANY_DATA) await loadCompanyData;

  const stored = await browserAPI.storage.local.get(['companyData', 'lastUpdate']);
  if (stored.companyData) {
    COMPANY_DATA = stored.companyData;
  }
  
  const settings = await browserAPI.storage.sync.get([
    'update'
  ]);
  const dayInMs = 24 * 3600 * 1000;
  let updateInterval = dayInMs * settings.update?.checkEveryDays;
  if (!stored.lastUpdate || Date.now() - stored.lastUpdate > updateInterval) {
    updateCountryData();
  }
});


function extractDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function getAllDataForUrl(url) {
  const protocol = new URL(url).protocol;
  console.log(`[DEBUG] getAllDataForUrl called on "${url}" => protocol = "${protocol}"`);
  if (!['http:', 'https:'].includes(protocol)) {
    return false;
  }
  const domain = extractDomain(url);
  return getAllDataForDomain(domain);
}

async function getAllDataForDomain(domain) {
  if (!COMPANY_DATA) await loadCompanyData;

  const seen = new Set();
  seen.add(domain);

  let domainData = await getCountryInfo(domain);
  if (domainData?.country) {
    domainData.countryName = await getCountryName(domainData.country);
  }
  let output = [structuredClone(domainData)];
  while (domainData?.parent) {
    if (seen.has(domainData.parent)) {
      console.warn('Cycle detected at', domainData.parent);
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


async function getCountryInfo(domain) {
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


async function updateBadge(tabId, countryCode, countryName) {
  console.log(`[DEBUG] updateBadge called for tab ${tabId} with country: ${countryCode} (${countryName})`);
  const settings = await browserAPI.storage.sync.get([
    'badgeFlag',
    'badgeBgColorKnown',
    'badgeBgColorUnknown',
    'menuIconFlag'
  ]);
  if (countryCode) {
    const badgeFlag = settings.badgeFlag;
    actionAPI.setBadgeText({
      text: badgeFlag ? getFlagEmoji(countryCode) : countryCode,
      tabId: tabId
    });
    actionAPI.setBadgeBackgroundColor({
      color: badgeFlag ? '#fff0' : settings.badgeBgColorKnown,
      tabId: tabId
    });
    actionAPI.setTitle({
      title: `${countryName} company flag ${getFlagEmoji(countryCode)}`,
      tabId: tabId
    });
    if (settings.menuIconFlag) {
      actionAPI.setIcon({
        path: browserAPI.runtime.getURL(`img/flags/${countryCode.toLowerCase()}.webp`),
        tabId: tabId
      })
    }
  } else {
    actionAPI.setBadgeText({
      text: '??',
      tabId: tabId
    });
    actionAPI.setBadgeBackgroundColor({
      color: settings.badgeBgColorUnknown,
      tabId: tabId
    });
    actionAPI.setTitle({
      title: 'Website country unkwnon',
      tabId: tabId
    });
  }
}


// TODO: put this back as an option
// Listen for when navigation is committed (URL is finalized)
// browserAPI.webNavigation.onCommitted.addListener(async details => {
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


// Handle popup requests for country info
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[DEBUG] Message received:', request);
  
  if (request.action === 'getCountryInfo') {
    (async () => {
      const infoRaw = await getAllDataForUrl(request.url);
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

      const tabId = request.tabId || sender.tab?.id;
      if (tabId) {
        updateBadge(tabId, response[0].country, response[0].countryName);
      }
      
      console.log('[DEBUG] Sending response:', response);
      sendResponse(response);
    })();
  }

  return true;
});

browserAPI.runtime.onInstalled.addListener(details => {
  const defaults = {
    badgeFlag: false,
    badgeBgColorKnown: '#4285F4',
    badgeBgColorUnknown: '#f4c542',
    faviconFlag: false,
    menuIconFlag: true,
    update: {
      enabled: false,
      checkEveryDays: 1,
      urls: ['https://raw.githubusercontent.com/ddernon/companyflag/refs/heads/master/src/data/company_data.json']
    }
  };

  if (details.reason === 'install' || details.reason === 'update') {
    // Add any missing settings while preserving existing ones
    browserAPI.storage.sync.get(defaults, result => {
      browserAPI.storage.sync.set(result);
    });
    // Update data
    updateCountryData();
  }
});
