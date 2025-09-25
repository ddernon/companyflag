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

fetch(browserAPI.runtime.getURL('license.txt'))
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to load license.txt: ${response.status}\nSee https://www.gnu.org/licenses/agpl-3.0.en.html`);
    }
    return response.text();
  })
  .then(text => {
    document.getElementById('AGPLv3').textContent = text;
  })
  .catch(error => {
    console.error('Error loading license:', error);
    document.getElementById('AGPLv3').textContent = 'Error loading license file.\nSee https://www.gnu.org/licenses/agpl-3.0.en.html';
  });
