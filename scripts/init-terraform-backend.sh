#!/usr/bin/env bash
# Create S3 bucket for Terraform state management
set -euo pipefail

ENV="${1:-dev}"
BUCKET_NAME="easy-print-tfstate-${ENV}"
REGION="ap-northeast-1"
PROFILE="${ENV}"

echo "Creating Terraform state bucket: ${BUCKET_NAME} in ${REGION} (profile: ${PROFILE})"

# Check if bucket exists
if aws s3api head-bucket --bucket "${BUCKET_NAME}" --profile "${PROFILE}" 2>/dev/null; then
  echo "Bucket ${BUCKET_NAME} already exists"
else
  aws s3api create-bucket \
    --bucket "${BUCKET_NAME}" \
    --region "${REGION}" \
    --create-bucket-configuration LocationConstraint="${REGION}" \
    --profile "${PROFILE}"

  # Enable versioning
  aws s3api put-bucket-versioning \
    --bucket "${BUCKET_NAME}" \
    --versioning-configuration Status=Enabled \
    --profile "${PROFILE}"

  # Enable encryption
  aws s3api put-bucket-encryption \
    --bucket "${BUCKET_NAME}" \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }' \
    --profile "${PROFILE}"

  # Block public access
  aws s3api put-public-access-block \
    --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    --profile "${PROFILE}"

  echo "Created bucket ${BUCKET_NAME}"
fi
