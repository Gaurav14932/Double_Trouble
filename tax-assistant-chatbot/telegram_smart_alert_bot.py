from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import tempfile
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import matplotlib
import requests
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from openpyxl import Workbook
from openpyxl.styles import Font
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

matplotlib.use("Agg")
import matplotlib.pyplot as plt

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SUMMARY_API_URL = os.getenv("SUMMARY_API_URL", "http://localhost:5000/summary")
BOT_TOKEN = os.getenv("BOT_TOKEN")
ALERT_CHAT_ID = os.getenv("ALERT_CHAT_ID")
# Comma-separated chat IDs with full export access.
ADMIN_CHAT_IDS = os.getenv("ADMIN_CHAT_IDS", "")
# Comma-separated chat_id:ward pairs, for example:
# OFFICER_WARD_MAP=123456789:Ward 2,987654321:Ward 5
OFFICER_WARD_MAP = os.getenv("OFFICER_WARD_MAP", "")
ALERT_INTERVAL_MINUTES = 1
REQUEST_TIMEOUT_SECONDS = 10


# -----------------------------------------------------------------------------
# Logging setup
# -----------------------------------------------------------------------------

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("telegram-smart-alert-bot")


# -----------------------------------------------------------------------------
# Small utility helpers
# -----------------------------------------------------------------------------

