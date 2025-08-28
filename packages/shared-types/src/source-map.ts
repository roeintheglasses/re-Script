/**
 * Source map types and interfaces
 */

export interface SourceMapData {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
  sourcesContent?: string[];
}