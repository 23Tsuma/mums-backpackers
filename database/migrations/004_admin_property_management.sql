ALTER TABLE accommodation_units
  MODIFY id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ADD COLUMN description TEXT NOT NULL DEFAULT '',
  ADD COLUMN location VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN bedrooms TINYINT UNSIGNED NOT NULL DEFAULT 1,
  ADD COLUMN bathrooms DECIMAL(3,1) NULL,
  ADD COLUMN child_accommodation_notes TEXT NULL,
  ADD COLUMN max_children TINYINT UNSIGNED NULL,
  ADD COLUMN extra_beds_available TINYINT UNSIGNED NULL,
  ADD COLUMN extra_bed_notes TEXT NULL,
  ADD COLUMN amenities TEXT NULL,
  ADD COLUMN nightly_price DECIMAL(10,2) NULL,
  ADD COLUMN updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  ADD CONSTRAINT chk_unit_bedrooms CHECK (bedrooms <= 20),
  ADD CONSTRAINT chk_unit_bathrooms CHECK (bathrooms IS NULL OR bathrooms <= 20),
  ADD CONSTRAINT chk_unit_max_children CHECK (max_children IS NULL OR max_children <= 20),
  ADD CONSTRAINT chk_unit_extra_beds CHECK (extra_beds_available IS NULL OR extra_beds_available <= 20),
  ADD CONSTRAINT chk_unit_nightly_price CHECK (nightly_price IS NULL OR nightly_price >= 0);

CREATE TABLE IF NOT EXISTS accommodation_unit_images (
  id CHAR(36) NOT NULL,
  unit_id TINYINT UNSIGNED NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  alt_text VARCHAR(180) NOT NULL DEFAULT '',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_unit_image_storage_path (storage_path),
  KEY idx_unit_images_display (unit_id, is_featured, sort_order),
  CONSTRAINT fk_unit_image_unit
    FOREIGN KEY (unit_id) REFERENCES accommodation_units (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
