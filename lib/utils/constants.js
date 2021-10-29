/* jshint node: true,esversion: 9, -W014, -W033 */
/* eslint-disable new-cap */
'use strict'

module.exports = {
  defaultConfig: {
    name: 'Thermobit',
    username: '',
    password: '',
    refreshTime: 15,
    debug: false,
    debugFakegato: false,
    disablePlugin: false,
    platform: 'Thermobit'
  },

  defaultValues: {
    refreshTime: 15
  },

  minValues: {
    refreshTime: 15
  },

  httpRetryCodes: ['ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNABORTED']
}
