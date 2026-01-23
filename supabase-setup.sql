-- Railway Police Data Entry Portal - Database Setup Script
-- Run this script in your Supabase SQL Editor

-- MASTER TABLES
CREATE TABLE states (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO states (name, code) VALUES 
('Delhi','DL'),('Uttar Pradesh','UP'),('Maharashtra','MH'),('West Bengal','WB'),
('Bihar','BR'),('Rajasthan','RJ'),('Madhya Pradesh','MP'),('Tamil Nadu','TN'),
('Karnataka','KA'),('Gujarat','GJ');

CREATE TABLE districts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state_id BIGINT REFERENCES states(id),
    code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, state_id)
);

INSERT INTO districts (name, state_id, code) VALUES 
('New Delhi',1,'NDL'),('Central Delhi',1,'CDL'),('Mumbai',3,'MUM'),
('Pune',3,'PUN'),('Kolkata',4,'KOL'),('Lucknow',2,'LKO');

CREATE TABLE railway_districts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO railway_districts (name, code) VALUES 
('East','EAST'),('West','WEST'),('North','NRTH'),('South','SUTH'),('Central','CENT');

CREATE TABLE police_stations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    railway_district_id BIGINT REFERENCES railway_districts(id),
    district_id BIGINT REFERENCES districts(id),
    state_id BIGINT REFERENCES states(id),
    address TEXT,
    contact_number VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO police_stations (name, code, railway_district_id, district_id, state_id) VALUES 
('Railway PS East Zone 1','RPS-E1',1,1,1),
('Railway PS West Zone 1','RPS-W1',2,3,3),
('Railway PS North Zone 1','RPS-N1',3,6,2);

