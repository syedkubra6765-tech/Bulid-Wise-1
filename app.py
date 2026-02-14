from flask import Flask, render_template, request, jsonify
import requests
import json
import math

import logging
from logging.handlers import RotatingFileHandler
import os

app = Flask(__name__)

# --- Logging Configuration ---
if not os.path.exists('logs'):
    os.mkdir('logs')

file_handler = RotatingFileHandler('logs/construction_app.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)

app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('Construction Planning System startup')

# --- Configuration ---
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "granite3.3:2b"

# --- Helper Functions ---
def calculate_materials(area, floors):
    """
    Deterministic calculation of materials based on area (sq yards) and floors.
    These are rough estimation factors common in construction.
    """
    total_area_sqft = area * 9 # Convert sq yards to sq ft
    total_built_up_area = total_area_sqft * (floors + 1) # G + floors

    # Estimation constants (per sq ft approx)
    cement_bags = total_built_up_area * 0.4
    steel_kg = total_built_up_area * 4
    sand_cft = total_built_up_area * 0.816
    aggregate_cft = total_built_up_area * 0.608
    bricks = total_built_up_area * 8

    return {
        "built_up_area_sqft": round(total_built_up_area, 2),
        "cement_bags": round(cement_bags),
        "steel_kg": round(steel_kg),
        "sand_cft": round(sand_cft, 2),
        "aggregate_cft": round(aggregate_cft, 2),
        "bricks": round(bricks)
    }

def calculate_timeline(area, floors, timeline_days=None):
    """
    Estimates timeline based on complexity if not provided.
    """
    if timeline_days:
        return int(timeline_days)
    
    # Base rule: ~1 month (30 days) per 500 sq ft per floor roughly
    total_area_sqft = area * 9
    base_days = (total_area_sqft / 500) * 30 * (floors + 1)
    return round(base_days)

def query_ollama(prompt):
    """
    Sends a prompt to the local Ollama instance.
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json" # Request JSON output for easier parsing
    }
    
    try:
        app.logger.info(f"Querying Ollama with model: {MODEL_NAME}")
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
        response.raise_for_status()
        result = response.json()
        return result.get("response", "")
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error querying Ollama: {e}")
        return None

# --- Routes ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate_project():
    data = request.json
    try:
        area = float(data.get('area', 0))
        floors = int(data.get('floors', 0))
        timeline = data.get('timeline')
        
        # Deterministic Calculations
        materials = calculate_materials(area, floors)
        estimated_days = calculate_timeline(area, floors, timeline)
        
        return jsonify({
            "calculations": materials,
            "timeline_days": estimated_days
        })
    except Exception as e:
         app.logger.error(f"Calculation Error: {e}")
         return jsonify({"error": str(e)}), 500

@app.route('/api/ai-plan', methods=['POST'])
def generate_ai_plan():
    data = request.json
    try:
        area = float(data.get('area', 0))
        floors = int(data.get('floors', 0))
        timeline = int(data.get('timeline_days', 30)) # Received from calculation step or input
        location = data.get('location', 'Standard')

        system_prompt = f"""
        You are an expert Construction Planning AI. 
        Analyze a project with the following details:
        - Plot Area: {area} sq. yards
        - Floors: G+{floors}
        - Desired Timeline: {timeline} days
        - Location context: {location}
        
        Provide a detailed JSON response with the following structure:
        {{
            "worker_requirements": {{
                "masons": "number",
                "helpers": "number",
                "bar_benders": "number",
                "carpenters": "number",
                "supervisors": "number"
            }},
            "cost_breakdown_percentage": {{
                "labor": "percentage",
                "material": "percentage",
                "finishing": "percentage",
                "overhead": "percentage"
            }},
            "construction_schedule_phases": [
                {{"phase": "Foundation", "duration_weeks": "number", "description": "concise details"}},
                {{"phase": "Structure", "duration_weeks": "number", "description": "concise details"}},
                {{"phase": "Brickwork & Plastering", "duration_weeks": "number", "description": "concise details"}},
                {{"phase": "Finishing (Electrical, Plumbing, Paint)", "duration_weeks": "number", "description": "concise details"}}
            ],
            "blueprint_suggestions": {{
                 "description": "Architectural advice for this specific size and floor count.",
                 "room_configuration": "Suggested room layout (e.g., 2BHK per floor)"
            }}
        }}
        Ensure the output is valid JSON. Do not include markdown formatting or explanations outside the JSON.
        """
        
        app.logger.info(f"Sending request to AI for area {area}")
        ai_response_text = query_ollama(system_prompt)
        
        if ai_response_text:
            try:
                cleaned_text = ai_response_text.replace("```json", "").replace("```", "").strip()
                ai_data = json.loads(cleaned_text)
                return jsonify({"ai_analysis": ai_data})
            except json.JSONDecodeError:
                app.logger.error("Failed to parse AI JSON")
                return jsonify({"error": "Failed to parse AI response", "raw": ai_response_text}), 500
        else:
            return jsonify({"error": "AI Service unavailable"}), 503

    except Exception as e:
        app.logger.error(f"AI Plan Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
