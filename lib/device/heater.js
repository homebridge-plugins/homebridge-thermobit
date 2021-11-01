/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = class deviceHeater {
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

    // Remove any temperature sensor that already exists
    if (this.accessory.getService(this.hapServ.TemperatureSensor)) {
      this.accessory.removeService(this.accessory.getService(this.hapServ.TemperatureSensor))
    }

    // Remove any temperature sensor that already exists
    if (this.accessory.getService(this.hapServ.HeaterCooler)) {
      this.accessory.removeService(this.accessory.getService(this.hapServ.HeaterCooler))
    }

    // Add the heater service if it doesn't already exist
    this.service =
      this.accessory.getService(this.hapServ.HeaterCooler) ||
      this.accessory.addService(this.hapServ.HeaterCooler)
    this.cacheTemp = this.service.getCharacteristic(this.hapChar.CurrentTemperature).value

    this.service
      .getCharacteristic(this.hapChar.Active)
      .updateValue(1)
      .onSet(value => {
        setTimeout(() => {
          this.service.updateCharacteristic(this.hapChar.Active, 1)
        }, 1000)
      })

    // Add options to the target state characteristic
    this.service
      .getCharacteristic(this.hapChar.TargetHeaterCoolerState)
      .updateValue(0)
      .setProps({
        minValue: 0,
        maxValue: 0,
        validValues: [0]
      })
    this.cacheState =
      this.service.getCharacteristic(this.hapChar.CurrentHeaterCoolerState).value === 2

    // Add options to the current state characteristic
    this.service
      .getCharacteristic(this.hapChar.CurrentHeaterCoolerState)
      .updateValue(1)
      .setProps({
        minValue: 1,
        maxValue: 2,
        validValues: [1, 2]
      })

    this.service
      .getCharacteristic(this.hapChar.HeatingThresholdTemperature)
      .setProps({
        minValue: 10,
        maxValue: 70
      })
      .onSet(value => {
        setTimeout(() => {
          this.service.updateCharacteristic(
            this.hapChar.HeatingThresholdTemperature,
            this.cacheTarg
          )
        }, 1000)
      })
    this.cacheTarg = this.service.getCharacteristic(this.hapChar.HeatingThresholdTemperature).value

    // Pass the accessory to Fakegato to set up with Eve
    this.accessory.eveService = new platform.eveService('custom', this.accessory, {
      log: platform.config.debugFakegato ? this.log : () => {}
    })
  }

  externalUpdate (params) {
    this.service.updateCharacteristic(this.hapChar.Active, 1)

    // Check to see if the provided isHeating is different from the cached state
    if (this.funcs.hasProperty(params, 'IsOn')) {
      if (params.IsOn !== this.cacheState) {
        // Temperature is different so update Homebridge with new values
        this.cacheState = params.IsOn
        this.service.updateCharacteristic(
          this.hapChar.CurrentHeaterCoolerState,
          this.cacheState ? 2 : 1
        )

        // Log the change if appropriate
        this.log(
          '[%s] %s [%s].',
          this.accessory.displayName,
          this.lang.curState,
          this.cacheState ? this.lang.labelHeating : this.lang.labelIdle
        )
      }
    }
    // Check to see if the provided current temperature is different from the cached state
    if (this.funcs.hasProperty(params, 'CurrentTemp')) {
      if (params.CurrentTemp !== this.cacheTemp) {
        // Temperature is different so update Homebridge with new values
        this.cacheTemp = params.CurrentTemp
        this.service.updateCharacteristic(this.hapChar.CurrentTemperature, this.cacheTemp)
        this.accessory.eveService.addEntry({ temp: this.cacheTemp })

        // Log the change
        this.log('[%s] %s [%s°C].', this.accessory.displayName, this.lang.curTemp, this.cacheTemp)
      }
    }

    // Check to see if the provided target temperature is different from the cached state
    if (this.funcs.hasProperty(params, 'SetTemp')) {
      if (params.SetTemp !== this.cacheTarg) {
        // Temperature is different so update Homebridge with new values
        this.cacheTarg = params.SetTemp
        this.service.updateCharacteristic(this.hapChar.HeatingThresholdTemperature, this.cacheTarg)

        // Log the change
        this.log('[%s] %s [%s°C].', this.accessory.displayName, 'current target', this.cacheTarg)
      }
    }
  }
}
