CREATE TABLE IF NOT EXISTS vehicle_rental_enquiries (
  id CHAR(36) NOT NULL,
  vehicle VARCHAR(120) NOT NULL,
  client_name VARCHAR(120) NOT NULL,
  telephone VARCHAR(40) NOT NULL,
  email VARCHAR(254) NOT NULL,
  pickup_date DATE NOT NULL,
  duration_days TINYINT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'New',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_vehicle_rental_enquiry_email (email),
  KEY idx_vehicle_rental_enquiry_date (pickup_date, status),
  CONSTRAINT chk_vehicle_rental_duration CHECK (duration_days BETWEEN 1 AND 90),
  CONSTRAINT chk_vehicle_rental_status CHECK (status IN ('New', 'Contacted', 'Confirmed', 'Closed'))
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
