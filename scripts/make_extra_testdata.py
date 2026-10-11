"""Generate data/aanvullende-testdata.json: SELF-MADE fictional data on top of the AllKidz test data.

The supplied test data has no licences, client organisations, activities or bags. This file adds them,
with a few deliberate conflicts and look-alike traps (see EXPECTED at the bottom). Deterministic, stdlib only.
Run: python -I scripts/make_extra_testdata.py <repo root>
"""
import json, sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
base = json.loads((ROOT / "src/lib/testdata/testdata.json").read_text(encoding="utf8"))
loc_type = {l["name"]: l["type"] for l in base["locations"]}
shifts = sorted(base["shifts"], key=lambda s: s["code"])
functions = {e["name"]: e["functions"] for e in base["employees"]}

def works_at(name, typ):
    return any(s["employee"] == name and loc_type[s["location"]] == typ for s in shifts)

# --- licences --------------------------------------------------------------------------------
licences = []
def add(emp, typ, expires=None):
    licences.append({"employee": emp, "type": typ, "expiresOn": expires})

for e in base["employees"]:
    n = e["name"]
    add(n, "VOG")
    if works_at(n, "KDV") and n != "Hana":           # Hana: missing Kinder-EHBO (conflict)
        add(n, "Kinder-EHBO", "2027-06-30")
    if works_at(n, "Zwembad"):
        if n == "Nina":
            add(n, "EHBO", "2026-10-01")             # expired before her pool shifts (conflict)
        elif n == "Amber":
            add(n, "EHBO", "2026-10-23")             # expires on her last pool shift: still valid (trap)
        else:
            add(n, "EHBO", "2027-03-31")
    if "Toezichthouder" in e["functions"]:
        add(n, "Toezicht zwembad", "2027-12-31")
for n in ["Lotte", "Eva", "Tom", "Roos", "Stijn"]:
    add(n, "BHV", "2027-05-31")
add("Sven", "BHV", "2026-09-01")                     # expired but never required (trap)
for n in ["Fleur", "Noor", "Jelle", "Daan"]:          # some realism: EHBO without needing it
    if not any(l["employee"] == n and l["type"] == "EHBO" for l in licences):
        add(n, "EHBO", "2027-01-31")

# --- clients ---------------------------------------------------------------------------------
clients = [
    {"name": "Kinderopvang Duinstreek", "locations": ["BSO De Duinroos", "KDV De Zandkorrel", "TSO De Fontein", "BSO Sterrenstof", "KDV Het Paddenstoeltje"]},
    {"name": "Stichting Kind & Co Leiden", "locations": ["BSO De Kikker", "KDV Bambino", "TSO Het Palet", "BSO Het Klimrek", "TSO De Brug"]},
    {"name": "Kinderopvang Oegstgeest", "locations": ["BSO Zonnebloem", "KDV Kleine Kei", "TSO De Regenboog", "BSO De Molenwiek"]},
    {"name": "Bollenstreek Kids", "locations": ["BSO Het Speelhuis", "TSO Het Kompas", "BSO Kakelbont"]},
    {"name": "Kinderopvang Wassenaar-Voorschoten", "locations": ["BSO De Wilgenhof", "KDV Zonneweide", "BSO De Vlindertuin", "KDV De Pluimpjes"]},
    {"name": "Sportbedrijf Kust & Rijn", "locations": ["Zwembad De Zijl", "Zwembad Het Bassin", "Zwembad De Waterlelie", "Zwembad De Branding"]},
    {"name": "Scholengroep Rijnland", "locations": ["School De Meidoorn", "School Het Mozaïek", "School De Lindeboom"]},
]
assigned = sorted(l for c in clients for l in c["locations"])
assert assigned == sorted(loc_type), "every location must belong to exactly one client"

# --- activities and bags ---------------------------------------------------------------------
activities = [
    {"name": "Jachtseizoen", "bags": 2, "packingList": [["Oranje hesjes", 8], ["Politiepetten", 4], ["Walkietalkies", 4], ["Pionnen", 10], ["Fluitje", 1], ["Spelregelkaart", 1]]},
    {"name": "Voetbal clinic", "bags": 2, "packingList": [["Voetballen", 6], ["Hesjes (2 kleuren)", 12], ["Pionnen", 16], ["Pop-up goals", 2], ["Pomp", 1]]},
    {"name": "Levend Stratego", "bags": 1, "packingList": [["Rangkaarten rood", 20], ["Rangkaarten blauw", 20], ["Vlaggen", 2], ["Hesjes (2 kleuren)", 20], ["Scheidsrechterskaart", 1]]},
    {"name": "Speurtocht", "bags": 1, "packingList": [["Opdrachtkaarten", 12], ["Kompassen", 4], ["Potloden", 12], ["Schatkist met sloten", 1], ["Plattegronden", 6]]},
    {"name": "Apenkooien", "bags": 1, "packingList": [["Lintjes (tikkers)", 6], ["Spelregelkaart", 1], ["Fluitje", 1], ["EHBO-tasje", 1]]},
    {"name": "Zwemspelletjes", "bags": 1, "packingList": [["Duikringen", 10], ["Drijfplankjes", 8], ["Zwemvleugels", 6], ["Waterbal", 2]]},
]
bags = [{"activity": a["name"], "label": f"{a['name']} tas {i + 1}"} for a in activities for i in range(a["bags"])]
bag_labels = {a["name"]: [b["label"] for b in bags if b["activity"] == a["name"]] for a in activities}

