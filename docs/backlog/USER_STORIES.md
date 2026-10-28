# Task Manager Application: Product Backlog

## Sprint 1 Goal

Deliver a demonstrable end-to-end workflow using a real backend and database.

A user should be able to register, log in, create a task, see the task after refreshing or logging in again, mark it completed and log out. The main flow must be demonstrated through the running application, not simulated success messages.

## Team Responsibilities

### Shrungashree: Backend and API Integration
Own the backend server, database, migrations, authentication, session management and core API behavior. Coordinate with Shivanand to connect the mobile app to the real endpoints.

### Shivanand: Mobile Frontend
Own the mobile screens, navigation, registration and login forms, task list, task interactions and dashboard UI. Keep loading, empty and error states clear, and coordinate with Shrungashree on the API contract.

### Abdullah: Task Functionality and API Testing
Own the remaining task-management functionality, categories, reminders, API test coverage and security verification. Keep the automated test suite and Postman collection usable and repeatable.

### Amrita: QA Coordination and Review Evidence
Own the review checklist, test evidence, documentation and status tracking. Coordinate verification with the implementation owners. Feature implementation remains with the relevant backend or frontend owner.

## Definition of Done

A work item is complete when:

- The behavior works in the actual application or API.
- Relevant tests have run and their results are recorded.
- Invalid input and failure cases are handled.
- Protected data cannot be accessed by another user.
- Documentation matches the actual implementation.
- Known limitations are recorded honestly.
- The Product Owner has reviewed the demonstrated behavior.

## Sprint 1: Core Application

### Backend Setup, Authentication and API Integration
GitHub issue: #12  
Owner: Shrungashree

As a user, I want a working backend and secure account access so that I can use the application with persistent data.

Acceptance criteria:
- The server starts using the documented setup.
- Database migrations work from a clean test database.
- Registration, login and logout work.
- Passwords are stored as hashes.
- Sessions expire after the configured inactivity period.
- Core task operations are available through the running server.
- Task data persists in the database.
- A user cannot access another user's tasks.
- The mobile application can connect to the actual API.

### Mobile Frontend and Core User Flows
GitHub issue: #16  
Owner: Shivanand

As a user, I want clear screens and interactions so that I can register, log in and manage my tasks.

Acceptance criteria:
- Registration and login forms validate required input.
- The home screen and task list are navigable.
- A user can create a task with a required title and mark it complete.
- Loading, empty and error states are displayed clearly.
- The UI does not show a successful save when the request fails.
- Any remaining prototype or sample-data behavior is identified.

### API Testing, Security Checks and CI
GitHub issue: #14  
Owner: Abdullah

As a team, we need repeatable API and security tests so that we can verify the core application before review.

Acceptance criteria:
- Tests run against a dedicated test database.
- Migrations run before tests in CI.
- CI fails when a test fails.
- Authentication, invalid input, logout and session expiry are tested.
- Cross-user task access is rejected.
- Password hashes are not exposed in API responses.
- Test cleanup only deletes records created by the test run.
- The Postman collection and test report reflect actual results.

### Sprint Review Checklist and Evidence
GitHub issue: #15  
Owner: Amrita

As a reviewer, I need concise documentation and evidence so that I can understand what has been implemented and verified.

Acceptance criteria:
- Setup and demo steps are documented.
- The API overview reflects the current implementation.
- Test outcomes are recorded.
- Known gaps and limitations are clearly listed.
- The status matrix is consistent with actual evidence.
- The demo distinguishes completed functionality from prototype behavior.

## Sprint 2: Account and Task Improvements

### Profile and Password Recovery
GitHub issue: #23  
Owner: Shrungashree

Implement profile viewing and editing and the password-reset flow. Reset links must be secure, expire, be single-use and invalidate existing sessions after a successful password reset. Coordinate the mobile screens with Shivanand and verify security with Abdullah.

### Task Management and Categories
GitHub issue: #35  
Owner: Abdullah

Complete task details, editing, deletion, due dates, descriptions, priorities and category management. Add category assignment, filtering and sorting. Validate inputs and make sure every operation respects task ownership.

## Sprint 3: Organise and Monitor

### Due-Date Reminders and Notifications
GitHub issue: #41  
Owner: Abdullah

Build a scheduled reminder service for eligible tasks. Avoid reminders for completed tasks, prevent duplicate reminders, handle due-date changes and record failures. Coordinate mobile notification behavior with Shivanand.

### Dashboard and Progress Charts
GitHub issue: #42  
Owner: Shivanand

Build dashboard summary cards and charts using real saved task statistics. Include loading, error and empty states, and refresh the display when task data changes.

## Sprint 4: Reliability and Release Readiness

### Reliability, Performance and Release Verification
GitHub issue: #55  
Owner: Amrita

Coordinate verification of data persistence, backup and restore, data integrity, audit records and performance. Test using at least 1,000 tasks, record actual dashboard response times and document any remaining defects or release limitations.

## Review Principles

- Keep one ticket per meaningful deliverable rather than one ticket for every small field or operation.
- Keep detailed requirement traceability in the formal traceability document when required by the course.
- Do not use requirement identifiers as story titles or repeat them in every assignment.
- Do not mark a feature complete merely because its code exists on a branch.
- Base review status on the integrated implementation and actual test evidence.
