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


/**
 * Settings Manager
 **/
export default class SettingsManager {
  private static readonly STORAGE_KEY = 'settings';
  private static readonly DEFAULTS: Settings = {
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

  public settings: Settings;

  private constructor(settings: Settings) {
    this.settings = settings;
  }

  static async load(): Promise<SettingsManager> {
    const result = await chrome.storage.sync.get(this.STORAGE_KEY);
    const stored = result[this.STORAGE_KEY];
    const merged = this.mergeWithDefaults(stored);
    return new SettingsManager(merged);
  }

  async save(): Promise<void> {
    await chrome.storage.sync.set({ [SettingsManager.STORAGE_KEY]: this.settings });
  }

  static async reset(): Promise<SettingsManager> {
    const manager = new SettingsManager(this.DEFAULTS);
    await manager.save();
    return manager;
  }

  private static mergeWithDefaults(stored: any): Settings {
    return {
      badgeFlag: stored?.badgeFlag ?? this.DEFAULTS.badgeFlag,
      badgeBgColorKnown: stored?.badgeBgColorKnown ?? this.DEFAULTS.badgeBgColorKnown,
      badgeBgColorUnknown: stored?.badgeBgColorUnknown ?? this.DEFAULTS.badgeBgColorUnknown,
      faviconFlag: stored?.faviconFlag ?? this.DEFAULTS.faviconFlag,
      menuIconFlag: stored?.menuIconFlag ?? this.DEFAULTS.menuIconFlag,
      update: {
        enabled: stored?.update?.enabled ?? this.DEFAULTS.update.enabled,
        checkEveryDays: stored?.update?.checkEveryDays ?? this.DEFAULTS.update.checkEveryDays,
        urls: stored?.update?.urls ?? this.DEFAULTS.update.urls
      }
    };
  }
}

interface UpdateSettings {
  enabled: boolean;
  checkEveryDays: number;
  urls: string[];
}

interface Settings {
  badgeFlag: boolean;
  badgeBgColorKnown: string;
  badgeBgColorUnknown: string;
  faviconFlag: boolean;
  menuIconFlag: boolean;
  update: UpdateSettings;
}
