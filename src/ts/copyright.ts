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


const el_AGPLv3 = document.getElementById('AGPLv3')!;
const el_ODbL = document.getElementById('ODbL')!;

fetch(chrome.runtime.getURL('license-AGPL-3.0-or-later.txt'))
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to load license-AGPL-3.0-or-later.txt: ${response.status}\nSee https://www.gnu.org/licenses/agpl-3.0.en.html`);
    }
    return response.text();
  })
  .then(text => {
    el_AGPLv3.textContent = text;
  })
  .catch(error => {
    console.error('Error loading license:', error);
    el_AGPLv3.textContent = 'Error loading license file.\nSee https://www.gnu.org/licenses/agpl-3.0.en.html';
  });

fetch(chrome.runtime.getURL('license-ODbL-1.0.txt'))
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to load license-ODbL-1.0.txt: ${response.status}\nSee https://opendatacommons.org/licenses/odbl/1-0/`);
    }
    return response.text();
  })
  .then(text => {
    el_ODbL.textContent = text;
  })
  .catch(error => {
    console.error('Error loading license:', error);
    el_ODbL.textContent = 'Error loading license file.\nSee https://opendatacommons.org/licenses/odbl/1-0/';
  });
