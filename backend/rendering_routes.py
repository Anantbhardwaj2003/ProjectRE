from flask import jsonify, request, render_template, Blueprint, redirect, url_for, session
from app.extension import db
from sqlalchemy import text

rendering_bp = Blueprint('rendering', __name__)


@rendering_bp.route('/')
def index():
    return redirect(url_for('rendering.home'))

@rendering_bp.route('/home')
def home():
    return render_template('home.html')