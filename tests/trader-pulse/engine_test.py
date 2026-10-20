"""Execute Pulse's offline Node security/rule suite in existing npm test/CI discovery."""
import pathlib
import subprocess
import unittest


class TraderPulseRegression(unittest.TestCase):
    def test_offline_node_contract_and_signal_security(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(
            ["bash", "tests/trader-pulse/run.sh"], cwd=root,
            capture_output=True, text=True, timeout=120, check=False,
        )
        # Emit actual Node results in CI; never replace an error with a synthetic success.
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-16000:])