shift_extras = {}  # code -> {activity, bag, extraRequirements}
held = {}          # (date, bag label) -> employee

def give(code, activity, bag=None):
    s = next(x for x in shifts if x["code"] == code)
    if bag is None:
        bag = next((b for b in bag_labels[activity] if held.get((s["date"], b), s["employee"]) == s["employee"]), None)
    if bag:
        held.setdefault((s["date"], bag), s["employee"])
    shift_extras.setdefault(code, {})
    shift_extras[code].update({"activity": activity, "bag": bag})

cycle = ["Jachtseizoen", "Voetbal clinic", "Levend Stratego", "Jachtseizoen"]
for date in sorted({s["date"] for s in shifts}):
    bso = [s for s in shifts if s["date"] == date and s["employee"] and loc_type[s["location"]] == "BSO" and s["start"] >= "14:00"][:4]
    for s, act in zip(bso, cycle):
        give(s["code"], act)

give("D242", "Speurtocht")  # Niels, Wednesday, KDV De Zandkorrel
give("D245", "Speurtocht")  # Niels again, same bag, same coach: fine (trap)
give("D019", "Zwemspelletjes")  # Daphne Monday
give("D014", "Zwemspelletjes")  # Amber Tuesday

# Forced double: a Tuesday BSO shift (other coach) gets the Jachtseizoen bag already held that day.
tue = "2026-10-20"
holder_bag = next(b for (d, b), emp in held.items() if d == tue and b.startswith("Jachtseizoen"))
holder = held[(tue, holder_bag)]
candidate = next(s for s in shifts if s["date"] == tue and s["employee"] and s["employee"] != holder
                 and loc_type[s["location"]] == "BSO" and s["start"] >= "14:00" and s["code"] not in shift_extras)
shift_extras[candidate["code"]] = {"activity": "Jachtseizoen", "bag": holder_bag}

for code in ["D037", "D064"]:  # busy Wednesday at BSO Kakelbont: BHV required (Bo lacks it, Lotte has it)
    shift_extras.setdefault(code, {})["extraRequirements"] = ["BHV"]

# --- client requests -------------------------------------------------------------------------
requests = [
    {"client": "Sportbedrijf Kust & Rijn", "location": "Zwembad De Zijl", "rule": {"kind": "once", "date": "2026-10-23"},
     "start": "15:00", "end": "17:00", "function": "Aqualessen", "activity": "Zwemspelletjes", "note": "Extra lesgroep in de herfstvakantie-week"},
    {"client": "Kinderopvang Duinstreek", "location": "BSO De Duinroos", "rule": {"kind": "dates", "dates": ["2026-10-26", "2026-10-28"]},
     "start": "14:45", "end": "18:00", "function": "KidzCoach", "activity": "Jachtseizoen", "note": "Graag iemand die de kinderen al kent"},
    {"client": "Scholengroep Rijnland", "location": "School De Meidoorn", "rule": {"kind": "weekly", "weekdays": [2], "interval": 1, "from": "2026-11-03", "to": "2026-11-24"},
     "start": "13:00", "end": "15:00", "function": "Gymdocent", "activity": None, "note": "Vervanging vaste gymdocent"},
]

out = {
    "_note": "ZELF GEMAAKT: fictieve aanvulling op de testdata van AllKidz (licenties, opdrachtgevers, activiteiten, tassen, aanvragen). Geen echte gegevens.",
    "licenceTypes": ["VOG", "EHBO", "Kinder-EHBO", "BHV", "Toezicht zwembad"],
    "requirementsByLocationType": {"BSO": ["VOG"], "TSO": ["VOG"], "School": ["VOG"], "KDV": ["VOG", "Kinder-EHBO"], "Zwembad": ["VOG", "EHBO"]},
    "employeeLicences": licences,
    "clients": clients,
    "activities": [{"name": a["name"], "packingList": [{"item": i, "qty": q} for i, q in a["packingList"]]} for a in activities],
    "bags": bags,
    "shiftExtras": [{"code": c, "activity": v.get("activity"), "bag": v.get("bag"), "extraRequirements": v.get("extraRequirements", [])}
                    for c, v in sorted(shift_extras.items())],
    "requests": requests,
}
for p in [ROOT / "data/aanvullende-testdata.json", ROOT / "src/lib/testdata/aanvullende-testdata.json"]:
    p.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf8")
print("ok", len(licences), "licences,", len(out["shiftExtras"]), "shift extras, forced double on", candidate["code"], "vs holder", holder, holder_bag)
