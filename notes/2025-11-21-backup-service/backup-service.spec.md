# Backup Service Specification

## Overview

This project provides a complete backup system that can be easily integrated into any SAF service. It includes functions for creating backups (manual and automatic), a cron job for automated backups and cleanup, HTTP endpoints for backup management, and a Vue component for the admin UI. The system is designed to be provider-agnostic through an object store abstraction, with Azure Blob Storage as the initial implementation.

The backup system will:
- Support both manual and automatic backups (tagged accordingly)
- Automatically create scheduled database backups
- Clean up older backups based on retention policies
- Provide admin endpoints for listing, creating, deleting, and restoring backups
- Automatically create a backup before restoring (safety measure)
- Include a Vue component for managing backups through a UI

## User Stories

- As a system administrator, I want to manually create backups so that I can capture the database state at specific points in time.
- As a system administrator, I want to list all backups so that I can see what backups are available.
- As a system administrator, I want to delete manual backups so that I can manage storage usage.
- As a system administrator, I want to restore from a backup so that I can recover from data loss or corruption.
- As a system administrator, I want automatic backups to be created on a schedule so that I don't have to manually create them.
- As a system administrator, I want old backups to be automatically cleaned up so that storage costs are managed.
- As a developer, I want to easily integrate backup functionality into my service so that I can provide backup capabilities without building it from scratch.

## Packages to Modify

- `/saflib/backup/backup-http`: Export an Express router that provides backup management endpoints. The router should accept a function that returns a database backup stream and an object store instance.

- `/saflib/backup/backup-cron`: Export a jobs object containing cron jobs for automatic backups and cleanup. The jobs should accept a function that returns a database backup stream and an object store instance.

- `/saflib/backup/backup-sdk`: Export a Vue component that provides a UI for managing backups using the HTTP endpoints.

- `/saflib/object-store`: Define an abstract ObjectStore class with methods for listing, uploading, and deleting backups. Implement an AzureObjectStore subclass that uses Azure Blob Storage.

## Database Schema Updates

The backup system will need to track backup metadata in the backup-db database. This should include:
- Backup ID (unique identifier)
- Backup type (manual or automatic)
- Created timestamp
- Backup location/path in object store
- Backup size
- Status (pending, completed, failed)
- Optional metadata (tags, description for manual backups)

## API Endpoints

1. GET `/backups`

   - Purpose: List all backups
   - Request parameters: Optional query parameters for filtering (type, date range, etc.)
   - Request body: None
   - Response: Array of backup objects with metadata
   - Error responses: 500 for server errors
   - Authorization requirements: Admin access required

2. POST `/backups`

   - Purpose: Create a manual backup
   - Request parameters: None
   - Request body: Optional metadata (description, tags)
   - Response: Backup object with metadata including backup ID
   - Error responses: 500 for server errors, 400 for invalid requests
   - Authorization requirements: Admin access required

3. DELETE `/backups/:backupId`

   - Purpose: Delete a manual backup (automatic backups should not be deletable via API)
   - Request parameters: backupId in URL path
   - Request body: None
   - Response: Success confirmation
   - Error responses: 404 if backup not found, 400 if trying to delete automatic backup, 500 for server errors
   - Authorization requirements: Admin access required

4. POST `/backups/:backupId/restore`

   - Purpose: Restore database from a backup
   - Request parameters: backupId in URL path
   - Request body: Optional confirmation flag
   - Response: Restore operation status
   - Error responses: 404 if backup not found, 500 for server errors
   - Authorization requirements: Admin access required
   - Special behavior: Automatically creates a backup before restoring

## Frontend Pages

1. Backup Management Component

   - Purpose: Provide a UI for managing database backups
   - Key features:
     - Display list of all backups (manual and automatic) with metadata
     - Create manual backup button
     - Delete manual backup button (disabled for automatic backups)
     - Restore from backup button with confirmation dialog
     - Filter/search capabilities
     - Status indicators for backup operations
   - User interactions:
     - Click to create backup
     - Click to delete backup (with confirmation)
     - Click to restore backup (with confirmation, shows that a backup will be created first)
     - View backup details (size, date, type)

## Object Store Interface

The object store abstraction should provide:

- `listBackups(prefix?: string)`: List all backup files, optionally filtered by prefix
- `uploadBackup(backupId: string, stream: Readable)`: Upload a backup file
- `deleteBackup(backupId: string)`: Delete a backup file
- `downloadBackup(backupId: string)`: Get a readable stream for downloading a backup

The AzureObjectStore implementation will use Azure Blob Storage with the existing client infrastructure.

## Backup Function Interface

The backup function passed to backup-http and backup-cron should:
- Return a Readable stream containing the database backup
- Be async and handle errors appropriately
- Optionally accept parameters for backup configuration

## Future Enhancements / Out of Scope

- Backup encryption at rest
- Backup compression options
- Backup verification/validation
- Incremental backups
- Backup scheduling configuration via UI
- Multiple backup retention policies
- Backup notifications/alerts
- Cross-region backup replication
- Backup export to different formats
- Backup restoration to different environments

## Questions and Clarifications

- What should the backup file naming convention be? (e.g., `backup-{timestamp}-{type}-{id}.sql`)
  - sgtm
- What retention policy should be used for automatic backups? (e.g., keep last 30 days, keep weekly for 3 months, etc.)
  - that retention policy sounds good, although if backups fail, don't delete the existing backups.
- Should there be a maximum number of manual backups?
   - no
- What format should the database backup be in? (SQL dump, binary, etc.)
  - binary is fine. It'll be an sqlite db file if that makes any difference
- Should the restore operation be synchronous or asynchronous? (likely async with status polling)
  - since it's just a single file, it should be synchronous
- How should backup failures be handled and reported?
  - use getReporters to get an error reporter and report there
- Should there be backup size limits?
  - no
- What authentication/authorization mechanism should be used for the admin endpoints?
  - use existing mechanisms. getSafContextWithAuth and check scopes has "*" in it
