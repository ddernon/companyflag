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


import { ChromeMessage, getEl } from './shared';

const flagEl = getEl('flag');
const countryCodeEl = getEl('countryCode');
const domainEl = getEl('domain');
const companyEl = getEl('company');
const countryEl = getEl('country');
const contentEl = getEl('content');
const traceEl = getEl('trace');

const loadingEl = getEl('loading');
const unknownEl = getEl('unknown');
const specialPageEl = getEl('special-page');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    console.log('[POPUP DEBUG] Current tab:', JSON.stringify(tab, null, 2));
    
    if (!tab.url) {
      console.log('[POPUP DEBUG] No tab URL available');
      showUnknown();
      return;
    }
    
    console.log('[POPUP DEBUG] Requesting country info for:', tab.url);
    
    // Request country info from background script
    chrome.runtime.sendMessage<ChromeMessage>(
      { action: 'getCountryInfo', url: tab.url, tabId: tab.id },
      async response => {
        console.log('[POPUP DEBUG] Received response:', response);
        loadingEl.style.display = 'none';
        
        if (response[0] && response[0].country) {
          await showCountryInfo(response);
        } else if (response === false) {
          showSpecialPage();
        } else {
          showUnknown();
        }
      }
    );
    
  } catch (error) {
    console.error('[POPUP DEBUG] Error in popup:', error);
    loadingEl.style.display = 'none';
    showUnknown();
  }
});

async function showCountryInfo(info: any) {
  const topMatch = info[0];
  flagEl.textContent = topMatch.flag || '🌐';
  countryCodeEl.textContent = topMatch.country;
  domainEl.textContent = topMatch.domain;
  companyEl.textContent = topMatch.company || 'Unknown';
  countryEl.textContent = topMatch.countryName;
  traceEl.textContent = info.map((e: any) => {
    let out = e.domain;
    if (e.company) out += ' (' + e.company + ')';
    if (e.flag) out += ' ' + e.flag;
    return out;
  }).join('\n');
  
  contentEl.style.display = 'block';
}

function showUnknown() {
  loadingEl.style.display = 'none';
  unknownEl.style.display = 'block';
}

function showSpecialPage() {
  loadingEl.style.display = 'none';
  specialPageEl.style.display = 'block';
}


getEl('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

document.querySelectorAll('.ntlink').forEach(el => {
  el.addEventListener('click', ev => {
    ev.preventDefault();
    chrome.tabs.create({
      url: el.getAttribute('href')!
    });
    window.close();
  });
});