def to_number(value: Any) -> float:
    """Convert API values to numbers safely."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def format_currency(value: Any) -> str:
    """Format money values with comma separators."""
    return f"{int(round(to_number(value))):,}"


def format_ward_name(raw_name: Any) -> str:
    """Turn keys like 'ward3' or 'ward_3' into 'Ward 3'."""
    text = str(raw_name).strip()
    match = re.fullmatch(r"ward[\s_-]*(\d+)", text, flags=re.IGNORECASE)
    if match:
        return f"Ward {match.group(1)}"

    normalized = text.replace("_", " ").strip()
    return normalized.title() if normalized else "Unknown Ward"


def get_known_chat_ids(application: Application) -> set[int]:
    """Return the in-memory set of chats that should receive alerts."""
    return application.bot_data.setdefault("known_chat_ids", set())


def set_last_alert_signature(application: Application, signature: tuple[str, ...]) -> None:
    """Store the last sent alert snapshot to reduce duplicate alert spam."""
    application.bot_data["last_alert_signature"] = signature


def get_last_alert_signature(application: Application) -> tuple[str, ...]:
    """Load the previous alert snapshot."""
    return application.bot_data.get("last_alert_signature", tuple())


def normalize_ward_key(raw_name: Any) -> str:
    """Create a stable key for ward comparisons across API and env values."""
    text = str(raw_name).strip()
    if not text:
        return ""

    if re.fullmatch(r"\d+", text):
        return f"ward{text}"

    match = re.fullmatch(r"ward[\s_-]*(\d+)", text, flags=re.IGNORECASE)
    if match:
        return f"ward{match.group(1)}"

    return re.sub(r"[\s_-]+", "", text).lower()


def parse_chat_id_list(raw_value: str) -> set[int]:
    """Parse a comma or semicolon separated list of Telegram chat IDs."""
    chat_ids: set[int] = set()

    for item in re.split(r"[;,]", raw_value):
        text = item.strip()
        if not text:
            continue

        try:
            chat_ids.add(int(text))
        except ValueError:
            logger.warning("Ignoring invalid ADMIN_CHAT_IDS entry: %s", text)

    return chat_ids


def parse_officer_ward_map(raw_value: str) -> dict[int, str]:
    """Parse chat_id:ward pairs for officer-scoped exports."""
    officer_map: dict[int, str] = {}

    for entry in re.split(r"[;,]", raw_value):
        text = entry.strip()
        if not text:
            continue

        chat_id_text, separator, ward_text = text.partition(":")
        if not separator:
            logger.warning("Ignoring invalid OFFICER_WARD_MAP entry: %s", text)
            continue

        try:
            chat_id = int(chat_id_text.strip())
        except ValueError:
            logger.warning("Ignoring invalid officer chat ID: %s", chat_id_text)
            continue

        officer_map[chat_id] = format_ward_name(ward_text)

    return officer_map


@lru_cache(maxsize=1)
def get_admin_chat_ids() -> set[int]:
    """Load admin chat IDs from the environment once per process."""
    return parse_chat_id_list(ADMIN_CHAT_IDS)


@lru_cache(maxsize=1)
def get_officer_ward_assignments() -> dict[int, str]:
    """Load officer ward assignments from the environment once per process."""
    return parse_officer_ward_map(OFFICER_WARD_MAP)


def resolve_export_scope(chat_id: int) -> tuple[str | None, str | None]:
    """Return the export role and ward scope for the current chat."""
    if chat_id in get_admin_chat_ids():
        return "admin", None

    officer_ward = get_officer_ward_assignments().get(chat_id)
    if officer_ward:
        return "officer", officer_ward

    return None, None


def get_defaulter_ward(defaulter: dict[str, Any]) -> str | None:
    """Read a ward value from a defaulter row if the backend provides one."""
    for key in ("ward", "ward_name", "wardName"):
        value = defaulter.get(key)
        if value:
            return format_ward_name(value)

    return None


def normalize_defaulter_rows(raw_rows: Any) -> list[dict[str, Any]]:
    """Normalize defaulter rows so export helpers can share one format."""
    if not isinstance(raw_rows, list):
        return []

    rows: list[dict[str, Any]] = []
    for item in raw_rows:
        if not isinstance(item, dict):
            continue

        name = str(item.get("name", "")).strip()
        if not name:
            continue

        row: dict[str, Any] = {
            "name": name,
            "amount": to_number(item.get("amount", 0)),
        }

        ward_name = get_defaulter_ward(item)
        if ward_name:
            row["ward"] = ward_name

        rows.append(row)

    return rows


def lookup_ward_value(source: Any, ward_name: str) -> Any:
    """Find a ward entry in a backend object using flexible ward matching."""
    if not isinstance(source, dict):
        return None

    expected_key = normalize_ward_key(ward_name)
    for raw_key, value in source.items():
        if normalize_ward_key(raw_key) == expected_key:
            return value

    return None


def build_export_payload(
    summary_data: dict[str, Any],
    role: str,
    ward_name: str | None,
) -> dict[str, Any]:
    """
    Build the export payload for the current role.

    Officers rely on a ward-scoped backend response when available
    (/summary?ward=Ward X). If defaulter rows still include ward metadata,
    the bot also filters them locally as a safety net.
    """
    export_data = dict(summary_data)
    export_data["scope_label"] = ward_name if role == "officer" and ward_name else "All Wards"

    if role != "officer" or not ward_name:
        export_data["defaulters"] = normalize_defaulter_rows(summary_data.get("defaulters", []))
        return export_data

    ward_summary = lookup_ward_value(summary_data.get("ward_summaries"), ward_name)
    if isinstance(ward_summary, dict):
        for key in ("total", "paid", "unpaid", "outstanding"):
            if key in ward_summary:
                export_data[key] = ward_summary[key]

    ward_outstanding = lookup_ward_value(summary_data.get("wards"), ward_name)
    if ward_outstanding is not None:
        export_data["outstanding"] = ward_outstanding

    defaulters = normalize_defaulter_rows(summary_data.get("defaulters", []))
    if any("ward" in row for row in defaulters):
        export_data["defaulters"] = [
            row
            for row in defaulters
            if normalize_ward_key(row.get("ward")) == normalize_ward_key(ward_name)
        ]
    else:
        export_data["defaulters"] = defaulters

    return export_data


# -----------------------------------------------------------------------------
# Backend API access
# -----------------------------------------------------------------------------

async def fetch_summary_data() -> dict[str, Any]:
    """
    Fetch summary data from the backend.

    The HTTP request itself uses the standard library, while asyncio.to_thread
    keeps the bot responsive by moving the blocking I/O off the main event loop.
    """

    def _fetch_sync() -> dict[str, Any]:
        request = Request(
            SUMMARY_API_URL,
            headers={"Accept": "application/json"},
            method="GET",
        )

        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            status_code = getattr(response, "status", response.getcode())
            if status_code != 200:
                raise RuntimeError(f"Backend API returned status {status_code}")

            payload = response.read().decode("utf-8")

        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Backend API returned invalid JSON") from exc

        if not isinstance(data, dict):
            raise RuntimeError("Backend API response must be a JSON object")

        return data

    try:
        return await asyncio.to_thread(_fetch_sync)
    except HTTPError as exc:
        raise RuntimeError(f"HTTP error while calling backend API: {exc.code}") from exc
    except URLError as exc:
        raise RuntimeError(f"Could not reach backend API: {exc.reason}") from exc
    except OSError as exc:
        raise RuntimeError(f"Network error while calling backend API: {exc}") from exc


async def fetch_chart_data() -> dict[str, Any]:
    """
    Fetch chart data with requests for the /charts command.

    requests is synchronous, so the call runs in a worker thread to keep the
    async Telegram bot responsive.
    """

    def _fetch_sync() -> dict[str, Any]:
        response = requests.get(
            SUMMARY_API_URL,
            headers={"Accept": "application/json"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, dict):
            raise RuntimeError("Backend API response must be a JSON object")

        return data

    try:
        return await asyncio.to_thread(_fetch_sync)
    except requests.RequestException as exc:
        raise RuntimeError("Failed to fetch data") from exc


async def fetch_export_data(ward_name: str | None = None) -> dict[str, Any]:
    """
    Fetch export data for /export.

    Officers pass their ward as a query parameter so the backend can return
    ward-scoped totals. The request runs in a worker thread because requests
    is synchronous.
    """

    def _fetch_sync() -> dict[str, Any]:
        params = {"ward": ward_name} if ward_name else None
        response = requests.get(
            SUMMARY_API_URL,
            headers={"Accept": "application/json"},
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, dict):
            raise RuntimeError("Backend API response must be a JSON object")

        return data

    try:
        return await asyncio.to_thread(_fetch_sync)
    except requests.RequestException as exc:
        raise RuntimeError("Failed to fetch data") from exc


# -----------------------------------------------------------------------------
# Business logic for summaries and alerts
# -----------------------------------------------------------------------------

def get_highest_unpaid_ward(summary_data: dict[str, Any]) -> tuple[str, float] | None:
    """Find the ward with the highest unpaid amount."""
    wards = summary_data.get("wards", {})
    if not isinstance(wards, dict) or not wards:
        return None

    highest_name: str | None = None
    highest_value = float("-inf")

    for ward_name, ward_amount in wards.items():
        amount = to_number(ward_amount)
        if amount > highest_value:
            highest_name = format_ward_name(ward_name)
            highest_value = amount

    if highest_name is None:
        return None

    return highest_name, highest_value


def format_summary_message(summary_data: dict[str, Any]) -> str:
    """Create a clean human-readable summary for the /summary command."""
    highest_ward = get_highest_unpaid_ward(summary_data)
    wards = summary_data.get("wards", {})

    ward_lines: list[str] = []
    if isinstance(wards, dict) and wards:
        for ward_name, amount in wards.items():
            ward_lines.append(
                f"- {format_ward_name(ward_name)}: Rs. {format_currency(amount)}"
            )
    else:
        ward_lines.append("- No ward data available")

    highest_ward_line = (
        f"{highest_ward[0]} (Rs. {format_currency(highest_ward[1])})"
        if highest_ward
        else "Not available"
    )

    return "\n".join(
        [
            "Property Tax Summary",
            "",
            f"Total properties: {int(round(to_number(summary_data.get('total', 0))))}",
            f"Paid properties: {int(round(to_number(summary_data.get('paid', 0))))}",
            f"High-risk accounts: {int(round(to_number(summary_data.get('risk', 0))))}",
            f"Outstanding tax: Rs. {format_currency(summary_data.get('outstanding', 0))}",
            f"Highest unpaid ward: {highest_ward_line}",
            "",
            "Ward-wise unpaid tax:",
            *ward_lines,
        ]
    )


def build_alert_messages(summary_data: dict[str, Any]) -> list[str]:
    """Build the automatic alert messages based on current backend data."""
    alerts: list[str] = []

    if to_number(summary_data.get("risk", 0)) > 30:
        alerts.append("🚨 High-risk accounts detected")

    if to_number(summary_data.get("outstanding", 0)) > 500000:
        alerts.append("⚠️ Outstanding tax is very high")

    highest_ward = get_highest_unpaid_ward(summary_data)
    if highest_ward:
        alerts.append(f"📍 {highest_ward[0]} has highest unpaid tax today")

    return alerts


def generate_chart_images(
    summary_data: dict[str, Any],
    output_dir: Path,
) -> tuple[Path, Path | None]:
    """
    Generate the pie and bar chart images for /charts.

    The bar chart is optional because the API may return no defaulter rows.
    """
    pie_chart_path = output_dir / "pie_chart.png"
    bar_chart_path = output_dir / "bar_chart.png"

    paid = max(int(round(to_number(summary_data.get("paid", 0)))), 0)
    unpaid = max(int(round(to_number(summary_data.get("unpaid", 0)))), 0)
    pie_values = [paid, unpaid]

    # Matplotlib cannot render a true 0/0 pie chart, so provide a placeholder.
    if sum(pie_values) == 0:
        pie_values = [1, 0]

    pie_figure, pie_axis = plt.subplots(figsize=(6, 6))
    pie_axis.pie(
        pie_values,
        labels=["Paid", "Unpaid"],
        autopct="%1.1f%%",
        startangle=90,
        colors=["#2E8B57", "#DC143C"],
    )
    pie_axis.set_title("Property Tax Status")
    pie_axis.axis("equal")
    pie_figure.tight_layout()
    pie_figure.savefig(pie_chart_path, dpi=200, bbox_inches="tight")
    plt.close(pie_figure)

    defaulters = summary_data.get("defaulters", [])
    if not isinstance(defaulters, list) or not defaulters:
        return pie_chart_path, None

    normalized_defaulters: list[dict[str, float | str]] = []
    for item in defaulters:
        if not isinstance(item, dict):
            continue

        name = str(item.get("name", "")).strip()
        amount = to_number(item.get("amount", 0))
        if name:
            normalized_defaulters.append({"name": name, "amount": amount})

    if not normalized_defaulters:
        return pie_chart_path, None

    top_defaulters = sorted(
        normalized_defaulters,
        key=lambda item: float(item["amount"]),
        reverse=True,
    )[:5]

    names = [str(item["name"]) for item in top_defaulters]
    amounts = [float(item["amount"]) for item in top_defaulters]

    bar_figure, bar_axis = plt.subplots(figsize=(8, 5))
    bars = bar_axis.bar(names, amounts, color="#1D4ED8")
    bar_axis.set_title("Top Defaulters")
    bar_axis.set_xlabel("Defaulter")
    bar_axis.set_ylabel("Amount")
    bar_axis.tick_params(axis="x", rotation=20)

    for bar, amount in zip(bars, amounts):
        bar_axis.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height(),
            f"{int(round(amount)):,}",
            ha="center",
            va="bottom",
            fontsize=9,
        )

    bar_figure.tight_layout()
    bar_figure.savefig(bar_chart_path, dpi=200, bbox_inches="tight")
    plt.close(bar_figure)

    return pie_chart_path, bar_chart_path


def generate_pdf(data: dict[str, Any], output_path: Path) -> None:
    """Generate the PDF export report with summary data and defaulters."""
    document = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    story: list[Any] = []

    story.append(Paragraph("Property Tax Report", styles["Title"]))
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            styles["Normal"],
        )
    )
    story.append(Paragraph(f"Scope: {data.get('scope_label', 'All Wards')}", styles["Normal"]))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Summary", styles["Heading2"]))
    summary_rows = [
        ["Metric", "Value"],
        ["Total Properties", str(int(round(to_number(data.get("total", 0)))))],
        ["Paid", str(int(round(to_number(data.get("paid", 0)))))],
        ["Unpaid", str(int(round(to_number(data.get("unpaid", 0)))))],
        ["Outstanding", f"Rs. {format_currency(data.get('outstanding', 0))}"],
    ]
    summary_table = Table(summary_rows, colWidths=[220, 220])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1D4ED8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Defaulters", styles["Heading2"]))
    defaulters = normalize_defaulter_rows(data.get("defaulters", []))
    if not defaulters:
        story.append(Paragraph("No defaulters found for this report scope.", styles["Normal"]))
    else:
        defaulter_rows = [["Name", "Amount"]]
        for item in defaulters:
            defaulter_rows.append(
                [str(item["name"]), f"Rs. {format_currency(item['amount'])}"]
            )

        defaulter_table = Table(defaulter_rows, colWidths=[280, 160])
        defaulter_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                    ("PADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(defaulter_table)

    document.build(story)


def generate_excel(data: dict[str, Any], output_path: Path) -> None:
    """Generate the Excel export with defaulter name and amount columns."""
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Tax Data"

    worksheet.append(["Name", "Amount"])
    worksheet["A1"].font = Font(bold=True)
    worksheet["B1"].font = Font(bold=True)

    for item in normalize_defaulter_rows(data.get("defaulters", [])):
        worksheet.append([str(item["name"]), float(item["amount"])])

    worksheet.column_dimensions["A"].width = 28
    worksheet.column_dimensions["B"].width = 18
    workbook.save(output_path)


# -----------------------------------------------------------------------------
# Chat registration helpers
# -----------------------------------------------------------------------------

def register_chat_id(application: Application, chat_id: int) -> None:
    """
    Save a chat_id in memory and print it for easy setup.

    Automatic alerts can only be sent to chats that the bot already knows about,
    or to a chat ID provided through the ALERT_CHAT_ID environment variable.
    """
    known_chat_ids = get_known_chat_ids(application)
    is_new_chat = chat_id not in known_chat_ids
    known_chat_ids.add(chat_id)

    logger.info("Active alert chat_id: %s", chat_id)
    print(f"Active alert chat_id: {chat_id}")

    if is_new_chat:
        logger.info("Registered new chat_id for automatic alerts: %s", chat_id)


def load_chat_id_from_environment(application: Application) -> None:
    """Optionally preload one alert target from ALERT_CHAT_ID."""
    if not ALERT_CHAT_ID:
        return

    try:
        chat_id = int(ALERT_CHAT_ID)
    except ValueError:
        logger.warning("Ignoring invalid ALERT_CHAT_ID value: %s", ALERT_CHAT_ID)
        return

    get_known_chat_ids(application).add(chat_id)
    logger.info("Loaded ALERT_CHAT_ID from environment: %s", chat_id)


# -----------------------------------------------------------------------------
# Telegram command handlers
# -----------------------------------------------------------------------------

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start and register the current chat for alerts."""
    if update.effective_chat is None or update.message is None:
        return

    register_chat_id(context.application, update.effective_chat.id)

    welcome_message = (
        "Welcome to the Tax Smart Alert Bot.\n\n"
        "Commands:\n"
        "/start - Register this chat and show help\n"
        "/summary - Fetch live tax statistics\n"
        "/charts - Generate tax status and defaulter charts\n"
        "/export - Generate PDF and Excel tax reports\n"
        "/chatid - Show the current chat_id\n\n"
        "This bot also checks the backend every 1 minute and automatically "
        "sends smart alerts when risk, outstanding tax, or ward conditions "
        "cross important thresholds."
    )

    await update.message.reply_text(welcome_message)


