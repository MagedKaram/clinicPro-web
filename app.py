from flask import Flask, render_template, request, jsonify, session, redirect
from flask_socketio import SocketIO, emit
from datetime import datetime
import threading, os, json, sqlite3

# ══════════════════════════════════════════════════════
#  كلمات السر
# ══════════════════════════════════════════════════════
PASSWORDS = {
    'reception': '1234',
    'doctor':    '0000',
}

# ══════════════════════════════════════════════════════
#  المسارات
# ══════════════════════════════════════════════════════
import sys

# لو شغال كـ exe → نستخدم مسار الـ exe نفسه
# لو شغال كـ script → نستخدم مسار الملف
if getattr(sys, 'frozen', False):
    # Running as exe (PyInstaller)
    APP_DIR = os.path.dirname(sys.executable)
    BASE_DIR = sys._MEIPASS  # للـ templates و static
else:
    # Running as Python script
    APP_DIR = os.path.dirname(os.path.abspath(__file__))
    BASE_DIR = APP_DIR

DB_PATH       = os.path.join(APP_DIR, 'clinic.db')
SETTINGS_FILE = os.path.join(APP_DIR, 'settings.json')
SOUNDS_DIR    = os.path.join(APP_DIR, 'sounds')

DEFAULT_SETTINGS = {
    'clinic_name':    'عيادة الدكتور',
    'doctor_name':    '',
    'address':        '',
    'phone':          '',
    'price_new':      200,
    'price_followup': 100,
}

# ══════════════════════════════════════════════════════
#  قاعدة البيانات SQLite
# ══════════════════════════════════════════════════════
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS patients (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            phone       TEXT DEFAULT '',
            address     TEXT DEFAULT '',
            created_at  TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS visits (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id      INTEGER NOT NULL,
            ticket          INTEGER,
            visit_type      TEXT DEFAULT 'new',
            date            TEXT,
            time            TEXT,
            status          TEXT DEFAULT 'waiting',
            diagnosis       TEXT DEFAULT '',
            prescription    TEXT DEFAULT '',
            notes           TEXT DEFAULT '',
            price           INTEGER DEFAULT 0,
            paid            INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );

        CREATE TABLE IF NOT EXISTS payments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id  INTEGER NOT NULL DEFAULT 0,
            visit_id    INTEGER,
            amount      INTEGER NOT NULL,
            note        TEXT DEFAULT '',
            created_at  TEXT DEFAULT (datetime('now','localtime'))
        );
        """)
        # ── Migrate: أضف patient_id لو مش موجود في payments ──
        try:
            conn.execute("ALTER TABLE payments ADD COLUMN patient_id INTEGER NOT NULL DEFAULT 0")
        except: pass
        try:
            conn.execute("ALTER TABLE payments ADD COLUMN visit_id INTEGER")
        except: pass
        # ── Unique index على التليفون (بيتجاهل الأرقام الفاضية) ──
        try:
            conn.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_phone
                ON patients(phone) WHERE phone != '' AND phone IS NOT NULL
            """)
        except: pass
    print("✅ قاعدة البيانات جاهزة (clinic.db)")


def get_patient_balance(patient_id, conn=None):
    """
    الرصيد الكلي للمريض:
      total_charged = مجموع أسعار كل الزيارات المنتهية
      total_paid    = مجموع كل المدفوعات
      balance       = total_charged - total_paid  (موجب = لصالح العيادة)
    """
    def _calc(c):
        charged = c.execute(
            "SELECT COALESCE(SUM(price),0) as s FROM visits WHERE patient_id=? AND status='done'",
            (patient_id,)
        ).fetchone()['s']
        paid = c.execute(
            "SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE patient_id=?",
            (patient_id,)
        ).fetchone()['s']
        return {'charged': charged, 'paid': paid, 'balance': charged - paid}

    if conn:
        return _calc(conn)
    with get_db() as c:
        return _calc(c)

# ══════════════════════════════════════════════════════
#  الإعدادات
# ══════════════════════════════════════════════════════
def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
        except: pass
    return DEFAULT_SETTINGS.copy()

