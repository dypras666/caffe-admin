#!/bin/bash
S3_ENV="
STORAGE_DRIVER=s3
STORAGE_S3_ENDPOINT=https://is3.cloudhost.id
STORAGE_S3_REGION=id
STORAGE_S3_KEY=IPDBMUDR80XHVFNKJIIS
STORAGE_S3_SECRET=39hbxo1CifB8gFV2TSBJEdLA3D1P3Q3oG81JT0lA
STORAGE_S3_BUCKET=akas
STORAGE_S3_URL=https://akas.is3.cloudhost.id
"

# 1. Add to provisioner.js
sed -i '' -e 's|PRICING_TIER=${tenant?.pricing_tier || '"'"'free'"'"'}\\n`;|PRICING_TIER=${tenant?.pricing_tier || '"'"'free'"'"'}\\nSTORAGE_DRIVER=s3\\nSTORAGE_S3_ENDPOINT=https://is3.cloudhost.id\\nSTORAGE_S3_REGION=id\\nSTORAGE_S3_KEY=IPDBMUDR80XHVFNKJIIS\\nSTORAGE_S3_SECRET=39hbxo1CifB8gFV2TSBJEdLA3D1P3Q3oG81JT0lA\\nSTORAGE_S3_BUCKET=akas\\nSTORAGE_S3_URL=https://akas.is3.cloudhost.id\\n`;|g' /Users/azzura/development/cafe-registry/services/provisioner.js
