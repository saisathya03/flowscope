"""Generate deterministic, realistic network-flow data for the 3D prototype."""

from __future__ import annotations

import csv
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path


SEED = 42
RECORD_COUNT = 360
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

FIELDS = [
    "timestamp",
    "source_id",
    "source_type",
    "source_department",
    "destination_id",
    "destination_type",
    "destination_department",
    "data_volume_mb",
    "transfer_speed_mbps",
    "bandwidth_usage_percent",
    "latency_ms",
    "packet_loss_percent",
    "network_load_percent",
    "active_connections",
    "response_time_ms",
    "queue_length",
    "data_priority",
    "data_classification",
    "access_permission",
    "threat_level",
    "connection_status",
    "route_status",
    "processing_rate",
    "api_requests",
    "database_queries",
    "ai_requests",
    "iot_messages",
    "anomaly_status",
]

NODES = {
    "Development": ("Department", "Development"),
    "QA": ("Department", "QA"),
    "HR": ("Department", "HR"),
    "Finance": ("Department", "Finance"),
    "Management": ("Department", "Management"),
    "Server-01": ("Server", "Development"),
    "Server-02": ("Server", "Operations"),
    "Server-03": ("Server", "IT"),
    "Server-04": ("Server", "Operations"),
    "Database-01": ("Database", "Finance"),
    "Database-02": ("Database", "Operations"),
    "API-Gateway": ("API", "IT"),
    "Cloud-01": ("Cloud", "Operations"),
    "AI-Engine": ("AI", "Management"),
    "IoT-Gateway": ("IoT", "Operations"),
    "Security-Hub": ("Security", "IT"),
}

ROUTES = [
    ("Development", "API-Gateway", 1.8),
    ("QA", "API-Gateway", 1.1),
    ("HR", "Server-01", 0.5),
    ("Finance", "Database-01", 0.8),
    ("Management", "AI-Engine", 0.6),
    ("API-Gateway", "Server-01", 1.9),
    ("API-Gateway", "Server-02", 1.7),
    ("API-Gateway", "Server-03", 1.3),
    ("API-Gateway", "Security-Hub", 0.7),
    ("Server-01", "Database-01", 1.5),
    ("Server-01", "Database-02", 1.1),
    ("Server-02", "Database-01", 1.8),
    ("Server-02", "Database-02", 1.6),
    ("Server-03", "Cloud-01", 1.2),
    ("Server-04", "Database-02", 1.1),
    ("Database-01", "AI-Engine", 1.4),
    ("Database-02", "AI-Engine", 1.0),
    ("AI-Engine", "Cloud-01", 1.5),
    ("IoT-Gateway", "Server-02", 1.7),
    ("IoT-Gateway", "Cloud-01", 1.2),
    ("Cloud-01", "Management", 0.7),
    ("Security-Hub", "Cloud-01", 0.6),
]

ANOMALIES = [
    "High Latency",
    "Server Overload",
    "Packet Loss",
    "Traffic Spike",
    "Failed Connection",
    "Network Congestion",
    "Suspicious Traffic",
    "API Overload",
    "Database Overload",
]


def bounded(value: float, low: float, high: float, digits: int = 2) -> float:
    return round(max(low, min(high, value)), digits)


