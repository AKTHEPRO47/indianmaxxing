# Watchlist System

## Purpose

The Watchlist page is Aryan's dedicated research surface for companies the signed-in investor has chosen to track. It turns the existing saved-company list into a compact decision workspace rather than a simple list.

## Data Flow

1. The frontend loads `GET /account/watchlist` for the authenticated user.
2. Each tracked company requests one-day market data through `GET /companies/:id/stock-data?range=1d`.
3. The page combines the returned quote with the latest stored ESG score snapshot.
4. Removing an item calls `DELETE /account/watchlist/:id`; adding an item elsewhere calls `POST /account/watchlist/:id`.

## Analytics

The page computes these portfolio-level indicators from the current watchlist:

- Average ESG score
- Average ESG momentum
- Average session price move for available quotes
- Count of companies with controversy risk at or above 60

Each company tile shows its logo, symbol, exchange, quote, one-day move, ESG score, momentum, controversy risk, sector, and a direct route to detailed analysis.

## Notification Integration

A newly added watchlist item creates an in-app notification and sends the same event to the user's configured Telegram and email channels. Re-adding an existing item is idempotent and does not create another notification.