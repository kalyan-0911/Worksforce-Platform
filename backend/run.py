from app import create_app
import logging

# Simplify and clean up logs
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = create_app()

if __name__ == "__main__":
    app.run(port=5000, debug=True)
