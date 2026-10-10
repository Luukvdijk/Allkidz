"""Independent check of the self-made extra data: which licence and bag conflicts does it create?
Written separately from the TypeScript engine so the golden test does not check the engine against itself.
Run: python -I scripts/analyze_extra.py <repo root>
"""
import json, sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
base = json.loads((ROOT / "src/lib/testdata/testdata.json").read_text(encoding="utf8"))
extra = json.loads((ROOT / "src/lib/testdata/aanvullende-testdata.json").read_text(encoding="utf8"))
loc_type = {l["name"]: l["type"] for l in base["locations"]}
extras = {x["code"]: x for x in extra["shiftExtras"]}
lic = defaultdict(dict)
for l in extra["employeeLicences"]:
    lic[l["employee"]][l["type"]] = l["expiresOn"]

licence_conflicts = []
for s in base["shifts"]:
    if not s["employee"]:
        continue
    req = set(extra["requirementsByLocationType"][loc_type[s["location"]]]) | set(extras.get(s["code"], {}).get("extraRequirements", []))
    for r in sorted(req):
        have = lic[s["employee"]]
        if r not in have:
            licence_conflicts.append((s["code"], s["employee"], r, "missing"))
        elif have[r] is not None and have[r] < s["date"]:
            licence_conflicts.append((s["code"], s["employee"], r, "expired " + have[r]))

holders = defaultdict(list)
for s in base["shifts"]:
    x = extras.get(s["code"])
    if x and x.get("bag") and s["employee"]:
        holders[(s["date"], x["bag"])].append((s["code"], s["employee"]))
bag_conflicts = [(k, v) for k, v in holders.items() if len({e for _, e in v}) > 1]

print("LICENCE", len(licence_conflicts))
for c in licence_conflicts:
    print("  ", c)
print("BAG", len(bag_conflicts))
for c in bag_conflicts:
    print("  ", c)
same_coach = [(k, v) for k, v in holders.items() if len(v) > 1 and len({e for _, e in v}) == 1]
print("same coach same bag (must NOT be a conflict):", same_coach)
print("Amber EHBO", lic["Amber"].get("EHBO"), "| Sven BHV", lic["Sven"].get("BHV"), "| Lotte BHV", lic["Lotte"].get("BHV"))
