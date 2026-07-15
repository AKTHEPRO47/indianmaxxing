from __future__ import annotations

from datetime import datetime
import math
from datetime import timezone
from typing import Any, Dict, List

import httpx
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
    if symbol.upper().endswith(".SI"):
        return symbol.upper()
    return symbol.replace(".", "-").upper()


def _quarterly_progress(ticker: yf.Ticker) -> List[Dict[str, Any]]:
    frames = []
    for attr in ("quarterly_income_stmt", "quarterly_financials"):
      data = getattr(ticker, attr, None)
      if data is not None and not getattr(data, "empty", True):
          frames.append(data)
    if not frames:
        return []

    data = frames[0]
    columns = list(data.columns)[:4]
    progress: List[Dict[str, Any]] = []
    previous_revenue = None
    previous_earnings = None

    for column in columns:
        period = _format_timestamp(column)
        revenue = None
        earnings = None
        for row_name in ("Total Revenue", "Revenue"):
            if row_name in data.index:
                revenue = _clean_number(data.loc[row_name, column])
                break
        for row_name in ("Net Income", "Operating Income"):
            if row_name in data.index:
                earnings = _clean_number(data.loc[row_name, column])
                break

        revenue_growth = None
        earnings_growth = None
        if revenue is not None and previous_revenue not in (None, 0):
            revenue_growth = ((revenue - previous_revenue) / previous_revenue) * 100
        if earnings is not None and previous_earnings not in (None, 0):
            earnings_growth = ((earnings - previous_earnings) / previous_earnings) * 100

        progress.append({
            "period": period,
            "revenue": revenue,
            "earnings": earnings,
            "revenue_growth": revenue_growth,
            "earnings_growth": earnings_growth,
        })
        previous_revenue = revenue
        previous_earnings = earnings

    return progress


def _dividend_history(ticker: yf.Ticker) -> List[Dict[str, Any]]:
    dividends = getattr(ticker, "dividends", None)
    if dividends is None or getattr(dividends, "empty", True):
        return []
    recent = dividends.tail(8)
    return [
        {
            "date": _format_timestamp(date),
            "amount": _clean_number(amount) or 0.0,
        }
        for date, amount in recent.items()
        if _clean_number(amount) is not None
    ]


def _dividend_history_from_chart_api(symbol: str) -> List[Dict[str, Any]]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {
        "range": "5y",
        "interval": "1d",
        "includePrePost": "false",
        "events": "div,splits",
    }
    try:
        response = httpx.get(url, params=params, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []

    try:
        dividends = payload["chart"]["result"][0].get("events", {}).get("dividends", {})
    except Exception:
        return []

    history: List[Dict[str, Any]] = []
    for timestamp_str, event in dividends.items():
        amount = _clean_number(event.get("amount"))
        if amount is None:
            continue
        try:
            timestamp = datetime.fromtimestamp(int(timestamp_str), tz=timezone.utc)
        except Exception:
            continue
        history.append({
            "date": timestamp.isoformat(),
            "amount": amount,
        })

    history.sort(key=lambda item: item["date"])
    return history[-8:]


def _dividend_history_from_history_frame(history: Any) -> List[Dict[str, Any]]:
    if history is None or getattr(history, "empty", True):
        return []
    if "Dividends" not in history.columns:
        return []

    items: List[Dict[str, Any]] = []
    for timestamp, row in history.iterrows():
        amount = _clean_number(row.get("Dividends"))
        if amount is None or amount <= 0:
            continue
        items.append({
            "date": _format_timestamp(timestamp),
            "amount": amount,
        })

    items.sort(key=lambda item: item["date"])
    return items[-8:]


def _dividend_summary_from_info(info: Dict[str, Any]) -> Dict[str, Any]:
    annual_dividend = _clean_number(info.get("dividendRate"))
    raw_yield = _clean_number(info.get("dividendYield"))
    if raw_yield is None:
        dividend_yield = None
    else:
        # yfinance can return either fraction (0.025) or percentage (2.5).
        dividend_yield = raw_yield * 100 if raw_yield <= 1 else raw_yield

    last_dividend_date = None
    ex_div = info.get("exDividendDate")
    if ex_div is not None:
        try:
            last_dividend_date = datetime.fromtimestamp(int(ex_div), tz=timezone.utc).isoformat()
        except Exception:
            last_dividend_date = None

    return {
        "annual_dividend": annual_dividend,
        "dividend_yield": dividend_yield,
        "last_dividend_date": last_dividend_date,
    }


def fetch_stock_data(symbol: str, range_key: str) -> Dict[str, Any]:
    ticker_symbol = _ticker_for_symbol(symbol)
    config = STOCK_RANGE_MAP.get(range_key, STOCK_RANGE_MAP["1mo"])
    ticker = yf.Ticker(ticker_symbol)
    history = ticker.history(
        period=config["period"],
        interval=config["interval"],
        auto_adjust=False,
        actions=True,
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
    dividends = _dividend_history_from_history_frame(history)
    if not dividends:
        dividends = _dividend_history(ticker)
    if not dividends:
        dividends = _dividend_history_from_chart_api(ticker_symbol)
    quarterly_progress = _quarterly_progress(ticker)
    annual_dividend = sum(point["amount"] for point in dividends if point["date"])
    dividend_yield = (annual_dividend / last_price * 100) if last_price not in (None, 0) and annual_dividend else None
    last_dividend_date = dividends[-1]["date"] if dividends else None

    if annual_dividend in (None, 0) or dividend_yield is None or last_dividend_date is None:
        try:
            info_payload = ticker.get_info() or {}
        except Exception:
            info_payload = {}
        info_summary = _dividend_summary_from_info(info_payload)
        if annual_dividend in (None, 0):
            annual_dividend = info_summary["annual_dividend"]
        if dividend_yield is None:
            dividend_yield = info_summary["dividend_yield"]
        if last_dividend_date is None:
            last_dividend_date = info_summary["last_dividend_date"]

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
        "dividends": dividends,
        "quarterly_progress": quarterly_progress,
        "annual_dividend": annual_dividend or None,
        "dividend_yield": dividend_yield,
        "last_dividend_date": last_dividend_date,
    }