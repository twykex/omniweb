import unittest
from unittest.mock import patch, MagicMock
from server import app
from fastapi.testclient import TestClient

client = TestClient(app)

class TestServerLogic(unittest.TestCase):
    @patch('server.requests.get')
    def test_get_models_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "models": [
                {"name": "llama3", "size": 4000000000},
                {"name": "mistral", "size": 3000000000}
            ]
        }
        mock_get.return_value = mock_response

        response = client.get("/models")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["models"]), 2)
        # Sort order is by name, so llama3 first
        self.assertEqual(data["models"][0]["name"], "llama3")

    @patch('server.requests.post')
    def test_random_topic_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"response": "Quantum Computing"}
        mock_post.return_value = mock_response

        response = client.post("/random", json={"model": "llama3"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["topic"], "Quantum Computing")

    @patch('server.requests.post')
    def test_expand_node_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        # Mock LLM returning valid JSON string
        mock_response.json.return_value = {
            "response": '{"children": [{"name": "Subtopic", "desc": "desc", "status": "concept"}]}'
        }
        mock_post.return_value = mock_response

        response = client.post("/expand", json={
            "node": "Topic",
            "context": "Context",
            "model": "llama3",
            "temperature": 0.5,
            "recent_nodes": []
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["children"]), 1)
        self.assertEqual(data["children"][0]["name"], "Subtopic")

    @patch('server.requests.post')
    def test_expand_node_list_response(self, mock_post):
        # Test that server now handles list response from LLM
        mock_response = MagicMock()
        mock_response.status_code = 200
        # Mock LLM returning JSON array string
        mock_response.json.return_value = {
            "response": '[{"name": "Subtopic List", "desc": "desc", "status": "concept"}]'
        }
        mock_post.return_value = mock_response

        response = client.post("/expand", json={
            "node": "Topic",
            "context": "Context",
            "model": "llama3",
            "temperature": 0.5,
            "recent_nodes": []
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["children"]), 1)
        self.assertEqual(data["children"][0]["name"], "Subtopic List")

    @patch('server.requests.get')
    def test_get_models_missing_name(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        # One valid model, one missing name
        mock_response.json.return_value = {
            "models": [
                {"name": "valid_model", "size": 100},
                {"size": 200} # Missing name
            ]
        }
        mock_get.return_value = mock_response

        response = client.get("/models")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["models"]), 1)
        self.assertEqual(data["models"][0]["name"], "valid_model")

    @patch('server.requests.post')
    def test_analyze_invalid_mode(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.iter_lines.return_value = [b'{"response": "chunk"}']
        mock_post.return_value.__enter__.return_value = mock_response

        # Request with invalid mode
        response = client.post("/analyze", json={
            "node": "Node", "context": "Ctx", "model": "m", "mode": "invalid_mode"
        })
        self.assertEqual(response.status_code, 200)

        # Check that the prompt used corresponds to "explain"
        call_args = mock_post.call_args
        json_body = call_args[1]['json']
        prompt = json_body['prompt']
        self.assertIn("Teach 'Node' to a beginner", prompt) # "explain" prompt

    @patch('server.requests.post')
    def test_analyze_case_insensitive_mode(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.iter_lines.return_value = [b'{"response": "chunk"}']
        mock_post.return_value.__enter__.return_value = mock_response

        # Request with mixed case mode
        response = client.post("/analyze", json={
            "node": "Node", "context": "Ctx", "model": "m", "mode": "HiStOrY"
        })
        self.assertEqual(response.status_code, 200)

        # Check that the prompt is history prompt
        call_args = mock_post.call_args
        json_body = call_args[1]['json']
        prompt = json_body['prompt']
        self.assertIn("You are a Historian", prompt)

if __name__ == '__main__':
    unittest.main()
