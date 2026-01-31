# Components

This folder contains all the reusable React components for the Vaulton application.

## Component Structure

### Navbar.js
The main navigation bar component that includes:
- Logo with hover animation
- Navigation links (Transactions, Autopay, FAQ, About, Support)
- Smart Account buttons with gradient effects
- Fixed positioning with backdrop blur

### HeroSection.js
The hero section of the landing page featuring:
- Left content area with Vaulton icon card and main heading
- Right content area with phone mockup
- Floating portrait card (top right)
- Testimonial card with Download PWA button (bottom right)
- Background decorative elements (purple and yellow blurs)

### FloatingCard.js
A reusable card component with:
- White background with rounded corners
- Shadow effects with hover state
- Customizable animation classes
- Flexible children content

### Animations.js
Global animation styles including:
- `float` - Smooth vertical floating animation (3s)
- `float-delayed` - Delayed floating animation with 0.5s delay
- Applied to various elements throughout the app

## Usage

Import components individually:
```javascript
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
```

Or use the index file for cleaner imports:
```javascript
import { Navbar, HeroSection, FloatingCard } from './components';
```

## Design System

- **Primary Color**: `#1A1A2E` (Dark navy)
- **Background**: `#F8F8F8` (Off-white)
- **Accent Colors**: Purple and yellow gradients
- **Font**: System fonts with bold weights for headings
- **Animations**: Smooth transitions and hover effects throughout
