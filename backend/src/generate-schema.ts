import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateSchema() {
  // Create the application context but don't listen
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable logging during schema generation
  });

  // Initialize the application to trigger schema generation
  await app.init();

  console.log('GraphQL schema generated successfully');

  // Close the application
  await app.close();
}

// Run the schema generation
generateSchema().catch((error) => {
  console.error('Failed to generate schema:', error);
  process.exit(1);
});