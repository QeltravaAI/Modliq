import csv
import os
import random
from datetime import datetime, timedelta

# Set seed for reproducibility
random.seed(1337)

START = datetime(2025, 1, 1)
N_ROWS = 200

def quality_label(y):
    if y >= 90:
        return "Good"
    if y >= 80:
        return "Average"
    return "Poor"

def generate():
    rows = []
    
    # Process parameters for specific capability tuning
    # Pressure: Highly capable (Cpk > 1.33). LSL=300, USL=600, mean=450, sigma=25
    # Cpk = min((600-450)/(3*25), (450-300)/(3*25)) = 150/75 = 2.0
    
    # Temperature: Marginally capable (Cpk ~ 1.0 - 1.33). LSL=60, USL=100, mean=80, sigma=6
    # Cpk = min((100-80)/(3*6), (80-60)/(3*6)) = 20/18 = 1.11
    
    for i in range(N_ROWS):
        temp = random.gauss(80, 6)
        pressure = random.gauss(450, 25)
        
        # Flow Rate: Add a drift to trigger a Western Electric rule. 
        # Rule 2: 9 points in a row on the same side of the mean.
        # Mean should be around 100. Let's make batches 150-160 drift up.
        if 150 <= i <= 165:
            flow_rate = random.gauss(108, 1.5) # Drifted up
        else:
            flow_rate = random.gauss(100, 2.5) # Normal
            
        # Yield Function: target R2 0.7-0.9
        # Quadratic function with optimum at Temp=80, Pressure=450, FlowRate=100
        opt_yield = 98.0
        val = opt_yield \
              - 0.05 * (temp - 80)**2 \
              - 0.001 * (pressure - 450)**2 \
              - 0.1 * (flow_rate - 100)**2
        
        # Add noise
        noise = random.gauss(0, 2.5)
        y = max(40.0, min(100.0, val + noise))
        
        # Pass/Fail boolean (for P-chart)
        is_pass = y >= 85.0
        
        # Defect count (for C-chart). Poisson distributed, mean = 5. Lower yield -> higher defects.
        defect_lambda = max(1.0, 100 - y) / 2
        defect_count = int(random.gauss(defect_lambda, defect_lambda**0.5))
        defect_count = max(0, defect_count)
        
        dt = START + timedelta(hours=i * 6)
        
        rows.append({
            "Date": dt.strftime("%Y-%m-%d"),
            "Time": dt.strftime("%H:%M"),
            "Temperature": round(temp, 2),
            "Pressure": round(pressure, 2),
            "Flow_Rate": round(flow_rate, 2),
            "Yield": round(y, 2),
            "Defect_Count": defect_count,
            "Is_Pass": "True" if is_pass else "False",
        })
        
    return rows

def write_csv(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    rows = generate()
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "Date", "Time", "Temperature", "Pressure", "Flow_Rate", "Yield", "Defect_Count", "Is_Pass"
        ])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {path}")

if __name__ == "__main__":
    base = os.path.dirname(os.path.abspath(__file__))
    # ML engine reads from data directory or uploads
    data_dir = os.path.join(base, "data")
    os.makedirs(data_dir, exist_ok=True)
    demo_path = os.path.join(data_dir, "demo_dataset.csv")
    write_csv(os.path.abspath(demo_path))
