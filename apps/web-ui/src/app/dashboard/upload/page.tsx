'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CogIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileUpload } from '@/components/ui/FileUpload';
import { apiClient } from '@/lib/api';

interface ProviderConfig {
  provider: {
    name: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };
  options: {
    temperature: number;
    maxTokens: number;
    timeout: number;
    cacheEnabled: boolean;
  };
  processing: {
    chunkSize: number;
    maxConcurrency: number;
    enableWebcrack: boolean;
    enableBabel: boolean;
    enableLlm: boolean;
    enablePrettier: boolean;
  };
}

const defaultConfig: ProviderConfig = {
  provider: {
    name: 'anthropic',
    model: 'claude-3-sonnet-20240229',
  },
  options: {
    temperature: 0.1,
    maxTokens: 4096,
    timeout: 30000,
    cacheEnabled: true,
  },
  processing: {
    chunkSize: 2000,
    maxConcurrency: 3,
    enableWebcrack: true,
    enableBabel: true,
    enableLlm: true,
    enablePrettier: true,
  },
};

export default function UploadPage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<ProviderConfig>(defaultConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setError(null);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to process');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Create FormData with files and config
      const formData = new FormData();
      
      // Add files
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Add configuration
      formData.append('config', JSON.stringify(config));

      // Submit job
      const response = await apiClient.createJob(formData);
      const jobId = (response as any).job.id;

      // Redirect to jobs page to monitor progress
      router.push(`/jobs?highlight=${jobId}`);
      
    } catch (err) {
      console.error('Failed to submit job:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProviderConfig = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      provider: {
        ...prev.provider,
        [field]: value,
      },
    }));
  };

  const updateOptionsConfig = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [field]: value,
      },
    }));
  };

  const updateProcessingConfig = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      processing: {
        ...prev.processing,
        [field]: value,
      },
    }));
  };

  return (
    <DashboardLayout title="Upload Files" subtitle="Upload and process JavaScript files">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* File Upload Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-secondary-900">Select Files</h3>
            <p className="text-sm text-secondary-600">
              Upload JavaScript files (.js, .mjs, .cjs) to deobfuscate and unminify
            </p>
          </div>
          <div className="card-content">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              acceptedFileTypes={['.js', '.mjs', '.cjs']}
              maxFiles={10}
              maxFileSize={10 * 1024 * 1024} // 10MB
              multiple={true}
            />
          </div>
        </div>

        {/* Configuration Section */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <CogIcon className="h-5 w-5 text-secondary-400 mr-2" />
              <h3 className="text-lg font-medium text-secondary-900">Processing Configuration</h3>
            </div>
          </div>
          <div className="card-content space-y-6">
            {/* Provider Configuration */}
            <div>
              <h4 className="text-md font-medium text-secondary-900 mb-4">Provider Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Provider
                  </label>
                  <select
                    value={config.provider.name}
                    onChange={(e) => updateProviderConfig('name', e.target.value)}
                    className="input w-full"
                  >
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Model
                  </label>
                  <select
                    value={config.provider.model}
                    onChange={(e) => updateProviderConfig('model', e.target.value)}
                    className="input w-full"
                  >
                    {config.provider.name === 'anthropic' && (
                      <>
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      </>
                    )}
                    {config.provider.name === 'openai' && (
                      <>
                        <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                    {config.provider.name === 'ollama' && (
                      <>
                        <option value="llama2">Llama 2</option>
                        <option value="codellama">Code Llama</option>
                        <option value="mistral">Mistral</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Processing Options */}
            <div>
              <h4 className="text-md font-medium text-secondary-900 mb-4">Processing Options</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Temperature ({config.options.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.options.temperature}
                    onChange={(e) => updateOptionsConfig('temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-secondary-500 mt-1">
                    <span>Conservative</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="1024"
                    max="8192"
                    step="256"
                    value={config.options.maxTokens}
                    onChange={(e) => updateOptionsConfig('maxTokens', parseInt(e.target.value))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Chunk Size (characters)
                  </label>
                  <input
                    type="number"
                    min="500"
                    max="5000"
                    step="100"
                    value={config.processing.chunkSize}
                    onChange={(e) => updateProcessingConfig('chunkSize', parseInt(e.target.value))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Max Concurrency
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.processing.maxConcurrency}
                    onChange={(e) => updateProcessingConfig('maxConcurrency', parseInt(e.target.value))}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>

            {/* Processing Pipeline */}
            <div>
              <h4 className="text-md font-medium text-secondary-900 mb-4">Processing Pipeline</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.processing.enableWebcrack}
                      onChange={(e) => updateProcessingConfig('enableWebcrack', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-secondary-700">Enable Webcrack (Deobfuscation)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.processing.enableBabel}
                      onChange={(e) => updateProcessingConfig('enableBabel', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-secondary-700">Enable Babel (AST Transformations)</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.processing.enableLlm}
                      onChange={(e) => updateProcessingConfig('enableLlm', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-secondary-700">Enable LLM (Variable Renaming)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.processing.enablePrettier}
                      onChange={(e) => updateProcessingConfig('enablePrettier', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-secondary-700">Enable Prettier (Code Formatting)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Cache Option */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.options.cacheEnabled}
                  onChange={(e) => updateOptionsConfig('cacheEnabled', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-secondary-700">Enable response caching (recommended for cost savings)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-error-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800">Error</h3>
                <p className="mt-2 text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Section */}
        <div className="card">
          <div className="card-content">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-secondary-900">
                  Ready to Process
                </p>
                <p className="text-sm text-secondary-600">
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected`
                    : 'No files selected'
                  }
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={selectedFiles.length === 0 || isSubmitting}
                className="btn btn-primary btn-lg flex items-center"
              >
                <RocketLaunchIcon className="h-5 w-5 mr-2" />
                {isSubmitting ? 'Processing...' : 'Start Processing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}