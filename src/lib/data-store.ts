import { getDb, memoryStore } from "./db"
import { User, League, Player, Bid } from "./types"

function generateId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}

function generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

function usernameKey(username: string): string {
    return username.trim().toLowerCase()
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function toUser(user: any): User {
    return {
        id: user.id || user._id.toString(),
        username: user.username,
        teamName: user.teamName,
        pin: user.pin,
        createdAt: user.createdAt,
    }
}

// USER OPERATIONS
export async function registerUser(
    username: string,
    teamName: string,
    pin: string,
): Promise<User> {
    const cleanUsername = username.trim()
    const cleanTeam = teamName.trim()
    const cleanPin = pin.trim()
    const cleanUsernameKey = usernameKey(cleanUsername)

    const db = await getDb()
    if (db) {
        const users = db.collection("users")
        await users.createIndex(
            { usernameKey: 1 },
            {
                name: "unique_username_key",
                unique: true,
                partialFilterExpression: { usernameKey: { $type: "string" } },
            },
        )
        const existing = await users.findOne({
            $or: [
                { usernameKey: cleanUsernameKey },
                {
                    username: {
                        $regex: `^${escapeRegex(cleanUsername)}$`,
                        $options: "i",
                    },
                },
            ],
        })
        if (existing) {
            throw new Error(
                "That username is already taken. Please choose another.",
            )
        }

        const newUser: User = {
            id: generateId(),
            username: cleanUsername,
            teamName: cleanTeam,
            pin: String(cleanPin), // Ensure PIN is stored as string
            createdAt: Date.now(),
        }
        try {
            await users.insertOne({
                ...newUser,
                usernameKey: cleanUsernameKey,
            } as any)
        } catch (error: any) {
            if (error?.code === 11000) {
                throw new Error(
                    "That username is already taken. Please choose another.",
                )
            }
            throw error
        }
        return newUser
    } else {
        // Memory fallback
        const existing = memoryStore.users[cleanUsernameKey]
        if (existing) {
            throw new Error(
                "That username is already taken. Please choose another.",
            )
        }
        const newUser: User = {
            id: generateId(),
            username: cleanUsername,
            teamName: cleanTeam,
            pin: String(cleanPin), // Ensure PIN is stored as string
            createdAt: Date.now(),
        }
        memoryStore.users[cleanUsernameKey] = newUser
        return newUser
    }
}

export async function loginUser(username: string, pin: string): Promise<User> {
    const cleanUsername = username.trim()
    const cleanUsernameKey = usernameKey(cleanUsername)
    const cleanPin = pin.trim()
    const db = await getDb()

    if (db) {
        const user = await db.collection("users").findOne({
            $or: [
                { usernameKey: cleanUsernameKey },
                {
                    username: {
                        $regex: `^${escapeRegex(cleanUsername)}$`,
                        $options: "i",
                    },
                },
            ],
        })

        if (!user) {
            throw new Error("Invalid username or 4-digit PIN")
        }

        // Compare PINs as strings, ensuring both are trimmed
        const storedPin = String(user.pin).trim()
        if (storedPin !== cleanPin) {
            console.error("PIN mismatch:", {
                stored: storedPin,
                provided: cleanPin,
                user: user.username,
            })
            throw new Error("Invalid username or 4-digit PIN")
        }

        return toUser(user)
    }

    const user = memoryStore.users[cleanUsernameKey]
    if (!user) {
        throw new Error("Invalid username or 4-digit PIN")
    }

    // Compare PINs as strings, ensuring both are trimmed
    const storedPin = String(user.pin).trim()
    if (storedPin !== cleanPin) {
        throw new Error("Invalid username or 4-digit PIN")
    }

    return user
}

// LEAGUE OPERATIONS
export async function createLeague(
    name: string,
    totalPurse: number,
    adminUser: User,
    rawPlayers: Partial<Player>[],
): Promise<League> {
    if (!rawPlayers || rawPlayers.length === 0) {
        throw new Error("Add at least one player before creating a league")
    }

    const leagueId = generateId()
    const leagueCode = generateCode()

    const league: League = {
        id: leagueId,
        name: name.trim(),
        code: leagueCode,
        adminId: adminUser.id,
        adminUsername: adminUser.username,
        adminTeamName: adminUser.teamName,
        totalPurse,
        members: [
            {
                userId: adminUser.id,
                username: adminUser.username,
                teamName: adminUser.teamName,
                joinedAt: Date.now(),
            },
        ],
        status: "draft",
        createdAt: Date.now(),
    }

    const players: Player[] = rawPlayers.map((p, idx) => ({
        id: generateId(),
        leagueId,
        srNo: p.srNo || idx + 1,
        name: p.name || `Player ${idx + 1}`,
        franchise: p.franchise || "Free Agent",
        position: p.position || "Attacker",
        pool: p.pool || "Pool A",
        basePrice: p.basePrice || 1.0,
        soldStatus: "unsold",
        orderIndex: idx,
    }))

    const db = await getDb()
    if (db) {
        await db.collection("leagues").insertOne(league as any)
        if (players.length > 0) {
            await db.collection("players").insertMany(players as any[])
        }
    } else {
        memoryStore.leagues[leagueId] = league
        players.forEach((p) => {
            memoryStore.players[p.id] = p
        })
    }

    return league
}

export async function getLeagueByCodeOrId(
    codeOrId: string,
): Promise<League | null> {
    const query = codeOrId.trim()
    const db = await getDb()
    if (db) {
        const l = await db.collection("leagues").findOne({
            $or: [{ id: query }, { code: query.toUpperCase() }],
        })
        if (l) return l as any as League
    }

    // Memory fallback check
    for (const l of Object.values(memoryStore.leagues)) {
        if (l.id === query || l.code.toUpperCase() === query.toUpperCase()) {
            return l as League
        }
    }
    return null
}

export async function getUserLeagues(userId: string): Promise<League[]> {
    const db = await getDb()
    if (db) {
        const docs = await db
            .collection("leagues")
            .find({ "members.userId": userId })
            .sort({ createdAt: -1 })
            .toArray()
        return docs as any as League[]
    }

    return Object.values(memoryStore.leagues)
        .filter((l: any) => l.members.some((m: any) => m.userId === userId))
        .sort((a: any, b: any) => b.createdAt - a.createdAt) as League[]
}

export async function joinLeague(
    leagueCode: string,
    user: User,
): Promise<League> {
    const league = await getLeagueByCodeOrId(leagueCode)
    if (!league) {
        throw new Error("League code not found")
    }

    const alreadyMember = league.members.some(
        (m) => m.userId === user.id || m.username === user.username,
    )
    if (alreadyMember) return league

    const newMember = {
        userId: user.id,
        username: user.username,
        teamName: user.teamName,
        joinedAt: Date.now(),
    }

    league.members.push(newMember)

    const db = await getDb()
    if (db) {
        await db
            .collection("leagues")
            .updateOne(
                { id: league.id },
                { $push: { members: newMember as any } },
            )
    } else {
        memoryStore.leagues[league.id] = league
    }

    return league
}

export async function getLeaguePlayers(leagueId: string): Promise<Player[]> {
    const db = await getDb()
    if (db) {
        const docs = await db
            .collection("players")
            .find({ leagueId })
            .sort({ orderIndex: 1, srNo: 1 })
            .toArray()
        return docs as any as Player[]
    }

    return Object.values(memoryStore.players)
        .filter((p: any) => p.leagueId === leagueId)
        .sort(
            (a: any, b: any) => a.orderIndex - b.orderIndex || a.srNo - b.srNo,
        ) as Player[]
}

export async function getBidsForPlayer(
    leagueId: string,
    playerId: string,
): Promise<Bid[]> {
    const db = await getDb()
    if (db) {
        const docs = await db
            .collection("bids")
            .find({ leagueId, playerId })
            .sort({ timestamp: -1 })
            .toArray()
        return docs as any as Bid[]
    }

    return Object.values(memoryStore.bids)
        .filter((b: any) => b.leagueId === leagueId && b.playerId === playerId)
        .sort((a: any, b: any) => b.timestamp - a.timestamp) as Bid[]
}

// ATOMIC BIDDING & CONCURRENCY GUARD
export async function placeBid(
    leagueId: string,
    playerId: string,
    amount: number,
    user: User,
): Promise<{
    success: boolean
    bid?: Bid
    currentHighest?: number
    message?: string
}> {
    const league = await getLeagueByCodeOrId(leagueId)
    if (!league) return { success: false, message: "League not found" }

    if (league.isPaused) {
        return {
            success: false,
            message: "Auction is currently paused by admin",
        }
    }

    if (league.currentAuctionPlayerId !== playerId) {
        return {
            success: false,
            message: "This player is not currently active on the auction block",
        }
    }

    const players = await getLeaguePlayers(leagueId)
    const player = players.find((p) => p.id === playerId)
    if (!player || player.soldStatus !== "live") {
        return {
            success: false,
            message: "Player bidding has ended or is invalid",
        }
    }

    // Calculate team remaining purse
    const teamSpent = players
        .filter(
            (p) =>
                p.soldStatus === "sold" && p.soldToUsername === user.username,
        )
        .reduce((sum, p) => sum + (p.soldPrice || 0), 0)
    const remainingPurse = league.totalPurse - teamSpent

    if (amount > remainingPurse) {
        return {
            success: false,
            message: `Bid ₹${amount} Cr exceeds your remaining purse (₹${remainingPurse.toFixed(2)} Cr)!`,
        }
    }

    const bids = await getBidsForPlayer(leagueId, playerId)
    const currentHighest =
        bids.length > 0 ? bids[0].amount : player.basePrice - 0.01

    if (amount <= currentHighest) {
        return {
            success: false,
            currentHighest: bids.length > 0 ? bids[0].amount : player.basePrice,
            message: `Outbid! The current bid is already ₹${bids.length > 0 ? bids[0].amount : player.basePrice} Cr`,
        }
    }

    // Check if team is outbidding themselves
    if (bids.length > 0 && bids[0].username === user.username) {
        return {
            success: false,
            message: "You are already the highest bidder!",
        }
    }

    const newBid: Bid = {
        id: generateId(),
        leagueId,
        playerId,
        amount: Math.round(amount), // Store as integer
        userId: user.id,
        username: user.username,
        teamName: user.teamName,
        timestamp: Date.now(),
    }

    // Reset auction countdown timer to 15 seconds from now
    const newTimerEnd = Date.now() + 15000

    const db = await getDb()
    if (db) {
        // Atomic check in Mongo
        await db.collection("bids").insertOne(newBid as any)
        await db
            .collection("leagues")
            .updateOne(
                { id: leagueId },
                { $set: { timerEnd: newTimerEnd, status: "live" } },
            )
    } else {
        memoryStore.bids[newBid.id] = newBid
        league.timerEnd = newTimerEnd
        league.status = "live"
        memoryStore.leagues[leagueId] = league
    }

    return { success: true, bid: newBid }
}

// ADMIN ACTIONS
export async function startNextAuctionPlayer(
    leagueId: string,
    targetPlayerId?: string,
): Promise<Player | null> {
    const players = await getLeaguePlayers(leagueId)
    let playerToStart: Player | undefined

    if (targetPlayerId) {
        playerToStart = players.find((p) => p.id === targetPlayerId)
    } else {
        // Top unsold player
        playerToStart = players.find((p) => p.soldStatus === "unsold")
    }

    if (!playerToStart) return null

    // Finalize any existing active live player as unsold if no bids were placed
    const currentLive = players.find((p) => p.soldStatus === "live")
    if (currentLive && currentLive.id !== playerToStart.id) {
        await setPlayerSoldStatus(leagueId, currentLive.id, "unsold")
    }

    const timerEnd = Date.now() + 15000 // 15s standard start timer

    const db = await getDb()
    if (db) {
        await db
            .collection("players")
            .updateOne(
                { id: playerToStart.id },
                { $set: { soldStatus: "live" } },
            )
        await db.collection("leagues").updateOne(
            { id: leagueId },
            {
                $set: {
                    currentAuctionPlayerId: playerToStart.id,
                    timerEnd,
                    isPaused: false,
                    status: "live",
                },
            },
        )
    } else {
        playerToStart.soldStatus = "live"
        memoryStore.players[playerToStart.id] = playerToStart
        const l = memoryStore.leagues[leagueId]
        if (l) {
            l.currentAuctionPlayerId = playerToStart.id
            l.timerEnd = timerEnd
            l.isPaused = false
            l.status = "live"
        }
    }

    return playerToStart
}

export async function shuffleUnsoldPlayers(leagueId: string): Promise<void> {
    const players = await getLeaguePlayers(leagueId)
    const unsold = players.filter((p) => p.soldStatus === "unsold")

    // Fisher-Yates shuffle
    for (let i = unsold.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tempIndex = unsold[i].orderIndex
        unsold[i].orderIndex = unsold[j].orderIndex
        unsold[j].orderIndex = tempIndex
    }

    const db = await getDb()
    if (db) {
        for (const p of unsold) {
            await db
                .collection("players")
                .updateOne({ id: p.id }, { $set: { orderIndex: p.orderIndex } })
        }
    } else {
        unsold.forEach((p) => {
            memoryStore.players[p.id] = p
        })
    }
}

export async function pauseResumeAuction(
    leagueId: string,
    pause?: boolean,
): Promise<League | null> {
    const league = await getLeagueByCodeOrId(leagueId)
    if (!league) return null

    const shouldPause = pause !== undefined ? pause : !league.isPaused
    let updatedTimerEnd = league.timerEnd
    let pausedTimeLeft = league.pausedTimeLeft

    if (shouldPause) {
        // Store remaining seconds
        pausedTimeLeft = Math.max(
            0,
            Math.ceil(((league.timerEnd || Date.now()) - Date.now()) / 1000),
        )
    } else {
        // Resume with remaining seconds
        const left = pausedTimeLeft || 10
        updatedTimerEnd = Date.now() + left * 1000
    }

    league.isPaused = shouldPause
    league.timerEnd = updatedTimerEnd
    league.pausedTimeLeft = pausedTimeLeft

    const db = await getDb()
    if (db) {
        await db.collection("leagues").updateOne(
            { id: leagueId },
            {
                $set: {
                    isPaused: shouldPause,
                    timerEnd: updatedTimerEnd,
                    pausedTimeLeft,
                },
            },
        )
    } else {
        memoryStore.leagues[leagueId] = league
    }

    return league
}

export async function finalizeSoldPlayer(
    leagueId: string,
    playerId: string,
): Promise<{ player: Player; soldTo?: string; amount?: number }> {
    const bids = await getBidsForPlayer(leagueId, playerId)
    const players = await getLeaguePlayers(leagueId)
    const player = players.find((p) => p.id === playerId)
    if (!player) throw new Error("Player not found")

    let soldStatus: "sold" | "unsold" = "unsold"
    let soldToTeam: string | undefined
    let soldToUsername: string | undefined
    let soldPrice: number | undefined

    if (bids.length > 0) {
        soldStatus = "sold"
        soldToTeam = bids[0].teamName
        soldToUsername = bids[0].username
        soldPrice = bids[0].amount
    }

    player.soldStatus = soldStatus
    player.soldToTeam = soldToTeam
    player.soldToUsername = soldToUsername
    player.soldPrice = soldPrice

    const db = await getDb()
    if (db) {
        await db.collection("players").updateOne(
            { id: playerId },
            {
                $set: {
                    soldStatus,
                    soldToTeam,
                    soldToUsername,
                    soldPrice,
                },
            },
        )
        await db
            .collection("leagues")
            .updateOne(
                { id: leagueId },
                { $set: { currentAuctionPlayerId: null, timerEnd: null } },
            )
    } else {
        memoryStore.players[playerId] = player
        const l = memoryStore.leagues[leagueId]
        if (l) {
            l.currentAuctionPlayerId = null
            l.timerEnd = null
        }
    }

    return { player, soldTo: soldToTeam, amount: soldPrice }
}

// DIRECT OFFLINE ASSIGNMENT & UNDO
export async function directAssignPlayer(
    leagueId: string,
    playerId: string,
    targetUsername: string,
    targetTeamName: string,
    price: number,
): Promise<Player> {
    const players = await getLeaguePlayers(leagueId)
    const player = players.find((p) => p.id === playerId)
    if (!player) throw new Error("Player not found")

    player.soldStatus = "sold"
    player.soldToUsername = targetUsername
    player.soldToTeam = targetTeamName
    player.soldPrice = price

    const db = await getDb()
    if (db) {
        await db.collection("players").updateOne(
            { id: playerId },
            {
                $set: {
                    soldStatus: "sold",
                    soldToUsername: targetUsername,
                    soldToTeam: targetTeamName,
                    soldPrice: price,
                },
            },
        )
    } else {
        memoryStore.players[playerId] = player
    }

    return player
}

export async function undoDirectAssignPlayer(
    leagueId: string,
    playerId: string,
): Promise<Player> {
    const players = await getLeaguePlayers(leagueId)
    const player = players.find((p) => p.id === playerId)
    if (!player) throw new Error("Player not found")

    player.soldStatus = "unsold"
    player.soldToUsername = undefined
    player.soldToTeam = undefined
    player.soldPrice = undefined

    const db = await getDb()
    if (db) {
        await db.collection("players").updateOne(
            { id: playerId },
            {
                $set: {
                    soldStatus: "unsold",
                },
                $unset: {
                    soldToUsername: "",
                    soldToTeam: "",
                    soldPrice: "",
                },
            },
        )
    } else {
        memoryStore.players[playerId] = player
    }

    return player
}

function setPlayerSoldStatus(
    leagueId: string,
    playerId: string,
    status: "unsold" | "live" | "sold",
) {
    return getDb().then((db) => {
        if (db) {
            return db
                .collection("players")
                .updateOne({ id: playerId }, { $set: { soldStatus: status } })
        } else {
            if (memoryStore.players[playerId])
                memoryStore.players[playerId].soldStatus = status
        }
    })
}

// ADD PLAYERS TO EXISTING LEAGUE
export async function addPlayersToLeague(
    leagueId: string,
    rawPlayers: Partial<Player>[],
): Promise<Player[]> {
    if (!rawPlayers || rawPlayers.length === 0) {
        throw new Error("No players to add")
    }

    const league = await getLeagueByCodeOrId(leagueId)
    if (!league) {
        throw new Error("League not found")
    }

    const existingPlayers = await getLeaguePlayers(leagueId)
    const maxOrderIndex =
        existingPlayers.length > 0
            ? Math.max(...existingPlayers.map((p) => p.orderIndex))
            : -1
    const maxSrNo =
        existingPlayers.length > 0
            ? Math.max(...existingPlayers.map((p) => p.srNo))
            : 0

    const players: Player[] = rawPlayers.map((p, idx) => ({
        id: generateId(),
        leagueId,
        srNo: p.srNo || maxSrNo + idx + 1,
        name: p.name || `Player ${maxSrNo + idx + 1}`,
        franchise: p.franchise || "Free Agent",
        position: p.position || "Attacker",
        pool: p.pool || "Pool A",
        basePrice: p.basePrice || 1.0,
        soldStatus: "unsold",
        orderIndex: maxOrderIndex + idx + 1,
    }))

    const db = await getDb()
    if (db) {
        if (players.length > 0) {
            await db.collection("players").insertMany(players as any[])
        }
    } else {
        players.forEach((p) => {
            memoryStore.players[p.id] = p
        })
    }

    return players
}

// MARK PLAYER AS UNSOLD (Admin action to explicitly mark a sold/live player as unsold)
export async function markPlayerAsUnsold(
    leagueId: string,
    playerId: string,
): Promise<Player> {
    const players = await getLeaguePlayers(leagueId)
    const player = players.find((p) => p.id === playerId)
    if (!player) throw new Error("Player not found")

    player.soldStatus = "unsold"
    player.soldToUsername = undefined
    player.soldToTeam = undefined
    player.soldPrice = undefined

    const db = await getDb()
    if (db) {
        await db.collection("players").updateOne(
            { id: playerId },
            {
                $set: { soldStatus: "unsold" },
                $unset: { soldToUsername: "", soldToTeam: "", soldPrice: "" },
            },
        )

        // If this was the current auction player, clear it
        const league = await getLeagueByCodeOrId(leagueId)
        if (league?.currentAuctionPlayerId === playerId) {
            await db
                .collection("leagues")
                .updateOne(
                    { id: leagueId },
                    { $set: { currentAuctionPlayerId: null, timerEnd: null } },
                )
        }
    } else {
        memoryStore.players[playerId] = player
        const l = memoryStore.leagues[leagueId]
        if (l && l.currentAuctionPlayerId === playerId) {
            l.currentAuctionPlayerId = null
            l.timerEnd = null
        }
    }

    return player
}
