/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = class deviceTempSensor {
  constructor (platform) {
    // Set up variables from the platform
    this.accessory = platform.accessory
    this.funcs = platform.funcs
    this.hapChar = platform.api.hap.Characteristic
    this.hapErr = platform.api.hap.HapStatusError
    this.hapServ = platform.api.hap.Service
    this.lang = platform.lang
    this.log = platform.log
    this.platform = platform

    // Add the temperature service if it doesn't already exist
    this.service =
      this.accessory.getService(this.hapServ.TemperatureSensor) ||
      this.accessory.addService(this.hapServ.TemperatureSensor)
    this.cacheTemp = this.service.getCharacteristic(this.hapChar.CurrentTemperature).value

    // Pass the accessory to Fakegato to set up with Eve
    this.accessory.eveService = new platform.eveService('custom', this.accessory, {
      log: platform.config.debugFakegato ? this.log : () => {}
    })
  }

  externalUpdate (params) {
    // Check to see if the provided temperature is different from the cached state
    if (this.funcs.hasProperty(params, 'CurrentTemp')) {
      if (params.CurrentTemp !== this.cacheTemp) {
        // Temperature is different so update Homebridge with new values
        this.cacheTemp = params.CurrentTemp
        this.service.updateCharacteristic(this.hapChar.CurrentTemperature, this.cacheTemp)
        this.accessory.eveService.addEntry({ temp: this.cacheTemp })

        // Log the change if appropriate
        if (this.accessory.context.enableLogging) {
          this.log('[%s] %s [%s°C].', this.accessory.displayName, this.lang.curTemp, this.cacheTemp)
        }
      }
    }
  }
}
