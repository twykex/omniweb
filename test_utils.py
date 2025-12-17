import unittest
import json
from utils import robust_json_parser

class TestRobustJsonParser(unittest.TestCase):
    def test_clean_json(self):
        text = '{"key": "value"}'
        self.assertEqual(robust_json_parser(text), text)

    def test_markdown_json(self):
        text = '```json\n{"key": "value"}\n```'
        expected = '{"key": "value"}'
        # The parser might return newlines if they are inside the block but outside the braces?
        # robust_json_parser removes ```json and ```
        # It finds first { and last } (roughly)
        self.assertIn('"key": "value"', robust_json_parser(text))

    def test_text_surrounding(self):
        text = 'Here is the json: {"key": "value"} thanks.'
        expected = '{"key": "value"}'
        self.assertEqual(robust_json_parser(text), expected)

    def test_nested_objects(self):
        text = '{"key": {"nested": "value"}}'
        self.assertEqual(robust_json_parser(text), text)

    def test_multiple_objects(self):
        # Should return the first valid object it finds?
        text = '{"obj1": 1} {"obj2": 2}'
        # robust_json_parser implementation uses raw_decode at the first brace
        self.assertEqual(robust_json_parser(text), '{"obj1": 1}')

    def test_broken_json(self):
        text = '{"key": "value"' # Missing closing brace
        # robust_json_parser might fallback to rfind('}') which returns -1
        # Then it returns text[start:end] where end is 0?
        # Let's see what happens.
        result = robust_json_parser(text)
        # If it fails to parse, it returns text.
        # But wait, start_obj is 0.
        # raw_decode will fail.
        # rfind('}') is -1.
        # end = -1 + 1 = 0.
        # end > start (0 > 0) is False.
        # It returns text.
        self.assertEqual(result, text)

    def test_markdown_with_text(self):
        text = 'Sure!\n```json\n{"key": "value"}\n```\nHope that helps.'
        expected = '{"key": "value"}'
        # strip whitespace might be needed
        self.assertEqual(robust_json_parser(text).strip(), expected)

if __name__ == '__main__':
    unittest.main()
