import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

const Login = ({ onLoginSubmit, error, captchaImage, captchaSessionId }) => {
  const [netId, setNetId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaText, setCaptchaText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset submitting state when we get an error or captcha back
  useEffect(() => {
    if (error || captchaImage) {
      setIsSubmitting(false);
    }
  }, [error, captchaImage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (onLoginSubmit) {
      if (captchaImage && captchaText) {
        // Submitting CAPTCHA solution
        onLoginSubmit({ netId, password, captchaText });
      } else {
        // Normal login
        onLoginSubmit({ netId, password });
      }
    }
  };

  const isCaptchaMode = !!captchaImage;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif",
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: isCaptchaMode ? '420px' : '340px',
          backgroundColor: '#3a3a3a',
          borderRadius: '28px',
          padding: '40px 32px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* Logo Circle */}
        <svg
          width="80"
          height="96"
          viewBox="0 0 100 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginBottom: '10px', flexShrink: 0 }}
        >
          <path
            d="M50 6 C24 6, 7 30, 7 60 C7 88, 26 114, 50 114 C74 114, 93 88, 93 60 C93 30, 76 6, 50 6 Z"
            fill="black"
            stroke="white"
            strokeWidth="3.5"
          />
          <line x1="7" y1="72" x2="93" y2="72" stroke="white" strokeWidth="2.5" />
          <line x1="50" y1="72" x2="50" y2="82" stroke="white" strokeWidth="2.5" />
          <text x="17" y="65" fill="white" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">20</text>
          <text x="38" y="65" fill="white" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">25</text>
          <text x="62" y="65" fill="white" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">0</text>
          <text x="83" y="65" fill="white" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">5</text>
          <line x1="17" y1="67" x2="17" y2="72" stroke="white" strokeWidth="2" />
          <line x1="38" y1="67" x2="38" y2="72" stroke="white" strokeWidth="2" />
          <line x1="62" y1="67" x2="62" y2="72" stroke="white" strokeWidth="2" />
          <line x1="83" y1="67" x2="83" y2="72" stroke="white" strokeWidth="2" />
          <text x="50" y="99" fill="#e2e2e2" fontSize="10" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">Do-More</text>
        </svg>

        {/* Heading */}
        <h1
          style={{
            color: '#ffffff',
            fontSize: '22px',
            fontWeight: '400',
            letterSpacing: '0.02em',
            margin: '0 0 6px',
            textAlign: 'center',
          }}
        >
          {isCaptchaMode ? 'Verify CAPTCHA' : 'Welcome Back'}
        </h1>

        {/* Sub-heading */}
        <p
          style={{
            color: '#8e8e8e',
            fontSize: '14px',
            margin: '0 0 20px',
            textAlign: 'center',
          }}
        >
          {isCaptchaMode
            ? 'SRM requires CAPTCHA verification. Please solve it below.'
            : 'Sign in to DoMore.....'}
        </p>

        {/* Error message */}
        {error && (
          <div
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertCircle
              size={18}
              strokeWidth={1.8}
              style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }}
            />
            <p
              style={{
                color: '#fca5a5',
                fontSize: '13px',
                margin: 0,
                lineHeight: '1.4',
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* NetID Input — hidden during CAPTCHA mode */}
          {!isCaptchaMode && (
            <>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  height: '52px',
                  backgroundColor: '#252525',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: '14px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                <div
                  style={{
                    paddingLeft: '14px',
                    paddingRight: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#6e6e6e',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={18} strokeWidth={1.5} />
                </div>
                <input
                  id="login-netid"
                  type="text"
                  placeholder="NetID / Email"
                  value={netId}
                  onChange={(e) => setNetId(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e2e2',
                    fontSize: '15px',
                    paddingRight: '14px',
                  }}
                />
              </div>

              {/* Password Input */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  height: '52px',
                  backgroundColor: '#252525',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: '20px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                <div
                  style={{
                    paddingLeft: '14px',
                    paddingRight: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#6e6e6e',
                    flexShrink: 0,
                  }}
                >
                  <Lock size={18} strokeWidth={1.5} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Academia Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e2e2',
                    fontSize: '15px',
                    paddingRight: '4px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    paddingLeft: '10px',
                    paddingRight: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6e6e6e',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#a0a0a0')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6e6e6e')}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.5} />
                  ) : (
                    <Eye size={18} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── CAPTCHA Section ─────────────────────────────────────── */}
          {isCaptchaMode && (
            <div style={{ marginBottom: '20px' }}>
              {/* CAPTCHA row: input on left, image on right */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  width: '100%',
                }}
              >
                {/* CAPTCHA text input */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    height: '52px',
                    backgroundColor: '#252525',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div
                    style={{
                      paddingLeft: '14px',
                      paddingRight: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#6e6e6e',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={18} strokeWidth={1.5} />
                  </div>
                  <input
                    id="login-captcha"
                    type="text"
                    placeholder="Enter CAPTCHA"
                    value={captchaText}
                    onChange={(e) => setCaptchaText(e.target.value)}
                    required
                    autoFocus
                    autoComplete="off"
                    style={{
                      flex: 1,
                      height: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#e2e2e2',
                      fontSize: '15px',
                      letterSpacing: '0.15em',
                      fontWeight: '600',
                      paddingRight: '14px',
                    }}
                  />
                </div>

                {/* CAPTCHA image */}
                <div
                  style={{
                    flexShrink: 0,
                    width: '140px',
                    height: '52px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={`data:image/png;base64,${captchaImage}`}
                    alt="CAPTCHA"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </div>

              <p
                style={{
                  color: '#6e6e6e',
                  fontSize: '11px',
                  margin: '8px 0 0 2px',
                  letterSpacing: '0.01em',
                }}
              >
                Type the text shown in the image above
              </p>
            </div>
          )}

          {/* Sign In / Submit Button */}
          <button
            id="login-submit"
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              height: '50px',
              backgroundColor: isSubmitting ? '#666' : '#ffffff',
              color: isSubmitting ? '#ccc' : '#000000',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '999px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
              transition: 'background-color 0.2s, transform 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#e0e0e0'
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#ffffff'
            }}
            onMouseDown={(e) => {
              if (!isSubmitting) e.currentTarget.style.transform = 'scale(0.98)'
            }}
            onMouseUp={(e) => {
              if (!isSubmitting) e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {isSubmitting && (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            )}
            {isCaptchaMode ? 'Verify & Sign In' : 'Sign In'}
          </button>
        </form>

        {/* Spinner animation keyframes */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Login;
