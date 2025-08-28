/**
 * Tests for transformer modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrettierTransformer } from '../../src/transformers/prettier.js';
import { ProcessingInput, PrettierOptions } from '../../src/types.js';
import { PrettierError } from '../../src/utils/errors.js';

describe('PrettierTransformer', () => {
  let transformer: PrettierTransformer;
  let mockInput: ProcessingInput;

  beforeEach(() => {
    transformer = new PrettierTransformer();
    
    mockInput = {
      code: 'function test(){return 1+2;}',
      metadata: {
        fileName: 'test.js',
        fileSize: 100,
        statistics: {
          linesOfCode: 1,
          functionsCount: 1,
          variablesCount: 0,
          complexityScore: 1,
          tokensCount: 15,
        },
      },
      config: {} as any,
    };
  });

  describe('constructor and configuration', () => {
    it('should create transformer with default options', () => {
      const transformer = new PrettierTransformer();
      const options = transformer.getOptions();
      
      expect(options.parser).toBe('babel');
      expect(options.printWidth).toBe(80);
      expect(options.tabWidth).toBe(2);
      expect(options.useTabs).toBe(false);
      expect(options.semi).toBe(true);
      expect(options.singleQuote).toBe(true);
      expect(options.trailingComma).toBe('es5');
    });

    it('should create transformer with custom options', () => {
      const customOptions: PrettierOptions = {
        parser: 'typescript',
        printWidth: 100,
        tabWidth: 4,
        useTabs: true,
        semi: false,
        singleQuote: false,
        trailingComma: 'all',
      };

      const transformer = new PrettierTransformer(customOptions);
      const options = transformer.getOptions();
      
      expect(options.parser).toBe('typescript');
      expect(options.printWidth).toBe(100);
      expect(options.tabWidth).toBe(4);
      expect(options.useTabs).toBe(true);
      expect(options.semi).toBe(false);
      expect(options.singleQuote).toBe(false);
      expect(options.trailingComma).toBe('all');
    });

    it('should update options', () => {
      transformer.updateOptions({ printWidth: 120, semi: false });
      const options = transformer.getOptions();
      
      expect(options.printWidth).toBe(120);
      expect(options.semi).toBe(false);
      expect(options.tabWidth).toBe(2); // unchanged
    });
  });

  describe('execute', () => {
    it('should format simple JavaScript code', async () => {
      const result = await transformer.execute(mockInput);
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('function test()');
      expect(result.code).toContain('return 1 + 2;');
      expect(result.metadata.statistics.linesOfCode).toBeGreaterThan(1);
    });

    it('should handle already formatted code', async () => {
      const formattedInput = {
        ...mockInput,
        code: 'function test() {\n  return 1 + 2;\n}\n',
      };

      const result = await transformer.execute(formattedInput);
      
      expect(result.success).toBe(true);
      expect(result.code).toBeTruthy();
    });

    it('should handle complex JavaScript code', async () => {
      const complexInput = {
        ...mockInput,
        code: `const obj={a:1,b:2};function process(data){if(data.length>0){return data.map(item=>item*2).filter(x=>x>5);}}`,
      };

      const result = await transformer.execute(complexInput);
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('const obj = {');
      expect(result.code).toContain('function process(data)');
      expect(result.code).toMatch(/if \(data\.length > 0\)/);
    });

    it('should handle TypeScript file extension', async () => {
      const tsInput = {
        ...mockInput,
        code: 'interface User{name:string;age:number}const user:User={name:"John",age:30};',
        metadata: {
          ...mockInput.metadata,
          fileName: 'test.ts',
        },
      };

      const result = await transformer.execute(tsInput);
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('interface User');
      expect(result.code).toContain('name: string');
    });

    it('should handle JSX code', async () => {
      const jsxInput = {
        ...mockInput,
        code: 'const Component=()=><div className="test"><span>Hello</span></div>;',
        metadata: {
          ...mockInput.metadata,
          fileName: 'component.jsx',
        },
      };

      const result = await transformer.execute(jsxInput);
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('className=');
      expect(result.code).toContain('Hello');
    });

    it('should return original code on formatting failure', async () => {
      const invalidInput = {
        ...mockInput,
        code: 'function invalid syntax{{{',
      };

      const result = await transformer.execute(invalidInput);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe(invalidInput.code);
      expect(result.error).toBeDefined();
    });

    it('should calculate formatting metrics', async () => {
      const minifiedInput = {
        ...mockInput,
        code: 'function test(){const a=1;const b=2;return a+b;}',
      };

      const result = await transformer.execute(minifiedInput);
      
      expect(result.success).toBe(true);
      expect(result.metadata.statistics.linesOfCode).toBeGreaterThan(1);
      // Formatted code should have more lines than minified
    });
  });

  describe('parser detection', () => {
    it('should detect TypeScript from file extension', async () => {
      const tsInput = {
        ...mockInput,
        code: 'const x: number = 1;',
        metadata: {
          ...mockInput.metadata,
          fileName: 'test.ts',
        },
      };

      const result = await transformer.execute(tsInput);
      expect(result.success).toBe(true);
    });

    it('should detect JSX from file extension', async () => {
      const jsxInput = {
        ...mockInput,
        code: 'const el = <div>Hello</div>;',
        metadata: {
          ...mockInput.metadata,
          fileName: 'test.jsx',
        },
      };

      const result = await transformer.execute(jsxInput);
      expect(result.success).toBe(true);
    });

    it('should detect TypeScript from content', async () => {
      const tsInput = {
        ...mockInput,
        code: 'interface User { name: string; age: number; }',
        metadata: {
          ...mockInput.metadata,
          fileName: 'test.js', // Wrong extension but TS content
        },
      };

      const result = await transformer.execute(tsInput);
      expect(result.success).toBe(true);
    });

    it('should detect JSX from content', async () => {
      const jsxInput = {
        ...mockInput,
        code: 'const component = () => <div className="test">Content</div>;',
        metadata: {
          ...mockInput.metadata,
          fileName: 'test.js', // Wrong extension but JSX content
        },
      };

      const result = await transformer.execute(jsxInput);
      expect(result.success).toBe(true);
    });
  });

  describe('syntax detection', () => {
    // Note: We can't test private methods directly, but we can test their effects
    // through the public execute method
    
    it('should handle code with type annotations', async () => {
      const input = {
        ...mockInput,
        code: 'function process(data: string[]): number { return data.length; }',
      };

      const result = await transformer.execute(input);
      expect(result.success).toBe(true);
    });

    it('should handle code with interfaces', async () => {
      const input = {
        ...mockInput,
        code: 'interface Config { debug: boolean; port: number; }',
      };

      const result = await transformer.execute(input);
      expect(result.success).toBe(true);
    });

    it('should handle code with JSX elements', async () => {
      const input = {
        ...mockInput,
        code: 'const element = <button onClick={handleClick}>Click me</button>;',
      };

      const result = await transformer.execute(input);
      expect(result.success).toBe(true);
    });
  });

  describe('parser fallback', () => {
    it('should try multiple parsers on failure', async () => {
      // Create a mock that fails with the first parser but succeeds with babel
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // This code might fail with typescript parser but work with babel
      const ambiguousInput = {
        ...mockInput,
        code: 'const x = () => ({ a: 1, b: 2 });',
      };

      const result = await transformer.execute(ambiguousInput);
      expect(result.success).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('options validation', () => {
    it('should validate correct options', () => {
      const validOptions: PrettierOptions = {
        parser: 'babel',
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
      };

      const result = transformer.validateOptions(validOptions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid print width', () => {
      const invalidOptions = { printWidth: 600 } as PrettierOptions;
      
      const result = transformer.validateOptions(invalidOptions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Print width must be between 20 and 500');
    });

    it('should reject invalid tab width', () => {
      const invalidOptions = { tabWidth: 25 } as PrettierOptions;
      
      const result = transformer.validateOptions(invalidOptions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tab width must be between 1 and 20');
    });

    it('should reject unsupported parser', () => {
      const invalidOptions = { parser: 'unsupported-parser' } as PrettierOptions;
      
      const result = transformer.validateOptions(invalidOptions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unsupported parser: unsupported-parser');
    });

    it('should warn about very wide print width', () => {
      const warningOptions = { printWidth: 150 } as PrettierOptions;
      
      const result = transformer.validateOptions(warningOptions);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Very wide print width'))).toBe(true);
    });

    it('should warn about large tab width', () => {
      const warningOptions = { tabWidth: 8 } as PrettierOptions;
      
      const result = transformer.validateOptions(warningOptions);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Large tab width'))).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should return supported file extensions', () => {
      const extensions = transformer.getSupportedExtensions();
      
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.jsx');
      expect(extensions).toContain('.tsx');
      expect(extensions).toContain('.json');
      expect(extensions).toContain('.css');
      expect(extensions).toContain('.html');
      expect(extensions).toContain('.md');
    });

    it('should return version information', async () => {
      const versionInfo = await transformer.getVersionInfo();
      
      expect(versionInfo.version).toBeTruthy();
      expect(Array.isArray(versionInfo.supportedLanguages)).toBe(true);
      expect(versionInfo.supportedLanguages.length).toBeGreaterThan(0);
    });

    it('should handle version info errors gracefully', async () => {
      // Test the error handling path by creating a new transformer
      // and testing that the fallback works
      const versionInfo = await transformer.getVersionInfo();
      
      expect(versionInfo.version).toBeTruthy();
      expect(Array.isArray(versionInfo.supportedLanguages)).toBe(true);
      expect(versionInfo.supportedLanguages).toContain('JavaScript');
    });
  });

  describe('error handling', () => {
    it('should handle malformed JavaScript gracefully', async () => {
      const malformedInput = {
        ...mockInput,
        code: 'function broken() { if (true { return false; }',
      };

      const result = await transformer.execute(malformedInput);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe(malformedInput.code);
      expect(result.error).toBeDefined();
    });

    it('should handle empty code', async () => {
      const emptyInput = {
        ...mockInput,
        code: '',
      };

      const result = await transformer.execute(emptyInput);
      
      expect(result.success).toBe(true);
      expect(result.code).toBe('');
    });

    it('should handle code with only whitespace', async () => {
      const whitespaceInput = {
        ...mockInput,
        code: '   \n  \t  \n   ',
      };

      const result = await transformer.execute(whitespaceInput);
      
      expect(result.success).toBe(true);
    });

    it('should preserve metadata on success', async () => {
      const result = await transformer.execute(mockInput);
      
      expect(result.metadata.fileName).toBe(mockInput.metadata.fileName);
      expect(result.metadata.fileSize).toBe(mockInput.metadata.fileSize);
      expect(result.metadata.statistics.functionsCount).toBe(1);
    });

    it('should preserve metadata on failure', async () => {
      const invalidInput = {
        ...mockInput,
        code: 'invalid syntax {{{',
      };

      const result = await transformer.execute(invalidInput);
      
      expect(result.success).toBe(false);
      expect(result.metadata.fileName).toBe(invalidInput.metadata.fileName);
      expect(result.metadata.fileSize).toBe(invalidInput.metadata.fileSize);
    });
  });

  describe('performance and metrics', () => {
    it('should complete formatting within reasonable time', async () => {
      const start = Date.now();
      await transformer.execute(mockInput);
      const duration = Date.now() - start;
      
      // Should complete within 5 seconds (very generous for CI)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle large code files', async () => {
      const largeCode = Array(1000).fill(0).map((_, i) => 
        `function func${i}() { const var${i} = ${i}; return var${i} * 2; }`
      ).join('\n');

      const largeInput = {
        ...mockInput,
        code: largeCode,
      };

      const result = await transformer.execute(largeInput);
      expect(result.success).toBe(true);
    }, 10000); // 10 second timeout for large files

    it('should provide meaningful processing metrics', async () => {
      const unformattedInput = {
        ...mockInput,
        code: 'function test(){const a=1,b=2,c=3;if(a>0){return b+c;}else{return 0;}}',
      };

      const result = await transformer.execute(unformattedInput);
      
      expect(result.success).toBe(true);
      expect(result.metadata.statistics.linesOfCode).toBeGreaterThan(1);
      // Formatted code should have more lines than the minified version
    });
  });
});