async def summary_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /summary by fetching backend data and formatting it for Telegram."""
    if update.effective_chat is not None:
        register_chat_id(context.application, update.effective_chat.id)

    if update.message is None:
        return

    try:
        summary_data = await fetch_summary_data()
        await update.message.reply_text(format_summary_message(summary_data))
    except Exception as exc:
        logger.exception("Failed to fetch summary data")
        await update.message.reply_text(
            f"Could not fetch summary data from the backend.\nError: {exc}"
        )


async def chat_id_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /chatid by printing and returning the current Telegram chat_id."""
    if update.effective_chat is None or update.message is None:
        return

    chat_id = update.effective_chat.id
    register_chat_id(context.application, chat_id)
    await update.message.reply_text(f"Your chat_id is: {chat_id}")


async def charts_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /charts by generating and sending summary charts to the user."""
    if update.effective_chat is not None:
        register_chat_id(context.application, update.effective_chat.id)

    if update.message is None:
        return

    await update.message.reply_text("Generating charts...")

    try:
        summary_data = await fetch_chart_data()
    except Exception:
        logger.exception("Failed to fetch chart data")
        await update.message.reply_text("Failed to fetch data")
        return

    await asyncio.sleep(0.4)

    with tempfile.TemporaryDirectory() as temp_dir:
        pie_chart_path, bar_chart_path = await asyncio.to_thread(
            generate_chart_images,
            summary_data,
            Path(temp_dir),
        )

        with pie_chart_path.open("rb") as pie_chart_file:
            await update.message.reply_photo(photo=pie_chart_file)

        if bar_chart_path is None:
            await update.message.reply_text("No defaulters found to generate the bar chart.")
            return

        with bar_chart_path.open("rb") as bar_chart_file:
            await update.message.reply_photo(photo=bar_chart_file)


async def export_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /export by generating PDF and Excel files for the current role."""
    if update.effective_chat is None or update.message is None:
        return

    register_chat_id(context.application, update.effective_chat.id)

    role, ward_name = resolve_export_scope(update.effective_chat.id)
    if role is None:
        await update.message.reply_text(
            "Export access is not configured for this chat."
        )
        return

    await update.message.reply_text("Generating export files...")

    try:
        summary_data = await fetch_export_data(ward_name if role == "officer" else None)
        export_data = build_export_payload(summary_data, role, ward_name)
    except Exception:
        logger.exception("Failed to fetch export data")
        await update.message.reply_text("Failed to fetch data")
        return

    await asyncio.sleep(0.4)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        pdf_path = temp_path / "report.pdf"
        excel_path = temp_path / "report.xlsx"

        try:
            await asyncio.gather(
                asyncio.to_thread(generate_pdf, export_data, pdf_path),
                asyncio.to_thread(generate_excel, export_data, excel_path),
            )
        except Exception:
            logger.exception("Failed to generate export files")
            await update.message.reply_text("Failed to generate export files")
            return

        with pdf_path.open("rb") as pdf_file:
            await update.message.reply_document(document=pdf_file)

        with excel_path.open("rb") as excel_file:
            await update.message.reply_document(document=excel_file)


