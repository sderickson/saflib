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

- `/saflib/object-store`: Define an abstract ObjectStore class with generic file operations (uploadFile, listFiles, deleteFile, readFile). The interface should be scoped to a specific container/bucket and folder within that bucket, allowing nested directories but restricting access to that scope. Implement an AzureObjectStore subclass that uses Azure Blob Storage.

## Storage

Backup metadata and files will be stored entirely in the remote object store (Azure Blob Storage or other provider). No local database is needed for backup tracking. Backup metadata can be stored as file metadata or in a separate metadata file alongside the backup files.

## API Endpoints

1. GET `/backups`

   - Purpose: List all backups
   - Request parameters: None
   - Request body: None
   - Response: Array of backup objects with metadata (type, timestamp, size, etc.)
   - Error responses: 500 for server errors
   - Authorization requirements: Admin access required (use getSafContextWithAuth and check scopes has "*")

2. POST `/backups`

   - Purpose: Create a manual backup
   - Request parameters: None
   - Request body: Optional metadata (description, tags)
   - Response: Backup object with metadata including backup ID
   - Error responses: 500 for server errors, 400 for invalid requests
   - Authorization requirements: Admin access required (use getSafContextWithAuth and check scopes has "*")

3. DELETE `/backups/:backupId`

   - Purpose: Delete a manual backup (automatic backups should not be deletable via API)
   - Request parameters: backupId in URL path
   - Request body: None
   - Response: Success confirmation
   - Error responses: 404 if backup not found, 400 if trying to delete automatic backup, 500 for server errors
   - Authorization requirements: Admin access required (use getSafContextWithAuth and check scopes has "*")

4. POST `/backups/:backupId/restore`

   - Purpose: Restore database from a backup
   - Request parameters: backupId in URL path
   - Request body: Optional confirmation flag
   - Response: Restore operation status
   - Error responses: 404 if backup not found, 500 for server errors
   - Authorization requirements: Admin access required (use getSafContextWithAuth and check scopes has "*")
   - Special behavior: Automatically creates a backup before restoring
   - Response: Synchronous operation (since it's just a single SQLite file)

## Frontend Pages

1. Backup Management Component

   - Purpose: Provide a UI for managing database backups
   - Key features:
     - Display list of all backups (manual and automatic) with metadata
     - Create manual backup button
     - Delete manual backup button (disabled for automatic backups)
     - Restore from backup button with confirmation dialog
     - Status indicators for backup operations
   - User interactions:
     - Click to create backup
     - Click to delete backup (with confirmation)
     - Click to restore backup (with confirmation, shows that a backup will be created first)
     - View backup details (size, date, type)

## Object Store Interface

The object store abstraction should provide a generic file storage interface:

- `uploadFile(path: string, stream: Readable, metadata?: Record<string, string>)`: Upload a file to the specified path (supports nested directories)
- `listFiles(prefix?: string)`: List all files, optionally filtered by prefix
- `deleteFile(path: string)`: Delete a file at the specified path
- `readFile(path: string)`: Get a readable stream for reading a file

The interface is scoped to a specific container/bucket and folder within that bucket. It allows operations within nested directories of that scope but does not allow access outside the scoped area. This provides security and isolation while still allowing organized file structures.

The AzureObjectStore implementation will use Azure Blob Storage with the existing client infrastructure, scoped to a specific container and folder path.

## Backup Function Interface

The backup function passed to backup-http and backup-cron should:
- Return a Readable stream containing the database backup (SQLite binary file)
- Be async and handle errors appropriately
- Optionally accept parameters for backup configuration

## Backup Naming Convention

Backup files should be named: `backup-{timestamp}-{type}-{id}.db` where:
- `timestamp` is an ISO 8601 timestamp
- `type` is either "manual" or "automatic"
- `id` is a unique identifier (e.g., UUID)

## Retention Policy

Automatic backups should be retained for 30 days. If a backup fails, existing backups should not be deleted. Only successful automatic backups older than 30 days should be cleaned up.

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

## Error Handling

Backup failures should be handled using `getSafReporters()` to get an error reporter and log errors appropriately. Failed backups should not trigger cleanup of existing backups.

## Implementation Notes

- No database is needed for backup metadata - all information is stored in the object store
- Backup format: SQLite binary database file (.db extension)
- Restore operations are synchronous since they involve a single file
- No backup size limits
- No maximum number of manual backups
- Authentication: Use `getSafContextWithAuth` and check that scopes includes "*"
