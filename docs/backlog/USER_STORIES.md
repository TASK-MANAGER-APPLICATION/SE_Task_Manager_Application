# Task Manager Application — User Stories and Acceptance Criteria

**Team:** 4  
**Product Owner:** Shivanand M  
**Source:** SRS v1.0, Task Manager Implementation Plan, STP v1.0  
**Purpose:** Product backlog for FR-01 to FR-28 with priorities, sprint allocation, estimates, and Given/When/Then acceptance criteria.

> **Note:** Requirement descriptions and priorities follow the project SRS. The Given/When/Then criteria below operationalize those requirements for backlog use; they are not quotations from the SRS. Story-point values are planning estimates using the project's 1/2/3/5-point scale.

## Definition of Ready

A story is Ready when it has a story ID, FR/NFR link, Given/When/Then acceptance criteria, and a point estimate.

## Definition of Done

A story is Done when unit tests are in the same commit as the code, CI is green, the pull request has another member's review, any endpoint change is reflected in OpenAPI, the RTM line is updated, independent tests pass, no Critical/High defect remains open, and Shivanand has accepted the story.

## Sprint Mapping

| Sprint | Dates | Scope |
|---|---|---|
| Sprint 0 | 19–25 Oct 2026 | FR-26, FR-27 groundwork |
| Sprint 1 | 26 Oct–1 Nov 2026 | FR-01–04, FR-07, FR-08, FR-28 |
| Sprint 2 | 2–8 Nov 2026 | FR-05, FR-06, FR-09–20 |
| Sprint 3 | 9–15 Nov 2026 | FR-21–25, including FR-23 |
| Sprint 4 | 16–22 Nov 2026 | Reliability and hardening |
| Sprint 5 | 23–29 Nov 2026 | Stabilisation, regression, UAT and final documentation |

## US-01 — Register

**Requirement:** FR-01 — Register  
**Priority:** High  
**Sprint:** 1  
**Story Points:** 3

**User Story**  
As a new user, I want to create an account using my email and password so that I can use the Task Manager.

**Acceptance Criteria**

- **AC-01.1** Given I am on the registration screen, when I submit a valid email and a password meeting the required strength, then my account is created successfully.
- **AC-01.2** Given the email is already registered, when I submit the registration form, then the account is not duplicated and an appropriate error is shown.
- **AC-01.3** Given required registration information is missing, when I submit the form, then validation feedback is shown and the account is not created.

## US-02 — Login

**Requirement:** FR-02 — Login  
**Priority:** High  
**Sprint:** 1  
**Story Points:** 3

**User Story**  
As a registered user, I want to log in with valid credentials so that I can access my account.

**Acceptance Criteria**

- **AC-02.1** Given I have a registered account, when I enter valid credentials and submit the login form, then I am authenticated and taken to the authenticated application.
- **AC-02.2** Given the credentials are invalid, when I submit the login form, then I remain unauthenticated and receive an appropriate error message.
- **AC-02.3** Given required login fields are empty, when I submit the form, then validation feedback is shown and the login request is not submitted.

## US-03 — Logout

**Requirement:** FR-03 — Logout  
**Priority:** High  
**Sprint:** 1  
**Story Points:** 2

**User Story**  
As a logged-in user, I want to log out so that my session is terminated.

**Acceptance Criteria**

- **AC-03.1** Given I am logged in, when I select Logout, then my active session is terminated.
- **AC-03.2** Given I have logged out, when I attempt to access an authenticated screen, then I am required to authenticate again.
- **AC-03.3** Given I have logged out, when the application is reopened, then protected session data is not used to restore the previous authenticated session.

## US-04 — Email Format Validation

**Requirement:** FR-04 — Email Format Validation  
**Priority:** High  
**Sprint:** 1  
**Story Points:** 2

**User Story**  
As a user registering for an account, I want my email format validated so that invalid email addresses are rejected before registration.

**Acceptance Criteria**

- **AC-04.1** Given I enter an email in a valid standard format, when the registration form is validated, then the email passes validation.
- **AC-04.2** Given I enter an invalid email format, when the registration form is validated, then an inline validation message is shown.
- **AC-04.3** Given the email format is invalid, when I submit registration, then the registration request is not submitted.

## US-05 — View Profile

**Requirement:** FR-05 — View Profile  
**Priority:** Medium  
**Sprint:** 2  
**Story Points:** 2

**User Story**  
As a logged-in user, I want to view my profile details so that I can check my account information.

