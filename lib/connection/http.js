import axios from 'axios';
import platformConsts from '../utils/constants.js';
import { parseError, sleep } from '../utils/functions.js';
import platformLang from '../utils/lang-en.js';

export default class {
  constructor(platform) {
    // Create variables usable by the class
    this.debug = platform.config.debug;
    this.log = platform.log;
    this.password = platform.config.password;
    this.username = platform.config.username;
  }

  async login() {
    try {
      // Perform the HTTP request
      const res = await axios.post(
        'http://thermobitdev.thermobit.info/api/token',
        `grant_type=password&userName=${this.username}&password=${this.password}`,
        {
          headers: {
            'Content-Type': 'text/plain',
          },
          timeout: 10000,
        },
      );

      // Check to see we got a response
      if (!res.data) {
        throw new Error(platformLang.noToken);
      }

      // Check to see we got a needed response
      if (!res.data.access_token) {
        if (this.base64Tried) {
          throw new Error(platformLang.noToken);
        } else {
          this.base64Tried = true;
          this.password = Buffer.from(this.password, 'base64')
            .toString('utf8')
            .replace(/(\r\n|\n|\r)/gm, '')
            .trim();
          return await this.login();
        }
      }

      // Make the token available in other functions
      this.token = res.data.access_token;
      return true;
    } catch (err) {
      if (err.code && platformConsts.httpRetryCodes.includes(err.code)) {
        // Retry if another attempt could be successful
        this.log.warn('[HTTP login()] %s [%s].', platformLang.httpRetry, err.code);
        await sleep(30000);
        return this.login();
      }
      throw new Error(`[HTTP login()] ${err.message}`);
    }
  }

  async getDevice() {
    try {
      // Make sure we do have the account token
      if (!this.token) {
        throw new Error(platformLang.noTokenExists);
      }

      // Use the token received to get a device list
      const res = await axios({
        url: 'http://thermobitdev.thermobit.info/api/remotes/get/state',
        method: 'get',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 10000,
      });

      // Check to see we got a response
      if (!res.data) {
        throw new Error(platformLang.noDevices);
      }

      // Log the output if in debug mode
      if (this.debug) {
        this.log(JSON.stringify(res.data));
      }

      // Return the device list
      return res.data;
    } catch (err) {
      if (err.code && platformConsts.httpRetryCodes.includes(err.code)) {
        // Retry if another attempt could be successful
        this.log.warn('[HTTP getDevice()] %s [%s].', platformLang.httpRetry, err.code);
        await sleep(30000);
        return this.getDevice();
      }
      throw new Error(`[HTTP getDevice()] ${err.message}`);
    }
  }

  async setDeviceState() {
    // Make sure we do have the account token
    if (!this.token) {
      throw new Error(platformLang.noTokenExists);
    }

    // Use the token received to set the new target
    await axios({
      url: 'http://thermobitdev.thermobit.info/api/remotes/set/scheduled',
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      timeout: 10000,
    });
  }

  async setDeviceTemp(newTemp) {
    // Make sure we do have the account token
    if (!this.token) {
      throw new Error(platformLang.noTokenExists);
    }

    // Use the token received to set the new target
    await axios({
      url: 'http://thermobitdev.thermobit.info/api/remotes/set/manual',
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      data: {
        duration: -1,
        temperature: newTemp,
      },
      timeout: 10000,
    });
  }

