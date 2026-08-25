import re
import warnings

import pandas as pd

warnings.filterwarnings("ignore")
import dateparser

HDFC_FILES = [
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX0360_20082026 (3).xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX0360_20082026 (4).xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX0360_20082026.xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX6827_20082026 (1).xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX6827_20082026 (2).xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX6827_20082026 (3).xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX6827_20082026 (4).xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX6827_20082026.xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX0360_20082026 (1).xls",
    r"G:\My Drive\Bank Statements For 5 Years\Acct_Statement_XXXXXXXX0360_20082026 (2).xls",
]
ICICI_FILES = [
    r"G:\My Drive\Bank Statements For 5 Years\OpTransactionHistory20-08-2026 (1).xls",
    r"G:\My Drive\Bank Statements For 5 Years\OpTransactionHistory20-08-2026 (2).xls",
    r"G:\My Drive\Bank Statements For 5 Years\OpTransactionHistory20-08-2026 (3).xls",
    r"G:\My Drive\Bank Statements For 5 Years\OpTransactionHistory20-08-2026.xls",
]
rows = []  # final consolidated rows
counts = {}  # per-file transaction counts
flags_count = {"category": 0, "party": 0}

# ---------------------------------------------------------------
# Category keyword rules (checked in order, first match wins)
# ---------------------------------------------------------------
CATEGORIES_EXPECTING_PARTY = {
    "Transfer",
    "Credit Card Payment",
    "Groceries",
    "Food & Dining",
    "Shopping",
    "Travel",
    "Investment",
    "Insurance",
    "Salary",
    "Rent",
    "Loan/EMI",
    "Subscription",
    "Healthcare",
    "Entertainment",
}

CATEGORY_RULES = [
    ("Salary", [r"\bSALARY\b", r"\bSAL\b"]),
    ("Rent", [r"\bRENT\b"]),
    ("Interest", [r"INTEREST PAID", r"INTEREST CREDIT", r"INT\.?PD", r"PRIN AND INT AUTO_REDEEM"]),
    ("ATM Withdrawal", [r"\bATM\b", r"CASH WDL", r"\bNFS\b"]),
    ("Fees", [r"DCARDFEE", r"SMSCHGS", r"\bFEE\b", r"CHARGES", r"PAYWAVE.*JFEE"]),
    ("Credit Card Payment", [r"\bCRED\b", r"CRED CLUB", r"CREDIT CARD", r"HDFC CREDI", r"\bBBPS\b.*CREDI"]),
    (
        "Investment",
        [
            r"KANJIFOREX",
            r"MUTUAL FUND",
            r"\bSIP\b",
            r"ZERODHA",
            r"GROWW",
            r"ICICI ?DIRECT",
            r"\bFD THROUGH MOBILE\b",
            r"\bNSE\b",
            r"STOCK",
        ],
    ),
    ("Insurance", [r"ADPRULIFE", r"LIC\b", r"INSURANCE", r"PRULIFE"]),
    ("Loan/EMI", [r"\bEMI\b", r"\bLOAN\b", r"\bNACH\b", r"\bECS\b"]),
    ("Groceries", [r"ZEPTO", r"BLINKIT", r"BIGBASKET", r"D ?MART", r"SUPER SHOPPY", r"GROFERS", r"KIRANA", r"GROCERY"]),
    ("Food & Dining", [r"ZOMATO", r"SWIGGY", r"RESTAURANT", r"\bCAFE\b", r"EATS"]),
    ("Shopping", [r"MYNTRA", r"AMAZON", r"FLIPKART", r"AJIO", r"NYKAA"]),
    ("Travel", [r"INDIGO", r"IRCTC", r"MAKEMYTRIP", r"UBER", r"OLA\b", r"AIRLINE", r"REDBUS"]),
    (
        "Utilities",
        [
            r"ELECTRICITY",
            r"MSEB",
            r"BSES",
            r"\bGAS\b",
            r"WATER BILL",
            r"BROADBAND",
            r"\bJIO\b",
            r"AIRTEL",
            r"VODAFONE",
            r"RECHARGE",
            r"\bBBPS\b",
        ],
    ),
    ("Subscription", [r"GOOGLE ?PLAY", r"NETFLIX", r"SPOTIFY", r"\bME DC SI\b"]),
    ("Loan/EMI", [r"BAJAJ ?FINA"]),
    ("Healthcare", [r"HEALT", r"HOSPITAL", r"PHARMA", r"CLINIC", r"MEDIC"]),
    ("Entertainment", [r"\bPMC\b", r"CINEMA", r"MOVIE", r"BOOKMYSHOW", r"PVR\b", r"INOX\b"]),
    ("Reversal", [r"^REV\b", r"\bUPIRET\b", r"REVERSAL"]),
]

TRANSFER_PREFIXES = [
    r"^UPI\b",
    r"^IMPS\b",
    r"^NEFT\b",
    r"^RTGS\b",
    r"^IB FUNDS TRANSFER\b",
    r"^MMT\b",
]