def save_settings(data):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ══════════════════════════════════════════════════════
#  الصوت (أوفلاين)
# ══════════════════════════════════════════════════════
try:
    from playsound import playsound
    SOUND_AVAILABLE = True
except ImportError:
    SOUND_AVAILABLE = False

def play_file(filename):
    if not SOUND_AVAILABLE: return
    path = os.path.join(SOUNDS_DIR, filename)
    if not os.path.exists(path): return
    threading.Thread(target=lambda: playsound(path), daemon=True).start()

def speak_call(n):
    play_file(f"call_{n}.mp3") if 1 <= int(n) <= 100 else None

def speak_registered(t):
    play_file("registered_new.mp3" if t == 'new' else "registered_followup.mp3")

def speak_reset():
    play_file("reset.mp3")

# ══════════════════════════════════════════════════════
#  Flask
# ══════════════════════════════════════════════════════
app = Flask(__name__,
            template_folder=os.path.join(BASE_DIR, 'templates'),
            static_folder=os.path.join(BASE_DIR, 'static'))
app.config['SECRET_KEY'] = 'clinic_2024_secret_key'

# threading هو الأكثر توافقاً مع PyInstaller
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ══════════════════════════════════════════════════════
#  Queue — مبني على DB مباشرة، بيتعافى من أي انقطاع
# ══════════════════════════════════════════════════════

def load_today_queue():
    """اجلب queue اليوم من الـ DB عند التشغيل أو الاسترداد"""
    today = datetime.now().strftime('%Y-%m-%d')
    with get_db() as conn:
        rows = conn.execute(
            """SELECT v.id, v.ticket, v.patient_id, v.visit_type, v.status,
                      v.time, v.date, v.price, v.paid,
                      p.name
               FROM visits v JOIN patients p ON v.patient_id = p.id
               WHERE v.date = ? AND v.status IN ('waiting','serving')
               ORDER BY v.ticket""",
            (today,)
        ).fetchall()
        # اجلب أعلى ticket اليوم
        max_ticket = conn.execute(
            "SELECT MAX(ticket) as mx FROM visits WHERE date=?", (today,)
        ).fetchone()['mx'] or 0
    return [dict(r) for r in rows], max_ticket

def get_current_number():
    today = datetime.now().strftime('%Y-%m-%d')
    with get_db() as conn:
        row = conn.execute(
            "SELECT ticket FROM visits WHERE date=? AND status='serving' ORDER BY ticket DESC LIMIT 1",
            (today,)
        ).fetchone()
    return row['ticket'] if row else 0

# ── تهيئة الـ queue — بتتعمل في startup بعد init_db ──
queue          = []
current_number = 0
ticket_counter = 0

def get_queue_state():
    waiting = [v for v in queue if v['status'] == 'waiting']
    return {
        'current':          current_number,
        'waiting_count':    len(waiting),
        'waiting_patients': waiting,
        'queue':            queue,
    }

# ══════════════════════════════════════════════════════
#  Auth
# ══════════════════════════════════════════════════════
def auth(role):
    return session.get(f'auth_{role}', False)

@app.route('/login/<role>')
def login_page(role):
    if role not in ('reception', 'doctor'): return redirect('/')
    return render_template('login.html', role=role)

@app.route('/api/login', methods=['POST'])
def do_login():
    data = request.json
    role, pw = data.get('role',''), data.get('password','')
    if PASSWORDS.get(role) == pw:
        session[f'auth_{role}'] = True
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'كلمة السر غلط'})

@app.route('/api/logout', methods=['POST'])
def logout():
    role = request.json.get('role','')
    session.pop(f'auth_{role}', None)
    return jsonify({'success': True})

# ══════════════════════════════════════════════════════
#  Pages
# ══════════════════════════════════════════════════════
@app.route('/')
def index():
    return redirect('/login/reception')

@app.route('/reception')
def reception():
    if not auth('reception'): return redirect('/login/reception')
    return render_template('reception.html')

