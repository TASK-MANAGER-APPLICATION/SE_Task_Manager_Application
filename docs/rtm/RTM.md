# Requirements Traceability Matrix

Version 0.1, Sunday 25 Oct 2026. Test case IDs are provisional and will be mapped to the real STP v1.0 IDs when this table is filled in. Updated every Sunday by Amrita.

| Req | Requirement | Component | Planned sprint | Provisional test IDs | Status |
|---|---|---|---|---|---|
| FR-01 | User registration | Auth service, register screen | 1 | TC-AUTH-01, TC-AUTH-02, TC-UI-01 | Not started |
| FR-02 | User login | Auth service, auth middleware | 1 | TC-AUTH-05, TC-UI-01 | Not started |
| FR-03 | User logout | Auth service | 1 | TC-AUTH-06 | Not started |
| FR-04 | Email format validation | Auth service | 1 | TC-AUTH-03 | Not started |
| FR-05 | View profile | Profile service | 2 | TC-AUTH-10 | Not started |
| FR-06 | Edit profile | Profile service | 2 | TC-AUTH-10 | Not started |
| FR-07 | Password strength | Auth service | 1 | TC-AUTH-04 | Not started |
| FR-08 | Change password | Auth service | 1 | TC-AUTH-08 | Not started |
| FR-09 | Password reset | Auth service, email provider | 2 | TC-AUTH-09 | Not started |
| FR-10 | Create task | Task service | 2 | TC-TASK-01 | Not started |
| FR-11 | Mark task completed | Task service | 2 | TC-TASK-07 | Not started |
| FR-12 | Set due date | Task service | 2 | TC-TASK-04 | Not started |
| FR-13 | View task | Task service | 2 | TC-TASK-05 | Not started |
| FR-14 | Delete task | Task service | 2 | TC-TASK-08, TC-UI-04 | Not started |
| FR-15 | Set description | Task service | 2 | TC-TASK-05 | Not started |
| FR-16 | Mandatory title | Task service | 2 | TC-TASK-01, TC-TASK-02 | Not started |
| FR-17 | Set priority | Task service | 2 | TC-TASK-03 | Not started |
| FR-18 | Update priority | Task service | 2 | TC-TASK-06 | Not started |
| FR-19 | Assign category | Task service, category service | 2 | TC-CAT-03 | Not started |
| FR-20 | Manage categories | Category service | 2 | TC-CAT-01, TC-CAT-02, TC-UI-04 | Not started |
| FR-21 | Filter tasks | Task service | 3 | TC-FS-01, TC-FS-03 | Not started |
| FR-22 | Sort tasks | Task service | 3 | TC-FS-02, TC-FS-03 | Not started |
| FR-23 | Due date reminder | Scheduler, push provider | 3 | TC-REM-01 to TC-REM-05, TC-UI-06 | Not started |
| FR-24 | Dashboard statistics | Dashboard service | 3 | TC-DASH-01 | Not started |
| FR-25 | Dashboard charts | Dashboard service, dashboard screen | 3 | TC-DASH-02 | Not started |
| FR-26 | Persistent storage | Database, migrations | 0 and 1 | TC-TASK-10 | Not started |
| FR-27 | Per-user data association | Data access layer | 0 and 1 | TC-SEC-03, TC-SEC-04 | Not started |
| FR-28 | Session timeout | Auth middleware | 1 | TC-AUTH-07, TC-UI-02 | Not started |
| NFR-01 | Dashboard under 3 seconds | Dashboard service | 3 | TC-PERF-01 | Not started |
| NFR-02 | Hashed passwords | Auth service | 1 | TC-SEC-01 | Not started |
| NFR-03 | Authenticated access | Auth middleware | 1 | TC-SEC-02 | Not started |
| NFR-04 | No cross-user access | Data access layer | 2 | TC-SEC-03, TC-SEC-04 | Not started |
| NFR-05 | No data loss | Task service transactions | 2 | TC-TASK-10 | Not started |
| NFR-06 | Data unaltered except by user | Task service, scheduler | 2 | TC-TASK-11 | Not started |
| NFR-07 | Backup and recovery | Backup scripts | 4 | TC-REC-01 | Not started |
| NFR-08 | 1,000 tasks per user | Seed script, dashboard service | 3 | TC-PERF-02 | Not started |
| NFR-09 | Action timestamps | Audit service | 2 | TC-TASK-09 | Not started |
