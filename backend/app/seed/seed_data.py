"""
Seed data for MVP. Creates a broader company universe with realistic ESG metrics, signals and score snapshots.
Run: python -m app.seed.seed_data
"""
from datetime import datetime, timedelta
import json
import random
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models import Company, Evidence, ESGMetric, Signal, ScoreSnapshot, Notification, User
from app.models import __init__ as models_init  # ensure all models registered
import app.models  # noqa: F401
from app.services.logo_lookup import logo_url_for_ticker


def ensure_company_schema_compatibility() -> None:
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            existing = {row[1] for row in conn.execute(text("PRAGMA table_info(companies)"))}
            if "exchange" not in existing:
                conn.execute(text("ALTER TABLE companies ADD COLUMN exchange VARCHAR(40)"))
            if "website_url" not in existing:
                conn.execute(text("ALTER TABLE companies ADD COLUMN website_url VARCHAR(500)"))
            if "executive_name" not in existing:
                conn.execute(text("ALTER TABLE companies ADD COLUMN executive_name VARCHAR(255)"))
            if "executive_url" not in existing:
                conn.execute(text("ALTER TABLE companies ADD COLUMN executive_url VARCHAR(500)"))

COMPANIES = [
    {
        "name": "Tesla, Inc.",
        "ticker": "TSLA",
        "exchange": "NASDAQ",
        "industry": "Automotive / Clean Energy",
        "country": "United States",
        "description": "Electric vehicle and clean energy company. Pioneer in EV adoption and battery technology.",
        "market_cap": "$780B",
        "logo_url": None,
    },
    {
        "name": "Microsoft Corporation",
        "ticker": "MSFT",
        "exchange": "NASDAQ",
        "industry": "Technology",
        "country": "United States",
        "description": "Global technology leader. Committed to carbon negative by 2030 and AI-first transformation.",
        "market_cap": "$3.1T",
        "logo_url": None,
    },
    {
        "name": "Shell plc",
        "ticker": "SHEL",
        "exchange": "NYSE",
        "industry": "Oil & Gas",
        "country": "United Kingdom",
        "description": "Integrated energy company transitioning towards low-carbon solutions.",
        "market_cap": "$210B",
        "logo_url": None,
    },
    {
        "name": "Toyota Motor Corporation",
        "ticker": "TM",
        "exchange": "NYSE",
        "industry": "Automotive",
        "country": "Japan",
        "description": "World's largest automaker. Strong hybrid technology but slower EV transition.",
        "market_cap": "$230B",
        "logo_url": None,
    },
    {
        "name": "BYD Company Limited",
        "ticker": "BYDDF",
        "exchange": "OTC",
        "industry": "Automotive / Clean Energy",
        "country": "China",
        "description": "World's leading EV and battery manufacturer. Rapid global expansion.",
        "market_cap": "$95B",
        "logo_url": None,
    },
    {
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "exchange": "NASDAQ",
        "industry": "Technology / Consumer Electronics",
        "country": "United States",
        "description": "Carbon neutral across all corporate operations since 2020. Targeting fully carbon neutral products by 2030 across its supply chain.",
        "market_cap": "$3.4T",
        "logo_url": None,
    },
    {
        "name": "NVIDIA Corporation",
        "ticker": "NVDA",
        "exchange": "NASDAQ",
        "industry": "Semiconductors / AI",
        "country": "United States",
        "description": "Leading AI chip and accelerated computing company. Supplier to every major AI lab and cloud provider globally.",
        "market_cap": "$2.8T",
        "logo_url": None,
    },
    {
        "name": "Micron Technology, Inc.",
        "ticker": "MU",
        "exchange": "NASDAQ",
        "industry": "Semiconductors",
        "country": "United States",
        "description": "Memory and storage leader supplying DRAM and NAND to AI data centers, mobile devices and industrial systems.",
        "market_cap": "$170B",
        "logo_url": None,
        "website_url": "https://www.micron.com",
        "executive_name": "Leadership",
        "executive_url": "https://investors.micron.com",
    },
    {
        "name": "Alphabet Inc. Class A",
        "ticker": "GOOGL",
        "exchange": "NASDAQ",
        "industry": "Technology / Internet",
        "country": "United States",
        "description": "Search, cloud and AI platform company investing heavily in infrastructure and model deployment.",
        "market_cap": "$2.2T",
        "logo_url": None,
        "website_url": "https://www.google.com",
        "executive_name": "Leadership",
        "executive_url": "https://abc.xyz/investor/",
    },
    {
        "name": "Broadcom Inc.",
        "ticker": "AVGO",
        "exchange": "NASDAQ",
        "industry": "Semiconductors",
        "country": "United States",
        "description": "Infrastructure semiconductor and software company with strong AI networking exposure.",
        "market_cap": "$800B",
        "logo_url": None,
        "website_url": "https://www.broadcom.com",
        "executive_name": "Leadership",
        "executive_url": "https://investors.broadcom.com",
    },
    {
        "name": "Advanced Micro Devices, Inc.",
        "ticker": "AMD",
        "exchange": "NASDAQ",
        "industry": "Semiconductors",
        "country": "United States",
        "description": "CPU and GPU designer expanding rapidly in AI accelerators and data center compute.",
        "market_cap": "$350B",
        "logo_url": None,
        "website_url": "https://www.amd.com",
        "executive_name": "Leadership",
        "executive_url": "https://ir.amd.com",
    },
    {
        "name": "JPMorgan Chase & Co.",
        "ticker": "JPM",
        "exchange": "NYSE",
        "industry": "Financial Services",
        "country": "United States",
        "description": "Diversified financial services leader with large-scale sustainable finance commitments.",
        "market_cap": "$650B",
        "logo_url": None,
        "website_url": "https://www.jpmorganchase.com",
        "executive_name": "Leadership",
        "executive_url": "https://www.jpmorganchase.com/ir",
    },
    {
        "name": "Visa Inc.",
        "ticker": "V",
        "exchange": "NYSE",
        "industry": "Financial Services",
        "country": "United States",
        "description": "Global payments network with low direct emissions and strong digital infrastructure leverage.",
        "market_cap": "$600B",
        "logo_url": None,
        "website_url": "https://www.visa.com",
        "executive_name": "Leadership",
        "executive_url": "https://investor.visa.com",
    },
    {
        "name": "Mastercard Incorporated",
        "ticker": "MA",
        "exchange": "NYSE",
        "industry": "Financial Services",
        "country": "United States",
        "description": "Digital payments company focused on network growth, financial inclusion and data-driven products.",
        "market_cap": "$500B",
        "logo_url": None,
        "website_url": "https://www.mastercard.com",
        "executive_name": "Leadership",
        "executive_url": "https://investor.mastercard.com",
    },
    {
        "name": "Walmart Inc.",
        "ticker": "WMT",
        "exchange": "NYSE",
        "industry": "Retail",
        "country": "United States",
        "description": "Global retailer with major supply chain emissions exposure and growing sustainability programs.",
        "market_cap": "$550B",
        "logo_url": None,
        "website_url": "https://www.walmart.com",
        "executive_name": "Leadership",
        "executive_url": "https://stock.walmart.com",
    },
    {
        "name": "Procter & Gamble Company",
        "ticker": "PG",
        "exchange": "NYSE",
        "industry": "Consumer Goods",
        "country": "United States",
        "description": "Staples and household products leader with strong sustainability branding and supply chain scale.",
        "market_cap": "$380B",
        "logo_url": None,
        "website_url": "https://www.pg.com",
        "executive_name": "Leadership",
        "executive_url": "https://investor.pg.com",
    },
    {
        "name": "Coca-Cola Company",
        "ticker": "KO",
        "exchange": "NYSE",
        "industry": "Consumer Goods",
        "country": "United States",
        "description": "Global beverage company focused on packaging, water stewardship and emissions efficiency.",
        "market_cap": "$300B",
        "logo_url": None,
        "website_url": "https://www.coca-cola.com",
        "executive_name": "Leadership",
        "executive_url": "https://investors.coca-colacompany.com",
    },
    {
        "name": "Chevron Corporation",
        "ticker": "CVX",
        "exchange": "NYSE",
        "industry": "Oil & Gas",
        "country": "United States",
        "description": "Integrated energy company balancing upstream hydrocarbon production with lower-carbon investments.",
        "market_cap": "$310B",
        "logo_url": None,
        "website_url": "https://www.chevron.com",
        "executive_name": "Leadership",
        "executive_url": "https://www.chevron.com/investors",
    },
    {
        "name": "Nestle SA",
        "ticker": "NSRGY",
        "exchange": "OTC",
        "industry": "Consumer Goods",
        "country": "Switzerland",
        "description": "Global food and beverage group with large agri-supply-chain and packaging sustainability footprint.",
        "market_cap": "$320B",
        "logo_url": None,
        "website_url": "https://www.nestle.com",
        "executive_name": "Leadership",
        "executive_url": "https://www.nestle.com/investors",
    },
    {
        "name": "SAP SE",
        "ticker": "SAP",
        "exchange": "NYSE",
        "industry": "Enterprise Software",
        "country": "Germany",
        "description": "Enterprise software leader focused on cloud migration, AI and workflow automation.",
        "market_cap": "$250B",
        "logo_url": None,
        "website_url": "https://www.sap.com",
        "executive_name": "Leadership",
        "executive_url": "https://www.sap.com/investors",
    },
    {
        "name": "Oracle Corporation",
        "ticker": "ORCL",
        "exchange": "NYSE",
        "industry": "Enterprise Software",
        "country": "United States",
        "description": "Cloud and database company with fast-growing AI infrastructure and enterprise workloads.",
        "market_cap": "$420B",
        "logo_url": None,
        "website_url": "https://www.oracle.com",
        "executive_name": "Leadership",
        "executive_url": "https://investor.oracle.com",
    },
    {
        "name": "Cisco Systems, Inc.",
        "ticker": "CSCO",
        "exchange": "NASDAQ",
        "industry": "Networking",
        "country": "United States",
        "description": "Networking and security infrastructure provider benefiting from AI data center upgrades.",
        "market_cap": "$280B",
        "logo_url": None,
        "website_url": "https://www.cisco.com",
        "executive_name": "Leadership",
        "executive_url": "https://investor.cisco.com",
    },
    {
        "name": "International Business Machines Corp.",
        "ticker": "IBM",
        "exchange": "NYSE",
        "industry": "Technology",
        "country": "United States",
        "description": "Enterprise technology company focused on hybrid cloud, consulting and AI platforms.",
        "market_cap": "$220B",
        "logo_url": None,
        "website_url": "https://www.ibm.com",
        "executive_name": "Leadership",
        "executive_url": "https://www.ibm.com/investor",
    },
    {
        "name": "Amazon.com Inc.",
        "ticker": "AMZN",
        "exchange": "NASDAQ",
        "industry": "Technology / E-Commerce",
        "country": "United States",
        "description": "Global e-commerce and cloud computing leader. The Climate Pledge commits to net-zero by 2040, but logistics emissions remain a challenge.",
        "market_cap": "$1.9T",
        "logo_url": None,
    },
    {
        "name": "ExxonMobil Corporation",
        "ticker": "XOM",
        "exchange": "NYSE",
        "industry": "Oil & Gas",
        "country": "United States",
        "description": "One of the world's largest oil and gas companies. Faces mounting ESG pressure and climate litigation.",
        "market_cap": "$460B",
        "logo_url": None,
    },
    {
        "name": "Volkswagen AG",
        "ticker": "VWAGY",
        "exchange": "OTC",
        "industry": "Automotive",
        "country": "Germany",
        "description": "Largest automaker by revenue. Aggressive EV transition post-Dieselgate with €180B investment in electrification.",
        "market_cap": "$60B",
        "logo_url": None,
    },
    {
        "name": "Meta Platforms Inc.",
        "ticker": "META",
        "exchange": "NASDAQ",
        "industry": "Technology / Social Media",
        "country": "United States",
        "description": "Social media and AI conglomerate operating Facebook, Instagram and WhatsApp. Heavy AI investment via LLaMA and Meta AI.",
        "market_cap": "$1.4T",
        "logo_url": None,
    },
    {
        "name": "QUALCOMM Incorporated",
        "ticker": "QCOM",
        "exchange": "NASDAQ",
        "industry": "Semiconductors / Wireless",
        "country": "United States",
        "description": "Leading wireless chipmaker with strong AI on-device and connectivity exposure.",
        "market_cap": "$210B",
        "logo_url": None,
    },
    {
        "name": "Intel Corporation",
        "ticker": "INTC",
        "exchange": "NASDAQ",
        "industry": "Semiconductors",
        "country": "United States",
        "description": "X86 and foundry leader rebuilding AI and advanced manufacturing position.",
        "market_cap": "$180B",
        "logo_url": None,
    },
    {
        "name": "Texas Instruments Incorporated",
        "ticker": "TXN",
        "exchange": "NASDAQ",
        "industry": "Semiconductors",
        "country": "United States",
        "description": "Analog and embedded chip maker with durable cash flow and industrial exposure.",
        "market_cap": "$170B",
        "logo_url": None,
    },
    {
        "name": "Analog Devices, Inc.",
        "ticker": "ADI",
        "exchange": "NASDAQ",
        "industry": "Semiconductors",
        "country": "United States",
        "description": "High-performance analog and signal processing company serving industrial and automotive markets.",
        "market_cap": "$110B",
        "logo_url": None,
    },
    {
        "name": "Applied Materials, Inc.",
        "ticker": "AMAT",
        "exchange": "NASDAQ",
        "industry": "Semiconductor Equipment",
        "country": "United States",
        "description": "Semiconductor equipment supplier benefiting from AI-capex and wafer fab expansion.",
        "market_cap": "$180B",
        "logo_url": None,
    },
    {
        "name": "Lam Research Corporation",
        "ticker": "LRCX",
        "exchange": "NASDAQ",
        "industry": "Semiconductor Equipment",
        "country": "United States",
        "description": "Etch and deposition specialist tied to memory and logic fab investment cycles.",
        "market_cap": "$140B",
        "logo_url": None,
    },
    {
        "name": "KLA Corporation",
        "ticker": "KLAC",
        "exchange": "NASDAQ",
        "industry": "Semiconductor Equipment",
        "country": "United States",
        "description": "Process control and inspection leader critical to advanced node manufacturing.",
        "market_cap": "$100B",
        "logo_url": None,
    },
    {
        "name": "Palo Alto Networks, Inc.",
        "ticker": "PANW",
        "exchange": "NASDAQ",
        "industry": "Cybersecurity",
        "country": "United States",
        "description": "Cybersecurity platform business with strong enterprise security adoption.",
        "market_cap": "$120B",
        "logo_url": None,
    },
    {
        "name": "Synopsys, Inc.",
        "ticker": "SNPS",
        "exchange": "NASDAQ",
        "industry": "Semiconductor Software",
        "country": "United States",
        "description": "EDA and silicon design software leader enabling next-generation chip development.",
        "market_cap": "$90B",
        "logo_url": None,
    },
    {
        "name": "Cadence Design Systems, Inc.",
        "ticker": "CDNS",
        "exchange": "NASDAQ",
        "industry": "Semiconductor Software",
        "country": "United States",
        "description": "EDA software provider powering chip and system design workflows.",
        "market_cap": "$80B",
        "logo_url": None,
    },
    {
        "name": "ServiceNow, Inc.",
        "ticker": "NOW",
        "exchange": "NYSE",
        "industry": "Enterprise Software",
        "country": "United States",
        "description": "Workflow automation and enterprise platform company with strong AI assistant rollout.",
        "market_cap": "$170B",
        "logo_url": None,
    },
    {
        "name": "CrowdStrike Holdings, Inc.",
        "ticker": "CRWD",
        "exchange": "NASDAQ",
        "industry": "Cybersecurity",
        "country": "United States",
        "description": "Cloud-native cybersecurity platform focused on endpoint and identity defense.",
        "market_cap": "$110B",
        "logo_url": None,
    },
    {
        "name": "Arm Holdings plc",
        "ticker": "ARM",
        "exchange": "NASDAQ",
        "industry": "Semiconductors / IP",
        "country": "United Kingdom",
        "description": "Chip architecture and IP licensor central to mobile and AI edge compute.",
        "market_cap": "$150B",
        "logo_url": None,
    },
    {
        "name": "Dell Technologies Inc.",
        "ticker": "DELL",
        "exchange": "NYSE",
        "industry": "Technology Hardware",
        "country": "United States",
        "description": "Infrastructure hardware company exposed to AI server demand and enterprise refresh cycles.",
        "market_cap": "$90B",
        "logo_url": None,
    },
    {
        "name": "Hewlett Packard Enterprise Company",
        "ticker": "HPE",
        "exchange": "NYSE",
        "industry": "Technology Hardware",
        "country": "United States",
        "description": "Enterprise server, networking and AI infrastructure supplier.",
        "market_cap": "$25B",
        "logo_url": None,
    },
    {
        "name": "Nike, Inc.",
        "ticker": "NKE",
        "exchange": "NYSE",
        "industry": "Consumer Discretionary",
        "country": "United States",
        "description": "Global athletic apparel company under pressure from margin compression and slowing growth.",
        "market_cap": "$140B",
        "logo_url": None,
        "website_url": "https://www.nike.com",
        "executive_name": "Leadership",
        "executive_url": "https://investors.nike.com",
    },
    {
        "name": "The Boeing Company",
        "ticker": "BA",
        "exchange": "NYSE",
        "industry": "Aerospace & Defense",
        "country": "United States",
        "description": "Aircraft manufacturer facing deep operational, quality and governance challenges.",
        "market_cap": "$110B",
        "logo_url": None,
        "website_url": "https://www.boeing.com",
        "executive_name": "Leadership",
        "executive_url": "https://investors.boeing.com",
    },
    {
        "name": "Paramount Global",
        "ticker": "PARA",
        "exchange": "NASDAQ",
        "industry": "Media & Entertainment",
        "country": "United States",
        "description": "Legacy media group facing structural decline, streaming losses and balance sheet pressure.",
        "market_cap": "$8B",
        "logo_url": None,
        "website_url": "https://www.paramount.com",
        "executive_name": "Leadership",
        "executive_url": "https://ir.paramount.com",
    },
    {
        "name": "Walgreens Boots Alliance, Inc.",
        "ticker": "WBA",
        "exchange": "NASDAQ",
        "industry": "Healthcare Retail",
        "country": "United States",
        "description": "Pharmacy retailer under structural pressure from reimbursement compression and store rationalisation.",
        "market_cap": "$18B",
        "logo_url": None,
        "website_url": "https://www.walgreensbootsalliance.com",
        "executive_name": "Leadership",
        "executive_url": "https://investor.walgreensbootsalliance.com",
    },
    {
        "name": "Warner Bros. Discovery, Inc.",
        "ticker": "WBD",
        "exchange": "NASDAQ",
        "industry": "Media & Entertainment",
        "country": "United States",
        "description": "Media company facing heavy leverage, integration complexity and subscriber volatility.",
        "market_cap": "$24B",
        "logo_url": None,
        "website_url": "https://www.wbd.com",
        "executive_name": "Leadership",
        "executive_url": "https://ir.wbd.com",
    },
]

