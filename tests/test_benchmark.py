import unittest
from unittest.mock import patch, MagicMock
import sys
import os
import shutil

# Add root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import benchmark

class TestBenchmark(unittest.TestCase):
    def setUp(self):
        # Clean up any existing benchmark_results for testing
        if os.path.exists("benchmark_results_test"):
            shutil.rmtree("benchmark_results_test")
        # Redirect output to test dir
        self.original_output_dir = benchmark.OUTPUT_BASE_DIR
        benchmark.OUTPUT_BASE_DIR = "benchmark_results_test"

    def tearDown(self):
        # Clean up
        if os.path.exists("benchmark_results_test"):
            shutil.rmtree("benchmark_results_test")
        benchmark.OUTPUT_BASE_DIR = self.original_output_dir

    @patch('benchmark.requests.get')
    @patch('benchmark.requests.post')
    def test_full_benchmark_run(self, mock_post, mock_get):
        # Mock available models
        mock_get_resp = MagicMock()
        mock_get_resp.status_code = 200
        mock_get_resp.json.return_value = {"models": [{"name": "mock-model"}]}
        mock_get.return_value = mock_get_resp

        # Mock generate response
        def side_effect(*args, **kwargs):
            payload = kwargs.get('json', {})
            prompt = payload.get('prompt', '')

            resp = MagicMock()
            resp.status_code = 200

            content = "ok"
            if "hello" in prompt.lower():
                content = "Hello there!"
            elif "json" in prompt.lower():
                content = '{"title": "Test", "author": "Me", "year": 2023, "genres": ["Fiction"]}'
            elif "logician" in payload.get('system', '').lower():
                content = "Reasoning... Answer: $0.05"
            elif "python" in prompt.lower():
                content = "def calculate_factorial(n):\n    if n==0: return 1\n    return n*calculate_factorial(n-1)"
            elif "summarize" in prompt.lower():
                content = "The internet is a big network."

            resp.json.return_value = {
                "response": content,
                "eval_count": 10,
                "eval_duration": 100000000 # 0.1s
            }
            return resp

        mock_post.side_effect = side_effect

        # Run main
        benchmark.main()

        # Check if directory exists
        self.assertTrue(os.path.exists("benchmark_results_test"))

        # Check subdirectories
        subdirs = [d for d in os.listdir("benchmark_results_test") if d.startswith("run_")]
        self.assertEqual(len(subdirs), 1)
        run_dir = os.path.join("benchmark_results_test", subdirs[0])

        # Check files
        self.assertTrue(os.path.exists(os.path.join(run_dir, "results.json")))
        self.assertTrue(os.path.exists(os.path.join(run_dir, "REPORT.md")))
        self.assertTrue(os.path.exists(os.path.join(run_dir, "recommendation.txt")))

if __name__ == '__main__':
    unittest.main()
