import { createRequire } from 'module';
import httpClient from './connection/http.js';
import deviceHeater from './device/heater.js';
import eveService from './fakegato/fakegato-history.js';
import platformConsts from './utils/constants.js';
import { parseError } from './utils/functions.js';
import platformLang from './utils/lang-en.js';

const require = createRequire(import.meta.url);
const plugin = require('../package.json');

export default class {
  constructor(log, config, api) {
    if (!log || !api) {
      return;
    }

    // Begin plugin initialisation
    try {
      this.api = api;
      this.log = log;

      // Configuration objects for accessories
      this.devicesInHB = new Map();

      // Make sure user is running Homebridge v1.4 or above
      if (!api?.versionGreaterOrEqual('1.4.0')) {
        throw new Error(platformLang.hbVersionFail);
      }

      // Check the user has configured the plugin
      if (!config) {
        throw new Error(platformLang.pluginNotConf);
      }

      // Log some environment info for debugging
      this.log(
        '%s v%s | System %s | Node %s | HB v%s | HAPNodeJS v%s...',
        platformLang.initialising,
        plugin.version,
        process.platform,
        process.version,
        api.serverVersion,
        api.hap.HAPLibraryVersion(),
      );

      // Apply the user's configuration
      this.config = platformConsts.defaultConfig;
      this.config.isValidSchedule = !!config.schedule;
      this.applyUserConfig(config);

      // Set up the Homebridge events
      this.api.on('didFinishLaunching', () => this.pluginSetup());
      this.api.on('shutdown', () => this.pluginShutdown());
    } catch (err) {
      // Catch any errors during initialisation
      const eText = parseError(err, [platformLang.hbVersionFail, platformLang.pluginNotConf]);
      log.warn('***** %s. *****', platformLang.disabling);
      log.warn('***** %s. *****', eText);
    }
  }

