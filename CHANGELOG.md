# Change Log

All notable changes to homebridge-thermobit will be documented in this file.

## 2.0.6 (2022-08-23)

### Changed

- Bump `node` recommended versions to v14.20.0 or v16.17.0
- Bump `homebridge` recommended version to v1.5.0

## 2.0.5 (2022-06-26)

### Changed

- Updated dependencies

## 2.0.4 (2022-06-21)

### Changed

- Bump `node` recommended versions to v14.19.3 or v16.15.0

## 2.0.3 (2022-05-28)

### Changed

- More fixes and refactoring

## 2.0.2 (2022-05-28)

### Changed

- Bump `node` recommended versions to v14.19.3 or v16.15.0
- Updated dependencies

## 2.0.1 (2022-04-30)

### Changed

- Bump `axios` to v0.27.2
- Bump `node` recommended versions to v14.19.1 or v16.15.0
-
## 2.0.0 (2022-04-23)

### Potentially Breaking Changes

⚠️ The minimum required version of Homebridge is now v1.4.0
⚠️ The minimum required version of Node is now v14

### Changed

- Changed to ESM package

## 1.6.9 (2022-04-03)

### Changed

- Bump `axios` to v0.26.1
- Updated dependencies

## 1.6.8 (2022-02-27)

### Changed

- Bump `axios` to v0.26.0
- Bump `node` recommended versions to v14.19.0 or v16.14.0

## 1.6.7 (2022-01-24)

### Changed

- Bump `homebridge` recommended version to v1.4.0
- Bump `axios` to v0.25.0

## 1.6.6 (2022-01-13)

### Changed

- Bump `node` recommended versions to v14.18.3 or v16.13.2

### Fixed

- Plugin crash for older versions of Homebridge

## 1.6.5 (2022-01-03)

### Changed

- HOOBS certified badge on README
- Plugin will log HAPNodeJS version on startup
- Bump `homebridge` recommended version to v1.3.9

## 1.6.4 (2021-12-21)

### Changed

- Some config options rearranged for easier access

## 1.6.3 (2021-12-08)

### Changed

- Bump `homebridge` recommended version to v1.3.8
- Bump `node` recommended versions to v14.18.2 or v16.13.1

## 1.6.2 (2021-11-16)

### Fixed

- An issue setting times for the second schedule for each day

## 1.6.1 (2021-11-16)

### Fixed

- A 'No Response' issue

## 1.6.0 (2021-11-14)

### Added

- Configure the program schedule from within the plugin configuration
- Accessories will show 'No Response' until plugin has successfully initialised

### Changed

- Plugin will disable on any initial HTTP error that cannot be rectified
- Recommended Homebridge bumped to v1.3.6

## 1.5.0 (2021-11-02)

### Added

- Homebridge verified badge on README
- Credits on README

## 1.4.0 (2021-11-01)

### Added

- `disableDeviceLogging` configuration option

## 1.3.0 (2021-11-01)

### Added

- Turning off uses schedule mode, turning on uses manual mode

## 1.2.0 (2021-11-01)

### Added

- Ability to set the target temperature

## 1.1.0 (2021-10-31)

### Added

- Use heater accessory instead of sensor

## 1.0.1 (2021-10-31)

### Changed

- Log HTTP device data in debug mode

## 1.0.0 (2021-10-31)

- Initial release
