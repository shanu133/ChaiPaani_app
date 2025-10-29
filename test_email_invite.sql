-- Test script to add a member to a group and verify email invitation
-- Your UUID: a22b40d7-dbb6-4e8d-b02d-e025a58c04ba

-- Step 1: Create a test group
INSERT INTO groups (name, description, category, created_by, currency)
VALUES ('Email Test Group', 'Testing the new email template', 'general', 'a22b40d7-dbb6-4e8d-b02d-e025a58c04ba', 'INR')
RETURNING id;

-- After running above, copy the returned group ID and use it in the next queries
-- Replace 'your-group-id-here' with the actual group ID returned above

-- Step 2: Add yourself as admin to the group
-- INSERT INTO group_members (group_id, user_id, role, joined_at)
-- VALUES ('your-group-id-here', 'a22b40d7-dbb6-4e8d-b02d-e025a58c04ba', 'admin', NOW());

-- Step 3: Test the invite function (replace with actual group ID and test email)
-- SELECT invite_user_to_group(
--   'your-group-id-here'::uuid,
--   'your-test-email@example.com'
-- );

-- Step 4: Verify the invitation was created
-- SELECT
--   i.id,
--   i.invitee_email,
--   i.status,
--   i.created_at,
--   g.name as group_name
-- FROM invitations i
-- JOIN groups g ON i.group_id = g.id
-- WHERE i.invitee_email = 'your-test-email@example.com'
-- ORDER BY i.created_at DESC
-- LIMIT 1;

-- Clean up (run after testing)
-- DELETE FROM invitations WHERE invitee_email = 'your-test-email@example.com';
-- DELETE FROM group_members WHERE group_id = 'your-group-id-here' AND user_id = 'a22b40d7-dbb6-4e8d-b02d-e025a58c04ba';
-- DELETE FROM groups WHERE id = 'your-group-id-here';