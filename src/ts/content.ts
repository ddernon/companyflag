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
import { ChromeMessage } from './shared';

let settingsManager: SettingsManager;
const loadSettings = (async () => {
  settingsManager = await SettingsManager.load();
})();

// Function to add country indicator to favicon
function addCountryToFavicon(countryCode: string, flag: string) {
  console.log(`[DEBUG] addCountryToFavicon: countryCode=${countryCode}; flag=${flag}`);
  if (!countryCode || !flag) return;

  try {
    // Select existing favicon or create a new one if none exists
    const favicon: HTMLLinkElement =
      document.querySelector<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')
      ?? (() => {
        const el = document.createElement('link');
        el.rel = 'icon';
        document.head.appendChild(el);
        return el;
      })();
    
    // Create canvas to modify favicon
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 32;
    canvas.height = 32;
    
    // Function to create favicon with just the flag
    function createFlagOnlyFavicon() {
      // ctx.fillStyle = '#ffffff';
      // ctx.fillRect(0, 0, 32, 32);
      ctx.clearRect(0, 0, 32, 32);
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(flag, 16, 16);
      favicon.href = canvas.toDataURL();
    }
    
    // Function to create favicon with original icon + flag
    function createCombinedFavicon(originalImg: CanvasImageSource) {
      // Clear canvas
      ctx.clearRect(0, 0, 32, 32);
      
      // Draw original favicon at full size
      ctx.drawImage(originalImg, 0, 0, 32, 32);
      
      // Add country flag overlay in bottom-right corner
      ctx.font = '16px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeText(flag, 31, 31);
      ctx.fillText(flag, 31, 31);
      
      // Update favicon
      favicon.href = canvas.toDataURL();
    }
    
    // Get the favicon URL
    let faviconUrl = favicon.href;
    console.log(`[DEBUG] faviconUrl = ${faviconUrl}`);
    
    // Handle relative URLs
    if (faviconUrl && !faviconUrl.startsWith('http') && !faviconUrl.startsWith('data:')) {
      faviconUrl = new URL(faviconUrl, window.location.origin).href;
    }
    
    // If no favicon URL or it's the page URL, try common favicon paths
    if (!faviconUrl || faviconUrl === window.location.href) {
      const commonPaths = ['/favicon.ico', '/favicon.png', '/apple-touch-icon.png'];
      faviconUrl = new URL(commonPaths[0], window.location.origin).href;
    }
    
    console.log(`[DEBUG] faviconUrl after fixing = ${faviconUrl}`);
    
    // Try to load the original favicon
    if (faviconUrl && faviconUrl !== window.location.href) {
      const img = new Image();
      
      img.onload = function() {
        createCombinedFavicon(img);
      };
      
      img.onerror = function() {
        // TODO: make this a setting
        // example of non-working crossorigin: https://privacy.anthropic.com/en/
        // createFlagOnlyFavicon();
      };
      
      // Try to set CORS if supported
      try {
        img.crossOrigin = 'anonymous';
      } catch (e) {
        // Some browsers/contexts don't allow setting crossOrigin
      }
      
      img.src = faviconUrl;
    } else {
      // No favicon found, just use flag
      createFlagOnlyFavicon();
    }
    
  } catch (error) {
    console.log('Could not modify favicon:', error);
  }
}

// Function to handle country info and update favicon
async function handleCountryInfo(response: any) {
  if (!settingsManager) await loadSettings;
  const settings = settingsManager.settings;
  if (!settings.faviconFlag) {
    return
  };
  const topMatch = response[0];
  if (topMatch && topMatch.country && topMatch.flag) {
    addCountryToFavicon(topMatch.country, topMatch.flag);
  }
}

// Request country info after a short delay when page has finished loading
// It's a compromise to deal with cases where favicon takes a while to load
setTimeout(() => {
  chrome.runtime.sendMessage<ChromeMessage>(
    { action: 'getCountryInfo', url: window.location.href },
    handleCountryInfo
  );
}, 1000);
