# Booking database

The local development database uses XAMPP MariaDB and `utf8mb4`. The current workspace has already created `mumsbackpackers_db`, configured the ignored root `.env.local`, and applied both migrations.

## Set up another environment

1. Start MySQL in the XAMPP Control Panel.
2. In phpMyAdmin, create `mumsbackpackers_db` with `utf8mb4_unicode_ci`.
3. Import [001_create_booking_requests.sql](./migrations/001_create_booking_requests.sql), [002_apartment_inventory.sql](./migrations/002_apartment_inventory.sql), [003_admin_authentication.sql](./migrations/003_admin_authentication.sql), and [004_admin_property_management.sql](./migrations/004_admin_property_management.sql), in order. Apply each migration once.
4. Configure the `DB_*` values from `.env.example` in `.env.local`. Keep credentials out of source control. For hosting, use that environment's connection details and TLS settings instead of the local values.

`002_apartment_inventory.sql` creates the two apartment units, adds adult/child/extra-bed fields to `booking_requests`, and installs database triggers for confirmation rules. Pending requests do not hold availability; only confirmed bookings block the selected apartment for overlapping dates.

## Reviewing requests in phpMyAdmin

Requests with children start with `children_approval_status = 'Pending'`. Approve the child sleeping arrangement before confirming:

```sql
UPDATE booking_requests
SET children_approval_status = 'Approved',
    status = 'Confirmed'
WHERE reference = 'MB-REFERENCE-HERE';
```

For a request without children, update only `status` to `Confirmed`. The database rejects confirmations that overlap an existing confirmed booking for the same apartment, or that have unapproved child arrangements. Other supported statuses are `Declined`, `Cancelled`, and `Completed`.

Email send attempts and retry state are stored on `booking_requests`. There is no payment table because the current booking flow does not collect payments; add payment storage only when a payment workflow is selected.

## Admin authentication

The admin dashboard uses `admin_users` and `admin_sessions`. Apply migration 003 before using `/admin/setup`. Set a unique, randomly generated `ADMIN_SETUP_TOKEN` of at least 32 characters in the ignored `.env.local` file. Use it once to create the initial administrator; public admin registration is not available. After setup, remove `ADMIN_SETUP_TOKEN` from `.env.local` and restart the server. Passwords are stored as scrypt hashes, and session tokens are stored only as SHA-256 hashes. The setup endpoint rejects further account creation once an administrator exists.

## Admin property management

Apply migration 004 once after migration 003. It extends `accommodation_units` (the same inventory used by availability and bookings) and adds a separate `accommodation_unit_images` table. Existing apartment records and booking history are preserved. Admins can deactivate a property instead of deleting a unit referenced by past bookings. Standard adult occupancy remains two, matching the existing database constraint and booking validation; child and additional-bed limits remain unset until the administrator configures them.

Property images are validated and converted to optimized WebP on the server. Local development stores image files in the ignored `.property-images` directory. For deployment, configure `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` as server environment variables; the service-role key must never use a `NEXT_PUBLIC_` prefix. The server creates or uses a `property-images` Supabase Storage bucket, and image uploads are routed through authenticated admin APIs.
