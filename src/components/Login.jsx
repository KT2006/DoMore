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
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      {/* Card */}
      <div className="w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] bg-[#3a3a3a] rounded-[28px] p-8 sm:p-10 md:p-12 flex flex-col items-center shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-300">
        {/* Logo Circle */}
        {/* Do-More egg-timer logo */}
        <svg
          width="80"
          height="96"
          viewBox="0 0 100 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-3 sm:mb-4 md:mb-5 shrink-0"
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
        <h1 className="text-white text-[22px] sm:text-[26px] md:text-[28px] font-normal tracking-[0.02em] m-0 mb-1.5 sm:mb-2 text-center transition-all duration-300">
          Welcome Back
        </h1>

        {/* Sub-heading */}
        <p className="text-[#8e8e8e] text-[14px] sm:text-[15px] md:text-base m-0 mb-7 sm:mb-9 text-center transition-all duration-300">
          Sign in to DoMore.....
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full">
          {/* NetID Input */}
          <div className="group relative flex items-center w-full h-[52px] sm:h-[56px] md:h-[60px] bg-[#252525] rounded-xl border border-white/5 mb-3.5 sm:mb-4 overflow-hidden transition-colors duration-200 focus-within:border-white/30 hover:border-white/20">
            <div className="pl-3.5 sm:pl-4 pr-2.5 sm:pr-3 flex items-center text-[#6e6e6e] group-focus-within:text-[#a0a0a0] transition-colors duration-200 shrink-0">
              <Mail size={18} strokeWidth={1.5} className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
            </div>
            <input
              id="login-netid"
              type="text"
              placeholder="NetID"
              value={netId}
              onChange={(e) => setNetId(e.target.value)}
              required
              className="flex-1 h-full border-none outline-none text-[#e2e2e2] text-[15px] sm:text-base pr-3.5 sm:pr-4 placeholder-[#6e6e6e]"
              style={{ background: 'transparent' }}
            />
          </div>

          {/* Password Input */}
          <div className="group relative flex items-center w-full h-[52px] sm:h-[56px] md:h-[60px] bg-[#252525] rounded-xl border border-white/5 mb-6 sm:mb-8 overflow-hidden transition-colors duration-200 focus-within:border-white/30 hover:border-white/20">
            <div className="pl-3.5 sm:pl-4 pr-2.5 sm:pr-3 flex items-center text-[#6e6e6e] group-focus-within:text-[#a0a0a0] transition-colors duration-200 shrink-0">
              <Lock size={18} strokeWidth={1.5} className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Academia Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex-1 h-full border-none outline-none text-[#e2e2e2] text-[15px] sm:text-base pr-1 placeholder-[#6e6e6e]"
              style={{ background: 'transparent' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="pl-2.5 pr-3.5 sm:pr-4 flex items-center justify-center text-[#6e6e6e] hover:text-[#a0a0a0] bg-none border-none cursor-pointer transition-colors duration-200 shrink-0 outline-none"
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={1.5} className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
              ) : (
                <Eye size={18} strokeWidth={1.5} className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
              )}
            </button>
          </div>

          {/* Sign In Button */}
          <button
            id="login-submit"
            type="submit"
            className="w-full h-[50px] sm:h-[54px] md:h-[58px] bg-white text-black text-[15px] sm:text-[16px] md:text-[17px] font-semibold rounded-full border-none cursor-pointer tracking-[0.01em] transition-all duration-200 hover:bg-[#e0e0e0] active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
