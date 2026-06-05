# Do More - Student Productivity Tracker

A premium, dark-themed student productivity tracking system designed for calm, focused study sessions. Built with a unique design system that prioritizes eye comfort during long study hours.

## 🎨 Design Philosophy

**Do More** features a distinctive dark theme optimized for:
- **Night-friendly** long study sessions
- **Calm, focus-first** experience
- **Premium** feel without generic templates
- **Minimalist** yet futuristic aesthetic

### Color Palette

- **Primary Background**: Deep midnight navy (`#0B1020`)
- **Card Surfaces**: Dark indigo (`#121A33`)
- **Primary Accent**: Fresh mint green (`#2EE6A6`)
- **Secondary Accent**: Soft cyan (`#5EEAD4`)
- **Focus/Alert**: Warm amber (`#F4B740`)
- **Overdue**: Soft coral red (`#FF6B7A`)
- **Text Primary**: Off-white (`#E6E9F2`)
- **Text Muted**: Cool gray-blue (`#9AA3BF`)

## 🎯 Features

### 1. **Dashboard**
- Real-time productivity overview with key metrics
- Weekly focus trend visualization
- Subject distribution charts
- Recent focus sessions
- Upcoming deadlines overview

### 2. **Pomodoro Focus Timer**
- **Animated circular progress ring** with smooth animations
- Three modes: Focus (25min), Short Break (5min), Long Break (15min)
- Subject categorization for focus sessions
- Effort level tracking (Low, Medium, High)
- Session history with detailed records
- Auto-switch to break after focus sessions

### 3. **Academic Timetable**
- Visual weekly schedule with timeline view
- **Smart status indicators**:
  - 🟢 Current class → Mint border (with pulsing indicator)
  - 🔵 Upcoming class → Cyan border
  - ⚫ Past class → Muted gray
- Day-by-day class management
- Free time block identification with study session planning
- Class details (time, location, duration)

### 4. **Assignment Manager**
- **Color-coded status system**:
  - ✅ Completed → Mint green
  - 🔄 In Progress → Warm amber
  - ⚠️ Overdue → Soft coral (no harsh reds)
- Deadline tracking with visual countdown
- Priority levels (High, Medium, Low)
- Progress bars for in-progress assignments
- Filter by status (All, Pending, In Progress, Completed, Urgent, Overdue)
- Estimated hours and completion tracking

### 5. **Analytics Dashboard**
- Comprehensive productivity metrics with mint/cyan accents
- **Minimal chart design** using only mint and cyan colors
- Weekly trend analysis (bar charts)
- Daily breakdown (area charts)
- Subject performance comparison with consistency scores
- Behavioral pattern radar chart
- Personalized insights and recommendations

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## 🛠️ Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Recharts** - Chart library for data visualization
- **Lucide React** - Icon library
- **date-fns** - Date utility library

## 🎨 Design Features

- **Dark-first design** - Optimized for night study sessions
- **Animated progress rings** - Smooth circular timers for Pomodoro
- **Color-coded status system** - Intuitive visual feedback
- **Minimal accent usage** - Accent colors used sparingly (≤10% of screen)
- **Smooth animations** - Framer Motion powered transitions
- **Responsive design** - Works on all screen sizes
- **High contrast typography** - Eye-friendly text rendering
- **Soft shadows & rounded corners** - Premium feel without clutter

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop (1920px+)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🎯 Key UI/UX Principles

1. **User-Centric Design** - Intuitive navigation and clear information hierarchy
2. **Visual Feedback** - Immediate response to user actions
3. **Context Awareness** - Relevant information displayed at the right time
4. **Accessibility** - High contrast, readable fonts, clear labels
5. **Performance** - Optimized animations and efficient rendering

## 📂 Project Structure

```
sdpm-uiux/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── FocusTracker.jsx
│   │   ├── Timetable.jsx
│   │   ├── Assignments.jsx
│   │   ├── Analytics.jsx
│   │   └── Sidebar.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🎯 UI Rules

- Accent colors used sparingly (≤10% of screen)
- High contrast, eye-friendly typography
- Rounded cards, soft shadows, clean spacing
- Dark mode first (no bright neon, no rainbow colors)
- No clutter - clean, focused interface

## 🔮 Future Enhancements

- Backend integration for data persistence
- User authentication
- Multi-user support
- Export reports (PDF/CSV)
- Mobile app version
- Notification system
- Study streak tracking
- Social features (study groups)

## 📝 License

This project is created for academic purposes as part of SDPM coursework.

