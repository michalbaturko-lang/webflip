/**
 * Remotion Lambda Render Function
 *
 * Provides a high-level interface for rendering videos on AWS Lambda.
 * This is a wrapper around renderMediaOnLambda from @remotion/lambda-client.
 *
 * Usage:
 *   const result = await renderVideoOnLambda(props);
 *   console.log(result.videoUrl); // S3 URL to the rendered MP4
 */

import { renderMediaOnLambda } from "@remotion/lambda-client";
import type { RenderMediaOnLambdaInput } from "@remotion/lambda-client";
import { LAMBDA_REGION } from "./lambda";
import type { OutreachVideoProps } from "./Video";

export interface RenderOptions {
  /**
   * Custom Lambda function name
   * Defaults to environment variable REMOTION_LAMBDA_FUNCTION_NAME
   */
  functionName?: string;

  /**
   * Custom serve URL for the site bundle
   * Defaults to environment variable REMOTION_SERVE_URL
   */
  serveUrl?: string;

  /**
   * Custom S3 bucket for output
   * Defaults to environment variable REMOTION_S3_BUCKET
   */
  bucketName?: string;

  /**
   * Custom S3 key prefix for output
   * Defaults to "rendered-videos/"
   */
  outputPrefix?: string;
}

export interface RenderResult {
  videoUrl: string;
  renderId: string;
}

/**
 * Render a video on Remotion Lambda
 *
 * @param props - OutreachVideoProps with company/design data
 * @param options - Render configuration
 * @returns Promise<RenderResult> with S3 video URL
 *
 * @throws Error if Lambda configuration is missing
 * @throws Error if render fails
 */
export async function renderVideoOnLambda(
  props: OutreachVideoProps,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const functionName =
    options.functionName || process.env.REMOTION_LAMBDA_FUNCTION_NAME;
  const serveUrl =
    options.serveUrl || process.env.REMOTION_SERVE_URL;
  const bucketName =
    options.bucketName || process.env.REMOTION_S3_BUCKET;
  const outputPrefix = options.outputPrefix || "rendered-videos/";

  if (!functionName) {
    throw new Error(
      "Lambda function name not configured. Set REMOTION_LAMBDA_FUNCTION_NAME env var."
    );
  }

  if (!serveUrl) {
    throw new Error(
      "Serve URL not configured. Set REMOTION_SERVE_URL env var or deploy Lambda first."
    );
  }

  if (!bucketName) {
    throw new Error(
      "S3 bucket not configured. Set REMOTION_S3_BUCKET env var."
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outName = `${outputPrefix}${props.companyDomain}-${timestamp}.mp4`;

  console.log(`🎬 Rendering video for ${props.companyDomain}...`);
  console.log(`   Function: ${functionName}`);
  console.log(`   Output: ${bucketName}/${outName}`);

  try {
    // Trigger the render via Remotion Lambda Client
    const renderInput: RenderMediaOnLambdaInput = {
      composition: "WebflipperVideo",
      functionName,
      region: LAMBDA_REGION,
      serveUrl,
      inputProps: props,
      codec: "h264",
      imageFormat: "jpeg",
      jpegQuality: 90,
      crf: 23,
      outName,
      forceBucketName: bucketName,
      maxRetries: 3,
      timeoutInMilliseconds: 240_000,
    };

    const renderResult = await renderMediaOnLambda(renderInput);

    console.log(`✅ Render submitted`);
    console.log(`   Render ID: ${renderResult.renderId}`);

    // Construct S3 URL
    const videoUrl = `https://${renderResult.bucketName}.s3.${LAMBDA_REGION}.amazonaws.com/${outName}`;

    return {
      videoUrl,
      renderId: renderResult.renderId,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ Render failed: ${errorMessage}`);
    throw new Error(
      `Lambda render failed for ${props.companyDomain}: ${errorMessage}`
    );
  }
}
