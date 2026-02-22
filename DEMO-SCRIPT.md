# UNILAG Queue Management System — Demo Script

Use this script to walk through the system.

---

## Part 1: Medical Center session (OPEN queue, priority)

**Goal:** Show a department admin creating a session, students joining, live queue, and waitlist promotion.

### 1.1 Admin: Create and open session

1. Log in as **Medical Center Admin**
   - Email: `medical@unilag.edu.ng`
   - Password: `DeptAdmin123!`
2. Go to **Dashboard** → **Create session**.
3. Create a session:
   - Title: e.g. **Morning Consultation**
   - Department: **Medical Center**
   - Date: **today**
   - Start time: e.g. **09:00**
   - Capacity: **5** (small for demo)
   - Slot duration: **15** min
   - Visibility: **OPEN**
   - Priority enabled: **Yes**
4. Save → you are on the session detail page.
5. Click **Open session** (state goes DRAFT → OPEN).
6. Click **Start serving** (state goes OPEN → ACTIVE).

### 1.2 Students: Join queue

7. Open an **incognito/private** window (or another browser). Log in as a student, e.g.:
   - Email: `student1@unilag.edu.ng` / Password: `Student123!`
8. On the **student dashboard**, under **Join a queue**, you should see **Morning Consultation**.
9. Click **Join queue** → confirm → note **queue number** and estimated time.
10. Repeat with 2–3 more students (e.g. `student2@unilag.edu.ng`, …) so several are in the queue.
11. Join with a **5th** student so the queue is full. Join with a **6th** student → they go to the **waitlist** (message shows waitlist position).

### 1.3 Admin: Live queue (Call next, Skip)

12. In the **admin** window, open the same session and go to **Live session** (or use the link from the session detail).
13. Show **Now serving** and the queue list.
14. Click **Call next** → current serving advances; students see live updates (if they have the queue status page open).
15. Optionally **Skip** one student → they are marked no-show; the **first waitlisted** student is promoted and gets a slot (they get a notification / can see updated queue status).

### 1.4 Wrap Medical Center

16. Briefly show **Session detail** (queue list, state, actions).
17. Optionally **End session** when done, or leave ACTIVE for the next part.

---

## Part 2: Lecturer Office Hours (RESTRICTED)

**Goal:** Show that only students in the lecturer’s course see the session.

### 2.1 Lecturer: Create office hours

18. Log out from the admin account. Log in as **Lecturer**:
   - Email: `lecturer@unilag.edu.ng`
   - Password: `Lecturer123!`
19. **Dashboard** → **Create session**.
20. Create a session:
   - Title: e.g. **CS Office Hours**
   - Department: **Computer Science** (lecturer only sees their department)
   - Date: **today**
   - Start time: e.g. **14:00**
   - Capacity: **10**
   - Slot duration: **15** min
   - Visibility: **RESTRICTED**
21. Save → **Open session** → **Start serving** (or leave OPEN so students can join).

### 2.2 Student in same course: Sees session

22. In the student window, log in as **Student One** (Computer Science):
   - Email: `student1@unilag.edu.ng` / Password: `Student123!`
23. On the dashboard, **Join a queue** should list **CS Office Hours** (and any OPEN sessions).
24. Join the queue → get queue number and time.

### 2.3 Student in different course: Does not see session

25. Log out the student. Log in as a student from another department, e.g. **Student Three** (Law):
   - Email: `student3@unilag.edu.ng` / Password: `Student123!`
26. On the dashboard, **CS Office Hours** should **not** appear in the session list (RESTRICTED + department filter).
27. Only OPEN sessions (e.g. Medical Center if still open) and any RESTRICTED session for **Law** would appear.

### 2.4 Lecturer: Manage session

28. In the lecturer window, open **CS Office Hours** → **Live session**.
29. Show **Call next** / **Mark as done** (same behaviour as Medical Center; no priority for office hours).

---

## Part 3: Quick recap

30. **Superadmin** (optional): Log in as `superadmin@unilag.edu.ng` / `SuperAdmin123!` → show **Platform** (departments, courses, create admin/lecturer). Mention that lecturers are tied to a **course**; students in that course see their restricted sessions.
31. Summarise:
   - **Medical Center**: OPEN, campus-wide, with priority and waitlist.
   - **Lecturer Office Hours**: RESTRICTED, only students in the lecturer’s course see and join.
   - **Queue flow**: Join → slot or waitlist → live updates → Call next / Skip → waitlist promotion when someone is skipped or no-show.

---

## Credentials quick reference

| Role              | Email                     | Password      |
|-------------------|---------------------------|---------------|
| Superadmin        | superadmin@unilag.edu.ng  | SuperAdmin123! |
| Medical Center Admin | medical@unilag.edu.ng  | DeptAdmin123! |
| CITS Admin        | cits@unilag.edu.ng       | DeptAdmin123! |
| Lecturer          | lecturer@unilag.edu.ng   | Lecturer123!  |
| Student (CS)      | student1@unilag.edu.ng   | Student123!   |
| Student (Law)     | student3@unilag.edu.ng   | Student123!   |

---

*End of demo script*