@app.route('/doctor')
def doctor():
    if not auth('doctor'): return redirect('/login/doctor')
    return render_template('doctor.html')

@app.route('/display')
def display():
    return render_template('display.html')

# ══════════════════════════════════════════════════════
#  API — Patients
# ══════════════════════════════════════════════════════
@app.route('/api/patients/check-phone')
def check_phone():
    """تحقق لو التليفون موجود عند مريض تاني"""
    phone = request.args.get('phone','').strip()
    if not phone: return jsonify({'exists': False})
    with get_db() as conn:
        p = conn.execute(
            "SELECT id, name, phone, address FROM patients WHERE phone=? AND phone != '' LIMIT 1",
            (phone,)
        ).fetchone()
    if p:
        return jsonify({'exists': True, 'patient': dict(p)})
    return jsonify({'exists': False})

@app.route('/api/patients/search')
def search_patients():
    q = request.args.get('q', '').strip()
    if not q: return jsonify([])
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, phone, address FROM patients WHERE name LIKE ? OR phone LIKE ? LIMIT 10",
            (f'%{q}%', f'%{q}%')
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/patients/<int:pid>')
def get_patient(pid):
    with get_db() as conn:
        patient = conn.execute(
            "SELECT * FROM patients WHERE id=?", (pid,)
        ).fetchone()
        if not patient:
            return jsonify({'error': 'مش موجود'}), 404
        visits = conn.execute(
            """SELECT v.*, p.name as patient_name
               FROM visits v JOIN patients p ON v.patient_id=p.id
               WHERE v.patient_id=? ORDER BY v.created_at DESC""",
            (pid,)
        ).fetchall()
    return jsonify({
        'patient': dict(patient),
        'visits':  [dict(v) for v in visits],
    })

@app.route('/api/patients', methods=['POST'])
def create_patient():
    if not auth('reception'): return jsonify({'success': False})
    data  = request.json
    name  = data.get('name','').strip()
    phone = data.get('phone','').strip()
    if not name: return jsonify({'success': False, 'message': 'الاسم مطلوب'})
    # تحقق من التليفون لو موجود
    if phone:
        with get_db() as conn:
            existing = conn.execute(
                "SELECT id, name FROM patients WHERE phone=? AND phone != ''", (phone,)
            ).fetchone()
        if existing:
            return jsonify({'success': False, 'message': f'التليفون مسجل باسم {existing["name"]}', 'duplicate_id': existing['id']})
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO patients (name, phone, address) VALUES (?,?,?)",
            (name, phone, data.get('address',''))
        )
        pid     = cur.lastrowid
        patient = conn.execute("SELECT * FROM patients WHERE id=?", (pid,)).fetchone()
    return jsonify({'success': True, 'patient': dict(patient)})

@app.route('/api/patients/<int:pid>', methods=['PUT'])
def update_patient(pid):
    if not auth('reception'): return jsonify({'success': False})
    data = request.json
    with get_db() as conn:
        conn.execute(
            "UPDATE patients SET name=?, phone=?, address=? WHERE id=?",
            (data.get('name',''), data.get('phone',''), data.get('address',''), pid)
        )
    return jsonify({'success': True})

