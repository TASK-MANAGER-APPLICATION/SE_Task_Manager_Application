
# Requirements Traceability Matrix

Version 0.2 — updated 27 October 2026  
Owner: Amrita, QA Lead

The backlog and RTM were created later than the planned 12–25 October setup dates.
Dates have not been backdated.

Official test-case groups below come from STP v1.0.
Supplementary scenario IDs are unique identifiers for detailed cases and do not
replace official STP IDs.

## Status definitions

- PASS: the requirement has been verified with recorded evidence.
- PARTIAL: prototype-level behavior has been checked, but a requirement is not fully verified.
- FAIL: an executed test demonstrates that the expected requirement is not met.
- BLOCKED: verification depends on an unavailable component or service.
- NOT TESTED: no applicable test has been executed.

| Requirement | Requirement summary | Component owner | Course sprint | Official STP v1.0 group | Supplementary scenario ID | Current status |
|---|---|---|---|---|---|---|
| FR-01 | User registration | Shrungashree | Sprint 1 | TC-AUTH-01 to TC-AUTH-04 | TC-RTM-FR01-01 | BLOCKED — backend endpoint unavailable |
| FR-02 | User login | Shrungashree | Sprint 1 | TC-AUTH-01 to TC-AUTH-04 | TC-RTM-FR02-01 | BLOCKED — backend endpoint unavailable |
| FR-03 | User logout | Shrungashree | Sprint 1 | TC-AUTH-01 to TC-AUTH-04 | TC-RTM-FR03-01 | BLOCKED — backend endpoint unavailable |
| FR-04 | Email-format validation | Shrungashree | Sprint 1 | TC-AUTH-01 to TC-AUTH-04 | TC-RTM-FR04-01 | BLOCKED — backend endpoint unavailable |
| FR-05 | View own profile | Amrita | Sprint 2 | TC-AUTH-05 to TC-AUTH-09 | TC-RTM-FR05-01 | NOT TESTED |
| FR-06 | Edit profile name | Amrita | Sprint 2 | TC-AUTH-05 to TC-AUTH-09 | TC-RTM-FR06-01 | NOT TESTED |
| FR-07 | Password-strength validation | Shrungashree | Sprint 1 | TC-AUTH-01 to TC-AUTH-04 | TC-RTM-FR07-01 | BLOCKED — backend endpoint unavailable |
| FR-08 | Change password | Shrungashree | Sprint 1 | TC-AUTH-05 to TC-AUTH-09 | TC-RTM-FR08-01 | NOT TESTED |
| FR-09 | Reset forgotten password | Amrita | Sprint 2 | TC-AUTH-05 to TC-AUTH-09 | TC-RTM-FR09-01 | NOT TESTED |
| FR-10 | Create task | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR10-01 | PARTIAL — mobile prototype tested; API and persistence unverified |
| FR-11 | Mark task completed | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR11-01 | PARTIAL — mobile prototype tested; API unverified |
| FR-12 | Set due date | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR12-01 | NOT TESTED |
| FR-13 | View task | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR13-01 | PARTIAL — prototype display tested; API unverified |
| FR-14 | Delete task | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR14-01 | NOT TESTED |
| FR-15 | Set task description | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR15-01 | NOT TESTED |
| FR-16 | Enforce mandatory title | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR16-01 | PARTIAL — title validation tested in prototype |
| FR-17 | Set task priority | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR17-01 | NOT TESTED |
| FR-18 | Update task priority | Shrungashree | Sprint 2 | TC-TASK-01 to TC-TASK-09 | TC-RTM-FR18-01 | NOT TESTED |
| FR-19 | Assign category to task | Amrita | Sprint 2 | TC-CAT-01 to TC-CAT-02 | TC-RTM-FR19-01 | NOT TESTED |
| FR-20 | Create, rename and delete categories | Amrita | Sprint 2 | TC-CAT-01 to TC-CAT-02 | TC-RTM-FR20-01 | NOT TESTED |
| FR-21 | Filter tasks | Shrungashree | Backlog | TC-ORG-01 to TC-ORG-02 | TC-RTM-FR21-01 | NOT TESTED |
| FR-22 | Sort tasks | Shrungashree | Backlog | TC-ORG-01 to TC-ORG-02 | TC-RTM-FR22-01 | NOT TESTED |
| FR-23 | Due-date reminder | Abdullah | Backlog | TC-REM-01 | TC-RTM-FR23-01 | NOT TESTED |
| FR-24 | Dashboard statistics | Shrungashree | Backlog | TC-DASH-01 to TC-DASH-02 | TC-RTM-FR24-01 | PARTIAL — local summary counts tested; API unverified |
| FR-25 | Dashboard charts | Shivanand | Backlog | TC-DASH-01 to TC-DASH-02 | TC-RTM-FR25-01 | NOT TESTED |
| FR-26 | Persistent storage | Shrungashree | Sprint 1 | TC-DATA-01 to TC-DATA-03 | TC-RTM-FR26-01 | FAIL — TC-14 observed task loss after refresh |
| FR-27 | Per-user data association | Shrungashree | Sprint 1 | TC-DATA-01 to TC-DATA-03 | TC-RTM-FR27-01 | BLOCKED — no implemented backend access control |
| FR-28 | Session timeout after 30 minutes | Shrungashree | Sprint 1 | TC-DATA-01 to TC-DATA-03 | TC-RTM-FR28-01 | BLOCKED — no implemented session middleware |
| NFR-01 | Dashboard under 3 seconds | Amrita | Backlog | TC-PERF-01 | TC-RTM-NFR01-01 | NOT TESTED |
| NFR-02 | Passwords stored as hashes | Shrungashree | Sprint 1 | TC-SEC-01 to TC-SEC-03 | TC-RTM-NFR02-01 | BLOCKED — backend authentication unavailable |
| NFR-03 | Authenticated access required | Shrungashree | Sprint 1 | TC-SEC-01 to TC-SEC-03 | TC-RTM-NFR03-01 | BLOCKED — backend authentication unavailable |
| NFR-04 | Prevent cross-user access | Shrungashree | Sprint 2 | TC-SEC-01 to TC-SEC-03 | TC-RTM-NFR04-01 | BLOCKED — access-control tests require backend |
| NFR-05 | No data loss | Shrungashree | Sprint 2 | TC-INT-01 to TC-INT-02 | TC-RTM-NFR05-01 | NOT TESTED — persistent backend unavailable |
| NFR-06 | Data integrity | Shrungashree | Sprint 2 | TC-INT-01 to TC-INT-02 | TC-RTM-NFR06-01 | NOT TESTED |
| NFR-07 | Backup and recovery | Abdullah | Backlog | TC-REC-01 | TC-RTM-NFR07-01 | NOT TESTED |
| NFR-08 | At least 1,000 tasks per user | Amrita | Backlog | TC-PERF-02 | TC-RTM-NFR08-01 | NOT TESTED |
| NFR-09 | Timestamp key task actions | Shrungashree | Sprint 2 | TC-TRACE-01 | TC-RTM-NFR09-01 | NOT TESTED |

## Traceability notes

- Official STP IDs remain unchanged.
- Each supplementary scenario ID is unique.
- Every FR and NFR has a mapped official STP group and a supplementary scenario.
- Supplementary cases must be expanded with preconditions, test data, steps, expected results, actual results and defect references as execution proceeds.
- PARTIAL does not mean the complete SRS requirement has passed.
- TC-14 remains FAIL until persistence is implemented and the test is executed again.
- FR-26 and FR-27 were foundation work in the detailed implementation roadmap; they are included under Sprint 1 in this two-course-sprint view because the course deliverables require only Sprint 1 and Sprint 2.
