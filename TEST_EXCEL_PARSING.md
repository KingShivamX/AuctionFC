# Excel Parsing Fix - Test Cases

## Problem
The Excel parser was failing to parse base prices like "₹2.0 Cr" because it wasn't removing the "Cr" suffix.

## Fix Applied
Updated the `parsePrice()` function in `src/lib/excel.ts` to:
1. Remove ₹ symbol
2. Remove "Cr" or "cr" text (case insensitive)
3. Remove commas and spaces
4. Remove any remaining non-numeric characters (except decimal point)
5. Return 1.0 as default if parsing fails or result is ≤ 0

## Supported Formats

The parser now handles all these formats correctly:

| Input Format | Parsed Value | Notes |
|--------------|--------------|-------|
| `₹2.0 Cr` | 2.0 | Your Excel format |
| `₹2 Cr` | 2.0 | Without decimal |
| `2.0 Cr` | 2.0 | Without ₹ |
| `2.0` | 2.0 | Just number |
| `2` | 2.0 | Integer |
| `₹2.5` | 2.5 | With ₹ only |
| `2,000 Cr` | 2000.0 | With comma separator |
| `` (empty) | 1.0 | Default fallback |
| `null` | 1.0 | Default fallback |
| `invalid` | 1.0 | Default fallback |

## Testing Your Excel File

Your Excel file has this format:
```
Base Price (Cr): ₹2.0 Cr
```

This will now correctly parse as `2.0` instead of throwing an error.

## How to Test

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Create a new league:**
   - Click "Create League"
   - Enter league name and purse
   - Upload your Excel file with "₹2.0 Cr" format

3. **Verify:**
   - Players should be loaded without error
   - Base prices should show as ₹2.0 Cr in the UI
   - You should see "X players loaded" confirmation

## If You Still Get the Error

If you still see "Every player needs a name and a valid base price":

1. **Check for empty rows**: Make sure there are no blank rows between players
2. **Check player names**: Every row must have a player name
3. **Check base price column**: 
   - Column header should be "Base Price (Cr)" or "Base Price" or "BasePrice"
   - Values should be "₹2.0 Cr" format or similar

4. **Debug mode**: Check the browser console for detailed error messages

## Alternative: Use Clean Numbers

If issues persist, you can simplify your Excel by using just numbers in the Base Price column:
- Instead of: `₹2.0 Cr`
- Use: `2.0` or `2`

The UI will automatically add the ₹ and Cr formatting when displaying.