# ══════════════════════════════════════════════════════
#  API — Queue & Register
# ══════════════════════════════════════════════════════
@app.route('/api/register', methods=['POST'])
def register_patient():
    global ticket_counter
    if not auth('reception'): return jsonify({'success': False})

    data       = request.json
    patient_id = data.get('patient_id')
    name       = data.get('name','').strip()
    visit_type = data.get('type','new')

    if not patient_id and not name:
        return jsonify({'success': False, 'message': 'ادخل اسم المريض'})

    settings = load_settings()
    now      = datetime.now()

    with get_db() as conn:
        # لو مريض جديد كلياً — تحقق من التليفون الأول
        if not patient_id:
            phone = data.get('phone','').strip()
            if phone:
                existing = conn.execute(
                    "SELECT id, name FROM patients WHERE phone=? AND phone != ''", (phone,)
                ).fetchone()
                if existing:
                    return jsonify({
                        'success': False,
                        'message': f'التليفون ده مسجل قبل كدا باسم "{existing["name"]}" — ابحث عنه واختاره',
                        'duplicate_id': existing['id']
                    })
            cur = conn.execute(
                "INSERT INTO patients (name, phone, address) VALUES (?,?,?)",
                (name, phone, data.get('address',''))
            )
            patient_id = cur.lastrowid

        patient = conn.execute(
            "SELECT * FROM patients WHERE id=?", (patient_id,)
        ).fetchone()
        patient_name = patient['name']

        ticket_counter += 1
        default_price = settings['price_new'] if visit_type == 'new' else settings['price_followup']

        cur = conn.execute(
            """INSERT INTO visits (patient_id, ticket, visit_type, date, time, status, price)
               VALUES (?,?,?,?,?,?,?)""",
            (patient_id, ticket_counter,
             visit_type,
             now.strftime('%Y-%m-%d'),
             now.strftime('%H:%M'),
             'waiting',
             default_price)
        )
        visit_id = cur.lastrowid

    visit_dict = {
        'id':         visit_id,
        'ticket':     ticket_counter,
        'patient_id': patient_id,
        'name':       patient_name,
        'type':       visit_type,
        'status':     'waiting',
        'time':       now.strftime('%H:%M'),
        'date':       now.strftime('%Y-%m-%d'),
        'price':      default_price,
        'paid':       0,
    }
    queue.append(visit_dict)

    # رصيد المريض السابق (قبل الزيارة الجديدة)
    bal = get_patient_balance(patient_id)

    socketio.emit('state_update', get_queue_state())
    speak_registered(visit_type)

    return jsonify({
        'success':    True,
        'ticket':     ticket_counter,
        'visit':      visit_dict,
        'patient_id': patient_id,
        'prev_balance': bal,   # متبقي من قبل
    })


@app.route('/api/next', methods=['POST'])
def next_patient():
    global current_number
    if not auth('doctor'): return jsonify({'success': False})

    waiting = [v for v in queue if v['status'] == 'waiting']
    if not waiting:
        return jsonify({'success': False, 'message': 'لا يوجد مرضى'})

    for v in queue:
        if v['status'] == 'serving':
            v['status'] = 'done'

    nxt = waiting[0]
    nxt['status']  = 'serving'
    current_number = nxt['ticket']

    with get_db() as conn:
        # حدّث الـ serving السابق → done في الـ DB
        conn.execute(
            "UPDATE visits SET status='done' WHERE date=? AND status='serving'",
            (datetime.now().strftime('%Y-%m-%d'),)
        )
        # حدّث الجديد → serving
        conn.execute("UPDATE visits SET status='serving' WHERE id=?", (nxt['id'],))

    socketio.emit('state_update', get_queue_state())
    socketio.emit('new_patient_called', nxt)
    speak_call(nxt['ticket'])

    # جهّز ملف المريض للدكتور
    patient_data = _get_patient_file(nxt['patient_id'], nxt['id'])
    socketio.emit('patient_ready', patient_data)

    return jsonify({'success': True, 'visit': nxt})


@app.route('/api/state')
def state():
    return jsonify(get_queue_state())

@app.route('/api/current-serving-patient')
def current_serving_patient():
    """يرجع بيانات المريض اللي serving حالياً لو موجود (للـ crash recovery)"""
    today = datetime.now().strftime('%Y-%m-%d')
    with get_db() as conn:
        serving = conn.execute(
            "SELECT * FROM visits WHERE date=? AND status='serving' LIMIT 1",
            (today,)
        ).fetchone()
    
    if serving:
        patient_data = _get_patient_file(serving['patient_id'], serving['id'])
        return jsonify({'success': True, 'patient_data': patient_data})
    
    return jsonify({'success': False})