**Acceptance Criteria**

- **AC-05.1** Given I am logged in, when I open my profile, then my profile details are displayed.
- **AC-05.2** Given I am logged in, when I open my profile, then only my profile information is displayed.

## US-06 — Edit Profile

**Requirement:** FR-06 — Edit Profile  
**Priority:** Medium  
**Sprint:** 2  
**Story Points:** 3

**User Story**  
As a logged-in user, I want to update my profile information so that my account details remain current.

**Acceptance Criteria**

- **AC-06.1** Given I am logged in, when I edit valid profile information and save it, then the updated information is stored.
- **AC-06.2** Given I enter invalid profile information, when I try to save it, then validation feedback is shown and invalid data is not saved.
- **AC-06.3** Given my profile was updated successfully, when I reopen my profile, then the updated information is displayed.

## US-07 — Password Strength Enforcement

**Requirement:** FR-07 — Password Strength Enforcement  
**Priority:** Medium  
**Sprint:** 1  
**Story Points:** 2

**User Story**  
As a user creating an account, I want password strength rules enforced so that weak passwords are rejected.

**Acceptance Criteria**

- **AC-07.1** Given I enter a password meeting the required minimum strength, when I submit registration, then the password passes validation.
- **AC-07.2** Given I enter a password below the required strength, when I submit registration, then a validation message explains that the password does not meet the minimum requirement.
- **AC-07.3** Given the password does not meet the required strength, when I submit registration, then the account is not created.

## US-08 — Change Password

**Requirement:** FR-08 — Change Password  
**Priority:** Medium  
**Sprint:** 1  
**Story Points:** 3

**User Story**  
As a logged-in user, I want to change my password by verifying my current password so that I can keep my account secure.

**Acceptance Criteria**

- **AC-08.1** Given I am logged in and provide the correct current password and a valid new password, when I submit the change-password form, then my password is changed successfully.
- **AC-08.2** Given I provide an incorrect current password, when I submit the change-password form, then the password is not changed and an error is shown.
- **AC-08.3** Given the new password does not meet the required strength, when I submit the form, then the password is not changed and validation feedback is shown.

## US-09 — Password Reset

**Requirement:** FR-09 — Password Reset  
**Priority:** Medium  
**Sprint:** 2  
**Story Points:** 3

**User Story**  
As a user who cannot remember my password, I want to reset it through email verification so that I can regain access to my account.

**Acceptance Criteria**

- **AC-09.1** Given I request a password reset using a registered email address, when the reset request is submitted, then the email verification process is initiated.
- **AC-09.2** Given I provide a valid verification step, when I submit a valid new password, then the password is reset successfully.
- **AC-09.3** Given the verification is invalid or expired, when I attempt to reset the password, then the reset is rejected and an appropriate message is shown.

## US-10 — Create Task

**Requirement:** FR-10 — Create Task  
**Priority:** High  
**Sprint:** 2  
**Story Points:** 5

**User Story**  
As a logged-in user, I want to create a task so that I can track work I need to complete.

**Acceptance Criteria**

- **AC-10.1** Given I am logged in, when I submit a task with a valid title, then the task is created and appears in my task list.
- **AC-10.2** Given I am logged in, when I submit a task with an empty title, then I see a field error and no task is created.
- **AC-10.3** Given I create a task, when it is saved, then it is associated with my user account.

## US-11 — Mark Task as Completed

**Requirement:** FR-11 — Mark Task as Completed  
**Priority:** High  
**Sprint:** 2  
**Story Points:** 2

**User Story**  
As a user, I want to mark a task as completed so that I can track my progress.

**Acceptance Criteria**

- **AC-11.1** Given I have an incomplete task, when I mark it completed, then its status changes to completed.
- **AC-11.2** Given a task is completed, when I view the task list, then the completed status is clearly indicated.

## US-12 — Set Due Date

**Requirement:** FR-12 — Set Due Date  
**Priority:** High  
**Sprint:** 2  
**Story Points:** 3

**User Story**  
As a user, I want to assign a due date to a task so that I can manage deadlines.

**Acceptance Criteria**

- **AC-12.1** Given I am creating or editing a task, when I select a valid due date and save, then the due date is stored with the task.
- **AC-12.2** Given a task has a due date, when I view its details, then the due date is displayed.

## US-13 — View Task

**Requirement:** FR-13 — View Task  
**Priority:** High  
**Sprint:** 2  
**Story Points:** 2

