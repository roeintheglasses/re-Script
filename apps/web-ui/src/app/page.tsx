'use client';

import React from 'react';
import { ArrowRightIcon, CodeBracketIcon, CpuChipIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Header */}
      <header className="relative overflow-hidden bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CodeBracketIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-secondary-900">Re-Script</h1>
                <p className="text-sm text-secondary-600">AI-Powered Code Transformation</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/dashboard" className="text-secondary-700 hover:text-primary-600 transition-colors">
                Dashboard
              </Link>
              <Link href="/jobs" className="text-secondary-700 hover:text-primary-600 transition-colors">
                Jobs
              </Link>
              <Link href="/docs" className="text-secondary-700 hover:text-primary-600 transition-colors">
                Documentation
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6">
              Transform{' '}
              <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                Minified Code
              </span>
              <br />
              Into Readable JavaScript
            </h1>
            <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto">
              Advanced LLM-powered JavaScript unminifier and deobfuscator that transforms compressed, 
              obfuscated code into clean, readable, and maintainable JavaScript with intelligent 
              variable renaming and structure recovery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/dashboard"
                className="btn btn-primary btn-lg inline-flex items-center"
              >
                Get Started
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                href="/demo"
                className="btn btn-outline btn-lg"
              >
                View Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-secondary-900 mb-4">
                Powerful Features
              </h2>
              <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
                Advanced AI algorithms combined with proven static analysis techniques 
                for superior code transformation results.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <SparklesIcon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  AI-Powered Renaming
                </h3>
                <p className="text-secondary-600">
                  Advanced language models intelligently rename variables and functions 
                  based on their context and usage patterns.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 rounded-full mb-4">
                  <CpuChipIcon className="h-8 w-8 text-success-600" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  Multi-Step Pipeline
                </h3>
                <p className="text-secondary-600">
                  Four-stage processing pipeline: deobfuscation, AST transformation, 
                  AI enhancement, and code formatting.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-warning-100 rounded-full mb-4">
                  <CodeBracketIcon className="h-8 w-8 text-warning-600" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                  Real-time Processing
                </h3>
                <p className="text-secondary-600">
                  Live progress tracking with Server-Sent Events and detailed 
                  processing metrics for transparency.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-primary-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your Code?
            </h2>
            <p className="text-xl text-primary-200 mb-8 max-w-2xl mx-auto">
              Upload your minified JavaScript files and watch them transform 
              into clean, readable code in minutes.
            </p>
            <Link 
              href="/dashboard"
              className="inline-flex items-center px-8 py-3 text-lg font-medium text-primary-600 bg-white rounded-md hover:bg-primary-50 transition-colors"
            >
              Start Processing
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <CodeBracketIcon className="h-6 w-6 text-primary-400" />
                <span className="ml-2 text-lg font-semibold">Re-Script</span>
              </div>
              <p className="text-secondary-400 text-sm">
                Advanced AI-powered JavaScript transformation platform for 
                developers and security researchers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-secondary-800 mt-8 pt-8 text-center text-sm text-secondary-400">
            <p>&copy; 2024 Re-Script. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}