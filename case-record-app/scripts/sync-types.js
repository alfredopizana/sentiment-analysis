#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sharedTypesPath = path.join(__dirname, '../shared/types/index.ts');
const clientTypesPath = path.join(__dirname, '../client/src/types/index.ts');
const serverTypesPath = path.join(__dirname, '../server/src/types/index.ts');

function syncTypes() {
  try {
    // Read the shared types file
    const sharedTypes = fs.readFileSync(sharedTypesPath, 'utf8');
    
    // Write to client types
    fs.writeFileSync(clientTypesPath, sharedTypes);
    
    // Write to server types
    fs.writeFileSync(serverTypesPath, sharedTypes);
    
    console.log('✅ Types synced successfully!');
    console.log(`📁 Source: ${sharedTypesPath}`);
    console.log(`📁 Client: ${clientTypesPath}`);
    console.log(`📁 Server: ${serverTypesPath}`);
  } catch (error) {
    console.error('❌ Error syncing types:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncTypes();
