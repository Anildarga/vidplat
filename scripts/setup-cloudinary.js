#!/usr/bin/env node

/**
 * Cloudinary Auto-Upload Mapping Setup Script
 * 
 * This script configures auto-upload mappings in Cloudinary
 * Run with: node scripts/setup-cloudinary.js
 */

const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: '.env' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function listUploadMappings() {
  try {
    const result = await cloudinary.api.upload_mappings();
    console.log('Current upload mappings:', result);
    return result;
  } catch (error) {
    console.error('Error listing upload mappings:', error.message);
    return null;
  }
}

async function createUploadMapping(folderName, templateUrl) {
  try {
    console.log(`Creating auto-upload mapping for folder: ${folderName}`);
    console.log(`Template URL: ${templateUrl}`);
    
    const result = await cloudinary.api.create_upload_mapping(folderName, {
      template: templateUrl
    });
    
    console.log('✅ Auto-upload mapping created successfully:', result);
    return result;
  } catch (error) {
    if (error.error && error.error.message === 'Mapping already exists') {
      console.log(`⚠️  Mapping "${folderName}" already exists. Updating instead...`);
      return await updateUploadMapping(folderName, templateUrl);
    }
    console.error('❌ Error creating upload mapping:', error.message);
    return null;
  }
}

async function updateUploadMapping(folderName, templateUrl) {
  try {
    const result = await cloudinary.api.update_upload_mapping(folderName, {
      template: templateUrl
    });
    
    console.log('✅ Auto-upload mapping updated successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error updating upload mapping:', error.message);
    return null;
  }
}

async function deleteUploadMapping(folderName) {
  try {
    const result = await cloudinary.api.delete_upload_mapping(folderName);
    console.log('✅ Auto-upload mapping deleted successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error deleting upload mapping:', error.message);
    return null;
  }
}

async function setupDefaultMappings() {
  console.log('🚀 Setting up default Cloudinary auto-upload mappings...\n');
  
  // Check credentials
  if (!process.env.CLOUDINARY_CLOUD_NAME || 
      !process.env.CLOUDINARY_API_KEY || 
      !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary credentials not found in .env file');
    console.error('Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file');
    process.exit(1);
  }
  
  console.log(`Using Cloudinary cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  
  // List existing mappings first
  await listUploadMappings();
  
  // Define mappings to create
  const mappings = [
    {
      folder: 'eduplat/videos',
      template: 'http://localhost:3000/uploads/{filename}',
      description: 'Local development uploads folder'
    },
    {
      folder: 'eduplat/images',
      template: 'http://localhost:3000/uploads/{filename}',
      description: 'Local development images folder'
    }
    // Add S3 mapping example (commented out)
    // {
    //   folder: 'eduplat/s3-videos',
    //   template: 's3://your-bucket-name/videos/{filename}',
    //   description: 'S3 bucket for video storage'
    // }
  ];
  
  console.log('\n📁 Setting up mappings:');
  for (const mapping of mappings) {
    console.log(`\n--- Setting up: ${mapping.folder} ---`);
    console.log(`Description: ${mapping.description}`);
    await createUploadMapping(mapping.folder, mapping.template);
  }
  
  console.log('\n✅ Setup complete!');
  console.log('\n📋 Summary of configured mappings:');
  await listUploadMappings();
  
  console.log('\n💡 Usage examples:');
  console.log('1. Access a local video via Cloudinary:');
  console.log(`   https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/eduplat/videos/example.mp4`);
  console.log('\n2. This will automatically fetch from:');
  console.log('   http://localhost:3000/uploads/example.mp4');
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list':
      await listUploadMappings();
      break;
      
    case 'create':
      if (args.length < 3) {
        console.error('Usage: node setup-cloudinary.js create <folderName> <templateUrl>');
        process.exit(1);
      }
      await createUploadMapping(args[1], args[2]);
      break;
      
    case 'update':
      if (args.length < 3) {
        console.error('Usage: node setup-cloudinary.js update <folderName> <templateUrl>');
        process.exit(1);
      }
      await updateUploadMapping(args[1], args[2]);
      break;
      
    case 'delete':
      if (args.length < 2) {
        console.error('Usage: node setup-cloudinary.js delete <folderName>');
        process.exit(1);
      }
      await deleteUploadMapping(args[1]);
      break;
      
    case 'setup':
    default:
      await setupDefaultMappings();
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  listUploadMappings,
  createUploadMapping,
  updateUploadMapping,
  deleteUploadMapping,
  setupDefaultMappings
};