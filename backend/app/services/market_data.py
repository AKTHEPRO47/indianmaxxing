from __future__ import annotations

from datetime import datetime
from functools import lru_cache
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


def _format_epoch_seconds(value: Any) -> str | None:
    number = _clean_number(value)
    if number is None:
        return None
    try:
        return datetime.fromtimestamp(number).isoformat()
    except (OSError, OverflowError, ValueError):
        return None


def _ticker_for_symbol(symbol: str) -> str:
    return symbol.replace(".", "-").upper()


@lru_cache(maxsize=256)
def fetch_financial_profile(symbol: str) -> Dict[str, Any]:
    ticker_symbol = _ticker_for_symbol(symbol)
    ticker = yf.Ticker(ticker_symbol)
    try:
        info = ticker.get_info() or {}
    except Exception:
        info = {}

    market_cap = _clean_number(info.get("marketCap"))
    if market_cap is None:
        try:
            market_cap = _clean_number(ticker.fast_info.get("marketCap"))
        except Exception:
            market_cap = None

    dividend_yield = _clean_number(info.get("dividendYield"))
    if dividend_yield is not None:
        dividend_yield = dividend_yield * 100 if dividend_yield <= 1 else dividend_yield

    return {
        "market_cap_value": market_cap,
        "pe_ratio": _clean_number(info.get("trailingPE")),
        "forward_pe": _clean_number(info.get("forwardPE")),
        "price_to_book": _clean_number(info.get("priceToBook")),
        "dividend_yield": dividend_yield,
        "beta": _clean_number(info.get("beta")),
    }


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
    info = {}
    try:
        info = ticker.get_info() or {}
    except Exception:
        info = {}
    premarket_price = _clean_number(info.get("preMarketPrice")) or _clean_number(fast_info.get("preMarketPrice"))
    regular_market_price = _clean_number(info.get("regularMarketPrice")) or last_price
    premarket_change = _clean_number(info.get("preMarketChange")) or _clean_number(fast_info.get("preMarketChange"))
    premarket_change_percent = _clean_number(info.get("preMarketChangePercent")) or _clean_number(fast_info.get("preMarketChangePercent"))
    if premarket_price is not None and premarket_change is None and regular_market_price not in (None, 0):
        premarket_change = premarket_price - regular_market_price
    if premarket_price is not None and premarket_change_percent is None and regular_market_price not in (None, 0):
        premarket_change_percent = (premarket_change / regular_market_price) * 100 if premarket_change is not None else None
    premarket_as_of = _format_epoch_seconds(info.get("preMarketTime")) or _clean_text(fast_info.get("preMarketTime"))

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
            "premarket_price": premarket_price,
            "premarket_change": premarket_change,
            "premarket_change_percent": premarket_change_percent,
            "premarket_as_of": premarket_as_of,
            "source": "yfinance",
            "as_of": latest_point.get("timestamp"),
        },
        "history": points,
    }