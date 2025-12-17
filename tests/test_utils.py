import unittest
from utils import filter_children_response, robust_json_parser

class TestUtils(unittest.TestCase):
    def test_filter_children_response_dict(self):
        data = {
            "children": [
                {"name": "Topic 1", "desc": "d1", "status": "concept"},
                {"name": "Topic 2", "desc": "d2", "status": "concept"}
            ]
        }
        result = filter_children_response(data, [])
        self.assertIsNotNone(result)
        self.assertEqual(len(result["children"]), 2)

    def test_filter_children_response_list(self):
        data = [
            {"name": "Topic 1", "desc": "d1", "status": "concept"},
            {"name": "Topic 2", "desc": "d2", "status": "concept"}
        ]
        result = filter_children_response(data, [])
        self.assertIsNotNone(result)
        self.assertIn("children", result)
        self.assertEqual(len(result["children"]), 2)

    def test_filter_children_response_duplicates(self):
        data = {
            "children": [
                {"name": "Topic 1", "desc": "d1", "status": "concept"},
                {"name": "Topic 1", "desc": "d1", "status": "concept"}
            ]
        }
        result = filter_children_response(data, [])
        self.assertEqual(len(result["children"]), 1)

    def test_filter_children_response_excluded(self):
        data = {
            "children": [
                {"name": "Topic 1", "desc": "d1", "status": "concept"},
                {"name": "Topic 2", "desc": "d2", "status": "concept"}
            ]
        }
        result = filter_children_response(data, ["Topic 1"])
        self.assertEqual(len(result["children"]), 1)
        self.assertEqual(result["children"][0]["name"], "Topic 2")

    def test_robust_json_parser_markdown(self):
        text = "Here is JSON:\n```json\n{\"a\": 1}\n```"
        self.assertEqual(robust_json_parser(text), '{"a": 1}')

    def test_robust_json_parser_plain(self):
        text = '{"a": 1}'
        self.assertEqual(robust_json_parser(text), '{"a": 1}')

    def test_robust_json_parser_chatty(self):
        text = "Here is it: {\"a\": 1} hope it helps"
        # The parser finds the first object and stops if it can properly balance
        self.assertEqual(robust_json_parser(text), '{"a": 1}')

if __name__ == '__main__':
    unittest.main()
