from __future__ import annotations

from datetime import datetime
import math
from typing import Any, Dict, List

import yfinance as yf


STOCK_RANGE_MAP: Dict[str, Dict[str, str]] = {
    "1m": {"period": "5d", "interval": "1m"},
    "2m": {"period": "5d", "interval": "2m"},
    "5m": {"period": "5d", "interval": "5m"},
    "1d": {"period": "1mo", "interval": "1d"},
    "2d": {"period": "3mo", "interval": "1d"},
    "1w": {"period": "3mo", "interval": "1d"},
    "1mo": {"period": "6mo", "interval": "1d"},
    "1y": {"period": "1y", "interval": "1d"},
    "max": {"period": "max", "interval": "1wk"},
}


def _clean_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number):
        return None
    return number


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _format_timestamp(value: Any) -> str:
    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _ticker_for_symbol(symbol: str) -> str:
    return symbol.replace(".", "-").upper()


def fetch_stock_data(symbol: str, range_key: str) -> Dict[str, Any]:
    ticker_symbol = _ticker_for_symbol(symbol)
    config = STOCK_RANGE_MAP.get(range_key, STOCK_RANGE_MAP["1mo"])
    ticker = yf.Ticker(ticker_symbol)
    history = ticker.history(
        period=config["period"],
        interval=config["interval"],
        auto_adjust=False,
        actions=False,
    )

    if history.empty:
        raise ValueError(f"No market data available for {ticker_symbol}")

    points: List[Dict[str, Any]] = []
    for timestamp, row in history.iterrows():
        points.append(
            {
                "timestamp": _format_timestamp(timestamp),
                "open": _clean_number(row.get("Open")),
                "high": _clean_number(row.get("High")),
                "low": _clean_number(row.get("Low")),
                "close": _clean_number(row.get("Close")),
                "volume": _clean_number(row.get("Volume")),
            }
        )

    fast_info = ticker.fast_info
    latest_point = points[-1]
    previous_point = points[-2] if len(points) > 1 else None
    last_price = latest_point.get("close") or latest_point.get("open")
    previous_close = _clean_number(fast_info.get("previousClose"))
    if previous_close is None and previous_point:
        previous_close = previous_point.get("close")

    change = None
    change_percent = None
    if last_price is not None and previous_close not in (None, 0):
        change = last_price - previous_close
        change_percent = (change / previous_close) * 100

    market_cap = _clean_number(fast_info.get("marketCap"))
    average_volume = _clean_number(fast_info.get("threeMonthAverageVolume")) or _clean_number(fast_info.get("tenDayAverageVolume"))

    return {
        "company_name": symbol,
        "ticker": ticker_symbol,
        "range": range_key,
        "quote": {
            "symbol": ticker_symbol,
            "currency": _clean_text(fast_info.get("currency")),
            "exchange": _clean_text(fast_info.get("exchange")),
            "quote_type": _clean_text(fast_info.get("quoteType")),
            "last_price": last_price,
            "change": change,
            "change_percent": change_percent,
            "open": _clean_number(fast_info.get("open")),
            "high": _clean_number(fast_info.get("dayHigh")),
            "low": _clean_number(fast_info.get("dayLow")),
            "previous_close": previous_close,
            "day_high": _clean_number(fast_info.get("dayHigh")),
            "day_low": _clean_number(fast_info.get("dayLow")),
            "year_high": _clean_number(fast_info.get("yearHigh")),
            "year_low": _clean_number(fast_info.get("yearLow")),
            "fifty_day_average": _clean_number(fast_info.get("fiftyDayAverage")),
            "two_hundred_day_average": _clean_number(fast_info.get("twoHundredDayAverage")),
            "volume": _clean_number(fast_info.get("lastVolume")) or latest_point.get("volume"),
            "average_volume": average_volume,
            "market_cap": market_cap,
            "source": "yfinance",
            "as_of": latest_point.get("timestamp"),
        },
        "history": points,
    }