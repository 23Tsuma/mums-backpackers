CREATE TABLE IF NOT EXISTS safari_enquiries (
  id CHAR(36) NOT NULL,
  lead_explorer VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  destination VARCHAR(120) NOT NULL,
  target_date DATE NOT NULL,
  travelers TINYINT UNSIGNED NOT NULL,
  duration VARCHAR(40) NOT NULL,
  custom_extension VARCHAR(500) NOT NULL DEFAULT '',
  diani_accommodation VARCHAR(500) NOT NULL DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'New',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_safari_enquiry_email (email),
  KEY idx_safari_enquiry_date (target_date, status),
  CONSTRAINT chk_safari_enquiry_travelers CHECK (travelers BETWEEN 1 AND 20),
  CONSTRAINT chk_safari_enquiry_duration CHECK (
    duration IN ('1-Day Excursion', '2 Days, 1 Night', '3 Days, 2 Nights', 'Custom Extension')
  ),
  CONSTRAINT chk_safari_enquiry_status CHECK (status IN ('New', 'Contacted', 'Confirmed', 'Closed'))
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
