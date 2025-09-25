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

const flagEl = document.getElementById('flag');
const countryCodeEl = document.getElementById('countryCode');
const domainEl = document.getElementById('domain');
const companyEl = document.getElementById('company');
const countryEl = document.getElementById('country');
const contentEl = document.getElementById('content');
const traceEl = document.getElementById('trace');

const loadingEl = document.getElementById('loading');
const unknownEl = document.getElementById('unknown');
const specialPageEl = document.getElementById('special-page');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current tab
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    
    console.log('[POPUP DEBUG] Current tab:', JSON.stringify(tab, null, 2));
    console.log('[POPUP DEBUG] Using API:', isFirefox ? 'Firefox browser' : 'Chrome');
    
    if (!tab.url) {
      console.log('[POPUP DEBUG] No tab URL available');
      showUnknown();
      return;
    }
    
    console.log('[POPUP DEBUG] Requesting country info for:', tab.url);
    
    // Request country info from background script
    browserAPI.runtime.sendMessage(
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

async function showCountryInfo(info) {
  const topMatch = info[0];
  flagEl.textContent = topMatch.flag || '🌐';
  countryCodeEl.textContent = topMatch.country;
  domainEl.textContent = topMatch.domain;
  companyEl.textContent = topMatch.company || 'Unknown';
  countryEl.textContent = topMatch.countryName;
  traceEl.textContent = info.map(e => {
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


document.getElementById('open-options').addEventListener('click', () => {
  browserAPI.runtime.openOptionsPage();
  window.close();
});

document.querySelectorAll('.ntlink').forEach(el => {
  el.addEventListener('click', ev => {
    ev.preventDefault();
    browserAPI.tabs.create({
      url: el.getAttribute('href')
    });
    window.close();
  });
});
