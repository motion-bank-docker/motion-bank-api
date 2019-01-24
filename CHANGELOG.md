# Changelog

This document tracks all important changes to the Motion Bank Transcoding Service.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Allow setting ACL through URL query parameters

### Changed

- Author middleware and base Service class now in [mbjs-generic-api](https://gitlab.rlp.net/motionbank/mbjs/generic-api)
- Author middleware now retrieves profile via external HTTP request

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


[Unreleased]: https://gitlab.rlp.net/motionbank/api/compare/v1.1.0...master
[1.1.0]: https://gitlab.rlp.net/motionbank/api/compare/v1.0.0...v1.1.0
[1.0.0]: https://gitlab.rlp.net/motionbank/api/compare/initial...v1.0.0