'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  try {
    if (!email) return [];

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      console.error('Database connection not established');
      return [];
    }

    const user =
      (await db.collection('user').findOne({ email })) ||
      (await db.collection('users').findOne({ email }));

    if (!user) {
      return [];
    }

    const userIdString = user._id ? user._id.toString() : '';
    const userAuthId = typeof user.id === 'string' ? user.id : '';
    const userIds = Array.from(new Set([userIdString, userAuthId].filter(Boolean)));

    if (userIds.length === 0) {
      return [];
    }

    const items = await Watchlist.find(
      userIds.length === 1 ? { userId: userIds[0] } : { userId: { $in: userIds } },
      { symbol: 1, _id: 0 }
    ).lean();

    return items.map((item) => String(item.symbol));
  } catch (error) {
    console.error(`Failed to fetch watchlist symbols for email ${email}:`, error);
    return [];
  }
}

