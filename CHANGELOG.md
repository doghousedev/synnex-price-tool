# Changelog

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
