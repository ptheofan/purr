import * as path from 'path'
import * as fs from 'fs'
import { fileExistsSync } from 'tsconfig-paths/lib/filesystem'

const envFiles = ['.env', process.env.NODE_ENV && `.env.${ process.env.NODE_ENV }`, '.env.local'];

function isMonorepoRoot(directory: string): boolean {
  try {
    const packageJsonPath = path.resolve(directory, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Check for monorepo identifiers
    return (
      packageJson.name === '@purr/monorepo' || // Your specific monorepo name
      (Array.isArray(packageJson.workspaces) && packageJson.workspaces.includes('backend')) // Has workspaces array with backend
    );
  } catch (error) {
    console.error('Error reading package.json:', error);
    return false;
  }
}

export function getEnvFilePaths(): string[] {
  let currentDir = process.cwd();
  let projectRoot = null;

  while (currentDir !== path.parse(currentDir).root) {
    if (isMonorepoRoot(currentDir)) {
      projectRoot = currentDir;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  if (!projectRoot) {
    console.warn('Could not find monorepo root with @purr/monorepo package.json');
    return [];
  }

  const paths = [];
  for (const envFile of envFiles) {
    if(!envFile) continue;
    const filePath = path.resolve(projectRoot, envFile);
    if (fileExistsSync(filePath)) {
      paths.push(filePath);
    }
  }

  return paths;
}