**User Story**  
As a user, I want to view task details so that I can see the information associated with a task.

**Acceptance Criteria**

- **AC-13.1** Given a task belongs to me, when I open it, then its stored details are displayed.
- **AC-13.2** Given a task does not belong to me, when I attempt to access it, then its details are not disclosed.

## US-14 — Delete Task

**Requirement:** FR-14 — Delete Task  
**Priority:** High  
**Sprint:** 2  
**Story Points:** 3

**User Story**  
As a user, I want to permanently delete my task so that unwanted tasks are removed.

**Acceptance Criteria**

- **AC-14.1** Given a task belongs to me, when I confirm deletion, then the task is permanently removed from my task list.
- **AC-14.2** Given a task belongs to me, when I cancel the deletion confirmation, then the task remains unchanged.
- **AC-14.3** Given a task belongs to another user, when deletion is attempted, then the task cannot be deleted by me.

## US-15 — Set Description

**Requirement:** FR-15 — Set Description  
**Priority:** Low  
**Sprint:** 2  
**Story Points:** 2

**User Story**  
As a user, I want to add a description to a task so that I can record additional details.

**Acceptance Criteria**

- **AC-15.1** Given I am creating or editing a task, when I enter a description and save the task, then the description is stored.
- **AC-15.2** Given a task has a description, when I view the task, then the description is displayed.

## US-16 — Set Title

**Requirement:** FR-16 — Set Title  
**Priority:** High  
**Sprint:** 2  
**Story Points:** 2

**User Story**  
As a user, I want every task to have a title so that each task can be identified.

**Acceptance Criteria**

- **AC-16.1** Given I am creating a task, when I submit it with a non-empty title, then the task can be created.
- **AC-16.2** Given I am creating a task, when I submit it without a title, then a validation error is shown and the task is not created.

## US-17 — Set Priority

**Requirement:** FR-17 — Set Priority  
**Priority:** High  
**Sprint:** 2  
**Story Points:** 2

**User Story**  
As a user, I want to assign a priority level to a task so that I can identify important work.

**Acceptance Criteria**

- **AC-17.1** Given I am creating or editing a task, when I select a supported priority level and save, then the selected priority is stored.
- **AC-17.2** Given a task has a priority, when I view the task, then the selected priority is displayed.

## US-18 — Update Task Priority

**Requirement:** FR-18 — Update Task Priority  
**Priority:** Medium  
**Sprint:** 2  
**Story Points:** 2

**User Story**  
As a user, I want to change an existing task's priority so that I can adjust its importance.

**Acceptance Criteria**

- **AC-18.1** Given I own an existing task, when I select a different valid priority and save, then the task's priority is updated.
- **AC-18.2** Given the priority update succeeds, when I reopen the task, then the new priority is displayed.

## US-19 — Assign Task Category

**Requirement:** FR-19 — Assign Task Category  
**Priority:** Medium  
**Sprint:** 2  
**Story Points:** 2

**User Story**  
As a user, I want to assign a category to a task so that I can organize my work.

**Acceptance Criteria**

- **AC-19.1** Given I am creating or editing a task, when I select a valid category and save, then the category is associated with the task.
- **AC-19.2** Given a task has a category, when I view the task, then the category is displayed.

## US-20 — Manage Categories

**Requirement:** FR-20 — Manage Categories  
**Priority:** Low  
**Sprint:** 2  
**Story Points:** 3

**User Story**  
As a user, I want to create, rename, and delete categories so that I can organize tasks according to my needs.

**Acceptance Criteria**

- **AC-20.1** Given I am authenticated, when I create a valid category, then the category is added to my available categories.
- **AC-20.2** Given an existing category, when I rename it with a valid name, then the updated name is displayed.
- **AC-20.3** Given an existing category, when I confirm deletion, then the category is removed according to the system's category rules.

## US-21 — Filter Tasks

**Requirement:** FR-21 — Filter Tasks  
**Priority:** Medium  
**Sprint:** 3  
**Story Points:** 3

**User Story**  
As a user, I want to filter tasks by status, priority, or category so that I can quickly find relevant tasks.

**Acceptance Criteria**

- **AC-21.1** Given I have tasks with different statuses, when I apply a status filter, then only matching tasks are displayed.
- **AC-21.2** Given I have tasks with different priorities, when I apply a priority filter, then only matching tasks are displayed.
- **AC-21.3** Given I have tasks in different categories, when I apply a category filter, then only matching tasks are displayed.
- **AC-21.4** Given a filter is active, when I clear the filter, then the task list returns to the unfiltered view.

