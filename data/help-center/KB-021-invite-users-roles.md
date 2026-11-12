---
id: KB-021
title: Invite users and assign roles
area: user_management
tags: invite user, roles, seats, seat limit, invitation expired, permissions
---
You can invite teammates to your Meridian workspace and give each one a role.

## Roles

| Role | What they can do |
|---|---|
| Owner | Everything, including billing, security settings, and ownership transfer |
| Admin | Manage members, apps, API keys, webhooks, and domains |
| Member | Build and run apps, view logs |
| Viewer | Read-only access |

Only Owners and Admins can invite users.

## Invite a user

1. Go to Settings > Members.
2. Click **Invite**.
3. Enter one or more email addresses.
4. Choose a role.
5. Click **Send invites**.

The user gets an email with a link to join. Invites expire after 7 days. If an invite expired, the user sees a message that the invitation is no longer valid. Resend it from Settings > Members.

## Seat limits

| Plan | Users |
|---|---|
| Free | 3 users |
| Pro | 50 |
| Enterprise | custom |

If you have reached your seat limit, the **Invite** button is disabled and you see a message that you are out of seats. To add more users, remove someone you no longer need (see KB-022) or upgrade your plan (see KB-019 and KB-020).

## Change a user's role

1. Go to Settings > Members.
2. Find the user and choose a new role.

Only an Owner can make someone an Owner. To hand over the account, see KB-022.

## Using SSO?

If your workspace uses SSO with SCIM or just-in-time provisioning, users may be added through your identity provider instead of invites. See KB-004.

## Invite not arriving?

Ask the user to check spam, then resend the invite. If it still doesn't arrive, contact support with your account ID (from Settings > Account), the invited email address, and when you sent the invite.
