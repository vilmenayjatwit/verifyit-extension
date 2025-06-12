from flask import Flask, request, jsonify
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

SERP_API_KEY = os.getenv("SERP_API_KEY")

@app.route("/")
def health_check():
    return jsonify({"msg": "VerifyIT Flask backend is running", "status": "ok"})

@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query")

    if not query:
        return jsonify({"error": "No query provided"}), 400

    response = requests.get(
        "https://serpapi.com/search",
        params={
            "q": query,
            "api_key": SERP_API_KEY,
            "engine": "google"
        }
    )

    return jsonify(response.json())

if __name__ == "__main__":
    app.run(port=8000)