def classify_category(narration: str) -> str:
    n = narration.upper()
    for cat, patterns in CATEGORY_RULES:
        for pat in patterns:
            if re.search(pat, n):
                return cat
    for pat in TRANSFER_PREFIXES:
        if re.search(pat, n):
            return "Transfer"
    return ""  # cannot confidently determine


NAME_TOKEN_RE = re.compile(r"^[A-Za-z][A-Za-z .&']*$")


def looks_like_name(token: str) -> bool:
    token = token.strip()
    if not token:
        return False
    if "@" in token or "." in token.replace(" ", "") and not NAME_TOKEN_RE.match(token):
        pass
    return bool(NAME_TOKEN_RE.match(token)) and len(token) >= 3


def extract_party_hdfc(narration: str) -> str:
    n = narration.strip()
    up = n.upper()
    if up.startswith("UPI-") or up.startswith("UPI -"):
        parts = n.split("-")
        if len(parts) > 1:
            cand = parts[1].strip()
            if cand:
                return cand
        return ""
    if up.startswith("IMPS-"):
        parts = n.split("-")
        if len(parts) > 2:
            cand = parts[2].strip()
            if cand:
                return cand
        return ""
    if up.startswith("IB FUNDS TRANSFER"):
        parts = n.split("-")
        if len(parts) > 2:
            cand = parts[-1].strip()
            if looks_like_name(cand):
                return cand
        return ""
    if up.startswith("NEFT CR") or up.startswith("NEFT DR") or up.startswith("RTGS"):
        parts = n.split("-")
        for p in parts:
            p = p.strip()
            if looks_like_name(p):
                return p
        return ""
    if "GOOGLE PLAY" in up or "GOOGLEPLAY" in up:
        return "Google Play"
    if up.startswith("INTEREST") or "AUTO_REDEEM" in up or "INTEREST CREDIT" in up:
        return ""
    if up.startswith("FD THROUGH MOBILE"):
        if ":" in n:
            cand = n.split(":")[-1].strip()
            if looks_like_name(cand):
                return cand
        return ""
    if up.startswith("REV") or up.startswith("UPIRET"):
        parts = [p.strip() for p in n.split("-") if p.strip()]
        if parts:
            cand = parts[-1]
            if cand.isalpha() or (cand.replace(" ", "").isalnum() and not cand.isdigit()):
                return cand
        return ""
    return ""


def extract_party_icici(narration: str) -> str:
    n = narration.strip()
    up = n.upper()
    if up.startswith("UPI/"):
        parts = n.split("/")
        if len(parts) > 1:
            cand = parts[1].strip()
            if cand:
                return cand
        return ""
    if up.startswith("MMT/"):
        # MMT/IMPS/<ref>/<purpose>/<name>/<bank>
        parts = [p.strip() for p in n.split("/") if p.strip()]
        if len(parts) >= 2:
            return parts[-2]
        return ""
    if up.startswith("CMS/"):
        parts = [p.strip() for p in n.split("/") if p.strip()]
        if len(parts) >= 2:
            return parts[-1].split("__")[0]
        return ""
    if up.startswith("ATM/"):
        return ""
    if up.startswith("VIN/"):
        parts = [p.strip() for p in n.split("/") if p.strip()]
        if len(parts) > 1:
            return parts[1]
        return ""
    if up.startswith("BIL/"):
        parts = [p.strip() for p in n.split("/") if p.strip()]
        for p in parts:
            if "CREDI" in p.upper():
                return "HDFC Credit Card"
            if "BAJAJ" in p.upper():
                return "Bajaj Finance"
        return ""
    if up.startswith("VPS/") or up.startswith("NRS/"):
        parts = [p.strip() for p in n.split("/") if p.strip()]
        if len(parts) > 1 and looks_like_name(parts[1]):
            return parts[1]
        return ""
    if up.startswith("RTGS-"):
        parts = n.split("-")
        for p in parts:
            p = p.strip()
            if looks_like_name(p):
                return p
        return ""
    if up.startswith("NFS/") or up.startswith("VPS/"):
        return ""
    if "DCARDFEE" in up or "SMSCHGS" in up or "JFEE" in up:
        return ""
    if ":INT.PD:" in up:
        return ""
    return ""


def build_flag(category: str, party: str) -> str:
    missing = []
    if not category:
        missing.append("category")
    elif category in CATEGORIES_EXPECTING_PARTY and not party:
        missing.append("party")
    if missing:
        return "Review: " + " and ".join(missing) + " not confidently determined from narration"
    return ""


def to_ddmmyyyy(date_str: str, fmt_in: str) -> str:
    try:
        dt = dateparser.parse(date_str)
        return dt.strftime("%d-%m-%Y")
    except Exception as e:
        print(f"{date_str}: {e}")
        return None


