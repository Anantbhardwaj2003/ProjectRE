from rendering_routes import rendering_bp
from app import create_app

app = create_app()

app.register_blueprint(rendering_bp)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)