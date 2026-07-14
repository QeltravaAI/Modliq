import csv
import os
import random
from datetime import datetime, timedelta

# Set seed for reproducibility
random.seed(1337)

START = datetime(2025, 1, 1)
N_ROWS = 200

SUPPLIERS = ['Supplier A', 'Supplier B', 'Supplier C']
LINES = ['Line 1', 'Line 2']
MACHINES = {'Line 1': 'Mixer 1', 'Line 2': 'Mixer 2'}
SHIFTS = ['A', 'B', 'C']
DOWNTIME_REASONS = ['Changeover', 'Mechanical', 'Startup', 'Cleaning', 'Quality Hold']
MATERIAL_LOTS = {
    'Supplier A': ['RM-1001', 'RM-1002', 'RM-1003'],
    'Supplier B': ['RM-2001', 'RM-2002', 'RM-2003'],
    'Supplier C': ['RM-3001', 'RM-3002', 'RM-3003'],
}

def quality_label(y):
    if y >= 90:
        return "Good"
    if y >= 80:
        return "Average"
    return "Poor"

def generate():
    rows = []

    for i in range(N_ROWS):
        # Process parameters
        temp = random.gauss(80, 6)
        pressure = random.gauss(450, 25)

        # Flow Rate with drift (triggers Western Electric rule)
        if 150 <= i <= 165:
            flow_rate = random.gauss(108, 1.5)
        else:
            flow_rate = random.gauss(100, 2.5)

        # Yield — quadratic with optimum at Temp=80, Pressure=450, FlowRate=100
        opt_yield = 98.0
        val = opt_yield \
              - 0.05 * (temp - 80) ** 2 \
              - 0.001 * (pressure - 450) ** 2 \
              - 0.1 * (flow_rate - 100) ** 2

        noise = random.gauss(0, 2.5)
        y = max(40.0, min(100.0, val + noise))

        is_pass = y >= 85.0

        defect_lambda = max(1.0, 100 - y) / 2
        defect_count = int(random.gauss(defect_lambda, defect_lambda ** 0.5))
        defect_count = max(0, defect_count)

        # Operations fields
        line = random.choice(LINES)
        machine = MACHINES[line]
        shift = SHIFTS[i % 3]
        total_count = random.randint(900, 1100)
        good_count = int(total_count * (y / 100.0))
        reject_count = total_count - good_count
        scrap_rate = round(reject_count / total_count, 4)

        # Downtime: Supplier B batches have more mechanical downtime
        supplier = random.choices(
            SUPPLIERS,
            weights=[0.40, 0.35, 0.25],  # Supplier B slightly more common
            k=1
        )[0]

        # Supplier B has intentionally lower yield (-3%)
        if supplier == 'Supplier B':
            y = max(40.0, y - random.uniform(2.0, 4.0))
            good_count = int(total_count * (y / 100.0))
            reject_count = total_count - good_count
            scrap_rate = round(reject_count / total_count, 4)

        # Downtime
        has_downtime = random.random() < 0.25  # 25% batches have downtime
        if has_downtime:
            reason = random.choice(DOWNTIME_REASONS)
            if supplier == 'Supplier B' and random.random() < 0.4:
                reason = 'Mechanical'
            downtime_minutes = round(random.uniform(10, 90), 1)
        else:
            reason = ''
            downtime_minutes = 0.0

        material_lot = random.choice(MATERIAL_LOTS[supplier])

        # OEE inputs
        planned_time = 480.0  # 8-hour shift in minutes
        runtime = planned_time - downtime_minutes
        ideal_cycle_time_sec = 30  # 30 seconds per unit ideal

        dt = START + timedelta(hours=i * 6)

        rows.append({
            'batch_id': f'B{str(i + 1).zfill(3)}',
            'date': dt.strftime('%Y-%m-%d'),
            'time': dt.strftime('%H:%M'),
            'supplier': supplier,
            'material_lot': material_lot,
            'line': line,
            'machine': machine,
            'shift': shift,
            'temperature': round(temp, 2),
            'pressure': round(pressure, 2),
            'flow_rate': round(flow_rate, 2),
            'yield': round(y, 2),
            'defect_count': defect_count,
            'is_pass': 'True' if is_pass else 'False',
            'planned_time_minutes': planned_time,
            'runtime_minutes': round(runtime, 1),
            'downtime_minutes': downtime_minutes,
            'downtime_reason': reason,
            'ideal_cycle_time_sec': ideal_cycle_time_sec,
            'total_count': total_count,
            'good_count': good_count,
            'reject_count': reject_count,
            'scrap_rate': scrap_rate,
        })

    return rows


def write_csv(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    rows = generate()
    fieldnames = [
        'batch_id', 'date', 'time', 'supplier', 'material_lot',
        'line', 'machine', 'shift',
        'temperature', 'pressure', 'flow_rate',
        'yield', 'defect_count', 'is_pass',
        'planned_time_minutes', 'runtime_minutes', 'downtime_minutes',
        'downtime_reason', 'ideal_cycle_time_sec',
        'total_count', 'good_count', 'reject_count', 'scrap_rate',
    ]
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f'Wrote {len(rows)} rows to {path}')


if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base, 'data')
    os.makedirs(data_dir, exist_ok=True)
    demo_path = os.path.join(data_dir, 'demo_dataset.csv')
    write_csv(os.path.abspath(demo_path))
