CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','staff','admin') DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lost_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  category VARCHAR(50),
  item_name VARCHAR(100),
  color VARCHAR(50),
  brand VARCHAR(50),
  location VARCHAR(150),
  date_time DATETIME,
  description TEXT,
  image_url VARCHAR(255),
  status ENUM('Posted','Matched','Verified','Returned','Removed') DEFAULT 'Posted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE found_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  category VARCHAR(50),
  item_name VARCHAR(100),
  color VARCHAR(50),
  brand VARCHAR(50),
  location VARCHAR(150),
  date_time DATETIME,
  description TEXT,
  image_url VARCHAR(255),
  private_verification_detail TEXT,
  status ENUM('Posted','Matched','Verified','Returned','Removed') DEFAULT 'Posted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lost_item_id INT NOT NULL,
  found_item_id INT NOT NULL,
  match_score INT,
  status ENUM('Suggested','Claimed','Dismissed') DEFAULT 'Suggested',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lost_item_id) REFERENCES lost_items(id),
  FOREIGN KEY (found_item_id) REFERENCES found_items(id)
);

CREATE TABLE claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT,
  found_item_id INT NOT NULL,
  claimant_id INT NOT NULL,
  proof_text TEXT,
  status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  rejection_reason TEXT,
  reviewed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (found_item_id) REFERENCES found_items(id),
  FOREIGN KEY (claimant_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('Match','ClaimSubmitted','ClaimApproved','ClaimRejected','ItemReturned'),
  message VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  item_type ENUM('Lost','Found') NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  actor_id INT,
  actor_role VARCHAR(20),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);