@app.route('/api/reset', methods=['POST'])
def reset():
    global queue, current_number, ticket_counter
    today = datetime.now().strftime('%Y-%m-%d')
    # حفظ الـ serving الحالي كـ done قبل المسح
    with get_db() as conn:
        conn.execute(
            "UPDATE visits SET status='done' WHERE date=? AND status IN ('serving','waiting')",
            (today,)
        )
    queue          = []
    current_number = 0
    ticket_counter = 0
    socketio.emit('state_update', get_queue_state())
    speak_reset()
    return jsonify({'success': True})

# ══════════════════════════════════════════════════════
#  API — Visit (Doctor fills in)
# ══════════════════════════════════════════════════════
@app.route('/api/visits/<int:vid>', methods=['GET'])
def get_visit(vid):
    with get_db() as conn:
        v = conn.execute(
            """SELECT v.*, p.name, p.phone, p.address
               FROM visits v JOIN patients p ON v.patient_id=p.id
               WHERE v.id=?""", (vid,)
        ).fetchone()
    if not v: return jsonify({'error': 'مش موجود'}), 404
    return jsonify(dict(v))


@app.route('/api/visits/<int:vid>', methods=['PUT'])
def update_visit(vid):
    """الدكتور يحدّث التقرير والسعر"""
    if not auth('doctor'): return jsonify({'success': False})
    data = request.json
    with get_db() as conn:
        conn.execute(
            """UPDATE visits SET
               diagnosis=?, prescription=?, notes=?, price=?
               WHERE id=?""",
            (data.get('diagnosis',''),
             data.get('prescription',''),
             data.get('notes',''),
             int(data.get('price', 0)),
             vid)
        )
    return jsonify({'success': True})


@app.route('/api/visits/<int:vid>/finish', methods=['POST'])
def finish_visit(vid):
    """الدكتور ينهي الكشف → بوب-آب في الاستقبال"""
    if not auth('doctor'): return jsonify({'success': False})

    data = request.json  # diagnosis, prescription, notes, price

    with get_db() as conn:
        conn.execute(
            """UPDATE visits SET
               diagnosis=?, prescription=?, notes=?, price=?, status='done'
               WHERE id=?""",
            (data.get('diagnosis',''),
             data.get('prescription',''),
             data.get('notes',''),
             int(data.get('price', 0)),
             vid)
        )
        visit = conn.execute(
            "SELECT v.*, p.name, p.phone FROM visits v JOIN patients p ON v.patient_id=p.id WHERE v.id=?",
            (vid,)
        ).fetchone()
        # رصيد المريض الكلي (شامل كل الزيارات السابقة)
        bal = get_patient_balance(visit['patient_id'], conn)

    v = dict(visit)

    # حدّث queue في الميموري
    for item in queue:
        if item.get('id') == vid:
            item['status'] = 'done'
            break

    socketio.emit('state_update', get_queue_state())

    # أرسل بوب-آب للاستقبال مع الرصيد الكلي
    socketio.emit('billing_popup', {
        'visit_id':      vid,
        'patient_id':    v['patient_id'],
        'name':          v['name'],
        'phone':         v['phone'],
        'visit_type':    v['visit_type'],
        'diagnosis':     v['diagnosis'],
        'prescription':  v['prescription'],
        'this_visit_price': v['price'],   # سعر الزيارة الحالية
        'charged':       bal['charged'],  # إجمالي كل الزيارات
        'paid':          bal['paid'],     # إجمالي كل المدفوعات
        'balance':       bal['balance'],  # المتبقي الكلي
    })

    return jsonify({'success': True})

# ══════════════════════════════════════════════════════
#  API — Balance & Payments  (على مستوى المريض)
# ══════════════════════════════════════════════════════
@app.route('/api/patients/<int:pid>/balance')
def patient_balance_api(pid):
    bal = get_patient_balance(pid)
    return jsonify(bal)


@app.route('/api/payments/visit/<int:visit_id>')
def get_payments_for_visit(visit_id):
    with get_db() as conn:
        payments = conn.execute(
            "SELECT * FROM payments WHERE visit_id=? ORDER BY created_at", (visit_id,)
        ).fetchall()
        total = conn.execute(
            "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE visit_id=?", (visit_id,)
        ).fetchone()
    return jsonify({'payments': [dict(p) for p in payments], 'total': total['total']})


