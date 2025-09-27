# Overview

This is a personal finance management application called "WealthTrack" that helps users track their savings and investment instruments including Recurring Deposits (RD), Fixed Deposits (FD), Mutual Funds (MF), Life Insurance (LIC), and other financial instruments. The application provides a comprehensive dashboard for monitoring contributions, due dates, maturity dates, and overall net worth from these investments.

**Recent Enhancement (September 2025)**: The application now supports fully customizable investment types and bill categories, allowing users to create, edit, and delete their own categories through a comprehensive Settings page. These custom types automatically update all dropdowns in the Investment and Bills sections, and users can export/import their complete financial data including custom categories.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Development**: Hot module replacement with Vite integration
- **Error Handling**: Centralized error middleware with structured error responses

## Data Storage Solutions
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon Database serverless connection
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Validation**: Zod schemas for runtime type validation and API contract enforcement

## Authentication and Authorization
- **Current State**: Demo implementation using hardcoded user ID
- **Session Management**: Prepared for PostgreSQL session store using connect-pg-simple
- **Security**: CSRF protection and secure session handling (implementation pending)

## Data Models
The application uses a five-tier data model:
- **Users**: Basic user information and authentication
- **Investment Types**: User-customizable investment categories (replaces hardcoded types)
- **Bill Categories**: User-customizable bill/expense categories (replaces hardcoded categories)
- **Investments**: Core investment tracking with dynamic type categorization, payment schedules, and maturity tracking
- **Bills**: Expense tracking with dynamic category assignment and payment scheduling
- **Transactions**: Individual payment records linked to investments and bills

## Component Architecture
- **Design System**: Modular component library with consistent theming and dynamic color generation
- **Layout**: Responsive design with mobile-first approach
- **Reusability**: Shared UI components with variant-based styling using class-variance-authority
- **Settings Interface**: Comprehensive tabbed interface with CRUD operations for custom types and data management
- **Dynamic Integration**: Investment and Bills pages automatically reflect custom types through API integration

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations and migrations

## UI and Styling
- **Radix UI**: Headless UI components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: React charting library for data visualization
- **Lucide React**: Icon library for consistent iconography

## Development and Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer

## Form and Validation
- **React Hook Form**: Performant form handling with minimal re-renders
- **Zod**: Runtime type validation and schema definition
- **Hookform Resolvers**: Integration between React Hook Form and Zod

## Communication Services
- **SendGrid**: Email service integration for notifications (configured but not actively used)

## Development Environment
- **Replit Integration**: Custom plugins for development banner and cartographer
- **Runtime Error Overlay**: Development error handling and debugging
- **Hosting Configuration**: Configured for Replit environment with proper host allowance and port 5000 binding
- **Deployment**: Configured for autoscale deployment with build and start scripts