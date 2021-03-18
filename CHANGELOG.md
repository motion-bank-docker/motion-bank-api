# Changelog

This document tracks all important changes to the Motion Bank Transcoding Service.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `ASSETS_TYPES_WHITELIST` env variable to only allow certain
  asset extensions to be accepted (e.g. `jpg,gif,mp4`).

### Fixed

- Uploaded asset paths break for certain characters


## [2.2.2] - 2021-03-16

### Fixed

- Broken range requests for streaming media assets
- Broken ACL check for assets

### Updated

- [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api)
  to 2.8.0


## [2.2.1] - 2020-12-30

### Updated

- [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api)
to 2.7.0
- MongoDB client to ^3.6.3


## [2.2.0] - 2020-10-08

### Added

- Assets service (active when Minio is configured)

### Updated

- [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api)
to 2.6.4


## [2.1.0] - 2020-05-06

### Added

- `Group` model and `/groups` endpoint
- `Invite` model and `/invites` endpoint

### Updated

- [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api)
to 2.4.1
- [cote](https://github.com/dashersw/cote)
to 1.0.0


## [2.0.0] - 2020-03-31

### Added

- [ACL microservice](https://gitlab.rlp.net/motionbank/microservices/acl) integration
- Improved error tracking with [Sentry](https://sentry.io)
- `/manage` service for [Auth0](https://auth0.com) user management

### Updated

- Archive endpoint
- [mbjs-data-models](https://gitlab.rlp.net/motionbank/mbjs/data-models)
to 2.0.18
- [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api)
to 2.2.4
- [mbjs-archive](https://gitlab.rlp.net/motionbank/mbjs/archive)
to 2.0.0
- [mbjs-persistence](https://gitlab.rlp.net/motionbank/mbjs/persistence)
to 1.1.0
- [Polka](https://github.com/lukeed/polka)

### Changed

- Uses api.uriPrefix in config (adds trailing slash over api.uriBase)
- Rename `author` to `creator`
- New and improved ACL system

### Fixed

- CI configuration


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


[Unreleased]: https://gitlab.rlp.net/motionbank/api/compare/v2.2.2...release_2_2
[2.2.2]: https://gitlab.rlp.net/motionbank/api/compare/v2.2.1...v2.2.2
[2.2.1]: https://gitlab.rlp.net/motionbank/api/compare/v2.2.0...v2.2.1
[2.2.0]: https://gitlab.rlp.net/motionbank/api/compare/v2.1.0...v2.2.0
[2.1.0]: https://gitlab.rlp.net/motionbank/api/compare/v2.0.0...v2.1.0
[2.0.0]: https://gitlab.rlp.net/motionbank/api/compare/v1.2.3...v2.0.0
[1.2.3]: https://gitlab.rlp.net/motionbank/api/compare/v1.2.2...v1.2.3
[1.2.2]: https://gitlab.rlp.net/motionbank/api/compare/v1.2.0...v1.2.2
[1.2.0]: https://gitlab.rlp.net/motionbank/api/compare/v1.1.0...v1.2.0
[1.1.0]: https://gitlab.rlp.net/motionbank/api/compare/v1.0.0...v1.1.0
[1.0.0]: https://gitlab.rlp.net/motionbank/api/compare/initial...v1.0.0
