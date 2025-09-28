import { resolve, dirname, parse } from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileExistsSync } from 'tsconfig-paths/lib/filesystem';

// Environment files in order of precedence (1st file loaded last, overriding others)
const envFiles = ['.env.local', process.env.NODE_ENV && `.env.${process.env.NODE_ENV}`, '.env'];

/**
 * Checks if the given directory is the monorepo root by examining package.json
 */
function isMonorepoRoot(directory: string): boolean {
  try {
    const packageJsonPath = resolve(directory, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Check for monorepo identifiers
    return (
      packageJson.name === '@purr/monorepo' || 
      (Array.isArray(packageJson.workspaces) && packageJson.workspaces.includes('backend'))
    );
  } catch (error) {
    console.error('Error reading package.json:', error);
    return false;
  }
}

/**
 * Discovers and returns environment file paths from monorepo root
 * Searches up the directory tree to find the project root
 */
export function getEnvFilePaths(): string[] {
  let currentDir = process.cwd();
  let projectRoot: string | null = null;

  // Traverse up the directory tree to find monorepo root
  while (currentDir !== parse(currentDir).root) {
    if (isMonorepoRoot(currentDir)) {
      projectRoot = currentDir;
      break;
    }
    currentDir = dirname(currentDir);
  }

  if (!projectRoot) {
    console.warn('Could not find monorepo root with @purr/monorepo package.json');
    return [];
  }

  // Filter out falsy values and check file existence
  const paths: string[] = [];
  for (const envFile of envFiles.filter(Boolean)) {
    const filePath = resolve(projectRoot, envFile as string);
    if (fileExistsSync(filePath)) {
      paths.push(filePath);
    }
  }

  return paths;
}