## US-22 — Sort Tasks

**Requirement:** FR-22 — Sort Tasks  
**Priority:** Medium  
**Sprint:** 3  
**Story Points:** 3

**User Story**  
As a user, I want to sort tasks by supported attributes such as due date or priority so that I can arrange my work in a useful order.

**Acceptance Criteria**

- **AC-22.1** Given I have multiple tasks, when I sort by due date, then the tasks are displayed in the selected due-date order.
- **AC-22.2** Given I have multiple tasks, when I sort by priority, then the tasks are displayed according to the selected priority order.
- **AC-22.3** Given a sort option is selected, when I change the sort option, then the displayed task order changes accordingly.

## US-23 — Task Due Date Reminder

**Requirement:** FR-23 — Task Due Date Reminder  
**Priority:** Medium  
**Sprint:** 3  
**Story Points:** 3

**User Story**  
As a user, I want to receive a reminder when a task's due date is approaching or has arrived so that I do not miss deadlines.

**Acceptance Criteria**

- **AC-23.1** Given I have a task with a due date, when the configured reminder time is reached, then a reminder is generated for that task.
- **AC-23.2** Given a reminder is generated, when the notification is delivered through the configured mobile push mechanism, then I can see the reminder notification.
- **AC-23.3** Given the due date is changed before the reminder is sent, when the reminder state is recalculated, then the reminder follows the updated due date.

## US-24 — Dashboard Stats

**Requirement:** FR-24 — Dashboard Stats  
**Priority:** High  
**Sprint:** 3  
**Story Points:** 3

**User Story**  
As a user, I want summary statistics of my tasks on a dashboard so that I can quickly understand my workload and progress.

**Acceptance Criteria**

- **AC-24.1** Given I have tasks, when I open the dashboard, then summary task statistics are displayed.
- **AC-24.2** Given my task data changes, when I refresh or reopen the dashboard, then the displayed statistics reflect the latest stored data.
- **AC-24.3** Given I am authenticated, when I view dashboard statistics, then the statistics are based only on my task data.

## US-25 — Dashboard Graphs

**Requirement:** FR-25 — Dashboard Graphs  
**Priority:** Low  
**Sprint:** 3  
**Story Points:** 3

**User Story**  
As a user, I want graphical representations of task progress so that I can understand my progress visually.

**Acceptance Criteria**

- **AC-25.1** Given I have task data, when I open the dashboard, then a graphical representation of task progress is displayed.
- **AC-25.2** Given my task status or priority data changes, when the dashboard is refreshed, then the graph reflects the updated data.
- **AC-25.3** Given I have no task data, when I open the dashboard, then the graph does not display misleading values.

## US-26 — Persistent Data Storage

**Requirement:** FR-26 — Persistent Data Storage  
**Priority:** High  
**Sprint:** 0  
**Story Points:** 5

**User Story**  
As a user, I want my user and task data to be stored persistently so that my information remains available across sessions.

**Acceptance Criteria**

- **AC-26.1** Given a user has registered and created task data, when the user ends the session and logs in again, then the previously stored user and task data is available.
- **AC-26.2** Given task data has been stored, when the application is restarted, then the stored data is not lost.
- **AC-26.3** Given a task is updated or completed, when the user starts a new session, then the latest saved state is displayed.

## US-27 — Data Association per User

**Requirement:** FR-27 — Data Association per User  
**Priority:** High  
**Sprint:** 0  
**Story Points:** 5

**User Story**  
As a user, I want my data associated with my account so that I can access only my own tasks.

**Acceptance Criteria**

- **AC-27.1** Given a user is authenticated, when the user requests their task data, then only tasks belonging to that user are returned.
- **AC-27.2** Given two different users have task data, when either user views their tasks, then the other user's tasks are not displayed.
- **AC-27.3** Given a user attempts to access another user's task data, when the request is processed, then access is denied and no other user's data is exposed.

## US-28 — Session Timeout

**Requirement:** FR-28 — Session Timeout  
**Priority:** Low  
**Sprint:** 1  
**Story Points:** 3

**User Story**  
As a logged-in user, I want my session to expire after inactivity so that an unattended account is protected.

**Acceptance Criteria**

