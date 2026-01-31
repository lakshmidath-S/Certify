-- CERTIFY Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'ISSUER', 'OWNER', 'VERIFIER')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blockchain_network VARCHAR(50) DEFAULT 'base-sepolia',
    is_active BOOLEAN DEFAULT true,
    mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mapped_tx_hash VARCHAR(66),
    revoked_at TIMESTAMP,
    revoked_tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallets_address ON wallets(wallet_address);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_active ON wallets(is_active);

-- Certificates table
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_hash VARCHAR(64) UNIQUE NOT NULL,
    certificate_number VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255),
    course_name VARCHAR(255) NOT NULL,
    course_duration VARCHAR(100),
    grade VARCHAR(20),
    issue_date DATE NOT NULL,
    expiry_date DATE,
    issuer_id UUID NOT NULL REFERENCES users(id),
    owner_id UUID NOT NULL REFERENCES users(id),
    issuer_wallet_id UUID REFERENCES wallets(id),
    blockchain_tx_hash VARCHAR(66),
    blockchain_timestamp TIMESTAMP,
    nonce UUID NOT NULL,
    timestamp BIGINT NOT NULL,
    additional_info JSONB,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(id),
    revocation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificates_hash ON certificates(certificate_hash);
CREATE INDEX idx_certificates_issuer ON certificates(issuer_id);
CREATE INDEX idx_certificates_owner ON certificates(owner_id);
CREATE INDEX idx_certificates_number ON certificates(certificate_number);
CREATE INDEX idx_certificates_revoked ON certificates(is_revoked);
CREATE INDEX idx_certificates_issue_date ON certificates(issue_date);

-- Certificate files table
CREATE TABLE certificate_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('PDF', 'QR')),
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cert_files_cert_id ON certificate_files(certificate_id);
CREATE INDEX idx_cert_files_type ON certificate_files(file_type);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    result VARCHAR(20) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE')),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Revocations table
CREATE TABLE revocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revocation_type VARCHAR(20) NOT NULL CHECK (revocation_type IN ('WALLET', 'CERTIFICATE')),
    wallet_id UUID REFERENCES wallets(id),
    certificate_id UUID REFERENCES certificates(id),
    revoked_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    blockchain_tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_revocations_type ON revocations(revocation_type);
CREATE INDEX idx_revocations_wallet ON revocations(wallet_id);
CREATE INDEX idx_revocations_cert ON revocations(certificate_id);

-- Row Level Security for certificates (owner isolation)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_isolation ON certificates
    FOR SELECT
    USING (owner_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY issuer_view ON certificates
    FOR SELECT
    USING (issuer_id = current_setting('app.current_user_id')::UUID);

-- Insert default admin user (password: Admin@123)
INSERT INTO users (email, password_hash, role, first_name, last_name)
VALUES (
    'admin@certify.com',
    '$2b$10$rQZ9vXK8xKxK5Y5Y5Y5Y5uO5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y',
    'ADMIN',
    'System',
    'Administrator'
);
