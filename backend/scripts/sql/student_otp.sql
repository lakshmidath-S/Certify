-- Student OTP verification table
CREATE TABLE IF NOT EXISTS student_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_otp_email ON student_otp(email);
CREATE INDEX idx_student_otp_expires ON student_otp(expires_at);
