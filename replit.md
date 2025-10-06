# Overview

This is a simplified Minecraft AFK bot built with Node.js that keeps players connected to Minecraft servers while away. The bot maintains a completely passive presence to avoid kick detection, supports offline authentication, and includes optional auto-authentication. Built with a focus on stability and long-term reliability using the mineflayer library for Minecraft protocol handling.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **Node.js Application**: Simple single-threaded JavaScript application using the mineflayer library for Minecraft protocol communication
- **Express.js Web Server**: Minimal HTTP server running on port 8000 for status checking

## Bot Architecture  
- **Single Bot Instance**: Creates one stable mineflayer bot instance with simple connection parameters
- **Event-Driven Design**: Uses mineflayer's event system to handle login, disconnection, and chat events
- **Zero Movement Design**: No pathfinding or movement to avoid invalid_player_movement kicks

## Configuration Management
- **JSON-Based Configuration**: Uses `settings.json` for bot credentials, server details, and optional features
- **Simplified Features**: Minimal feature set focused on stability and stealth

## Connection Management
- **Simple Reconnection**: Automatic reconnection with fixed delays (30s normal, 60s after kicks)
- **Clean Error Handling**: Proper cleanup of resources and event listeners
- **Memory Leak Prevention**: All timers and listeners properly cleared on disconnect

## Anti-AFK System
- **Passive Presence**: Bot stays completely still to avoid detection
- **Zero Automation**: No automatic movements, chat, or behaviors that could trigger kicks

## Authentication Support
- **Offline Authentication**: Uses offline mode for maximum compatibility
- **Optional Auto-Auth**: Optional login commands for servers requiring registration/login
- **Simple Credential Management**: Basic username/password handling

## Monitoring and Logging
- **Essential Logging**: Basic connection status and error logging
- **Health Checks**: Simple 5-minute interval health monitoring
- **Graceful Shutdown**: Proper cleanup on process termination

# External Dependencies

## Core Libraries
- **mineflayer**: Primary Minecraft bot framework for protocol handling and server communication
- **express**: Lightweight web framework for basic HTTP server functionality

## Minecraft Server Integration
- **Target Server**: Connects to "gold.magmanode.com" on port 27719 (Magmanode hosting)
- **Minecraft Version**: Auto-detects version (currently supports up to 1.21.8)
- **Authentication**: Uses offline mode authentication
- **Optional Login Plugin**: Supports servers with registration/login requirements

## Development Tools
- **Node.js Runtime**: Requires Node.js environment for execution
- **npm Package Manager**: Uses npm for dependency management and installation

# Recent Changes (October 2025)

## Accurate Movement System (Latest)
- **Pathfinder Integration**: Added mineflayer-pathfinder for accurate navigation
- **Chat Commands**: Control bot movement via in-game chat (!goto, !follow, !come, !stop, !pos)
- **Smart Navigation**: Automatic pathfinding with obstacle avoidance
- **Player Following**: Bot can follow any player on the server
- **Coordinate Movement**: Precise movement to specific coordinates

## Major Stability Overhaul (September 2025)
- **Complete System Rewrite**: Replaced complex monitoring systems with simple, stable architecture
- **Memory Leak Prevention**: Proper cleanup of all timers, intervals, and event listeners
- **Zero Movement Protocol**: Eliminated all automatic movements to prevent invalid_player_movement kicks
- **Simplified Reconnection**: Single timeout-based reconnection system with fixed delays
- **Error Resilience**: Clean error handling with graceful recovery

## Key Improvements
- **Eliminated Race Conditions**: Removed overlapping reconnection systems
- **Resource Management**: Proper cleanup prevents memory leaks and resource conflicts
- **Kick Prevention**: Zero movement approach eliminates movement-based kicks
- **Long-term Stability**: Designed for continuous operation without degradation