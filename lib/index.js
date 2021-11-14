/* jshint node: true, esversion: 10, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

// Packages and constant variables for this class
const plugin = require('./../package.json')

// Create the platform class
class ThermobitPlatform {
  constructor (log, config, api) {
    // Don't load the plugin if these aren't accessible for any reason
    if (!log || !api) {
      return
    }

    // Begin plugin initialisation
    try {
      this.api = api
      this.consts = require('./utils/constants')
      this.funcs = require('./utils/functions')
      this.log = log

      // Configuration objects for accessories
      this.devicesInHB = new Map()

      // Retrieve the user's chosen language file
      this.lang = require('./utils/lang-en')

      // Make sure user is running Homebridge v1.3 or above
      if (!api.versionGreaterOrEqual || !api.versionGreaterOrEqual('1.3.0')) {
        throw new Error(this.lang.hbVersionFail)
      }

      // Check the user has configured the plugin
      if (!config) {
        throw new Error(this.lang.pluginNotConf)
      }

      // Log some environment info for debugging
      this.log(
        '%s v%s | Node %s | HB v%s%s...',
        this.lang.initialising,
        plugin.version,
        process.version,
        api.serverVersion,
        config.plugin_map
          ? ' | HOOBS v3'
          : require('os')
              .hostname()
              .includes('hoobs')
          ? ' | HOOBS v4'
          : ''
      )

      // Apply the user's configuration
      this.config = this.consts.defaultConfig
      this.config.isValidSchedule = !!config.schedule
      this.applyUserConfig(config)

      // Set up the Homebridge events
      this.api.on('didFinishLaunching', () => this.pluginSetup())
      this.api.on('shutdown', () => this.pluginShutdown())
    } catch (err) {
      // Catch any errors during initialisation
      const eText = this.funcs.parseError(err, [this.lang.hbVersionFail, this.lang.pluginNotConf])
      log.warn('***** %s. *****', this.lang.disabling)
      log.warn('***** %s. *****', eText)
    }
  }

  applyUserConfig (config) {
    // These shorthand functions save line space during config parsing
    const logDefault = (k, def) => {
      this.log.warn('%s [%s] %s %s.', this.lang.cfgItem, k, this.lang.cfgDef, def)
    }
    const logIgnore = k => {
      this.log.warn('%s [%s] %s.', this.lang.cfgItem, k, this.lang.cfgIgn)
    }
    const logIncrease = (k, min) => {
      this.log.warn('%s [%s] %s %s.', this.lang.cfgItem, k, this.lang.cfgLow, min)
    }
    const logQuotes = k => {
      this.log.warn('%s [%s] %s.', this.lang.cfgItem, k, this.lang.cfgQts)
    }
    const logRemove = k => {
      this.log.warn('%s [%s] %s.', this.lang.cfgItem, k, this.lang.cfgRmv)
    }

    // Begin applying the user's config
    for (const [key, val] of Object.entries(config)) {
      switch (key) {
        case 'debug':
        case 'debugFakegato':
        case 'disableDeviceLogging':
        case 'disablePlugin':
        case 'enableSchedule':
          if (typeof val === 'string') {
            logQuotes(key)
          }
          this.config[key] = val === 'false' ? false : !!val
          break
        case 'name':
        case 'platform':
        case 'plugin_map':
          break
        case 'password':
        case 'username':
          if (typeof val !== 'string' || val === '') {
            logIgnore(key)
          } else {
            this.config[key] = val
          }
          break
        case 'refreshTime': {
          if (typeof val === 'string') {
            logQuotes(key)
          }
          const intVal = parseInt(val)
          if (isNaN(intVal)) {
            logDefault(key, this.consts.defaultValues[key])
            this.config[key] = this.consts.defaultValues[key]
          } else if (intVal < this.consts.minValues[key]) {
            logIncrease(key, this.consts.minValues[key])
            this.config[key] = this.consts.minValues[key]
          } else {
            this.config[key] = intVal
          }
          break
        }
        case 'schedule': {
          const minList = ['00', '30']
          if (typeof val === 'object' && Object.keys(val).length > 0) {
            for (const [k, v] of Object.entries(val)) {
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
                    const parts = v.split(':')
                    if (parts[0] && parts[1] && !parts[2]) {
                      const hour = parseInt(parts[0].trim().replace(/[^0-9]+/g, ''))
                      const mins = parts[1].trim().replace(/[^0-9]+/g, '')
                      if (isNaN(hour) || hour < 0 || hour > 23) {
                        logIgnore(key + '.' + k)
                        this.config.isValidSchedule = false
                        break
                      }
                      const parsedHour = hour < 10 ? '0' + hour.toString() : hour.toString()
                      if (!minList.includes(mins)) {
                        logIgnore(key + '.' + k)
                        this.config.isValidSchedule = false
                        break
                      }
                      this.config.schedule[k] = parsedHour + ':' + mins
                    } else {
                      logIgnore(key + '.' + k)
                      this.config.isValidSchedule = false
                    }
                  } else {
                    logIgnore(key + '.' + k)
                    this.config.isValidSchedule = false
                  }
                  break
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
                    logQuotes(key + '.' + k)
                  }
                  const intVal = parseInt(v)
                  if (isNaN(intVal) || intVal < 30 || intVal > 64) {
                    logIgnore(key + '.' + k)
                    this.config.isValidSchedule = false
                  } else {
                    this.config.schedule[k] = intVal
                  }
                  break
                }
                default:
                  logIgnore(key + '.' + k)
                  break
              }
            }
            if (Object.keys(this.config.schedule).length !== 42) {
              logIgnore(key)
              this.config.isValidSchedule = false
            }
          } else {
            logIgnore(key)
            this.config.isValidSchedule = false
          }
          break
        }
        default:
          logRemove(key)
          break
      }
    }
  }

  async pluginSetup () {
    // Plugin has finished initialising so now onto setup
    try {
      // If the user has disabled the plugin then remove all accessories
      if (this.config.disablePlugin) {
        this.devicesInHB.forEach(accessory => this.removeAccessory(accessory))
        throw new Error(this.lang.disabled)
      }

      // Log that the plugin initialisation has been successful
      this.log('%s.', this.lang.initialised)

      // Require any libraries that the plugin uses
      this.eveService = require('./fakegato/fakegato-history')(this.api)

      // Ensure username and password have been provided
      if (!this.config.username || !this.config.password) {
        throw new Error(this.lang.noCreds)
      }

      // Setup the HTTP client if Thermobit username and password have been provided
      this.httpClient = new (require('./connection/http'))(this)
      await this.httpClient.login()

      // Check we have a device to initialise
      const deviceData = await this.httpClient.getDevice()
      if (!deviceData || !deviceData.CurrentTemp) {
        throw new Error(this.lang.noDevices)
      }

      // Initialise the Homebridge sensor
      this.initialiseDevice()

      // Perform a first sync and setup the refresh interval
      this.thermobitSync()
      this.refreshInterval = setInterval(() => this.thermobitSync(), this.config.refreshTime * 1000)

      // Update the device schedule from the config if enabled by user
      if (this.config.enableSchedule) {
        if (this.config.isValidSchedule) {
          this.httpClient.setDeviceSchedule(this.config.schedule)
        } else {
          this.log.warn('%s.', this.lang.scheduleInvalid)
        }
      }

      // Log that the plugin setup has been successful with a welcome message
      const randIndex = Math.floor(Math.random() * this.lang.zWelcome.length)
      this.log('%s. %s', this.lang.complete, this.lang.zWelcome[randIndex])
    } catch (err) {
      // Catch any errors during setup
      const eText = this.funcs.parseError(err, [
        this.lang.noCreds,
        this.lang.noDevices,
        this.lang.disabled
      ])
      this.log.warn('***** %s. *****', this.lang.disabling)
      this.log.warn('***** %s. *****', eText)
      this.pluginShutdown()
    }
  }

  pluginShutdown () {
    // A function that is called when the plugin fails to load or Homebridge restarts
    try {
      // Stop the refresh interval
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
      }
    } catch (err) {
      // No need to show errors at this point
    }
  }

  initialiseDevice () {
    // Get the correct device type instance for the device
    try {
      const uuid = this.api.hap.uuid.generate(this.config.username)

      // Get the cached accessory or add to Homebridge if doesn't exist
      this.accessory = this.devicesInHB.get(uuid) || this.addAccessory()

      // Final check the accessory now exists in Homebridge
      if (!this.accessory) {
        throw new Error(this.lang.accNotFound)
      }

      // Create the instance for this device type
      this.accessory.control = new (require('./device/heater'))(this)

      // Log the device initialisation
      this.log('[%s] %s.', this.accessory.displayName, this.lang.devInit)

      // Update any changes to the accessory to the platform
      this.api.updatePlatformAccessories(plugin.name, plugin.alias, [this.accessory])
      this.devicesInHB.set(this.accessory.UUID, this.accessory)
    } catch (err) {
      // Catch any errors during device initialisation
      const eText = this.funcs.parseError(err, [this.lang.accNotFound])
      this.log.warn('[Thermobit] %s %s.', this.lang.devNotInit, eText)
    }
  }

  async thermobitSync () {
    try {
      // Obtain a refreshed device list
      const device = await this.httpClient.getDevice()
      this.accessory.control.externalUpdate(device)
    } catch (err) {
      const eText = this.funcs.parseError(err, [this.lang.noTokenExists, this.lang.noDevices])
      this.log.warn('%s %s.', this.lang.syncFailed, eText)
    }
  }

  addAccessory () {
    // Add an accessory to Homebridge
    try {
      const uuid = this.api.hap.uuid.generate(this.config.username)
      const accessory = new this.api.platformAccessory(this.lang.brand, uuid)
      accessory
        .getService(this.api.hap.Service.AccessoryInformation)
        .setCharacteristic(this.api.hap.Characteristic.Name, this.lang.brand)
        .setCharacteristic(this.api.hap.Characteristic.ConfiguredName, this.lang.brand)
        .setCharacteristic(this.api.hap.Characteristic.Manufacturer, this.lang.brand)
        .setCharacteristic(this.api.hap.Characteristic.SerialNumber, this.lang.brand)
        .setCharacteristic(this.api.hap.Characteristic.Model, this.lang.brand)
        .setCharacteristic(this.api.hap.Characteristic.Identify, true)
      this.api.registerPlatformAccessories(plugin.name, plugin.alias, [accessory])
      this.configureAccessory(accessory)
      this.log('[%s] %s.', accessory.displayName, this.lang.devAdd)
      return accessory
    } catch (err) {
      // Catch any errors during add
      const eText = this.funcs.parseError(err)
      this.log.warn('[Thermobit] %s %s.', this.lang.devNotAdd, eText)
    }
  }

  configureAccessory (accessory) {
    // Add the configured accessory to our global map
    this.devicesInHB.set(accessory.UUID, accessory)
    accessory
      .getService(this.api.hap.Service.HeaterCooler)
      .getCharacteristic(this.api.hap.Characteristic.Active)
      .onSet(value => {
        this.log.warn('[%s] %s.', accessory.displayName, this.lang.accNotReady)
        throw new this.api.hap.HapStatusError(-70402)
      })
      .updateValue(new this.api.hap.HapStatusError(-70402))
  }

  removeAccessory (accessory) {
    // Remove an accessory from Homebridge
    try {
      this.api.unregisterPlatformAccessories(plugin.name, plugin.alias, [accessory])
      this.devicesInHB.delete(accessory.UUID)
      this.log('[%s] %s.', accessory.displayName, this.lang.devRemove)
    } catch (err) {
      // Catch any errors during remove
      const eText = this.funcs.parseError(err)
      const name = accessory.displayName
      this.log.warn('[%s] %s %s.', name, this.lang.devNotRemove, eText)
    }
  }
}

// Export the plugin to Homebridge
module.exports = hb => hb.registerPlatform(plugin.alias, ThermobitPlatform)
