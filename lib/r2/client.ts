import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`)
  }
  return value
}

function getS3Client() {
  const accountId = requiredEnv("R2_ACCOUNT_ID")
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const endpoint =
    process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Faltan R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY. Crea un token S3 en Cloudflare R2 (Object Read & Write).",
    )
  }

  return {
    bucket: requiredEnv("R2_BUCKET"),
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  }
}

async function streamToUint8Array(body: unknown): Promise<Uint8Array> {
  if (!body) {
    return new Uint8Array()
  }

  if (body instanceof Uint8Array) {
    return body
  }

  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body)
  }

  if (typeof body === "string") {
    return new TextEncoder().encode(body)
  }

  const chunks: Buffer[] = []
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function uploadFotoObject(input: {
  key: string
  body: Buffer | Uint8Array
  contentType: string
}) {
  const { client, bucket } = getS3Client()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  )
}

export async function deleteFotoObject(key: string) {
  const { client, bucket } = getS3Client()
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )
}

export async function getFotoObject(key: string): Promise<{
  body: Uint8Array
  contentType: string
}> {
  const { client, bucket } = getS3Client()
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )

  return {
    body: await streamToUint8Array(result.Body),
    contentType: result.ContentType || "application/octet-stream",
  }
}
