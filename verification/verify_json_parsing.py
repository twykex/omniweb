import os
from playwright.sync_api import sync_playwright, expect

def test_app(page):
    # Mock Backend API

    # 1. Models
    page.route("**/models", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"models": [{"name": "llama3", "size_bytes": 10000000000, "fits": true}], "vram_detected": true}'
    ))

    # 2. Expand (return valid JSON)
    page.route("**/expand", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"children": [{"name": "Child Node", "desc": "A child node.", "status": "concept"}]}'
    ))

    # 3. Analyze (History) - Return DIRTY JSON to test parser
    def handle_analyze(route):
        req = route.request
        try:
            post_data = req.post_data
            if not post_data:
                route.continue_()
                return

            # History Mode
            if '"mode":"history"' in post_data:
                # Dirty JSON with markdown and text before/after
                dirty_json = """
                Here is the timeline you asked for:
                ```json
                [
                    {"year": "2023", "title": "Discovery", "description": "The parser was fixed."}
                ]
                ```
                Hope this helps!
                """
                route.fulfill(status=200, body=dirty_json)

            # Quiz Mode
            elif '"mode":"quiz"' in post_data:
                 # Dirty JSON
                dirty_json = """
                Sure!
                {
                    "questions": [
                        {
                            "question": "Does it work?",
                            "options": ["Yes", "No", "Maybe", "Unknown"],
                            "correct_index": 0,
                            "explanation": "Because we fixed it."
                        }
                    ]
                }
                """
                route.fulfill(status=200, body=dirty_json)
            else:
                route.fulfill(status=200, body="Generic response")
        except Exception:
            route.continue_()

    page.route("**/analyze", handle_analyze)

    # Start
    print("Navigating to app...")
    page.goto("http://localhost:3000")

    # Wait for Landing
    print("Waiting for landing...")
    expect(page.get_by_text("OmniWeb")).to_be_visible()

    # Type Topic
    print("Entering topic...")
    page.get_by_placeholder("What do you want to learn today?").fill("Testing")
    # Click arrow button. It's an element with text '➜'
    page.get_by_text("➜").click()

    # Wait for Workspace and Node
    print("Waiting for workspace...")
    expect(page.get_by_text("Testing")).to_be_visible()

    # Click Node to expand/show actions
    print("Clicking node...")
    page.get_by_text("Testing").click()

    # Wait for "Child Node" (expand result)
    expect(page.get_by_text("Child Node", exact=True)).to_be_visible()

    # Click History
    print("Clicking History...")
    page.get_by_role("button", name="History").click()

    # Verify History Content (Parsed from dirty JSON)
    print("Verifying History...")
    expect(page.get_by_text("Discovery")).to_be_visible()
    expect(page.get_by_text("The parser was fixed.")).to_be_visible()

    # Close Lesson
    print("Closing History...")
    page.get_by_role("button", name="CLOSE").click()
    # Wait for panel to disappear to avoid ambiguous selectors
    expect(page.get_by_text("LEARNING MODULE")).not_to_be_visible()

    # Click Quiz
    print("Clicking Quiz...")
    page.get_by_role("button", name="Quiz", exact=True).click()

    # Verify Quiz Content
    print("Verifying Quiz...")
    expect(page.get_by_text("Does it work?")).to_be_visible()
    expect(page.get_by_text("Yes")).to_be_visible()

    # Take Screenshot
    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/verification.png")
    print("Done!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_app(page)
        except Exception as e:
            print(f"Failed: {e}")
            page.screenshot(path="/home/jules/verification/failure.png")
            raise
        finally:
            browser.close()
