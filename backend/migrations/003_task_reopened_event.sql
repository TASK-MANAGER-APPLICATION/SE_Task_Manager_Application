ALTER TABLE task_events
DROP CONSTRAINT IF EXISTS task_events_action_check;

ALTER TABLE task_events
ADD CONSTRAINT task_events_action_check
CHECK (
    action IN (
        'CREATED',
        'EDITED',
        'COMPLETED',
        'REOPENED',
        'DELETED'
    )
);
