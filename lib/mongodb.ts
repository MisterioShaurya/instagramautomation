import mongoose from 'mongoose'

/**
 * Connect to MongoDB.
 * Lazily connects — safe to import during build/static generation.
 * The actual connection only happens when `connectDB()` is first awaited.
 */
let cached: Promise<typeof mongoose> | null = null

export async function connectDB(): Promise<typeof mongoose> {
  if (cached) return cached

  const MONGODB_URI = process.env.MONGODB_URI

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable')
  }

  if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new Error(
      `Invalid MongoDB URI scheme. Expected "mongodb://" or "mongodb+srv://".`
    )
  }

  cached = mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
  })

  return cached
}

// Keep a default export that's a plain promise that errors if awaited before connectDB
const clientPromise = {
  then(onfulfilled?: any, onrejected?: any) {
    return connectDB()
      .then((m) => m.connection.getClient())
      .then(onfulfilled)
      .catch(onrejected)
  },
  catch(onrejected?: any) {
    return connectDB()
      .then((m) => m.connection.getClient())
      .catch(onrejected)
  },
  finally(onfinally?: any) {
    return connectDB()
      .then((m) => m.connection.getClient())
      .finally(onfinally)
  },
  [Symbol.toStringTag]: 'Promise',
}

export default clientPromise as unknown as Promise<any>