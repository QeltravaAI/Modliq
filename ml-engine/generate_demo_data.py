import csv
import os
import random
from datetime import datetime, timedelta

random.seed(42)

START = datetime(2025, 1, 1)
N_ROWS = 420

# Known optimal operating point (the optimizer should converge near these)
OPT_TEMP = 87.5
OPT_PRESSURE = 450.0
OPT_HUMIDITY = 50.0
OPT_SPEED = 100.0
PEAK_YIELD = 96.8


def yield_function(temp, pressure, humidity, speed):
    """Smooth bowl-shaped yield function with a clear global optimum."""

    val = (
        PEAK_YIELD
        - 0.018 * (temp - OPT_TEMP) ** 2
        - 0.00008 * (pressure - OPT_PRESSURE) ** 2
        - 0.0011 * (humidity - OPT_HUMIDITY) ** 2
        - 0.0009 * (speed - OPT_SPEED) ** 2
    )

    noise = random.gauss(0, 0.4)

    return max(60.0, min(99.5, val + noise))


def quality_label(y):
    if y >= 90:
        return "Good"
    if y >= 80:
        return "Average"
    return "Poor"


def generate():
    rows = []

    for i in range(N_ROWS):
        temp = round(random.uniform(70, 105), 2)
        pressure = round(random.uniform(350, 550), 2)
        humidity = round(random.uniform(20, 80), 2)
        speed = round(random.uniform(50, 150), 2)

        y = round(yield_function(temp, pressure, humidity, speed), 2)
        dt = START + timedelta(hours=i * 12)

        rows.append(
            {
                "Date": dt.strftime("%Y-%m-%d"),
                "Temperature": temp,
                "Pressure": pressure,
                "Humidity": humidity,
                "Speed": speed,
                "Yield": y,
                "Time": dt.strftime("%H:%M"),
                "Quality": quality_label(y),
            }
        )

    return rows


def write_csv(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)

    rows = generate()

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "Date",
                "Temperature",
                "Pressure",
                "Humidity",
                "Speed",
                "Yield",
                "Time",
                "Quality",
            ],
        )

        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {path}")


if __name__ == "__main__":
    base = os.path.dirname(os.path.abspath(__file__))

    # ML engine reads from ../backend/uploads/<filename>
    backend_uploads = os.path.join(
        base, "..", "backend", "uploads", "manufacturing_data.csv"
    )

    # Frontend public copy for the "Load Demo Data" button
    frontend_public = os.path.join(
        base,
        "..",
        "frontend",
        "public",
        "manufacturing_data.csv",
    )

    write_csv(os.path.abspath(backend_uploads))
    write_csv(os.path.abspath(frontend_public))
