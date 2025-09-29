import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

/**
 * Generate GraphQL schema file for development reference
 *
 * This script generates a schema.gql file that developers can use for:
 * - Understanding the current GraphQL API structure
 * - Validating hand-written types against the actual schema
 * - IDE autocompletion and validation in GraphQL queries
 *
 * The generated schema file is NOT used in builds - it's purely for reference.
 * Hand-written types in client/src/types/graphql.ts are the source of truth.
 */
async function generateSchema() {
  const logger = new Logger('SchemaGenerator');

  try {
    logger.log('Generating GraphQL schema for development reference...');

    // Load CI environment configuration to disable external services
    const ciEnvPath = join(process.cwd(), '..', '.env.ci');
    if (existsSync(ciEnvPath)) {
      logger.log('Loading CI environment configuration...');
      config({ path: ciEnvPath });
    } else {
      logger.warn('No .env.ci file found, using default environment');
    }

    // Create the application context but don't listen
    const app = await NestFactory.create(AppModule, {
      logger: false, // Disable logging during schema generation
      abortOnError: false, // Don't abort on service initialization errors
    });

    // Initialize the application to trigger schema generation
    await app.init();

    // Wait for GraphQL schema to be ready
    let schema;
    let attempts = 0;
    const maxAttempts = 10;

    while (!schema && attempts < maxAttempts) {
      try {
        const gqlSchemaHost = app.get(GraphQLSchemaHost);
        schema = gqlSchemaHost.schema;
        if (schema) break;
      } catch (error) {
        // Schema might not be ready yet, wait a bit
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!schema) {
      throw new Error('GraphQL schema not found');
    }

    // Write schema to file
    const schemaPath = join(process.cwd(), 'schema.gql');
    writeFileSync(schemaPath, printSchema(schema));

    logger.log('✅ GraphQL schema generated successfully at:', schemaPath);
    logger.log('📝 This file is for development reference only - not used in builds');

    // Close the application with timeout
    const closePromise = app.close();
    const closeTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('App close timed out')), 5000)
    );

    try {
      await Promise.race([closePromise, closeTimeout]);
    } catch (error) {
      logger.warn('Warning: App close timed out, forcing exit');
    }

    // Force exit to ensure the process terminates
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to generate GraphQL schema:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run the schema generation
generateSchema().catch((error) => {
  const logger = new Logger('SchemaGenerator');
  logger.error('Failed to generate schema:', error);
  process.exit(1);
});