- **AC-28.1** Given I am authenticated, when there has been no activity for 30 minutes, then my session is automatically terminated.
- **AC-28.2** Given my session has expired, when I try to access a protected screen, then I am redirected to the login screen.
- **AC-28.3** Given my session expires, when the timeout occurs, then the application does not continue using the expired authenticated session.

# Backlog Summary

| ID | Requirement | Priority | Sprint | Points |
|---|---|---|---:|---:|
| US-01 | FR-01 Register | High | 1 | 3 |
| US-02 | FR-02 Login | High | 1 | 3 |
| US-03 | FR-03 Logout | High | 1 | 2 |
| US-04 | FR-04 Email Format Validation | High | 1 | 2 |
| US-05 | FR-05 View Profile | Medium | 2 | 2 |
| US-06 | FR-06 Edit Profile | Medium | 2 | 3 |
| US-07 | FR-07 Password Strength Enforcement | Medium | 1 | 2 |
| US-08 | FR-08 Change Password | Medium | 1 | 3 |
| US-09 | FR-09 Password Reset | Medium | 2 | 3 |
| US-10 | FR-10 Create Task | High | 2 | 5 |
| US-11 | FR-11 Mark Task as Completed | High | 2 | 2 |
| US-12 | FR-12 Set Due Date | High | 2 | 3 |
| US-13 | FR-13 View Task | High | 2 | 2 |
| US-14 | FR-14 Delete Task | High | 2 | 3 |
| US-15 | FR-15 Set Description | Low | 2 | 2 |
| US-16 | FR-16 Set Title | High | 2 | 2 |
| US-17 | FR-17 Set Priority | High | 2 | 2 |
| US-18 | FR-18 Update Task Priority | Medium | 2 | 2 |
| US-19 | FR-19 Assign Task Category | Medium | 2 | 2 |
| US-20 | FR-20 Manage Categories | Low | 2 | 3 |
| US-21 | FR-21 Filter Tasks | Medium | 3 | 3 |
| US-22 | FR-22 Sort Tasks | Medium | 3 | 3 |
| US-23 | FR-23 Task Due Date Reminder | Medium | 3 | 3 |
| US-24 | FR-24 Dashboard Stats | High | 3 | 3 |
| US-25 | FR-25 Dashboard Graphs | Low | 3 | 3 |
| US-26 | FR-26 Persistent Data Storage | High | 0 | 5 |
| US-27 | FR-27 Data Association per User | High | 0 | 5 |
| US-28 | FR-28 Session Timeout | Low | 1 | 3 |

## Sprint Acceptance Record Template

### Sprint 0 — Foundation
- **Planned acceptance:** FR-26 and FR-27 groundwork.
- **Acceptance owner:** Shivanand, Product Owner.
- **Evidence:** CI/build result, persistence/access-control evidence, related test results and RTM update.
- **Decision:** Pending final sprint review.

### Sprint 1 — Accounts and Sessions
- **Planned acceptance:** FR-01–04, FR-07, FR-08, FR-28.
- **Acceptance owner:** Shivanand, Product Owner.
- **Evidence:** registration, validation, login/logout, password-change and session-timeout demonstrations plus test results and RTM update.
- **Decision:** Pending final sprint review.

### Sprint 2 — Tasks, Categories, Profile and Reset
- **Planned acceptance:** FR-05, FR-06, FR-09–20.
- **Acceptance owner:** Shivanand, Product Owner.
- **Evidence:** mobile workflow demonstrations, test results and RTM update.
- **Decision:** Pending final sprint review.

### Sprint 3 — Organise, Monitor and Remind
- **Planned acceptance:** FR-21–25 and FR-23 reminder flow.
- **Acceptance owner:** Shivanand, Product Owner.
- **Evidence:** filtering, sorting, dashboard, charts and reminder demonstration, test results and RTM update.
- **Decision:** Pending final sprint review.

### Sprint 4 — Reliability and Hardening
- **Planned acceptance:** reliability, UX and system-test-cycle fixes affecting the mobile application.
- **Acceptance owner:** Shivanand, Product Owner.
- **Evidence:** regression/system-test results and resolved defect records.
- **Decision:** Pending final sprint review.

### Sprint 5 — Stabilisation and UAT
- **Planned acceptance:** all FR/NFR requirements re-verified for release candidate and UAT.
- **Acceptance owner:** Shivanand, Product Owner.
- **Evidence:** final RTM, UAT results, regression results and release-candidate demonstration.
- **Decision:** Pending final sprint review.