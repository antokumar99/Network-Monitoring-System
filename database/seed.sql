-- Network Monitoring System - seed data
-- Run (after schema.sql):  mysql -u root -p network_monitor < database/seed.sql
-- The sim_id values MUST match the device IDs in device-simulator/src/main.cpp.
-- Re-running is safe: existing sim_ids are left untouched.

USE network_monitor;

INSERT IGNORE INTO devices (sim_id, name, ip_address, type, location, status, created_at) VALUES
  ('R1',   'Core Router',        '10.0.0.1',  'router',       'Data Center - Rack A1', 'unknown', UTC_TIMESTAMP(3)),
  ('R2',   'Edge Router',        '10.0.0.2',  'router',       'Data Center - Rack A2', 'unknown', UTC_TIMESTAMP(3)),
  ('SW1',  'Distribution Switch','10.0.1.1',  'switch',       'Floor 1 - IDF',         'unknown', UTC_TIMESTAMP(3)),
  ('SW2',  'Access Switch',      '10.0.1.2',  'switch',       'Floor 2 - IDF',         'unknown', UTC_TIMESTAMP(3)),
  ('FW1',  'Perimeter Firewall', '10.0.2.1',  'firewall',     'Data Center - Rack B1', 'unknown', UTC_TIMESTAMP(3)),
  ('SRV1', 'Web Server',         '10.0.3.10', 'server',       'Data Center - Rack C1', 'unknown', UTC_TIMESTAMP(3)),
  ('SRV2', 'Database Server',    '10.0.3.20', 'server',       'Data Center - Rack C2', 'unknown', UTC_TIMESTAMP(3)),
  ('AP1',  'Lobby Access Point', '10.0.4.5',  'access_point', 'Floor 1 - Lobby',       'unknown', UTC_TIMESTAMP(3));