  applyUserConfig(config) {
    // These shorthand functions save line space during config parsing
    const logDefault = (k, def) => {
      this.log.warn('%s [%s] %s %s.', platformLang.cfgItem, k, platformLang.cfgDef, def);
    };
    const logIgnore = (k) => {
      this.log.warn('%s [%s] %s.', platformLang.cfgItem, k, platformLang.cfgIgn);
    };
    const logIncrease = (k, min) => {
      this.log.warn('%s [%s] %s %s.', platformLang.cfgItem, k, platformLang.cfgLow, min);
    };
    const logQuotes = (k) => {
      this.log.warn('%s [%s] %s.', platformLang.cfgItem, k, platformLang.cfgQts);
    };
    const logRemove = (k) => {
      this.log.warn('%s [%s] %s.', platformLang.cfgItem, k, platformLang.cfgRmv);
    };

    // Begin applying the user's config
    Object.entries(config).forEach((entry) => {
      const [key, val] = entry;
      switch (key) {
        case 'debug':
        case 'debugFakegato':
        case 'disableDeviceLogging':
        case 'disablePlugin':
        case 'enableSchedule':
          if (typeof val === 'string') {
            logQuotes(key);
          }
          this.config[key] = val === 'false' ? false : !!val;
          break;
        case 'name':
        case 'platform':
          break;
        case 'password':
        case 'username':
          if (typeof val !== 'string' || val === '') {
            logIgnore(key);
          } else {
            this.config[key] = val;
          }
          break;
        case 'refreshTime': {
          if (typeof val === 'string') {
            logQuotes(key);
          }
          const intVal = parseInt(val, 10);
          if (Number.isNaN(intVal)) {
            logDefault(key, platformConsts.defaultValues[key]);
            this.config[key] = platformConsts.defaultValues[key];
          } else if (intVal < platformConsts.minValues[key]) {
            logIncrease(key, platformConsts.minValues[key]);
            this.config[key] = platformConsts.minValues[key];
          } else {
            this.config[key] = intVal;
          }
          break;
        }
        case 'schedule': {
          const minList = ['00', '30'];
          if (typeof val === 'object' && Object.keys(val).length > 0) {
            Object.entries(val).forEach((subEntry) => {
              const [k, v] = subEntry;
              switch (k) {
                case 'satFirstFrom':
                case 'satFirstUntil':
                case 'satSecondFrom':
                case 'satSecondUntil':
                case 'sunFirstFrom':
                case 'sunFirstUntil':
                case 'sunSecondFrom':
                case 'sunSecondUntil':
                case 'monFirstFrom':
                case 'monFirstUntil':
                case 'monSecondFrom':
                case 'monSecondUntil':
                case 'tueFirstFrom':
                case 'tueFirstUntil':
                case 'tueSecondFrom':
                case 'tueSecondUntil':
                case 'wedFirstFrom':
                case 'wedFirstUntil':
                case 'wedSecondFrom':
                case 'wedSecondUntil':
                case 'thrFirstFrom':
                case 'thrFirstUntil':
                case 'thrSecondFrom':
                case 'thrSecondUntil':
                case 'friFirstFrom':
                case 'friFirstUntil':
                case 'friSecondFrom':
                case 'friSecondUntil': {
                  if (typeof v === 'string') {
                    const parts = v.split(':');
                    if (parts[0] && parts[1] && !parts[2]) {
                      const hour = parseInt(parts[0].trim().replace(/\D+/g, ''), 10);
                      const mins = parts[1].trim().replace(/\D+/g, '');
                      if (Number.isNaN(hour) || hour < 0 || hour > 23) {
                        logIgnore(`${key}.${k}`);
                        this.config.isValidSchedule = false;
                        break;
                      }
                      const parsedHour = hour < 10 ? `0${hour.toString()}` : hour.toString();
                      if (!minList.includes(mins)) {
                        logIgnore(`${key}.${k}`);
                        this.config.isValidSchedule = false;
                        break;
                      }
                      this.config.schedule[k] = `${parsedHour}:${mins}`;
                    } else {
                      logIgnore(`${key}.${k}`);
                      this.config.isValidSchedule = false;
                    }
                  } else {
                    logIgnore(`${key}.${k}`);
                    this.config.isValidSchedule = false;
                  }
                  break;
                }
                case 'satFirstTemp':
                case 'satSecondTemp':
                case 'sunFirstTemp':
                case 'sunSecondTemp':
                case 'monFirstTemp':
                case 'monSecondTemp':
                case 'tueFirstTemp':
                case 'tueSecondTemp':
                case 'wedFirstTemp':
                case 'wedSecondTemp':
                case 'thrFirstTemp':
                case 'thrSecondTemp':
                case 'friFirstTemp':
                case 'friSecondTemp': {
                  if (typeof v === 'string') {
                    logQuotes(`${key}.${k}`);
                  }
                  const intVal = parseInt(v, 10);
                  if (Number.isNaN(intVal) || intVal < 30 || intVal > 64) {
                    logIgnore(`${key}.${k}`);
                    this.config.isValidSchedule = false;
                  } else {
                    this.config.schedule[k] = intVal;
                  }
                  break;
                }
                default:
                  logIgnore(`${key}.${k}`);
                  break;
              }
            });
            if (Object.keys(this.config.schedule).length !== 42) {
              logIgnore(key);
              this.config.isValidSchedule = false;
            }
          } else {
            logIgnore(key);
            this.config.isValidSchedule = false;
          }
          break;
        }
        default:
          logRemove(key);
          break;
      }
    });
  }

  async pluginSetup() {
    // Plugin has finished initialising so now onto setup
    try {
      // Log that the plugin initialisation has been successful
      this.log('%s.', platformLang.initialised);

      // If the user has disabled the plugin then remove all accessories
      if (this.config.disablePlugin) {
        this.devicesInHB.forEach((accessory) => this.removeAccessory(accessory));
        throw new Error(platformLang.disabled);
      }

      // Clean up from any stale accessories
      const uuid = this.api.hap.uuid.generate(this.config.username);
      this.devicesInHB.forEach((accessory) => {
        if (accessory.UUID !== uuid) {
          this.removeAccessory(accessory);
        }
      });

      // Require any libraries that the plugin uses
      this.eveService = eveService(this.api);

      // Ensure username and password have been provided
      if (!this.config.username || !this.config.password) {
        throw new Error(platformLang.noCreds);
      }

      // Set up the HTTP client if Thermobit username and password have been provided
      this.httpClient = new httpClient(this);
      await this.httpClient.login();

      // Check we have a device to initialise
      const deviceData = await this.httpClient.getDevice();
      if (!deviceData || !deviceData.CurrentTemp) {
        throw new Error(platformLang.noDevices);
      }

      // Initialise the Homebridge sensor
      this.initialiseDevice();

      // Perform a first sync and set up the refresh interval
      this.thermobitSync();
      this.refreshInterval = setInterval(() => this.thermobitSync(), this.config.refreshTime * 1000);

      // Update the device schedule from the config if enabled by user
      if (this.config.enableSchedule) {
        if (this.config.isValidSchedule) {
          this.httpClient.setDeviceSchedule(this.config.schedule);
        } else {
          this.log.warn('%s.', platformLang.scheduleInvalid);
        }
      }

      // Log that the plugin setup has been successful with a welcome message
      const randIndex = Math.floor(Math.random() * platformLang.zWelcome.length);
      this.log('%s. %s', platformLang.complete, platformLang.zWelcome[randIndex]);
    } catch (err) {
      // Catch any errors during setup
      const eText = parseError(err, [
        platformLang.noCreds,
        platformLang.noDevices,
        platformLang.disabled,
      ]);
      this.log.warn('***** %s. *****', platformLang.disabling);
      this.log.warn('***** %s. *****', eText);
      this.pluginShutdown();
    }
  }

