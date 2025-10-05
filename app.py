# app.py
from flask import Flask, render_template, request, redirect, url_for, session

app = Flask(__name__)
app.secret_key = "supersecretkey"  # ضروري لاستخدام session

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/data')
def data():
    return render_template('data.html')

@app.route('/idea')
def idea():
    return render_template('idea.html')

@app.route('/results')
def results():
    # لو المستخدم دخل قبل ما يعمل محاكاة
    if 'last_simulation' not in session:
        return render_template('results.html', no_data=True)

    sim = session['last_simulation']

    # حساب النتائج الفيزيائية
    try:
        size = float(sim.get('size', 0))
        speed = float(sim.get('speed', 0))
        angle = float(sim.get('angle', 0))
        direction = sim.get('direction', 'N')
    except:
        return render_template('results.html', no_data=True)

    density = 3000  # kg/m^3
    volume = (4/3) * 3.1416 * (size/2)**3
    mass = density * volume
    kinetic_energy = 0.5 * mass * (speed*1000)**2  # J
    tnt_equivalent = kinetic_energy / 4.184e9     # tons
    time_to_impact = round(15000 / speed, 2)
    crater_diameter = round(size*1.8*(kinetic_energy/1e12)**0.25, 2)

    # تمرير البيانات للـ template كـ dictionary
    data = {
        'size': size,
        'speed': speed,
        'angle': angle,
        'direction': direction,
        'mass': round(mass,2),
        'energy': round(kinetic_energy, 2),
        'tnt': round(tnt_equivalent,2),
        'time': time_to_impact,
        'crater': crater_diameter
    }

    return render_template('results.html', no_data=False, data=data)

@app.route('/simulation', methods=['GET', 'POST'])
def simulation():
    if request.method == 'POST':
        # جلب البيانات من الفورم
        size = request.form.get('size')
        speed = request.form.get('speed')
        angle = request.form.get('angle', 0)
        direction = request.form.get('direction')

        # التأكد ان كل البيانات موجودة
        if not size or not speed or not direction:
            return render_template('simulation.html', error="Please fill all fields.")

        # تخزين البيانات في session
        session['last_simulation'] = {
            'size': size,
            'speed': speed,
            'angle': angle,
            'direction': direction
        }

        # تحويل المستخدم لصفحة النتائج
        return redirect(url_for('results'))

    return render_template('simulation.html')

@app.route('/team')
def team():
    return render_template('team.html')

if __name__ == '__main__':
    app.run(debug=True)