def build_record(index: int, timestamp: datetime, rng: random.Random) -> dict[str, object]:
    sources, weights = zip(*[((source, destination), weight) for source, destination, weight in ROUTES])
    source_id, destination_id = rng.choices(sources, weights=weights, k=1)[0]
    source_type, source_department = NODES[source_id]
    destination_type, destination_department = NODES[destination_id]

    # Workday rhythm creates morning ramp-up, midday peak, and quiet overnight traffic.
    hour = timestamp.hour + timestamp.minute / 60
    business_factor = 1.0 + 0.85 * max(0.0, 1.0 - abs(hour - 13.5) / 6.5)
    if hour < 7 or hour > 21:
        business_factor *= 0.48
    route_factor = next(weight for src, dst, weight in ROUTES if src == source_id and dst == destination_id)

    volume = rng.uniform(35, 230) * business_factor * route_factor
    speed = rng.uniform(90, 720) / max(0.85, route_factor * 0.8)
    bandwidth = 18 + volume / 8.2 + rng.uniform(-8, 10)
    latency = rng.uniform(16, 58) + max(0, bandwidth - 68) * 1.4
    packet_loss = rng.uniform(0.01, 0.65)
    load = bandwidth * rng.uniform(0.82, 1.08)
    connections = int(38 + volume * rng.uniform(0.9, 1.8))
    response = latency * rng.uniform(1.15, 1.85)
    queue = int(max(0, rng.gauss(load / 11, 2.5)))

    priority = rng.choices(["Low", "Normal", "High", "Critical"], [10, 55, 27, 8], k=1)[0]
    classification = rng.choices(["Public", "Internal", "Confidential", "Restricted"], [8, 58, 25, 9], k=1)[0]
    permission = {
        "Public": "Open",
        "Internal": "Employee",
        "Confidential": "Role-Based",
        "Restricted": "Privileged",
    }[classification]
    anomaly = "Normal"

    # Roughly 8% anomalies, rotated so every required abnormal condition is present.
    if index % 13 == 0:
        anomaly = ANOMALIES[(index // 13) % len(ANOMALIES)]

    threat = "Low"
    connection = "Connected"
    route_status = "Optimal"

    if anomaly == "High Latency":
        latency = rng.uniform(190, 310)
        response = latency * rng.uniform(1.3, 1.9)
        route_status = "Congested"
    elif anomaly == "Server Overload":
        load = rng.uniform(91, 99)
        bandwidth = rng.uniform(82, 98)
        queue = rng.randint(35, 72)
        response *= 2.1
        connection = "Degraded"
    elif anomaly == "Packet Loss":
        packet_loss = rng.uniform(7.5, 18.0)
        connection = "Degraded"
        route_status = "Rerouted"
    elif anomaly == "Traffic Spike":
        volume *= rng.uniform(3.0, 4.8)
        connections = int(connections * rng.uniform(2.2, 3.2))
        load = rng.uniform(88, 99)
        bandwidth = rng.uniform(85, 99)
    elif anomaly == "Failed Connection":
        speed = 0
        connection = "Failed"
        route_status = "Blocked"
        packet_loss = 100
        response = rng.uniform(850, 1400)
    elif anomaly == "Network Congestion":
        latency = rng.uniform(140, 250)
        bandwidth = rng.uniform(90, 99)
        load = rng.uniform(90, 99)
        queue = rng.randint(30, 65)
        route_status = "Congested"
    elif anomaly == "Suspicious Traffic":
        threat = "Critical"
        classification = "Restricted"
        permission = "Denied"
        priority = "Critical"
        connection = "Degraded"
        volume *= rng.uniform(1.7, 2.8)
        route_status = "Rerouted"
    elif anomaly == "API Overload":
        source_id, destination_id = "API-Gateway", rng.choice(["Server-01", "Server-02", "Server-03"])
        source_type, source_department = NODES[source_id]
        destination_type, destination_department = NODES[destination_id]
        load = rng.uniform(92, 99)
        queue = rng.randint(48, 90)
        response *= 2.4
        connection = "Degraded"
    elif anomaly == "Database Overload":
        destination_id = rng.choice(["Database-01", "Database-02"])
        destination_type, destination_department = NODES[destination_id]
        load = rng.uniform(91, 99)
        queue = rng.randint(45, 88)
        latency = rng.uniform(130, 230)
        response = latency * rng.uniform(1.6, 2.4)
        connection = "Degraded"

    if anomaly != "Normal" and threat == "Low":
        threat = rng.choice(["Medium", "High"])

    processing_rate = max(0, speed * rng.uniform(0.7, 1.15))
    api_requests = int(volume * rng.uniform(1.8, 4.8)) if "API" in (source_type, destination_type) else int(volume * rng.uniform(0.1, 0.5))
    database_queries = int(volume * rng.uniform(1.1, 3.1)) if "Database" in (source_type, destination_type) else int(volume * rng.uniform(0.05, 0.3))
    ai_requests = int(volume * rng.uniform(0.5, 1.8)) if "AI" in (source_type, destination_type) else int(volume * rng.uniform(0.01, 0.14))
    iot_messages = int(volume * rng.uniform(3.0, 8.0)) if "IoT" in (source_type, destination_type) else int(volume * rng.uniform(0.0, 0.08))

    return {
        "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
        "source_id": source_id,
        "source_type": source_type,
        "source_department": source_department,
        "destination_id": destination_id,
        "destination_type": destination_type,
        "destination_department": destination_department,
        "data_volume_mb": bounded(volume, 1, 1800),
        "transfer_speed_mbps": bounded(speed, 0, 1200),
        "bandwidth_usage_percent": bounded(bandwidth, 1, 100),
        "latency_ms": bounded(latency, 1, 1500),
        "packet_loss_percent": bounded(packet_loss, 0, 100),
        "network_load_percent": bounded(load, 1, 100),
        "active_connections": min(connections, 2400),
        "response_time_ms": bounded(response, 1, 1800),
        "queue_length": queue,
        "data_priority": priority,
        "data_classification": classification,
        "access_permission": permission,
        "threat_level": threat,
        "connection_status": connection,
        "route_status": route_status,
        "processing_rate": bounded(processing_rate, 0, 1400),
        "api_requests": api_requests,
        "database_queries": database_queries,
        "ai_requests": ai_requests,
        "iot_messages": iot_messages,
        "anomaly_status": anomaly,
    }


def main() -> None:
    rng = random.Random(SEED)
    start = datetime(2026, 8, 25, 6, 0, tzinfo=timezone.utc)
    records = [build_record(i, start + timedelta(minutes=12 * i), rng) for i in range(RECORD_COUNT)]
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with (DATA_DIR / "network_traffic.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(records)

    with (DATA_DIR / "network_traffic.json").open("w", encoding="utf-8") as handle:
        json.dump(records, handle, indent=2)

    anomaly_count = sum(record["anomaly_status"] != "Normal" for record in records)
    print(f"Generated {len(records)} records ({anomaly_count} abnormal) in {DATA_DIR}")


if __name__ == "__main__":
    main()