CREATE TABLE modus_operandi (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO modus_operandi (name, description) VALUES 
('Theft','Property theft'),('Robbery','Forceful taking'),('Assault','Physical attack'),
('Pickpocketing','Pocket theft'),('Chain Snatching','Jewelry snatching'),
('Fraud','Cheating'),('Trespass','Unauthorized entry'),('Vandalism','Property damage');

CREATE TABLE law_sections (
    id BIGSERIAL PRIMARY KEY,
    section_code VARCHAR(50) NOT NULL UNIQUE,
    law_type VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO law_sections (section_code, law_type, description) VALUES 
('BNS-302','BNS','Murder'),('BNS-307','BNS','Attempt to murder'),
('BNS-323','BNS','Voluntarily causing hurt'),('BNS-379','BNS','Theft'),
('BNS-392','BNS','Robbery'),('BNS-420','BNS','Cheating'),
('CRPC-107','CRPC','Security for peace'),('CRPC-151','CRPC','Arrest to prevent offence');

CREATE TABLE trains (
    id BIGSERIAL PRIMARY KEY,
    train_number VARCHAR(10) NOT NULL UNIQUE,
    train_name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO trains (train_number, train_name) VALUES 
('12301','Rajdhani Express'),('12302','Kolkata Rajdhani'),
('12951','Mumbai Rajdhani'),('12429','Lucknow Rajdhani');

CREATE TABLE railway_stations (
    id BIGSERIAL PRIMARY KEY,
    station_code VARCHAR(10) NOT NULL UNIQUE,
    station_name VARCHAR(200) NOT NULL,
    district_id BIGINT REFERENCES districts(id),
    state_id BIGINT REFERENCES states(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO railway_stations (station_code, station_name, district_id, state_id) VALUES 
('NDLS','New Delhi Railway Station',1,1),
('BCT','Mumbai Central',3,3),
('LKO','Lucknow Junction',6,2);

CREATE TABLE courts (
    id BIGSERIAL PRIMARY KEY,
    court_name VARCHAR(200) NOT NULL,
    court_type VARCHAR(50),
    district_id BIGINT REFERENCES districts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO courts (court_name, court_type, district_id) VALUES 
('District Court New Delhi','District Court',1),
('District Court Mumbai','District Court',3);

-- USER TABLES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin','district_admin','station_officer','data_operator','viewer')),
    police_station_id BIGINT REFERENCES police_stations(id),
    railway_district_id BIGINT REFERENCES railway_districts(id),
    is_active BOOLEAN DEFAULT true,
    is_first_login BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTION TABLES
CREATE TABLE fir_records (
    id BIGSERIAL PRIMARY KEY,
    fir_number VARCHAR(50) NOT NULL,
    police_station_id BIGINT REFERENCES police_stations(id) NOT NULL,
    railway_district_id BIGINT REFERENCES railway_districts(id) NOT NULL,
    incident_date DATE NOT NULL,
    incident_time TIME NOT NULL,
    train_id BIGINT REFERENCES trains(id),
    train_number_manual VARCHAR(50),
    train_name_manual VARCHAR(200),
    station_id BIGINT REFERENCES railway_stations(id),
    station_name_manual VARCHAR(200),
    modus_operandi_id BIGINT REFERENCES modus_operandi(id) NOT NULL,
    brief_description TEXT NOT NULL,
    detailed_description TEXT,
    law_sections JSONB,
    law_sections_text TEXT,
    property_stolen TEXT,
    estimated_value DECIMAL(12,2),
    case_status VARCHAR(50) DEFAULT 'registered' CHECK (case_status IN ('registered','under_investigation','chargesheet_filed','closed')),
    created_by UUID REFERENCES users(id) NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fir_number, police_station_id)
);

CREATE TABLE accused_persons (
    id BIGSERIAL PRIMARY KEY,
    fir_id BIGINT REFERENCES fir_records(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    alias_name VARCHAR(200),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male','Female','Other')),
    age INTEGER NOT NULL CHECK (age > 0 AND age <= 120),
    date_of_birth DATE,
    is_minor BOOLEAN GENERATED ALWAYS AS (age < 18) STORED,
    mobile_number VARCHAR(15),
    email VARCHAR(100),
    father_name VARCHAR(200),
    mother_name VARCHAR(200),
    parentage TEXT,
    current_address TEXT NOT NULL,
    permanent_address TEXT,
    police_station_id BIGINT REFERENCES police_stations(id),
    district_id BIGINT REFERENCES districts(id),
    state_id BIGINT REFERENCES states(id),
    pincode VARCHAR(10),
    aadhar_number VARCHAR(12),
    pan_number VARCHAR(10),
    photo_url TEXT,
    identification_marks TEXT,
    previous_cases INTEGER DEFAULT 0,
    previous_convictions INTEGER DEFAULT 0,
    is_habitual_offender BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bail_details (
    id BIGSERIAL PRIMARY KEY,
    accused_id BIGINT REFERENCES accused_persons(id) ON DELETE CASCADE NOT NULL,
    fir_id BIGINT REFERENCES fir_records(id) NOT NULL,
    custody_status VARCHAR(20) NOT NULL CHECK (custody_status IN ('bail','custody','absconding')),
    court_id BIGINT REFERENCES courts(id),
    court_name_manual VARCHAR(200),
    bail_order_number VARCHAR(100),
    bail_date DATE,
    bail_amount DECIMAL(12,2),
    bailer_name VARCHAR(200),
    bailer_relation VARCHAR(100),
    bailer_parentage TEXT,
    bailer_address TEXT,
    bailer_state VARCHAR(100),
    bailer_district VARCHAR(100),
    bailer_gender VARCHAR(10),
    bailer_age INTEGER,
    bailer_mobile VARCHAR(15),
    bail_conditions TEXT,
    next_hearing_date DATE,
    custody_location VARCHAR(200),
    custody_from_date DATE,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VIEW')),
    table_name VARCHAR(100),
    record_id BIGINT,
    changes_summary TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_fir_station ON fir_records(police_station_id);
CREATE INDEX idx_fir_date ON fir_records(incident_date);
CREATE INDEX idx_accused_fir ON accused_persons(fir_id);
CREATE INDEX idx_bail_accused ON bail_details(accused_id);

-- ROW LEVEL SECURITY
ALTER TABLE fir_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE accused_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bail_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "station_fir_select" ON fir_records FOR SELECT USING (
    police_station_id IN (SELECT police_station_id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "station_fir_insert" ON fir_records FOR INSERT WITH CHECK (
    police_station_id IN (SELECT police_station_id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "station_accused_select" ON accused_persons FOR SELECT USING (
    fir_id IN (SELECT id FROM fir_records WHERE police_station_id IN (
        SELECT police_station_id FROM users WHERE auth_id = auth.uid()
    ))
);

CREATE POLICY "station_accused_insert" ON accused_persons FOR INSERT WITH CHECK (
    fir_id IN (SELECT id FROM fir_records WHERE police_station_id IN (
        SELECT police_station_id FROM users WHERE auth_id = auth.uid()
    ))
);

CREATE POLICY "station_bail_select" ON bail_details FOR SELECT USING (
    fir_id IN (SELECT id FROM fir_records WHERE police_station_id IN (
        SELECT police_station_id FROM users WHERE auth_id = auth.uid()
    ))
);

CREATE POLICY "station_bail_insert" ON bail_details FOR INSERT WITH CHECK (
    fir_id IN (SELECT id FROM fir_records WHERE police_station_id IN (
        SELECT police_station_id FROM users WHERE auth_id = auth.uid()
    ))
);

-- AUTO UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER fir_updated_at BEFORE UPDATE ON fir_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- NOTE: After creating a user in Supabase Auth (officer1@railpolice.in / Officer@123),
-- run this to link the user:
-- INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)
-- SELECT id, 'EMP001', 'officer1@railpolice.in', '9876543210', 'Officer Rajesh Kumar', 'SHO', 'station_officer', 1, 1, false
-- FROM auth.users WHERE email = 'officer1@railpolice.in';

