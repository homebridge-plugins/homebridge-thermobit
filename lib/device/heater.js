import { hasProperty, parseError } from '../utils/functions.js';
import platformLang from '../utils/lang-en.js';

export default class {
  constructor(platform) {
    // Set up variables from the platform
    this.accessory = platform.accessory;
    this.disableDeviceLogging = platform.config.disableDeviceLogging;
    this.hapChar = platform.api.hap.Characteristic;
    this.hapErr = platform.api.hap.HapStatusError;
    this.hapServ = platform.api.hap.Service;
    this.platform = platform;

    // Remove any temperature sensor that already exists
    if (this.accessory.getService(this.hapServ.TemperatureSensor)) {
      this.accessory.removeService(this.accessory.getService(this.hapServ.TemperatureSensor));
    }

    // Add the heater service if it doesn't already exist
    this.service = this.accessory.getService(this.hapServ.HeaterCooler)
      || this.accessory.addService(this.hapServ.HeaterCooler);
    this.cacheTemp = this.service.getCharacteristic(this.hapChar.CurrentTemperature).value;

    this.service
      .getCharacteristic(this.hapChar.Active)
      .updateValue(this.accessory.context.cacheState || 0)
      .removeOnSet()
      .onSet(async (value) => this.internalStateUpdate(value));
    this.cacheState = this.service.getCharacteristic(this.hapChar.Active).value === 1;

    // Add options to the target state characteristic
    this.service
      .getCharacteristic(this.hapChar.TargetHeaterCoolerState)
      .updateValue(0)
      .setProps({
        minValue: 0,
        maxValue: 0,
        validValues: [0],
      });

    // Avoid Homebridge warnings
    if (this.service.getCharacteristic(this.hapChar.CurrentHeaterCoolerState).value === 0) {
      this.service.updateCharacteristic(this.hapChar.CurrentHeaterCoolerState, 1);
    }

    // Add options to the current state characteristic
    this.service.getCharacteristic(this.hapChar.CurrentHeaterCoolerState).setProps({
      minValue: 1,
      maxValue: 2,
      validValues: [1, 2],
    });
    this.cacheHeat = this.service.getCharacteristic(this.hapChar.CurrentHeaterCoolerState).value === 2;

    // Avoid Homebridge warnings
    if (this.service.getCharacteristic(this.hapChar.HeatingThresholdTemperature).value === 0) {
      this.service.updateCharacteristic(this.hapChar.HeatingThresholdTemperature, 10);
    }

    this.service
      .getCharacteristic(this.hapChar.HeatingThresholdTemperature)
      .setProps({
        minValue: 10,
        maxValue: 70,
        minStep: 1,
      })
      .onSet(async (value) => this.internalTargetUpdate(value));
    this.cacheTarg = this.service.getCharacteristic(this.hapChar.HeatingThresholdTemperature).value;

    // Pass the accessory to Fakegato to set up with Eve
    this.accessory.eveService = new platform.eveService('custom', this.accessory, {
      log: () => {},
    });
  }

  async internalStateUpdate(value) {
    try {
      switch (value) {
        case 0:
          // Turn off so switch to schedule mode
          await this.platform.httpClient.setDeviceState();
          break;
        case 1:
          // Turn on so switch to manual mode
          await this.internalTargetUpdate(this.accessory.context.cacheLastSetTemp);
          break;
        default:
          return;
      }

      // Update the cache
      this.cacheState = value === 1;
      this.accessory.context.cacheState = this.cacheState;

      // Log the change
      this.accessory.log(`${platformLang.curState} [${this.cacheState ? platformLang.labelMan : platformLang.labelSch}]`);
    } catch (err) {
      // Catch any errors and let the platform display them
      this.accessory.logWarn(`${platformLang.updateFail} ${parseError(err)}`);
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.Active, this.cacheState ? 1 : 0);
      }, 2000);
      throw new this.hapErr(-70402);
    }
  }

  async internalTargetUpdate(value) {
    try {
      // Round the value to the nearest whole number
      value = Math.round(value);

      // Scale between 10 and 70
      value = Math.max(Math.min(value, 70), 10);

      // Send the request
      await this.platform.httpClient.setDeviceTemp(value);

      // Update the cache
      this.cacheTarg = value;
      this.accessory.context.cacheLastSetTemp = value;

      // Log the change
      this.accessory.log(`${platformLang.curTarg} [${this.cacheTarg}°C]`);
    } catch (err) {
      // Catch any errors and let the platform display them
      this.accessory.logWarn(`${platformLang.updateFail} ${parseError(err)}`);
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.HeatingThresholdTemperature, this.cacheTarg);
      }, 2000);
      throw new this.hapErr(-70402);
    }
  }

  externalUpdate(params) {
    // Check to see if the provided active is different from the cached state
    if (hasProperty(params, 'Mode')) {
      const newState = params.Mode === 'MAN';
      if (newState !== this.cacheState) {
        // State is different so update Homebridge with new values
        this.cacheState = newState;
        this.accessory.context.cacheState = this.cacheState;
        this.service.updateCharacteristic(this.hapChar.Active, this.cacheState ? 1 : 0);

        // Log the change
        this.accessory.log(`${platformLang.curState} [${this.cacheState ? platformLang.labelMan : platformLang.labelSch}]`);
      }
    }

    // Check to see if the provided isHeating is different from the cached state
    if (this.cacheState && hasProperty(params, 'IsOn')) {
      if (params.IsOn !== this.cacheHeat) {
        // Temperature is different so update Homebridge with new values
        this.cacheHeat = params.IsOn;
        this.service.updateCharacteristic(
          this.hapChar.CurrentHeaterCoolerState,
          this.cacheHeat ? 2 : 1,
        );

        // Log the change
        this.accessory.log(`${platformLang.curHeat} [${this.cacheHeat ? platformLang.labelHeating : platformLang.labelIdle}]`);
      }
    }

    // Check to see if the provided current temperature is different from the cached state
    if (hasProperty(params, 'CurrentTemp')) {
      if (params.CurrentTemp !== this.cacheTemp) {
        // Temperature is different so update Homebridge with new values
        this.cacheTemp = params.CurrentTemp;
        this.service.updateCharacteristic(this.hapChar.CurrentTemperature, this.cacheTemp);
        this.accessory.eveService.addEntry({ temp: this.cacheTemp });

        // Log the change
        this.accessory.log(`${platformLang.curTemp} [${this.cacheTemp}°C]`);
      }
    }

    // Check to see if the provided target temperature is different from the cached state
    if (this.cacheState && hasProperty(params, 'SetTemp')) {
      if (params.SetTemp !== this.cacheTarg) {
        // Temperature is different so update Homebridge with new values
        this.cacheTarg = params.SetTemp;
        this.service.updateCharacteristic(this.hapChar.HeatingThresholdTemperature, this.cacheTarg);
        if (params.Mode === 'MAN') {
          this.accessory.context.cacheLastSetTemp = this.cacheTarg;
        }

        // Log the change
        this.accessory.log(`${platformLang.curTarg} [${this.cacheTarg}°C]`);
      }
    }
  }
}