@app.route('/api/payments', methods=['POST'])
def add_payment():
    """تسجيل دفعة على مستوى المريض الكلي"""
    if not auth('reception'): return jsonify({'success': False})
    data       = request.json
    patient_id = data.get('patient_id')
    visit_id   = data.get('visit_id')   # اختياري — للربط بزيارة معينة
    amount     = int(data.get('amount', 0))

    if not patient_id or amount <= 0:
        return jsonify({'success': False, 'message': 'بيانات غلط'})

    with get_db() as conn:
        conn.execute(
            "INSERT INTO payments (patient_id, visit_id, amount, note) VALUES (?,?,?,?)",
            (patient_id, visit_id, amount, data.get('note', ''))
        )
        # حدّث paid في آخر زيارة لو visit_id موجود
        if visit_id:
            conn.execute(
                "UPDATE visits SET paid = paid + ? WHERE id=?", (amount, visit_id)
            )
        bal = get_patient_balance(patient_id, conn)

    return jsonify({'success': True, **bal})


@app.route('/api/visits/<int:vid>/add-charge', methods=['POST'])
def add_charge(vid):
    """الدكتور يضيف مبلغ زيادة على الزيارة الحالية"""
    if not auth('doctor'): return jsonify({'success': False})
    amount = int(request.json.get('amount', 0))
    note   = request.json.get('note', '')
    if amount <= 0: return jsonify({'success': False, 'message': 'المبلغ لازم يكون أكبر من صفر'})

    with get_db() as conn:
        conn.execute(
            "UPDATE visits SET price = price + ? WHERE id=?", (amount, vid)
        )
        visit = conn.execute(
            "SELECT patient_id, price FROM visits WHERE id=?", (vid,)
        ).fetchone()
        bal = get_patient_balance(visit['patient_id'], conn)

    # أبلغ الاستقبال بالتغيير
    socketio.emit('charge_added', {
        'visit_id':   vid,
        'extra':      amount,
        'note':       note,
        'new_price':  visit['price'],
        **bal
    })
    return jsonify({'success': True, 'new_price': visit['price'], **bal})


# ══════════════════════════════════════════════════════
#  API — Patient File (for doctor)
# ══════════════════════════════════════════════════════
def _get_patient_file(patient_id, current_visit_id=None):
    with get_db() as conn:
        patient = conn.execute(
            "SELECT * FROM patients WHERE id=?", (patient_id,)
        ).fetchone()
        if not patient:
            return {'patient': None, 'visits': [], 'last_visit': None, 'current_visit_id': current_visit_id}

        # كل الزيارات السابقة المنتهية (بدون الزيارة الحالية)
        all_visits = conn.execute(
            """SELECT * FROM visits
               WHERE patient_id=? AND status='done'
               ORDER BY date DESC, created_at DESC""",
            (patient_id,)
        ).fetchall()

        # آخر زيارة منتهية غير الحالية
        last_visit = None
        for v in all_visits:
            if v['id'] != current_visit_id:
                last_visit = dict(v)
                break

    return {
        'patient':          dict(patient),
        'visits':           [dict(v) for v in all_visits],
        'last_visit':       last_visit,
        'current_visit_id': current_visit_id,
    }

@app.route('/api/patient-file/<int:patient_id>')
def patient_file(patient_id):
    vid = request.args.get('visit_id', type=int)
    return jsonify(_get_patient_file(patient_id, vid))

@app.route('/reports')
def reports():
    if not auth('reception'): return redirect('/login/reception')
    return render_template('reports.html')

