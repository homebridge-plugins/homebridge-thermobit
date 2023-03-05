export default {
  defaultConfig: {
    name: 'Thermobit',
    username: '',
    password: '',
    disableDeviceLogging: false,
    refreshTime: 15,
    enableSchedule: false,
    schedule: {},
    platform: 'Thermobit',
  },

  defaultValues: {
    refreshTime: 15,
  },

  minValues: {
    refreshTime: 15,
  },

  httpRetryCodes: ['ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNABORTED'],
};
