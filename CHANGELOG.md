# Changelog

## [Unreleased]
### Added
- Added `--logDir` option to `run_full_import.js` to allow specifying a directory for log files. Log directory is created automatically if it does not exist.
- Updated `INSTRUCTIONS.md` to document the new `--logDir` usage with example.

### Changed
- Removed large data files (`data-processing/data/627674.ap`, `data-processing/data/full-627674.csv`) from git history to comply with GitHub file size limits. Updated `.gitignore` to prevent tracking large data files in the future.

### Fixed
- Resolved all variable redeclaration lint errors in `run_full_import.js` by consolidating CLI argument parsing.
- Improved logging robustness and flexibility.


## [1.2.0] - 2025-04-18
### Added
- Implemented Drizzle ORM for type-safe database interactions with the synnex_flat_file table
- Created database schema definition for the Synnex flat file structure
- Added API endpoints for testing database connection and searching products
- Implemented search functionality by part number, description, and SKU
- Added a user interface for searching and displaying Synnex product data

### Changed
- Replaced direct SQL queries with Drizzle ORM query builder
- Updated database connection to use environment variables

## [1.1.0] - 2025-04-18
### Added
- Fully streaming `.ap` to `.csv` conversion for memory efficiency and scalability, using line-by-line processing.
- Streaming, batch-safe CSV import into Postgres with automatic batch size adjustment to respect Postgres parameter limits.
- Robust date/timestamp validation: invalid or empty date fields are set to `null` before DB insert, preventing Postgres errors.
- Progress bars for both parsing and database import phases for better user feedback.
- All console output is logged to a timestamped `run_YYYY-MM-DDTHH-MM-SS.log` file for audit and debugging.

### Changed
- Improved error handling and reporting throughout the import pipeline.
- Updated logic to allow updates to existing records on primary key conflict using `ON CONFLICT ... DO UPDATE`.

### Fixed
- Eliminated heap out-of-memory errors for large files by removing all full-file-in-memory steps.
- Prevented Postgres parameter overflow errors by enforcing a safe batch size.

---
