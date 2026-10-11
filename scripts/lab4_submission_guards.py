"""Pure final-submission policy, shared by the generator and regression tests."""
import json
import re
from pathlib import Path


def peer_approved(pull):
    decisions = {}
    for review in pull.get("reviews", []):
        if review["author"] != "MacOverlorD" and review["state"] in ("APPROVED", "CHANGES_REQUESTED"):
            decisions[review["author"]] = review
    return any(r["state"] == "APPROVED" and r["commit"] == pull.get("headRefOid")
               for r in decisions.values())


def validate_workflow(snapshot, sha, is_ancestor):
    pulls = snapshot.get("releasePulls", [])
    reviewed_main = [p for p in pulls if p.get("state") == "MERGED"
                     and p.get("baseRefName") == "main" and peer_approved(p)]
    staging_releases = [p for p in reviewed_main if p.get("headRefName") == "lab4-staging"]
    if not any(re.fullmatch(r"[0-9a-f]{40}", merge := (p.get("mergeCommit") or {}).get("oid", ""))
               and is_ancestor(merge, sha) for p in staging_releases):
        raise ValueError("A peer-approved lab4-staging -> main release merge must be an ancestor of final main.")
    if not any((p.get("mergeCommit") or {}).get("oid") == sha for p in reviewed_main):
        raise ValueError("Final main must itself be the merge of a peer-approved PR to main.")
    if not all(any(i.get("number") == number and i.get("state") == "CLOSED"
                   for i in snapshot.get("issues", [])) for number in range(54, 63)):
        raise ValueError("Final submission requires all nine Issues #54-#62 CLOSED.")
    if not all(any(i.get("issue") == number and i.get("status") == "Done"
                   for i in snapshot.get("project", {}).get("items", [])) for number in range(54, 63)):
        raise ValueError("Final submission requires all nine Project issues Done.")


def validate_commands(manifest):
    expected = json.loads(Path(__file__).with_name("lab4-release-commands.json").read_text(encoding="utf-8"))
    recorded = manifest.get("commands", [])
    if [(c.get("name"), c.get("command")) for c in recorded] != [
        (name, "npm " + " ".join(args)) for name, args in expected
    ]:
        raise ValueError("Incomplete or out-of-order command manifest; recorded clean npm ci is required.")
    if any(c.get("exitCode") != 0 for c in recorded):
        raise ValueError("A recorded verification command failed.")
