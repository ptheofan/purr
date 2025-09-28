import { Logger } from '@nestjs/common';

// Suppress NestJS Logger output during tests to reduce noise
// This only affects Logger.log, Logger.error, etc. - not Jest output
Logger.overrideLogger(['error']); // Only show errors, suppress log/warn/debug/verbose

// Alternative: Completely silence all logger output during tests
// Logger.overrideLogger(false);