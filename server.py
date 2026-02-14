from waitress import serve
from app import app
import logging

if __name__ == "__main__":
    print("Starting Construction Planning System on http://0.0.0.0:8080")
    print("Press Ctrl+C to stop.")
    
    # Configure Waitress Logger
    logger = logging.getLogger('waitress')
    logger.setLevel(logging.INFO)
    
    serve(app, host='0.0.0.0', port=8080)
