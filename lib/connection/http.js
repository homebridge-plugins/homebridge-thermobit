/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

const axios = require('axios')

module.exports = class connectionHTTP {
  constructor (platform) {
    // Create variables usable by the class
    this.consts = platform.consts
    this.debug = platform.config.debug
    this.funcs = platform.funcs
    this.lang = platform.lang
    this.log = platform.log
    this.password = platform.config.password
    this.username = platform.config.username
  }

  async login () {
    try {
      // Perform the HTTP request
      const res = await axios.post(
        'http://thermobitdev.thermobit.info/api/token',
        'grant_type=password&userName=' + this.username + '&password=' + this.password,
        {
          headers: {
            'Content-Type': 'text/plain'
          },
          timeout: 10000
        }
      )

      // Check to see we got a response
      if (!res.data) {
        throw new Error(this.lang.noToken)
      }

      // Check to see we got a needed response
      if (!res.data.access_token) {
        if (this.base64Tried) {
          throw new Error(this.lang.noToken)
        } else {
          this.base64Tried = true
          this.password = Buffer.from(this.password, 'base64')
            .toString('utf8')
            .replace(/(\r\n|\n|\r)/gm, '')
            .trim()
          return await this.login()
        }
      }

      // Make the token available in other functions
      this.token = res.data.access_token
    } catch (err) {
      this.log.error(err)
      if (err.code && this.consts.httpRetryCodes.includes(err.code)) {
        // Retry if another attempt could be successful
        this.log.warn('%s [HTTP - login() - %s].', this.lang.httpRetry, err.code)
        await this.funcs.sleep(30000)
        return await this.login()
      } else {
        throw err
      }
    }
  }

  async getDevice () {
    // Make sure we do have the account token
    if (!this.token) {
      throw new Error(this.lang.noTokenExists)
    }

    // Use the token received to get a device list
    const res = await axios({
      url: 'http://thermobitdev.thermobit.info/api/remotes/get/state',
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + this.token
      },
      timeout: 10000
    })

    // Check to see we got a response
    if (!res.data) {
      throw new Error(this.lang.noDevices)
    }

    // Log the output if in debug mode
    if (this.debug) {
      this.log(JSON.stringify(res.data))
    }

    // Return the device list
    return res.data
  }

  async setDeviceState () {
    // Make sure we do have the account token
    if (!this.token) {
      throw new Error(this.lang.noTokenExists)
    }

    // Use the token received to set the new target
    await axios({
      url: 'http://thermobitdev.thermobit.info/api/remotes/set/scheduled',
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + this.token
      },
      timeout: 10000
    })
  }

  async setDeviceTemp (newTemp) {
    // Make sure we do have the account token
    if (!this.token) {
      throw new Error(this.lang.noTokenExists)
    }

    // Use the token received to set the new target
    await axios({
      url: 'http://thermobitdev.thermobit.info/api/remotes/set/manual',
      method: 'post',
      headers: {
        Authorization: 'Bearer ' + this.token
      },
      data: {
        duration: -1,
        temperature: newTemp
      },
      timeout: 10000
    })
  }
}
