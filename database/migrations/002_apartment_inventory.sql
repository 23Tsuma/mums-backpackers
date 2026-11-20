CREATE TABLE IF NOT EXISTS accommodation_units (
  id TINYINT UNSIGNED NOT NULL,
  unit_code VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  accommodation_type VARCHAR(120) NOT NULL,
  adult_capacity TINYINT UNSIGNED NOT NULL DEFAULT 2,
  has_sitting_room BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accommodation_unit_code (unit_code),
  CONSTRAINT chk_apartment_adult_capacity CHECK (adult_capacity = 2)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO accommodation_units (
  id, unit_code, name, accommodation_type, adult_capacity, has_sitting_room
) VALUES
  (1, 'APT-1', 'One-bedroom apartment 1', 'One-bedroom apartment', 2, TRUE),
  (2, 'APT-2', 'One-bedroom apartment 2', 'One-bedroom apartment', 2, TRUE);

ALTER TABLE booking_requests
  MODIFY guests VARCHAR(80) NOT NULL,
  DROP CONSTRAINT chk_booking_guests,
  ADD COLUMN unit_id TINYINT UNSIGNED NULL AFTER idempotency_key,
  ADD COLUMN adults TINYINT UNSIGNED NULL AFTER guests,
  ADD COLUMN children TINYINT UNSIGNED NULL AFTER adults,
  ADD COLUMN extra_beds_requested TINYINT UNSIGNED NULL AFTER children,
  ADD COLUMN children_approval_status VARCHAR(20) NULL AFTER extra_beds_requested,
  ADD KEY idx_booking_unit_availability (unit_id, status, checkin, checkout),
  ADD CONSTRAINT fk_booking_accommodation_unit
    FOREIGN KEY (unit_id) REFERENCES accommodation_units (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT chk_booking_adults CHECK (adults IS NULL OR adults BETWEEN 1 AND 2),
  ADD CONSTRAINT chk_booking_children CHECK (children IS NULL OR children BETWEEN 0 AND 3),
  ADD CONSTRAINT chk_booking_extra_beds CHECK (extra_beds_requested IS NULL OR extra_beds_requested BETWEEN 0 AND 3),
  ADD CONSTRAINT chk_booking_children_approval CHECK (
    children IS NULL
    OR (children = 0 AND children_approval_status = 'Not Required')
    OR (children > 0 AND children_approval_status IN ('Pending', 'Approved', 'Declined'))
  );

DROP TRIGGER IF EXISTS trg_booking_confirm_insert;
DROP TRIGGER IF EXISTS trg_booking_confirm_update;

DELIMITER $$
CREATE TRIGGER trg_booking_confirm_insert
BEFORE INSERT ON booking_requests
FOR EACH ROW
BEGIN
  DECLARE locked_unit TINYINT UNSIGNED DEFAULT NULL;
  DECLARE overlap_count INT DEFAULT 0;

  IF NEW.status = 'Confirmed' THEN
    IF NEW.unit_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assign an apartment before confirming a booking.';
    END IF;
    IF NEW.children > 0 AND COALESCE(NEW.children_approval_status, '') <> 'Approved' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Approve the child sleeping request before confirming.';
    END IF;

    SELECT id INTO locked_unit
    FROM accommodation_units
    WHERE id = NEW.unit_id
    FOR UPDATE;

    SELECT COUNT(*) INTO overlap_count
    FROM booking_requests AS other_booking
    WHERE other_booking.unit_id = NEW.unit_id
      AND other_booking.status = 'Confirmed'
      AND other_booking.checkin < NEW.checkout
      AND other_booking.checkout > NEW.checkin;

    IF overlap_count > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Apartment is already confirmed for overlapping dates.';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_booking_confirm_update
BEFORE UPDATE ON booking_requests
FOR EACH ROW
BEGIN
  DECLARE locked_unit TINYINT UNSIGNED DEFAULT NULL;
  DECLARE overlap_count INT DEFAULT 0;

  IF NEW.status = 'Confirmed' THEN
    IF NEW.unit_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assign an apartment before confirming a booking.';
    END IF;
    IF NEW.children > 0 AND COALESCE(NEW.children_approval_status, '') <> 'Approved' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Approve the child sleeping request before confirming.';
    END IF;

    SELECT id INTO locked_unit
    FROM accommodation_units
    WHERE id = NEW.unit_id
    FOR UPDATE;

    SELECT COUNT(*) INTO overlap_count
    FROM booking_requests AS other_booking
    WHERE other_booking.unit_id = NEW.unit_id
      AND other_booking.status = 'Confirmed'
      AND other_booking.id <> NEW.id
      AND other_booking.checkin < NEW.checkout
      AND other_booking.checkout > NEW.checkin;

    IF overlap_count > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Apartment is already confirmed for overlapping dates.';
    END IF;
  END IF;
END$$
DELIMITER ;