# -----------------------------------------------------------------------------
# Automatic alert delivery
# -----------------------------------------------------------------------------

async def broadcast_alerts(application: Application, alerts: list[str]) -> None:
    """Send alert messages to all registered chats."""
    known_chat_ids = get_known_chat_ids(application)
    if not known_chat_ids:
        logger.info("No registered chat IDs available yet. Skipping alert delivery.")
        return

    for chat_id in known_chat_ids:
        for alert in alerts:
            try:
                await application.bot.send_message(chat_id=chat_id, text=alert)
                logger.info("Sent alert to chat_id=%s: %s", chat_id, alert)
            except Exception:
                logger.exception("Failed to send alert to chat_id=%s", chat_id)


async def run_smart_alert_check(application: Application) -> None:
    """
    Periodic scheduled job that checks backend data and pushes alerts.

    The small duplicate check prevents sending the same alert batch repeatedly
    every minute when the backend data has not changed.
    """
    try:
        summary_data = await fetch_summary_data()
        alerts = build_alert_messages(summary_data)

        if not alerts:
            logger.info("Alert check completed with no triggered conditions.")
            set_last_alert_signature(application, tuple())
            return

        alert_signature = tuple(alerts)
        if alert_signature == get_last_alert_signature(application):
            logger.info("Alert conditions unchanged. No duplicate alerts sent.")
            return

        await broadcast_alerts(application, alerts)
        set_last_alert_signature(application, alert_signature)
    except Exception:
        logger.exception("Automatic smart alert check failed")


