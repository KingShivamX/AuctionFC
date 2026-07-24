import * as XLSX from "xlsx"
import { Player } from "./types"

export const SAMPLE_FOOTBALL_PLAYERS = [
    {
        srNo: 1,
        name: "Bukayo Saka",
        franchise: "Arsenal",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 2,
        name: "Viktor Gyokeres",
        franchise: "Arsenal",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 3,
        name: "William Saliba",
        franchise: "Arsenal",
        position: "Defender",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 4,
        name: "Declan Rice",
        franchise: "Arsenal",
        position: "Midfielder",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 5,
        name: "Bruno Fernandes",
        franchise: "Manchester United",
        position: "Midfielder",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 6,
        name: "Julian Alvarez",
        franchise: "Atletico Madrid",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 7,
        name: "Lamine Yamal",
        franchise: "Barcelona",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 8,
        name: "Raphinha",
        franchise: "Barcelona",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 9,
        name: "Pedri",
        franchise: "Barcelona",
        position: "Midfielder",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 10,
        name: "Harry Kane",
        franchise: "Bayern Munich",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 11,
        name: "Kylian Mbappe",
        franchise: "Real Madrid",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 12,
        name: "Jude Bellingham",
        franchise: "Real Madrid",
        position: "Midfielder",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 13,
        name: "Erling Haaland",
        franchise: "Manchester City",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 14,
        name: "Rodri",
        franchise: "Manchester City",
        position: "Midfielder",
        pool: "Pool A - Star Players",
        basePrice: 5.0,
    },
    {
        srNo: 15,
        name: "Virgil van Dijk",
        franchise: "Liverpool",
        position: "Defender",
        pool: "Pool B - Defenders",
        basePrice: 3.5,
    },
    {
        srNo: 16,
        name: "Trent Alexander-Arnold",
        franchise: "Liverpool",
        position: "Defender",
        pool: "Pool B - Defenders",
        basePrice: 3.5,
    },
    {
        srNo: 17,
        name: "Alisson Becker",
        franchise: "Liverpool",
        position: "Goalkeeper",
        pool: "Pool C - Keepers",
        basePrice: 2.5,
    },
    {
        srNo: 18,
        name: "Thibaut Courtois",
        franchise: "Real Madrid",
        position: "Goalkeeper",
        pool: "Pool C - Keepers",
        basePrice: 2.5,
    },
    {
        srNo: 19,
        name: "Cole Palmer",
        franchise: "Chelsea",
        position: "Attacker",
        pool: "Pool A - Star Players",
        basePrice: 4.5,
    },
    {
        srNo: 20,
        name: "Moises Caicedo",
        franchise: "Chelsea",
        position: "Midfielder",
        pool: "Pool B - Midfielders",
        basePrice: 3.0,
    },
]

/**
 * Safely extract a number from strings like "₹2.0 Cr", "5.0", "₹5", or a raw number.
 * Handles: "₹2.0 Cr", "2.0 Cr", "₹2", "2", 2, etc.
 */
function parsePrice(raw: any): number {
    if (raw === null || raw === undefined || raw === "") return 1.0
    if (typeof raw === "number") return raw || 1.0

    // Convert to string and remove all non-numeric characters except decimal point
    const str = String(raw)
        .replace(/[₹,\s]/g, "") // Remove rupee symbol, commas, spaces
        .replace(/Cr/gi, "") // Remove "Cr" or "cr"
        .replace(/[^\d.]/g, "") // Remove any remaining non-numeric chars except decimal
        .trim()

    const parsed = parseFloat(str)
    return isNaN(parsed) || parsed <= 0 ? 1.0 : parsed
}

/**
 * Normalize a key for flexible matching — strip symbols, lowercase, collapse spaces.
 */
function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Find a value in a row object using flexible key matching.
 * Tries exact key first, then normalized comparison.
 */
function flexGet(row: Record<string, any>, ...candidates: string[]): any {
    // Try exact key first
    for (const c of candidates) {
        if (row[c] !== undefined && row[c] !== "") return row[c]
    }
    // Fallback: normalize all row keys and match
    const normRow: Record<string, string> = {}
    for (const k of Object.keys(row)) {
        normRow[normalize(k)] = k
    }
    for (const c of candidates) {
        const nc = normalize(c)
        if (
            normRow[nc] &&
            row[normRow[nc]] !== undefined &&
            row[normRow[nc]] !== ""
        ) {
            return row[normRow[nc]]
        }
    }
    return undefined
}

/**
 * Parse an Excel / CSV file buffer into player objects.
 * Handles the exact column format:
 *   Sr No | Player Name | Franchise (Current Club) | Position | Pool | Base Price (Cr) | Sold Status | Sold To (Team) | Sold Price (Cr)
 */
export function parsePlayerExcel(fileBuffer: ArrayBuffer): Partial<Player>[] {
    try {
        const workbook = XLSX.read(new Uint8Array(fileBuffer), {
            type: "array",
        })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        // sheet_to_json uses the first non-empty row as headers automatically
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            blankrows: false,
        })

        if (!rows || rows.length === 0) {
            throw new Error(
                "Excel file appears to be empty or headers not found.",
            )
        }

        const parsed: Partial<Player>[] = []

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i]

            // Skip rows that look like header repeats or completely empty
            const playerNameRaw = flexGet(
                r,
                "Player Name",
                "PlayerName",
                "Name",
                "player name",
                "PLAYER NAME",
            )
            if (
                !playerNameRaw ||
                String(playerNameRaw).trim().toLowerCase() === "player name"
            )
                continue

            const name = String(playerNameRaw).trim()
            if (!name) continue

            const srNo =
                flexGet(
                    r,
                    "Sr No",
                    "SrNo",
                    "S.No",
                    "Sr.No",
                    "Serial",
                    "No",
                    "srno",
                    "sr",
                ) || i + 1
            const franchise =
                flexGet(
                    r,
                    "Franchise (Current Club)",
                    "Franchise",
                    "Club",
                    "Current Club",
                    "Team",
                    "franchise",
                ) || "Free Agent"
            const position =
                flexGet(r, "Position", "Pos", "Role", "position") || "Attacker"
            const pool =
                flexGet(r, "Pool", "Category", "Group", "pool") || "Pool A"
            const basePriceRaw = flexGet(
                r,
                "Base Price (Cr)",
                "Base Price",
                "BasePrice",
                "Price",
                "base price",
                "baseprice",
            )
            const basePrice = parsePrice(basePriceRaw)

            parsed.push({
                srNo: Number(srNo) || i + 1,
                name,
                franchise: String(franchise).trim(),
                position: String(position).trim(),
                pool: String(pool).trim(),
                basePrice,
                soldStatus: "unsold",
            })
        }

        return parsed
    } catch (err: any) {
        throw new Error(
            `Failed to parse Excel: ${err.message || "Unknown error"}`,
        )
    }
}

export function downloadSampleExcel() {
    const data = SAMPLE_FOOTBALL_PLAYERS.map((p) => ({
        "Sr No": p.srNo,
        "Player Name": p.name,
        "Franchise (Current Club)": p.franchise,
        Position: p.position,
        Pool: p.pool,
        "Base Price (Cr)": `₹${p.basePrice.toFixed(1)} Cr`,
        "Sold Status": "Unsold",
        "Sold To (Team)": "",
        "Sold Price (Cr)": "",
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)

    // Set column widths for readability
    worksheet["!cols"] = [
        { wch: 7 },
        { wch: 26 },
        { wch: 22 },
        { wch: 12 },
        { wch: 22 },
        { wch: 16 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Players")

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "AuctionFC_Sample_Players.xlsx"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
