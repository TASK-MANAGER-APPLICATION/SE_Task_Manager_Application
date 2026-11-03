# Task Manager Application — Manual Software Testing Report

## 1. Testing Overview

**Project:** Task Manager Application  
**Testing type:** Manual Functional Testing  
**Application:** Expo React Native Task Manager  
**Testing environment:** Windows, VS Code, Expo Web, browser  
**Total test cases executed:** 30  
**Purpose:** To verify task creation, input validation, task status changes, dashboard counts, task display, and basic application behavior.

## 2. Test Execution Summary

| Result category | Count |
|---|---:|
| PASS | 28 |
| FAIL / limitation requiring review | 1 |
| Requirement clarification pending | 1 |
| **Total test cases** | **30** |

*Note:* TC-14 concerns persistence after refreshing the browser. It is recorded as a limitation because the current app uses temporary in-memory state; classify it as FAIL if persistence is a required SRS requirement. TC-10 requires clarification about whether duplicate task titles should be permitted.

## 3. Detailed Test Case Results

| ID | Test case | Expected result | Actual result / observation | Status |
|---|---|---|---|---|
| TC-01 | Initial screen launch | App opens successfully | App opened in the browser | PASS |
| TC-02 | Dashboard summary counts | Counts match task list | Counts matched the task list | PASS |
| TC-03 | Mark task completed | Selected task becomes Completed | Status and summary counts updated | PASS |
| TC-04 | Undo task completion | Task returns to In progress | Status changed back correctly | PASS |
| TC-05 | Add a new task | Task appears and total increases | New task appeared; count increased | PASS |
| TC-06 | Empty title validation | Empty task is not saved | No task was added | PASS |
| TC-07 | Default task values | Correct defaults are displayed | Personal, Medium, No date | PASS |
| TC-08 | Whitespace-only title | Blank task is rejected | No task was added | PASS |
| TC-09 | Trim title whitespace | Leading/trailing spaces are removed | Title displayed without surrounding spaces | PASS |
| TC-10 | Duplicate task titles | Behavior follows requirements | Duplicate titles were allowed; requirement needs confirmation | REVIEW |
| TC-11 | Counts with duplicate titles | Each task is counted separately | Both tasks were counted | PASS |
| TC-12 | Default task status | New task is In progress | Correct status displayed | PASS |
| TC-13 | Clear input after saving | Input clears after save | Input cleared correctly | PASS |
| TC-14 | Persistence after refresh | Saved tasks remain after refresh, if required | Previously added task disappeared after restart/refresh recovery | LIMITATION |
| TC-15 | Counts after completion | Pending decreases; Completed increases | Counts updated correctly; total unchanged | PASS |
| TC-16 | Details after completion | Task details remain unchanged | Title, category, priority, and due date remained unchanged | PASS |
| TC-17 | Completed task visibility | Completed task remains in list | Task remained visible with Completed status | PASS |
| TC-18 | Independent task completion | Only selected task changes | Second task remained In progress | PASS |
| TC-19 | Add task and verify total | Total increases by one | New task appeared; count increased by one | PASS |
| TC-20 | Special characters and numbers | Title displays correctly | `Lab #20 - API & UI` displayed correctly | PASS |
| TC-21 | Default category, priority, status | Defaults remain consistent | Personal, Medium, In progress | PASS |
| TC-22 | Counts after adding task | Total and In progress increase by one | Counts updated correctly | PASS |
| TC-23 | Counts after completing task | Completed increases; In progress decreases | Counts changed correctly; total unchanged | PASS |
| TC-24 | Details after completion | Details do not change | All four checked details remained unchanged | PASS |
| TC-25 | Revert completion | Task returns to In progress | Status and counts updated correctly | PASS |
| TC-26 | Completed task visibility | Completed task remains visible | Task remained visible with correct status | PASS |
| TC-27 | Long task title | Title remains readable | Long title displayed without breaking the layout | PASS |
| TC-28 | Rapid double-click on Save | Only one task is created | One task was created during the test | PASS |
| TC-29 | Extremely long task title | Card remains usable | Title was readable; other information was not obscured | PASS |
| TC-30 | Add task with mixed statuses | New task is added without changing existing statuses | New task appeared; total increased by one; existing statuses remained unchanged | PASS |

## 4. Issues and Limitations Identified

### 4.1 Task persistence

The app currently uses in-memory state. A task added during a session disappeared after the browser refresh/restart recovery process.

**Impact:** Users may lose newly created tasks when the app reloads or closes.

**Recommended action:** Confirm the persistence requirement in the SRS, then implement persistent storage or backend/database integration if required. Retest after the fix.

### 4.2 Duplicate task titles

The application allows multiple tasks with the same title.

**Impact:** This may be acceptable behavior, but the requirement has not yet been confirmed.

**Recommended action:** Check the SRS. If duplicate titles are allowed, retain the current behavior. If they are prohibited, add validation and retest.

### 4.3 Scope of current testing

The reported tests primarily cover the existing task creation interface, task status changes, summary counts, input validation, and display behavior.

The following features have **not been verified by this test run**:

- Editing and deleting tasks
- Filtering and sorting
- Backend/API integration
- Database persistence and recovery
- Reminder scheduling and push notifications
- Backup and restore
- Automated test execution
- Security and authorization testing

Do not report these features as passed unless they are implemented and separately tested.

## 5. Conclusion

The manual functional testing round covered 30 test cases. Based on the reported observations, 28 tests passed, one requires requirement clarification, and one identified a persistence limitation that requires review against the SRS.

The tested task creation, input validation, status transitions, summary count updates, and task display behaviors worked as expected in the observed scenarios. Further testing is needed for persistence, backend integration, and any additional features required by the project specification.

**Overall recommendation:** Resolve the persistence requirement, clarify duplicate-title behavior, and then perform regression testing before the project review.
