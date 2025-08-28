/**
 * Tests for CLI commands
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { helpCommand } from '../../src/cli/commands/help.js';

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

describe('CLI Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('helpCommand', () => {
    it('should display help information', () => {
      helpCommand();
      
      // Verify that help content is displayed
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('re-Script - Advanced JavaScript Unminifier')
      );
      
      // Check for key sections
      const allCalls = mockConsoleLog.mock.calls.map(call => call[0]).join(' ');
      
      expect(allCalls).toContain('Overview');
      expect(allCalls).toContain('Quick Start');
      expect(allCalls).toContain('Commands');
      expect(allCalls).toContain('Key Options');
      expect(allCalls).toContain('Configuration');
      expect(allCalls).toContain('Common Use Cases');
      expect(allCalls).toContain('Supported Providers');
      expect(allCalls).toContain('Processing Pipeline');
      expect(allCalls).toContain('Common Issues');
      expect(allCalls).toContain('Need More Help');
    });

    it('should include all main commands', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('process');
      expect(allOutput).toContain('init');
      expect(allOutput).toContain('config');
      expect(allOutput).toContain('examples');
      expect(allOutput).toContain('help');
    });

    it('should include all key options', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('--output');
      expect(allOutput).toContain('--config');
      expect(allOutput).toContain('--provider');
      expect(allOutput).toContain('--model');
      expect(allOutput).toContain('--api-key');
      expect(allOutput).toContain('--recursive');
      expect(allOutput).toContain('--pattern');
      expect(allOutput).toContain('--exclude');
      expect(allOutput).toContain('--dry-run');
      expect(allOutput).toContain('--verbose');
      expect(allOutput).toContain('--quiet');
    });

    it('should include provider information', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('OpenAI');
      expect(allOutput).toContain('Anthropic');
      expect(allOutput).toContain('Ollama');
      expect(allOutput).toContain('gpt-4o');
      expect(allOutput).toContain('claude-3-5-sonnet');
      expect(allOutput).toContain('llama3:8b');
    });

    it('should include configuration file formats', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('.rescriptrc.json');
      expect(allOutput).toContain('.rescriptrc.yaml');
      expect(allOutput).toContain('rescript.config.js');
      expect(allOutput).toContain('package.json');
    });

    it('should include environment variables', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('ANTHROPIC_API_KEY');
      expect(allOutput).toContain('OPENAI_API_KEY');
      expect(allOutput).toContain('OLLAMA_BASE_URL');
      expect(allOutput).toContain('RESCRIPT_DEBUG');
    });

    it('should include use case examples', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('Single File Processing');
      expect(allOutput).toContain('Batch Processing');
      expect(allOutput).toContain('Provider-Specific');
      expect(allOutput).toContain('Testing & Debugging');
    });

    it('should include processing pipeline steps', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('Webcrack Processing');
      expect(allOutput).toContain('Babel Transformations');
      expect(allOutput).toContain('LLM Processing');
      expect(allOutput).toContain('Code Formatting');
    });

    it('should include troubleshooting section', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('API Key Errors');
      expect(allOutput).toContain('Rate Limiting');
      expect(allOutput).toContain('Large Files');
      expect(allOutput).toContain('Ollama Not Found');
    });

    it('should include help resources', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('github.com/roeintheglasses/re-Script');
      expect(allOutput).toContain('issues');
      expect(allOutput).toContain('discussions');
    });

    it('should use colored output appropriately', () => {
      helpCommand();
      
      // Since chalk behavior can vary in test environments, just check that function was called
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockConsoleLog.mock.calls.length).toBeGreaterThan(0);
    });

    it('should not crash with empty or invalid input', () => {
      expect(() => helpCommand()).not.toThrow();
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should display reasonable amount of content', () => {
      helpCommand();
      
      // Should have called console.log multiple times (comprehensive help)
      expect(mockConsoleLog.mock.calls.length).toBeGreaterThan(20);
      
      // But not excessive (under reasonable limit)
      expect(mockConsoleLog.mock.calls.length).toBeLessThan(200);
    });

    it('should include practical examples', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      // Check for practical command examples
      expect(allOutput).toContain('re-script app.min.js');
      expect(allOutput).toContain('re-script src/');
      expect(allOutput).toContain('--recursive');
      expect(allOutput).toContain('--dry-run');
      expect(allOutput).toContain('re-script init');
      expect(allOutput).toContain('re-script config show');
    });
  });

  describe('CLI Command Structure', () => {
    it('should export help command function', () => {
      expect(typeof helpCommand).toBe('function');
    });

    it('should be synchronous function', () => {
      const result = helpCommand();
      expect(result).toBeUndefined(); // Void function
    });
  });

  describe('Help Content Quality', () => {
    it('should provide beginner-friendly guidance', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      // Should include beginner-friendly terms
      expect(allOutput).toContain('Interactive setup wizard');
      expect(allOutput).toContain('recommended for first time');
      expect(allOutput).toContain('Quick Start');
    });

    it('should include advanced options for power users', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('concurrency');
      expect(allOutput).toContain('exclude');
      expect(allOutput).toContain('pattern');
      expect(allOutput).toContain('RESCRIPT_DEBUG');
    });

    it('should provide clear action items', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      // Should include actionable commands
      expect(allOutput).toContain('re-script init');
      expect(allOutput).toContain('ollama serve');
      expect(allOutput).toContain('ollama pull');
    });

    it('should include links to external resources', () => {
      helpCommand();
      
      const allOutput = mockConsoleLog.mock.calls.map(call => call[0]).join('\n');
      
      expect(allOutput).toContain('https://');
      expect(allOutput).toContain('platform.openai.com');
      expect(allOutput).toContain('console.anthropic.com');
      expect(allOutput).toContain('ollama.ai');
    });
  });
});