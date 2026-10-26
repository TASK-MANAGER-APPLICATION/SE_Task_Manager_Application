# Requirements Traceability Matrix

Version 0.2, Sunday 25 Oct 2026. Updated by Amrita as testing progresses.

The STP v1.0 (section 13) assigns test case ID ranges per requirement group, not per requirement. The STP column below uses those ranges. The detailed cases column holds the finer-grained cases drafted in the Implementation Plan, which are provisional and will be reconciled with the STP when each case is written out.

| Req | Requirement | Component | Sprint | STP v1.0 test cases | Detailed cases (provisional) | Status |
|---|---|---|---|---|---|---|
| FR-01 | User registration | Auth service, register screen | 2 | TC-AUTH-01 to TC-AUTH-04 | TC-AUTH-01, TC-AUTH-02, TC-UI-01 | Not started |
| FR-02 | User login | Auth service, auth middleware | 2 | TC-AUTH-01 to TC-AUTH-04 | TC-AUTH-05, TC-UI-01 | Not started |
| FR-03 | User logout | Auth service | 2 | TC-AUTH-01 to TC-AUTH-04 | TC-AUTH-06 | Not started |
| FR-04 | Email format validation | Auth service | 2 | TC-AUTH-01 to TC-AUTH-04 | TC-AUTH-03 | Not started |
| FR-05 | View profile | Profile service | Backlog | TC-AUTH-05 to TC-AUTH-09 | TC-AUTH-10 | Not started |
| FR-06 | Edit profile | Profile service | Backlog | TC-AUTH-05 to TC-AUTH-09 | TC-AUTH-10 | Not started |
| FR-07 | Password strength | Auth service | 2 | TC-AUTH-05 to TC-AUTH-09 | TC-AUTH-04 | Not started |
| FR-08 | Change password | Auth service | 2 | TC-AUTH-05 to TC-AUTH-09 | TC-AUTH-08 | Not started |
| FR-09 | Password reset | Auth service, email provider | Backlog | TC-AUTH-05 to TC-AUTH-09 | TC-AUTH-09 | Not started |
| FR-10 | Create task | Task service, mobile prototype | 1 and 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-01 | Prototype manually tested |
| FR-11 | Mark task completed | Task service, mobile prototype | 1 and 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-07 | Prototype manually tested |
| FR-12 | Set due date | Task service | 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-04 | Not started |
| FR-13 | View task | Task service, mobile prototype | 1 and 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-05 | Prototype manually tested |
| FR-14 | Delete task | Task service | 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-08, TC-UI-04 | Not started |
| FR-15 | Set description | Task service | 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-05 | Not started |
| FR-16 | Mandatory title | Task service, mobile prototype | 1 and 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-01, TC-TASK-02 | Prototype manually tested |
| FR-17 | Set priority | Task service | 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-03 | Not started |
| FR-18 | Update priority | Task service | 2 | TC-TASK-01 to TC-TASK-09 | TC-TASK-06 | Not started |
| FR-19 | Assign category | Task service, category service | 2 if time | TC-CAT-01 to TC-CAT-02 | TC-CAT-03 | Not started |
| FR-20 | Manage categories | Category service | 2 if time | TC-CAT-01 to TC-CAT-02 | TC-CAT-01, TC-CAT-02, TC-UI-04 | Not started |
| FR-21 | Filter tasks | Task service | 2 if time | TC-ORG-01 to TC-ORG-02 | TC-FS-01, TC-FS-03 | Not started |
| FR-22 | Sort tasks | Task service | 2 if time | TC-ORG-01 to TC-ORG-02 | TC-FS-02, TC-FS-03 | Not started |
| FR-23 | Due date reminder | Scheduler, push provider | Backlog | TC-REM-01 | TC-REM-01 to TC-REM-05, TC-UI-06 | Not started |
| FR-24 | Dashboard statistics | Dashboard service, mobile prototype | 1 and 2 | TC-DASH-01 to TC-DASH-02 | TC-DASH-01 | Prototype manually tested |
| FR-25 | Dashboard charts | Dashboard screen | Backlog | TC-DASH-01 to TC-DASH-02 | TC-DASH-02 | Not started |
| FR-26 | Persistent storage | Database, migrations | 2 | TC-DATA-01 to TC-DATA-03 | TC-TASK-10 | Not started |
| FR-27 | Per-user data association | Data access layer | 2 | TC-DATA-01 to TC-DATA-03 | TC-SEC-03, TC-SEC-04 | Not started |
| FR-28 | Session timeout | Auth middleware | 2 | TC-DATA-01 to TC-DATA-03 | TC-AUTH-07, TC-UI-02 | Not started |
| NFR-01 | Dashboard under 3 seconds | Dashboard service | 2 if time | TC-PERF-01 | TC-PERF-01 | Not started |
| NFR-02 | Hashed passwords | Auth service | 2 | TC-SEC-01 to TC-SEC-03 | TC-SEC-01 | Not started |
| NFR-03 | Authenticated access | Auth middleware | 2 | TC-SEC-01 to TC-SEC-03 | TC-SEC-02 | Not started |
| NFR-04 | No cross-user access | Data access layer | 2 | TC-SEC-01 to TC-SEC-03 | TC-SEC-03, TC-SEC-04 | Not started |
| NFR-05 | No data loss | Task service transactions | 2 | TC-INT-01 to TC-INT-02 | TC-TASK-10 | Not started |
| NFR-06 | Data unaltered except by user | Task service | 2 | TC-INT-01 to TC-INT-02 | TC-TASK-11 | Not started |
| NFR-07 | Backup and recovery | Backup scripts | Backlog | TC-REC-01 | TC-REC-01 | Not started |
| NFR-08 | 1,000 tasks per user | Seed script, dashboard service | Backlog | TC-PERF-02 | TC-PERF-02 | Not started |
| NFR-09 | Action timestamps | Audit service | 2 if time | TC-TRACE-01 | TC-TASK-09 | Not started |
