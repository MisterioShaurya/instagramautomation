import mongoose from 'mongoose'

/**
 * Connect to MongoDB.
 * Lazily connects — safe to import during build/static generation.
 * Retries on failure so transient connection issues don't permanently break.
 * 
 * IMPORTANT: bufferCommands is NOT set globally. It's only set in the connection
 * options. This allows Mongoose to buffer (queue) model operations if they're
 * called before the connection is fully established, preventing the
 * "Cannot call X before initial connection is complete" error.
 */
let cached: Promise<typeof mongoose> | null = null
let lastError: Error | null = null
let connectionReady = false

export async function connectDB(): Promise<typeof mongoose> {
  // If already connected, return immediately
  if (connectionReady && mongoose.connection.readyState === 1) {
    return mongoose
  }

  // If we have a cached promise, wait for it
  if (cached) {
    try {
      const m = await cached
      if (mongoose.connection.readyState === 1) {
        connectionReady = true
        return m
      }
    } catch {
      // Cached promise rejected, clear it and retry
      cached = null
      connectionReady = false
    }
  }

  // If we previously failed, clear the error so we retry
  lastError = null

  const MONGODB_URI = process.env.MONGODB_URI

  if (!MONGODB_URI) {
    lastError = new Error('Please define the MONGODB_URI environment variable')
    throw lastError
  }

  if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
    lastError = new Error(
      `Invalid MongoDB URI scheme. Expected "mongodb://" or "mongodb+srv://".`
    )
    throw lastError
  }

  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    connectionReady = true
    cached = Promise.resolve(mongoose)
    return cached
  }

  // Initiate connection — bufferCommands: true (default) so model operations
  // are queued until connection is established
  cached = mongoose.connect(MONGODB_URI, {
    bufferCommands: true,
    serverSelectionTimeoutMS: 10000, // 10s timeout for server selection
    connectTimeoutMS: 10000,
  }).then((m) => {
    connectionReady = true
    console.log('[mongodb] Connected successfully')
    return m
  })

  // If connection fails, clear cache so next call retries
  cached.catch((err) => {
    console.error('[mongodb] Connection failed:', err.message)
    lastError = err
    cached = null
    connectionReady = false
  })

  return cached
}

// Thenable default export for backward compatibility with `await clientPromise`
const clientPromise = {
  then(onfulfilled?: any, onrejected?: any) {
    return connectDB()
      .then((m) => m.connection.getClient())
      .then((c) => (onfulfilled ? onfulfilled(c) : c))
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