  async setDeviceSchedule(newData) {
    try {
      // Make sure we do have the account token
      if (!this.token) {
        throw new Error(platformLang.noTokenExists);
      }

      const unitNumber = parseInt(this.password, 10);
      const data = [
        {
          Day: '1',
          Selected: true,
          Programs: [
            {
              ProgramNumber: 1,
              Mode: 'PRG',
              Until: newData.sunFirstUntil,
              unitNumber,
              Temperature: newData.sunFirstTemp,
              From: newData.sunFirstFrom,
              Day: '1',
            },
            {
              ProgramNumber: 3,
              Mode: 'PRG',
              Until: newData.sunSecondUntil,
              unitNumber,
              Temperature: newData.sunSecondTemp,
              From: newData.sunSecondFrom,
              Day: '1',
            },
          ],
          Editable: true,
        },
        {
          Day: '2',
          Selected: true,
          Programs: [
            {
              ProgramNumber: 1,
              Mode: 'PRG',
              Until: newData.monFirstUntil,
              unitNumber,
              Temperature: newData.monFirstTemp,
              From: newData.monFirstFrom,
              Day: '2',
            },
            {
              ProgramNumber: 3,
              Mode: 'PRG',
              Until: newData.monSecondUntil,
              unitNumber,
              Temperature: newData.monSecondTemp,
              From: newData.monSecondFrom,
              Day: '2',
            },
          ],
          Editable: true,
        },
        {
          Day: '3',
          Selected: true,
          Programs: [
            {
              ProgramNumber: 1,
              Mode: 'PRG',
              Until: newData.tueFirstUntil,
              unitNumber,
              Temperature: newData.tueFirstTemp,
              From: newData.tueFirstFrom,
              Day: '3',
            },
            {
              ProgramNumber: 3,
              Mode: 'PRG',
              Until: newData.tueSecondUntil,
              unitNumber,
              Temperature: newData.tueSecondTemp,
              From: newData.tueSecondFrom,
              Day: '3',
            },
          ],
          Editable: true,
        },
        {
          Day: '4',
          Selected: true,
          Programs: [
            {
              ProgramNumber: 1,
              Mode: 'PRG',
              Until: newData.wedFirstUntil,
              unitNumber,
              Temperature: newData.wedFirstTemp,
              From: newData.wedFirstFrom,
              Day: '4',
            },
            {
              ProgramNumber: 3,
              Mode: 'PRG',
              Until: newData.wedSecondUntil,
              unitNumber,
              Temperature: newData.wedSecondTemp,
              From: newData.wedSecondFrom,
              Day: '4',
            },
          ],
          Editable: true,
        },
        {
          Day: '5',
          Selected: true,
          Programs: [
            {
              ProgramNumber: 1,
              Mode: 'PRG',
              Until: newData.thrFirstUntil,
              unitNumber,
              Temperature: newData.thrFirstTemp,
              From: newData.thrFirstFrom,
              Day: '5',
            },
            {
              ProgramNumber: 3,
              Mode: 'PRG',
              Until: newData.thrSecondUntil,
              unitNumber,
              Temperature: newData.thrSecondTemp,
              From: newData.thrSecondFrom,
              Day: '5',
            },
          ],
          Editable: true,
        },
        {
          Day: '6',
          Selected: true,
          Programs: [
            {
              ProgramNumber: 1,
              Mode: 'PRG',
              Until: newData.friFirstUntil,
              unitNumber,
              Temperature: newData.friFirstTemp,
              From: newData.friFirstFrom,
              Day: '6',
            },
            {
              ProgramNumber: 3,
              Mode: 'PRG',
              Until: newData.friSecondUntil,
              unitNumber,
              Temperature: newData.friSecondTemp,
              From: newData.friSecondFrom,
              Day: '6',
            },
          ],
          Editable: true,
        },
        {
          Day: '7',
          Selected: true,
          Programs: [
            {
              ProgramNumber: 1,
              Mode: 'PRG',
              Until: newData.satFirstUntil,
              unitNumber,
              Temperature: newData.satFirstTemp,
              From: newData.satFirstFrom,
              Day: '7',
            },
            {
              ProgramNumber: 3,
              Mode: 'PRG',
              Until: newData.satSecondUntil,
              unitNumber,
              Temperature: newData.satSecondTemp,
              From: newData.satSecondFrom,
              Day: '7',
            },
          ],
          Editable: true,
        },
      ];

      await axios.put('http://thermobitdev.thermobit.info/api/programs/update', data, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 10000,
      });
      this.log('%s.', platformLang.scheduleUpdated);
    } catch (err) {
      const eText = parseError(err);
      this.log.warn('%s %s.', platformLang.scheduleFailed, eText);
    }
  }
}
