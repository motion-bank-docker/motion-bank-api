# Changelog

This document tracks all important changes to the Motion Bank Transcoding Service.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Updated

- Updated [mbjs-data-models](https://gitlab.rlp.net/motionbank/mbjs/data-models)
to 1.2.2
- Updated [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api)
to 1.1.1

### Changed

- Uses api.uriPrefix in config (adds trailing slash over api.uriBase)


## [1.2.3] - 2019-03-03

### Changed

- Updated [mbjs-data-models](https://gitlab.rlp.net/motionbank/mbjs/data-models)
to 0.1.2 ([release_0_1](https://gitlab.rlp.net/motionbank/mbjs/data-models/commits/release_0_1)
branch)
- Updated docker image node version to 10


## [1.2.2] - 2019-02-21

### Changed

- Updated [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api) to version 0.8.4


## [1.2.0] - 2019-02-17

### Added

- Find & get methods now accept a query parameter 'select' as a JSON encoded array specifiying fields to select for results
- Find methods now detect and parse regular expressions in JSON-encoded query parameter
- Allow setting ACL through URL query parameters

### Changed

- Author middleware and base Service class now in [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api)
- Author middleware now retrieves profile via external HTTP request
- Updated [mbjs-persistence](https://gitlab.rlp.net/motionbank/mbjs/persistence) to version 1.0.0
- Updated [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api) to version 0.8.2

### Fixed

- Missing api reference in createArchive method

### Removed

- Project specific script `bin/digitanz-fix.js`


## [1.1.0] - 2019-01-23

### Added

- Now serves [Document](https://gitlab.rlp.net/motionbank/mbjs/data-models/tree/master/src/models/document) resources


## [1.0.0] - 2018-12-04

### Added

- Changelog document

### Changed

- Start proper versioning at 1.0.0


[Unreleased]: https://gitlab.rlp.net/motionbank/api/compare/v1.2.1...master
[1.2.1]: https://gitlab.rlp.net/motionbank/api/compare/v1.2.0...v1.2.1
[1.2.0]: https://gitlab.rlp.net/motionbank/api/compare/v1.1.0...v1.2.0
[1.1.0]: https://gitlab.rlp.net/motionbank/api/compare/v1.0.0...v1.1.0
[1.0.0]: https://gitlab.rlp.net/motionbank/api/compare/initial...v1.0.0