SGX_COMPANIES = [
    {
        "name": "DBS Group Holdings Ltd",
        "ticker": "D05.SI",
        "exchange": "SGX",
        "industry": "Banking",
        "country": "Singapore",
        "description": "Singapore's largest bank with leading digital banking and regional wealth-management footprint.",
        "market_cap": "$100B",
        "logo_url": None,
    },
    {
        "name": "Oversea-Chinese Banking Corporation",
        "ticker": "O39.SI",
        "exchange": "SGX",
        "industry": "Banking",
        "country": "Singapore",
        "description": "Regional banking group with strong retail, SME and wealth franchises across Southeast Asia.",
        "market_cap": "$70B",
        "logo_url": None,
    },
    {
        "name": "United Overseas Bank Limited",
        "ticker": "U11.SI",
        "exchange": "SGX",
        "industry": "Banking",
        "country": "Singapore",
        "description": "Asia-focused bank with diversified corporate, retail and treasury operations.",
        "market_cap": "$45B",
        "logo_url": None,
    },
    {
        "name": "Singapore Airlines Limited",
        "ticker": "C6L.SI",
        "exchange": "SGX",
        "industry": "Airlines",
        "country": "Singapore",
        "description": "Flag carrier with global long-haul and regional operations centered on Changi hub traffic.",
        "market_cap": "$18B",
        "logo_url": None,
    },
    {
        "name": "Keppel Ltd",
        "ticker": "BN4.SI",
        "exchange": "SGX",
        "industry": "Diversified Industrials",
        "country": "Singapore",
        "description": "Infrastructure and asset-management group with energy transition and real-estate exposure.",
        "market_cap": "$12B",
        "logo_url": None,
    },
    {
        "name": "CapitaLand Investment Limited",
        "ticker": "9CI.SI",
        "exchange": "SGX",
        "industry": "Real Estate",
        "country": "Singapore",
        "description": "Global real-estate investment manager focused on funds, lodging and commercial assets.",
        "market_cap": "$16B",
        "logo_url": None,
    },
    {
        "name": "CapitaLand Integrated Commercial Trust",
        "ticker": "C38U.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Commercial REIT with high-quality Singapore office and retail assets.",
        "market_cap": "$10B",
        "logo_url": None,
    },
    {
        "name": "CapitaLand Ascendas REIT",
        "ticker": "A17U.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Industrial and business-park REIT with Asia-Pacific logistics and data-center exposure.",
        "market_cap": "$11B",
        "logo_url": None,
    },
    {
        "name": "Mapletree Pan Asia Commercial Trust",
        "ticker": "N2IU.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Commercial property trust with retail, office and mixed-use assets across Asia.",
        "market_cap": "$8B",
        "logo_url": None,
    },
    {
        "name": "Mapletree Logistics Trust",
        "ticker": "M44U.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Logistics REIT focused on warehouses and distribution assets in Asia-Pacific.",
        "market_cap": "$7B",
        "logo_url": None,
    },
    {
        "name": "Singapore Exchange Limited",
        "ticker": "S68.SI",
        "exchange": "SGX",
        "industry": "Financial Infrastructure",
        "country": "Singapore",
        "description": "Exchange operator and market infrastructure provider for equities, derivatives and commodities.",
        "market_cap": "$11B",
        "logo_url": None,
    },
    {
        "name": "Wilmar International Limited",
        "ticker": "F34.SI",
        "exchange": "SGX",
        "industry": "Consumer Goods",
        "country": "Singapore",
        "description": "Agribusiness and food-processing giant with extensive edible-oil and consumer food operations.",
        "market_cap": "$10B",
        "logo_url": None,
    },
    {
        "name": "SATS Ltd",
        "ticker": "5E2.SI",
        "exchange": "SGX",
        "industry": "Aviation Services",
        "country": "Singapore",
        "description": "Airport services and inflight catering provider tied to regional travel demand.",
        "market_cap": "$6B",
        "logo_url": None,
    },
    {
        "name": "ComfortDelGro Corporation Limited",
        "ticker": "C52.SI",
        "exchange": "SGX",
        "industry": "Transport",
        "country": "Singapore",
        "description": "Transport operator spanning buses, rail, taxis and overseas mobility services.",
        "market_cap": "$5B",
        "logo_url": None,
    },
    {
        "name": "Singapore Technologies Engineering Ltd",
        "ticker": "S63.SI",
        "exchange": "SGX",
        "industry": "Industrial Technology",
        "country": "Singapore",
        "description": "Defence, aerospace and smart-city technology group with growing engineering services exposure.",
        "market_cap": "$18B",
        "logo_url": None,
    },
    {
        "name": "Jardine Cycle & Carriage Limited",
        "ticker": "C07.SI",
        "exchange": "SGX",
        "industry": "Industrials",
        "country": "Singapore",
        "description": "Diversified holding company with automotive and infrastructure-linked investments.",
        "market_cap": "$9B",
        "logo_url": None,
    },
    {
        "name": "Jardine Matheson Holdings Limited",
        "ticker": "J36.SI",
        "exchange": "SGX",
        "industry": "Diversified Holdings",
        "country": "Singapore",
        "description": "Regional conglomerate spanning retail, property, automotive and infrastructure.",
        "market_cap": "$15B",
        "logo_url": None,
    },
    {
        "name": "Genting Singapore Limited",
        "ticker": "G13.SI",
        "exchange": "SGX",
        "industry": "Leisure / Gaming",
        "country": "Singapore",
        "description": "Integrated resort operator with casino, hospitality and leisure exposure.",
        "market_cap": "$8B",
        "logo_url": None,
    },
    {
        "name": "Hongkong Land Holdings Limited",
        "ticker": "H78.SI",
        "exchange": "SGX",
        "industry": "Real Estate",
        "country": "Singapore",
        "description": "Prime commercial property owner and developer with high-quality Asia-city assets.",
        "market_cap": "$13B",
        "logo_url": None,
    },
    {
        "name": "Sembcorp Industries Ltd",
        "ticker": "S59.SI",
        "exchange": "SGX",
        "industry": "Utilities / Energy",
        "country": "Singapore",
        "description": "Energy and urban solutions group with power generation, renewables and integrated urban infrastructure exposure.",
        "market_cap": "$13B",
        "logo_url": None,
    },
    {
        "name": "City Developments Limited",
        "ticker": "C09.SI",
        "exchange": "SGX",
        "industry": "Real Estate",
        "country": "Singapore",
        "description": "Diversified property developer and hotel operator with global real-estate exposure.",
        "market_cap": "$7B",
        "logo_url": None,
    },
    {
        "name": "UOL Group Limited",
        "ticker": "U14.SI",
        "exchange": "SGX",
        "industry": "Real Estate",
        "country": "Singapore",
        "description": "Property developer and hotel owner with a strong portfolio of commercial and residential assets.",
        "market_cap": "$6B",
        "logo_url": None,
    },
    {
        "name": "Singapore Post Limited",
        "ticker": "S08.SI",
        "exchange": "SGX",
        "industry": "Logistics",
        "country": "Singapore",
        "description": "Postal and logistics operator providing domestic mail, parcel and cross-border fulfillment services.",
        "market_cap": "$1B",
        "logo_url": None,
    },
    {
        "name": "StarHub Ltd",
        "ticker": "CC3.SI",
        "exchange": "SGX",
        "industry": "Telecommunications",
        "country": "Singapore",
        "description": "Telecom and digital services provider with mobile, broadband and enterprise solutions.",
        "market_cap": "$1B",
        "logo_url": None,
    },
    {
        "name": "Olam Group Limited",
        "ticker": "VC2.SI",
        "exchange": "SGX",
        "industry": "Consumer Goods",
        "country": "Singapore",
        "description": "Global food and agri-business group with supply-chain, ingredients and processing operations.",
        "market_cap": "$3B",
        "logo_url": None,
    },
    {
        "name": "Yangzijiang Financial Holding Ltd",
        "ticker": "YF8.SI",
        "exchange": "SGX",
        "industry": "Financial Services",
        "country": "Singapore",
        "description": "Financial holding company with investment and trust-related exposure across Asia.",
        "market_cap": "$4B",
        "logo_url": None,
    },
    {
        "name": "Yangzijiang Shipbuilding Holdings Ltd",
        "ticker": "BS6.SI",
        "exchange": "SGX",
        "industry": "Industrials",
        "country": "Singapore",
        "description": "Shipbuilder with strong order backlog in containership and specialty vessel construction.",
        "market_cap": "$12B",
        "logo_url": None,
    },
    {
        "name": "CapitaLand China Trust",
        "ticker": "C31.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "China-focused retail and business-park trust listed in Singapore.",
        "market_cap": "$2B",
        "logo_url": None,
    },
    {
        "name": "Frasers Centrepoint Trust",
        "ticker": "J69U.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Retail REIT with a portfolio of suburban malls and shopping centers in Singapore.",
        "market_cap": "$10B",
        "logo_url": None,
    },
    {
        "name": "Mapletree Industrial Trust",
        "ticker": "ME8U.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Industrial REIT with data-center, business park and hi-tech industrial exposure.",
        "market_cap": "$6B",
        "logo_url": None,
    },
    {
        "name": "Keppel DC REIT",
        "ticker": "K71U.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Data-center REIT positioned to benefit from cloud and AI infrastructure demand.",
        "market_cap": "$5B",
        "logo_url": None,
    },
    {
        "name": "CapitaLand Ascott Trust",
        "ticker": "J91U.SI",
        "exchange": "SGX",
        "industry": "Hospitality REIT",
        "country": "Singapore",
        "description": "Serviced residence and hospitality trust with global lodging assets.",
        "market_cap": "$3B",
        "logo_url": None,
    },
    {
        "name": "ESR-LOGOS REIT",
        "ticker": "A7RU.SI",
        "exchange": "SGX",
        "industry": "Industrial REIT",
        "country": "Singapore",
        "description": "Industrial and logistics REIT with Asia-Pacific warehouse and data-center exposure.",
        "market_cap": "$2B",
        "logo_url": None,
    },
    {
        "name": "Frasers Logistics & Commercial Trust",
        "ticker": "C2PU.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Logistics and commercial property trust with international industrial assets.",
        "market_cap": "$3B",
        "logo_url": None,
    },
    {
        "name": "Suntec REIT",
        "ticker": "T82U.SI",
        "exchange": "SGX",
        "industry": "REIT",
        "country": "Singapore",
        "description": "Singapore-focused office and retail REIT with a flagship city-center portfolio.",
        "market_cap": "$4B",
        "logo_url": None,
    },
    {
        "name": "Banyan Tree Holdings Limited",
        "ticker": "B58.SI",
        "exchange": "SGX",
        "industry": "Hospitality",
        "country": "Singapore",
        "description": "Hospitality and wellness group with resorts, hotels and branded residences.",
        "market_cap": "$1B",
        "logo_url": None,
    },
    {
        "name": "Haw Par Corporation Limited",
        "ticker": "F10.SI",
        "exchange": "SGX",
        "industry": "Consumer Goods",
        "country": "Singapore",
        "description": "Consumer healthcare and investment holding company known for Tiger Balm brands.",
        "market_cap": "$3B",
        "logo_url": None,
    },
    {
        "name": "NetLink NBN Trust",
        "ticker": "O9E.SI",
        "exchange": "SGX",
        "industry": "Telecommunications Infrastructure",
        "country": "Singapore",
        "description": "Fiber network infrastructure trust serving Singapore's nationwide broadband network.",
        "market_cap": "$2B",
        "logo_url": None,
    },
    {
        "name": "CDL Hospitality Trusts",
        "ticker": "C61U.SI",
        "exchange": "SGX",
        "industry": "Hospitality REIT",
        "country": "Singapore",
        "description": "Hospitality trust with hotels and serviced apartments across Singapore and overseas markets.",
        "market_cap": "$2B",
        "logo_url": None,
    },
]

