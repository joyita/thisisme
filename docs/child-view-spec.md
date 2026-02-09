## Child View

The idea behind the project is that it is empowering for the child. This may be as simple as allowing them to see what their strengths and loves are, down to having timeline edit functionality when they are older, to eventually taking ownership at 18 should they wish to and it is appropriate.

**Goal:** Children have their own account to view and contribute to their passport. Parents can switch to child mode for shared device viewing.

### Database

**Modify `users`:**
```
+ role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'CHILD'
```

**Modify `passports`:**
```
+ subject_user_id (nullable, FK to users)
```

**Modify `section_items`:**
```
+ status: 'published' | 'pending_review' (default 'published')
```

**Modify `timeline_entries`:**
```
+ status: 'published' | 'pending_review' (default 'published')
```

### Frontend

- `/passport/[id]` - Detects CHILD role or child mode, renders child-friendly UI
- Child mode toggle in parent view
- Password prompt to exit child mode

### Acceptance Criteria

#### Child Account Setup

- Parent navigates to passport Settings → "Child Access"
- "Create account for [child name]" button
- Form: username, password (parent sets initially)
- Creates user with role=CHILD, links to passport.subject_user_id
- Parent can reset password, deactivate, or delete child account

#### Child Login

- Child logs in with credentials
- System detects role=CHILD
- Redirects to their passport in child-friendly view
- Cannot access other passports or admin features

#### Child Mode (Shared Device)

**Entering child mode:**
- Parent viewing passport sees "Switch to Child View" button
- Single click → UI switches to child-friendly view
- Session flagged as child_mode=true (client-side state)
- No password needed to enter

**While in child mode:**
- Same UI and permissions as logged-in CHILD user
- Child can view and contribute
- No access to settings, sharing, export, or full content

**Exiting child mode:**
- "Exit Child View" button visible (small, corner)
- Click → password prompt appears
- Parent enters their password
- Correct → returns to full parent view
- Wrong → stays in child mode

#### Child View UI

**Reading:**
- Large fonts (18px+), high contrast, rounded corners
- Child's name and avatar prominent
- Sections: LOVES, STRENGTHS (HATES if parent enables)
- NEEDS: Hidden
- Timeline: SUCCESS, MILESTONE, LIKE only
- No professional metadata, remedial suggestions, or documents

**Contributing:**
- "Add something" button on allowed sections
- "Add to my timeline" button
- Simple forms: text input, optional emoji
- Saved with `status: 'pending_review'`
- Child sees pending items with "Waiting for review" badge
- Child can edit/delete their own pending items

#### Parent Approval

- Notification when contributions pending
- Review screen in passport dashboard
- **Approve** → status becomes 'published'
- **Edit & Approve** → modify then publish
- **Reject** → delete item

#### Content Filtering (Server-Side)

CHILD role or child mode:
- See only: LOVES, STRENGTHS, optionally HATES
- See only: SUCCESS, MILESTONE, LIKE timeline entries
- See own pending items
- Cannot see: NEEDS, INCIDENT, BEHAVIOR, NOTE, documents
- Cannot edit/delete published content
- Cannot access settings, sharing, export

#### Ownership Transfer at 18

- Parent initiates in Settings
- Confirmation from both parent and child
- Child's role upgraded to OWNER
- Previous owner becomes EDITOR or is removed
- Child gains full access

### Security

- Standard auth for child accounts
- Child mode: client-side flag, but all filtering enforced server-side
- Contributions in child mode attributed to parent's account with flag
- Password required to exit child mode (prevents child accessing full view)
- HTTPS required

### Out of Scope (v2)

- Token-based access links
- Age-based content adaptation
- Image uploads in contributions
- Access logging

### Deliverable

Children have their own login to view and contribute to their passport. Parents can switch to child mode on shared devices for supervised viewing. Password required to exit child mode. Contributions require parent approval.
