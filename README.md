# Task Manager Application

A task management application built to help users organize personal work, track deadlines, and monitor progress from one place instead of juggling notebooks, sticky notes, or multiple apps.

## Team

- Aniyath Amrita Pradeep
- Shrungashree K R
- Shaikh Abdullah Mahdi
- Shivanand M

## What This Is

Most people manage tasks through memory, scattered notes, or a mix of apps that don't talk to each other. Things get missed. Deadlines slip. This project brings the core parts of personal task management (creating tasks, organizing them, getting reminded, seeing progress) into a single Android application with a proper backend behind it.

The goal isn't to build something elaborate. It's a simple, secure system that does the basics well and holds up under real use.

## Core Features

**Accounts and profiles**
Users register with an email and password, log in, log out, and can view or edit their profile. Password changes require the current password, and forgotten passwords can be reset through email verification. Email format and password strength are both validated on entry.

**Task management**
Every task needs a title. Everything else, a description, due date, priority, and category, is optional but supported. Tasks can be viewed in detail, updated, marked complete, or deleted permanently.

**Organization**
Users create their own categories and assign tasks to them. Tasks can be filtered by status, priority, category, or due date, and sorted the same way.

**Reminders**
The system checks due dates and sends a push notification 24 hours before a task is due, so nothing depends purely on memory.

**Dashboard**
A summary view shows task counts by status, a pie chart for status distribution, and a bar chart for tasks by priority (Low, Medium, High), so users can see where things stand without opening every task individually.

**Security**
Passwords are hashed, never stored as plain text. Task features are only reachable after authentication, and one user can never see or change another user's data. Sessions time out automatically after 30 minutes of inactivity.

## Tech Stack

- **Client**: Android mobile application (touch-based UI, all screens designed for mobile form factor)
- **Backend**: JavaScript (React.js + Node.js) or Python (Django), depending on final implementation choice
- **Database**: Persistent relational or document store for users, tasks, and categories
- **Email service**: Handles password reset and verification messages
- **Push notification service**: Delivers due-date reminders to the user's device

## Screens

- Registration and login
- Profile view and edit
- Password change and reset
- Task creation, viewing, editing, completion, deletion
- Category management (create, rename, delete)
- Filter and sort controls
- Dashboard with statistics and charts

## Functional Requirements Summary

The system implements 28 functional requirements (FR-01 through FR-28) grouped into four areas.

**User account management (FR-01 to FR-09)**
Registration, login, logout, email validation, profile view/edit, password strength rules (minimum 8 characters, one uppercase, one lowercase, one number, one special character), password change, and password reset.

**Task management (FR-10 to FR-19)**
Create, complete, set due date, view, delete, set description, set title, set priority, update priority, and assign category to a task.

**Organization, reminders, and dashboard (FR-20 to FR-25)**
Manage categories, filter tasks, sort tasks, due-date reminders, dashboard statistics, and dashboard charts.

**Data and sessions (FR-26 to FR-28)**
Persistent storage across sessions, per-user data association, and automatic session timeout.

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Dashboard loads within 3 seconds under normal conditions |
| NFR-02 | Passwords stored using one-way hashing, never plaintext |
| NFR-03 | Task features require authentication |
| NFR-04 | Users cannot view or modify another user's data |
| NFR-05 | No loss of submitted task operations |
| NFR-06 | Data changes only through explicit user action |
| NFR-07 | Manual database backup and restoration supported |
| NFR-08 | Supports at least 1,000 tasks per user without breaking the NFR-01 threshold |
| NFR-09 | Timestamps recorded for creation, editing, completion, and deletion |

## Target Users

College students tracking assignments, working professionals managing daily responsibilities, and anyone who wants their to-do list in one reliable place instead of five different apps. No specialized technical knowledge is assumed, just basic comfort with a smartphone.

## Constraints and Assumptions

- Task features are locked behind authentication, always.
- Passwords never touch storage as plaintext.
- Users are assumed to provide a valid email, since password recovery depends on it.
- The system depends on an external database, an email service, and a push notification service to function as designed.
- Backup and recovery are manual, not automatic.

## Project Status

Requirements and design are defined through the Proposal and SRS documents. Implementation follows an incremental path, authentication and task creation first, then organization, reminders, dashboard, and finally the security and reliability hardening pass.

## Getting Started

Setup instructions will be added once the implementation stack (Node.js/Express or Django) is finalized and the initial repository structure is in place.

## License

To be determined.
