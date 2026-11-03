# GreenCampus — College Sustainability Management Platform

A comprehensive web application for tracking, analyzing, and reporting campus sustainability metrics including energy consumption, water usage, waste management, and greenhouse gas (GHG) emissions. Built as a college project demonstrating modern full-stack development practices with React, Tailwind CSS, and GHG Protocol compliance.

![GreenCampus Dashboard](https://raw.githubusercontent.com/prastutirai847-design/GreenCampus/main/gc-qa/design-dashboard-1440.png)

## 🌱 Features

### Core Functionality
- **Dashboard Overview**: Real-time KPIs for GHG emissions (Scope 1/2/3), energy consumption, water usage, waste metrics, and carbon intensity
- **Data Entry**: Record electricity, water, fuel, waste, and commuting data with bill attachments
- **Analytics**: Interactive charts and filters for resource consumption and emissions trends
- **Emissions Tracking**: GHG Protocol-compliant Scope 1, 2, and 3 emissions calculation
- **Building Management**: Track individual building performance and floor area
- **Department Management**: Associate consumption records with academic departments
- **Report Generation**: Generate sustainability reports with methodology, boundaries, and compliance notes
- **Recommendations**: AI-powered sustainability improvement suggestions

### Technical Highlights
- **Indian Standards Compliance**: ₹ currency formatting, DD/MM/YYYY dates, IST timezone, metric units (kWh, kL, kg, tonnes, m²)
- **GHG Protocol Aligned**: Scope 1 (direct), Scope 2 (electricity), Scope 3 (value chain) emissions tracking
- **Transparent Calculations**: All emission factors sourced from CEA CO₂ Baseline Database v22.0 (0.675 tCO₂/MWh for FY 2025-26)
- **Responsive Design**: Mobile-first approach with desktop, tablet, and mobile layouts
- **Premium UI**: Geist typography, forest/sand color palette, 4px spacing system

## 🛠️ Tech Stack

### Frontend
- **React 18.3** — UI framework with hooks and context API
- **React Router 6.28** — Client-side routing with protected routes
- **Tailwind CSS 3.4** — Utility-first CSS with custom design tokens
- **Recharts 2.15** — Composable charting library for data visualization
- **Lucide React 0.468** — Icon library
- **Vite 6.4** — Build tool and dev server

### Architecture
- **Service Layer**: Backend-ready API abstraction with mock data support
- **Context API**: Campus, Auth, and Toast state management
- **LocalStorage**: Persistent client-side data storage
- **Component Library**: Reusable UI primitives (Button, Card, Modal, DataTable, etc.)

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm

### Setup
```bash
# Clone the repository
git clone https://github.com/prastutirai847-design/GreenCampus.git
cd GreenCampus

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:5173**

### Demo Access
- **Email**: `demo@greencampus.app`
- **Password**: `demo1234`
- Or click "Continue with demo account" on the login page

## 🚀 Usage

### First Steps
1. **Login** with demo credentials or create a new account
2. **College Setup**: Enter your institution's name, location, type, student/staff count, and buildings
3. **Dashboard**: View pre-loaded sample data across 12 sustainability metrics
4. **Data Entry**: Add consumption records for electricity, water, fuel, waste, or commuting
5. **Analytics**: Explore trends with filters for buildings, periods, and categories
6. **Reports**: Generate sustainability reports with Scope 1/2/3 breakdowns

### Key Workflows
- **Add Electricity Record**: Data Entry → Electricity tab → Add record → Enter kWh reading → Save
- **Upload Bill**: Data Entry → Upload bill → Attach PDF/image → Link to record
- **Generate Report**: Reports → Select period → Regenerate → Print/Save as PDF
- **View Building Performance**: Buildings → Select building → View consumption and emissions

## 📁 Project Structure

```
GreenCampus/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── activities/  # Consumption record forms and tables
│   │   ├── auth/        # Login, register, setup pages
│   │   ├── buildings/   # Building management modals
│   │   ├── charts/      # Recharts visualizations
│   │   ├── consumption/ # Bill and record components
│   │   ├── dashboard/   # Dashboard widgets
│   │   ├── departments/ # Department management
│   │   ├── emissions/   # Scope cards and factor reference
│   │   ├── layout/      # Sidebar, topbar, app shell
│   │   ├── recommendations/ # Recommendation cards
│   │   └── ui/          # Primitives (Button, Card, Modal, etc.)
│   ├── context/         # React contexts (Auth, Campus, Toast)
│   ├── data/            # Mock data, emission factors, GHG protocol
│   ├── pages/           # Route-level page components
│   ├── services/        # API service layer (mock + future backend)
│   └── utils/           # Formatting, calculations, validation
├── index.html           # Entry point with Geist font loading
├── tailwind.config.js   # Design tokens and theme
├── vite.config.js       # Build configuration
└── package.json         # Dependencies and scripts
```

## 🌍 GHG Protocol Compliance

### Emission Scopes
- **Scope 1 (Direct)**: Fuel combustion (diesel, petrol, natural gas) and refrigerant leakage (R-410A, R-22, R-134a)
- **Scope 2 (Electricity)**: Purchased grid electricity using location-based method
- **Scope 3 (Value Chain)**: Waste generated, commuting (car, bus, rail, walk/cycle)

### Emission Factors
- **Grid Electricity**: 0.675 tCO₂/MWh (CEA CO₂ Baseline Database v22.0, FY 2025-26)
- **Natural Gas**: 2.02 kgCO₂e/SCM
- **Refrigerants**: AR4 GWP-100 (R-410A: 2088, R-22: 1810, R-134a: 1430)
- **All factors**: Traceable to official sources, clearly labeled as estimates

### Data Quality
- All 264 demo records classified as `estimated`
- Period-on-period comparisons require ≥75% monthly coverage
- No fabricated measurements; sample data clearly labeled

## 🇮🇳 Indian Standards

### Formatting
- **Currency**: ₹ with Indian grouping (₹1,00,000 not $100,000)
- **Numbers**: en-IN locale (16,77,190 not 1,677,190)
- **Dates**: DD/MM/YYYY (01/11/2026 not 11/01/2026)
- **Time**: 12-hour AM/PM for UI, 24-hour for technical reports
- **Timezone**: Asia/Kolkata (IST)

### Units
- **Energy**: kWh (electricity), kW (demand)
- **Water**: L, kL (not gallons)
- **Fuel**: L (diesel, petrol)
- **Weight**: kg, tonnes (not lbs)
- **Area**: m² with sq ft parenthetical (1 m² ≈ 10.76 sq ft)
- **Land**: acres, hectares
- **Distance**: m, km (not miles)
- **Temperature**: °C (not °F)
- **Emissions**: kgCO₂e, tCO₂e

## 📊 Sample Data

The demo workspace includes 12 months of illustrative records for:
- **Electricity**: 5,241 kWh/student, 1,677 MWh total
- **Water**: 52,912 kL consumption
- **Fuel**: 25,596 L (diesel + petrol)
- **Waste**: 59.8 t generated, 17.6% recycled
- **Commuting**: Car, bus, rail, walk/cycle modes
- **GHG Emissions**: 2,307 tCO₂e total (Scope 1: 77.9, Scope 2: 1,132, Scope 3: 1,097)

**Note**: All data is illustrative and estimated. Replace with actual college measurements via Settings → Data & workspace.

## 🎨 Design System

### Typography
- **Primary**: Geist Sans (Google Fonts)
- **Technical**: Geist Mono (for IDs, codes, numerical data)
- **Fallback**: Inter, system-ui

### Color Palette
- **Primary Green**: #166534 (forest-700), #15803D (forest-600)
- **Background**: #F8FAF8 (sand-50)
- **Cards**: #FFFFFF with 16px radius and subtle shadow
- **Text**: #17231C (ink-900), #647067 (ink-500)
- **Borders**: #E5EAE6 (line)
- **Accents**: Warning #D97706, Error #DC2626, Success #15803D

### Spacing & Layout
- **4px grid**: 4, 8, 12, 16, 24, 32, 40-48px
- **Card padding**: 20-24px
- **Sidebar**: 268px fixed width (desktop)
- **Responsive**: Breakpoints at 390px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)

## 🔧 Development

### Available Scripts
```bash
npm run dev      # Start dev server with HMR
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

### Adding New Features
1. **Service Layer**: Add API methods in `src/services/` (mock now, backend later)
2. **Context**: Extend `CampusContext` for global state
3. **Components**: Create reusable primitives in `src/components/ui/`
4. **Pages**: Add route in `src/App.jsx` and page in `src/pages/`
5. **Data**: Update mock data in `src/data/` and seed in `src/services/seed.js`

### Backend Integration Ready
- Service layer uses `USE_MOCK_API` flag (switch to `false` for real backend)
- API base URL: `http://localhost:8000/api/v1`
- All endpoints documented in service files
- localStorage keys prefixed `greencampus:v1:`

## 📝 License

This project is created as a college academic project. All code is open source for educational purposes.

## 👨‍💻 Author

**Prastuti Rai**  
College Sustainability Project  
GitHub: [@prastutirai847-design](https://github.com/prastutirai847-design)

## 🙏 Acknowledgments

- **GHG Protocol**: Corporate Accounting and Reporting Standard
- **CEA CO₂ Baseline Database**: Central Electricity Authority, India
- **IPCC AR4**: Global Warming Potential values
- **Geist Font**: Vercel open-source typeface
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Composable charting library

---

**Built with ❤️ for campus sustainability**
