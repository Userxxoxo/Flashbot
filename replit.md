# Overview

This is a real-time arbitrage trading bot application built with React, Node.js, Express, and WebSockets. The application automatically scans multiple DEXs (Decentralized Exchanges) across different blockchain networks (Ethereum, Base, Polygon) to identify and potentially execute profitable arbitrage opportunities. It features a modern dark-themed dashboard that displays live trading opportunities, recent trades, performance analytics, and network status with real-time updates via WebSocket connections.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket client for live data streaming

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with real-time WebSocket support
- **Error Handling**: Centralized error middleware with structured responses
- **Development**: Hot module replacement via Vite in development mode

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database interactions
- **Database Provider**: Neon serverless PostgreSQL
- **Schema Management**: Drizzle migrations with schema versioning
- **In-Memory Fallback**: MemStorage class for development/testing without database

## Core Business Logic
- **Arbitrage Scanner**: Automated scanning service that monitors price differences across DEXs
- **DEX Integration**: Support for 1inch and 0x aggregators for price discovery
- **Blockchain Service**: Multi-network support with ethers.js for blockchain interactions
- **Trading Engine**: Automated execution capabilities with configurable parameters

## Authentication and Security
- **Session Management**: Express sessions with PostgreSQL session store
- **Environment Configuration**: Environment variables for API keys and database credentials
- **CORS**: Configured for cross-origin requests in development

## Real-time Communication
- **WebSocket Server**: Built-in WebSocket server for pushing live updates
- **Data Broadcasting**: Real-time arbitrage opportunities, trade executions, and network status
- **Connection Management**: Automatic reconnection handling and connection state tracking

# External Dependencies

## Blockchain Networks
- **Ethereum Mainnet**: Primary network with Llama RPC endpoints
- **Base Network**: Layer 2 solution via Alchemy API
- **Polygon Network**: Sidechain via Infura API

## DEX Aggregators and APIs
- **1inch API**: Price aggregation and swap routing
- **0x API**: Alternative price discovery and liquidity aggregation
- **Custom DEX Integration**: Direct integration with major DEXs for price comparison

## Database and Storage
- **Neon Database**: Serverless PostgreSQL for production data
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect
- **Session Store**: connect-pg-simple for PostgreSQL-backed sessions

## Development Tools
- **Replit Integration**: Custom plugins for runtime error handling and development banners
- **Build System**: esbuild for server bundling, Vite for client development
- **Type Checking**: TypeScript with strict configuration for type safety

## UI and Styling
- **Component Library**: Extensive shadcn/ui component collection
- **Icons**: Font Awesome and Lucide React icons
- **Fonts**: Google Fonts integration (Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Date Handling**: date-fns for timestamp formatting and manipulation