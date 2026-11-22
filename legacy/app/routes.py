from flask import render_template, request, redirect, url_for, flash
from flask_login import login_user, login_required, logout_user, current_user
from flask_socketio import emit, join_room, leave_room
from app import db, login_manager, socketio
from app.models import User, Question, Game
import eventlet

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@socketio.on('join')
@login_required
def on_join(data):
    room = data['room']
    join_room(room)
    emit('status', {'msg': f'{current_user.username} has entered the room.'}, room=room)

@socketio.on('leave')
@login_required
def on_leave(data):
    room = data['room']
    leave_room(room)
    emit('status', {'msg': f'{current_user.username} has left the room.'}, room=room)

@socketio.on('start_game')
@login_required
def start_game(data):
    room = data['room']
    question = Question.query.order_by(db.func.random()).first()
    emit('question', {'question_text': question.question_text, 'question_id': question.id}, room=room)
    eventlet.sleep(10)  # wait for 10 seconds
    emit('time_up', {'msg': 'Time is up!'}, room=room)

@socketio.on('submit_answer')
@login_required
def submit_answer(data):
    room = data['room']
    question_id = data['question_id']
    answer = int(data['answer'])
    question = Question.query.get(question_id)
    correct_answer = question.correct_answer
    points = max(0, 100 - abs(correct_answer - answer))
    emit('result', {'correct_answer': correct_answer, 'points': points}, room=room)

def init_app(app):
    @app.route('/register', methods=['GET', 'POST'])
    def register():
        if request.method == 'POST':
            username = request.form['username']
            password = request.form['password']
            user = User(username=username)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            flash('Registration successful!', 'success')
            return redirect(url_for('login'))
        return render_template('register.html')

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form['username']
            password = request.form['password']
            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                login_user(user)
                return redirect(url_for('dashboard'))
            flash('Invalid credentials', 'danger')
        return render_template('login.html')

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        return redirect(url_for('login'))

    @app.route('/dashboard')
    @login_required
    def dashboard():
        return render_template('dashboard.html', username=current_user.username, rank=current_user.rank)

    @app.route('/game')
    @login_required
    def game():
        return render_template('game.html')
