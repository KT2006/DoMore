import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const Login = ({ onLoginSubmit }) => {
  const [netId, setNetId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLoginSubmit) {
      onLoginSubmit({ netId, password });
    }
  };

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
          maxWidth: '340px',
          backgroundColor: '#3a3a3a',
          borderRadius: '28px',
          padding: '40px 32px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Logo Circle */}
        {/* Do-More egg-timer logo */}
        <svg
          width="80"
          height="96"
          viewBox="0 0 100 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginBottom: '10px', flexShrink: 0 }}
        >
          {/* Egg / timer outer shape — black fill, white stroke */}
          <path
            d="M50 6 C24 6, 7 30, 7 60 C7 88, 26 114, 50 114 C74 114, 93 88, 93 60 C93 30, 76 6, 50 6 Z"
            fill="black"
            stroke="white"
            strokeWidth="3.5"
          />

          {/* Horizontal divider line */}
          <line x1="7" y1="72" x2="93" y2="72" stroke="white" strokeWidth="2.5" />

          {/* Center tick dropping from divider */}
          <line x1="50" y1="72" x2="50" y2="82" stroke="white" strokeWidth="2.5" />

          {/* Timer scale numbers — evenly spaced (4 equal segments across dial) */}
          <text x="17" y="65" fill="white" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">20</text>
          <text x="38" y="65" fill="white" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">25</text>
          <text x="62" y="65" fill="white" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">0</text>
          <text x="83" y="65" fill="white" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif" textAnchor="middle">5</text>

          {/* Tick marks aligned with each number */}
          <line x1="17" y1="67" x2="17" y2="72" stroke="white" strokeWidth="2" />
          <line x1="38" y1="67" x2="38" y2="72" stroke="white" strokeWidth="2" />
          <line x1="62" y1="67" x2="62" y2="72" stroke="white" strokeWidth="2" />
          <line x1="83" y1="67" x2="83" y2="72" stroke="white" strokeWidth="2" />

          {/* "Do-More" brand text in lower half */}
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
          Welcome Back
        </h1>

        {/* Sub-heading */}
        <p
          style={{
            color: '#8e8e8e',
            fontSize: '14px',
            margin: '0 0 28px',
            textAlign: 'center',
          }}
        >
          Sign in to DoMore.....
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* NetID Input */}
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
            onFocus={() => {}}
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
              placeholder="NetID"
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
              marginBottom: '24px',
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

          {/* Sign In Button */}
          <button
            id="login-submit"
            type="submit"
            style={{
              width: '100%',
              height: '50px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.01em',
              transition: 'background-color 0.2s, transform 0.1s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#e0e0e0')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = '#ffffff')
            }
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = 'scale(0.98)')
            }
            onMouseUp={(e) =>
              (e.currentTarget.style.transform = 'scale(1)')
            }
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
