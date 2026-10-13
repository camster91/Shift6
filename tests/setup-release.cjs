/* global require */
/* eslint-disable @typescript-eslint/no-require-imports */
const process = require('node:process');
// Existing transport and outbox tests exercise the connected engine explicitly.
// Guest-only policy has separate configuration and SQLite coverage.
process.env.EXPO_PUBLIC_RELEASE_MODE = 'connected';