COMPANIES.extend(SGX_COMPANIES)

COMPANY_LINKS = {
    "TSLA": {"website_url": "https://www.tesla.com", "executive_name": "Leadership", "executive_url": "https://ir.tesla.com"},
    "MSFT": {"website_url": "https://www.microsoft.com", "executive_name": "Leadership", "executive_url": "https://www.microsoft.com/en-us/Investor"},
    "AAPL": {"website_url": "https://www.apple.com", "executive_name": "Leadership", "executive_url": "https://investor.apple.com"},
    "NVDA": {"website_url": "https://www.nvidia.com", "executive_name": "Leadership", "executive_url": "https://investor.nvidia.com"},
    "MU": {"website_url": "https://www.micron.com", "executive_name": "Leadership", "executive_url": "https://investors.micron.com"},
    "GOOGL": {"website_url": "https://www.google.com", "executive_name": "Leadership", "executive_url": "https://abc.xyz/investor/"},
    "AVGO": {"website_url": "https://www.broadcom.com", "executive_name": "Leadership", "executive_url": "https://investors.broadcom.com"},
    "AMD": {"website_url": "https://www.amd.com", "executive_name": "Leadership", "executive_url": "https://ir.amd.com"},
    "JPM": {"website_url": "https://www.jpmorganchase.com", "executive_name": "Leadership", "executive_url": "https://www.jpmorganchase.com/ir"},
    "V": {"website_url": "https://www.visa.com", "executive_name": "Leadership", "executive_url": "https://investor.visa.com"},
    "MA": {"website_url": "https://www.mastercard.com", "executive_name": "Leadership", "executive_url": "https://investor.mastercard.com"},
    "WMT": {"website_url": "https://www.walmart.com", "executive_name": "Leadership", "executive_url": "https://stock.walmart.com"},
    "PG": {"website_url": "https://www.pg.com", "executive_name": "Leadership", "executive_url": "https://investor.pg.com"},
    "KO": {"website_url": "https://www.coca-cola.com", "executive_name": "Leadership", "executive_url": "https://investors.coca-colacompany.com"},
    "CVX": {"website_url": "https://www.chevron.com", "executive_name": "Leadership", "executive_url": "https://www.chevron.com/investors"},
    "NSRGY": {"website_url": "https://www.nestle.com", "executive_name": "Leadership", "executive_url": "https://www.nestle.com/investors"},
    "SAP": {"website_url": "https://www.sap.com", "executive_name": "Leadership", "executive_url": "https://www.sap.com/investors"},
    "ORCL": {"website_url": "https://www.oracle.com", "executive_name": "Leadership", "executive_url": "https://investor.oracle.com"},
    "CSCO": {"website_url": "https://www.cisco.com", "executive_name": "Leadership", "executive_url": "https://investor.cisco.com"},
    "IBM": {"website_url": "https://www.ibm.com", "executive_name": "Leadership", "executive_url": "https://www.ibm.com/investor"},
    "AMZN": {"website_url": "https://www.amazon.com", "executive_name": "Leadership", "executive_url": "https://ir.aboutamazon.com"},
    "XOM": {"website_url": "https://corporate.exxonmobil.com", "executive_name": "Leadership", "executive_url": "https://corporate.exxonmobil.com/investors"},
    "META": {"website_url": "https://about.meta.com", "executive_name": "Leadership", "executive_url": "https://investor.atmeta.com"},
    "TM": {"website_url": "https://global.toyota", "executive_name": "Leadership", "executive_url": "https://global.toyota/en/company/"},
    "VWAGY": {"website_url": "https://www.volkswagen-group.com", "executive_name": "Leadership", "executive_url": "https://www.volkswagen-group.com/en/board-of-management"},
    "BYDDF": {"website_url": "https://www.byd.com", "executive_name": "Leadership", "executive_url": "https://www.byd.com/en/company/management"},
    "NKE": {"website_url": "https://www.nike.com", "executive_name": "Leadership", "executive_url": "https://investors.nike.com"},
    "BA": {"website_url": "https://www.boeing.com", "executive_name": "Leadership", "executive_url": "https://investors.boeing.com"},
    "PARA": {"website_url": "https://www.paramount.com", "executive_name": "Leadership", "executive_url": "https://ir.paramount.com"},
    "WBA": {"website_url": "https://www.walgreensbootsalliance.com", "executive_name": "Leadership", "executive_url": "https://investor.walgreensbootsalliance.com"},
    "WBD": {"website_url": "https://www.wbd.com", "executive_name": "Leadership", "executive_url": "https://ir.wbd.com"},
}

VALUE_TRAP_HISTORY = [
    {"esg": 41, "momentum": -22, "ai": 38, "controversy": 80, "env": 34, "soc": 49, "gov": 50, "classification": "Value Trap", "signal": "Avoid"},
    {"esg": 40, "momentum": -24, "ai": 37, "controversy": 82, "env": 33, "soc": 48, "gov": 49, "classification": "Value Trap", "signal": "Avoid"},
    {"esg": 39, "momentum": -26, "ai": 37, "controversy": 83, "env": 32, "soc": 47, "gov": 48, "classification": "Value Trap", "signal": "Risk Alert"},
    {"esg": 38, "momentum": -28, "ai": 36, "controversy": 85, "env": 31, "soc": 47, "gov": 47, "classification": "Value Trap", "signal": "Risk Alert"},
    {"esg": 37, "momentum": -30, "ai": 36, "controversy": 86, "env": 30, "soc": 46, "gov": 46, "classification": "Value Trap", "signal": "Risk Alert"},
    {"esg": 36, "momentum": -31, "ai": 35, "controversy": 88, "env": 29, "soc": 45, "gov": 45, "classification": "Value Trap", "signal": "Risk Alert"},
    {"esg": 35, "momentum": -33, "ai": 35, "controversy": 89, "env": 28, "soc": 44, "gov": 44, "classification": "Value Trap", "signal": "Risk Alert"},
    {"esg": 34, "momentum": -35, "ai": 34, "controversy": 90, "env": 27, "soc": 43, "gov": 43, "classification": "Value Trap", "signal": "Avoid"},
]