# -----------------------------------------------------------------------------
# Application lifecycle hooks
# -----------------------------------------------------------------------------

async def on_startup(application: Application) -> None:
    """Start the APScheduler job once the Telegram app is ready."""
    load_chat_id_from_environment(application)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_smart_alert_check,
        trigger="interval",
        minutes=ALERT_INTERVAL_MINUTES,
        args=[application],
        id="smart-alert-job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()

    application.bot_data["scheduler"] = scheduler
    logger.info("Smart alert scheduler started. Checking every %s minute(s).", ALERT_INTERVAL_MINUTES)


async def on_shutdown(application: Application) -> None:
    """Shut down APScheduler cleanly when the bot stops."""
    scheduler = application.bot_data.get("scheduler")
    if scheduler is not None:
        scheduler.shutdown(wait=False)
        logger.info("Smart alert scheduler stopped.")


# -----------------------------------------------------------------------------
# Main entry point
# -----------------------------------------------------------------------------

def main() -> None:
    """Build and start the Telegram bot."""
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN environment variable is not set")

    application = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(on_startup)
        .post_shutdown(on_shutdown)
        .build()
    )

    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("summary", summary_command))
    application.add_handler(CommandHandler("charts", charts_command))
    application.add_handler(CommandHandler("export", export_command))
    application.add_handler(CommandHandler("chatid", chat_id_command))

    logger.info("Bot is starting. Summary API: %s", SUMMARY_API_URL)
    application.run_polling(drop_pending_updates=False)


if __name__ == "__main__":
    main()
