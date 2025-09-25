-- Step 1: Create new columns with text type
ALTER TABLE users ADD COLUMN id_new TEXT;
--> statement-breakpoint
ALTER TABLE email_auth ADD COLUMN user_id_new TEXT;
--> statement-breakpoint

-- Step 2: Convert existing integer IDs to string representations
UPDATE users SET id_new = CAST(id AS TEXT);
--> statement-breakpoint
UPDATE email_auth SET user_id_new = CAST(user_id AS TEXT);
--> statement-breakpoint

-- Step 3: Drop foreign key constraints
PRAGMA foreign_keys = OFF;
--> statement-breakpoint

-- Step 4: Create new tables with correct schema
CREATE TABLE users_new (
	id TEXT PRIMARY KEY NOT NULL,
	created_at INTEGER NOT NULL,
	last_login_at INTEGER,
	email TEXT NOT NULL,
	email_verified INTEGER DEFAULT false,
	name TEXT,
	given_name TEXT,
	family_name TEXT
);
--> statement-breakpoint

CREATE TABLE email_auth_new (
	user_id TEXT NOT NULL,
	email TEXT NOT NULL,
	password_hash BLOB NOT NULL,
	verified_at INTEGER,
	verification_token TEXT,
	verification_token_expires_at INTEGER,
	forgot_password_token TEXT,
	forgot_password_token_expires_at INTEGER
);
--> statement-breakpoint

-- Step 5: Copy data to new tables
INSERT INTO users_new SELECT id_new, created_at, last_login_at, email, email_verified, name, given_name, family_name FROM users;
--> statement-breakpoint
INSERT INTO email_auth_new SELECT user_id_new, email, password_hash, verified_at, verification_token, verification_token_expires_at, forgot_password_token, forgot_password_token_expires_at FROM email_auth;
--> statement-breakpoint

-- Step 6: Drop old tables
DROP TABLE email_auth;
--> statement-breakpoint
DROP TABLE users;
--> statement-breakpoint

-- Step 7: Rename new tables
ALTER TABLE users_new RENAME TO users;
--> statement-breakpoint
ALTER TABLE email_auth_new RENAME TO email_auth;
--> statement-breakpoint

-- Step 8: Recreate indexes
CREATE UNIQUE INDEX users_email_unique ON users (email);
--> statement-breakpoint
CREATE UNIQUE INDEX email_auth_user_id_unique ON email_auth (user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX email_auth_email_unique ON email_auth (email);
--> statement-breakpoint

-- Step 9: Add foreign key constraint
CREATE TABLE email_auth_temp (
	user_id TEXT NOT NULL,
	email TEXT NOT NULL,
	password_hash BLOB NOT NULL,
	verified_at INTEGER,
	verification_token TEXT,
	verification_token_expires_at INTEGER,
	forgot_password_token TEXT,
	forgot_password_token_expires_at INTEGER,
	FOREIGN KEY (user_id) REFERENCES users(id)
);
--> statement-breakpoint
INSERT INTO email_auth_temp SELECT * FROM email_auth;
--> statement-breakpoint
DROP TABLE email_auth;
--> statement-breakpoint
ALTER TABLE email_auth_temp RENAME TO email_auth;
--> statement-breakpoint

-- Step 10: Re-enable foreign keys
PRAGMA foreign_keys = ON;
