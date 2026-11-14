# Requirements Traceability Matrix

Version 0.1, Sunday 25 Oct 2026. Test case IDs are provisional and will be mapped to the real STP v1.0 IDs when this table is filled in. Updated every Sunday by Amrita.

| Req | Requirement | Component | Planned sprint | Provisional test IDs | Status |
|---|---|---|---|---|---|
| FR-01 | User registration | Auth service, register screen | 1 | TC-AUTH-01, TC-AUTH-02, TC-UI-01 | Implemented; automated tests pass |
| FR-02 | User login | Auth service, auth middleware | 1 | TC-AUTH-05, TC-UI-01 | SRS requirement implemented and tested; issue #20 criteria unavailable |
| FR-03 | User logout | Auth service | 1 | TC-AUTH-06 | Implemented; automated tests pass |
| FR-04 | Email format validation | Auth service | 1 | TC-AUTH-03 | Implemented; automated tests pass |
| FR-05 | View profile | Profile service | 2 | TC-AUTH-10 | Not started |
| FR-06 | Edit profile | Profile service | 2 | TC-AUTH-10 | Not started |
| FR-07 | Password strength | Auth service | 1 | TC-AUTH-04 | Implemented; automated tests pass |
| FR-08 | Change password | Auth service | 1 | TC-AUTH-08 | Implemented; automated tests pass |
| FR-09 | Password reset | Auth service, email provider | 2 | TC-AUTH-09 | Not started |
| FR-10 | Create task | Task service | 2 | TC-TASK-01 | Implemented; creation and validation tested |
| FR-11 | Mark task completed | Task service | 2 | TC-TASK-07 | Implemented; completion tested |
| FR-12 | Set due date | Task service | 2 | TC-TASK-04 | Partially verified; invalid date rejection tested, valid date persistence lacks an assertion |
| FR-13 | View task | Task service | 2 | TC-TASK-05 | Implemented; task listing and detail loading tested |
| FR-14 | Delete task | Task service | 2 | TC-TASK-08, TC-UI-04 | Implemented; deletion and confirmation tested |
| FR-15 | Set description | Task service | 2 | TC-TASK-05 | Partially verified; description persistence lacks an assertion |
| FR-16 | Mandatory title | Task service | 2 | TC-TASK-01, TC-TASK-02 | Implemented; empty-title rejection tested |
| FR-17 | Set priority | Task service | 2 | TC-TASK-03 | Implemented; task priority creation tested |
| FR-18 | Update priority | Task service | 2 | TC-TASK-06 | Partially verified; priority update lacks an assertion |
| FR-19 | Assign category | Task service, category service | 2 | TC-CAT-03 | Partially verified; foreign-category rejection tested, valid assignment lacks an assertion |
| FR-20 | Manage categories | Category service | 2 | TC-CAT-01, TC-CAT-02, TC-UI-04 | Not started |
| FR-21 | Filter tasks | Task service | 3 | TC-FS-01, TC-FS-03 | Implemented; browser-verified against the 1,000-task QA dataset |
| FR-22 | Sort tasks | Task service | 3 | TC-FS-02, TC-FS-03 | Implemented; browser-verified against the 1,000-task QA dataset |
| FR-23 | Due date reminder | Scheduler, push provider | 3 | TC-REM-01 to TC-REM-05, TC-UI-06 | Not started |
| FR-24 | Dashboard statistics | Dashboard service | 3 | TC-DASH-01 | Implemented; aggregate counts and user isolation tested, 1,000-task dashboard browser-verified |
| FR-25 | Dashboard charts | Dashboard service, dashboard screen | 3 | TC-DASH-02 | Implemented; status pie chart and priority bar chart browser-verified |
| FR-26 | Persistent storage | Database, migrations | 0 and 1 | TC-TASK-10 | Implemented; automated tests pass |
| FR-27 | Per-user data association | Data access layer | 0 and 1 | TC-SEC-03, TC-SEC-04 | Implemented; automated tests pass |
| FR-28 | Session timeout | Auth middleware | 1 | TC-AUTH-07, TC-UI-02 | Implemented; automated tests pass |
| NFR-01 | Dashboard under 3 seconds | Dashboard service | 3 | TC-PERF-01 | Partially verified; 3 warm 390x844 reloads median 2.249 s, but one observed reload took 3.867 s |
| NFR-02 | Hashed passwords | Auth service | 1 | TC-SEC-01 | Implemented; automated tests pass |
| NFR-03 | Authenticated access | Auth middleware | 1 | TC-SEC-02 | SRS requirement implemented and automated tests pass; issues #50/#51 are not formally verified because issue-specific acceptance criteria are unavailable |
| NFR-04 | No cross-user access | Data access layer | 2 | TC-SEC-03, TC-SEC-04 | Implemented; automated tests pass |
| NFR-05 | No data loss | Task service transactions | 2 | TC-TASK-10 | Implemented; automated tests pass |
| NFR-06 | Data unaltered except by user | Task service, scheduler | 2 | TC-TASK-11 | Implemented; automated tests pass |
| NFR-07 | Backup and recovery | Backup scripts | 4 | TC-REC-01 | Not started |
| NFR-08 | 1,000 tasks per user | Seed script, dashboard service | 3 | TC-PERF-02 | Partially verified; 1,000-task summary and 50-row paging worked, but NFR-01 timing was not consistently under threshold |
| NFR-09 | Action timestamps | Audit service | 2 | TC-TASK-09 | SRS requirement implemented and tested; issue #57 criteria unavailable |

Statuses reflect the SRS and available implementation/test evidence; implemented and tested does not mean formally verified against issue-specific criteria. GitHub descriptions and acceptance criteria for issues #20, #50, #51, and #57 were unavailable (issues #50 and #51 also have no comments specifying criteria). For formal verification of #50/#51, the issue owners must provide the acceptance criteria, including the precise protected routes and session/authentication cases to cover and the evidence required to pass. Until then, NFR-03 is only verified against the SRS and current automated tests.
