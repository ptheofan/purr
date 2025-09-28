import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { printSchema } from 'graphql';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateSchema() {
  // Create the application context but don't listen
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable logging during schema generation
  });

  // Initialize the application to trigger schema generation
  await app.init();

  // Get the GraphQL schema
  const gqlSchemaHost = app.get(GraphQLSchemaHost);
  const schema = gqlSchemaHost.schema;

  // Write schema to file
  const schemaPath = join(process.cwd(), 'src/schema.gql');
  writeFileSync(schemaPath, printSchema(schema));

  console.log('GraphQL schema generated successfully at:', schemaPath);

  // Close the application
  await app.close();
}

// Run the schema generation
generateSchema().catch((error) => {
  console.error('Failed to generate schema:', error);
  process.exit(1);
});