  pluginShutdown() {
    // A function that is called when the plugin fails to load or Homebridge restarts
    try {
      // Stop the refresh interval
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
    } catch (err) {
      // No need to show errors at this point
    }
  }

  initialiseDevice() {
    // Get the correct device type instance for the device
    try {
      const uuid = this.api.hap.uuid.generate(this.config.username);

      // Get the cached accessory or add to Homebridge if it doesn't exist
      this.accessory = this.devicesInHB.get(uuid) || this.addAccessory();

      // Final check the accessory now exists in Homebridge
      if (!this.accessory) {
        throw new Error(platformLang.accNotFound);
      }

      // Create the instance for this device type
      this.accessory.control = new deviceHeater(this);

      // Log the device initialisation
      this.log('[%s] %s.', this.accessory.displayName, platformLang.devInit);

      // Update any changes to the accessory to the platform
      this.api.updatePlatformAccessories(plugin.name, plugin.alias, [this.accessory]);
      this.devicesInHB.set(this.accessory.UUID, this.accessory);
    } catch (err) {
      // Catch any errors during device initialisation
      const eText = parseError(err, [platformLang.accNotFound]);
      this.log.warn('[Thermobit] %s %s.', platformLang.devNotInit, eText);
    }
  }

  async thermobitSync() {
    try {
      // Obtain a refreshed device list
      const device = await this.httpClient.getDevice();
      this.accessory.control?.externalUpdate(device);
    } catch (err) {
      const eText = parseError(err, [platformLang.noTokenExists, platformLang.noDevices]);
      this.log.warn('%s %s.', platformLang.syncFailed, eText);
    }
  }

  addAccessory() {
    // Add an accessory to Homebridge
    try {
      const uuid = this.api.hap.uuid.generate(this.config.username);
      const accessory = new this.api.platformAccessory(platformLang.brand, uuid);
      accessory
        .getService(this.api.hap.Service.AccessoryInformation)
        .setCharacteristic(this.api.hap.Characteristic.Name, platformLang.brand)
        .setCharacteristic(this.api.hap.Characteristic.ConfiguredName, platformLang.brand)
        .setCharacteristic(this.api.hap.Characteristic.Manufacturer, platformLang.brand)
        .setCharacteristic(this.api.hap.Characteristic.SerialNumber, platformLang.brand)
        .setCharacteristic(this.api.hap.Characteristic.Model, platformLang.brand)
        .setCharacteristic(this.api.hap.Characteristic.Identify, true);
      this.api.registerPlatformAccessories(plugin.name, plugin.alias, [accessory]);
      this.devicesInHB.set(accessory.UUID, accessory);
      this.log('[%s] %s.', accessory.displayName, platformLang.devAdd);
      return accessory;
    } catch (err) {
      // Catch any errors during add
      const eText = parseError(err);
      this.log.warn('[Thermobit] %s %s.', platformLang.devNotAdd, eText);
      return false;
    }
  }

  configureAccessory(accessory) {
    // Add the configured accessory to our global map
    this.devicesInHB.set(accessory.UUID, accessory);
    accessory
      .getService(this.api.hap.Service.HeaterCooler)
      .getCharacteristic(this.api.hap.Characteristic.Active)
      .onSet(() => {
        this.log.warn('[%s] %s.', accessory.displayName, platformLang.accNotReady);
        throw new this.api.hap.HapStatusError(-70402);
      })
      .updateValue(new this.api.hap.HapStatusError(-70402));
  }

  removeAccessory(accessory) {
    // Remove an accessory from Homebridge
    try {
      this.api.unregisterPlatformAccessories(plugin.name, plugin.alias, [accessory]);
      this.devicesInHB.delete(accessory.UUID);
      this.log('[%s] %s.', accessory.displayName, platformLang.devRemove);
    } catch (err) {
      // Catch any errors during remove
      const eText = parseError(err);
      const name = accessory.displayName;
      this.log.warn('[%s] %s %s.', name, platformLang.devNotRemove, eText);
    }
  }
}
