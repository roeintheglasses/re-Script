/**
 * Validation commands for files and configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFile, stat } from 'fs/promises';
import { extname, resolve } from 'path';
import { parse } from '@babel/core';

export const validateCommand = new Command('validate')
  .description('Validate files and configuration');

// Validate JavaScript files
validateCommand
  .command('js <files...>')
  .description('Validate JavaScript files for syntax errors')
  .option('--parser <parser>', 'Babel parser to use', 'babel')
  .option('--show-errors', 'show detailed error information')
  .action(async (files, options) => {
    let totalFiles = 0;
    let validFiles = 0;
    let invalidFiles = 0;
    
    console.log(chalk.bold('🔍 Validating JavaScript files...\n'));
    
    for (const file of files) {
      totalFiles++;
      const filePath = resolve(file);
      
      try {
        const fileStats = await stat(filePath);
        if (!fileStats.isFile()) {
          console.log(`${chalk.red('❌')} ${file} - Not a file`);
          invalidFiles++;
          continue;
        }
        
        // Check file extension
        const ext = extname(filePath).toLowerCase();
        if (!['.js', '.mjs', '.cjs'].includes(ext)) {
          console.log(`${chalk.yellow('⚠️ ')} ${file} - Unsupported extension: ${ext}`);
          invalidFiles++;
          continue;
        }
        
        // Read and parse file
        const content = await readFile(filePath, 'utf8');
        
        if (content.trim().length === 0) {
          console.log(`${chalk.yellow('⚠️ ')} ${file} - Empty file`);
          invalidFiles++;
          continue;
        }
        
        // Parse with Babel
        const ast = parse(content, {
          sourceType: 'unambiguous',
          allowImportExportEverywhere: true,
          allowReturnOutsideFunction: true,
          strictMode: false,
          errorRecovery: false,
        });
        
        if (ast) {
          console.log(`${chalk.green('✅')} ${file} - Valid JavaScript`);
          validFiles++;
        } else {
          console.log(`${chalk.red('❌')} ${file} - Failed to parse`);
          invalidFiles++;
        }
        
      } catch (error) {
        console.log(`${chalk.red('❌')} ${file} - ${error instanceof Error ? error.message : String(error)}`);
        
        if (options.showErrors && error instanceof Error) {
          console.log(chalk.gray(`    ${error.stack}`));
        }
        
        invalidFiles++;
      }
    }
    
    // Summary
    console.log(chalk.bold('\n📊 Validation Summary:'));
    console.log(`   Total files: ${chalk.cyan(totalFiles)}`);
    console.log(`   Valid files: ${chalk.green(validFiles)}`);
    console.log(`   Invalid files: ${chalk.red(invalidFiles)}`);
    
    if (invalidFiles > 0) {
      console.log(chalk.yellow('\n💡 Some files failed validation. Check syntax errors above.'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ All files are valid!'));
    }
  });

// Validate minified code detection
validateCommand
  .command('minified <files...>')
  .description('Check if files appear to be minified')
  .option('--threshold <number>', 'line length threshold for minified detection', '200')
  .action(async (files, options) => {
    const threshold = parseInt(options.threshold);
    
    console.log(chalk.bold('🔍 Checking for minified code...\n'));
    
    for (const file of files) {
      try {
        const filePath = resolve(file);
        const content = await readFile(filePath, 'utf8');
        const lines = content.split('\n');
        
        const analysis = analyzeMinification(content, lines, threshold);
        
        if (analysis.isMinified) {
          console.log(`${chalk.red('🗜️ ')} ${file} - Appears minified`);
          console.log(chalk.gray(`    Avg line length: ${analysis.avgLineLength}`));
          console.log(chalk.gray(`    Long lines: ${analysis.longLines}/${lines.length}`));
        } else {
          console.log(`${chalk.green('📝')} ${file} - Appears readable`);
        }
        
        if (analysis.hasSourceMap) {
          console.log(chalk.blue('    🗺️  Source map detected'));
        }
        
      } catch (error) {
        console.log(`${chalk.red('❌')} ${file} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

// Validate obfuscation detection
validateCommand
  .command('obfuscated <files...>')
  .description('Check if files appear to be obfuscated')
  .action(async (files) => {
    console.log(chalk.bold('🔍 Checking for obfuscated code...\n'));
    
    for (const file of files) {
      try {
        const filePath = resolve(file);
        const content = await readFile(filePath, 'utf8');
        
        const analysis = analyzeObfuscation(content);
        
        if (analysis.isObfuscated) {
          console.log(`${chalk.red('🔒')} ${file} - Appears obfuscated`);
          console.log(chalk.gray(`    Obfuscation score: ${analysis.score.toFixed(2)}`));
          
          if (analysis.indicators.length > 0) {
            console.log(chalk.gray(`    Indicators: ${analysis.indicators.join(', ')}`));
          }
        } else {
          console.log(`${chalk.green('📖')} ${file} - Appears readable`);
        }
        
      } catch (error) {
        console.log(`${chalk.red('❌')} ${file} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

// Estimate processing complexity
validateCommand
  .command('complexity <files...>')
  .description('Estimate processing complexity and time')
  .action(async (files) => {
    console.log(chalk.bold('🔍 Analyzing processing complexity...\n'));
    
    let totalSize = 0;
    let totalLines = 0;
    
    for (const file of files) {
      try {
        const filePath = resolve(file);
        const content = await readFile(filePath, 'utf8');
        const fileStats = await stat(filePath);
        const lines = content.split('\n');
        
        totalSize += fileStats.size;
        totalLines += lines.length;
        
        const complexity = analyzeComplexity(content, lines);
        
        console.log(`📄 ${file}`);
        console.log(`   Size: ${chalk.cyan(formatBytes(fileStats.size))}`);
        console.log(`   Lines: ${chalk.cyan(lines.length)}`);
        console.log(`   Estimated tokens: ${chalk.cyan(complexity.estimatedTokens)}`);
        console.log(`   Complexity: ${getComplexityColor(complexity.score)} ${complexity.level}`);
        console.log(`   Est. processing time: ${chalk.cyan(complexity.estimatedTime)}`);
        console.log();
        
      } catch (error) {
        console.log(`${chalk.red('❌')} ${file} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Overall summary
    if (files.length > 1) {
      const totalTokens = Math.ceil(totalSize / 4); // Rough token estimation
      const estimatedCost = calculateEstimatedCost(totalTokens);
      
      console.log(chalk.bold('📊 Overall Summary:'));
      console.log(`   Total size: ${chalk.cyan(formatBytes(totalSize))}`);
      console.log(`   Total lines: ${chalk.cyan(totalLines)}`);
      console.log(`   Estimated tokens: ${chalk.cyan(totalTokens)}`);
      console.log(`   Estimated cost: ${chalk.cyan(`$${estimatedCost.toFixed(4)}`)}`);
    }
  });

// Analysis functions
function analyzeMinification(content: string, lines: string[], threshold: number) {
  const totalLength = lines.reduce((sum, line) => sum + line.length, 0);
  const avgLineLength = totalLength / lines.length;
  const longLines = lines.filter(line => line.length > threshold).length;
  const hasSourceMap = content.includes('//# sourceMappingURL=') || content.includes('//@ sourceMappingURL=');
  
  return {
    isMinified: avgLineLength > threshold || longLines > lines.length * 0.1,
    avgLineLength: Math.round(avgLineLength),
    longLines,
    hasSourceMap,
  };
}

function analyzeObfuscation(content: string) {
  const indicators = [];
  let score = 0;
  
  // Check for common obfuscation patterns
  if (/\\x[0-9a-f]{2}/gi.test(content)) {
    indicators.push('hex encoding');
    score += 20;
  }
  
  if (/\\u[0-9a-f]{4}/gi.test(content)) {
    indicators.push('unicode encoding');
    score += 15;
  }
  
  if (/eval\s*\(/gi.test(content)) {
    indicators.push('eval usage');
    score += 25;
  }
  
  if (/Function\s*\(/gi.test(content)) {
    indicators.push('Function constructor');
    score += 15;
  }
  
  // Check for very short variable names (common in obfuscation)
  const singleCharVars = (content.match(/\b[a-zA-Z_$]\b/g) || []).length;
  const totalWords = (content.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || []).length;
  
  if (totalWords > 0 && singleCharVars / totalWords > 0.3) {
    indicators.push('short variable names');
    score += 10;
  }
  
  // Check for string concatenation patterns
  if (/["'][^"']*["']\s*\+\s*["'][^"']*["']/g.test(content)) {
    indicators.push('string concatenation');
    score += 10;
  }
  
  return {
    isObfuscated: score > 30,
    score,
    indicators,
  };
}

function analyzeComplexity(content: string, lines: string[]) {
  const size = content.length;
  const estimatedTokens = Math.ceil(size / 4);
  
  let complexityScore = 0;
  
  // Base complexity from size
  if (size > 100000) complexityScore += 3;
  else if (size > 50000) complexityScore += 2;
  else if (size > 10000) complexityScore += 1;
  
  // Line count complexity
  if (lines.length > 5000) complexityScore += 2;
  else if (lines.length > 1000) complexityScore += 1;
  
  // Function count (rough estimation)
  const functionCount = (content.match(/function\s+/g) || []).length + 
                       (content.match(/=>\s*{/g) || []).length;
  if (functionCount > 100) complexityScore += 2;
  else if (functionCount > 50) complexityScore += 1;
  
  // Nesting complexity (rough estimation)
  const maxNesting = Math.max(...lines.map(line => 
    (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
  ));
  if (maxNesting > 10) complexityScore += 2;
  else if (maxNesting > 5) complexityScore += 1;
  
  let level: string;
  let estimatedTime: string;
  
  if (complexityScore >= 6) {
    level = 'Very High';
    estimatedTime = '5-15 minutes';
  } else if (complexityScore >= 4) {
    level = 'High';
    estimatedTime = '2-5 minutes';
  } else if (complexityScore >= 2) {
    level = 'Medium';
    estimatedTime = '30 seconds - 2 minutes';
  } else {
    level = 'Low';
    estimatedTime = '10-30 seconds';
  }
  
  return {
    score: complexityScore,
    level,
    estimatedTokens,
    estimatedTime,
  };
}

function getComplexityColor(score: number): string {
  if (score >= 6) return chalk.red;
  if (score >= 4) return chalk.yellow;
  if (score >= 2) return chalk.blue;
  return chalk.green;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function calculateEstimatedCost(tokens: number): number {
  // Rough cost estimation based on typical API pricing
  // This is just an estimate and may not reflect actual costs
  const inputCostPer1K = 0.01; // $0.01 per 1K tokens (example)
  const outputCostPer1K = 0.03; // $0.03 per 1K tokens (example)
  
  // Assume output is roughly 20% of input size
  const inputCost = (tokens / 1000) * inputCostPer1K;
  const outputCost = (tokens * 0.2 / 1000) * outputCostPer1K;
  
  return inputCost + outputCost;
}