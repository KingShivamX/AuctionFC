import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb+srv://shivamhippalgave_db_user:Ymy1zITf841uZuMi@cluster0.mongodb.net/auctionfc?retryWrites=true&w=majority";

interface GlobalWithMongo {
  _mongoClientPromise?: Promise<MongoClient>;
  _inMemoryStore?: {
    users: Record<string, any>;
    leagues: Record<string, any>;
    players: Record<string, any>;
    bids: Record<string, any>;
  };
}

declare const global: GlobalWithMongo;

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  clientPromise = client.connect();
}

// In-Memory fallback store if MongoDB Atlas connection is unreachable (e.g. IP whitelist / offline dev)
if (!global._inMemoryStore) {
  global._inMemoryStore = {
    users: {},
    leagues: {},
    players: {},
    bids: {},
  };
}

export async function getDb(): Promise<Db | null> {
  try {
    const client = await clientPromise;
    return client.db("auctionfc");
  } catch (err) {
    console.warn("MongoDB Atlas connection unavailable, using resilient state fallback:", err);
    return null;
  }
}

export const memoryStore = global._inMemoryStore;
