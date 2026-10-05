CREATE DATABASE IF NOT EXISTS network_monitor
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE network_monitor;

-- ---------------------------------------------------------------
-- devices: the network devices we monitor
-- sim_id is the ID the C++ simulator knows the device by (R1, SW1 ...)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sim_id      VARCHAR(32)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  ip_address  VARCHAR(45)  NOT NULL,
  type        ENUM('router','switch','firewall','server','access_point')
              NOT NULL DEFAULT 'router',
  location    VARCHAR(100) NULL,
  status      ENUM('online','offline','unknown') NOT NULL DEFAULT 'unknown',
  last_seen   DATETIME(3)  NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_devices_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- metrics: one row per device per poll
-- bandwidth in Mbps, latency in ms, temperature in Celsius
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metrics (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id      INT          NOT NULL,
  cpu            DECIMAL(6,2) NOT NULL,
  memory         DECIMAL(6,2) NOT NULL,
  bandwidth_in   DECIMAL(10,2) NOT NULL,
  bandwidth_out  DECIMAL(10,2) NOT NULL,
  latency        DECIMAL(8,2) NOT NULL,
  packet_loss    DECIMAL(6,2) NOT NULL,
  temperature    DECIMAL(6,2) NOT NULL,
  recorded_at    DATETIME(3)  NOT NULL,
  INDEX idx_metrics_device_time (device_id, recorded_at),
  CONSTRAINT fk_metrics_device
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- alerts: raised when a threshold is crossed or a device goes offline.
-- resolved_at stays NULL while the alert is still open.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id    INT          NOT NULL,
  type         VARCHAR(40)  NOT NULL,
  severity     ENUM('warning','critical') NOT NULL,
  message      VARCHAR(255) NOT NULL,
  created_at   DATETIME(3)  NOT NULL,
  resolved_at  DATETIME(3)  NULL,
  INDEX idx_alerts_open (device_id, type, resolved_at),
  INDEX idx_alerts_created (created_at),
  CONSTRAINT fk_alerts_device
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;