# ══════════════════════════════════════════════════════
#  API — Advanced Reports
# ══════════════════════════════════════════════════════
@app.route('/api/reports/financial')
def financial_report():
    """تقرير مالي بفترة زمنية"""
    date_from = request.args.get('from', '')
    date_to   = request.args.get('to',   '')
    if not date_from or not date_to:
        return jsonify({'error': 'ادخل الفترة'}), 400

    with get_db() as conn:
        visits = conn.execute(
            """SELECT v.id, v.ticket, v.visit_type, v.date, v.time,
                      v.price, v.paid, v.status,
                      p.name, p.phone
               FROM visits v JOIN patients p ON v.patient_id=p.id
               WHERE v.date >= ? AND v.date <= ?
                 AND v.status IN ('done','serving')
               ORDER BY v.date DESC, v.ticket""",
            (date_from, date_to)
        ).fetchall()

    rows = [dict(r) for r in visits]
    total_price = sum(r['price'] for r in rows)
    total_paid  = sum(r['paid']  for r in rows)

    # تجميع حسب اليوم
    by_day = {}
    for r in rows:
        d = r['date']
        if d not in by_day:
            by_day[d] = {'date': d, 'count': 0, 'price': 0, 'paid': 0, 'new': 0, 'followup': 0}
        by_day[d]['count']  += 1
        by_day[d]['price']  += r['price']
        by_day[d]['paid']   += r['paid']
        if r['visit_type'] == 'new':      by_day[d]['new']      += 1
        else:                             by_day[d]['followup']  += 1

    return jsonify({
        'from':         date_from,
        'to':           date_to,
        'total':        len(rows),
        'new_count':    sum(1 for r in rows if r['visit_type']=='new'),
        'followup_count': sum(1 for r in rows if r['visit_type']=='followup'),
        'total_price':  total_price,
        'total_paid':   total_paid,
        'remaining':    total_price - total_paid,
        'visits':       rows,
        'by_day':       sorted(by_day.values(), key=lambda x: x['date'], reverse=True),
    })


@app.route('/api/reports/patient')
def patient_report():
    """كل زيارات مريض معين"""
    pid = request.args.get('patient_id', type=int)
    if not pid:
        return jsonify({'error': 'ادخل رقم المريض'}), 400

    with get_db() as conn:
        patient = conn.execute(
            "SELECT * FROM patients WHERE id=?", (pid,)
        ).fetchone()
        if not patient:
            return jsonify({'error': 'مريض مش موجود'}), 404
        visits = conn.execute(
            """SELECT * FROM visits WHERE patient_id=? AND status IN ('done','serving')
               ORDER BY date DESC, ticket DESC""",
            (pid,)
        ).fetchall()

    rows = [dict(r) for r in visits]
    return jsonify({
        'patient':      dict(patient),
        'visits':       rows,
        'total_visits': len(rows),
        'total_price':  sum(r['price'] for r in rows),
        'total_paid':   sum(r['paid']  for r in rows),
        'remaining':    sum(r['price'] - r['paid'] for r in rows),
    })


