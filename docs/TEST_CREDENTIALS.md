# Development test accounts

Do not commit or document real passwords in this repository.

For local testing, create accounts through `/register` or provision dedicated test users directly in your development database. Public registration creates Student accounts; Instructor/Admin access must be assigned through the admin user-management flow.

Recommended authorization checks:

- Student: can access only published courses and courses with completed enrollment.
- Instructor: can manage only courses they own.
- Admin: can manage platform-wide resources.
- Disabled users: cannot authenticate or continue using protected sessions.
- Paid-course users with PENDING/FAILED/CANCELLED payment: cannot access protected learning content.
