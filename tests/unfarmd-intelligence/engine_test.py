"""Source-OFF V4 contract/security tests in existing full regression discovery."""
import pathlib
import subprocess
import unittest


class IntelligenceRegression(unittest.TestCase):
    def test_source_off_facts_and_private_journal_schema(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(
            ["bash", "tests/unfarmd-intelligence/run.sh"], cwd=root,
            capture_output=True, text=True, timeout=120, check=False,
        )
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-16000:])