@app.route('/api/reports/debtors')
def debtors_report():
    """تقرير المرضى المدينين (المتبقي > 0)"""
    q = request.args.get('q', '').strip()
    min_balance = request.args.get('min_balance', default=1, type=int)
    min_balance = max(1, min_balance)

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
                p.id,
                p.name,
                p.phone,
                p.address,
                COALESCE(v.done_visits, 0) AS done_visits,
                COALESCE(v.total_charged, 0) AS total_charged,
                COALESCE(pay.total_paid, 0) AS total_paid,
                v.last_visit_date
            FROM patients p
            LEFT JOIN (
                SELECT
                    patient_id,
                    COUNT(*) AS done_visits,
                    COALESCE(SUM(price), 0) AS total_charged,
                    MAX(date) AS last_visit_date
                FROM visits
                WHERE status='done'
                GROUP BY patient_id
            ) v ON v.patient_id = p.id
            LEFT JOIN (
                SELECT
                    patient_id,
                    COALESCE(SUM(amount), 0) AS total_paid
                FROM payments
                GROUP BY patient_id
            ) pay ON pay.patient_id = p.id
            WHERE (COALESCE(v.total_charged, 0) - COALESCE(pay.total_paid, 0)) >= ?
              AND (? = '' OR p.name LIKE ? OR p.phone LIKE ?)
            ORDER BY (COALESCE(v.total_charged, 0) - COALESCE(pay.total_paid, 0)) DESC, p.name ASC
            """,
            (min_balance, q, f'%{q}%', f'%{q}%')
        ).fetchall()

    debtors = []
    for r in rows:
        item = dict(r)
        item['balance'] = item['total_charged'] - item['total_paid']
        debtors.append(item)

    return jsonify({
        'q': q,
        'min_balance': min_balance,
        'total_patients': len(debtors),
        'total_debt': sum(d['balance'] for d in debtors),
        'total_charged': sum(d['total_charged'] for d in debtors),
        'total_paid': sum(d['total_paid'] for d in debtors),
        'debtors': debtors,
    })


@app.route('/api/report')
def get_report():
    today    = datetime.now().strftime('%Y-%m-%d')
    settings = load_settings()
    with get_db() as conn:
        visits = conn.execute(
            """SELECT v.*, p.name, p.phone
               FROM visits v JOIN patients p ON v.patient_id=p.id
               WHERE v.date=? AND v.status IN ('done','serving')
               ORDER BY v.ticket""",
            (today,)
        ).fetchall()
    rows           = [dict(v) for v in visits]
    new_count      = sum(1 for v in rows if v['visit_type']=='new')
    followup_count = sum(1 for v in rows if v['visit_type']=='followup')
    total_price    = sum(v['price'] for v in rows)
    total_paid     = sum(v['paid']  for v in rows)

    return jsonify({
        'date':           today,
        'total':          len(rows),
        'new_count':      new_count,
        'followup_count': followup_count,
        'total_price':    total_price,
        'total_paid':     total_paid,
        'remaining':      total_price - total_paid,
        'visits':         rows,
        'clinic_name':    settings['clinic_name'],
        'doctor_name':    settings['doctor_name'],
    })

# ══════════════════════════════════════════════════════
#  API — Settings
# ══════════════════════════════════════════════════════
@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(load_settings())

@app.route('/api/settings', methods=['POST'])
def post_settings():
    if not auth('reception'): return jsonify({'success': False})
    current = load_settings()
    current.update({k: v for k, v in request.json.items() if k in DEFAULT_SETTINGS})
    save_settings(current)
    return jsonify({'success': True})

# ══════════════════════════════════════════════════════
#  SocketIO
# ══════════════════════════════════════════════════════
@socketio.on('connect')
def on_connect():
    emit('state_update', get_queue_state())

# ══════════════════════════════════════════════════════
#  Run
# ══════════════════════════════════════════════════════
if __name__ == '__main__':
    init_db()
    # ♻️ استرداد queue اليوم من الـ DB
    queue, ticket_counter = load_today_queue()
    current_number        = get_current_number()
    print(f"♻️  استرداد Queue: {len(queue)} زيارة، آخر ticket={ticket_counter}, current={current_number}")
    s_count = len([f for f in os.listdir(SOUNDS_DIR) if f.endswith('.mp3')]) if os.path.exists(SOUNDS_DIR) else 0
    print("\n" + "═"*54)
    print("   🏥  نظام إدارة العيادة — Clinic Queue System")
    print("═"*54)
    print("   🖥️  الاستقبال   →  http://localhost:5000/reception")
    print("   👨‍⚕️  الدكتور     →  http://localhost:5000/doctor")
    print("   📺  شاشة العرض  →  http://localhost:5000/display")
    print("═"*54)
    print(f"   🔐  باسورد الاستقبال: {PASSWORDS['reception']}")
    print(f"   🔐  باسورد الدكتور:   {PASSWORDS['doctor']}")
    print(f"   🔊  ملفات صوت: {s_count} ملف")
    print("═"*54 + "\n")
    
    # فتح المتصفح تلقائياً (للنسخة المجمّعة exe)
    import webbrowser
    import threading
    def open_browser():
        import time
        time.sleep(2)  # انتظار بدء السيرفر
        webbrowser.open('http://localhost:5000/reception')
    
    threading.Thread(target=open_browser, daemon=True).start()
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
