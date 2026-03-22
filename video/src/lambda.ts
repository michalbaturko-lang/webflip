/**
 * Remotion Lambda Configuration
 *
 * This module provides configuration for deploying the Remotion Lambda function
 * for scalable video rendering.
 *
 * Configuration:
 * - Region: eu-central-1 (Frankfurt — closest to CZ customers)
 * - Memory: 2048MB (sufficient for 1920x1080 30fps video rendering)
 * - Timeout: 240s (4 min — video is 86s, rendering takes ~2-3 min)
 * - Disk: 2048MB (for temporary rendering artifacts)
 *
 * Environment:
 * AWS_ACCESS_KEY_ID - AWS IAM credentials
 * AWS_SECRET_ACCESS_KEY - AWS IAM credentials
 * AWS_REGION - AWS region (eu-central-1)
 */

import {
  deploySite,
  deployFunction,
  getOrCreateBucket,
  type AwsRegion,
} from "@remotion/lambda";

export const LAMBDA_REGION = (process.env.AWS_REGION ?? "eu-central-1") as AwsRegion;

/**
 * Deploy the Remotion Lambda infrastructure
 *
 * Steps:
 * 1. Get or create the S3 bucket for storing the site bundle and rendered videos
 * 2. Deploy the Remotion site bundle (contains the WebflipperVideo composition)
 * 3. Deploy the Lambda function with configured settings
 * 4. Return function name for rendering
 *
 * Returns deployment information needed for rendering
 */
export async function deployRemotionInfrastructure() {
  console.log(`🚀 Deploying Remotion Lambda to ${LAMBDA_REGION}...`);

  try {
    // Get or create S3 bucket
    const bucketOutput = await getOrCreateBucket({
      region: LAMBDA_REGION,
    });

    const bucketName = bucketOutput.bucketName;
    console.log(`✅ S3 bucket ready: ${bucketName}`);

    // Deploy the site bundle (WebflipperVideo composition)
    const siteOutput = await deploySite({
      bucketName,
      entryPoint: require.resolve("./index.ts"),
      region: LAMBDA_REGION,
    });

    const serveUrl = siteOutput.serveUrl;
    console.log(`✅ Site bundle deployed`);

    // Deploy the Lambda function
    const functionOutput = await deployFunction({
      region: LAMBDA_REGION,
      createCloudWatchLogGroup: true,
      cloudWatchLogRetentionPeriodInDays: 7,
      memorySizeInMb: 2048,
      timeoutInSeconds: 240,
      diskSizeInMb: 2048,
    });

    const functionName = functionOutput.functionName;
    console.log(`✅ Lambda function deployed`);

    // Output deployment info
    console.log("\n✨ Deployment complete!");
    console.log(`📍 Region: ${LAMBDA_REGION}`);
    console.log(`💾 Bucket: ${bucketName}`);
    console.log(`🌐 Serve URL: ${serveUrl}`);
    console.log(`⚙️  Function: ${functionName}`);

    return {
      bucketName,
      serveUrl,
      functionName,
    };
  } catch (err) {
    console.error("❌ Deployment failed:", err);
    throw err;
  }
}
