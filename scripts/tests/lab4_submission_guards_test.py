import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lab4_submission_guards import validate_commands, validate_workflow

SHA = "a" * 40
RELEASE = "b" * 40
HEAD = "c" * 40


def pull(head="lab4-staging", merge=SHA):
    return {"state": "MERGED", "baseRefName": "main", "headRefName": head,
            "headRefOid": HEAD, "mergeCommit": {"oid": merge},
            "reviews": [{"author": "Ohmmykung09", "state": "APPROVED", "commit": HEAD}]}


def snapshot():
    return {"releasePulls": [pull()],
            "issues": [{"number": n, "state": "CLOSED"} for n in range(54, 63)],
            "project": {"items": [{"issue": n, "status": "Done"} for n in range(54, 63)]}}


def manifest():
    commands = json.loads(Path(__file__).resolve().parents[1].joinpath("lab4-release-commands.json").read_text())
    return {"commands": [{"name": name, "command": "npm " + " ".join(args), "exitCode": 0}
                         for name, args in commands]}


class WorkflowTests(unittest.TestCase):
    def check(self, data, ancestors=(SHA,)):
        validate_workflow(data, SHA, lambda merge, current: current == SHA and merge in ancestors)

    def test_reviewed_staging_release_is_accepted(self):
        self.check(snapshot())

    def test_reviewed_documentation_cannot_replace_unreviewed_staging_release(self):
        data = snapshot()
        data["releasePulls"] = [pull(merge=RELEASE), pull("feature/evidence")]
        data["releasePulls"][0]["reviews"] = []
        with self.assertRaisesRegex(ValueError, "lab4-staging"):
            self.check(data, (RELEASE,))

    def test_feature_to_main_is_not_a_staging_release(self):
        data = snapshot()
        data["releasePulls"][0]["headRefName"] = "feature/evidence"
        with self.assertRaisesRegex(ValueError, "lab4-staging"):
            self.check(data)

    def test_stale_approval_does_not_approve_final_head(self):
        data = snapshot()
        data["releasePulls"][0]["reviews"][0]["commit"] = "d" * 40
        with self.assertRaisesRegex(ValueError, "lab4-staging"):
            self.check(data)

    def test_later_changes_requested_revokes_approval(self):
        data = snapshot()
        data["releasePulls"][0]["reviews"].append(
            {"author": "Ohmmykung09", "state": "CHANGES_REQUESTED", "commit": HEAD})
        with self.assertRaisesRegex(ValueError, "lab4-staging"):
            self.check(data)

    def test_reviewed_followup_requires_real_staging_ancestor(self):
        data = snapshot()
        data["releasePulls"] = [pull(merge=RELEASE), pull("feature/evidence")]
        self.check(data, (RELEASE,))
        with self.assertRaisesRegex(ValueError, "ancestor"):
            self.check(data, ())

    def test_unreviewed_final_followup_is_rejected(self):
        data = snapshot()
        data["releasePulls"] = [pull(merge=RELEASE)]
        with self.assertRaisesRegex(ValueError, "Final main"):
            self.check(data, (RELEASE,))

    def test_open_issue_62_even_with_done_card_is_rejected(self):
        data = snapshot()
        data["issues"][-1]["state"] = "OPEN"
        with self.assertRaisesRegex(ValueError, "CLOSED"):
            self.check(data)

    def test_every_issue_must_exist_and_be_closed(self):
        for number in range(54, 63):
            data = snapshot()
            data["issues"] = [i for i in data["issues"] if i["number"] != number]
            with self.subTest(number=number), self.assertRaisesRegex(ValueError, "CLOSED"):
                self.check(data)

    def test_closed_issue_still_requires_done_project_card(self):
        data = snapshot()
        data["project"]["items"][-1]["status"] = "PR Review"
        with self.assertRaisesRegex(ValueError, "Project"):
            self.check(data)


class InstallationTests(unittest.TestCase):
    def test_all_three_ci_commands_precede_prisma(self):
        data = manifest()
        self.assertEqual([c["command"] for c in data["commands"][:3]],
                         ["npm ci", "npm ci --prefix client", "npm ci --prefix server"])
        validate_commands(data)

    def test_missing_install_reordered_or_duplicate_commands_fail(self):
        data = manifest()
        for index in range(3):
            missing = copy.deepcopy(data)
            missing["commands"].pop(index)
            with self.subTest(index=index), self.assertRaisesRegex(ValueError, "npm ci"):
                validate_commands(missing)
        reordered = copy.deepcopy(data)
        reordered["commands"][0], reordered["commands"][5] = reordered["commands"][5], reordered["commands"][0]
        with self.assertRaisesRegex(ValueError, "out-of-order"):
            validate_commands(reordered)
        data["commands"].append(copy.deepcopy(data["commands"][0]))
        with self.assertRaises(ValueError):
            validate_commands(data)

    def test_failed_install_cannot_certify_final_manifest(self):
        data = manifest()
        data["commands"][0]["exitCode"] = 1
        with self.assertRaisesRegex(ValueError, "failed"):
            validate_commands(data)


if __name__ == "__main__":
    unittest.main()
