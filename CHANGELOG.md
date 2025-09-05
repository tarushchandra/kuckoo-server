# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 23-08-2025

### Changed

- **BREAKING**: Renamed core models from Tweet-based to Post-based terminology
  - `Tweet` → `Post`
  - `TweetEngagement` → `PostEngagement`
  - `TweetLike` → `PostLike`
  - Updated all related fields and relationships accordingly

### Technical Notes

- Database schema was migrated cleanly without preserving intermediate migration history
- All existing functionality remains the same, only terminology changed
- This change improves code readability and makes the platform more generic

## [1.0.0] - Previously

### Added

- User authentication and profile management
- Post creation with text and image support
- Like and comment functionality
- Follow/follower relationships
- Real-time notification system
- Chat functionality with group support
- Bookmark system for posts