def _default_history(ticker: str):
    seed_value = sum(ord(char) for char in ticker)
    base_esg = 48 + (seed_value % 10)
    base_momentum = -8 + (seed_value % 7) * 4
    base_ai = 42 + (seed_value % 9) * 5
    base_controversy = 62 - (seed_value % 6) * 5
    base_env = 46 + (seed_value % 8) * 4
    base_soc = 44 + (seed_value % 5) * 5
    base_gov = 48 + (seed_value % 6) * 4

    history = []
    for step in range(6):
        current_momentum = base_momentum + step * 5
        history.append({
            "esg": max(20, min(88, base_esg + step * 3)),
            "momentum": max(-35, min(45, current_momentum)),
            "ai": max(10, min(99, base_ai + step * 4)),
            "controversy": max(5, min(92, base_controversy - step * 2)),
            "env": max(20, min(95, base_env + step * 2)),
            "soc": max(20, min(95, base_soc + step * 2)),
            "gov": max(20, min(95, base_gov + step * 2)),
            "classification": (
                "Hidden Winner"
                if base_esg < 60 and current_momentum > 20
                else "Future Leader"
                if base_esg >= 60 and current_momentum > 20
                else "Watchlist"
            ),
            "signal": "Buy / Watchlist" if base_controversy - step * 2 < 75 else "Hold",
        })
    return history

SEED_METRICS = {
    "TSLA": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 52000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 280000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 68, "unit": "%", "year": 2024, "confidence_score": 0.80},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 24, "unit": "%", "year": 2024, "confidence_score": 0.75},
        {"metric_name": "Employee Turnover", "pillar": "social", "value": 22, "unit": "%", "year": 2024, "confidence_score": 0.70},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 55, "unit": "%", "year": 2024, "confidence_score": 0.90},
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 68000, "unit": "tCO2e", "year": 2023, "confidence_score": 0.85},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 340000, "unit": "tCO2e", "year": 2023, "confidence_score": 0.85},
    ],
    "MSFT": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 13000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.95},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 1600000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.92},
        {"metric_name": "Scope 3 Emissions", "pillar": "environmental", "value": 11900000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 100, "unit": "%", "year": 2024, "confidence_score": 0.95},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 33, "unit": "%", "year": 2024, "confidence_score": 0.90},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 92, "unit": "%", "year": 2024, "confidence_score": 0.95},
        {"metric_name": "Lost Time Injury Rate", "pillar": "social", "value": 0.3, "unit": "per 200k hrs", "year": 2024, "confidence_score": 0.80},
    ],
    "SHEL": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 68000000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.90},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 3200000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 12, "unit": "%", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 28, "unit": "%", "year": 2024, "confidence_score": 0.80},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 78, "unit": "%", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Lost Time Injury Rate", "pillar": "social", "value": 1.2, "unit": "per 200k hrs", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 72000000, "unit": "tCO2e", "year": 2023, "confidence_score": 0.88},
    ],
    "TM": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 5200000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 2100000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 25, "unit": "%", "year": 2024, "confidence_score": 0.80},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 12, "unit": "%", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 35, "unit": "%", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Lost Time Injury Rate", "pillar": "social", "value": 0.7, "unit": "per 200k hrs", "year": 2024, "confidence_score": 0.82},
    ],
    "BYDDF": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 1800000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.72},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 9500000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.68},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 42, "unit": "%", "year": 2024, "confidence_score": 0.70},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 18, "unit": "%", "year": 2024, "confidence_score": 0.65},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 45, "unit": "%", "year": 2024, "confidence_score": 0.70},
    ],
    "AAPL": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 38000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.96},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 60000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.96},
        {"metric_name": "Scope 3 Emissions", "pillar": "environmental", "value": 19400000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.90},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 100, "unit": "%", "year": 2024, "confidence_score": 0.99},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 35, "unit": "%", "year": 2024, "confidence_score": 0.92},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 88, "unit": "%", "year": 2024, "confidence_score": 0.95},
    ],
    "NVDA": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 22000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 150000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 75, "unit": "%", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 20, "unit": "%", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 82, "unit": "%", "year": 2024, "confidence_score": 0.90},
    ],
    "MU": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 180000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.86},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 420000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.86},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 68, "unit": "%", "year": 2024, "confidence_score": 0.84},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 27, "unit": "%", "year": 2024, "confidence_score": 0.82},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 79, "unit": "%", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "AI Memory Capacity Added", "pillar": "ai_adoption", "value": 42, "unit": "%", "year": 2024, "confidence_score": 0.83},
    ],
    "AMZN": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 340000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 5200000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Scope 3 Emissions", "pillar": "environmental", "value": 68000000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.82},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 100, "unit": "%", "year": 2024, "confidence_score": 0.90},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 30, "unit": "%", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 78, "unit": "%", "year": 2024, "confidence_score": 0.88},
    ],
    "XOM": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 105000000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.90},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 8000000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 5, "unit": "%", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 30, "unit": "%", "year": 2024, "confidence_score": 0.82},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 72, "unit": "%", "year": 2024, "confidence_score": 0.88},
    ],
    "VWAGY": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 3200000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 4800000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 38, "unit": "%", "year": 2024, "confidence_score": 0.82},
        {"metric_name": "EV Share of Sales", "pillar": "environmental", "value": 22, "unit": "%", "year": 2024, "confidence_score": 0.90},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 18, "unit": "%", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 55, "unit": "%", "year": 2024, "confidence_score": 0.82},
    ],
    "META": [
        {"metric_name": "Scope 1 Emissions", "pillar": "environmental", "value": 45000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.88},
        {"metric_name": "Scope 2 Emissions", "pillar": "environmental", "value": 6100000, "unit": "tCO2e", "year": 2024, "confidence_score": 0.85},
        {"metric_name": "Renewable Energy Share", "pillar": "environmental", "value": 100, "unit": "%", "year": 2024, "confidence_score": 0.92},
        {"metric_name": "Women in Leadership", "pillar": "social", "value": 36, "unit": "%", "year": 2024, "confidence_score": 0.90},
        {"metric_name": "Board Independence", "pillar": "governance", "value": 45, "unit": "%", "year": 2024, "confidence_score": 0.85},
    ],
}

