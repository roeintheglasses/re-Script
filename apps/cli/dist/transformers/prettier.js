/**
 * Prettier transformer for final code formatting
 */
import prettier from 'prettier';
import { PrettierError } from '../utils/errors.js';
export class PrettierTransformer {
    name = 'prettier';
    description = 'Code formatting using Prettier';
    options;
    constructor(options = {}) {
        this.options = {
            ...options,
        };
    }
    /**
     * Execute Prettier formatting
     */
    async execute(input) {
        const startTime = Date.now();
        try {
            console.log('💅 Formatting code with Prettier...');
            // Determine the best parser for the code
            const parser = await this.detectParser(input.code, input.metadata.fileName);
            // Prepare Prettier options
            const prettierOptions = {
                parser,
                printWidth: this.options.printWidth,
                tabWidth: this.options.tabWidth,
                useTabs: this.options.useTabs,
                semi: this.options.semi,
                singleQuote: this.options.singleQuote,
                trailingComma: this.options.trailingComma,
                bracketSpacing: true,
                bracketSameLine: false,
                arrowParens: 'avoid',
                endOfLine: 'lf',
                embeddedLanguageFormatting: 'auto',
                htmlWhitespaceSensitivity: 'css',
                insertPragma: false,
                jsxSingleQuote: true,
                proseWrap: 'preserve',
                quoteProps: 'as-needed',
                requirePragma: false,
                vueIndentScriptAndStyle: false,
            };
            // Format the code
            const formattedCode = await this.formatWithRetry(input.code, prettierOptions);
            const processingTime = Date.now() - startTime;
            // Calculate formatting metrics
            const metrics = this.calculateMetrics(input.code, formattedCode);
            console.log(`✓ Prettier formatting completed in ${processingTime}ms`);
            console.log(`  Lines: ${metrics.originalLines} → ${metrics.formattedLines}`);
            console.log(`  Parser: ${parser}`);
            return {
                code: formattedCode,
                metadata: {
                    ...input.metadata,
                    statistics: {
                        ...input.metadata.statistics,
                        linesOfCode: metrics.formattedLines,
                    },
                },
                success: true,
            };
        }
        catch (error) {
            if (error instanceof PrettierError) {
                throw error;
            }
            // Create PrettierError from generic error
            const prettierError = new PrettierError(error instanceof Error ? error.message : String(error), error instanceof Error ? error : undefined);
            return {
                code: input.code,
                metadata: input.metadata,
                success: false,
                error: prettierError.toProcessingError(),
            };
        }
    }
    /**
     * Detect the best parser for the code
     */
    async detectParser(code, fileName) {
        // Use filename extension if available
        if (fileName) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            switch (ext) {
                case 'ts':
                    return 'typescript';
                case 'tsx':
                    return 'typescript';
                case 'jsx':
                    return 'babel';
                case 'js':
                case 'mjs':
                case 'cjs':
                default:
                    // Continue to content-based detection
                    break;
            }
        }
        // Content-based parser detection
        try {
            // Check for TypeScript syntax
            if (this.hasTypeScriptSyntax(code)) {
                return 'typescript';
            }
            // Check for JSX syntax
            if (this.hasJSXSyntax(code)) {
                return 'babel';
            }
            // Try to get parser info from Prettier
            const fileInfo = await prettier.getFileInfo('temp.js');
            return fileInfo.inferredParser || 'babel';
        }
        catch {
            // Fallback to babel parser
            return 'babel';
        }
    }
    /**
     * Check if code contains TypeScript syntax
     */
    hasTypeScriptSyntax(code) {
        const tsPatterns = [
            /:\s*\w+(\[\])?(\s*\|\s*\w+)*\s*[=;,)]/, // Type annotations
            /interface\s+\w+/, // Interfaces
            /type\s+\w+\s*=/, // Type aliases
            /enum\s+\w+/, // Enums
            /<\w+>/, // Generic types
            /\w+\?\s*:/, // Optional properties
            /public\s+|private\s+|protected\s+/, // Access modifiers
        ];
        return tsPatterns.some(pattern => pattern.test(code));
    }
    /**
     * Check if code contains JSX syntax
     */
    hasJSXSyntax(code) {
        const _jsxPatterns = [
            /<\w+.*?>/, // JSX elements
            /<\/\w+>/, // JSX closing tags
            /{.*?}/, // JSX expressions (broad check)
            /className\s*=/, // JSX className
            /onClick\s*=/, // JSX event handlers
        ];
        // More conservative JSX detection
        return /(<\w+[^>]*>|<\/\w+>)/.test(code) &&
            !/^\s*<!--/.test(code.trim()); // Not HTML comment
    }
    /**
     * Format code with retry logic for different parsers
     */
    async formatWithRetry(code, options, maxAttempts = 3) {
        const parsers = [options.parser, 'babel', 'babel-flow', 'acorn', 'espree'];
        let lastError;
        for (let attempt = 0; attempt < maxAttempts && attempt < parsers.length; attempt++) {
            const parser = parsers[attempt];
            if (!parser)
                continue;
            try {
                const result = await prettier.format(code, {
                    ...options,
                    parser,
                });
                if (attempt > 0) {
                    console.warn(`⚠️  Prettier succeeded with fallback parser: ${parser}`);
                }
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxAttempts - 1) {
                    console.warn(`⚠️  Prettier failed with parser '${parser}', trying next parser...`);
                }
            }
        }
        throw new PrettierError(`Failed with all parsers. Last error: ${lastError?.message}`, lastError);
    }
    /**
     * Calculate formatting metrics
     */
    calculateMetrics(original, formatted) {
        const originalLines = original.split('\n').length;
        const formattedLines = formatted.split('\n').length;
        return {
            originalLines,
            formattedLines,
            linesDifference: formattedLines - originalLines,
            originalLength: original.length,
            formattedLength: formatted.length,
            lengthDifference: formatted.length - original.length,
            compressionRatio: original.length > 0 ? formatted.length / original.length : 1,
        };
    }
    /**
     * Check if code is likely already formatted
     */
    async isAlreadyFormatted(code) {
        try {
            // Quick check - format and compare
            const formatted = await prettier.format(code, {
                parser: this.options.parser,
                printWidth: this.options.printWidth,
                tabWidth: this.options.tabWidth,
                useTabs: this.options.useTabs,
                semi: this.options.semi,
                singleQuote: this.options.singleQuote,
                trailingComma: this.options.trailingComma,
            });
            // Compare normalized versions (removing slight whitespace differences)
            const normalize = (str) => str.replace(/\s+/g, ' ').trim();
            return normalize(code) === normalize(formatted);
        }
        catch {
            // If formatting fails, assume it needs formatting
            return false;
        }
    }
    /**
     * Get supported file extensions
     */
    getSupportedExtensions() {
        return [
            '.js', '.jsx', '.mjs', '.cjs',
            '.ts', '.tsx',
            '.json',
            '.vue',
            '.html', '.htm',
            '.css', '.scss', '.less',
            '.md', '.markdown',
            '.yaml', '.yml',
        ];
    }
    /**
     * Validate Prettier options
     */
    validateOptions(options) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
        };
        // Validate print width
        if (options.printWidth && (options.printWidth < 20 || options.printWidth > 500)) {
            result.valid = false;
            result.errors.push('Print width must be between 20 and 500');
        }
        // Validate tab width
        if (options.tabWidth && (options.tabWidth < 1 || options.tabWidth > 20)) {
            result.valid = false;
            result.errors.push('Tab width must be between 1 and 20');
        }
        // Validate parser
        const supportedParsers = [
            'babel', 'babel-flow', 'babel-ts', 'flow', 'typescript',
            'acorn', 'espree', 'meriyah', 'css', 'scss', 'less',
            'html', 'vue', 'angular', 'json', 'json5', 'yaml', 'markdown'
        ];
        if (options.parser && !supportedParsers.includes(options.parser)) {
            result.valid = false;
            result.errors.push(`Unsupported parser: ${options.parser}`);
        }
        // Warnings for potentially problematic settings
        if (options.printWidth && options.printWidth > 120) {
            result.warnings.push('Very wide print width may reduce readability');
        }
        if (options.tabWidth && options.tabWidth > 4) {
            result.warnings.push('Large tab width may cause excessive indentation');
        }
        return result;
    }
    /**
     * Update transformer options
     */
    updateOptions(options) {
        this.options = { ...this.options, ...options };
    }
    /**
     * Get current options
     */
    getOptions() {
        return { ...this.options };
    }
    /**
     * Get Prettier version info
     */
    async getVersionInfo() {
        try {
            const supportInfo = await prettier.getSupportInfo();
            return {
                version: '3.0.0', // supportInfo.version,
                supportedLanguages: supportInfo.languages.map(lang => lang.name),
            };
        }
        catch {
            return {
                version: 'unknown',
                supportedLanguages: ['JavaScript', 'TypeScript', 'JSON', 'CSS', 'HTML', 'Markdown'],
            };
        }
    }
}
//# sourceMappingURL=prettier.js.map