# ---------------------------------------------------------------
# FILE 1: HDFC Bank statement
# ---------------------------------------------------------------
def process_hdfc(file_name):
    df = pd.read_excel(file_name, header=None)
    data = df.iloc[22:749].copy()  # verified transaction block
    extracted = 0
    for _, r in data.iterrows():
        date_raw = r[0]
        narration = r[1]
        withdrawal = r[4]
        deposit = r[5]
        balance = r[6]

        if pd.isna(date_raw) or str(date_raw).strip() == "" or "*" in str(date_raw):
            continue
        date_str = to_ddmmyyyy(str(date_raw).strip(), "%d/%m/%y")
        if not date_str:
            continue
        narration_str = str(narration).strip()

        wd = float(withdrawal) if pd.notna(withdrawal) else 0.0
        dep = float(deposit) if pd.notna(deposit) else 0.0

        if wd > 0:
            txn_type = "Outgoing"
            amount = wd
        else:
            txn_type = "Incoming"
            amount = dep

        category = classify_category(narration_str)
        party = extract_party_hdfc(narration_str)

        if not category:
            flags_count["category"] += 1
        if not party:
            flags_count["party"] += 1

        rows.append(
            {
                "Date": date_str,
                "_sort_date": pd.to_datetime(date_str, format="%d-%m-%Y"),
                "_orig_order": extracted,
                "Type": txn_type,
                "Category": category,
                "Party (To/From)": party,
                "Description": narration_str,
                "Amount": round(amount, 2),
                "Bank Account Number": "XXXXXXXX0360",
                "Bank Name": "HDFC Bank",
                "Balance after Transaction": round(float(balance), 2) if pd.notna(balance) else "",
                "Flag": build_flag(category, party),
            }
        )
        extracted += 1
    counts["Acct_Statement_XXXXXXXX0360 (HDFC Bank)"] = extracted


# ---------------------------------------------------------------
# FILE 2: ICICI Bank statement
# ---------------------------------------------------------------
def process_icici(file_name):
    df = pd.read_excel(file_name, header=None)
    data = df.iloc[13:250].copy()  # verified transaction block (S.No 1-233)
    extracted = 0
    for _, r in data.iterrows():
        sno = r[1]
        date_raw = r[3]  # Transaction Date
        narration = r[5]
        withdrawal = r[6]
        deposit = r[7]
        balance = r[8]

        if pd.isna(sno):
            continue

        date_str = to_ddmmyyyy(str(date_raw).strip(), "%d,%m,%Y")
        narration_str = str(narration).strip()

        wd = float(withdrawal) if pd.notna(withdrawal) else 0.0
        dep = float(deposit) if pd.notna(deposit) else 0.0

        if wd > 0:
            txn_type = "Outgoing"
            amount = wd
        else:
            txn_type = "Incoming"
            amount = dep

        category = classify_category(narration_str)
        party = extract_party_icici(narration_str)

        if not category:
            flags_count["category"] += 1
        if not party:
            flags_count["party"] += 1

        rows.append(
            {
                "Date": date_str,
                "_sort_date": pd.to_datetime(date_str, format="%d-%m-%Y"),
                "_orig_order": extracted,
                "Type": txn_type,
                "Category": category,
                "Party (To/From)": party,
                "Description": narration_str,
                "Amount": round(amount, 2),
                "Bank Account Number": "XXXXXX0747",
                "Bank Name": "ICICI Bank",
                "Balance after Transaction": round(float(balance), 2) if pd.notna(balance) else "",
                "Flag": build_flag(category, party),
            }
        )
        extracted += 1
    counts["OpTransactionHistory (ICICI Bank)"] = extracted


#
for file_name in HDFC_FILES:
    process_hdfc(file_name)
for file_name in ICICI_FILES:
    process_icici(file_name)

final_df = pd.DataFrame(rows)
# stable sort: by transaction date, preserving original file/row order on ties
final_df["_file_order"] = range(len(final_df))
final_df = final_df.sort_values(by=["_sort_date", "_file_order"], kind="stable")
final_df = final_df.drop(columns=["_sort_date", "_orig_order", "_file_order"])

OUTPUT_COLUMNS = [
    "Date",
    "Type",
    "Category",
    "Party (To/From)",
    "Description",
    "Amount",
    "Bank Account Number",
    "Bank Name",
    "Balance after Transaction",
    "Flag",
]
final_df = final_df[OUTPUT_COLUMNS]

print("Per-file extracted counts:")
total = 0
for k, v in counts.items():
    print(f"  {k}: {v}")
    total += v
print(f"Sum of per-file counts: {total}")
print(f"Rows in final consolidated dataframe: {len(final_df)}")
print(f"Rows flagged (category not determined): {flags_count['category']}")
print(f"Rows flagged (party not determined): {flags_count['party']}")

final_df.to_csv("./consolidated_preview.csv", index=False)
print("\nSaved preview CSV.")