SEED_SIGNALS = {
    "TSLA": [
        {"title": "Tesla reduces factory energy consumption by 18% in 2024", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2024-11-15", "source": "Tesla Sustainability Report 2024", "explanation": "Significant reduction in Gigafactory energy intensity through AI-driven optimization.", "confidence_score": 0.85},
        {"title": "Tesla Autopilot investigated by NHTSA over fatal crashes", "category": "controversy", "sentiment": "negative", "severity": 7.5, "date": "2024-08-22", "source": "Reuters", "explanation": "US safety regulator opened formal investigation into Autopilot system following 12 fatalities.", "confidence_score": 0.92},
        {"title": "Tesla launches AI-powered energy management platform for utilities", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-01-10", "source": "Tesla Blog", "explanation": "New AI platform optimizes grid-scale battery deployment and demand response.", "confidence_score": 0.88},
        {"title": "Tesla worker safety concerns raised at Fremont factory", "category": "social", "sentiment": "negative", "severity": 5.0, "date": "2024-06-18", "source": "The Guardian", "explanation": "Union group reported elevated injury rates at Fremont compared to industry average.", "confidence_score": 0.78},
        {"title": "Tesla board independence below peer average, governance concerns raised", "category": "governance", "sentiment": "negative", "severity": 4.0, "date": "2024-09-30", "source": "ISS Proxy Advisory", "explanation": "Institutional Shareholder Services flagged low board independence ratio.", "confidence_score": 0.82},
        {"title": "Tesla Megapack deployments hit record high in Q3 2025", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-10-15", "source": "Tesla Earnings Call", "explanation": "Grid storage deployments up 145% year-over-year, accelerating clean energy transition.", "confidence_score": 0.90},
        {"title": "Tesla expands AI supercomputer Dojo training capacity", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-03-20", "source": "Tesla AI Day", "explanation": "Dojo supercomputer expansion signals major AI infrastructure investment.", "confidence_score": 0.87},
    ],
    "MSFT": [
        {"title": "Microsoft achieves 100% renewable energy across global operations", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-05-12", "source": "Microsoft Sustainability Report 2025", "explanation": "Matched 100% of electricity consumption with renewable energy purchases and on-site generation.", "confidence_score": 0.95},
        {"title": "Microsoft commits $1B to carbon removal technologies by 2030", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-02-14", "source": "Microsoft Blog", "explanation": "Investment in direct air capture and nature-based carbon removal solutions.", "confidence_score": 0.92},
        {"title": "Microsoft integrates AI across all M365 productivity suite with Copilot", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2024-10-01", "source": "Microsoft Earnings", "explanation": "Copilot AI assistant deployed to 400M+ Microsoft 365 users globally.", "confidence_score": 0.95},
        {"title": "Microsoft AI data center water consumption raises environmental concerns", "category": "environmental", "sentiment": "negative", "severity": 3.5, "date": "2024-11-20", "source": "Bloomberg", "explanation": "AI model training significantly increasing water cooling requirements at data centers.", "confidence_score": 0.85},
        {"title": "Microsoft gender pay equity audit shows 99.9% parity", "category": "social", "sentiment": "positive", "severity": 0.0, "date": "2025-03-08", "source": "Microsoft Diversity Report", "explanation": "Annual pay equity analysis confirms near-parity across genders and ethnicities.", "confidence_score": 0.90},
        {"title": "Microsoft Azure AI partnerships with healthcare leaders expand", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-06-05", "source": "Microsoft News", "explanation": "New AI diagnostics partnerships with Mayo Clinic, Philips and GSK announced.", "confidence_score": 0.88},
        {"title": "Microsoft board diversity reaches 58% non-white or female directors", "category": "governance", "sentiment": "positive", "severity": 0.0, "date": "2025-07-01", "source": "Microsoft Proxy Statement", "explanation": "Board composition improvement reflects commitment to diverse leadership.", "confidence_score": 0.92},
    ],
    "SHEL": [
        {"title": "Shell wins legal challenge to slow climate transition targets", "category": "controversy", "sentiment": "negative", "severity": 8.0, "date": "2024-11-12", "source": "Financial Times", "explanation": "Court overturns earlier ruling requiring Shell to cut emissions faster, controversy remains elevated.", "confidence_score": 0.90},
        {"title": "Shell Scope 3 emissions disclosure criticized as incomplete", "category": "environmental", "sentiment": "negative", "severity": 6.0, "date": "2024-09-18", "source": "Carbon Tracker", "explanation": "Analysis finds Shell's Scope 3 reporting excludes significant portions of value chain emissions.", "confidence_score": 0.88},
        {"title": "Shell invests $500M in offshore wind expansion", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-01-22", "source": "Shell Press Release", "explanation": "New offshore wind capacity in North Sea targeting 6GW by 2030.", "confidence_score": 0.82},
        {"title": "Shell Nigeria oil spill affects 50,000 residents - settlement reached", "category": "controversy", "sentiment": "negative", "severity": 9.0, "date": "2024-07-08", "source": "BBC News", "explanation": "Historic settlement of $95M for oil contamination affecting Niger Delta communities.", "confidence_score": 0.95},
        {"title": "Shell cuts renewable energy division workforce by 20%", "category": "social", "sentiment": "negative", "severity": 5.0, "date": "2024-05-30", "source": "Reuters", "explanation": "Strategy shift away from renewable energy investments results in significant layoffs.", "confidence_score": 0.88},
        {"title": "Shell faces regulatory probe over carbon credit quality", "category": "governance", "sentiment": "negative", "severity": 6.5, "date": "2025-03-15", "source": "Guardian", "explanation": "Regulator investigating whether Shell's carbon offset credits meet quality standards.", "confidence_score": 0.85},
        {"title": "Shell AI deployment in seismic analysis reduces exploration costs", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2024-12-01", "source": "Shell Technology Report", "explanation": "AI-powered seismic data analysis reducing exploration costs by 30%.", "confidence_score": 0.72},
    ],
    "TM": [
        {"title": "Toyota hydrogen fuel cell strategy gains momentum in Japan", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-04-10", "source": "Nikkei Asia", "explanation": "Toyota's MIRAI fuel cell vehicle gaining traction as hydrogen infrastructure develops.", "confidence_score": 0.80},
        {"title": "Toyota criticized for slowest EV transition among major automakers", "category": "environmental", "sentiment": "negative", "severity": 5.5, "date": "2024-10-22", "source": "Greenpeace Japan", "explanation": "NGO report ranks Toyota last among global automakers in EV transition speed.", "confidence_score": 0.85},
        {"title": "Toyota board independence among lowest in Nikkei 225", "category": "governance", "sentiment": "negative", "severity": 4.5, "date": "2025-02-28", "source": "Glass Lewis", "explanation": "Governance advisory firm flags insider-dominated board structure.", "confidence_score": 0.88},
        {"title": "Toyota announces AI-powered manufacturing quality control system", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-01-15", "source": "Toyota Press", "explanation": "Computer vision AI system reducing manufacturing defects by 45% at pilot plants.", "confidence_score": 0.82},
        {"title": "Toyota partners with Waymo on autonomous vehicle technology", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2024-09-05", "source": "Reuters", "explanation": "Strategic partnership combining Toyota manufacturing with Waymo AI driving capabilities.", "confidence_score": 0.85},
        {"title": "Toyota women in executive leadership at 12%, below global average", "category": "social", "sentiment": "negative", "severity": 3.0, "date": "2025-03-10", "source": "Toyota Annual Report", "explanation": "Gender diversity in senior management significantly below industry peers.", "confidence_score": 0.90},
        {"title": "Toyota supply chain audit reveals labour concerns in Southeast Asia", "category": "social", "sentiment": "negative", "severity": 6.0, "date": "2024-08-15", "source": "Business & Human Rights", "explanation": "Third-party audit identifies labour standard gaps among tier-2 suppliers.", "confidence_score": 0.78},
    ],
    "BYDDF": [
        {"title": "BYD surpasses Tesla in global EV sales for second consecutive year", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-01-08", "source": "Bloomberg", "explanation": "BYD delivered 4.2M EVs in 2024, reducing global transport emissions at scale.", "confidence_score": 0.92},
        {"title": "BYD launches solid-state battery with 1000km range - revolutionary breakthrough", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-05-20", "source": "South China Morning Post", "explanation": "Next-generation battery technology signals massive leap in EV energy density.", "confidence_score": 0.85},
        {"title": "BYD labour practices in factories face independent scrutiny", "category": "social", "sentiment": "negative", "severity": 5.5, "date": "2024-11-30", "source": "Business Insider", "explanation": "Independent researchers document overtime violations and dormitory conditions at Shenzhen plants.", "confidence_score": 0.75},
        {"title": "BYD ESG reporting lacks third-party verification and Scope 3 data", "category": "environmental", "sentiment": "negative", "severity": 4.5, "date": "2025-02-10", "source": "MSCI ESG Research", "explanation": "MSCI flags significant data gaps in BYD's ESG disclosure compared to global peers.", "confidence_score": 0.82},
        {"title": "BYD expands AI-powered DiPilot autonomous driving globally", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-03-25", "source": "BYD Press", "explanation": "AI driving assistant rolled out to 5M vehicles, accelerating autonomous capability.", "confidence_score": 0.80},
        {"title": "BYD renewable energy self-sufficiency reaches 42% at manufacturing sites", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-04-18", "source": "BYD Sustainability", "explanation": "Solar and wind integration at factories reduces manufacturing carbon footprint.", "confidence_score": 0.78},
        {"title": "BYD governance concerns: founding family control limits shareholder rights", "category": "governance", "sentiment": "negative", "severity": 4.0, "date": "2024-12-05", "source": "Institutional Investor", "explanation": "Wang Chuanfu family control structure limits independent oversight of board decisions.", "confidence_score": 0.80},
    ],
    "AAPL": [
        {"title": "Apple achieves carbon neutrality across all corporate operations", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-01-15", "source": "Apple Environmental Report 2025", "explanation": "Apple has been carbon neutral across global corporate operations since 2020, covering Scope 1 and 2 emissions.", "confidence_score": 0.96},
        {"title": "Apple Intelligence AI launches across 2 billion active devices", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-03-10", "source": "Apple WWDC 2025", "explanation": "Apple Intelligence generative AI framework deployed to over 2B active devices, a historic scale milestone.", "confidence_score": 0.95},
        {"title": "Apple supplier program achieves 95% renewable energy coverage", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-02-20", "source": "Apple Supplier Progress Report", "explanation": "280+ Apple suppliers now powered by renewable energy through Supplier Clean Energy Program.", "confidence_score": 0.92},
        {"title": "Apple fined €500M by EU for App Store antitrust violations", "category": "governance", "sentiment": "negative", "severity": 5.5, "date": "2025-04-05", "source": "European Commission", "explanation": "EU fines Apple for restricting app developers from steering users to alternative purchase channels.", "confidence_score": 0.95},
        {"title": "Apple M4 neural engine delivers AI inference 60% more energy-efficiently", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-05-10", "source": "Apple Developer Conference", "explanation": "New silicon architecture reduces AI compute energy intensity, benefiting both performance and sustainability.", "confidence_score": 0.90},
        {"title": "Apple Scope 3 emissions climb 6% driven by product manufacturing scale", "category": "environmental", "sentiment": "negative", "severity": 3.0, "date": "2025-01-20", "source": "Apple Environmental Progress Report", "explanation": "Value chain Scope 3 emissions remain the dominant challenge at 19.4 million tonnes CO2e.", "confidence_score": 0.88},
        {"title": "Apple removes conflict minerals from supply chain ahead of schedule", "category": "social", "sentiment": "positive", "severity": 0.0, "date": "2024-09-25", "source": "Apple Conflict Minerals Report", "explanation": "100% of smelters in Apple's supply chain verified conflict-free by independent auditors.", "confidence_score": 0.91},
    ],
    "NVDA": [
        {"title": "NVIDIA announces $500B investment in US AI infrastructure", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-04-15", "source": "NVIDIA Press Release", "explanation": "Massive domestic AI manufacturing and data center investment signals long-term AI infrastructure leadership.", "confidence_score": 0.95},
        {"title": "NVIDIA Blackwell GPU powers 80% of new AI data center deployments", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-03-05", "source": "NVIDIA Earnings Call", "explanation": "Blackwell architecture dominates enterprise AI adoption with 4x energy efficiency over prior generation.", "confidence_score": 0.92},
        {"title": "NVIDIA achieves 75% renewable energy at owned facilities", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-02-01", "source": "NVIDIA CSR Report 2025", "explanation": "Renewable energy share at NVIDIA-owned operations reaches 75%, ahead of 2025 targets.", "confidence_score": 0.88},
        {"title": "NVIDIA AI chips' energy demand raises global data center sustainability concerns", "category": "environmental", "sentiment": "negative", "severity": 4.5, "date": "2025-01-18", "source": "IEA Energy Report", "explanation": "Rapid GPU adoption driving exponential growth in data center electricity consumption globally.", "confidence_score": 0.85},
        {"title": "NVIDIA files 1,200 AI-related patents in 2024, industry record", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-01-10", "source": "USPTO Filing Data", "explanation": "Record patent activity reflects NVIDIA's deep AI innovation across hardware, software and systems.", "confidence_score": 0.88},
        {"title": "NVIDIA board independence and executive compensation scrutinised", "category": "governance", "sentiment": "negative", "severity": 3.5, "date": "2025-02-28", "source": "ISS Governance Report", "explanation": "Shareholder advisory flags high CEO compensation ratio and board refreshment pace.", "confidence_score": 0.82},
        {"title": "NVIDIA Project DIGITS personal AI supercomputer makes AI accessible", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-01-08", "source": "CES 2025", "explanation": "DIGITS brings datacenter-class AI to individual researchers, democratising AI development.", "confidence_score": 0.88},
    ],
    "MU": [
        {"title": "Micron AI memory demand surges with HBM3E adoption across data centers", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-05-08", "source": "Micron Investor Update", "explanation": "High-bandwidth memory shipments rise sharply as AI training demand expands across hyperscalers.", "confidence_score": 0.90},
        {"title": "Micron expands renewable electricity sourcing at global fabs", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-03-19", "source": "Micron Sustainability Report", "explanation": "Additional long-term renewable contracts lower operational emissions across memory manufacturing sites.", "confidence_score": 0.84},
        {"title": "Micron cyclical memory pricing pressure weighs on near-term margins", "category": "controversy", "sentiment": "negative", "severity": 4.0, "date": "2025-02-12", "source": "Reuters", "explanation": "Industry-wide DRAM and NAND pricing volatility remains a near-term earnings risk.", "confidence_score": 0.83},
        {"title": "Micron strengthens board governance with refreshed independent directors", "category": "governance", "sentiment": "positive", "severity": 0.0, "date": "2025-04-25", "source": "Micron Proxy Statement", "explanation": "Governance refresh improves board oversight amid accelerated AI and capital spending cycle.", "confidence_score": 0.81},
        {"title": "Micron reports record AI server memory backlog", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-06-02", "source": "Micron Earnings Call", "explanation": "Record backlog for HBM and server DRAM supports longer-term AI infrastructure demand.", "confidence_score": 0.89},
    ],
    "AMZN": [
        {"title": "Amazon achieves 100% renewable electricity globally ahead of schedule", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-02-12", "source": "Amazon Sustainability Report", "explanation": "Amazon matched 100% of global electricity with renewable energy purchases in 2024, seven years ahead of original 2030 target.", "confidence_score": 0.92},
        {"title": "Amazon warehouse workers union wins landmark contract in New York", "category": "social", "sentiment": "negative", "severity": 5.5, "date": "2025-03-18", "source": "Reuters", "explanation": "ALU wins first Amazon union contract following years of labor disputes over working conditions and safety.", "confidence_score": 0.88},
        {"title": "Amazon AWS AI revenue grows 37% year-over-year to $110B run rate", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-04-30", "source": "Amazon Earnings Call", "explanation": "AWS AI services including Bedrock, SageMaker and Kiro driving massive enterprise adoption.", "confidence_score": 0.94},
        {"title": "Amazon Scope 3 logistics emissions remain largest ESG challenge", "category": "environmental", "sentiment": "negative", "severity": 4.5, "date": "2025-01-25", "source": "CDP Climate Disclosure", "explanation": "Last-mile delivery and third-party seller logistics account for 68M tonnes CO2e, over 80% of total footprint.", "confidence_score": 0.88},
        {"title": "Amazon expands electric delivery fleet to 100,000 Rivian vans", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-05-01", "source": "Amazon-Rivian Press Release", "explanation": "100,000 electric delivery vehicles operational, significantly reducing last-mile delivery emissions.", "confidence_score": 0.90},
        {"title": "Amazon faces FTC antitrust lawsuit over marketplace practices", "category": "governance", "sentiment": "negative", "severity": 6.0, "date": "2025-02-05", "source": "FTC Press Release", "explanation": "Federal lawsuit alleges Amazon uses anti-competitive practices to maintain e-commerce dominance.", "confidence_score": 0.90},
        {"title": "Amazon AI coding assistant Kiro used by 1M developers in first month", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-06-10", "source": "Amazon Press", "explanation": "Kiro AI development environment achieves record developer adoption, accelerating AI-native software development.", "confidence_score": 0.85},
    ],
    "XOM": [
        {"title": "ExxonMobil faces historic climate fraud lawsuit from multiple US states", "category": "controversy", "sentiment": "negative", "severity": 9.0, "date": "2025-01-14", "source": "New York Times", "explanation": "Coalition of attorneys general alleges ExxonMobil knowingly misled public about climate change risks.", "confidence_score": 0.92},
        {"title": "ExxonMobil Scope 1 emissions increase 8% as production expands in Permian Basin", "category": "environmental", "sentiment": "negative", "severity": 6.5, "date": "2025-02-20", "source": "ExxonMobil Sustainability Report", "explanation": "Record Permian Basin oil production drives year-over-year increase in operational carbon emissions.", "confidence_score": 0.90},
        {"title": "ExxonMobil sues shareholders who filed climate disclosure resolution", "category": "governance", "sentiment": "negative", "severity": 8.0, "date": "2024-11-05", "source": "Financial Times", "explanation": "Unprecedented lawsuit against institutional investors attempting to put climate disclosure to a shareholder vote.", "confidence_score": 0.94},
        {"title": "ExxonMobil invests $20B in low-carbon solutions through 2030", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-03-10", "source": "ExxonMobil Press", "explanation": "Low-carbon business including carbon capture, hydrogen and biofuels targets announced.", "confidence_score": 0.80},
        {"title": "ExxonMobil carbon capture project in Texas largest in US history", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-04-22", "source": "ExxonMobil News", "explanation": "Baytown carbon capture facility breaks ground with 10M tonnes annual CO2 storage capacity.", "confidence_score": 0.82},
        {"title": "ExxonMobil lobbying against clean energy transition policies continues", "category": "governance", "sentiment": "negative", "severity": 7.0, "date": "2024-12-10", "source": "OpenSecrets", "explanation": "ExxonMobil remains top spender lobbying against US and EU clean energy transition legislation.", "confidence_score": 0.88},
        {"title": "ExxonMobil AI deployment in upstream operations reduces drilling costs", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-01-28", "source": "ExxonMobil Technology Review", "explanation": "Machine learning models predict optimal drilling parameters, reducing exploration costs by 15%.", "confidence_score": 0.78},
    ],
    "VWAGY": [
        {"title": "Volkswagen ID.7 wins European Car of the Year with top sustainability rating", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-03-05", "source": "ECOTY Awards", "explanation": "VW's flagship EV sedan recognised for class-leading energy efficiency and lifecycle carbon footprint.", "confidence_score": 0.88},
        {"title": "Volkswagen EV sales surge 40% YoY across European markets", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-04-12", "source": "VW Group Sales Report", "explanation": "ID family EVs capture 22% of VW Group global sales, accelerating the transition away from combustion.", "confidence_score": 0.90},
        {"title": "Volkswagen Dieselgate criminal liability cases finally concluded in Germany", "category": "governance", "sentiment": "negative", "severity": 5.0, "date": "2025-01-20", "source": "Reuters", "explanation": "Final criminal settlements in Germany close the last active Dieselgate proceedings after a decade.", "confidence_score": 0.88},
        {"title": "VW Group announces AI-powered software-defined vehicle platform by 2027", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-02-28", "source": "VW Group Tech Day", "explanation": "CARIAD AI platform will enable over-the-air updates and autonomous features across all VW brands.", "confidence_score": 0.85},
        {"title": "Volkswagen battery recycling plant achieves 95% material recovery rate", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-05-08", "source": "VW Sustainability Report", "explanation": "Salzgitter battery recycling facility sets industry benchmark for EV battery material recovery.", "confidence_score": 0.88},
        {"title": "VW cutting 35,000 jobs in structural transformation — labour tensions rise", "category": "social", "sentiment": "negative", "severity": 6.0, "date": "2025-01-10", "source": "Bloomberg", "explanation": "Major workforce restructuring triggers IG Metall strikes and political pressure in Germany.", "confidence_score": 0.90},
        {"title": "Volkswagen partners with NVIDIA on autonomous driving AI platform", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-03-22", "source": "VW-NVIDIA Press Release", "explanation": "NVIDIA DRIVE Thor platform will power next-generation VW autonomous driving features from 2026.", "confidence_score": 0.85},
    ],
    "META": [
        {"title": "Meta LLaMA 4 outperforms GPT-4o on multiple AI benchmarks", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-04-05", "source": "Meta AI Blog", "explanation": "Open-source LLaMA 4 model sets new performance records, deployed across Meta's 3.4B monthly active users.", "confidence_score": 0.92},
        {"title": "Meta faces €1.2B GDPR fine for US data transfer violations", "category": "governance", "sentiment": "negative", "severity": 7.5, "date": "2025-02-20", "source": "Irish Data Protection Commission", "explanation": "Record European privacy fine for transferring EU user data to US servers without adequate protection.", "confidence_score": 0.94},
        {"title": "Meta achieves 100% renewable energy across all data centers", "category": "environmental", "sentiment": "positive", "severity": 0.0, "date": "2025-01-22", "source": "Meta Sustainability Report", "explanation": "All Meta data centers powered by renewable energy, matching 100% of consumption through PPAs.", "confidence_score": 0.90},
        {"title": "Meta AI assistant reaches 1 billion monthly active users", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-04-30", "source": "Meta Earnings Call", "explanation": "Meta AI integrated across WhatsApp, Messenger, Instagram and Facebook surpasses 1B MAU milestone.", "confidence_score": 0.94},
        {"title": "Senate hearing on teen mental health links Instagram to anxiety epidemic", "category": "social", "sentiment": "negative", "severity": 7.0, "date": "2025-03-12", "source": "US Senate Commerce Committee", "explanation": "Congressional testimony and internal documents allege Instagram algorithms exacerbate teen mental health issues.", "confidence_score": 0.88},
        {"title": "Mark Zuckerberg dual-class shares prevent meaningful shareholder accountability", "category": "governance", "sentiment": "negative", "severity": 5.0, "date": "2025-02-10", "source": "Glass Lewis", "explanation": "Governance advisors flag that Zuckerberg's 57% voting control renders board oversight largely symbolic.", "confidence_score": 0.90},
        {"title": "Meta spends $60B on AI infrastructure in 2025 — largest capex in company history", "category": "ai_adoption", "sentiment": "positive", "severity": 0.0, "date": "2025-05-01", "source": "Meta Earnings Call", "explanation": "Record infrastructure investment in GPU clusters and data centers underpins Meta's AI-first strategy.", "confidence_score": 0.95},
    ],
}

SEED_EVIDENCES = {
    "TSLA": [
        {"source_type": "pdf", "source_name": "Tesla Impact Report 2024", "source_date": "2024-11-01", "page_number": 42, "evidence_text": "In 2024, Tesla's Gigafactories achieved a 68% renewable energy share, up from 45% in 2022. Total Scope 1 emissions were 52,000 tCO2e, a reduction of 23% from the prior year driven by electrification of on-site vehicle fleet.", "category": "environmental", "confidence_score": 0.88},
        {"source_type": "pdf", "source_name": "Tesla Impact Report 2024", "source_date": "2024-11-01", "page_number": 78, "evidence_text": "Tesla's commitment to workforce safety is reflected in our total recordable incident rate of 6.2 per 200 full-time equivalent workers. We acknowledge this rate remains above the industry median and have initiated a comprehensive safety transformation program.", "category": "social", "confidence_score": 0.82},
        {"source_type": "news", "source_name": "Reuters", "source_date": "2024-08-22", "url": "https://reuters.com", "evidence_text": "The National Highway Traffic Safety Administration has opened a formal investigation into Tesla's Autopilot advanced driver assistance system following 12 fatalities and 17 serious injury crashes in which Autopilot was reportedly active.", "category": "governance", "confidence_score": 0.92},
    ],
    "MSFT": [
        {"source_type": "pdf", "source_name": "Microsoft Sustainability Report 2025", "source_date": "2025-05-01", "page_number": 12, "evidence_text": "Microsoft matched 100% of our electricity consumption with renewable energy purchases in fiscal year 2025, ahead of our original 2025 target. We have signed Power Purchase Agreements in 44 countries covering 23.4 GW of clean energy capacity.", "category": "environmental", "confidence_score": 0.96},
        {"source_type": "pdf", "source_name": "Microsoft Sustainability Report 2025", "source_date": "2025-05-01", "page_number": 38, "evidence_text": "Scope 3 emissions represent our largest challenge. In FY2025, value chain emissions totalled 11.9 million metric tonnes CO2 equivalent, a 28% increase from our 2020 baseline, primarily driven by AI infrastructure buildout and supply chain growth.", "category": "environmental", "confidence_score": 0.90},
        {"source_type": "pdf", "source_name": "Microsoft AI Progress Report 2025", "source_date": "2025-06-01", "page_number": 5, "evidence_text": "Microsoft Copilot AI is now embedded in Microsoft 365, Azure, GitHub, Dynamics and Power Platform. In FY2025, AI-related revenue grew 38% year-over-year. We filed 847 AI-related patents in the year.", "category": "ai_adoption", "confidence_score": 0.94},
    ],
    "SHEL": [
        {"source_type": "pdf", "source_name": "Shell Energy Transition Progress Report 2024", "source_date": "2024-10-01", "page_number": 22, "evidence_text": "Shell's net carbon intensity decreased by 8% compared to our 2016 baseline, against our 2030 target of 30%. Scope 1 and Scope 2 emissions were 68 million tonnes CO2 equivalent in 2024. We note that Scope 3 emissions — covering customer use of our products — totalled approximately 1.1 billion tonnes.", "category": "environmental", "confidence_score": 0.88},
        {"source_type": "news", "source_name": "BBC News", "source_date": "2024-07-08", "url": "https://bbc.com", "evidence_text": "Shell agreed to pay $95 million to settle a long-running case over oil spills in the Niger Delta that affected approximately 50,000 residents in Ogale and Bille communities. Environmental groups said the settlement, while significant, did not include cleanup commitments.", "category": "social", "confidence_score": 0.95},
    ],
    "TM": [
        {"source_type": "pdf", "source_name": "Toyota Sustainability Data Book 2024", "source_date": "2024-09-01", "page_number": 15, "evidence_text": "Toyota's global CO2 emissions from manufacturing operations in fiscal 2024 were 5.2 million tonnes, a reduction of 3% from fiscal 2023. We target carbon neutrality in manufacturing by 2035. Scope 3 data covering vehicle use phase is disclosed separately.", "category": "environmental", "confidence_score": 0.88},
        {"source_type": "pdf", "source_name": "Toyota Annual Report 2024", "source_date": "2024-06-01", "page_number": 88, "evidence_text": "As of March 2024, women account for 12.0% of executive officers and 9.0% of section managers in Japan. While we have made progress, we recognise significant room for improvement relative to global automotive peers.", "category": "social", "confidence_score": 0.90},
    ],
    "BYDDF": [
        {"source_type": "pdf", "source_name": "BYD ESG Report 2024", "source_date": "2024-08-01", "page_number": 8, "evidence_text": "BYD produced 4.27 million new energy vehicles in 2024, enabling customers to avoid an estimated 14 million tonnes of CO2 emissions through clean transportation. Our manufacturing sites achieved 42% renewable energy ratio.", "category": "environmental", "confidence_score": 0.80},
        {"source_type": "news", "source_name": "MSCI ESG Research", "source_date": "2025-02-10", "evidence_text": "MSCI has flagged significant gaps in BYD's ESG data disclosure. Key missing data includes independently verified Scope 3 emissions, supplier audit coverage ratios and board committee independence metrics. BYD's MSCI ESG rating remains BB.", "category": "governance", "confidence_score": 0.85},
    ],
    "AAPL": [
        {"source_type": "pdf", "source_name": "Apple Environmental Progress Report 2025", "source_date": "2025-01-15", "page_number": 8, "evidence_text": "Apple has been carbon neutral across our entire global corporate operations since fiscal year 2020. Our renewable energy portfolio covers 100% of our corporate electricity needs in 44 countries. Scope 3 value chain emissions totalled 19.4 million metric tonnes in FY2024.", "category": "environmental", "confidence_score": 0.97},
        {"source_type": "pdf", "source_name": "Apple AI Integration Report 2025", "source_date": "2025-03-10", "page_number": 5, "evidence_text": "Apple Intelligence is now available on all devices running iOS 18.1, iPadOS 18.1 and macOS Sequoia 15.1. The system runs entirely on-device for privacy. In FY2025 we filed 682 AI-related patents spanning natural language, computer vision and silicon design.", "category": "ai_adoption", "confidence_score": 0.95},
    ],
    "NVDA": [
        {"source_type": "pdf", "source_name": "NVIDIA CSR Report 2025", "source_date": "2025-02-01", "page_number": 12, "evidence_text": "NVIDIA's owned and operated facilities achieved 75% renewable electricity coverage in fiscal year 2025. Scope 1 emissions were 22,000 tonnes CO2e. We acknowledge that the primary climate impact of our products lies in Scope 3 — the energy consumption of deployed GPUs globally.", "category": "environmental", "confidence_score": 0.88},
        {"source_type": "news", "source_name": "IEA Global Energy Report 2025", "source_date": "2025-01-18", "evidence_text": "Data centre electricity consumption is projected to double by 2026, with AI workloads the primary driver. NVIDIA GPU deployments account for an estimated 40% of new data centre power draw. The International Energy Agency calls for mandatory energy efficiency standards for AI accelerators.", "category": "environmental", "confidence_score": 0.85},
    ],
    "MU": [
        {"source_type": "pdf", "source_name": "Micron Sustainability Report 2025", "source_date": "2025-03-19", "page_number": 11, "evidence_text": "Micron increased renewable electricity sourcing across its manufacturing footprint and signed additional long-term clean power agreements to support lower operational emissions through 2030.", "category": "environmental", "confidence_score": 0.84},
        {"source_type": "pdf", "source_name": "Micron Investor Day 2025", "source_date": "2025-05-08", "page_number": 4, "evidence_text": "Demand for high-bandwidth memory and server DRAM has accelerated materially with AI training and inference deployments, driving a record backlog of AI-related orders.", "category": "ai_adoption", "confidence_score": 0.90},
    ],
    "AMZN": [
        {"source_type": "pdf", "source_name": "Amazon Sustainability Report 2024", "source_date": "2025-02-12", "page_number": 6, "evidence_text": "Amazon matched 100% of its global electricity consumption with renewable energy purchases in 2024, ahead of our 2030 target. We deployed 100,000 Rivian electric delivery vehicles. However, total Scope 3 logistics and supply chain emissions were 68.3 million metric tonnes CO2e.", "category": "environmental", "confidence_score": 0.92},
        {"source_type": "news", "source_name": "FTC Press Release", "source_date": "2025-02-05", "evidence_text": "The Federal Trade Commission filed suit against Amazon alleging the company uses anti-competitive tactics including preferential placement, price parity clauses and seller fee structures that inflate consumer prices and harm marketplace competition.", "category": "governance", "confidence_score": 0.90},
    ],
    "XOM": [
        {"source_type": "pdf", "source_name": "ExxonMobil Sustainability Report 2024", "source_date": "2025-02-20", "page_number": 18, "evidence_text": "ExxonMobil's Scope 1 and 2 emissions totalled 105 million metric tonnes CO2e in 2024, an 8% increase from 2023 driven by record Permian Basin production. Our 2030 emission reduction targets apply only to Scope 1 and 2 operational emissions.", "category": "environmental", "confidence_score": 0.90},
        {"source_type": "news", "source_name": "New York Times", "source_date": "2025-01-14", "evidence_text": "A coalition of attorneys general from 16 US states filed climate fraud lawsuits against ExxonMobil, alleging the company concealed internal research showing fossil fuel combustion causes dangerous climate change while publicly funding climate denial campaigns.", "category": "governance", "confidence_score": 0.92},
    ],
    "VWAGY": [
        {"source_type": "pdf", "source_name": "VW Group Annual Report 2024", "source_date": "2025-03-15", "page_number": 22, "evidence_text": "Volkswagen Group delivered 1.38 million battery electric vehicles in 2024, representing 22% of global sales. CO2 emissions from manufacturing operations decreased 18% from our 2018 baseline. We have invested €180 billion in electrification through 2030.", "category": "environmental", "confidence_score": 0.90},
        {"source_type": "news", "source_name": "Bloomberg", "source_date": "2025-01-10", "evidence_text": "Volkswagen AG confirmed restructuring plans affecting 35,000 jobs across German plants. IG Metall union and works council reached a compromise agreement that avoids plant closures but includes a wage freeze through 2026 and voluntary redundancy packages.", "category": "social", "confidence_score": 0.90},
    ],
    "META": [
        {"source_type": "pdf", "source_name": "Meta Sustainability Report 2024", "source_date": "2025-01-22", "page_number": 10, "evidence_text": "Meta achieved 100% renewable electricity across all operations in 2024. Our data center power usage effectiveness (PUE) improved to 1.10, among the best in the industry. Scope 1 and 2 emissions totalled 47,000 tonnes CO2e. AI compute remains our primary Scope 3 challenge.", "category": "environmental", "confidence_score": 0.90},
        {"source_type": "news", "source_name": "US Senate Commerce Committee", "source_date": "2025-03-12", "evidence_text": "Senate hearing testimony and leaked internal Meta research documents reveal the company was aware that Instagram's recommendation algorithms correlate with increased anxiety and depression in teenage girls. The documents, labelled 'Teen Mental Health Deep Dives', show 32% of teen girls traced body image issues to Instagram.", "category": "social", "confidence_score": 0.88},
    ],
}

# Historical score snapshots for chart data (last 8 quarters)
SCORE_HISTORY = {
    "TSLA": [
        {"esg": 52, "momentum": 18, "ai": 72, "controversy": 45, "env": 58, "soc": 41, "gov": 55, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 54, "momentum": 22, "ai": 75, "controversy": 48, "env": 60, "soc": 43, "gov": 57, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 51, "momentum": 15, "ai": 78, "controversy": 58, "env": 57, "soc": 40, "gov": 53, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 56, "momentum": 25, "ai": 80, "controversy": 42, "env": 63, "soc": 45, "gov": 55, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 55, "momentum": 28, "ai": 82, "controversy": 40, "env": 62, "soc": 44, "gov": 57, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 57, "momentum": 30, "ai": 84, "controversy": 38, "env": 64, "soc": 46, "gov": 58, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 53, "momentum": 20, "ai": 86, "controversy": 55, "env": 60, "soc": 42, "gov": 54, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 57, "momentum": 32, "ai": 88, "controversy": 35, "env": 65, "soc": 46, "gov": 57, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
    ],
    "MSFT": [
        {"esg": 78, "momentum": 35, "ai": 95, "controversy": 12, "env": 82, "soc": 76, "gov": 75, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 80, "momentum": 38, "ai": 96, "controversy": 10, "env": 84, "soc": 78, "gov": 76, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 81, "momentum": 40, "ai": 97, "controversy": 11, "env": 85, "soc": 79, "gov": 77, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 82, "momentum": 42, "ai": 97, "controversy": 9, "env": 86, "soc": 80, "gov": 78, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 83, "momentum": 41, "ai": 98, "controversy": 10, "env": 87, "soc": 81, "gov": 79, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 84, "momentum": 43, "ai": 98, "controversy": 8, "env": 88, "soc": 82, "gov": 80, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 85, "momentum": 44, "ai": 99, "controversy": 7, "env": 89, "soc": 83, "gov": 81, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 86, "momentum": 45, "ai": 99, "controversy": 6, "env": 90, "soc": 84, "gov": 82, "classification": "Future Leader", "signal": "Buy / Watchlist"},
    ],
    "SHEL": [
        {"esg": 42, "momentum": -28, "ai": 35, "controversy": 82, "env": 28, "soc": 52, "gov": 55, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 43, "momentum": -25, "ai": 36, "controversy": 80, "env": 30, "soc": 53, "gov": 54, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 41, "momentum": -30, "ai": 34, "controversy": 85, "env": 27, "soc": 51, "gov": 53, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 44, "momentum": -22, "ai": 37, "controversy": 78, "env": 31, "soc": 54, "gov": 56, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 45, "momentum": -20, "ai": 38, "controversy": 76, "env": 32, "soc": 55, "gov": 57, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 43, "momentum": -24, "ai": 36, "controversy": 81, "env": 29, "soc": 53, "gov": 55, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 44, "momentum": -21, "ai": 37, "controversy": 79, "env": 30, "soc": 54, "gov": 56, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 42, "momentum": -26, "ai": 35, "controversy": 83, "env": 28, "soc": 52, "gov": 54, "classification": "Value Trap", "signal": "Risk Alert"},
    ],
    "TM": [
        {"esg": 62, "momentum": -15, "ai": 45, "controversy": 38, "env": 55, "soc": 60, "gov": 72, "classification": "Overrated Leader", "signal": "Hold"},
        {"esg": 63, "momentum": -18, "ai": 46, "controversy": 36, "env": 56, "soc": 61, "gov": 73, "classification": "Overrated Leader", "signal": "Hold"},
        {"esg": 61, "momentum": -22, "ai": 44, "controversy": 40, "env": 54, "soc": 59, "gov": 71, "classification": "Overrated Leader", "signal": "Hold"},
        {"esg": 64, "momentum": -12, "ai": 47, "controversy": 35, "env": 57, "soc": 62, "gov": 74, "classification": "Overrated Leader", "signal": "Hold"},
        {"esg": 63, "momentum": -16, "ai": 48, "controversy": 37, "env": 56, "soc": 61, "gov": 73, "classification": "Overrated Leader", "signal": "Hold"},
        {"esg": 62, "momentum": -19, "ai": 46, "controversy": 39, "env": 55, "soc": 60, "gov": 72, "classification": "Overrated Leader", "signal": "Hold"},
        {"esg": 60, "momentum": -25, "ai": 45, "controversy": 42, "env": 53, "soc": 58, "gov": 70, "classification": "Overrated Leader", "signal": "Hold"},
        {"esg": 61, "momentum": -21, "ai": 47, "controversy": 40, "env": 54, "soc": 59, "gov": 71, "classification": "Overrated Leader", "signal": "Hold"},
    ],
    "BYDDF": [
        {"esg": 48, "momentum": 38, "ai": 70, "controversy": 45, "env": 55, "soc": 38, "gov": 44, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 50, "momentum": 40, "ai": 72, "controversy": 43, "env": 57, "soc": 40, "gov": 46, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 49, "momentum": 36, "ai": 71, "controversy": 46, "env": 56, "soc": 39, "gov": 45, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 51, "momentum": 42, "ai": 73, "controversy": 42, "env": 58, "soc": 41, "gov": 47, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 52, "momentum": 44, "ai": 75, "controversy": 40, "env": 59, "soc": 42, "gov": 48, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 53, "momentum": 46, "ai": 76, "controversy": 38, "env": 60, "soc": 43, "gov": 49, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 51, "momentum": 40, "ai": 74, "controversy": 44, "env": 58, "soc": 41, "gov": 47, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 54, "momentum": 48, "ai": 77, "controversy": 36, "env": 61, "soc": 44, "gov": 50, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
    ],
    "AAPL": [
        {"esg": 70, "momentum": 22, "ai": 80, "controversy": 20, "env": 76, "soc": 67, "gov": 64, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 71, "momentum": 24, "ai": 82, "controversy": 19, "env": 77, "soc": 68, "gov": 65, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 72, "momentum": 25, "ai": 83, "controversy": 20, "env": 78, "soc": 69, "gov": 66, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 73, "momentum": 26, "ai": 85, "controversy": 18, "env": 79, "soc": 70, "gov": 68, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 74, "momentum": 27, "ai": 86, "controversy": 17, "env": 80, "soc": 71, "gov": 69, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 75, "momentum": 28, "ai": 88, "controversy": 17, "env": 81, "soc": 72, "gov": 70, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 76, "momentum": 30, "ai": 90, "controversy": 16, "env": 82, "soc": 73, "gov": 71, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 77, "momentum": 30, "ai": 91, "controversy": 16, "env": 83, "soc": 74, "gov": 72, "classification": "Future Leader", "signal": "Buy / Watchlist"},
    ],
    "NVDA": [
        {"esg": 55, "momentum": 28, "ai": 90, "controversy": 24, "env": 58, "soc": 52, "gov": 54, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 57, "momentum": 30, "ai": 92, "controversy": 23, "env": 60, "soc": 54, "gov": 55, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 58, "momentum": 32, "ai": 93, "controversy": 22, "env": 62, "soc": 55, "gov": 56, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 60, "momentum": 33, "ai": 94, "controversy": 22, "env": 64, "soc": 56, "gov": 58, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 62, "momentum": 35, "ai": 96, "controversy": 21, "env": 66, "soc": 58, "gov": 59, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 64, "momentum": 36, "ai": 97, "controversy": 20, "env": 68, "soc": 60, "gov": 61, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 66, "momentum": 38, "ai": 98, "controversy": 20, "env": 70, "soc": 62, "gov": 62, "classification": "Future Leader", "signal": "Buy / Watchlist"},
        {"esg": 68, "momentum": 38, "ai": 99, "controversy": 19, "env": 72, "soc": 63, "gov": 64, "classification": "Future Leader", "signal": "Buy / Watchlist"},
    ],
    "MU": [
        {"esg": 50, "momentum": 16, "ai": 72, "controversy": 40, "env": 56, "soc": 42, "gov": 69, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 52, "momentum": 20, "ai": 75, "controversy": 38, "env": 58, "soc": 44, "gov": 71, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 53, "momentum": 23, "ai": 78, "controversy": 36, "env": 59, "soc": 45, "gov": 72, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 54, "momentum": 26, "ai": 81, "controversy": 34, "env": 61, "soc": 46, "gov": 73, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 55, "momentum": 28, "ai": 83, "controversy": 32, "env": 62, "soc": 47, "gov": 74, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 56, "momentum": 30, "ai": 85, "controversy": 31, "env": 63, "soc": 48, "gov": 75, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 57, "momentum": 32, "ai": 87, "controversy": 30, "env": 64, "soc": 49, "gov": 76, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 58, "momentum": 34, "ai": 88, "controversy": 29, "env": 65, "soc": 50, "gov": 77, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
    ],
    "AMZN": [
        {"esg": 52, "momentum": -2, "ai": 85, "controversy": 58, "env": 54, "soc": 44, "gov": 60, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 53, "momentum": 0, "ai": 87, "controversy": 56, "env": 56, "soc": 45, "gov": 60, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 54, "momentum": 3, "ai": 88, "controversy": 55, "env": 57, "soc": 46, "gov": 61, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 55, "momentum": 5, "ai": 89, "controversy": 54, "env": 58, "soc": 47, "gov": 61, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 56, "momentum": 7, "ai": 90, "controversy": 53, "env": 59, "soc": 48, "gov": 62, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 57, "momentum": 8, "ai": 91, "controversy": 52, "env": 61, "soc": 49, "gov": 62, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 57, "momentum": 8, "ai": 92, "controversy": 52, "env": 62, "soc": 49, "gov": 62, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 58, "momentum": 10, "ai": 93, "controversy": 50, "env": 63, "soc": 50, "gov": 63, "classification": "Watchlist", "signal": "Hold"},
    ],
    "XOM": [
        {"esg": 40, "momentum": -28, "ai": 34, "controversy": 78, "env": 25, "soc": 52, "gov": 58, "classification": "Value Trap", "signal": "Avoid"},
        {"esg": 39, "momentum": -30, "ai": 34, "controversy": 80, "env": 24, "soc": 51, "gov": 58, "classification": "Value Trap", "signal": "Avoid"},
        {"esg": 38, "momentum": -31, "ai": 35, "controversy": 82, "env": 23, "soc": 51, "gov": 57, "classification": "Value Trap", "signal": "Avoid"},
        {"esg": 37, "momentum": -32, "ai": 35, "controversy": 84, "env": 22, "soc": 50, "gov": 57, "classification": "Value Trap", "signal": "Avoid"},
        {"esg": 36, "momentum": -33, "ai": 36, "controversy": 85, "env": 21, "soc": 50, "gov": 56, "classification": "Value Trap", "signal": "Avoid"},
        {"esg": 36, "momentum": -33, "ai": 36, "controversy": 86, "env": 21, "soc": 50, "gov": 56, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 35, "momentum": -34, "ai": 37, "controversy": 87, "env": 20, "soc": 49, "gov": 55, "classification": "Value Trap", "signal": "Risk Alert"},
        {"esg": 34, "momentum": -35, "ai": 37, "controversy": 88, "env": 19, "soc": 49, "gov": 55, "classification": "Value Trap", "signal": "Risk Alert"},
    ],
    "VWAGY": [
        {"esg": 44, "momentum": 25, "ai": 44, "controversy": 55, "env": 48, "soc": 42, "gov": 40, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 46, "momentum": 28, "ai": 46, "controversy": 53, "env": 50, "soc": 44, "gov": 42, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 47, "momentum": 30, "ai": 48, "controversy": 51, "env": 52, "soc": 45, "gov": 43, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 48, "momentum": 32, "ai": 49, "controversy": 50, "env": 54, "soc": 46, "gov": 44, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 50, "momentum": 34, "ai": 51, "controversy": 48, "env": 56, "soc": 47, "gov": 45, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 51, "momentum": 35, "ai": 53, "controversy": 46, "env": 57, "soc": 48, "gov": 46, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 52, "momentum": 36, "ai": 55, "controversy": 45, "env": 58, "soc": 49, "gov": 47, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
        {"esg": 54, "momentum": 38, "ai": 57, "controversy": 44, "env": 60, "soc": 50, "gov": 49, "classification": "Hidden Winner", "signal": "Buy / Watchlist"},
    ],
    "META": [
        {"esg": 50, "momentum": 4, "ai": 88, "controversy": 68, "env": 56, "soc": 42, "gov": 46, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 51, "momentum": 5, "ai": 90, "controversy": 67, "env": 57, "soc": 43, "gov": 46, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 52, "momentum": 6, "ai": 91, "controversy": 67, "env": 58, "soc": 44, "gov": 47, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 53, "momentum": 7, "ai": 92, "controversy": 66, "env": 59, "soc": 45, "gov": 47, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 54, "momentum": 8, "ai": 94, "controversy": 65, "env": 60, "soc": 46, "gov": 48, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 55, "momentum": 9, "ai": 95, "controversy": 65, "env": 61, "soc": 47, "gov": 48, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 56, "momentum": 10, "ai": 96, "controversy": 64, "env": 62, "soc": 48, "gov": 49, "classification": "Watchlist", "signal": "Hold"},
        {"esg": 57, "momentum": 10, "ai": 97, "controversy": 64, "env": 63, "soc": 49, "gov": 50, "classification": "Watchlist", "signal": "Hold"},
    ],
    "NKE": VALUE_TRAP_HISTORY,
    "BA": VALUE_TRAP_HISTORY,
    "PARA": VALUE_TRAP_HISTORY,
    "WBA": VALUE_TRAP_HISTORY,
    "WBD": VALUE_TRAP_HISTORY,
}


def seed(db: Session):
    print("🌱 Seeding ESG Momentum Engine database...")

    ticker_to_id = {}

    for comp_data in COMPANIES:
        comp_data = {**COMPANY_LINKS.get(comp_data["ticker"], {}), **comp_data}
        existing = db.query(Company).filter(Company.ticker == comp_data["ticker"]).first()
        if existing:
            # Backfill newly introduced metadata for existing rows.
            if comp_data.get("exchange") and not existing.exchange:
                existing.exchange = comp_data["exchange"]
            existing.logo_url = logo_url_for_ticker(comp_data["ticker"])
            if comp_data.get("website_url") and not existing.website_url:
                existing.website_url = comp_data["website_url"]
            if comp_data.get("executive_name") and not existing.executive_name:
                existing.executive_name = comp_data["executive_name"]
            if comp_data.get("executive_url") and not existing.executive_url:
                existing.executive_url = comp_data["executive_url"]
            db.flush()
            print(f"  ✓ {comp_data['ticker']} already exists, skipping")
            ticker_to_id[comp_data["ticker"]] = existing.id
            continue

        comp_data = dict(comp_data)
        comp_data["logo_url"] = comp_data.get("logo_url") or logo_url_for_ticker(comp_data["ticker"])
        company = Company(**comp_data)
        db.add(company)
        db.flush()
        ticker_to_id[comp_data["ticker"]] = company.id
        print(f"  + Created company: {comp_data['name']}")

    db.commit()

    for ticker, company_id in ticker_to_id.items():
        # Metrics
        existing_metrics = db.query(ESGMetric).filter(ESGMetric.company_id == company_id).count()
        if existing_metrics == 0:
            for m in SEED_METRICS.get(ticker, []):
                db.add(ESGMetric(company_id=company_id, **m))
            print(f"  + Added {len(SEED_METRICS.get(ticker, []))} metrics for {ticker}")

        # Signals
        existing_signals = db.query(Signal).filter(Signal.company_id == company_id).count()
        if existing_signals == 0:
            for s in SEED_SIGNALS.get(ticker, []):
                db.add(Signal(company_id=company_id, **s))
            print(f"  + Added {len(SEED_SIGNALS.get(ticker, []))} signals for {ticker}")

        # Evidence
        existing_ev = db.query(Evidence).filter(Evidence.company_id == company_id).count()
        if existing_ev == 0:
            for e in SEED_EVIDENCES.get(ticker, []):
                db.add(Evidence(company_id=company_id, **e))
            print(f"  + Added {len(SEED_EVIDENCES.get(ticker, []))} evidence items for {ticker}")

        db.commit()

        # Historical score snapshots
        existing_snaps = db.query(ScoreSnapshot).filter(ScoreSnapshot.company_id == company_id).count()
        if existing_snaps == 0:
            history = SCORE_HISTORY.get(ticker, [])
            if not history:
                history = _default_history(ticker)
            now = datetime.utcnow()
            for i, snap in enumerate(history):
                ts = now - timedelta(days=(len(history) - i) * 91)  # ~quarterly
                db.add(ScoreSnapshot(
                    company_id=company_id,
                    current_esg_score=snap["esg"],
                    momentum_score=snap["momentum"],
                    ai_adoption_score=snap["ai"],
                    controversy_risk=snap["controversy"],
                    confidence_score=0.80,
                    environmental_score=snap["env"],
                    social_score=snap["soc"],
                    governance_score=snap["gov"],
                    classification=snap["classification"],
                    investor_signal=snap["signal"],
                    created_at=ts,
                ))
            db.commit()
            print(f"  + Added {len(history)} score snapshots for {ticker}")

    first_user = db.query(User).filter(User.is_active.is_(True)).order_by(User.id.asc()).first()
    if first_user:
        existing_notifications = db.query(Notification).filter(Notification.user_id == first_user.id).count()
        if existing_notifications == 0:
            singtel_id = ticker_to_id.get("Z74.SI")
            dbs_id = ticker_to_id.get("D05.SI")
            uob_id = ticker_to_id.get("U11.SI")
            aapl_id = ticker_to_id.get("AAPL")
            starter_notifications = [
                Notification(
                    user_id=first_user.id,
                    company_id=dbs_id,
                    trigger_type="MARKET_OPEN_SINGAPORE",
                    channel="IN_APP",
                    title="Singapore market open",
                    body="The Singapore market has opened. Check SGX movers and your watchlist.",
                    deep_link=f"/#/companies/{dbs_id}" if dbs_id else "/#/",
                    metadata_json=json.dumps({"country": "Singapore", "market_open": True}),
                    status="delivered",
                ),
                Notification(
                    user_id=first_user.id,
                    company_id=aapl_id,
                    trigger_type="PRICE_ALERT",
                    channel="IN_APP",
                    title="AAPL moved +3.2%",
                    body="Apple crossed the alert threshold during live monitoring.",
                    deep_link=f"/#/companies/{aapl_id}" if aapl_id else "/#/",
                    metadata_json=json.dumps({"ticker": "AAPL", "current_price": 214.55, "change_percent": 3.2}),
                    status="delivered",
                ),
                Notification(
                    user_id=first_user.id,
                    company_id=singtel_id,
                    trigger_type="AI_STOCK_SUGGESTION",
                    channel="IN_APP",
                    title="Singtel signal updated",
                    body="Singtel is now a Buy / Watchlist name after the latest score update.",
                    deep_link=f"/#/companies/{singtel_id}" if singtel_id else "/#/",
                    metadata_json=json.dumps({"country": "Singapore", "classification": "Future Leader", "investor_signal": "Buy / Watchlist"}),
                    status="delivered",
                ),
                Notification(
                    user_id=first_user.id,
                    company_id=uob_id,
                    trigger_type="EARNINGS_ALERT",
                    channel="IN_APP",
                    title="Report ready: UOB annual review",
                    body="Your uploaded report finished processing and is ready to review.",
                    deep_link=f"/#/companies/{uob_id}" if uob_id else "/#/",
                    metadata_json=json.dumps({"report_id": 1, "status": "done", "country": "Singapore"}),
                    status="delivered",
                ),
            ]
            db.add_all(starter_notifications)
            db.commit()
            print(f"  + Added {len(starter_notifications)} starter notifications for user {first_user.id}")

    print("✅ Seed complete!")


if __name__ == "__main__":
    from app.database import Base, engine
    import app.models  # noqa: ensure all models registered
    Base.metadata.create_all(bind=engine)
    ensure_company_schema_compatibility()
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
