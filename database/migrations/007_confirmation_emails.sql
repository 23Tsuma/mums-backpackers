ALTER TABLE booking_requests
  ADD COLUMN confirmation_email_sent_at DATETIME(3) NULL,
  ADD COLUMN confirmation_email_claimed_at DATETIME(3) NULL,
  ADD COLUMN confirmation_email_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN confirmation_email_last_error VARCHAR(1000) NULL,
  ADD KEY idx_booking_confirmation_email (confirmation_email_sent_at, confirmation_email_attempts);

ALTER TABLE safari_enquiries
  DROP CONSTRAINT chk_safari_enquiry_status,
  ADD CONSTRAINT chk_safari_enquiry_status CHECK (
    status IN ('New', 'Contacted', 'Confirmed', 'Closed')
  ),
  ADD COLUMN confirmation_email_sent_at DATETIME(3) NULL,
  ADD COLUMN confirmation_email_claimed_at DATETIME(3) NULL,
  ADD COLUMN confirmation_email_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN confirmation_email_last_error VARCHAR(1000) NULL,
  ADD KEY idx_safari_confirmation_email (confirmation_email_sent_at, confirmation_email_attempts);

ALTER TABLE vehicle_rental_enquiries
  DROP CONSTRAINT chk_vehicle_rental_status,
  ADD CONSTRAINT chk_vehicle_rental_status CHECK (
    status IN ('New', 'Contacted', 'Confirmed', 'Closed')
  ),
  ADD COLUMN confirmation_email_sent_at DATETIME(3) NULL,
  ADD COLUMN confirmation_email_claimed_at DATETIME(3) NULL,
  ADD COLUMN confirmation_email_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN confirmation_email_last_error VARCHAR(1000) NULL,
  ADD KEY idx_vehicle_confirmation_email (confirmation_email_sent_at, confirmation_email_attempts);
